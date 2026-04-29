import type { PaginationInfo } from "./toolContracts.js";

/** Stable normalized item contract for get_longtail_keywords_5118. */
export interface LongtailKeywordItem {
  keyword: string | null;
  index: number | null;
  mobileIndex: number | null;
  haosouIndex: number | null;
  douyinIndex: number | null;
  toutiaoIndex: number | null;
  longKeywordCount: number | null;
  bidCompanyCount: number | null;
  pageUrl: string | null;
  competition: number | null;
  pcSearchVolume: number | null;
  mobileSearchVolume: number | null;
  semReason: string | null;
  semPrice: string | null;
  semRecommendPriceAvg: number | null;
  googleIndex: number | null;
  kuaishouIndex: number | null;
  weiboIndex: number | null;
}

/** Stable normalized data contract for get_longtail_keywords_5118. */
export interface LongtailKeywordsData {
  keywords: LongtailKeywordItem[];
  pagination: PaginationInfo | null;
}

export type GetLongtailKeywords5118Item = LongtailKeywordItem;
export type GetLongtailKeywords5118Data = LongtailKeywordsData;

/** Stable normalized item contract for get_industry_frequency_words_5118. */
export interface FrequencyWordItem {
  word: string | null;
  ratio: number | null;
  count: number | null;
}

/** Stable normalized data contract for get_industry_frequency_words_5118. */
export interface FrequencyWordsData {
  frequencyWords: FrequencyWordItem[];
}

export type GetIndustryFrequencyWords5118Item = FrequencyWordItem;
export type GetIndustryFrequencyWords5118Data = FrequencyWordsData;

/** Stable normalized item contract for get_suggest_terms_5118. */
export interface SuggestTermItem {
  term: string | null;
  sourceWord: string | null;
  promotedTerm: string | null;
  platform: string | null;
  addTime: string | null;
}

/** Stable normalized data contract for get_suggest_terms_5118. */
export interface SuggestTermsData {
  suggestions: SuggestTermItem[];
}

export type GetSuggestTerms5118Item = SuggestTermItem;
export type GetSuggestTerms5118Data = SuggestTermsData;

/** Stable normalized item contract for get_keyword_metrics_5118. */
export interface KeywordMetricsItem {
  keyword: string | null;
  index: number | null;
  mobileIndex: number | null;
  haosouIndex: number | null;
  douyinIndex: number | null;
  toutiaoIndex: number | null;
  googleIndex: number | null;
  kuaishouIndex: number | null;
  weiboIndex: number | null;
  longKeywordCount: number | null;
  bidCompanyCount: number | null;
  cpc: number | null;
  competition: number | null;
  pcSearchVolume: number | null;
  mobileSearchVolume: number | null;
  recommendedBidMin: number | null;
  recommendedBidMax: number | null;
  recommendedBidAvg: number | null;
  ageBest: string | null;
  ageBestValue: number | null;
  sexMale: number | null;
  sexFemale: number | null;
  bidReason: string | null;
}

/** Stable normalized data contract for get_keyword_metrics_5118. */
export interface KeywordMetricsData {
  items: KeywordMetricsItem[];
}

export type GetKeywordMetrics5118Item = KeywordMetricsItem;
export type GetKeywordMetrics5118Data = KeywordMetricsData;

/** Stable normalized item contract for get_mobile_traffic_keywords_5118. */
export interface MobileTrafficKeywordItem {
  keyword: string | null;
  index: number | null;
  rank: number | null;
  url: string | null;
  weight: number | null;
  mobileIndex: number | null;
  mobileSearchVolume: number | null;
}

/** Stable normalized data contract for get_mobile_traffic_keywords_5118. */
export interface MobileTrafficKeywordsData {
  keywords: MobileTrafficKeywordItem[];
  pagination: PaginationInfo | null;
}

export type GetMobileTrafficKeywords5118Item = MobileTrafficKeywordItem;
export type GetMobileTrafficKeywords5118Data = MobileTrafficKeywordsData;

/** Stable normalized item contract for get_domain_rank_keywords_5118. */
export interface DomainRankKeywordItem {
  keyword: string | null;
  rank: number | null;
  index: number | null;
  mobileIndex: number | null;
  haosouIndex: number | null;
  pageTitle: string | null;
  pageUrl: string | null;
  bidCompanyCount: number | null;
  competition: number | null;
  pcSearchVolume: number | null;
  mobileSearchVolume: number | null;
  recommendedBidAvg: number | null;
  googleIndex: number | null;
  kuaishouIndex: number | null;
  weiboIndex: number | null;
}

/** Stable normalized data contract for get_domain_rank_keywords_5118. */
export interface DomainRankKeywordsData {
  items: DomainRankKeywordItem[];
  pagination: PaginationInfo | null;
}

export type GetDomainRankKeywords5118Item = DomainRankKeywordItem;
export type GetDomainRankKeywords5118Data = DomainRankKeywordsData;

/** Stable normalized item contract for get_pc_site_rank_keywords_5118 and get_mobile_site_rank_keywords_5118. */
export interface SiteRankKeywordItem {
  keyword: string | null;
  rank: number | null;
  pageTitle: string | null;
  pageUrl: string | null;
  bidCompanyCount: number | null;
  longKeywordCount: number | null;
  index: number | null;
  mobileIndex: number | null;
  haosouIndex: number | null;
  douyinIndex: number | null;
  toutiaoIndex: number | null;
  competition: number | null;
  pcSearchVolume: number | null;
  mobileSearchVolume: number | null;
  semReason: string | null;
  semPrice: string | null;
  recommendedBidAvg: number | null;
  googleIndex: number | null;
  kuaishouIndex: number | null;
  weiboIndex: number | null;
}

