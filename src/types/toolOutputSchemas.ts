import { z } from "zod";

const STRING_OR_NULL_OUTPUT_SCHEMA = z.string().nullable();
const NUMBER_OR_NULL_OUTPUT_SCHEMA = z.number().nullable();
const NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA = z.number().int().nonnegative();
const NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA = z.number().int().nonnegative().nullable();

const PAGINATION_OUTPUT_SCHEMA = z.object({
  pageIndex: NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA,
  pageSize: NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA,
  pageCount: NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA,
  total: NON_NEGATIVE_INTEGER_OUTPUT_SCHEMA,
});

const RANK_SNAPSHOT_RESULT_ITEM_OUTPUT_SCHEMA = z.object({
  siteUrl: STRING_OR_NULL_OUTPUT_SCHEMA,
  rank: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  pageTitle: STRING_OR_NULL_OUTPUT_SCHEMA,
  pageUrl: STRING_OR_NULL_OUTPUT_SCHEMA,
  top100: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  siteWeight: STRING_OR_NULL_OUTPUT_SCHEMA,
});

const RANK_SNAPSHOT_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA,
  searchEngine: STRING_OR_NULL_OUTPUT_SCHEMA,
  ip: STRING_OR_NULL_OUTPUT_SCHEMA,
  area: STRING_OR_NULL_OUTPUT_SCHEMA,
  network: STRING_OR_NULL_OUTPUT_SCHEMA,
  ranks: z.array(RANK_SNAPSHOT_RESULT_ITEM_OUTPUT_SCHEMA),
});

const TOP_SITE_SNAPSHOT_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA,
  searchEngine: STRING_OR_NULL_OUTPUT_SCHEMA,
  ip: STRING_OR_NULL_OUTPUT_SCHEMA,
  area: STRING_OR_NULL_OUTPUT_SCHEMA,
  network: STRING_OR_NULL_OUTPUT_SCHEMA,
  checkedAt: STRING_OR_NULL_OUTPUT_SCHEMA,
  ranks: z.array(RANK_SNAPSHOT_RESULT_ITEM_OUTPUT_SCHEMA),
});

const LONGTAIL_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA,
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  douyinIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  toutiaoIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  longKeywordCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  bidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  pageUrl: STRING_OR_NULL_OUTPUT_SCHEMA,
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  semReason: STRING_OR_NULL_OUTPUT_SCHEMA,
  semPrice: STRING_OR_NULL_OUTPUT_SCHEMA,
  semRecommendPriceAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
});

const FREQUENCY_WORD_ITEM_OUTPUT_SCHEMA = z.object({
  word: STRING_OR_NULL_OUTPUT_SCHEMA,
  ratio: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  count: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
});

const SUGGEST_TERM_ITEM_OUTPUT_SCHEMA = z.object({
  term: STRING_OR_NULL_OUTPUT_SCHEMA,
  sourceWord: STRING_OR_NULL_OUTPUT_SCHEMA,
  promotedTerm: STRING_OR_NULL_OUTPUT_SCHEMA,
  platform: STRING_OR_NULL_OUTPUT_SCHEMA,
  addTime: STRING_OR_NULL_OUTPUT_SCHEMA,
});

const KEYWORD_METRICS_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA,
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  douyinIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  toutiaoIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  longKeywordCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  bidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  cpc: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  recommendedBidMin: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  recommendedBidMax: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  recommendedBidAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  ageBest: STRING_OR_NULL_OUTPUT_SCHEMA,
  ageBestValue: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  sexMale: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  sexFemale: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  bidReason: STRING_OR_NULL_OUTPUT_SCHEMA,
});

const MOBILE_TRAFFIC_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA,
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  rank: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  url: STRING_OR_NULL_OUTPUT_SCHEMA,
  weight: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
});

const DOMAIN_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
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

const SITE_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
  keyword: STRING_OR_NULL_OUTPUT_SCHEMA,
  rank: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  pageTitle: STRING_OR_NULL_OUTPUT_SCHEMA,
  pageUrl: STRING_OR_NULL_OUTPUT_SCHEMA,
  bidCompanyCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  longKeywordCount: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  index: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  haosouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  douyinIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  toutiaoIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  competition: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  pcSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  mobileSearchVolume: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  semReason: STRING_OR_NULL_OUTPUT_SCHEMA,
  semPrice: STRING_OR_NULL_OUTPUT_SCHEMA,
  recommendedBidAvg: NUMBER_OR_NULL_OUTPUT_SCHEMA,
  googleIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  kuaishouIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  weiboIndex: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
});

