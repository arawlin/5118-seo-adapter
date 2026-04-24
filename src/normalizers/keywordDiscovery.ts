import { createPagination } from "../lib/responseEnvelope.js";
import type { PaginationInfo } from "../types/toolContracts.js";

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
}

export interface LongtailKeywordItem {
  keyword: string | null;
  index: number | null;
  mobileIndex: number | null;
  longKeywordCount: number | null;
  bidCompanyCount: number | null;
}

export interface LongtailKeywordsData {
  keywords: LongtailKeywordItem[];
  pagination: PaginationInfo | null;
}

export interface FrequencyWordItem {
  word: string | null;
  ratio: number | null;
  count: number | null;
}

export interface FrequencyWordsData {
  frequencyWords: FrequencyWordItem[];
}

export interface SuggestTermItem {
  term: string | null;
  platform: string | null;
}

export interface SuggestTermsData {
  suggestions: SuggestTermItem[];
}

export function normalizeLongtailKeywordsResponse(raw: unknown): LongtailKeywordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.list).length > 0 ? asArray(data.list) : asArray(data.keywords);

  const keywords = list.map((item) => {
    const record = asRecord(item);
    return {
      keyword: String(record.keyword ?? record.word ?? "") || null,
      index: toNumber(record.index),
      mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
      longKeywordCount: toNumber(record.long_keyword_count ?? record.longKeywordCount),
      bidCompanyCount: toNumber(record.bid_company_count ?? record.bidCompanyCount),
    };
  });

  const pagination = createPagination(
    data.page_index ?? data.pageIndex,
    data.page_size ?? data.pageSize,
    data.page_count ?? data.pageCount,
    data.total,
  );

  return {
    keywords,
    pagination,
  };
}

export function normalizeIndustryFrequencyWordsResponse(raw: unknown): FrequencyWordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.list).length > 0 ? asArray(data.list) : asArray(data.words);

  return {
    frequencyWords: list.map((item) => {
      const record = asRecord(item);
      return {
        word: String(record.word ?? record.keyword ?? record.text ?? "") || null,
        ratio: toNumber(record.ratio ?? record.percent),
        count: toNumber(record.count ?? record.num),
      };
    }),
  };
}

export function normalizeSuggestTermsResponse(raw: unknown): SuggestTermsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.list).length > 0 ? asArray(data.list) : asArray(data.suggestions);

  return {
    suggestions: list.map((item) => {
      if (typeof item === "string") {
        return {
          term: item,
          platform: null,
        };
      }

      const record = asRecord(item);
      return {
        term: String(record.word ?? record.keyword ?? record.term ?? "") || null,
        platform: String(record.platform ?? "") || null,
      };
    }),
  };
}
