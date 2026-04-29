import { createPagination } from "../lib/responseEnvelope.js";
import type { PaginationInfo } from "../types/toolContracts.js";
import type {
  KeywordMetricsData,
  MobileTrafficKeywordsData,
} from "../types/toolOutputSchemas.js";

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

export function normalizeKeywordMetricsResponse(raw: unknown): KeywordMetricsData {
  const root = asRecord(raw);
  const data = root.data;
  const dataRecord = asRecord(data);
  const list =
    asArray(data).length > 0
      ? asArray(data)
      : asArray(dataRecord.keyword_param).length > 0
        ? asArray(dataRecord.keyword_param)
        : asArray(dataRecord.list);

  return {
    items: list.map((item) => {
      const record = asRecord(item);
      return {
        keyword: toStringOrNull(record.keyword ?? record.word),
        index: toNumber(record.index),
        mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
        haosouIndex: toNumber(record.haosou_index ?? record.haosouIndex),
        douyinIndex: toNumber(record.douyin_index ?? record.douyinIndex),
        toutiaoIndex: toNumber(record.toutiao_index ?? record.toutiaoIndex),
        googleIndex: toNumber(record.google_index ?? record.googleIndex),
        kuaishouIndex: toNumber(record.kuaishou_index ?? record.kuaishouIndex),
        weiboIndex: toNumber(record.weibo_index ?? record.weiboIndex),
        longKeywordCount: toNumber(record.long_keyword_count ?? record.longKeywordCount),
        bidCompanyCount: toNumber(
          record.bidword_company_count ?? record.bid_company_count ?? record.bidCompanyCount,
        ),
        cpc: toNumber(record.bidword_price ?? record.cpc ?? record.bid_price ?? record.bidPrice),
        competition: toNumber(record.bidword_kwc ?? record.competition ?? record.compete),
        pcSearchVolume: toNumber(record.bidword_pcpv ?? record.pc_pv ?? record.pcSearchVolume),
        mobileSearchVolume: toNumber(
          record.bidword_wisepv ?? record.wise_pv ?? record.mobileSearchVolume,
        ),
        recommendedBidMin: toNumber(
          record.bidword_recommendprice_min ?? record.recommended_bid_min ?? record.recommendedBidMin,
        ),
        recommendedBidMax: toNumber(
          record.bidword_recommendprice_max ?? record.recommended_bid_max ?? record.recommendedBidMax,
        ),
        recommendedBidAvg: toNumber(
          record.bidword_recommend_price_avg ??
            record.recommended_bid_avg ??
            record.recommendedBidAvg,
        ),
        ageBest: toStringOrNull(record.age_best ?? record.ageBest),
        ageBestValue: toNumber(record.age_best_value ?? record.ageBestValue),
        sexMale: toNumber(record.sex_male ?? record.sexMale),
        sexFemale: toNumber(record.sex_female ?? record.sexFemale),
        bidReason: toStringOrNull(
          record.bidword_showreasons ?? record.bidReason ?? record.sem_reason,
        ),
      };
    }),
  };
}

export function normalizeMobileTrafficKeywordsResponse(
  raw: unknown,
): MobileTrafficKeywordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.list).length > 0 ? asArray(data.list) : asArray(data.keywords);

  const pagination = createPagination(
    data.page_index ?? data.pageIndex,
    data.page_size ?? data.pageSize,
    data.page_count ?? data.pageCount,
    data.total,
  );

  return {
    keywords: list.map((item) => {
      const record = asRecord(item);
      return {
        keyword: toStringOrNull(record.keyword ?? record.word),
        index: toNumber(record.index),
        rank: toNumber(record.rank ?? record.position),
        url: toStringOrNull(record.url),
        weight: toNumber(record.weight),
        mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
        mobileSearchVolume: toNumber(
          record.bidword_wisepv ?? record.wise_pv ?? record.mobileSearchVolume,
        ),
      };
    }),
    pagination,
  };
}
