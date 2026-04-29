import { createPagination } from "../lib/responseEnvelope.js";
import type {
  BidSitesData,
  BidKeywordsData,
  DomainRankKeywordsData,
  RankSnapshotData,
  SiteRankKeywordsData,
  SiteWeightData,
  TopSiteSnapshotsData,
  UrlIndexingData,
  RankSnapshotResultItem,
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

function firstArray(data: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = asArray(data[key]);
    if (value.length > 0) {
      return value;
    }
  }

  return [];
}

function normalizeRankResultItem(rankItem: unknown): RankSnapshotResultItem {
  const rankRecord = asRecord(rankItem);
  return {
    siteUrl: toStringOrNull(rankRecord.site_url ?? rankRecord.siteUrl),
    rank: toNumber(rankRecord.rank),
    pageTitle: toStringOrNull(rankRecord.page_title ?? rankRecord.pageTitle),
    pageUrl: toStringOrNull(rankRecord.page_url ?? rankRecord.pageUrl),
    top100: toNumber(rankRecord.top100),
    siteWeight: toStringOrNull(rankRecord.site_weight ?? rankRecord.siteWeight),
  };
}

function normalizeSiteRankKeywordRecord(item: unknown) {
  const record = asRecord(item);
  return {
    keyword: toStringOrNull(record.keyword ?? record.word),
    rank: toNumber(record.rank),
    pageTitle: toStringOrNull(record.page_title ?? record.pageTitle),
    pageUrl: toStringOrNull(record.page_url ?? record.pageUrl ?? record.url),
    bidCompanyCount: toNumber(
      record.bidword_companycount ?? record.bidword_company_count ?? record.bidCompanyCount,
    ),
    longKeywordCount: toNumber(record.long_keyword_count ?? record.longKeywordCount),
    index: toNumber(record.index),
    mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
    haosouIndex: toNumber(record.haosou_index ?? record.haosouIndex),
    douyinIndex: toNumber(record.douyin_index ?? record.douyinIndex),
    toutiaoIndex: toNumber(record.toutiao_index ?? record.toutiaoIndex),
    competition: toNumber(record.bidword_kwc ?? record.competition),
    pcSearchVolume: toNumber(record.bidword_pcpv ?? record.pcSearchVolume),
    mobileSearchVolume: toNumber(record.bidword_wisepv ?? record.mobileSearchVolume),
    semReason: toStringOrNull(record.sem_reason ?? record.semReason),
    semPrice: toStringOrNull(record.sem_price ?? record.semPrice),
    recommendedBidAvg: toNumber(
      record.bidword_recommend_price_avg ?? record.recommendedBidAvg,
    ),
    googleIndex: toNumber(record.google_index ?? record.googleIndex),
    kuaishouIndex: toNumber(record.kuaishou_index ?? record.kuaishouIndex),
    weiboIndex: toNumber(record.weibo_index ?? record.weiboIndex),
  };
}

function normalizeSiteRankKeywordsByKeys(raw: unknown, keys: string[]): SiteRankKeywordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = firstArray(data, [...keys, "list"]);

  const pagination = createPagination(
    data.page_index ?? data.pageIndex,
    data.page_size ?? data.pageSize,
    data.page_count ?? data.pageCount,
    data.total,
  );

  return {
    items: list.map((item) => normalizeSiteRankKeywordRecord(item)),
    pagination,
  };
}

export function normalizeDomainRankKeywordsResponse(raw: unknown): DomainRankKeywordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.domain).length > 0 ? asArray(data.domain) : asArray(data.list);

  const pagination = createPagination(
    data.page_index ?? data.pageIndex,
    data.page_size ?? data.pageSize,
    data.page_count ?? data.pageCount,
    data.total,
  );

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
    pagination,
  };
}

export function normalizePcSiteRankKeywordsResponse(raw: unknown): SiteRankKeywordsData {
  return normalizeSiteRankKeywordsByKeys(raw, ["baidupc", "pc"]);
}

export function normalizeMobileSiteRankKeywordsResponse(raw: unknown): SiteRankKeywordsData {
  return normalizeSiteRankKeywordsByKeys(raw, ["baidumobile", "mobile"]);
}

