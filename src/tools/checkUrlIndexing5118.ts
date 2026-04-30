import { z } from "zod";
import {
  DEFAULT_TRAFFIC_MAX_WAIT_SECONDS,
  executeAsyncTool,
} from "../lib/asyncExecutor.js";
import { ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { encodeInputFields } from "../lib/urlCodec.js";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  STRING_OR_NULL_OUTPUT_SCHEMA,
  createToolResult,
  type RegisterTool,
} from "./toolRegistration.js";
import { asArray, asRecord, toNumber, toStringOrNull } from "./normalizationUtils.js";

export const CHECK_URL_INDEXING_5118_INPUT_SCHEMA = {
  urls: z
    .array(z.string().min(1))
    .max(200)
    .optional()
    .describe(
      "Optional. Up to 200 fully-qualified URLs (with protocol) to check for Baidu PC indexing. Required for 'submit' and for 'wait' without a `taskId`. Mix of pages from one or several domains is allowed.",
    ),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe(
      "Optional. Async execution mode. Default 'wait'. 'submit'=create the task and return its taskId. 'poll'=fetch a previously submitted task once. 'wait'=submit (or resume) and keep polling.",
    ),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe(
      "Optional. Existing vendor task identifier. Required in 'poll'. In 'wait', supply it to resume polling without re-submitting.",
    ),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe(
      "Optional. Hard ceiling (seconds) on how long 'wait' polls before returning a pending envelope.",
    ),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional. Interval (seconds) between poll attempts. Defaults to 60."),
} as const;

export const URL_INDEXING_ITEM_OUTPUT_SCHEMA = z.object({
  url: STRING_OR_NULL_OUTPUT_SCHEMA.describe("Echoed URL that was checked."),
  status: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Indexing status code: 0 = not indexed, 1 = indexed by Baidu PC, 2 = check failed (e.g. URL unreachable). null only when the upstream omits it.",
  ),
  title: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Title captured by Baidu's index for this URL. null when the page is not indexed or 5118 has no value.",
  ),
  snapshotTime: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Baidu cache snapshot timestamp echoed verbatim (typically 'YYYY-MM-DD' or 'YYYY-MM-DD HH:mm:ss', Asia/Shanghai). null when not provided or page not indexed.",
  ),
});

export const URL_INDEXING_DATA_OUTPUT_SCHEMA = z.object({
  items: z
    .array(URL_INDEXING_ITEM_OUTPUT_SCHEMA)
    .describe(
      "One row per submitted URL. Empty while the vendor task is pending; populated after `checkStatus`=1.",
    ),
  total: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Total number of URLs in the task as reported by the upstream. Used to verify completeness against `urls.length`.",
  ),
  checkStatus: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Vendor task status: 0 = still checking, 1 = finished. Mirrors the envelope `executionStatus` ('pending' vs 'completed').",
  ),
  submitTime: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Timestamp the upstream task was submitted (Asia/Shanghai). Useful for SLA tracking.",
  ),
  finishedTime: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Timestamp the upstream task finished (Asia/Shanghai). null while pending.",
  ),
});

export type UrlIndexingItem = z.infer<typeof URL_INDEXING_ITEM_OUTPUT_SCHEMA>;
export type UrlIndexingData = z.infer<typeof URL_INDEXING_DATA_OUTPUT_SCHEMA>;
export type CheckUrlIndexing5118Item = UrlIndexingItem;
export type CheckUrlIndexing5118Data = UrlIndexingData;

export type CheckUrlIndexing5118Input = z.infer<
  z.ZodObject<typeof CHECK_URL_INDEXING_5118_INPUT_SCHEMA>
>;
export type CheckUrlIndexingInput = CheckUrlIndexing5118Input;

const TOOL_NAME = "check_url_indexing_5118";
const API_NAME = "PC URL Indexing API";
const ENDPOINT = "/include";
const DEFAULT_INDEXING_POLL_INTERVAL_SECONDS = 60;

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(URL_INDEXING_DATA_OUTPUT_SCHEMA);

function normalizeUrlIndexingResponse(raw: unknown): UrlIndexingData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  // Vendor real shape: data.include_result[] with { url, status, title, time }.
  const list = asArray(data.include_result);

  return {
    items: list.map((item) => {
      const record = asRecord(item);
      return {
        url: toStringOrNull(record.url),
        status: toNumber(record.status),
        title: toStringOrNull(record.title),
        snapshotTime: toStringOrNull(record.time),
      };
    }),
    total: toNumber(data.total),
    checkStatus: toNumber(data.check_status),
    submitTime: toStringOrNull(data.submit_time),
    finishedTime: toStringOrNull(data.finished_time),
  };
}


