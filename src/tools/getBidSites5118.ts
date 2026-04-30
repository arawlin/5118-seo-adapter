import { z } from "zod";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import { normalizeBidSitesResponse } from "../normalizers/siteInsights.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  PAGINATION_OUTPUT_SCHEMA,
  STRING_OR_NULL_OUTPUT_SCHEMA,
  validateToolOutputPayload,
  type RegisterTool,
  type ToToolResult,
} from "./toolRegistration.js";

export const GET_BID_SITES_5118_INPUT_SCHEMA = {
  keyword: z
    .string()
    .min(1)
    .describe("Required bid keyword used to discover advertising domains and landing pages."),
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

export const BID_SITE_ITEM_OUTPUT_SCHEMA = z.object({
  title: STRING_OR_NULL_OUTPUT_SCHEMA,
  intro: STRING_OR_NULL_OUTPUT_SCHEMA,
  siteTitle: STRING_OR_NULL_OUTPUT_SCHEMA,
  siteUrl: STRING_OR_NULL_OUTPUT_SCHEMA,
  fullUrl: STRING_OR_NULL_OUTPUT_SCHEMA,
  companyName: STRING_OR_NULL_OUTPUT_SCHEMA,
  baiduPcWeight: STRING_OR_NULL_OUTPUT_SCHEMA,
  bidCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  lastSeenAt: STRING_OR_NULL_OUTPUT_SCHEMA,
  firstSeenAt: STRING_OR_NULL_OUTPUT_SCHEMA,
});

export const BID_SITES_DATA_OUTPUT_SCHEMA = z.object({
  items: z.array(BID_SITE_ITEM_OUTPUT_SCHEMA),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
});

export type BidSiteItem = z.infer<typeof BID_SITE_ITEM_OUTPUT_SCHEMA>;
export type BidSitesData = z.infer<typeof BID_SITES_DATA_OUTPUT_SCHEMA>;
export type GetBidSites5118Item = BidSiteItem;
export type GetBidSites5118Data = BidSitesData;

export type GetBidSites5118Input = z.infer<
  z.ZodObject<typeof GET_BID_SITES_5118_INPUT_SCHEMA>
>;
export type GetBidSitesInput = GetBidSites5118Input;

const TOOL_NAME = "get_bid_sites_5118";
const API_NAME = "Bid Site Mining API";
const ENDPOINT = "/bidsite";

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(BID_SITES_DATA_OUTPUT_SCHEMA);


export function registerGetBidSites5118Tool(
  registerTool: RegisterTool,
  toToolResult: ToToolResult,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Bid Sites 5118",
      description: "Sync bid site mining via 5118 /bidsite.",
      inputSchema: GET_BID_SITES_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getBidSites5118Handler(input);
      return toToolResult(validateToolOutputPayload(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload));
    },
  );
}

export async function getBidSites5118Handler(
  input: GetBidSites5118Input,
): Promise<ResponseEnvelope<BidSitesData>> {
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
      keyword: input.keyword,
      page_index: pageIndex,
      page_size: pageSize,
      isc: input.includeHighlight ? 1 : 0,
    },
    ["keyword"],
  );

  const raw = await postForm(ENDPOINT, apiKey, encoded);
  const errcode = getErrcode(raw);

  if (errcode !== "0") {
    const errmsg = String((raw as Record<string, unknown>)?.errmsg ?? "");
    throw map5118Error(errcode, errmsg, raw);
  }

  const decoded = decodeResponseStrings(raw);
  const normalized = normalizeBidSitesResponse(decoded);

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