import { z } from "zod";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import {
  DEFAULT_KEYWORD_METRICS_MAX_WAIT_SECONDS,
  executeAsyncTool,
} from "../lib/asyncExecutor.js";
import { ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { encodeInputFields } from "../lib/urlCodec.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  NUMBER_OR_NULL_OUTPUT_SCHEMA,
  STRING_OR_NULL_OUTPUT_SCHEMA,
  createToolResult,
  type RegisterTool,
} from "./toolRegistration.js";
import { asArray, asRecord, toNumber, toStringOrNull } from "./normalizationUtils.js";

export const GET_KEYWORD_METRICS_5118_INPUT_SCHEMA = {
  keywords: z
    .array(z.string().min(1))
    .max(50)
    .optional()
    .describe(
      "Optional. Up to 50 keywords to enrich. Required for `submit` and for `wait` when no `taskId` is supplied. Each keyword is sent as one row of the upstream batch; keep the list focused to avoid quota waste.",
    ),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe(
      "Optional. Async execution mode. 'submit'=create a vendor task and return its taskId immediately (executionStatus='pending'). 'poll'=fetch a previously submitted taskId once. 'wait' (default)=submit (or resume from taskId) and keep polling until the task completes or the wait window elapses.",
    ),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe(
      "Optional. Existing vendor task identifier. Required in 'poll'. In 'wait', supply it to resume polling without re-submitting (saves quota).",
    ),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe(
      "Optional. Hard ceiling (seconds) on how long `wait` mode polls before returning a pending envelope. Defaults to the adapter's keyword-metrics ceiling. Ignored in 'submit'/'poll'.",
    ),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe(
      "Optional. Interval (seconds) between poll attempts in 'wait' mode. Defaults to 60. Lower values consume quota faster.",
    ),
} as const;

export const KEYWORD_METRICS_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA.describe("The keyword this row reports on."),
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Baidu PC traffic index (流量指数). Stable. null when 5118 has no value.",
  ),
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Baidu Mobile search index."),
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "360 (Haosou) index. Often null because of partial coverage.",
  ),
  douyinIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Douyin search index."),
  toutiaoIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Toutiao search index."),
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Google search index."),
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Kuaishou search index."),
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Weibo search index."),
  longKeywordCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Number of long-tail variants 5118 has indexed for this keyword.",
  ),
  bidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Number of advertisers/bid companies seen on this keyword. Higher = stronger commercial intent.",
  ),
  cpc: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Reference SEM click price in CNY (5118 field bidword_price). null when not provided.",
  ),
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "SEM competition level (bidword_kwc): 1=high, 2=medium, 3=low.",
  ),
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Daily PC search volume (bidword_pcpv).",
  ),
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Daily mobile search volume (bidword_wisepv).",
  ),
  recommendedBidMin: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Lower bound of the recommended SEM bid range (CNY).",
  ),
  recommendedBidMax: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Upper bound of the recommended SEM bid range (CNY).",
  ),
  recommendedBidAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Recommended average SEM bid (CNY).",
  ),
  ageBest: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Top-converting age band reported by 5118 (e.g. '30-39'). String form because the upstream uses range labels.",
  ),
  ageBestValue: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Share (percentage value) of searches in the `ageBest` band, e.g. 60.22 for 60.22%.",
  ),
  sexMale: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Male audience share as a percentage value (0-100).",
  ),
  sexFemale: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Female audience share as a percentage value (0-100). sexMale + sexFemale should approximate 100.",
  ),
  bidReason: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Free-text label that 5118 attaches to the keyword's SEM/traffic rationale. Often empty.",
  ),
});

export const KEYWORD_METRICS_DATA_OUTPUT_SCHEMA = z.object({
  items: z
    .array(KEYWORD_METRICS_ITEM_OUTPUT_SCHEMA)
    .describe(
      "One row per submitted keyword (in upstream order). Empty while the task is still pending; populated when executionStatus='completed'.",
    ),
});

export type KeywordMetricsItem = z.infer<typeof KEYWORD_METRICS_ITEM_OUTPUT_SCHEMA>;
export type KeywordMetricsData = z.infer<typeof KEYWORD_METRICS_DATA_OUTPUT_SCHEMA>;
export type GetKeywordMetrics5118Item = KeywordMetricsItem;
export type GetKeywordMetrics5118Data = KeywordMetricsData;

export type GetKeywordMetrics5118Input = z.infer<
  z.ZodObject<typeof GET_KEYWORD_METRICS_5118_INPUT_SCHEMA>
