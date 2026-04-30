import { z } from "zod";
import { normalizePcSiteRankKeywordsResponse } from "../normalizers/siteInsights.js";
import {
  createSiteRankKeywordsHandler,
  SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA,
} from "./siteRankKeywordsBase.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  validateToolOutputPayload,
  type RegisterTool,
  type ToToolResult,
} from "./toolRegistration.js";
import type { SiteRankKeywordsData } from "./siteRankKeywordsBase.js";

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

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA);


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
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getPcSiteRankKeywords5118Handler(input);
      return toToolResult(validateToolOutputPayload(CONFIG.toolName, TOOL_OUTPUT_SCHEMA, payload));
    },
  );
}

export async function getPcSiteRankKeywords5118Handler(
  input: GetPcSiteRankKeywords5118Input,
): Promise<ResponseEnvelope<SiteRankKeywordsData>> {
  return createSiteRankKeywordsHandler(input, CONFIG);
}