import { z } from "zod";

export const SUGGEST_PLATFORM_VALUES = [
  "baidu",
  "baidumobile",
  "shenma",
  "360",
  "360mobile",
  "sogou",
  "sogoumobile",
  "zhihu",
  "toutiao",
  "taobao",
  "tmall",
  "pinduoduo",
  "jingdong",
  "douyin",
  "amazon",
  "xiaohongshu",
] as const;

export type SuggestPlatform = (typeof SUGGEST_PLATFORM_VALUES)[number];

export const GET_LONGTAIL_KEYWORDS_5118_INPUT_SCHEMA = {
  keyword: z
    .string()
    .min(1)
    .describe("Required seed keyword. This is the root term that 5118 expands into long-tail keywords."),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional 1-based result page number. Use it to read a later page of normalized keywords. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Optional number of rows per page. Maximum 100. Larger values return more keywords per request."),
  sortField: z
    .string()
    .optional()
    .describe("Optional vendor sort selector. Common values: 2=bidCompanyCount advertiser count, 3=longKeywordCount long-tail count, 4=index PC search index, 5=mobileIndex mobile search index."),
  sortType: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Optional sort direction for sortField. asc=low to high, desc=high to low."),
  filter: z
    .string()
    .optional()
    .describe("Optional vendor quick filter selector. Common values: 1=all results, 2=traffic words, 9=keywords with bidding ads."),
  filterDate: z
    .string()
    .optional()
    .describe("Optional vendor filter date in yyyy-MM-dd format. Use it when you need a specific date snapshot supported by 5118."),
} as const;

export const GET_INDUSTRY_FREQUENCY_WORDS_5118_INPUT_SCHEMA = {
  keyword: z
    .string()
    .min(1)
    .describe("Required industry or topic seed keyword. 5118 uses it to calculate frequently co-occurring industry words."),
} as const;

export const GET_SUGGEST_TERMS_5118_INPUT_SCHEMA = {
  word: z
    .string()
    .min(1)
    .describe("Required seed word used to query related suggestion terms from the selected platform."),
  platform: z
    .enum(SUGGEST_PLATFORM_VALUES)
    .describe("Required official vendor platform enum. Examples include baidu, baidumobile, zhihu, douyin, and amazon. The platform changes the suggestion corpus."),
} as const;

export const GET_KEYWORD_METRICS_5118_INPUT_SCHEMA = {
  keywords: z
    .array(z.string().min(1))
    .max(50)
    .optional()
    .describe("Optional keyword list to submit to 5118. Required for submit mode, and also required for wait mode when taskId is not provided. Maximum 50 keywords per task."),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe("Optional async execution mode. submit=create a vendor task and return taskId; poll=query an existing task by taskId; wait=submit or resume a task and keep polling until completion or timeout."),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling an already-created task."),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional maximum client-side wait time in seconds for wait mode. The tool stops polling and returns the latest pending state when this limit is reached."),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional polling interval in seconds for wait mode. Defaults to 60 seconds when omitted."),
} as const;

export const GET_MOBILE_TRAFFIC_KEYWORDS_5118_INPUT_SCHEMA = {
  keyword: z
    .string()
    .min(1)
    .optional()
    .describe("Optional seed keyword to mine. Required for submit mode, and also required for poll mode because the upstream 5118 poll request still expects the original keyword."),
  pageIndex: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Optional 1-based page number for completed traffic keyword results. Defaults to 1."),
  pageSize: z
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .describe("Optional completed result page size. Maximum 500. Defaults to 20."),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe("Optional async execution mode. submit=create a vendor task; poll=check an existing task; wait=submit or resume and keep polling until completion or timeout. Defaults to submit for this long-running API."),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling."),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional maximum client-side wait time in seconds for wait mode before timeout. The tool returns the latest pending state if the limit is reached first."),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional polling interval in seconds for wait mode. Defaults to the shared async poll interval when omitted."),
} as const;

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

export const GET_SITE_WEIGHT_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .describe("Required domain or host to inspect for 5118 weight values."),
} as const;

