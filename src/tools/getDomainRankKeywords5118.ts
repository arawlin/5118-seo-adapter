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

export const GET_DOMAIN_RANK_KEYWORDS_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .describe(
      "Required. Domain or host whose Baidu PC ranking keywords should be exported (e.g. 'www.example.com'). Subdomains are supported when 5118 has data for them. Do not include protocol or path.",
    ),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Optional. 1-based result page number. Default 1. Page size is fixed by the upstream (typically 500 rows per page).",
    ),
} as const;

export const DOMAIN_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA.describe("A keyword the domain ranks for on Baidu PC."),
  rank: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "1-based SERP position of the domain for this keyword. null when 5118 omits it.",
  ),
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Baidu PC traffic index for the keyword.",
  ),
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Baidu Mobile search index for the keyword.",
  ),
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("360 (Haosou) search index."),
  pageTitle: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Title of the ranking page captured by 5118.",
  ),
  pageUrl: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Landing URL of the ranking page on the queried domain.",
  ),
  bidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Total advertiser/bid-company count for this keyword. Indicates SEM commercial intent.",
  ),
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "SEM competition level (bidword_kwc): 1=high, 2=medium, 3=low.",
  ),
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Daily PC search volume for the keyword (bidword_pcpv).",
  ),
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Daily mobile search volume for the keyword (bidword_wisepv).",
  ),
  recommendedBidAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Recommended average SEM bid (CNY).",
  ),
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Google search index."),
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Kuaishou search index."),
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe("Weibo search index."),
});

export const DOMAIN_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  items: z
    .array(DOMAIN_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA)
    .describe(
      "Domain-wide ranking keywords for the current page. Empty when the domain has no ranked keywords or for paged-past-end requests.",
    ),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable().describe(
    "Pagination metadata. Use to drive subsequent pageIndex calls.",
  ),
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
  const list = asArray(data.domain);

  return {
    items: list.map((item) => {
      const record = asRecord(item);
      return {
        keyword: toStringOrNull(record.keyword),
        rank: toNumber(record.rank),
        index: toNumber(record.index),
        mobileIndex: toNumber(record.mobile_index),
        haosouIndex: toNumber(record.haosou_index),
        pageTitle: toStringOrNull(record.page_title),
        // Vendor field is `url` (the ranking page URL).
        pageUrl: toStringOrNull(record.url),
        bidCompanyCount: toNumber(record.bidword_companycount),
        competition: toNumber(record.bidword_kwc),
        pcSearchVolume: toNumber(record.bidword_pcpv),
        mobileSearchVolume: toNumber(record.bidword_wisepv),
        recommendedBidAvg: toNumber(record.bidword_recommend_price_avg),
        googleIndex: toNumber(record.google_index),
        kuaishouIndex: toNumber(record.kuaishou_index),
        weiboIndex: toNumber(record.weibo_index),
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


export function registerGetDomainRankKeywords5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Domain Rank Keywords 5118",
      description:
        [
          "Export every Baidu PC keyword the queried domain ranks for, with rank position, traffic indices, daily volume and SEM signals.",
          "Use case: competitor research, content-gap analysis, and domain-authority audits; understand the full ranking footprint of a site at a single point in time.",
          "Difference vs neighbors: get_pc_site_rank_keywords_5118 covers a single host on Baidu PC (no domain-level aggregation); get_mobile_site_rank_keywords_5118 is the mobile counterpart; get_pc_rank_snapshot_5118 only checks ranks for keywords you already have.",
          "Most actionable output fields: data.items[].keyword, .rank, .pageUrl, .pcSearchVolume, .mobileSearchVolume, .competition; iterate via pagination to read all pages.",
          "Known limits: synchronous one-shot call; full export may run to tens of pages; data is China-market focused; very new domains may have no rows.",
        ].join(" "),
      inputSchema: GET_DOMAIN_RANK_KEYWORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getDomainRankKeywords5118Handler(input);
      return createToolResult(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload);
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