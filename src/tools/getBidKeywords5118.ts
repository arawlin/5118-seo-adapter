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
  NUMBER_OR_NULL_OUTPUT_SCHEMA,
  PAGINATION_OUTPUT_SCHEMA,
  STRING_OR_NULL_OUTPUT_SCHEMA,
  createToolResult,
  type RegisterTool,
} from "./toolRegistration.js";
import { asArray, asRecord, toNumber, toStringOrNull } from "./normalizationUtils.js";

export const GET_BID_KEYWORDS_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .describe(
      "Required. Domain or host whose paid (SEM) keywords should be mined (e.g. 'www.example.com'). Do not include protocol or path.",
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
      "Optional. When true, the upstream returns HTML-highlighted ad copy in `title`/`intro`; when false (default), plain text is returned. Set true only when rendering ad-copy diffs.",
    ),
} as const;

export const BID_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA.describe("The bid keyword the domain advertises on."),
  title: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Ad creative title captured by 5118. Plain text by default; HTML-highlighted when `includeHighlight=true`.",
  ),
  intro: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Ad creative description/body. Plain text or highlighted HTML per `includeHighlight`.",
  ),
  semPrice: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Reference SEM click price for the keyword (5118 field bidword_semprice). String because the upstream sometimes returns formatted ranges.",
  ),
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Daily PC search volume for the keyword (bidword_pcpv).",
  ),
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Daily mobile search volume for the keyword (bidword_wisepv).",
  ),
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "SEM competition level (bidword_kwc): 1=high, 2=medium, 3=low.",
  ),
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Baidu PC traffic index."),
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Baidu Mobile search index."),
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("360 (Haosou) search index."),
  recentBidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Number of distinct advertisers seen on this keyword within the last 30 days (urlcount_30day).",
  ),
  totalBidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Total advertisers seen on this keyword over 5118's full lookback (urlcount).",
  ),
  firstSeenAt: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "First time 5118 saw the domain bidding on this keyword. Date string 'yyyy-MM-dd'.",
  ),
  lastSeenAt: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Most recent time 5118 saw the bid (5118 field joindate). Date string 'yyyy-MM-dd'.",
  ),
  recommendedBidAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Recommended average SEM bid (CNY).",
  ),
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Google search index."),
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Kuaishou search index."),
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Weibo search index."),
});

export const BID_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  items: z
    .array(BID_KEYWORD_ITEM_OUTPUT_SCHEMA)
    .describe(
      "Bid-keyword rows for the queried domain. Empty for domains that 5118 has not observed bidding.",
    ),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable().describe(
    "Pagination metadata for paging through the full bid-keyword set.",
  ),
});

export type BidKeywordItem = z.infer<typeof BID_KEYWORD_ITEM_OUTPUT_SCHEMA>;
export type BidKeywordsData = z.infer<typeof BID_KEYWORDS_DATA_OUTPUT_SCHEMA>;
export type GetBidKeywords5118Item = BidKeywordItem;
export type GetBidKeywords5118Data = BidKeywordsData;

export type GetBidKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_BID_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetBidKeywordsInput = GetBidKeywords5118Input;

const TOOL_NAME = "get_bid_keywords_5118";
const API_NAME = "Site Bid Keywords Mining API v2";
const ENDPOINT = "/bidword/v2";

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(BID_KEYWORDS_DATA_OUTPUT_SCHEMA);

function normalizeBidKeywordsResponse(raw: unknown): BidKeywordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.keywords).length > 0 ? asArray(data.keywords) : asArray(data.list);

  return {
    items: list.map((item) => {
      const record = asRecord(item);
      return {
        keyword: toStringOrNull(record.keyword ?? record.word),
        title: toStringOrNull(record.title),
        intro: toStringOrNull(record.intro ?? record.description),
        semPrice: toStringOrNull(record.bidword_semprice ?? record.semPrice),
        pcSearchVolume: toNumber(record.bidword_pcpv ?? record.pcSearchVolume),
        mobileSearchVolume: toNumber(record.bidword_wisepv ?? record.mobileSearchVolume),
        competition: toNumber(record.bidword_kwc ?? record.competition),
        index: toNumber(record.index),
        mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
        haosouIndex: toNumber(record.haosou_index ?? record.haosouIndex),
        recentBidCompanyCount: toNumber(
          record.urlcount_30day ?? record.recentBidCompanyCount,
        ),
        totalBidCompanyCount: toNumber(record.urlcount ?? record.totalBidCompanyCount),
        firstSeenAt: toStringOrNull(record.firstfindtime ?? record.firstSeenAt),
        lastSeenAt: toStringOrNull(record.joindate ?? record.lastSeenAt),
        recommendedBidAvg: toNumber(
          record.bidword_recommend_price_avg ?? record.recommendedBidAvg,
        ),
        googleIndex: toNumber(record.google_index ?? record.googleIndex),
        kuaishouIndex: toNumber(record.kuaishou_index ?? record.kuaishouIndex),
        weiboIndex: toNumber(record.weibo_index ?? record.weiboIndex),
      };
    }),
    pagination: createPagination(
      data.page_index ?? data.pageIndex,
      data.page_size ?? data.pageSize,
      data.page_count ?? data.pageCount,
      data.total,
    ),
  };
}


export function registerGetBidKeywords5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Bid Keywords 5118",
      description:
        [
          "Mine a domain's paid (SEM) keywords with ad creative copy, click price, daily search volume, and 30-day vs all-time advertiser counts.",
          "Use case: competitor SEM intelligence and content-gap research; spot what a domain pays to acquire and how aggressively (recent vs total advertiser counts).",
          "Difference vs neighbors: get_domain_rank_keywords_5118 returns the domain's organic Baidu PC ranks (no SEM data); get_bid_sites_5118 inverts the question (which sites bid on a *keyword*); this tool covers paid keywords for one *domain*.",
          "Most actionable output fields: data.items[].keyword, .semPrice / .recommendedBidAvg (cost), .pcSearchVolume / .mobileSearchVolume (demand), .recentBidCompanyCount vs .totalBidCompanyCount (commercial intensity trend), .firstSeenAt / .lastSeenAt (campaign freshness).",
          "Known limits: synchronous one-shot call; pageSize<=500; coverage is mainland-China SEM only; ad copy may be stale relative to the live SERP.",
        ].join(" "),
      inputSchema: GET_BID_KEYWORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getBidKeywords5118Handler(input);
      return createToolResult(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload);
    },
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