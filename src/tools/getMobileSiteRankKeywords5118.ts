import { z } from "zod";
import { normalizeMobileSiteRankKeywordsResponse } from "../normalizers/siteInsights.js";
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

export const GET_MOBILE_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .describe("Required domain or host to inspect for mobile site rank keywords."),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional 1-based result page number. Defaults to 1."),
} as const;

export type GetMobileSiteRankKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_MOBILE_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetMobileSiteRankKeywordsInput = GetMobileSiteRankKeywords5118Input;

const CONFIG = {
  toolName: "get_mobile_site_rank_keywords_5118",
  apiName: "Mobile Site Rank Keywords Export API v2",
  endpoint: "/keyword/mobile/v2",
  normalize: normalizeMobileSiteRankKeywordsResponse,
} as const;

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA);


export function registerGetMobileSiteRankKeywords5118Tool(
  registerTool: RegisterTool,
  toToolResult: ToToolResult,
): void {
  registerTool(
    CONFIG.toolName,
    {
      title: "Get Mobile Site Rank Keywords 5118",
      description: "Sync mobile site rank keyword export via 5118 /keyword/mobile/v2.",
      inputSchema: GET_MOBILE_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getMobileSiteRankKeywords5118Handler(input);
      return toToolResult(validateToolOutputPayload(CONFIG.toolName, TOOL_OUTPUT_SCHEMA, payload));
    },
  );
}

export async function getMobileSiteRankKeywords5118Handler(
  input: GetMobileSiteRankKeywords5118Input,
): Promise<ResponseEnvelope<SiteRankKeywordsData>> {
  return createSiteRankKeywordsHandler(input, CONFIG);
}