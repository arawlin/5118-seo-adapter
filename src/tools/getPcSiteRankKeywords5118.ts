import { z } from "zod";
import { normalizePcSiteRankKeywordsResponse } from "../normalizers/siteInsights.js";
import { createSiteRankKeywordsHandler } from "./siteRankKeywordsBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import { TOOL_OUTPUT_SCHEMAS } from "../types/toolOutputSchemas.js";
import type { SiteRankKeywordsData } from "../types/toolOutputSchemas.js";
import type { RegisterTool, ToToolResult } from "./toolRegistration.js";

export const GET_PC_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .describe("Required domain or host to inspect for PC site rank keywords."),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional 1-based result page number. Defaults to 1."),
} as const;

export type GetPcSiteRankKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_PC_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetPcSiteRankKeywordsInput = GetPcSiteRankKeywords5118Input;

const CONFIG = {
  toolName: "get_pc_site_rank_keywords_5118",
  apiName: "PC Site Rank Keywords Export API v2",
  endpoint: "/keyword/pc/v2",
  normalize: normalizePcSiteRankKeywordsResponse,
} as const;

export function registerGetPcSiteRankKeywords5118Tool(
  registerTool: RegisterTool,
  toToolResult: ToToolResult,
): void {
  registerTool(
    CONFIG.toolName,
    {
      title: "Get PC Site Rank Keywords 5118",
      description: "Sync PC site rank keyword export via 5118 /keyword/pc/v2.",
      inputSchema: GET_PC_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMAS[CONFIG.toolName],
    },
    async (input) =>
      toToolResult(CONFIG.toolName, await getPcSiteRankKeywords5118Handler(input)),
  );
}

export async function getPcSiteRankKeywords5118Handler(
  input: GetPcSiteRankKeywords5118Input,
): Promise<ResponseEnvelope<SiteRankKeywordsData>> {
  return createSiteRankKeywordsHandler(input, CONFIG);
}