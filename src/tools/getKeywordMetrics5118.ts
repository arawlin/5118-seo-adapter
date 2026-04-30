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
    .describe("Optional keyword list to submit to 5118. Required for submit mode, and also required for wait mode when taskId is not provided. Maximum 50 keywords per task."),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe("Optional async execution mode. submit=create a vendor task and return taskId; poll=query an existing task by taskId; wait=submit or resume a task and keep polling until completion or timeout."),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling an already-created task."),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional maximum client-side wait time in seconds for wait mode. The tool stops polling and returns the latest pending state when this limit is reached."),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional polling interval in seconds for wait mode. Defaults to 60 seconds when omitted."),
} as const;

export const KEYWORD_METRICS_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA,
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  douyinIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  toutiaoIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  longKeywordCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  bidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  cpc: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  recommendedBidMin: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  recommendedBidMax: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  recommendedBidAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  ageBest: STRING_OR_NULL_OUTPUT_SCHEMA,
  ageBestValue: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  sexMale: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  sexFemale: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  bidReason: STRING_OR_NULL_OUTPUT_SCHEMA,
});

export const KEYWORD_METRICS_DATA_OUTPUT_SCHEMA = z.object({
  items: z.array(KEYWORD_METRICS_ITEM_OUTPUT_SCHEMA),
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
  const data = root.data;
  const dataRecord = asRecord(data);
  const list =
    asArray(data).length > 0
      ? asArray(data)
      : asArray(dataRecord.keyword_param).length > 0
        ? asArray(dataRecord.keyword_param)
        : asArray(dataRecord.list);

  return {
    items: list.map((item) => {
      const record = asRecord(item);
      return {
        keyword: toStringOrNull(record.keyword ?? record.word),
        index: toNumber(record.index),
        mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
        haosouIndex: toNumber(record.haosou_index ?? record.haosouIndex),
        douyinIndex: toNumber(record.douyin_index ?? record.douyinIndex),
        toutiaoIndex: toNumber(record.toutiao_index ?? record.toutiaoIndex),
        googleIndex: toNumber(record.google_index ?? record.googleIndex),
        kuaishouIndex: toNumber(record.kuaishou_index ?? record.kuaishouIndex),
        weiboIndex: toNumber(record.weibo_index ?? record.weiboIndex),
        longKeywordCount: toNumber(record.long_keyword_count ?? record.longKeywordCount),
        bidCompanyCount: toNumber(
          record.bidword_company_count ?? record.bid_company_count ?? record.bidCompanyCount,
        ),
        cpc: toNumber(record.bidword_price ?? record.cpc ?? record.bid_price ?? record.bidPrice),
        competition: toNumber(record.bidword_kwc ?? record.competition ?? record.compete),
        pcSearchVolume: toNumber(record.bidword_pcpv ?? record.pc_pv ?? record.pcSearchVolume),
        mobileSearchVolume: toNumber(
          record.bidword_wisepv ?? record.wise_pv ?? record.mobileSearchVolume,
        ),
        recommendedBidMin: toNumber(
          record.bidword_recommendprice_min ?? record.recommended_bid_min ?? record.recommendedBidMin,
        ),
        recommendedBidMax: toNumber(
          record.bidword_recommendprice_max ?? record.recommended_bid_max ?? record.recommendedBidMax,
        ),
        recommendedBidAvg: toNumber(
          record.bidword_recommend_price_avg ??
            record.recommended_bid_avg ??
            record.recommendedBidAvg,
        ),
        ageBest: toStringOrNull(record.age_best ?? record.ageBest),
        ageBestValue: toNumber(record.age_best_value ?? record.ageBestValue),
        sexMale: toNumber(record.sex_male ?? record.sexMale),
        sexFemale: toNumber(record.sex_female ?? record.sexFemale),
        bidReason: toStringOrNull(
          record.bidword_showreasons ?? record.bidReason ?? record.sem_reason,
        ),
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
        "Async keyword metrics via 5118 /keywordparam/v2. Input fields: keywords<=50, executionMode submit|poll|wait, taskId, maxWaitSeconds, pollIntervalSeconds.",
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

  if (Array.isArray(data)) {
    return { taskId, dataReady: data.length > 0 };
  }

  if (!data || typeof data !== "object") {
    return { taskId, dataReady: false };
  }

  const record = data as Record<string, unknown>;
  const dataReady =
    (Array.isArray(record.keyword_param) && record.keyword_param.length > 0) ||
    (Array.isArray(record.list) && record.list.length > 0);

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
