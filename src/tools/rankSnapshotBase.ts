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
import {
  NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  STRING_OR_NULL_OUTPUT_SCHEMA,
} from "./toolRegistration.js";
import { asArray, asRecord, toNumber, toStringOrNull } from "./normalizationUtils.js";

const DEFAULT_RANK_SNAPSHOT_POLL_INTERVAL_SECONDS = 10;

export const RANK_SNAPSHOT_RESULT_ITEM_OUTPUT_SCHEMA = z.object({
  siteUrl: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Host of the page that occupies this SERP slot (e.g. www.example.com). null when the upstream omitted it.",
  ),
  rank: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "1-based SERP position for this row. 0 means the input domain did not appear in the inspected window (when the row reflects the queried domain). null when the upstream omitted the rank.",
  ),
  pageTitle: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Page title scraped by 5118 for this SERP result. null when missing upstream.",
  ),
  pageUrl: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Full landing URL of this SERP result. null when missing upstream.",
  ),
  top100: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Approximate count of keywords for which this site appears in the top-100 SERP, sourced from 5118. Useful as a domain-strength proxy.",
  ),
  siteWeight: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "5118 weight tier for the site, kept as a string because upstream returns mixed numeric/letter codes.",
  ),
});

export const RANK_SNAPSHOT_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA.describe("Keyword that this snapshot was queried for."),
  searchEngine: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Search engine identifier. Typical values: 'baidupc', 'baidumobile'.",
  ),
  ip: STRING_OR_NULL_OUTPUT_SCHEMA.describe("Crawler IP used by 5118 to fetch this SERP."),
  area: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Geographic region label for the crawler (e.g. '广东'). Influences localized SERPs.",
  ),
  network: STRING_OR_NULL_OUTPUT_SCHEMA.describe("ISP/network label for the crawler (e.g. '电信')."),
  ranks: z
    .array(RANK_SNAPSHOT_RESULT_ITEM_OUTPUT_SCHEMA)
    .describe(
      "SERP rows for this keyword. Empty array means 5118 returned no rows; the queried domain is missing whenever no row has a matching siteUrl.",
    ),
});

export const RANK_SNAPSHOT_DATA_OUTPUT_SCHEMA = z.object({
  rankings: z
    .array(RANK_SNAPSHOT_KEYWORD_ITEM_OUTPUT_SCHEMA)
    .describe(
      "One entry per submitted keyword. Empty when the task is still pending or the upstream returned no rows.",
    ),
});

export type RankSnapshotResultItem = z.infer<typeof RANK_SNAPSHOT_RESULT_ITEM_OUTPUT_SCHEMA>;
export type RankSnapshotKeywordItem = z.infer<typeof RANK_SNAPSHOT_KEYWORD_ITEM_OUTPUT_SCHEMA>;
export type RankSnapshotData = z.infer<typeof RANK_SNAPSHOT_DATA_OUTPUT_SCHEMA>;
export type GetPcRankSnapshot5118KeywordItem = RankSnapshotKeywordItem;
export type GetPcRankSnapshot5118RankItem = RankSnapshotResultItem;
export type GetPcRankSnapshot5118Data = RankSnapshotData;
export type GetMobileRankSnapshot5118KeywordItem = RankSnapshotKeywordItem;
export type GetMobileRankSnapshot5118RankItem = RankSnapshotResultItem;
export type GetMobileRankSnapshot5118Data = RankSnapshotData;

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

function normalizeRankResultItem(rankItem: unknown): RankSnapshotResultItem {
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

function normalizeRankSnapshotResponse(raw: unknown): RankSnapshotData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.keywordmonitor);

  return {
    rankings: list.map((item) => {
      const record = asRecord(item);
      const ranks = asArray(record.ranks);

      return {
        keyword: toStringOrNull(record.keyword),
        searchEngine: toStringOrNull(record.search_engine),
        ip: toStringOrNull(record.ip),
        area: toStringOrNull(record.area),
        network: toStringOrNull(record.network),
        ranks: ranks.map((rankItem) => normalizeRankResultItem(rankItem)),
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
  const dataReady = Array.isArray(record.keywordmonitor);

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
  const hasTaskId = input.taskId !== undefined;

  if (mode !== "poll" && !hasTaskId && !input.url) {
    throw new ToolError("INVALID_INPUT", "url is required for submit/wait mode.");
  }

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