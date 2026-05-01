/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkUrlIndexing5118Handler } from "../src/tools/checkUrlIndexing5118.js";
import { getMobileRankSnapshot5118Handler } from "../src/tools/getMobileRankSnapshot5118.js";
import { ToolError } from "../src/lib/errorMapper.js";
import { resetHttp5118ClientRuntimeForTests } from "../src/lib/http5118Client.js";
import { getKeywordMetrics5118Handler } from "../src/tools/getKeywordMetrics5118.js";
import { getMobileTrafficKeywords5118Handler } from "../src/tools/getMobileTrafficKeywords5118.js";
import { getPcRankSnapshot5118Handler } from "../src/tools/getPcRankSnapshot5118.js";
import {
  assertEnvelopeMatchesOutputSchema,
  jsonResponse,
  readFixture,
} from "./testUtils.js";

const ENV_SNAPSHOT = { ...process.env };

function applyTestApiEnv(): void {
  process.env.API_5118_KW_PARAM_V2 = "k-kw-param";
  process.env.API_5118_TRAFFIC = "k-traffic";
  process.env.API_5118_RANK_PC = "k-rank-pc";
  process.env.API_5118_RANK_MOBILE = "k-rank-mobile";
  process.env.API_5118_INCLUDE = "k-include";
  process.env.MCP_5118_MIN_TIME_MS = "0";
  process.env.MCP_5118_MAX_CONCURRENT = "5";
  process.env.MCP_5118_RESERVOIR = "1000";
  process.env.MCP_5118_MAX_RETRIES = "0";
  process.env.MCP_5118_BASE_BACKOFF_MS = "0";
  process.env.MCP_5118_MAX_BACKOFF_MS = "0";
  process.env.MCP_5118_JITTER_MS = "0";
}