export const GET_PC_RANK_SNAPSHOT_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .optional()
    .describe("Optional target domain for submit or wait mode. Required unless taskId is used to resume polling."),
  keywords: z
    .array(z.string().min(1))
    .max(50)
    .optional()
    .describe("Optional keyword list for submit or wait mode. Required unless taskId is used to resume polling. Maximum 50 keywords per task."),
  checkRow: z
    .number()
    .int()
    .positive()
    .max(50)
    .optional()
    .describe("Optional maximum ranking depth to inspect. Maximum 50 for the PC endpoint."),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe("Optional async execution mode. submit=create a vendor task; poll=check an existing task; wait=submit or resume and keep polling until completion or timeout."),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling."),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional maximum client-side wait time in seconds for wait mode."),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional polling interval in seconds for wait mode. Defaults to 60 seconds."),
} as const;

export const GET_MOBILE_RANK_SNAPSHOT_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .optional()
    .describe("Optional target domain for submit or wait mode. Required unless taskId is used to resume polling."),
  keywords: z
    .array(z.string().min(1))
    .max(50)
    .optional()
    .describe("Optional keyword list for submit or wait mode. Required unless taskId is used to resume polling. Maximum 50 keywords per task."),
  checkRow: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Optional maximum ranking depth to inspect. Maximum 100 for the mobile endpoint."),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe("Optional async execution mode. submit=create a vendor task; poll=check an existing task; wait=submit or resume and keep polling until completion or timeout."),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling."),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional maximum client-side wait time in seconds for wait mode."),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional polling interval in seconds for wait mode. Defaults to 60 seconds."),
} as const;

export const CHECK_URL_INDEXING_5118_INPUT_SCHEMA = {
  urls: z
    .array(z.string().min(1))
    .max(200)
    .optional()
    .describe("Optional URL list to submit for indexing checks. Required unless taskId is used to resume polling. Maximum 200 URLs per task."),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe("Optional async execution mode. submit=create a vendor task; poll=check an existing task; wait=submit or resume and keep polling until completion or timeout."),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling."),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional maximum client-side wait time in seconds for wait mode."),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional polling interval in seconds for wait mode. Defaults to 60 seconds."),
} as const;

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

export const GET_PC_TOP50_SITES_5118_INPUT_SCHEMA = {
  keywords: z
    .array(z.string().min(1))
    .max(50)
    .optional()
    .describe("Optional keyword list for submit or wait mode. Required unless taskId is used to resume polling. Maximum 50 keywords per task."),
  checkRow: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Optional maximum ranking depth to inspect. Maximum 100 for the PC endpoint."),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe("Optional async execution mode. submit=create a vendor task; poll=check an existing task; wait=submit or resume and keep polling until completion or timeout."),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling."),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional maximum client-side wait time in seconds for wait mode."),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional polling interval in seconds for wait mode. Defaults to 60 seconds."),
} as const;

export const GET_MOBILE_TOP50_SITES_5118_INPUT_SCHEMA = {
  keywords: z
    .array(z.string().min(1))
    .max(50)
    .optional()
    .describe("Optional keyword list for submit or wait mode. Required unless taskId is used to resume polling. Maximum 50 keywords per task."),
  checkRow: z
    .number()
    .int()
    .positive()
    .max(100)
    .optional()
    .describe("Optional maximum ranking depth to inspect. Maximum 100 for the mobile endpoint."),
  executionMode: z
    .enum(["submit", "poll", "wait"])
    .optional()
    .describe("Optional async execution mode. submit=create a vendor task; poll=check an existing task; wait=submit or resume and keep polling until completion or timeout."),
  taskId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling."),
  maxWaitSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional maximum client-side wait time in seconds for wait mode."),
  pollIntervalSeconds: z
    .number()
    .positive()
    .optional()
    .describe("Optional polling interval in seconds for wait mode. Defaults to 60 seconds."),
} as const;

