/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBidKeywords5118Handler } from "../src/tools/getBidKeywords5118.js";
import { getDomainRankKeywords5118Handler } from "../src/tools/getDomainRankKeywords5118.js";
import { getIndustryFrequencyWords5118Handler } from "../src/tools/getIndustryFrequencyWords5118.js";
import { getLongtailKeywords5118Handler } from "../src/tools/getLongtailKeywords5118.js";
import { getSiteWeight5118Handler } from "../src/tools/getSiteWeight5118.js";
import { getSuggestTerms5118Handler } from "../src/tools/getSuggestTerms5118.js";
import { ToolError } from "../src/lib/errorMapper.js";
import { resetHttp5118ClientRuntimeForTests } from "../src/lib/http5118Client.js";
import {
  assertEnvelopeMatchesOutputSchema,
  jsonResponse,
  readFixture,
} from "./testUtils.js";

const ENV_SNAPSHOT = { ...process.env };

function applyTestApiEnv(): void {
  process.env.API_5118_LONGTAIL_V2 = "k-longtail";
  process.env.API_5118_FREQ_WORDS = "k-freq";
  process.env.API_5118_SUGGEST = "k-suggest";
  process.env.API_5118_DOMAIN_V2 = "k-domain";
  process.env.API_5118_BIDWORD_V2 = "k-bidword";
  process.env.API_5118_WEIGHT = "k-weight";
  process.env.MCP_5118_MIN_TIME_MS = "0";
  process.env.MCP_5118_MAX_CONCURRENT = "5";
  process.env.MCP_5118_RESERVOIR = "1000";
  process.env.MCP_5118_MAX_RETRIES = "0";
  process.env.MCP_5118_BASE_BACKOFF_MS = "0";
  process.env.MCP_5118_MAX_BACKOFF_MS = "0";
  process.env.MCP_5118_JITTER_MS = "0";
}

