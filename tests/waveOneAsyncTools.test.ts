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
