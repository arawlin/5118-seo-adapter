import { z } from "zod";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createPagination, createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  PAGINATION_OUTPUT_SCHEMA,
  STRING_OR_NULL_OUTPUT_SCHEMA,
  createToolResult,
  type RegisterTool,
} from "./toolRegistration.js";
import {
  asArray,
  asRecord,
  firstArray,
  toNumber,
  toStringOrNull,
} from "./normalizationUtils.js";

export const GET_BID_SITES_5118_INPUT_SCHEMA = {
  keyword: z
    .string()
    .min(1)
    .describe(
      "Required. Bid keyword to inspect (the search term advertisers compete on). Plain text, no quotes.",
    ),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional. 1-based page number. Default 1. Must be >= 1."),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .describe(
      "Optional. Rows per page. Default 20 (adapter), maximum 500 (upstream cap).",
    ),
  includeHighlight: z
    .boolean()
    .optional()
    .describe(
      "Optional. When true, the upstream returns HTML-highlighted ad copy in `title`/`intro`; when false (default), plain text. Set true only when rendering ad-copy diffs.",
    ),
} as const;

export const BID_SITE_ITEM_OUTPUT_SCHEMA = z.object({
  title: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Ad creative title shown in Baidu PC for this advertiser. Plain text or highlighted HTML per `includeHighlight`.",
  ),
  intro: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Ad creative description/body. Plain text or highlighted HTML per `includeHighlight`.",
  ),
  siteTitle: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Display title of the advertiser's site (5118 field urltitle).",
  ),
  siteUrl: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Advertiser's host (5118 field url) without protocol or path. Use this for grouping by domain.",
  ),
  fullUrl: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Full landing-page URL the ad pointed to (with protocol and path).",
  ),
  companyName: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Registered company name associated with the ad, when 5118 has it.",
  ),
  baiduPcWeight: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Advertiser host's Baidu PC weight tier as a string (typically '0'-'10'); reflects organic authority for context.",
  ),
  bidCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Number of distinct keywords this advertiser bids on (across 5118's coverage).",
  ),
  lastSeenAt: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Most recent date 5118 saw this advertiser bidding (5118 field join_date). Date string 'yyyy-MM-dd'.",
  ),
  firstSeenAt: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "First date 5118 saw this advertiser bidding (5118 field firstfindtime). Date string 'yyyy-MM-dd'.",
  ),
});

export const BID_SITES_DATA_OUTPUT_SCHEMA = z.object({
  items: z
    .array(BID_SITE_ITEM_OUTPUT_SCHEMA)
    .describe(
      "Advertiser rows for the queried keyword. Empty when no SEM activity has been observed.",
    ),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable().describe(
    "Pagination metadata for paging through the full advertiser set.",
  ),
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

function normalizeBidSitesResponse(raw: unknown): BidSitesData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.keyword_bidsite);

  return {
    items: list.map((item) => {
      const record = asRecord(item);
      return {
        title: toStringOrNull(record.title),
        intro: toStringOrNull(record.intro),
        siteTitle: toStringOrNull(record.urltitle),
        siteUrl: toStringOrNull(record.url),
        fullUrl: toStringOrNull(record.fullurl),
        companyName: toStringOrNull(record.companyname),
        baiduPcWeight: toStringOrNull(record.baidupcweight),
        bidCount: toNumber(record.bidCount),
        lastSeenAt: toStringOrNull(record.join_date),
        firstSeenAt: toStringOrNull(record.firstfindtime),
      };
    }),
    pagination: createPagination(
      data.page_index,
      data.page_size,
      data.page_count,
      data.total,
    ),
  };
}


export function registerGetBidSites5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Bid Sites 5118",
      description:
        [
          "Discover which domains/advertisers run paid (SEM) ads on a given keyword, with their ad copy, landing-page URL, advertiser company, total keyword spread, and first/last seen dates.",
          "Use case: competitor SEM intelligence; identify advertisers buying a target keyword and benchmark how long they have been active.",
          "Difference vs neighbors: get_bid_keywords_5118 inverts the question (which keywords does *one domain* bid on); this tool returns advertisers per *keyword*. Compare with get_pc_top50_sites_5118 which returns *organic* SERP top sites.",
          "Most actionable output fields: data.items[].siteUrl (advertiser host), .companyName, .fullUrl (landing page), .baiduPcWeight, .bidCount, .firstSeenAt / .lastSeenAt (campaign tenure).",
          "Known limits: synchronous one-shot call; pageSize<=500; mainland-China Baidu SEM only; ad copy and landing pages may not reflect the live SERP.",
        ].join(" "),
      inputSchema: GET_BID_SITES_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getBidSites5118Handler(input);
      return createToolResult(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload);
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