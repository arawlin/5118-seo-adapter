import { z } from "zod";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import { normalizeDomainRankKeywordsResponse } from "../normalizers/siteInsights.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import { TOOL_OUTPUT_SCHEMAS } from "../types/toolOutputSchemas.js";
import type { DomainRankKeywordsData } from "../types/toolOutputSchemas.js";
import type { RegisterTool, ToToolResult } from "./toolRegistration.js";

export const GET_DOMAIN_RANK_KEYWORDS_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .describe("Required domain or host to inspect for PC ranking keywords, including subdomains when supported by 5118."),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional 1-based result page number. Defaults to 1."),
} as const;

export type GetDomainRankKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_DOMAIN_RANK_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetDomainRankKeywordsInput = GetDomainRankKeywords5118Input;

const TOOL_NAME = "get_domain_rank_keywords_5118";
const API_NAME = "PC Domain Rank Keywords Export API v2";
const ENDPOINT = "/keyword/domain/v2";

export function registerGetDomainRankKeywords5118Tool(
  registerTool: RegisterTool,
  toToolResult: ToToolResult,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Domain Rank Keywords 5118",
      description: "Sync domain-wide PC rank keyword export via 5118 /keyword/domain/v2.",
      inputSchema: GET_DOMAIN_RANK_KEYWORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMAS[TOOL_NAME],
    },
    async (input) =>
      toToolResult(TOOL_NAME, await getDomainRankKeywords5118Handler(input)),
  );
}

export async function getDomainRankKeywords5118Handler(
  input: GetDomainRankKeywords5118Input,
): Promise<ResponseEnvelope<DomainRankKeywordsData>> {
  if ((input.pageIndex ?? 1) <= 0) {
    throw new ToolError("INVALID_INPUT", "pageIndex must be greater than 0.");
  }

  const apiKey = assertApiKey(TOOL_NAME);
  const encoded = encodeInputFields(
    {
      url: input.url,
      page_index: input.pageIndex ?? 1,
    },
    ["url"],
  );

  const raw = await postForm(ENDPOINT, apiKey, encoded);
  const errcode = getErrcode(raw);

  if (errcode !== "0") {
    const errmsg = String((raw as Record<string, unknown>)?.errmsg ?? "");
    throw map5118Error(errcode, errmsg, raw);
  }

  const decoded = decodeResponseStrings(raw);
  const normalized = normalizeDomainRankKeywordsResponse(decoded);

  return createResponseEnvelope({
    tool: TOOL_NAME,
    apiName: API_NAME,
    endpoint: ENDPOINT,
    mode: "sync",
    executionStatus: "completed",
    pagination: normalized.pagination,
    data: normalized,
    raw,
  });
}