const BID_KEYWORD_ITEM_OUTPUT_SCHEMA = z.object({
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

const BID_SITE_ITEM_OUTPUT_SCHEMA = z.object({
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

const SITE_WEIGHT_ITEM_OUTPUT_SCHEMA = z.object({
  type: STRING_OR_NULL_OUTPUT_SCHEMA,
  weight: STRING_OR_NULL_OUTPUT_SCHEMA,
});

const URL_INDEXING_ITEM_OUTPUT_SCHEMA = z.object({
  url: STRING_OR_NULL_OUTPUT_SCHEMA,
  status: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  title: STRING_OR_NULL_OUTPUT_SCHEMA,
  snapshotTime: STRING_OR_NULL_OUTPUT_SCHEMA,
});

const LONGTAIL_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  keywords: z.array(LONGTAIL_KEYWORD_ITEM_OUTPUT_SCHEMA),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
});

const FREQUENCY_WORDS_DATA_OUTPUT_SCHEMA = z.object({
  frequencyWords: z.array(FREQUENCY_WORD_ITEM_OUTPUT_SCHEMA),
});

const SUGGEST_TERMS_DATA_OUTPUT_SCHEMA = z.object({
  suggestions: z.array(SUGGEST_TERM_ITEM_OUTPUT_SCHEMA),
});

const KEYWORD_METRICS_DATA_OUTPUT_SCHEMA = z.object({
  items: z.array(KEYWORD_METRICS_ITEM_OUTPUT_SCHEMA),
});

const MOBILE_TRAFFIC_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  keywords: z.array(MOBILE_TRAFFIC_KEYWORD_ITEM_OUTPUT_SCHEMA),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
});

const DOMAIN_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  items: z.array(DOMAIN_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
});

const SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  items: z.array(SITE_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
});

const BID_KEYWORDS_DATA_OUTPUT_SCHEMA = z.object({
  items: z.array(BID_KEYWORD_ITEM_OUTPUT_SCHEMA),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
});

const BID_SITES_DATA_OUTPUT_SCHEMA = z.object({
  items: z.array(BID_SITE_ITEM_OUTPUT_SCHEMA),
  pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
});

const SITE_WEIGHT_DATA_OUTPUT_SCHEMA = z.object({
  weights: z.array(SITE_WEIGHT_ITEM_OUTPUT_SCHEMA),
});

const RANK_SNAPSHOT_DATA_OUTPUT_SCHEMA = z.object({
  rankings: z.array(RANK_SNAPSHOT_KEYWORD_ITEM_OUTPUT_SCHEMA),
});

const TOP_SITE_SNAPSHOTS_DATA_OUTPUT_SCHEMA = z.object({
  siteSnapshots: z.array(TOP_SITE_SNAPSHOT_ITEM_OUTPUT_SCHEMA),
});

const URL_INDEXING_DATA_OUTPUT_SCHEMA = z.object({
  items: z.array(URL_INDEXING_ITEM_OUTPUT_SCHEMA),
  total: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  checkStatus: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  submitTime: STRING_OR_NULL_OUTPUT_SCHEMA,
  finishedTime: STRING_OR_NULL_OUTPUT_SCHEMA,
});

function createResponseOutputSchema(dataSchema: z.ZodTypeAny) {
  return {
    source: z.literal("5118"),
    sourceType: z.literal("official-api-backed"),
    tool: z.string(),
    apiName: z.string(),
    endpoint: z.string(),
    mode: z.enum(["sync", "async"]),
    executionStatus: z.enum(["completed", "pending", "failed"]),
    taskId: z.union([z.string(), z.number(), z.null()]),
    pagination: PAGINATION_OUTPUT_SCHEMA.nullable(),
    data: dataSchema.nullable(),
    warnings: z.array(z.string()),
    raw: z.unknown(),
  };
}