describe("sync tools", () => {
  beforeEach(() => {
    applyTestApiEnv();
    resetHttp5118ClientRuntimeForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ENV_SNAPSHOT };
    resetHttp5118ClientRuntimeForTests();
  });

  it("returns normalized longtail keywords and keeps raw payload", async () => {
    const fixture = await readFixture<Record<string, unknown>>("longtail.success.json");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(fixture)));

    const result = await getLongtailKeywords5118Handler({
      keyword: "比特币",
      pageIndex: 1,
      pageSize: 20,
    });

    expect(result.executionStatus).toBe("completed");
    expect(result.pagination?.total).toBe(1);
    expect(result.data?.keywords[0]?.keyword).toBe("比特币是什么");
    expect(result.raw).toEqual(fixture);
    assertEnvelopeMatchesOutputSchema("get_longtail_keywords_5118", result);
  });

  it("exposes detailed longtail and suggest fields in normalized data", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            errcode: "0",
            errmsg: "",
            data: {
              word: [
                {
                  keyword: "%E8%A1%AC%E8%A1%AB",
                  index: "1063",
                  mobile_index: "919",
                  haosou_index: "1163",
                  douyin_index: "89",
                  toutiao_index: "256",
                  long_keyword_count: "6045520",
                  bidword_company_count: "185",
                  page_url: "https%3A%2F%2Fexample.com%2Fshirt",
                  bidword_kwc: "1",
                  bidword_pcpv: "240",
                  bidword_wisepv: "1433",
                  sem_reason: "%E9%AB%98%E9%A2%91%E8%AF%8D",
                  sem_price: "0.35~4.57",
                  sem_recommend_price_avg: "3.25",
                  google_index: "12100",
                  kuaishou_index: "580",
                  weibo_index: "320",
                },
              ],
              page_index: 1,
              page_size: 20,
              page_count: 1,
              total: 1,
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            errcode: "0",
            errmsg: "",
            data: [
              {
                word: "%E5%9B%BD%E5%BA%86%E5%81%87%E6%9C%9F",
                promote_word: "%E5%9B%BD%E5%BA%86%E5%81%87%E6%9C%9F%E5%8E%BB%E5%93%AA%E7%8E%A9",
                platform: "zhihu",
                add_time: "2022-09-24T11:28:10.027",
              },
            ],
          }),
        ),
    );

    const longtailResult = await getLongtailKeywords5118Handler({
      keyword: "衬衫",
      pageIndex: 1,
      pageSize: 20,
    });

    expect(longtailResult.data?.keywords[0]).toMatchObject({
      keyword: "衬衫",
      haosouIndex: 1163,
      douyinIndex: 89,
      toutiaoIndex: 256,
      pageUrl: "https://example.com/shirt",
      competition: 1,
      pcSearchVolume: 240,
      mobileSearchVolume: 1433,
      semReason: "高频词",
      semPrice: "0.35~4.57",
      semRecommendPriceAvg: 3.25,
      googleIndex: 12100,
      kuaishouIndex: 580,
      weiboIndex: 320,
    });
    assertEnvelopeMatchesOutputSchema("get_longtail_keywords_5118", longtailResult);

    const suggestResult = await getSuggestTerms5118Handler({
      word: "国庆",
      platform: "zhihu",
    });

    expect(suggestResult.data?.suggestions[0]).toMatchObject({
      term: "国庆假期去哪玩",
      sourceWord: "国庆假期",
      promotedTerm: "国庆假期去哪玩",
      platform: "zhihu",
      addTime: "2022-09-24T11:28:10.027",
    });
    assertEnvelopeMatchesOutputSchema("get_suggest_terms_5118", suggestResult);
  });

  it("rejects longtail page size over the limit", async () => {
    await expect(
      getLongtailKeywords5118Handler({
        keyword: "比特币",
        pageSize: 101,
      }),
    ).rejects.toBeInstanceOf(ToolError);
  });

  it("returns normalized frequency words", async () => {
    const fixture = await readFixture<Record<string, unknown>>("frequency.success.json");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(fixture)));

    const result = await getIndustryFrequencyWords5118Handler({ keyword: "比特币" });
    expect(result.data?.frequencyWords.length).toBe(2);
    expect(result.data?.frequencyWords[0]?.word).toBe("比特币");
    assertEnvelopeMatchesOutputSchema("get_industry_frequency_words_5118", result);
  });

  it("returns normalized suggest terms", async () => {
    const fixture = await readFixture<Record<string, unknown>>("suggest.success.json");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(fixture)));

    const result = await getSuggestTerms5118Handler({
      word: "比特币",
      platform: "baidu",
    });

    expect(result.data?.suggestions.length).toBe(2);
    expect(result.data?.suggestions[0]?.term).toBe("比特币价格");
    assertEnvelopeMatchesOutputSchema("get_suggest_terms_5118", result);
  });

  it("returns normalized domain rank keywords, bid keywords, and site weights", async () => {
    const domainFixture = await readFixture<Record<string, unknown>>("domain-rank.success.json");
    const bidFixture = await readFixture<Record<string, unknown>>("bidword.success.json");
    const weightFixture = await readFixture<Record<string, unknown>>("weight.success.json");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(domainFixture))
        .mockResolvedValueOnce(jsonResponse(bidFixture))
        .mockResolvedValueOnce(jsonResponse(weightFixture)),
    );

    const domainResult = await getDomainRankKeywords5118Handler({
      url: "example.com",
      pageIndex: 1,
    });

    expect(domainResult.executionStatus).toBe("completed");
    expect(domainResult.pagination?.pageSize).toBe(1000);
    expect(domainResult.data?.items[0]).toMatchObject({
      keyword: "水质分析仪表",
      rank: 1,
      index: 1063,
      mobileIndex: 919,
      pageUrl: "https://example.com/page",
      bidCompanyCount: 317,
      recommendedBidAvg: 3.25,
    });
    assertEnvelopeMatchesOutputSchema("get_domain_rank_keywords_5118", domainResult);

    const bidResult = await getBidKeywords5118Handler({
      url: "example.com",
      pageIndex: 1,
      pageSize: 20,
    });

    expect(bidResult.data?.items[0]).toMatchObject({
      keyword: "SEO优化",
      title: "竞价标题",
      intro: "竞价文案",
      semPrice: "5.60",
      pcSearchVolume: 384,
      mobileSearchVolume: 115,
      recentBidCompanyCount: 15,
      totalBidCompanyCount: 45,
      recommendedBidAvg: 4.65,
    });
    assertEnvelopeMatchesOutputSchema("get_bid_keywords_5118", bidResult);

    const weightResult = await getSiteWeight5118Handler({ url: "example.com" });

    expect(weightResult.data?.weights).toEqual([
      { type: "BaiduPCWeight", weight: "10+" },
      { type: "BaiduMobileWeight", weight: "5-" },
      { type: "SMWeight", weight: "8+" },
    ]);
    assertEnvelopeMatchesOutputSchema("get_site_weight_5118", weightResult);
  });

  it("rejects bid keyword page size over the limit", async () => {
    await expect(
      getBidKeywords5118Handler({
        url: "example.com",
        pageSize: 501,
      }),
    ).rejects.toBeInstanceOf(ToolError);
  });
});
