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
  validateToolOutputPayload,
  type RegisterTool,
  type ToToolResult,
} from "./toolRegistration.js";
import { asArray, asRecord, toNumber, toStringOrNull } from "./normalizationUtils.js";

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

export const BID_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA,
  title: STRING_OR_NULL_OUTPUT_SCHEMA,
  intro: STRING_OR_NULL_OUTPUT_SCHEMA,
  semPrice: STRING_OR_NULL_OUTPUT_SCHEMA,
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  recentBidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  totalBidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  firstSeenAt: STRING_OR_NULL_OUTPUT_SCHEMA,
  lastSeenAt: STRING_OR_NULL_OUTPUT_SCHEMA,
  recommendedBidAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
});

export const BID_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  items: z.array(BID_KEYWORD_ITEM_OUTPUT_SCHEMA),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
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
  toToolResult: ToToolResult,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Bid Keywords 5118",
      description: "Sync bid keyword mining via 5118 /bidword/v2.",
      inputSchema: GET_BID_KEYWORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getBidKeywords5118Handler(input);
      return toToolResult(validateToolOutputPayload(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload));
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