export const TOOL_OUTPUT_SCHEMAS = {
  get_longtail_keywords_5118: createResponseOutputSchema(LONGTAIL_KEYWORDS_DATA_OUTPUT_SCHEMA),
  get_industry_frequency_words_5118: createResponseOutputSchema(FREQUENCY_WORDS_DATA_OUTPUT_SCHEMA),
  get_suggest_terms_5118: createResponseOutputSchema(SUGGEST_TERMS_DATA_OUTPUT_SCHEMA),
  get_keyword_metrics_5118: createResponseOutputSchema(KEYWORD_METRICS_DATA_OUTPUT_SCHEMA),
  get_mobile_traffic_keywords_5118: createResponseOutputSchema(MOBILE_TRAFFIC_KEYWORDS_DATA_OUTPUT_SCHEMA),
  get_domain_rank_keywords_5118: createResponseOutputSchema(DOMAIN_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA),
  get_bid_keywords_5118: createResponseOutputSchema(BID_KEYWORDS_DATA_OUTPUT_SCHEMA),
  get_site_weight_5118: createResponseOutputSchema(SITE_WEIGHT_DATA_OUTPUT_SCHEMA),
  get_pc_rank_snapshot_5118: createResponseOutputSchema(RANK_SNAPSHOT_DATA_OUTPUT_SCHEMA),
  get_mobile_rank_snapshot_5118: createResponseOutputSchema(RANK_SNAPSHOT_DATA_OUTPUT_SCHEMA),
  check_url_indexing_5118: createResponseOutputSchema(URL_INDEXING_DATA_OUTPUT_SCHEMA),
  get_pc_site_rank_keywords_5118: createResponseOutputSchema(SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA),
  get_mobile_site_rank_keywords_5118: createResponseOutputSchema(SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA),
  get_bid_sites_5118: createResponseOutputSchema(BID_SITES_DATA_OUTPUT_SCHEMA),
  get_pc_top50_sites_5118: createResponseOutputSchema(TOP_SITE_SNAPSHOTS_DATA_OUTPUT_SCHEMA),
  get_mobile_top50_sites_5118: createResponseOutputSchema(TOP_SITE_SNAPSHOTS_DATA_OUTPUT_SCHEMA),
} as const;

export type ToolOutputSchemaName = keyof typeof TOOL_OUTPUT_SCHEMAS;

export function validateToolOutputEnvelope(
  toolName: ToolOutputSchemaName,
  payload: unknown,
) {
  return z.object(TOOL_OUTPUT_SCHEMAS[toolName]).safeParse(payload);
}

export type LongtailKeywordItem = z.infer<typeof LONGTAIL_KEYWORD_ITEM_OUTPUT_SCHEMA>;
export type LongtailKeywordsData = z.infer<typeof LONGTAIL_KEYWORDS_DATA_OUTPUT_SCHEMA>;
export type GetLongtailKeywords5118Item = LongtailKeywordItem;
export type GetLongtailKeywords5118Data = LongtailKeywordsData;

export type FrequencyWordItem = z.infer<typeof FREQUENCY_WORD_ITEM_OUTPUT_SCHEMA>;
export type FrequencyWordsData = z.infer<typeof FREQUENCY_WORDS_DATA_OUTPUT_SCHEMA>;
export type GetIndustryFrequencyWords5118Item = FrequencyWordItem;
export type GetIndustryFrequencyWords5118Data = FrequencyWordsData;

export type SuggestTermItem = z.infer<typeof SUGGEST_TERM_ITEM_OUTPUT_SCHEMA>;
export type SuggestTermsData = z.infer<typeof SUGGEST_TERMS_DATA_OUTPUT_SCHEMA>;
export type GetSuggestTerms5118Item = SuggestTermItem;
export type GetSuggestTerms5118Data = SuggestTermsData;

export type KeywordMetricsItem = z.infer<typeof KEYWORD_METRICS_ITEM_OUTPUT_SCHEMA>;
export type KeywordMetricsData = z.infer<typeof KEYWORD_METRICS_DATA_OUTPUT_SCHEMA>;
export type GetKeywordMetrics5118Item = KeywordMetricsItem;
export type GetKeywordMetrics5118Data = KeywordMetricsData;

