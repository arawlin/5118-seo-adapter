import { z } from "zod";
import {
  DEFAULT_POLL_INTERVAL_SECONDS,
  DEFAULT_TRAFFIC_MAX_WAIT_SECONDS,
  executeAsyncTool,
} from "../lib/asyncExecutor.js";
import { ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { encodeInputFields } from "../lib/urlCodec.js";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import { createPagination } from "../lib/responseEnvelope.js";
import {
  createResponseOutputSchema,
  NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  PAGINATION_OUTPUT_SCHEMA,
  STRING_OR_NULL_OUTPUT_SCHEMA,
  createToolResult,
  type RegisterTool,
} from "./toolRegistration.js";
import { asArray, asRecord, toNumber, toStringOrNull } from "./normalizationUtils.js";

export const GET_MOBILE_TRAFFIC_KEYWORDS_5118_INPUT_SCHEMA = {
  keyword: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional. Seed keyword to mine mobile traffic words for. Required for 'submit' and for 'wait' without a `taskId`. Also required for 'poll' because the upstream poll request must echo the original keyword.",
    ),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Optional. 1-based page number applied at result-fetch time. Default 1. Must be >= 1.",
    ),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .describe(
      "Optional. Rows per page. Default 20, maximum 500 (upstream cap).",
    ),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe(
      "Optional. Async execution mode. Default 'submit' for this long-running upstream API. 'submit'=create the task and return its taskId. 'poll'=fetch a previously submitted task once. 'wait'=submit (or resume) and keep polling.",
    ),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe(
      "Optional. Existing vendor task identifier. Required in 'poll'. In 'wait', supply it together with `keyword` to resume polling.",
    ),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe(
      "Optional. Hard ceiling (seconds) on how long 'wait' polls before returning a pending envelope. Defaults to the adapter traffic-mining ceiling. Upstream tasks typically complete in 1-10 minutes.",
    ),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe(
      "Optional. Interval (seconds) between poll attempts in 'wait' mode. Defaults to the shared async poll interval.",
    ),
} as const;

export const MOBILE_TRAFFIC_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Mined mobile traffic word (5118 field `word`).",
  ),
  weight: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Mining-weight score from 5118 (价值量). Higher values are more strategic for mobile traffic.",
  ),
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Baidu Mobile search index (5118 field `mobile_index`).",
  ),
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Daily mobile search volume (5118 field `bidword_wisepv`). Most actionable demand signal on this endpoint.",
  ),
});

export const MOBILE_TRAFFIC_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  keywords: z
    .array(MOBILE_TRAFFIC_KEYWORD_ITEM_OUTPUT_SCHEMA)
    .describe(
      "Mined mobile traffic words for the current page. Empty while the vendor task is pending; populated after completion.",
    ),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable().describe(
    "Pagination metadata for paging through the full mined set. Null only when omitted by the upstream.",
  ),
});

export type MobileTrafficKeywordItem = z.infer<typeof MOBILE_TRAFFIC_KEYWORD_ITEM_OUTPUT_SCHEMA>;
export type MobileTrafficKeywordsData = z.infer<typeof MOBILE_TRAFFIC_KEYWORDS_DATA_OUTPUT_SCHEMA>;
export type GetMobileTrafficKeywords5118Item = MobileTrafficKeywordItem;
export type GetMobileTrafficKeywords5118Data = MobileTrafficKeywordsData;

export type GetMobileTrafficKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_MOBILE_TRAFFIC_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetMobileTrafficKeywordsInput = GetMobileTrafficKeywords5118Input;

const TOOL_NAME = "get_mobile_traffic_keywords_5118";
const API_NAME = "Mobile Traffic Keyword Mining";
const ENDPOINT = "/traffic";

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(MOBILE_TRAFFIC_KEYWORDS_DATA_OUTPUT_SCHEMA);

function normalizeMobileTrafficKeywordsResponse(raw: unknown): MobileTrafficKeywordsData {
  const root = asRecord(raw);
  // Vendor spec: `data` is the rows array directly; pagination fields live at the root.
  const list = asArray(root.data);

  return {
    keywords: list.map((item) => {
      const record = asRecord(item);
      return {
        keyword: toStringOrNull(record.word),
        weight: toNumber(record.weight),
        mobileIndex: toNumber(record.mobile_index),
        mobileSearchVolume: toNumber(record.bidword_wisepv),
      };
    }),
    pagination: createPagination(
      root.page_index,
      root.page_size,
      root.page_count,
      root.total,
    ),
  };
}


