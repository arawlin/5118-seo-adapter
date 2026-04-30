import { z } from "zod";
import { assertApiKey, type ApiToolName } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  NUMBER_OR_NULL_OUTPUT_SCHEMA,
  PAGINATION_OUTPUT_SCHEMA,
  STRING_OR_NULL_OUTPUT_SCHEMA,
} from "./toolRegistration.js";

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
  normalize: (raw: unknown) => SiteRankKeywordsData;
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
  const normalized = config.normalize(decoded);

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