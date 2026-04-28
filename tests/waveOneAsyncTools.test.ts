import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../src/lib/errorMapper.js";
import { getKeywordMetrics5118Handler } from "../src/tools/getKeywordMetrics5118.js";
import { getMobileTrafficKeywords5118Handler } from "../src/tools/getMobileTrafficKeywords5118.js";
import { jsonResponse, readFixture } from "./testUtils.js";

const ENV_SNAPSHOT = { ...process.env };

function applyTestApiEnv(): void {
  process.env.API_5118_KW_PARAM_V2 = "k-kw-param";
  process.env.API_5118_TRAFFIC = "k-traffic";
}

describe("async tools", () => {
  beforeEach(() => {
    applyTestApiEnv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ENV_SNAPSHOT };
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
            data: {
              list: [
                {
                  word: "%E6%AF%94%E7%89%B9%E5%B8%81%E8%A1%8C%E6%83%85",
                  weight: "85",
                  mobile_index: "230",
                  bidword_wisepv: "340",
                  rank: "3",
                  url: "https%3A%2F%2Fexample.com%2Fbtc",
                },
              ],
              page_index: 1,
              page_size: 20,
              page_count: 1,
              total: 1,
            },
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
      rank: 3,
      url: "https://example.com/btc",
    });
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
});
