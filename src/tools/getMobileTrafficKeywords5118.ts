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
    .describe("Optional seed keyword to mine. Required for submit mode, and also required for poll mode because the upstream 5118 poll request still expects the original keyword."),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional 1-based page number for completed traffic keyword results. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .describe("Optional completed result page size. Maximum 500. Defaults to 20."),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe("Optional async execution mode. submit=create a vendor task; poll=check an existing task; wait=submit or resume and keep polling until completion or timeout. Defaults to submit for this long-running API."),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling."),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional maximum client-side wait time in seconds for wait mode before timeout. The tool returns the latest pending state if the limit is reached first."),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional polling interval in seconds for wait mode. Defaults to the shared async poll interval when omitted."),
} as const;

export const MOBILE_TRAFFIC_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA,
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  rank: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  url: STRING_OR_NULL_OUTPUT_SCHEMA,
  weight: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
});

export const MOBILE_TRAFFIC_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  keywords: z.array(MOBILE_TRAFFIC_KEYWORD_ITEM_OUTPUT_SCHEMA),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
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
  const data = asRecord(root.data);
  const list = asArray(data.list).length > 0 ? asArray(data.list) : asArray(data.keywords);

  return {
    keywords: list.map((item) => {
      const record = asRecord(item);
      return {
        keyword: toStringOrNull(record.keyword ?? record.word),
        index: toNumber(record.index),
        rank: toNumber(record.rank ?? record.position),
        url: toStringOrNull(record.url),
        weight: toNumber(record.weight),
        mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
        mobileSearchVolume: toNumber(
          record.bidword_wisepv ?? record.wise_pv ?? record.mobileSearchVolume,
        ),
      };
    }),
    pagination: createPagination(
      data.page_index ?? data.pageIndex,
      data.page_size ?? data.pageSize,
      data.page_count ?? data.pageCount,
      data.total,
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
      description: "Async mobile traffic keyword mining via 5118 /traffic.",
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
