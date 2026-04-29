import { assertApiKey, type ApiToolName } from "../config/apiKeyRegistry.js";
import {
  DEFAULT_TRAFFIC_MAX_WAIT_SECONDS,
  executeAsyncTool,
} from "../lib/asyncExecutor.js";
import { ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { encodeInputFields } from "../lib/urlCodec.js";
import { normalizeRankSnapshotResponse } from "../normalizers/siteInsights.js";
import type { AsyncControlInput, ResponseEnvelope } from "../types/toolContracts.js";
import type { RankSnapshotData } from "../types/toolDataContracts.js";

const DEFAULT_RANK_SNAPSHOT_POLL_INTERVAL_SECONDS = 60;

export interface RankSnapshotInput extends AsyncControlInput {
  url?: string;
  keywords?: string[];
  checkRow?: number;
}

interface RankSnapshotConfig {
  toolName: ApiToolName;
  apiName: string;
  endpoint: string;
  maxCheckRow: number;
}

interface RankSnapshotMeta {
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

function resolveRankSnapshotMeta(raw: unknown): RankSnapshotMeta {
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
  const dataReady = Array.isArray(record.keywordmonitor) || Array.isArray(record.list);

  return { taskId, dataReady };
}

function isPendingSubmitSuccess(raw: unknown): boolean {
  const meta = resolveRankSnapshotMeta(raw);

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

export async function createRankSnapshotHandler(
  input: RankSnapshotInput,
  config: RankSnapshotConfig,
): Promise<ResponseEnvelope<RankSnapshotData>> {
  const mode = input.executionMode ?? "wait";
  const keywords = input.keywords ?? [];

  if (mode !== "poll" && !input.url) {
    throw new ToolError("INVALID_INPUT", "url is required for submit/wait mode.");
  }

  if (mode !== "poll" && keywords.length === 0) {
    throw new ToolError("INVALID_INPUT", "keywords is required for submit/wait mode.");
  }

  if (keywords.length > 50) {
    throw new ToolError("INPUT_LIMIT", "keywords length must be less than or equal to 50.");
  }

  if (
    input.checkRow !== undefined &&
    (input.checkRow <= 0 || input.checkRow > config.maxCheckRow)
  ) {
    throw new ToolError(
      "INVALID_INPUT",
      `checkRow must be between 1 and ${String(config.maxCheckRow)}.`,
    );
  }

  if (mode === "poll" && input.taskId === undefined) {
    throw new ToolError("MISSING_TASK_ID", "taskId is required when executionMode is poll.");
  }

  const apiKey = assertApiKey(config.toolName);

  const submit = async (): Promise<unknown> => {
    const encoded = encodeInputFields(
      {
        url: input.url,
        keywords: keywords.join("|"),
        checkrow: input.checkRow,
      },
      ["url", "keywords"],
    );

    return postForm(config.endpoint, apiKey, encoded);
  };

  const poll = async (taskId: string | number): Promise<unknown> => {
    return postForm(config.endpoint, apiKey, { taskid: taskId });
  };

  return executeAsyncTool({
    tool: config.toolName,
    apiName: config.apiName,
    endpoint: config.endpoint,
    executionMode: mode,
    defaultExecutionMode: "wait",
    taskId: input.taskId,
    maxWaitSeconds: input.maxWaitSeconds,
    pollIntervalSeconds: input.pollIntervalSeconds,
    defaultMaxWaitSeconds: DEFAULT_TRAFFIC_MAX_WAIT_SECONDS,
    defaultPollIntervalSeconds: DEFAULT_RANK_SNAPSHOT_POLL_INTERVAL_SECONDS,
    pendingCodes: ["101", "200104"],
    isPendingResult: isPendingSubmitSuccess,
    submit,
    poll,
    extractTaskId,
    normalizeData: (raw) => ({
      data: normalizeRankSnapshotResponse(raw),
      pagination: null,
    }),
  });
}