export function registerCheckUrlIndexing5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Check URL Indexing 5118",
      description:
        [
          "Check whether each submitted URL is currently indexed by Baidu PC, including its captured title and cache snapshot time.",
          "Use case: technical SEO audits and alerting on de-indexed pages; submit a sitemap-derived URL list to detect coverage gaps.",
          "Difference vs neighbors: get_site_weight_5118 returns aggregate domain authority but no per-URL coverage; get_pc_rank_snapshot_5118 only checks rank, not whether the URL is indexed at all.",
          "Most actionable output fields: data.items[].url, .status (0=not indexed, 1=indexed, 2=failed), .title, .snapshotTime; data.total to verify completeness; data.checkStatus to confirm task finished.",
          "Async contract: defaults to 'wait'. Tasks usually complete within minutes.",
          "Known limits: max 200 URLs per task; Baidu PC only (mobile and other engines not covered); status=2 (failed) does not distinguish 4xx vs 5xx vs DNS failures; submit URLs as fully-qualified including protocol.",
        ].join(" "),
      inputSchema: CHECK_URL_INDEXING_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await checkUrlIndexing5118Handler(input);
      return createToolResult(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload);
    },
  );
}

interface UrlIndexingMeta {
  taskId?: string | number;
  dataReady: boolean;
}

function extractTaskIdFromRoot(root: Record<string, unknown>): string | number | undefined {
  return (
    (root.taskid as string | number | undefined) ??
    (root.taskId as string | number | undefined) ??
    ((root.data as Record<string, unknown> | undefined)?.taskid as string | number | undefined)
  );
}

function resolveUrlIndexingMeta(raw: unknown): UrlIndexingMeta {
  if (!raw || typeof raw !== "object") {
    return { dataReady: false };
  }

  const root = raw as Record<string, unknown>;
  const data = root.data;
  const taskId = extractTaskIdFromRoot(root);

  if (!data || typeof data !== "object") {
    return { taskId, dataReady: false };
  }

  const record = data as Record<string, unknown>;
  const checkStatus = Number(record.check_status);
  const includeResult = record.include_result;
  const dataReady = checkStatus === 1 || (checkStatus !== 0 && Array.isArray(includeResult));

  return { taskId, dataReady };
}

function isPendingSubmitSuccess(raw: unknown): boolean {
  const meta = resolveUrlIndexingMeta(raw);

  if (meta.taskId === undefined || meta.taskId === null) {
    return false;
  }

  return meta.dataReady === false;
}

function extractTaskId(raw: unknown): string | number | undefined {
  if (!raw || typeof raw !== "object") {
    return undefined;
  }

  return extractTaskIdFromRoot(raw as Record<string, unknown>);
}

export async function checkUrlIndexing5118Handler(
  input: CheckUrlIndexing5118Input,
): Promise<ResponseEnvelope<UrlIndexingData>> {
  const mode = input.executionMode ?? "wait";
  const urls = input.urls ?? [];

  if (mode !== "poll" && input.taskId === undefined && urls.length === 0) {
    throw new ToolError("INVALID_INPUT", "urls is required for submit/wait mode.");
  }

  if (urls.length > 200) {
    throw new ToolError("INPUT_LIMIT", "urls length must be less than or equal to 200.");
  }

  if (mode === "poll" && input.taskId === undefined) {
    throw new ToolError("MISSING_TASK_ID", "taskId is required when executionMode is poll.");
  }

  const apiKey = assertApiKey(TOOL_NAME);

  const submit = async (): Promise<unknown> => {
    const encoded = encodeInputFields(
      { urls: urls.join("|") },
      ["urls"],
    );

    return postForm(ENDPOINT, apiKey, encoded);
  };

  const poll = async (taskId: string | number): Promise<unknown> => {
    return postForm(ENDPOINT, apiKey, { taskid: taskId });
  };

  return executeAsyncTool({
    tool: TOOL_NAME,
    apiName: API_NAME,
    endpoint: ENDPOINT,
    executionMode: mode,
    defaultExecutionMode: "wait",
    taskId: input.taskId,
    maxWaitSeconds: input.maxWaitSeconds,
    pollIntervalSeconds: input.pollIntervalSeconds,
    defaultMaxWaitSeconds: DEFAULT_TRAFFIC_MAX_WAIT_SECONDS,
    defaultPollIntervalSeconds: DEFAULT_INDEXING_POLL_INTERVAL_SECONDS,
    pendingCodes: ["101", "200104"],
    isPendingResult: isPendingSubmitSuccess,
    submit,
    poll,
    extractTaskId,
    normalizeData: (raw) => ({
      data: normalizeUrlIndexingResponse(raw),
      pagination: null,
    }),
  });
}