export function normalizeBidKeywordsResponse(raw: unknown): BidKeywordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.keywords).length > 0 ? asArray(data.keywords) : asArray(data.list);

  const pagination = createPagination(
    data.page_index ?? data.pageIndex,
    data.page_size ?? data.pageSize,
    data.page_count ?? data.pageCount,
    data.total,
  );

  return {
    items: list.map((item) => {
      const record = asRecord(item);
      return {
        keyword: toStringOrNull(record.keyword ?? record.word),
        title: toStringOrNull(record.title),
        intro: toStringOrNull(record.intro ?? record.description),
        semPrice: toStringOrNull(record.bidword_semprice ?? record.semPrice),
        pcSearchVolume: toNumber(record.bidword_pcpv ?? record.pcSearchVolume),
        mobileSearchVolume: toNumber(record.bidword_wisepv ?? record.mobileSearchVolume),
        competition: toNumber(record.bidword_kwc ?? record.competition),
        index: toNumber(record.index),
        mobileIndex: toNumber(record.mobile_index ?? record.mobileIndex),
        haosouIndex: toNumber(record.haosou_index ?? record.haosouIndex),
        recentBidCompanyCount: toNumber(
          record.urlcount_30day ?? record.recentBidCompanyCount,
        ),
        totalBidCompanyCount: toNumber(record.urlcount ?? record.totalBidCompanyCount),
        firstSeenAt: toStringOrNull(record.firstfindtime ?? record.firstSeenAt),
        lastSeenAt: toStringOrNull(record.joindate ?? record.lastSeenAt),
        recommendedBidAvg: toNumber(
          record.bidword_recommend_price_avg ?? record.recommendedBidAvg,
        ),
        googleIndex: toNumber(record.google_index ?? record.googleIndex),
        kuaishouIndex: toNumber(record.kuaishou_index ?? record.kuaishouIndex),
        weiboIndex: toNumber(record.weibo_index ?? record.weiboIndex),
      };
    }),
    pagination,
  };
}

export function normalizeBidSitesResponse(raw: unknown): BidSitesData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = firstArray(data, ["keyword_bidsite", "items", "list"]);

  const pagination = createPagination(
    data.page_index ?? data.pageIndex,
    data.page_size ?? data.pageSize,
    data.page_count ?? data.pageCount,
    data.total,
  );

  return {
    items: list.map((item) => {
      const record = asRecord(item);
      return {
        title: toStringOrNull(record.title),
        intro: toStringOrNull(record.intro),
        siteTitle: toStringOrNull(record.urltitle ?? record.siteTitle),
        siteUrl: toStringOrNull(record.url ?? record.siteUrl),
        fullUrl: toStringOrNull(record.fullurl ?? record.fullUrl),
        companyName: toStringOrNull(record.companyname ?? record.companyName),
        baiduPcWeight: toStringOrNull(record.baidupcweight ?? record.baiduPcWeight),
        bidCount: toNumber(record.bidCount ?? record.bid_count),
        lastSeenAt: toStringOrNull(record.join_date ?? record.lastSeenAt),
        firstSeenAt: toStringOrNull(record.firstfindtime ?? record.firstSeenAt),
      };
    }),
    pagination,
  };
}

export function normalizeSiteWeightResponse(raw: unknown): SiteWeightData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.result);

  return {
    weights: list.map((item) => {
      const record = asRecord(item);
      const type = toStringOrNull(record.type);
      const weight = toStringOrNull(record.weight);

      if (type || weight) {
        return { type, weight };
      }

      const [entryType, entryWeight] = Object.entries(record)[0] ?? [];
      return {
        type: toStringOrNull(entryType),
        weight: toStringOrNull(entryWeight),
      };
    }),
  };
}

export function normalizeRankSnapshotResponse(raw: unknown): RankSnapshotData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.keywordmonitor).length > 0 ? asArray(data.keywordmonitor) : asArray(data.list);

  return {
    rankings: list.map((item) => {
      const record = asRecord(item);
      const ranks = asArray(record.ranks);

      return {
        keyword: toStringOrNull(record.keyword ?? record.word),
        searchEngine: toStringOrNull(record.search_engine ?? record.searchEngine),
        ip: toStringOrNull(record.ip),
        area: toStringOrNull(record.area),
        network: toStringOrNull(record.network),
        ranks: ranks.map((rankItem) => normalizeRankResultItem(rankItem)),
      };
    }),
  };
}

export function normalizeTopSiteSnapshotsResponse(raw: unknown): TopSiteSnapshotsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = firstArray(data, ["keyword_monitor", "keywordMonitor", "keywordmonitor", "list"]);

  return {
    siteSnapshots: list.map((item) => {
      const record = asRecord(item);
      return {
        keyword: toStringOrNull(record.keyword ?? record.word),
        searchEngine: toStringOrNull(record.search_engine ?? record.searchEngine),
        ip: toStringOrNull(record.ip),
        area: toStringOrNull(record.area),
        network: toStringOrNull(record.network),
        checkedAt: toStringOrNull(record.time ?? record.checkedAt),
        ranks: asArray(record.ranks).map((rankItem) => normalizeRankResultItem(rankItem)),
      };
    }),
  };
}

export function normalizeUrlIndexingResponse(raw: unknown): UrlIndexingData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.include_result).length > 0
    ? asArray(data.include_result)
    : asArray(data.list);

  return {
    items: list.map((item) => {
      const record = asRecord(item);
      return {
        url: toStringOrNull(record.url),
        status: toNumber(record.status ?? record.include_status),
        title: toStringOrNull(record.title),
        snapshotTime: toStringOrNull(record.time ?? record.snapshot_time ?? record.snapshotTime),
      };
    }),
    total: toNumber(data.total ?? root.total),
    checkStatus: toNumber(data.check_status ?? data.checkStatus),
    submitTime: toStringOrNull(data.submit_time ?? data.submitTime),
    finishedTime: toStringOrNull(data.finished_time ?? data.finishedTime),
  };
}