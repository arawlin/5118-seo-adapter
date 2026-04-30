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
    .describe("Required seed keyword. This is the root term that 5118 expands into long-tail keywords."),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional 1-based result page number. Use it to read a later page of normalized keywords. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Optional number of rows per page. Maximum 100. Larger values return more keywords per request."),
  sortField: z
    .string()
    .optional()
    .describe("Optional vendor sort selector. Common values: 2=bidCompanyCount advertiser count, 3=longKeywordCount long-tail count, 4=index PC search index, 5=mobileIndex mobile search index."),
  sortType: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Optional sort direction for sortField. asc=low to high, desc=high to low."),
  filter: z
    .string()
    .optional()
    .describe("Optional vendor quick filter selector. Common values: 1=all results, 2=traffic words, 9=keywords with bidding ads."),
  filterDate: z
    .string()
    .optional()
    .describe("Optional vendor filter date in yyyy-MM-dd format. Use it when you need a specific date snapshot supported by 5118."),
} as const;

export const LONGTAIL_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA,
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  douyinIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  toutiaoIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  longKeywordCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  bidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  pageUrl: STRING_OR_NULL_OUTPUT_SCHEMA,
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  semReason: STRING_OR_NULL_OUTPUT_SCHEMA,
  semPrice: STRING_OR_NULL_OUTPUT_SCHEMA,
  semRecommendPriceAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
});

export const LONGTAIL_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  keywords: z.array(LONGTAIL_KEYWORD_ITEM_OUTPUT_SCHEMA),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
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
  const list = asArray(data.list).length > 0 ? asArray(data.list) : asArray(data.keywords);

  const keywords = list.map((item) => {
    const record = asRecord(item);
    return {
      keyword: toStringOrNull(record.keyword ?? record.word),
      index: toNumber(record.index),
      mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
      haosouIndex: toNumber(record.haosou_index ?? record.haosouIndex),
      douyinIndex: toNumber(record.douyin_index ?? record.douyinIndex),
      toutiaoIndex: toNumber(record.toutiao_index ?? record.toutiaoIndex),
      longKeywordCount: toNumber(record.long_keyword_count ?? record.longKeywordCount),
      bidCompanyCount: toNumber(
        record.bidword_company_count ?? record.bid_company_count ?? record.bidCompanyCount,
      ),
      pageUrl: toStringOrNull(record.page_url ?? record.pageUrl),
      competition: toNumber(record.bidword_kwc ?? record.competition ?? record.compete),
      pcSearchVolume: toNumber(record.bidword_pcpv ?? record.pc_pv ?? record.pcSearchVolume),
      mobileSearchVolume: toNumber(
        record.bidword_wisepv ?? record.wise_pv ?? record.mobileSearchVolume,
      ),
      semReason: toStringOrNull(record.sem_reason ?? record.semReason),
      semPrice: toStringOrNull(record.sem_price ?? record.semPrice),
      semRecommendPriceAvg: toNumber(
        record.sem_recommend_price_avg ??
          record.bidword_recommend_price_avg ??
          record.semRecommendPriceAvg,
      ),
      googleIndex: toNumber(record.google_index ?? record.googleIndex),
      kuaishouIndex: toNumber(record.kuaishou_index ?? record.kuaishouIndex),
      weiboIndex: toNumber(record.weibo_index ?? record.weiboIndex),
    };
  });

  return {
    keywords,
    pagination: createPagination(
      data.page_index ?? data.pageIndex,
      data.page_size ?? data.pageSize,
      data.page_count ?? data.pageCount,
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
        "Sync long-tail keyword mining via 5118 /keyword/word/v2. Input fields: keyword, pageIndex, pageSize<=100, sortField, sortType, filter, filterDate.",
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
