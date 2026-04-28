import { createPagination } from "../lib/responseEnvelope.js";
import type { PaginationInfo } from "../types/toolContracts.js";
import type {
  FrequencyWordsData,
  LongtailKeywordsData,
  SuggestTermsData,
} from "../types/toolDataContracts.js";

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringOrNull(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const text = String(value);
  return text.length > 0 ? text : null;
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

export function normalizeLongtailKeywordsResponse(raw: unknown): LongtailKeywordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.list).length > 0 ? asArray(data.list) : asArray(data.keywords);

  const keywords = list.map((item) => {
    const record = asRecord(item);
    return {
      keyword: toStringOrNull(record.keyword ?? record.word),
      index: toNumber(record.index),
      mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
      haosouIndex: toNumber(record.haosou_index ?? record.haosouIndex),
      douyinIndex: toNumber(record.douyin_index ?? record.douyinIndex),
      toutiaoIndex: toNumber(record.toutiao_index ?? record.toutiaoIndex),
      longKeywordCount: toNumber(record.long_keyword_count ?? record.longKeywordCount),
      bidCompanyCount: toNumber(
        record.bidword_company_count ?? record.bid_company_count ?? record.bidCompanyCount,
      ),
      pageUrl: toStringOrNull(record.page_url ?? record.pageUrl),
      competition: toNumber(record.bidword_kwc ?? record.competition ?? record.compete),
      pcSearchVolume: toNumber(record.bidword_pcpv ?? record.pc_pv ?? record.pcSearchVolume),
      mobileSearchVolume: toNumber(
        record.bidword_wisepv ?? record.wise_pv ?? record.mobileSearchVolume,
      ),
      semReason: toStringOrNull(record.sem_reason ?? record.semReason),
      semPrice: toStringOrNull(record.sem_price ?? record.semPrice),
      semRecommendPriceAvg: toNumber(
        record.sem_recommend_price_avg ??
          record.bidword_recommend_price_avg ??
          record.semRecommendPriceAvg,
      ),
      googleIndex: toNumber(record.google_index ?? record.googleIndex),
      kuaishouIndex: toNumber(record.kuaishou_index ?? record.kuaishouIndex),
      weiboIndex: toNumber(record.weibo_index ?? record.weiboIndex),
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
        word: toStringOrNull(record.word ?? record.keyword ?? record.text),
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
          sourceWord: item,
          promotedTerm: item,
          platform: null,
          addTime: null,
        };
      }

      const record = asRecord(item);
      return {
        term: toStringOrNull(
          record.promote_word ?? record.promoteWord ?? record.word ?? record.keyword ?? record.term,
        ),
        sourceWord: toStringOrNull(
          record.word ?? record.keyword ?? record.source_word ?? record.sourceWord,
        ),
        promotedTerm: toStringOrNull(
          record.promote_word ?? record.promoteWord ?? record.term ?? record.word ?? record.keyword,
        ),
        platform: toStringOrNull(record.platform),
        addTime: toStringOrNull(record.add_time ?? record.addTime),
      };
    }),
  };
}
