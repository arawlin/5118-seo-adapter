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

export interface KeywordMetricsItem {
  keyword: string | null;
  index: number | null;
  mobileIndex: number | null;
  longKeywordCount: number | null;
  bidCompanyCount: number | null;
  cpc: number | null;
  competition: number | null;
}

export interface KeywordMetricsData {
  items: KeywordMetricsItem[];
}

export interface MobileTrafficKeywordItem {
  keyword: string | null;
  index: number | null;
  rank: number | null;
  url: string | null;
}

export interface MobileTrafficKeywordsData {
  keywords: MobileTrafficKeywordItem[];
  pagination: PaginationInfo | null;
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
        keyword: String(record.keyword ?? record.word ?? "") || null,
        index: toNumber(record.index),
        mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
        longKeywordCount: toNumber(record.long_keyword_count ?? record.longKeywordCount),
          bidCompanyCount: toNumber(
            record.bidword_company_count ?? record.bid_company_count ?? record.bidCompanyCount,
          ),
          cpc: toNumber(record.bidword_price ?? record.cpc ?? record.bid_price ?? record.bidPrice),
          competition: toNumber(record.bidword_kwc ?? record.competition ?? record.compete),
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
        keyword: String(record.keyword ?? record.word ?? "") || null,
        index: toNumber(record.index),
        rank: toNumber(record.rank ?? record.position),
        url: String(record.url ?? "") || null,
      };
    }),
    pagination,
  };
}
