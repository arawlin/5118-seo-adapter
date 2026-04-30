import { z } from "zod";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import { normalizeBidKeywordsResponse } from "../normalizers/siteInsights.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import { TOOL_OUTPUT_SCHEMAS } from "../types/toolOutputSchemas.js";
import type { BidKeywordsData } from "../types/toolOutputSchemas.js";
import type { RegisterTool, ToToolResult } from "./toolRegistration.js";

export const GET_BID_KEYWORDS_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .describe("Required domain or host to inspect for bid keywords."),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional 1-based result page number. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .describe("Optional number of rows per page. Maximum 500. Defaults to 20 for adapter responses."),
  includeHighlight: z
    .boolean()
    .optional()
    .describe("Optional upstream highlight toggle. true requests highlighted HTML from 5118; false keeps the upstream request plain."),
} as const;

export type GetBidKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_BID_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetBidKeywordsInput = GetBidKeywords5118Input;

const TOOL_NAME = "get_bid_keywords_5118";
const API_NAME = "Site Bid Keywords Mining API v2";
const ENDPOINT = "/bidword/v2";

export function registerGetBidKeywords5118Tool(
  registerTool: RegisterTool,
  toToolResult: ToToolResult,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Bid Keywords 5118",
      description: "Sync bid keyword mining via 5118 /bidword/v2.",
      inputSchema: GET_BID_KEYWORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMAS[TOOL_NAME],
    },
    async (input) => toToolResult(TOOL_NAME, await getBidKeywords5118Handler(input)),
  );
}

export async function getBidKeywords5118Handler(
  input: GetBidKeywords5118Input,
): Promise<ResponseEnvelope<BidKeywordsData>> {
  const pageIndex = input.pageIndex ?? 1;
  const pageSize = input.pageSize ?? 20;

  if (pageIndex <= 0) {
    throw new ToolError("INVALID_INPUT", "pageIndex must be greater than 0.");
  }

  if (pageSize <= 0 || pageSize > 500) {
    throw new ToolError("INPUT_LIMIT", "pageSize must be between 1 and 500.");
  }

  const apiKey = assertApiKey(TOOL_NAME);
  const encoded = encodeInputFields(
    {
      url: input.url,
      page_index: pageIndex,
      page_size: pageSize,
      isc: input.includeHighlight ? 1 : 0,
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
  const normalized = normalizeBidKeywordsResponse(decoded);

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