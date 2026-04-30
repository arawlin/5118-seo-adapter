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
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA,
  rank: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  pageTitle: STRING_OR_NULL_OUTPUT_SCHEMA,
  pageUrl: STRING_OR_NULL_OUTPUT_SCHEMA,
  bidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  longKeywordCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  douyinIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  toutiaoIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  semReason: STRING_OR_NULL_OUTPUT_SCHEMA,
  semPrice: STRING_OR_NULL_OUTPUT_SCHEMA,
  recommendedBidAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
});

export const SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  items: z.array(SITE_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
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
    keyword: toStringOrNull(record.keyword ?? record.word),
    rank: toNumber(record.rank),
    pageTitle: toStringOrNull(record.page_title ?? record.pageTitle),
    pageUrl: toStringOrNull(record.page_url ?? record.pageUrl ?? record.url),
    bidCompanyCount: toNumber(
      record.bidword_companycount ?? record.bidword_company_count ?? record.bidCompanyCount,
    ),
    longKeywordCount: toNumber(record.long_keyword_count ?? record.longKeywordCount),
    index: toNumber(record.index),
    mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
    haosouIndex: toNumber(record.haosou_index ?? record.haosouIndex),
    douyinIndex: toNumber(record.douyin_index ?? record.douyinIndex),
    toutiaoIndex: toNumber(record.toutiao_index ?? record.toutiaoIndex),
    competition: toNumber(record.bidword_kwc ?? record.competition),
    pcSearchVolume: toNumber(record.bidword_pcpv ?? record.pcSearchVolume),
    mobileSearchVolume: toNumber(record.bidword_wisepv ?? record.mobileSearchVolume),
    semReason: toStringOrNull(record.sem_reason ?? record.semReason),
    semPrice: toStringOrNull(record.sem_price ?? record.semPrice),
    recommendedBidAvg: toNumber(
      record.bidword_recommend_price_avg ?? record.recommendedBidAvg,
    ),
    googleIndex: toNumber(record.google_index ?? record.googleIndex),
    kuaishouIndex: toNumber(record.kuaishou_index ?? record.kuaishouIndex),
    weiboIndex: toNumber(record.weibo_index ?? record.weiboIndex),
  };
}

function normalizeSiteRankKeywords(raw: unknown, dataKeys: readonly string[]): SiteRankKeywordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = firstArray(data, [...dataKeys, "list"]);

  return {
    items: list.map((item) => normalizeSiteRankKeywordRecord(item)),
    pagination: createPagination(
      data.page_index ?? data.pageIndex,
      data.page_size ?? data.pageSize,
      data.page_count ?? data.pageCount,
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