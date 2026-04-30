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

export const GET_PC_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .describe(
      "Required. Domain or host whose Baidu PC ranking keywords should be exported (e.g. 'www.example.com'). Do not include protocol or path. Subdomain aware.",
    ),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Optional. 1-based page number. Default 1. Page size is fixed by the upstream (typically 500 rows per page).",
    ),
} as const;

export type GetPcSiteRankKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_PC_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetPcSiteRankKeywordsInput = GetPcSiteRankKeywords5118Input;

const CONFIG = {
  toolName: "get_pc_site_rank_keywords_5118",
  apiName: "PC Site Rank Keywords Export API v2",
  endpoint: "/keyword/pc/v2",
  dataKeys: ["baidupc"],
} as const;

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA);


export function registerGetPcSiteRankKeywords5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    CONFIG.toolName,
    {
      title: "Get PC Site Rank Keywords 5118",
      description:
        [
          "Export the Baidu PC ranking-keyword list for a single host, including SERP rank, traffic indices, daily search volume, and SEM signals.",
          "Use case: per-host content-gap analysis and competitor benchmarking when you need PC ranking data scoped to one site.",
          "Difference vs neighbors: get_domain_rank_keywords_5118 aggregates across the entire domain (subdomains included); get_mobile_site_rank_keywords_5118 returns Baidu Mobile ranks for the same host. This tool is the PC-only, host-scoped version.",
          "Most actionable output fields: data.items[].keyword, .rank, .pageUrl, .pcSearchVolume, .competition; iterate via pagination.",
          "Known limits: synchronous one-shot call; PC SERP only; full export may span many pages; data is China-market focused.",
        ].join(" "),
      inputSchema: GET_PC_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getPcSiteRankKeywords5118Handler(input);
      return createToolResult(CONFIG.toolName, TOOL_OUTPUT_SCHEMA, payload);
    },
  );
}

export async function getPcSiteRankKeywords5118Handler(
  input: GetPcSiteRankKeywords5118Input,
): Promise<ResponseEnvelope<SiteRankKeywordsData>> {
  return createSiteRankKeywordsHandler(input, CONFIG);
}