export type MobileTrafficKeywordItem = z.infer<typeof MOBILE_TRAFFIC_KEYWORD_ITEM_OUTPUT_SCHEMA>;
export type MobileTrafficKeywordsData = z.infer<typeof MOBILE_TRAFFIC_KEYWORDS_DATA_OUTPUT_SCHEMA>;
export type GetMobileTrafficKeywords5118Item = MobileTrafficKeywordItem;
export type GetMobileTrafficKeywords5118Data = MobileTrafficKeywordsData;

export type DomainRankKeywordItem = z.infer<typeof DOMAIN_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA>;
export type DomainRankKeywordsData = z.infer<typeof DOMAIN_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA>;
export type GetDomainRankKeywords5118Item = DomainRankKeywordItem;
export type GetDomainRankKeywords5118Data = DomainRankKeywordsData;

export type SiteRankKeywordItem = z.infer<typeof SITE_RANK_KEYWORD_ITEM_OUTPUT_SCHEMA>;
export type SiteRankKeywordsData = z.infer<typeof SITE_RANK_KEYWORDS_DATA_OUTPUT_SCHEMA>;
export type GetPcSiteRankKeywords5118Item = SiteRankKeywordItem;
export type GetPcSiteRankKeywords5118Data = SiteRankKeywordsData;
export type GetMobileSiteRankKeywords5118Item = SiteRankKeywordItem;
export type GetMobileSiteRankKeywords5118Data = SiteRankKeywordsData;

export type BidKeywordItem = z.infer<typeof BID_KEYWORD_ITEM_OUTPUT_SCHEMA>;
export type BidKeywordsData = z.infer<typeof BID_KEYWORDS_DATA_OUTPUT_SCHEMA>;
export type GetBidKeywords5118Item = BidKeywordItem;
export type GetBidKeywords5118Data = BidKeywordsData;

export type BidSiteItem = z.infer<typeof BID_SITE_ITEM_OUTPUT_SCHEMA>;
export type BidSitesData = z.infer<typeof BID_SITES_DATA_OUTPUT_SCHEMA>;
export type GetBidSites5118Item = BidSiteItem;
export type GetBidSites5118Data = BidSitesData;

export type SiteWeightItem = z.infer<typeof SITE_WEIGHT_ITEM_OUTPUT_SCHEMA>;
export type SiteWeightData = z.infer<typeof SITE_WEIGHT_DATA_OUTPUT_SCHEMA>;
export type GetSiteWeight5118Item = SiteWeightItem;
export type GetSiteWeight5118Data = SiteWeightData;

export type RankSnapshotResultItem = z.infer<typeof RANK_SNAPSHOT_RESULT_ITEM_OUTPUT_SCHEMA>;
export type RankSnapshotKeywordItem = z.infer<typeof RANK_SNAPSHOT_KEYWORD_ITEM_OUTPUT_SCHEMA>;
export type RankSnapshotData = z.infer<typeof RANK_SNAPSHOT_DATA_OUTPUT_SCHEMA>;
export type GetPcRankSnapshot5118KeywordItem = RankSnapshotKeywordItem;
export type GetPcRankSnapshot5118RankItem = RankSnapshotResultItem;
export type GetPcRankSnapshot5118Data = RankSnapshotData;
export type GetMobileRankSnapshot5118KeywordItem = RankSnapshotKeywordItem;
export type GetMobileRankSnapshot5118RankItem = RankSnapshotResultItem;
export type GetMobileRankSnapshot5118Data = RankSnapshotData;

export type TopSiteSnapshotItem = z.infer<typeof TOP_SITE_SNAPSHOT_ITEM_OUTPUT_SCHEMA>;
export type TopSiteSnapshotsData = z.infer<typeof TOP_SITE_SNAPSHOTS_DATA_OUTPUT_SCHEMA>;
export type GetPcTop50Sites5118Item = TopSiteSnapshotItem;
export type GetPcTop50Sites5118Data = TopSiteSnapshotsData;
export type GetMobileTop50Sites5118Item = TopSiteSnapshotItem;
export type GetMobileTop50Sites5118Data = TopSiteSnapshotsData;

export type UrlIndexingItem = z.infer<typeof URL_INDEXING_ITEM_OUTPUT_SCHEMA>;
export type UrlIndexingData = z.infer<typeof URL_INDEXING_DATA_OUTPUT_SCHEMA>;
export type CheckUrlIndexing5118Item = UrlIndexingItem;
export type CheckUrlIndexing5118Data = UrlIndexingData;
