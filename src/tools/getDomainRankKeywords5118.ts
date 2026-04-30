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

export const DOMAIN_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA,
  rank: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  pageTitle: STRING_OR_NULL_OUTPUT_SCHEMA,
  pageUrl: STRING_OR_NULL_OUTPUT_SCHEMA,
  bidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  recommendedBidAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
});

export const DOMAIN_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  items: z.array(DOMAIN_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
});

export type DomainRankKeywordItem = z.infer<typeof DOMAIN_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA>;
export type DomainRankKeywordsData = z.infer<typeof DOMAIN_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA>;
export type GetDomainRankKeywords5118Item = DomainRankKeywordItem;
export type GetDomainRankKeywords5118Data = DomainRankKeywordsData;

export type GetDomainRankKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_DOMAIN_RANK_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetDomainRankKeywordsInput = GetDomainRankKeywords5118Input;

const TOOL_NAME = "get_domain_rank_keywords_5118";
const API_NAME = "PC Domain Rank Keywords Export API v2";
const ENDPOINT = "/keyword/domain/v2";

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(DOMAIN_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA);

function normalizeDomainRankKeywordsResponse(raw: unknown): DomainRankKeywordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.domain).length > 0 ? asArray(data.domain) : asArray(data.list);

  return {
    items: list.map((item) => {
      const record = asRecord(item);
      return {
        keyword: toStringOrNull(record.keyword ?? record.word),
        rank: toNumber(record.rank),
        index: toNumber(record.index),
        mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
        haosouIndex: toNumber(record.haosou_index ?? record.haosouIndex),
        pageTitle: toStringOrNull(record.page_title ?? record.pageTitle),
        pageUrl: toStringOrNull(record.page_url ?? record.pageUrl ?? record.url),
        bidCompanyCount: toNumber(
          record.bidword_companycount ?? record.bidword_company_count ?? record.bidCompanyCount,
        ),
        competition: toNumber(record.bidword_kwc ?? record.competition),
        pcSearchVolume: toNumber(record.bidword_pcpv ?? record.pcSearchVolume),
        mobileSearchVolume: toNumber(record.bidword_wisepv ?? record.mobileSearchVolume),
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
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getDomainRankKeywords5118Handler(input);
      return toToolResult(validateToolOutputPayload(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload));
    },
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