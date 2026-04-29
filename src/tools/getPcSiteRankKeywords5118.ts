import { normalizePcSiteRankKeywordsResponse } from "../normalizers/siteInsights.js";
import { createSiteRankKeywordsHandler, type SiteRankKeywordsInput } from "./siteRankKeywordsBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import type { SiteRankKeywordsData } from "../types/toolOutputSchemas.js";

export type GetPcSiteRankKeywordsInput = SiteRankKeywordsInput;

const CONFIG = {
  toolName: "get_pc_site_rank_keywords_5118",
  apiName: "PC Site Rank Keywords Export API v2",
  endpoint: "/keyword/pc/v2",
  normalize: normalizePcSiteRankKeywordsResponse,
} as const;

export async function getPcSiteRankKeywords5118Handler(
  input: GetPcSiteRankKeywordsInput,
): Promise<ResponseEnvelope<SiteRankKeywordsData>> {
  return createSiteRankKeywordsHandler(input, CONFIG);
}