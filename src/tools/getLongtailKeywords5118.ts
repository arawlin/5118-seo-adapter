import { z } from "zod";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createPagination, createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  NUMBER_OR_NULL_OUTPUT_SCHEMA,
  PAGINATION_OUTPUT_SCHEMA,
  STRING_OR_NULL_OUTPUT_SCHEMA,
  createToolResult,
  type RegisterTool,
} from "./toolRegistration.js";
import { asArray, asRecord, toNumber, toStringOrNull } from "./normalizationUtils.js";

export const GET_LONGTAIL_KEYWORDS_5118_INPUT_SCHEMA = {
  keyword: z
    .string()
    .min(1)
    .describe(
      "Required. Seed keyword (Chinese or English) that 5118 will expand into long-tail variants. Pass exactly the user-facing term; do not concatenate or pre-encode it.",
    ),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Optional. 1-based page number for paging through the full long-tail set. Default 1. Must be >= 1.",
    ),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe(
      "Optional. Rows per page. Default 20 (adapter default), maximum 100 (upstream cap). Values above 100 are rejected before the call.",
    ),
  sortField: z
    .string()
    .optional()
    .describe(
      "Optional. Upstream sort selector (vendor numeric code passed through as-is). Common values: 2=bid company count, 3=long-tail count, 4=PC traffic index (default upstream sort), 5=mobile index, 6=360 index, 7=PC daily volume, 8=mobile daily volume, 9=competition level.",
    ),
  sortType: z
    .enum(["asc", "desc"])
    .optional()
    .describe(
      "Optional. Sort direction for `sortField`. 'asc'=low-to-high, 'desc'=high-to-low. Upstream default is 'desc'. Only meaningful when `sortField` is set.",
    ),
  filter: z
    .string()
    .optional()
    .describe(
      "Optional. Quick-filter selector (vendor numeric code). 1=all (upstream default), 2=traffic words, 3=PC index words, 4=mobile index words, 5=360 index words, 6=traffic-feature words, 7=PC volume words, 8=mobile volume words, 9=words with active bid advertisers.",
    ),
  filterDate: z
    .string()
    .optional()
    .describe(
      "Optional. Snapshot date in 'yyyy-MM-dd'. Use only when 5118 supports a historical snapshot for the term. Omit for the latest data.",
    ),
} as const;

export const LONGTAIL_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA.describe("The expanded long-tail keyword."),
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Baidu PC traffic index (流量指数). Stable. null means 5118 has no value; 0 means upstream-reported zero.",
  ),
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Baidu Mobile search index. Stable.",
  ),
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "360 (Haosou) search index. Often null because the upstream coverage is partial.",
  ),
  douyinIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Douyin search index."),
  toutiaoIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Toutiao search index."),
  longKeywordCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Number of further long-tail variants 5118 has indexed for this term.",
  ),
  bidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Number of advertisers/bid companies seen for the term. Indicates SEM commercial intent.",
  ),
  pageUrl: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Recommended representative landing page from 5118. Often null/empty.",
  ),
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "SEM competition level (bidword_kwc): 1=high, 2=medium, 3=low. null when 5118 omits it.",
  ),
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Daily PC search volume (bidword_pcpv).",
  ),
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Daily mobile search volume (bidword_wisepv).",
  ),
  semReason: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Free-text label that 5118 attaches to traffic features (e.g. 高商业价值). Often empty.",
  ),
  semPrice: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Reference SEM click-price range in CNY (e.g. '0.35~4.57'). Kept as string because the upstream returns a range.",
  ),
  semRecommendPriceAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Recommended average SEM bid (CNY) for this term.",
  ),
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Google search index (mainland-China-skewed estimate).",
  ),
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Kuaishou search index."),
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Weibo search index."),
});

export const LONGTAIL_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  keywords: z
    .array(LONGTAIL_KEYWORD_ITEM_OUTPUT_SCHEMA)
    .describe(
      "Long-tail keyword rows for the current page, sorted per `sortField`/`sortType`. Empty array when 5118 returns no rows.",
    ),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable().describe(
    "Pagination metadata echoed from the upstream. Use it to drive subsequent pageIndex calls.",
  ),
});

export type LongtailKeywordItem = z.infer<typeof LONGTAIL_KEYWORD_ITEM_OUTPUT_SCHEMA>;
export type LongtailKeywordsData = z.infer<typeof LONGTAIL_KEYWORDS_DATA_OUTPUT_SCHEMA>;
export type GetLongtailKeywords5118Item = LongtailKeywordItem;
export type GetLongtailKeywords5118Data = LongtailKeywordsData;

