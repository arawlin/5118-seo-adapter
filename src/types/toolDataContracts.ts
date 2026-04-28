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