import {
  DEFAULT_TRAFFIC_MAX_WAIT_SECONDS,
  executeAsyncTool,
} from "../lib/asyncExecutor.js";
import { ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { encodeInputFields } from "../lib/urlCodec.js";
import { normalizeUrlIndexingResponse } from "../normalizers/siteInsights.js";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import type { AsyncControlInput, ResponseEnvelope } from "../types/toolContracts.js";
import type { UrlIndexingData } from "../types/toolDataContracts.js";

export interface CheckUrlIndexingInput extends AsyncControlInput {
  urls?: string[];
}

const TOOL_NAME = "check_url_indexing_5118";
const API_NAME = "PC URL Indexing API";
const ENDPOINT = "/include";
const DEFAULT_INDEXING_POLL_INTERVAL_SECONDS = 60;

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
  const checkStatus = Number(record.check_status ?? record.checkStatus);
  const includeResult = record.include_result ?? record.list;
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
  input: CheckUrlIndexingInput,
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