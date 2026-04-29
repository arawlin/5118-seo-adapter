import { normalizeMobileSiteRankKeywordsResponse } from "../normalizers/siteInsights.js";
import { createSiteRankKeywordsHandler, type SiteRankKeywordsInput } from "./siteRankKeywordsBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import type { SiteRankKeywordsData } from "../types/toolDataContracts.js";

export type GetMobileSiteRankKeywordsInput = SiteRankKeywordsInput;

const CONFIG = {
  toolName: "get_mobile_site_rank_keywords_5118",
  apiName: "Mobile Site Rank Keywords Export API v2",
  endpoint: "/keyword/mobile/v2",
  normalize: normalizeMobileSiteRankKeywordsResponse,
} as const;

export async function getMobileSiteRankKeywords5118Handler(
  input: GetMobileSiteRankKeywordsInput,
): Promise<ResponseEnvelope<SiteRankKeywordsData>> {
  return createSiteRankKeywordsHandler(input, CONFIG);
}