/** Stable normalized data contract for site rank keyword export tools. */
export interface SiteRankKeywordsData {
  items: SiteRankKeywordItem[];
  pagination: PaginationInfo | null;
}

export type GetPcSiteRankKeywords5118Item = SiteRankKeywordItem;
export type GetPcSiteRankKeywords5118Data = SiteRankKeywordsData;
export type GetMobileSiteRankKeywords5118Item = SiteRankKeywordItem;
export type GetMobileSiteRankKeywords5118Data = SiteRankKeywordsData;

/** Stable normalized item contract for get_bid_keywords_5118. */
export interface BidKeywordItem {
  keyword: string | null;
  title: string | null;
  intro: string | null;
  semPrice: string | null;
  pcSearchVolume: number | null;
  mobileSearchVolume: number | null;
  competition: number | null;
  index: number | null;
  mobileIndex: number | null;
  haosouIndex: number | null;
  recentBidCompanyCount: number | null;
  totalBidCompanyCount: number | null;
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  recommendedBidAvg: number | null;
  googleIndex: number | null;
  kuaishouIndex: number | null;
  weiboIndex: number | null;
}

/** Stable normalized data contract for get_bid_keywords_5118. */
export interface BidKeywordsData {
  items: BidKeywordItem[];
  pagination: PaginationInfo | null;
}

export type GetBidKeywords5118Item = BidKeywordItem;
export type GetBidKeywords5118Data = BidKeywordsData;

/** Stable normalized item contract for get_bid_sites_5118. */
export interface BidSiteItem {
  title: string | null;
  intro: string | null;
  siteTitle: string | null;
  siteUrl: string | null;
  fullUrl: string | null;
  companyName: string | null;
  baiduPcWeight: string | null;
  bidCount: number | null;
  lastSeenAt: string | null;
  firstSeenAt: string | null;
}

/** Stable normalized data contract for get_bid_sites_5118. */
export interface BidSitesData {
  items: BidSiteItem[];
  pagination: PaginationInfo | null;
}

export type GetBidSites5118Item = BidSiteItem;
export type GetBidSites5118Data = BidSitesData;

/** Stable normalized item contract for get_site_weight_5118. */
export interface SiteWeightItem {
  type: string | null;
  weight: string | null;
}

/** Stable normalized data contract for get_site_weight_5118. */
export interface SiteWeightData {
  weights: SiteWeightItem[];
}

export type GetSiteWeight5118Item = SiteWeightItem;
export type GetSiteWeight5118Data = SiteWeightData;

/** Stable normalized item contract for get_pc_rank_snapshot_5118 and get_mobile_rank_snapshot_5118. */
export interface RankSnapshotResultItem {
  siteUrl: string | null;
  rank: number | null;
  pageTitle: string | null;
  pageUrl: string | null;
  top100: number | null;
  siteWeight: string | null;
}

/** Stable normalized keyword contract for rank snapshot tools. */
export interface RankSnapshotKeywordItem {
  keyword: string | null;
  searchEngine: string | null;
  ip: string | null;
  area: string | null;
  network: string | null;
  ranks: RankSnapshotResultItem[];
}

/** Stable normalized data contract for rank snapshot tools. */
export interface RankSnapshotData {
  rankings: RankSnapshotKeywordItem[];
}

export type GetPcRankSnapshot5118KeywordItem = RankSnapshotKeywordItem;
export type GetPcRankSnapshot5118RankItem = RankSnapshotResultItem;
export type GetPcRankSnapshot5118Data = RankSnapshotData;
export type GetMobileRankSnapshot5118KeywordItem = RankSnapshotKeywordItem;
export type GetMobileRankSnapshot5118RankItem = RankSnapshotResultItem;
export type GetMobileRankSnapshot5118Data = RankSnapshotData;

/** Stable normalized keyword contract for top-50 site snapshot tools. */
export interface TopSiteSnapshotItem {
  keyword: string | null;
  searchEngine: string | null;
  ip: string | null;
  area: string | null;
  network: string | null;
  checkedAt: string | null;
  ranks: RankSnapshotResultItem[];
}

/** Stable normalized data contract for top-50 site snapshot tools. */
export interface TopSiteSnapshotsData {
  siteSnapshots: TopSiteSnapshotItem[];
}

export type GetPcTop50Sites5118Item = TopSiteSnapshotItem;
export type GetPcTop50Sites5118Data = TopSiteSnapshotsData;
export type GetMobileTop50Sites5118Item = TopSiteSnapshotItem;
export type GetMobileTop50Sites5118Data = TopSiteSnapshotsData;

/** Stable normalized item contract for check_url_indexing_5118. */
export interface UrlIndexingItem {
  url: string | null;
  status: number | null;
  title: string | null;
  snapshotTime: string | null;
}

/** Stable normalized data contract for check_url_indexing_5118. */
export interface UrlIndexingData {
  items: UrlIndexingItem[];
  total: number | null;
  checkStatus: number | null;
  submitTime: string | null;
  finishedTime: string | null;
}

export type CheckUrlIndexing5118Item = UrlIndexingItem;
export type CheckUrlIndexing5118Data = UrlIndexingData;