>;
export type GetKeywordMetricsInput = GetKeywordMetrics5118Input;

const TOOL_NAME = "get_keyword_metrics_5118";
const API_NAME = "Keyword Search Volume Info API v2";
const ENDPOINT = "/keywordparam/v2";
const DEFAULT_KEYWORD_METRICS_POLL_INTERVAL_SECONDS = 60;

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(KEYWORD_METRICS_DATA_OUTPUT_SCHEMA);

function normalizeKeywordMetricsResponse(raw: unknown): KeywordMetricsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.keyword_param);

  return {
    items: list.map((item) => {
      const record = asRecord(item);
      return {
        keyword: toStringOrNull(record.keyword),
        index: toNumber(record.index),
        mobileIndex: toNumber(record.mobile_index),
        haosouIndex: toNumber(record.haosou_index),
        douyinIndex: toNumber(record.douyin_index),
        toutiaoIndex: toNumber(record.toutiao_index),
        googleIndex: toNumber(record.google_index),
        kuaishouIndex: toNumber(record.kuaishou_index),
        weiboIndex: toNumber(record.weibo_index),
        longKeywordCount: toNumber(record.long_keyword_count),
        bidCompanyCount: toNumber(record.bidword_company_count),
        cpc: toNumber(record.bidword_price),
        competition: toNumber(record.bidword_kwc),
        pcSearchVolume: toNumber(record.bidword_pcpv),
        mobileSearchVolume: toNumber(record.bidword_wisepv),
        recommendedBidMin: toNumber(record.bidword_recommendprice_min),
        recommendedBidMax: toNumber(record.bidword_recommendprice_max),
        recommendedBidAvg: toNumber(record.bidword_recommend_price_avg),
        ageBest: toStringOrNull(record.age_best),
        ageBestValue: toNumber(record.age_best_value),
        sexMale: toNumber(record.sex_male),
        sexFemale: toNumber(record.sex_female),
        bidReason: toStringOrNull(record.bidword_showreasons),
      };
    }),
  };
}


export function registerGetKeywordMetrics5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Keyword Metrics 5118",
      description:
        [
          "Enrich a known keyword list with SEO/SEM metrics: PC and mobile search index, daily search volume, SEM CPC and recommended bid, advertiser count, plus age/gender audience share.",
          "Use case: keyword qualification and prioritization after a discovery step (longtail/suggest); produce a scored shortlist for content or SEM planning.",
          "Difference vs neighbors: get_longtail_keywords_5118 *expands* a single seed into variants; this tool *enriches* a list you already have. get_mobile_traffic_keywords_5118 mines mobile-traffic words for a seed; this tool returns both PC and mobile metrics for an explicit list.",
          "Most actionable output fields: data.items[].pcSearchVolume / .mobileSearchVolume / .index / .mobileIndex (demand), .competition / .bidCompanyCount / .recommendedBidAvg (commercial intent), .ageBest / .sexMale / .sexFemale (audience).",
          "Async contract: 'submit' returns executionStatus='pending' with `taskId` only. 'poll' fetches once. 'wait' (default) polls until completion or `maxWaitSeconds`. taskId is reusable across modes.",
          "Known limits: max 50 keywords per task; upstream completion typically takes seconds-to-minutes; some metrics (e.g. age/gender) are null for low-volume keywords; data is China-market focused.",
        ].join(" "),
      inputSchema: GET_KEYWORD_METRICS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getKeywordMetrics5118Handler(input);
      return createToolResult(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload);
    },
  );
}

interface KeywordMetricsResponseMeta {
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

function resolveKeywordMetricsMeta(raw: unknown): KeywordMetricsResponseMeta {
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
  const dataReady = Array.isArray(record.keyword_param) && record.keyword_param.length > 0;

  return { taskId, dataReady };
}

function isKeywordMetricsDataReady(raw: unknown): boolean {
  return resolveKeywordMetricsMeta(raw).dataReady;
}

function isPendingSubmitSuccess(raw: unknown): boolean {
  const meta = resolveKeywordMetricsMeta(raw);

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

export async function getKeywordMetrics5118Handler(
  input: GetKeywordMetrics5118Input,
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
    defaultPollIntervalSeconds: DEFAULT_KEYWORD_METRICS_POLL_INTERVAL_SECONDS,
    pendingCodes: ["101"],
    isPendingResult: isPendingSubmitSuccess,
    submit,
    poll,
    extractTaskId,
    normalizeData: (raw) => ({
      data: normalizeKeywordMetricsResponse(raw),
      pagination: null,
    }),
  });
}