export function registerGetMobileTrafficKeywords5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Mobile Traffic Keywords 5118",
      description:
        [
          "Mine mobile-search traffic words for a seed keyword, returning each word with its mobile index, daily mobile volume, and 5118 weight score.",
          "Use case: mobile-first keyword research and rank tracking; identify long-tail terms that drive mobile traffic before pulling rank snapshots.",
          "Difference vs neighbors: get_longtail_keywords_5118 returns full PC+mobile metrics for one seed in a single sync call; this tool is mobile-only, runs as an async vendor task, and surfaces a 5118-curated 'value' weight not available elsewhere.",
          "Most actionable output fields: data.keywords[].keyword, .mobileSearchVolume, .mobileIndex, .weight; pagination drives subsequent pages.",
          "Async contract: defaults to 'submit' (returns taskId immediately, executionStatus='pending'). Re-call with executionMode='poll' or 'wait' plus the same `keyword` and the returned `taskId` to fetch results.",
          "Known limits: long-running upstream task (1-10 min typical); pageSize<=500; mainland-China mobile coverage; results may be empty for English or very narrow seeds.",
        ].join(" "),
      inputSchema: GET_MOBILE_TRAFFIC_KEYWORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getMobileTrafficKeywords5118Handler(input);
      return createToolResult(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload);
    },
  );
}

function extractTaskId(raw: unknown): string | number | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  const root = raw as Record<string, unknown>;
  return (
    (root.taskid as string | number | undefined) ??
    (root.taskId as string | number | undefined) ??
    ((root.data as Record<string, unknown> | undefined)?.taskid as
      | string
      | number
      | undefined)
  );
}

export async function getMobileTrafficKeywords5118Handler(
  input: GetMobileTrafficKeywords5118Input,
): Promise<ResponseEnvelope<MobileTrafficKeywordsData>> {
  const mode = input.executionMode ?? "submit";
  const pageIndex = input.pageIndex ?? 1;
  const pageSize = input.pageSize ?? 20;

  if (pageSize > 500) {
    throw new ToolError("INPUT_LIMIT", "pageSize must be less than or equal to 500.");
  }

  if (mode === "poll") {
    if (input.taskId === undefined) {
      throw new ToolError("MISSING_TASK_ID", "taskId is required when executionMode is poll.");
    }

    if (!input.keyword) {
      throw new ToolError("INVALID_INPUT", "keyword is required when executionMode is poll.");
    }
  }

  if ((mode === "submit" || (mode === "wait" && input.taskId === undefined)) && !input.keyword) {
    throw new ToolError("INVALID_INPUT", "keyword is required for submit/wait mode.");
  }

  const apiKey = assertApiKey(TOOL_NAME);

  const submit = async (): Promise<unknown> => {
    const encoded = encodeInputFields(
      {
        keyword: input.keyword,
        page_index: pageIndex,
        page_size: pageSize,
      },
      ["keyword"],
    );

    return postForm(ENDPOINT, apiKey, encoded);
  };

  const poll = async (taskId: string | number): Promise<unknown> => {
    const encoded = encodeInputFields(
      {
        taskid: taskId,
        keyword: input.keyword,
        page_index: pageIndex,
        page_size: pageSize,
      },
      ["keyword"],
    );

    return postForm(ENDPOINT, apiKey, encoded);
  };

  return executeAsyncTool({
    tool: TOOL_NAME,
    apiName: API_NAME,
    endpoint: ENDPOINT,
    executionMode: mode,
    defaultExecutionMode: "submit",
    taskId: input.taskId,
    maxWaitSeconds: input.maxWaitSeconds,
    pollIntervalSeconds: input.pollIntervalSeconds,
    defaultMaxWaitSeconds: DEFAULT_TRAFFIC_MAX_WAIT_SECONDS,
    defaultPollIntervalSeconds: DEFAULT_POLL_INTERVAL_SECONDS,
    pendingCodes: ["200104"],
    submit,
    poll,
    extractTaskId,
    normalizeData: (raw) => {
      const normalized = normalizeMobileTrafficKeywordsResponse(raw);
      return {
        data: normalized,
        pagination: normalized.pagination,
      };
    },
  });
}
