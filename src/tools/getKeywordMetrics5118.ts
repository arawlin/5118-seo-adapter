import { assertApiKey } from "../config/apiKeyRegistry.js";
import {
  DEFAULT_KEYWORD_METRICS_MAX_WAIT_SECONDS,
  DEFAULT_POLL_INTERVAL_SECONDS,
  executeAsyncTool,
} from "../lib/asyncExecutor.js";
import { ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { encodeInputFields } from "../lib/urlCodec.js";
import {
  normalizeKeywordMetricsResponse,
  type KeywordMetricsData,
} from "../normalizers/keywordMetrics.js";
import type { AsyncControlInput, ResponseEnvelope } from "../types/toolContracts.js";

export interface GetKeywordMetricsInput extends AsyncControlInput {
  keywords?: string[];
}

const TOOL_NAME = "get_keyword_metrics_5118";
const API_NAME = "Keyword Search Volume Info API v2";
const ENDPOINT = "/keywordparam/v2";

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

export async function getKeywordMetrics5118Handler(
  input: GetKeywordMetricsInput,
): Promise<ResponseEnvelope<KeywordMetricsData>> {
  const mode = input.executionMode ?? "wait";
  const keywords = input.keywords ?? [];

  if (mode !== "poll" && keywords.length === 0) {
    throw new ToolError("INVALID_INPUT", "keywords is required for submit/wait mode.");
  }

  if (keywords.length > 50) {
    throw new ToolError("INPUT_LIMIT", "keywords length must be less than or equal to 50.");
  }

  if (mode === "poll" && input.taskId === undefined) {
    throw new ToolError("MISSING_TASK_ID", "taskId is required when executionMode is poll.");
  }

  const apiKey = assertApiKey(TOOL_NAME);

  const submit = async (): Promise<unknown> => {
    const encoded = encodeInputFields({ keywords: keywords.join("|") }, ["keywords"]);
    return postForm(ENDPOINT, apiKey, encoded);
  };

  const poll = async (taskId: string | number): Promise<unknown> => {
    return postForm(ENDPOINT, apiKey, {
      taskid: taskId,
    });
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
    defaultMaxWaitSeconds: DEFAULT_KEYWORD_METRICS_MAX_WAIT_SECONDS,
    defaultPollIntervalSeconds: DEFAULT_POLL_INTERVAL_SECONDS,
    pendingCodes: ["101", "200104"],
    submit,
    poll,
    extractTaskId,
    normalizeData: (raw) => ({
      data: normalizeKeywordMetricsResponse(raw),
      pagination: null,
    }),
  });
}
