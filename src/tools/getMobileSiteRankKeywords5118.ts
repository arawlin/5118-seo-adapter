import { z } from "zod";
import {
  createSiteRankKeywordsHandler,
  SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA,
} from "./siteRankKeywordsBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  createToolResult,
  type RegisterTool,
} from "./toolRegistration.js";
import type { SiteRankKeywordsData } from "./siteRankKeywordsBase.js";

export const GET_MOBILE_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .describe(
      "Required. Domain or host whose Baidu Mobile ranking keywords should be exported (e.g. 'm.example.com'). Do not include protocol or path. Subdomain aware.",
    ),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Optional. 1-based page number. Default 1. Page size is fixed by the upstream.",
    ),
} as const;

export type GetMobileSiteRankKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_MOBILE_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetMobileSiteRankKeywordsInput = GetMobileSiteRankKeywords5118Input;

const CONFIG = {
  toolName: "get_mobile_site_rank_keywords_5118",
  apiName: "Mobile Site Rank Keywords Export API v2",
  endpoint: "/keyword/mobile/v2",
  dataKeys: ["baidumobile"],
} as const;

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA);


export function registerGetMobileSiteRankKeywords5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    CONFIG.toolName,
    {
      title: "Get Mobile Site Rank Keywords 5118",
      description:
        [
          "Export the Baidu Mobile ranking-keyword list for a single host, including mobile SERP rank, mobile traffic index, daily mobile volume, and SEM signals.",
          "Use case: mobile content-gap analysis and competitor benchmarking; complements the PC variant for sites where mobile traffic dominates.",
          "Difference vs neighbors: get_pc_site_rank_keywords_5118 is the PC counterpart; get_domain_rank_keywords_5118 aggregates Baidu PC ranks across the whole domain.",
          "Most actionable output fields: data.items[].keyword, .rank, .pageUrl, .mobileSearchVolume, .mobileIndex, .competition; iterate via pagination.",
          "Known limits: synchronous one-shot call; Baidu Mobile only; full export may span many pages.",
        ].join(" "),
      inputSchema: GET_MOBILE_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getMobileSiteRankKeywords5118Handler(input);
      return createToolResult(CONFIG.toolName, TOOL_OUTPUT_SCHEMA, payload);
    },
  );
}

export async function getMobileSiteRankKeywords5118Handler(
  input: GetMobileSiteRankKeywords5118Input,
): Promise<ResponseEnvelope<SiteRankKeywordsData>> {
  return createSiteRankKeywordsHandler(input, CONFIG);
}