export type GetLongtailKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_LONGTAIL_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetLongtailKeywordsInput = GetLongtailKeywords5118Input;

const TOOL_NAME = "get_longtail_keywords_5118";
const API_NAME = "Massive Long-tail Keyword Mining v2";
const ENDPOINT = "/keyword/word/v2";

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(LONGTAIL_KEYWORDS_DATA_OUTPUT_SCHEMA);

function normalizeLongtailKeywordsResponse(raw: unknown): LongtailKeywordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.word);

  const keywords = list.map((item) => {
    const record = asRecord(item);
    return {
      keyword: toStringOrNull(record.keyword),
      index: toNumber(record.index),
      mobileIndex: toNumber(record.mobile_index),
      haosouIndex: toNumber(record.haosou_index),
      douyinIndex: toNumber(record.douyin_index),
      toutiaoIndex: toNumber(record.toutiao_index),
      longKeywordCount: toNumber(record.long_keyword_count),
      bidCompanyCount: toNumber(record.bidword_company_count),
      pageUrl: toStringOrNull(record.page_url),
      competition: toNumber(record.bidword_kwc),
      pcSearchVolume: toNumber(record.bidword_pcpv),
      mobileSearchVolume: toNumber(record.bidword_wisepv),
      semReason: toStringOrNull(record.sem_reason),
      semPrice: toStringOrNull(record.sem_price),
      semRecommendPriceAvg: toNumber(record.sem_recommend_price_avg),
      googleIndex: toNumber(record.google_index),
      kuaishouIndex: toNumber(record.kuaishou_index),
      weiboIndex: toNumber(record.weibo_index),
    };
  });

  return {
    keywords,
    pagination: createPagination(
      data.page_index,
      data.page_size,
      data.page_count,
      data.total,
    ),
  };
}


export function registerGetLongtailKeywords5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Longtail Keywords 5118",
      description:
        [
          "Mine long-tail keyword variants for a seed term, with PC/mobile indices, daily search volume, SEM competition, and recommended bid price.",
          "Use case: keyword research and content-gap analysis when you start from a single seed term and need a paginated list of expansions ranked by traffic or SEM intent.",
          "Difference vs neighbors: get_suggest_terms_5118 returns SERP autocomplete hints (no metrics); get_keyword_metrics_5118 enriches a known keyword list (no expansion); get_industry_frequency_words_5118 returns co-occurring industry terms (no metrics).",
          "Most actionable output fields: data.keywords[].keyword, .index, .mobileIndex, .pcSearchVolume, .mobileSearchVolume, .competition, .semRecommendPriceAvg, plus pagination for paging.",
          "Known limits: synchronous one-shot call; pageSize <= 100; results may be empty for very narrow seeds; many index fields may be null when 5118 has no coverage; data is China-market focused.",
        ].join(" "),
      inputSchema: GET_LONGTAIL_KEYWORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getLongtailKeywords5118Handler(input);
      return createToolResult(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload);
    },
  );
}

export async function getLongtailKeywords5118Handler(
  input: GetLongtailKeywords5118Input,
): Promise<ResponseEnvelope<LongtailKeywordsData>> {
  if ((input.pageSize ?? 20) > 100) {
    throw new ToolError("INPUT_LIMIT", "pageSize must be less than or equal to 100.");
  }

  const apiKey = assertApiKey(TOOL_NAME);
  const encoded = encodeInputFields(
    {
      keyword: input.keyword,
      page_index: input.pageIndex ?? 1,
      page_size: input.pageSize ?? 20,
      sort_field: input.sortField,
      sort_type: input.sortType,
      filter: input.filter,
      filter_date: input.filterDate,
    },
    ["keyword", "filter"],
  );

  const raw = await postForm(ENDPOINT, apiKey, encoded);
  const errcode = getErrcode(raw);

  if (errcode !== "0") {
    const errmsg = String((raw as Record<string, unknown>)?.errmsg ?? "");
    throw map5118Error(errcode, errmsg, raw);
  }

  const decoded = decodeResponseStrings(raw);
  const normalized = normalizeLongtailKeywordsResponse(decoded);

  return createResponseEnvelope({
    tool: TOOL_NAME,
    apiName: API_NAME,
    endpoint: ENDPOINT,
    mode: "sync",
    executionStatus: "completed",
    pagination: normalized.pagination,
    data: normalized,
    raw,
  });
}
