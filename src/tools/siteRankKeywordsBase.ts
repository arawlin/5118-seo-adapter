import { z } from "zod";
import { assertApiKey, type ApiToolName } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createPagination, createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  NUMBER_OR_NULL_OUTPUT_SCHEMA,
  PAGINATION_OUTPUT_SCHEMA,
  STRING_OR_NULL_OUTPUT_SCHEMA,
} from "./toolRegistration.js";
import {
  asArray,
  asRecord,
  firstArray,
  toNumber,
  toStringOrNull,
} from "./normalizationUtils.js";

export interface SiteRankKeywordsInput {
  url: string;
  pageIndex?: number;
}

export const SITE_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA.describe("Keyword that the inspected site ranks for."),
  rank: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "1-based SERP position of the inspected site for this keyword. null when the upstream omitted it.",
  ),
  pageTitle: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Page title of the ranking page captured by 5118.",
  ),
  pageUrl: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Landing URL of the ranking page captured by 5118.",
  ),
  bidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Total advertiser/bid company count for this keyword. Indicates SEM commercial intent.",
  ),
  longKeywordCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Number of long-tail keywords related to this seed term according to 5118.",
  ),
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Baidu PC traffic index (流量指数). Higher means heavier search demand on Baidu PC.",
  ),
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Baidu Mobile traffic index. Higher means heavier mobile search demand.",
  ),
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "360/Haosou search index. null when 5118 has no value for the term.",
  ),
  douyinIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Douyin search index."),
  toutiaoIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Toutiao search index."),
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "SEM competition level (bidword_kwc): 1=high, 2=medium, 3=low. null when 5118 omits it.",
  ),
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Daily PC search volume for the keyword (bidword_pcpv).",
  ),
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Daily mobile search volume for the keyword (bidword_wisepv).",
  ),
  semReason: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "5118 traffic-feature label explaining why the keyword carries SEM value. null when not provided.",
  ),
  semPrice: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Reference SEM click-price range from 5118 (e.g. '0.35~4.57'). String because the upstream returns a range.",
  ),
  recommendedBidAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Recommended average SEM bid in CNY (bidword_recommend_price_avg).",
  ),
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Google search index."),
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Kuaishou search index."),
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Weibo search index."),
});

export const SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  items: z
    .array(SITE_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA)
    .describe(
      "Ranking-keyword rows for the queried site, sorted by upstream default. Empty when no rows were returned.",
    ),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable().describe(
    "Pagination object for paging through the full export. Null only when the upstream omitted pagination metadata.",
  ),
});

export type SiteRankKeywordItem = z.infer<typeof SITE_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA>;
export type SiteRankKeywordsData = z.infer<typeof SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA>;
export type GetPcSiteRankKeywords5118Item = SiteRankKeywordItem;
export type GetPcSiteRankKeywords5118Data = SiteRankKeywordsData;
export type GetMobileSiteRankKeywords5118Item = SiteRankKeywordItem;
export type GetMobileSiteRankKeywords5118Data = SiteRankKeywordsData;

interface SiteRankKeywordsConfig {
  toolName: ApiToolName;
  apiName: string;
  endpoint: string;
  dataKeys: readonly string[];
}

function normalizeSiteRankKeywordRecord(item: unknown): SiteRankKeywordItem {
  const record = asRecord(item);
  return {
    keyword: toStringOrNull(record.keyword),
    rank: toNumber(record.rank),
    pageTitle: toStringOrNull(record.page_title),
    // PC variant uses `url`; mobile variant uses `page_url`. Both map to pageUrl.
    pageUrl: toStringOrNull(record.page_url ?? record.url),
    bidCompanyCount: toNumber(record.bidword_companycount),
    longKeywordCount: toNumber(record.long_keyword_count),
    index: toNumber(record.index),
    mobileIndex: toNumber(record.mobile_index),
    haosouIndex: toNumber(record.haosou_index),
    douyinIndex: toNumber(record.douyin_index),
    toutiaoIndex: toNumber(record.toutiao_index),
    competition: toNumber(record.bidword_kwc),
    pcSearchVolume: toNumber(record.bidword_pcpv),
    mobileSearchVolume: toNumber(record.bidword_wisepv),
    semReason: toStringOrNull(record.sem_reason),
    semPrice: toStringOrNull(record.sem_price),
    recommendedBidAvg: toNumber(record.bidword_recommend_price_avg),
    googleIndex: toNumber(record.google_index),
    kuaishouIndex: toNumber(record.kuaishou_index),
    weiboIndex: toNumber(record.weibo_index),
  };
}

function normalizeSiteRankKeywords(raw: unknown, dataKeys: readonly string[]): SiteRankKeywordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = firstArray(data, dataKeys);

  return {
    items: list.map((item) => normalizeSiteRankKeywordRecord(item)),
    pagination: createPagination(
      data.page_index,
      data.page_size,
      data.page_count,
      data.total,
    ),
  };
}

export async function createSiteRankKeywordsHandler(
  input: SiteRankKeywordsInput,
  config: SiteRankKeywordsConfig,
): Promise<ResponseEnvelope<SiteRankKeywordsData>> {
  const pageIndex = input.pageIndex ?? 1;

  if (pageIndex <= 0) {
    throw new ToolError("INVALID_INPUT", "pageIndex must be greater than 0.");
  }

  const apiKey = assertApiKey(config.toolName);
  const encoded = encodeInputFields(
    {
      url: input.url,
      page_index: pageIndex,
    },
    ["url"],
  );

  const raw = await postForm(config.endpoint, apiKey, encoded);
  const errcode = getErrcode(raw);

  if (errcode !== "0") {
    const errmsg = String((raw as Record<string, unknown>)?.errmsg ?? "");
    throw map5118Error(errcode, errmsg, raw);
  }

  const decoded = decodeResponseStrings(raw);
  const normalized = normalizeSiteRankKeywords(decoded, config.dataKeys);

  return createResponseEnvelope({
    tool: config.toolName,
    apiName: config.apiName,
    endpoint: config.endpoint,
    mode: "sync",
    executionStatus: "completed",
    pagination: normalized.pagination,
    data: normalized,
    raw,
  });
}