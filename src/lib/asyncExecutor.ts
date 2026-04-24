import { getErrcode, isVendorSuccess, map5118Error, ToolError } from "./errorMapper.js";
import { createResponseEnvelope } from "./responseEnvelope.js";
import { decodeResponseStrings } from "./urlCodec.js";
import type { AsyncExecutionMode, PaginationInfo, ResponseEnvelope } from "../types/toolContracts.js";

export const DEFAULT_POLL_INTERVAL_SECONDS = 10;
export const DEFAULT_KEYWORD_METRICS_MAX_WAIT_SECONDS = 120;
export const DEFAULT_TRAFFIC_MAX_WAIT_SECONDS = 600;

function sleep(seconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, seconds) * 1000);
  });
}

function normalizePendingCodes(codes: Array<string | number> | undefined): Set<string> {
  return new Set((codes ?? []).map((code) => String(code)));
}

export interface ExecuteAsyncToolOptions<TData> {
  tool: string;
  apiName: string;
  endpoint: string;
  executionMode?: AsyncExecutionMode;
  defaultExecutionMode?: AsyncExecutionMode;
  taskId?: string | number;
  maxWaitSeconds?: number;
  pollIntervalSeconds?: number;
  defaultMaxWaitSeconds: number;
  defaultPollIntervalSeconds?: number;
  pendingCodes?: Array<string | number>;
  submit: () => Promise<unknown>;
  poll: (taskId: string | number) => Promise<unknown>;
  extractTaskId: (raw: unknown) => string | number | undefined;
  normalizeData: (raw: unknown) => { data: TData; pagination?: PaginationInfo | null };
}

function buildCompletedEnvelope<TData>(
  options: ExecuteAsyncToolOptions<TData>,
  raw: unknown,
  taskId?: string | number,
): ResponseEnvelope<TData> {
  const decoded = decodeResponseStrings(raw);
  const normalized = options.normalizeData(decoded);

  return createResponseEnvelope({
    tool: options.tool,
    apiName: options.apiName,
    endpoint: options.endpoint,
    mode: "async",
    executionStatus: "completed",
    taskId: taskId ?? options.extractTaskId(decoded) ?? null,
    pagination: normalized.pagination ?? null,
    data: normalized.data,
    raw,
  });
}

function buildPendingEnvelope<TData>(
  options: ExecuteAsyncToolOptions<TData>,
  raw: unknown,
  taskId: string | number,
): ResponseEnvelope<TData> {
  return createResponseEnvelope<TData>({
    tool: options.tool,
    apiName: options.apiName,
    endpoint: options.endpoint,
    mode: "async",
    executionStatus: "pending",
    taskId,
    data: null,
    raw,
  });
}

function throwMappedError(raw: unknown): never {
  const code = getErrcode(raw);
  const errmsg =
    typeof raw === "object" && raw !== null
      ? String((raw as Record<string, unknown>).errmsg ?? "")
      : "";
  throw map5118Error(code, errmsg, raw);
}

export async function executeAsyncTool<TData>(
  options: ExecuteAsyncToolOptions<TData>,
): Promise<ResponseEnvelope<TData>> {
  const mode = options.executionMode ?? options.defaultExecutionMode ?? "wait";
  const pendingCodes = normalizePendingCodes(options.pendingCodes);
  const pollIntervalSeconds =
    options.pollIntervalSeconds ?? options.defaultPollIntervalSeconds ?? DEFAULT_POLL_INTERVAL_SECONDS;
  const maxWaitSeconds = options.maxWaitSeconds ?? options.defaultMaxWaitSeconds;

  let taskId = options.taskId;

  const evaluateOne = (raw: unknown): ResponseEnvelope<TData> | "continue" => {
    const code = getErrcode(raw);

    if (isVendorSuccess(raw)) {
      return buildCompletedEnvelope(options, raw, taskId);
    }

    if (code && pendingCodes.has(code)) {
      const extractedTaskId = options.extractTaskId(raw) ?? taskId;

      if (extractedTaskId === undefined) {
        throw new ToolError("MISSING_TASK_ID", "Pending response did not include taskId.", false, raw);
      }

      taskId = extractedTaskId;

      if (mode === "wait") {
        return "continue";
      }

      return buildPendingEnvelope(options, raw, extractedTaskId);
    }

    throwMappedError(raw);
  };

  if (mode === "submit") {
    const submitRaw = await options.submit();
    return evaluateOne(submitRaw) as ResponseEnvelope<TData>;
  }

  if (mode === "poll") {
    if (taskId === undefined) {
      throw new ToolError("MISSING_TASK_ID", "taskId is required when executionMode is poll.");
    }

    const pollRaw = await options.poll(taskId);
    return evaluateOne(pollRaw) as ResponseEnvelope<TData>;
  }

  if (taskId === undefined) {
    const submitRaw = await options.submit();
    const submitResult = evaluateOne(submitRaw);

    if (submitResult !== "continue") {
      return submitResult;
    }
  }

  if (taskId === undefined) {
    throw new ToolError("MISSING_TASK_ID", "wait mode could not establish a valid taskId.");
  }

  const startedAt = Date.now();

  while (true) {
    if ((Date.now() - startedAt) / 1000 > maxWaitSeconds) {
      throw new ToolError(
        "POLL_TIMEOUT",
        `Polling timed out after ${maxWaitSeconds} seconds for task ${String(taskId)}.`,
        false,
      );
    }

    const pollRaw = await options.poll(taskId);
    const pollResult = evaluateOne(pollRaw);

    if (pollResult !== "continue") {
      return pollResult;
    }

    await sleep(pollIntervalSeconds);
  }
}
