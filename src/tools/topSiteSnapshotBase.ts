import { z } from "zod";
import { assertApiKey, type ApiToolName } from "../config/apiKeyRegistry.js";
import {
  DEFAULT_TRAFFIC_MAX_WAIT_SECONDS,
  executeAsyncTool,
} from "../lib/asyncExecutor.js";
import { ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { encodeInputFields } from "../lib/urlCodec.js";
import type { AsyncControlInput, ResponseEnvelope } from "../types/toolContracts.js";
import { STRING_OR_NULL_OUTPUT_SCHEMA } from "./toolRegistration.js";
import { RANK_SNAPSHOT_RESULT_ITEM_OUTPUT_SCHEMA } from "./rankSnapshotBase.js";
import {
  asArray,
  asRecord,
  firstArray,
  toNumber,
  toStringOrNull,
} from "./normalizationUtils.js";

const DEFAULT_TOP_SITE_POLL_INTERVAL_SECONDS = 60;

export const TOP_SITE_SNAPSHOT_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA.describe("Keyword that this top-N snapshot was queried for."),
  searchEngine: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Search engine identifier (e.g. 'baidupc', 'baidumobile').",
  ),
  ip: STRING_OR_NULL_OUTPUT_SCHEMA.describe("Crawler IP used by 5118 for this snapshot."),
  area: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Geographic region label for the crawler (e.g. '广东').",
  ),
  network: STRING_OR_NULL_OUTPUT_SCHEMA.describe("ISP/network label for the crawler (e.g. '电信')."),
  checkedAt: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Upstream snapshot timestamp echoed verbatim, typically 'YYYY-MM-DD HH:mm:ss' in Asia/Shanghai. null when not provided.",
  ),
  ranks: z
    .array(RANK_SNAPSHOT_RESULT_ITEM_OUTPUT_SCHEMA)
    .describe(
      "Ordered SERP rows from rank 1 up to checkRow. Empty array when 5118 returned no rows.",
    ),
});

export const TOP_SITE_SNAPSHOTS_DATA_OUTPUT_SCHEMA = z.object({
  siteSnapshots: z
    .array(TOP_SITE_SNAPSHOT_ITEM_OUTPUT_SCHEMA)
    .describe(
      "One entry per submitted keyword. Empty while the vendor task is still pending or when 5118 returned no rows.",
    ),
});

export type TopSiteSnapshotItem = z.infer<typeof TOP_SITE_SNAPSHOT_ITEM_OUTPUT_SCHEMA>;
export type TopSiteSnapshotsData = z.infer<typeof TOP_SITE_SNAPSHOTS_DATA_OUTPUT_SCHEMA>;
export type GetPcTop50Sites5118Item = TopSiteSnapshotItem;
export type GetPcTop50Sites5118Data = TopSiteSnapshotsData;
export type GetMobileTop50Sites5118Item = TopSiteSnapshotItem;
export type GetMobileTop50Sites5118Data = TopSiteSnapshotsData;

export interface TopSiteSnapshotInput extends AsyncControlInput {
  keywords?: string[];
  checkRow?: number;
}

interface TopSiteSnapshotConfig {
  toolName: ApiToolName;
  apiName: string;
  endpoint: string;
  maxCheckRow: number;
}

interface TopSiteSnapshotMeta {
  taskId?: string | number;
  dataReady: boolean;
}

function normalizeRankResultItem(rankItem: unknown): z.infer<typeof RANK_SNAPSHOT_RESULT_ITEM_OUTPUT_SCHEMA> {
  const rankRecord = asRecord(rankItem);
  return {
    siteUrl: toStringOrNull(rankRecord.site_url),
    rank: toNumber(rankRecord.rank),
    pageTitle: toStringOrNull(rankRecord.page_title),
    pageUrl: toStringOrNull(rankRecord.page_url),
    top100: toNumber(rankRecord.top100),
    siteWeight: toStringOrNull(rankRecord.site_weight),
  };
}

function normalizeTopSiteSnapshotsResponse(raw: unknown): TopSiteSnapshotsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.keyword_monitor);

  return {
    siteSnapshots: list.map((item) => {
      const record = asRecord(item);
      return {
        keyword: toStringOrNull(record.keyword),
        searchEngine: toStringOrNull(record.search_engine),
        ip: toStringOrNull(record.ip),
        area: toStringOrNull(record.area),
        network: toStringOrNull(record.network),
        checkedAt: toStringOrNull(record.time),
        ranks: asArray(record.ranks).map((rankItem) => normalizeRankResultItem(rankItem)),
      };
    }),
  };
}

function extractTaskIdFromRoot(root: Record<string, unknown>): string | number | undefined {
  return (
    (root.taskid as string | number | undefined) ??
    (root.taskId as string | number | undefined) ??
    ((root.data as Record<string, unknown> | undefined)?.taskid as string | number | undefined)
  );
}

function resolveTopSiteSnapshotMeta(raw: unknown): TopSiteSnapshotMeta {
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
  const dataReady = Array.isArray(record.keyword_monitor);

  return { taskId, dataReady };
}

function isPendingSubmitSuccess(raw: unknown): boolean {
  const meta = resolveTopSiteSnapshotMeta(raw);

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

export async function createTopSiteSnapshotHandler(
  input: TopSiteSnapshotInput,
  config: TopSiteSnapshotConfig,
): Promise<ResponseEnvelope<TopSiteSnapshotsData>> {
  const mode = input.executionMode ?? "wait";
  const keywords = input.keywords ?? [];
  const hasTaskId = input.taskId !== undefined;

  if (mode !== "poll" && !hasTaskId && keywords.length === 0) {
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
        keywords: keywords.join("|"),
        checkrow: input.checkRow,
      },
      ["keywords"],
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
    defaultPollIntervalSeconds: DEFAULT_TOP_SITE_POLL_INTERVAL_SECONDS,
    pendingCodes: ["101", "200104"],
    isPendingResult: isPendingSubmitSuccess,
    submit,
    poll,
    extractTaskId,
    normalizeData: (raw) => ({
      data: normalizeTopSiteSnapshotsResponse(raw),
      pagination: null,
    }),
  });
}