describe("async tools", () => {
  beforeEach(() => {
    applyTestApiEnv();
    resetHttp5118ClientRuntimeForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ENV_SNAPSHOT };
    resetHttp5118ClientRuntimeForTests();
  });

  it("returns pending for keyword metrics submit", async () => {
    const submitFixture = await readFixture<Record<string, unknown>>(
      "keyword-metrics.submit.json",
    );

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(submitFixture)));

    const result = await getKeywordMetrics5118Handler({
      keywords: ["比特币价格"],
      executionMode: "submit",
    });

    expect(result.executionStatus).toBe("pending");
    expect(result.taskId).toBe(40724567);
    assertEnvelopeMatchesOutputSchema("get_keyword_metrics_5118", result);
  });

  it("treats submit success with taskid as pending when data is not ready", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          errcode: "0",
          errmsg: "",
          data: {
            taskid: 40724567,
          },
        }),
      ),
    );

    const result = await getKeywordMetrics5118Handler({
      keywords: ["NBA"],
      executionMode: "submit",
    });

    expect(result.executionStatus).toBe("pending");
    expect(result.taskId).toBe(40724567);
    expect(result.data).toBeNull();
    assertEnvelopeMatchesOutputSchema("get_keyword_metrics_5118", result);
  });

  it("completes keyword metrics in wait mode", async () => {
    const pendingFixture = await readFixture<Record<string, unknown>>(
      "keyword-metrics.pending.json",
    );
    const successFixture = await readFixture<Record<string, unknown>>(
      "keyword-metrics.success.json",
    );

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(pendingFixture))
      .mockResolvedValueOnce(jsonResponse(successFixture));

    vi.stubGlobal("fetch", fetchMock);

    const result = await getKeywordMetrics5118Handler({
      keywords: ["比特币价格"],
      executionMode: "wait",
      maxWaitSeconds: 1,
      pollIntervalSeconds: 0.001,
    });

    expect(result.executionStatus).toBe("completed");
    expect(result.data?.items[0]?.keyword).toBe("比特币价格");
    assertEnvelopeMatchesOutputSchema("get_keyword_metrics_5118", result);
  });

  it("exposes detailed metrics and traffic fields in normalized data", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            errcode: "101",
            errmsg: "processing",
            taskid: 40724567,
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            errcode: "0",
            errmsg: "success",
            data: {
              taskid: 40724567,
              keyword_param: [
                {
                  keyword: "%E6%B0%94%E7%9B%B8%E8%89%B2%E8%B0%B1%E4%BB%AA",
                  index: 330,
                  mobile_index: 212,
                  haosou_index: 351,
                  bidword_kwc: 1,
                  bidword_pcpv: 258,
                  bidword_wisepv: 372,
                  long_keyword_count: 48718,
                  bidword_price: 9.3,
                  bidword_company_count: 276,
                  toutiao_index: 14,
                  douyin_index: 564,
                  bidword_recommendprice_min: 0,
                  bidword_recommendprice_max: 10.16,
                  age_best: "20-29",
                  age_best_value: 54.99,
                  sex_male: 48.71,
                  sex_female: 51.29,
                  bidword_showreasons: "%E9%AB%98%E9%A2%91%E7%83%AD%E6%90%9C%E8%AF%8D",
                  bidword_recommend_price_avg: 4.54,
                  google_index: 0,
                  kuaishou_index: 0,
                  weibo_index: 0,
                },
              ],
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse({
            errcode: "0",
            errmsg: "success",
            taskid: 50724567,
            total: 1,
            page_count: 1,
            page_index: 1,
            page_size: 20,
            data: [
              {
                word: "%E6%AF%94%E7%89%B9%E5%B8%81%E8%A1%8C%E6%83%85",
                weight: "85",
                mobile_index: "230",
                bidword_wisepv: "340",
              },
            ],
          }),
        ),
    );

    const metricsResult = await getKeywordMetrics5118Handler({
      keywords: ["气相色谱仪"],
      executionMode: "wait",
      maxWaitSeconds: 1,
      pollIntervalSeconds: 0.001,
    });

    expect(metricsResult.data?.items[0]).toMatchObject({
      keyword: "气相色谱仪",
      haosouIndex: 351,
      douyinIndex: 564,
      toutiaoIndex: 14,
      pcSearchVolume: 258,
      mobileSearchVolume: 372,
      recommendedBidMin: 0,
      recommendedBidMax: 10.16,
      recommendedBidAvg: 4.54,
      ageBest: "20-29",
      ageBestValue: 54.99,
      sexMale: 48.71,
      sexFemale: 51.29,
      bidReason: "高频热搜词",
    });
    assertEnvelopeMatchesOutputSchema("get_keyword_metrics_5118", metricsResult);

    const trafficResult = await getMobileTrafficKeywords5118Handler({
      keyword: "比特币",
      executionMode: "poll",
      taskId: 50724567,
      pageIndex: 1,
      pageSize: 20,
    });

    expect(trafficResult.data?.keywords[0]).toMatchObject({
      keyword: "比特币行情",
      weight: 85,
      mobileIndex: 230,
      mobileSearchVolume: 340,
    });
    assertEnvelopeMatchesOutputSchema("get_mobile_traffic_keywords_5118", trafficResult);
  });

  it("requires keyword when traffic tool is polled", async () => {
    await expect(
      getMobileTrafficKeywords5118Handler({
        executionMode: "poll",
        taskId: 1,
      }),
    ).rejects.toBeInstanceOf(ToolError);
  });

  it("supports traffic submit pending", async () => {
    const submitFixture = await readFixture<Record<string, unknown>>("traffic.submit.json");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(submitFixture)));

    const result = await getMobileTrafficKeywords5118Handler({
      keyword: "比特币",
      executionMode: "submit",
    });

    expect(result.executionStatus).toBe("pending");
    expect(result.taskId).toBe(50724567);
    assertEnvelopeMatchesOutputSchema("get_mobile_traffic_keywords_5118", result);
  });

  it("enforces traffic page size limit", async () => {
    await expect(
      getMobileTrafficKeywords5118Handler({
        keyword: "比特币",
        executionMode: "submit",
        pageSize: 501,
      }),
    ).rejects.toBeInstanceOf(ToolError);
  });

  it("returns pending for PC rank snapshot submit", async () => {
    const submitFixture = await readFixture<Record<string, unknown>>("rank-pc.submit.json");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(submitFixture)));

    const result = await getPcRankSnapshot5118Handler({
      url: "example.com",
      keywords: ["SEO优化"],
      executionMode: "submit",
    });

    expect(result.executionStatus).toBe("pending");
    expect(result.taskId).toBe(123456);
    assertEnvelopeMatchesOutputSchema("get_pc_rank_snapshot_5118", result);
  });

  it("completes PC and mobile rank snapshots", async () => {
    const submitFixture = await readFixture<Record<string, unknown>>("rank-pc.submit.json");
    const successFixture = await readFixture<Record<string, unknown>>("rank-pc.success.json");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(submitFixture))
        .mockResolvedValueOnce(jsonResponse(successFixture))
        .mockResolvedValueOnce(
          jsonResponse({
            errcode: "0",
            errmsg: "",
            data: {
              taskid: 123457,
              keywordmonitor: [
                {
                  keyword: "SEO优化",
                  search_engine: "baidumobile",
                  ip: "1.2.3.5",
                  area: "广东",
                  network: "联通",
                  ranks: [
                    {
                      site_url: "m.example.com",
                      rank: 2,
                      page_title: "移动SEO优化教程",
                      page_url: "https://m.example.com/seo",
                      top100: 4200,
                      site_weight: "5"
                    }
                  ]
                }
              ]
            }
          }),
        ),
    );

    const pcResult = await getPcRankSnapshot5118Handler({
      url: "example.com",
      keywords: ["SEO优化"],
      executionMode: "wait",
      maxWaitSeconds: 1,
      pollIntervalSeconds: 0.001,
    });

    expect(pcResult.executionStatus).toBe("completed");
    expect(pcResult.data?.rankings[0]).toMatchObject({
      keyword: "SEO优化",
      searchEngine: "baidupc",
      area: "广东",
      network: "电信",
    });
    expect(pcResult.data?.rankings[0]?.ranks[0]).toMatchObject({
      siteUrl: "www.example.com",
      rank: 1,
      top100: 5200,
      siteWeight: "6",
    });
    assertEnvelopeMatchesOutputSchema("get_pc_rank_snapshot_5118", pcResult);

    const mobileResult = await getMobileRankSnapshot5118Handler({
      taskId: 123457,
      executionMode: "poll",
    });

    expect(mobileResult.executionStatus).toBe("completed");
    expect(mobileResult.data?.rankings[0]).toMatchObject({
      searchEngine: "baidumobile",
      ip: "1.2.3.5",
      network: "联通",
    });
    expect(mobileResult.data?.rankings[0]?.ranks[0]).toMatchObject({
      siteUrl: "m.example.com",
      rank: 2,
      siteWeight: "5",
    });
    assertEnvelopeMatchesOutputSchema("get_mobile_rank_snapshot_5118", mobileResult);
  });

  it("supports URL indexing submit pending and wait completion", async () => {
    const submitFixture = await readFixture<Record<string, unknown>>("include.submit.json");
    const successFixture = await readFixture<Record<string, unknown>>("include.success.json");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(submitFixture))
        .mockResolvedValueOnce(jsonResponse(submitFixture))
        .mockResolvedValueOnce(jsonResponse(successFixture)),
    );

    const submitResult = await checkUrlIndexing5118Handler({
      urls: ["https://www.example.com/page1", "https://www.example.com/page2"],
      executionMode: "submit",
    });

    expect(submitResult.executionStatus).toBe("pending");
    expect(submitResult.taskId).toBe(223344);
    assertEnvelopeMatchesOutputSchema("check_url_indexing_5118", submitResult);

    const waitResult = await checkUrlIndexing5118Handler({
      urls: ["https://www.example.com/page1", "https://www.example.com/page2"],
      executionMode: "wait",
      maxWaitSeconds: 1,
      pollIntervalSeconds: 0.001,
    });

    expect(waitResult.executionStatus).toBe("completed");
    expect(waitResult.data).toMatchObject({
      total: 2,
      checkStatus: 1,
      submitTime: "1507812930",
      finishedTime: "1507812960",
    });
    expect(waitResult.data?.items[0]).toMatchObject({
      url: "https://www.example.com/page1",
      status: 1,
      title: "Example Page 1",
      snapshotTime: "2017-10-11 03:07:00",
    });
    assertEnvelopeMatchesOutputSchema("check_url_indexing_5118", waitResult);
  });

  it("enforces indexing URL limit and rank snapshot checkRow limit", async () => {
    await expect(
      checkUrlIndexing5118Handler({
        urls: Array.from({ length: 201 }, (_, index) => `https://example.com/${String(index)}`),
        executionMode: "submit",
      }),
    ).rejects.toBeInstanceOf(ToolError);

    await expect(
      getPcRankSnapshot5118Handler({
        url: "example.com",
        keywords: ["SEO优化"],
        checkRow: 51,
        executionMode: "submit",
      }),
    ).rejects.toBeInstanceOf(ToolError);
  });
});
