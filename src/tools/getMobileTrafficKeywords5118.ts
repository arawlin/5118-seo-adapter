import {
  DEFAULT_POLL_INTERVAL_SECONDS,
  DEFAULT_TRAFFIC_MAX_WAIT_SECONDS,
  executeAsyncTool,
} from "../lib/asyncExecutor.js";
import { ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { encodeInputFields } from "../lib/urlCodec.js";
import {
  normalizeMobileTrafficKeywordsResponse,
  type MobileTrafficKeywordsData,
} from "../normalizers/keywordMetrics.js";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import type { AsyncControlInput, ResponseEnvelope } from "../types/toolContracts.js";

export interface GetMobileTrafficKeywordsInput extends AsyncControlInput {
  keyword?: string;
  pageIndex?: number;
  pageSize?: number;
}

const TOOL_NAME = "get_mobile_traffic_keywords_5118";
const API_NAME = "Mobile Traffic Keyword Mining";
const ENDPOINT = "/traffic";

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
  input: GetMobileTrafficKeywordsInput,
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