export const TOOL_INPUT_SCHEMAS = {
  get_longtail_keywords_5118: GET_LONGTAIL_KEYWORDS_5118_INPUT_SCHEMA,
  get_industry_frequency_words_5118: GET_INDUSTRY_FREQUENCY_WORDS_5118_INPUT_SCHEMA,
  get_suggest_terms_5118: GET_SUGGEST_TERMS_5118_INPUT_SCHEMA,
  get_keyword_metrics_5118: GET_KEYWORD_METRICS_5118_INPUT_SCHEMA,
  get_mobile_traffic_keywords_5118: GET_MOBILE_TRAFFIC_KEYWORDS_5118_INPUT_SCHEMA,
  get_domain_rank_keywords_5118: GET_DOMAIN_RANK_KEYWORDS_5118_INPUT_SCHEMA,
  get_bid_keywords_5118: GET_BID_KEYWORDS_5118_INPUT_SCHEMA,
  get_site_weight_5118: GET_SITE_WEIGHT_5118_INPUT_SCHEMA,
  get_pc_rank_snapshot_5118: GET_PC_RANK_SNAPSHOT_5118_INPUT_SCHEMA,
  get_mobile_rank_snapshot_5118: GET_MOBILE_RANK_SNAPSHOT_5118_INPUT_SCHEMA,
  check_url_indexing_5118: CHECK_URL_INDEXING_5118_INPUT_SCHEMA,
  get_pc_site_rank_keywords_5118: GET_PC_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA,
  get_mobile_site_rank_keywords_5118: GET_MOBILE_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA,
  get_bid_sites_5118: GET_BID_SITES_5118_INPUT_SCHEMA,
  get_pc_top50_sites_5118: GET_PC_TOP50_SITES_5118_INPUT_SCHEMA,
  get_mobile_top50_sites_5118: GET_MOBILE_TOP50_SITES_5118_INPUT_SCHEMA,
} as const;

export type ToolInputSchemaName = keyof typeof TOOL_INPUT_SCHEMAS;

export function validateToolInput(
  toolName: ToolInputSchemaName,
  payload: unknown,
) {
  return z.object(TOOL_INPUT_SCHEMAS[toolName]).safeParse(payload);
}

export type GetLongtailKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_LONGTAIL_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetIndustryFrequencyWords5118Input = z.infer<
  z.ZodObject<typeof GET_INDUSTRY_FREQUENCY_WORDS_5118_INPUT_SCHEMA>
>;
export type GetSuggestTerms5118Input = z.infer<
  z.ZodObject<typeof GET_SUGGEST_TERMS_5118_INPUT_SCHEMA>
>;
export type GetKeywordMetrics5118Input = z.infer<
  z.ZodObject<typeof GET_KEYWORD_METRICS_5118_INPUT_SCHEMA>
>;
export type GetMobileTrafficKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_MOBILE_TRAFFIC_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetDomainRankKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_DOMAIN_RANK_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetBidKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_BID_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetSiteWeight5118Input = z.infer<
  z.ZodObject<typeof GET_SITE_WEIGHT_5118_INPUT_SCHEMA>
>;
export type GetPcRankSnapshot5118Input = z.infer<
  z.ZodObject<typeof GET_PC_RANK_SNAPSHOT_5118_INPUT_SCHEMA>
>;
export type GetMobileRankSnapshot5118Input = z.infer<
  z.ZodObject<typeof GET_MOBILE_RANK_SNAPSHOT_5118_INPUT_SCHEMA>
>;
export type CheckUrlIndexing5118Input = z.infer<
  z.ZodObject<typeof CHECK_URL_INDEXING_5118_INPUT_SCHEMA>
>;
export type GetPcSiteRankKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_PC_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetMobileSiteRankKeywords5118Input = z.infer<
  z.ZodObject<typeof GET_MOBILE_SITE_RANK_KEYWORDS_5118_INPUT_SCHEMA>
>;
export type GetBidSites5118Input = z.infer<
  z.ZodObject<typeof GET_BID_SITES_5118_INPUT_SCHEMA>
>;
export type GetPcTop50Sites5118Input = z.infer<
  z.ZodObject<typeof GET_PC_TOP50_SITES_5118_INPUT_SCHEMA>
>;
export type GetMobileTop50Sites5118Input = z.infer<
  z.ZodObject<typeof GET_MOBILE_TOP50_SITES_5118_INPUT_SCHEMA>
>;
