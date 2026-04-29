/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../src/lib/errorMapper.js";
import { getBidSites5118Handler } from "../src/tools/getBidSites5118.js";
import { getMobileSiteRankKeywords5118Handler } from "../src/tools/getMobileSiteRankKeywords5118.js";
import { getPcSiteRankKeywords5118Handler } from "../src/tools/getPcSiteRankKeywords5118.js";
import { jsonResponse, readFixture } from "./testUtils.js";

const ENV_SNAPSHOT = { ...process.env };

function applyTestApiEnv(): void {
  process.env.API_5118_BAIDUPC_V2 = "k-baidupc-v2";
  process.env.API_5118_MOBILE_V2 = "k-mobile-v2";
  process.env.API_5118_BIDSITE = "k-bidsite";
}

describe("wave 2 sync tools", () => {
  beforeEach(() => {
    applyTestApiEnv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ENV_SNAPSHOT };
  });

  it("returns normalized PC and mobile site rank keywords plus bid sites", async () => {
    const pcFixture = await readFixture<Record<string, unknown>>("wave-two/pc-site-rank.success.json");
    const mobileFixture = await readFixture<Record<string, unknown>>("wave-two/mobile-site-rank.success.json");
    const bidSiteFixture = await readFixture<Record<string, unknown>>("wave-two/bidsite.success.json");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(pcFixture))
        .mockResolvedValueOnce(jsonResponse(mobileFixture))
        .mockResolvedValueOnce(jsonResponse(bidSiteFixture)),
    );

    const pcResult = await getPcSiteRankKeywords5118Handler({
      url: "example.com",
      pageIndex: 1,
    });

    expect(pcResult.executionStatus).toBe("completed");
    expect(pcResult.pagination?.pageSize).toBe(500);
    expect(pcResult.data?.items[0]).toMatchObject({
      keyword: "水质分析仪表",
      rank: 1,
      pageTitle: "示例标题",
      pageUrl: "https://www.example.com/page",
      bidCompanyCount: 317,
      longKeywordCount: 696,
      douyinIndex: 89,
      toutiaoIndex: 256,
      semPrice: "0.35~4.57",
      recommendedBidAvg: 3.25,
    });

    const mobileResult = await getMobileSiteRankKeywords5118Handler({
      url: "m.example.com",
      pageIndex: 1,
    });

    expect(mobileResult.executionStatus).toBe("completed");
    expect(mobileResult.data?.items[0]).toMatchObject({
      keyword: "黄浦江源安吉白茶",
      rank: 3,
      pageTitle: "黄浦江源安吉白茶价格报价行情-京东",
      pageUrl: "https://m.example.com/page",
      bidCompanyCount: 84,
      longKeywordCount: 155,
      mobileIndex: 919,
      googleIndex: 12100,
    });

    const bidSiteResult = await getBidSites5118Handler({
      keyword: "SEO优化",
      pageIndex: 1,
      pageSize: 20,
    });

    expect(bidSiteResult.executionStatus).toBe("completed");
    expect(bidSiteResult.data?.items[0]).toMatchObject({
      title: "数据仪表,商业智能BI软件",
      intro: "竞价文案",
      siteTitle: "网站标题",
      siteUrl: "sem.example.com",
      fullUrl: "https://sem.example.com/landing",
      companyName: "示例科技有限公司",
      baiduPcWeight: "2",
      bidCount: 14,
      lastSeenAt: "2023-11-23T22:04:00",
      firstSeenAt: "2020-12-22T22:03:00",
    });
  });

  it("enforces sync wave 2 input limits", async () => {
    await expect(
      getBidSites5118Handler({
        keyword: "SEO优化",
        pageSize: 501,
      }),
    ).rejects.toBeInstanceOf(ToolError);

    await expect(
      getPcSiteRankKeywords5118Handler({
        url: "example.com",
        pageIndex: 0,
      }),
    ).rejects.toBeInstanceOf(ToolError);
  });
});