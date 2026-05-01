/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../src/lib/errorMapper.js";
import { resetHttp5118ClientRuntimeForTests } from "../src/lib/http5118Client.js";
import { getMobileTop50Sites5118Handler } from "../src/tools/getMobileTop50Sites5118.js";
import { getPcTop50Sites5118Handler } from "../src/tools/getPcTop50Sites5118.js";
import {
  assertEnvelopeMatchesOutputSchema,
  jsonResponse,
  readFixture,
} from "./testUtils.js";

const ENV_SNAPSHOT = { ...process.env };

function applyTestApiEnv(): void {
  process.env.API_5118_KWRANK_PC = "k-kwrank-pc";
  process.env.API_5118_KWRANK_MOBILE = "k-kwrank-mobile";
  process.env.MCP_5118_MIN_TIME_MS = "0";
  process.env.MCP_5118_MAX_CONCURRENT = "5";
  process.env.MCP_5118_RESERVOIR = "1000";
  process.env.MCP_5118_MAX_RETRIES = "0";
  process.env.MCP_5118_BASE_BACKOFF_MS = "0";
  process.env.MCP_5118_MAX_BACKOFF_MS = "0";
  process.env.MCP_5118_JITTER_MS = "0";
}

describe("wave 2 async tools", () => {
  beforeEach(() => {
    applyTestApiEnv();
    resetHttp5118ClientRuntimeForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ENV_SNAPSHOT };
    resetHttp5118ClientRuntimeForTests();
  });

  it("returns pending for PC top50 submit", async () => {
    const submitFixture = await readFixture<Record<string, unknown>>("wave-two/top50-pc.submit.json");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(submitFixture)));

    const result = await getPcTop50Sites5118Handler({
      keywords: ["SEO优化"],
      executionMode: "submit",
    });

    expect(result.executionStatus).toBe("pending");
    expect(result.taskId).toBe(223355);
    assertEnvelopeMatchesOutputSchema("get_pc_top50_sites_5118", result);
  });

  it("completes PC and mobile top50 site snapshots", async () => {
    const submitFixture = await readFixture<Record<string, unknown>>("wave-two/top50-pc.submit.json");
    const pcSuccessFixture = await readFixture<Record<string, unknown>>("wave-two/top50-pc.success.json");
    const mobileSuccessFixture = await readFixture<Record<string, unknown>>("wave-two/top50-mobile.success.json");

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(submitFixture))
        .mockResolvedValueOnce(jsonResponse(pcSuccessFixture))
        .mockResolvedValueOnce(jsonResponse(mobileSuccessFixture)),
    );

    const pcResult = await getPcTop50Sites5118Handler({
      keywords: ["SEO优化"],
      executionMode: "wait",
      maxWaitSeconds: 1,
      pollIntervalSeconds: 0.001,
    });

    expect(pcResult.executionStatus).toBe("completed");
    expect(pcResult.data?.siteSnapshots[0]).toMatchObject({
      keyword: "SEO优化",
      searchEngine: "baidupc",
      area: "广东",
      network: "电信",
      checkedAt: "2026-03-18 10:30:00",
    });
    expect(pcResult.data?.siteSnapshots[0]?.ranks[0]).toMatchObject({
      siteUrl: "www.example.com",
      rank: 1,
      pageTitle: "SEO优化教程",
      top100: 5200,
      siteWeight: "6",
    });
    assertEnvelopeMatchesOutputSchema("get_pc_top50_sites_5118", pcResult);

    const mobileResult = await getMobileTop50Sites5118Handler({
      taskId: 223356,
      executionMode: "wait",
      maxWaitSeconds: 1,
      pollIntervalSeconds: 0.001,
    });

    expect(mobileResult.executionStatus).toBe("completed");
    expect(mobileResult.data?.siteSnapshots[0]).toMatchObject({
      keyword: "SEO优化",
      searchEngine: "baidumobile",
      ip: "1.2.3.5",
      checkedAt: "2026-03-18 10:31:00",
    });
    expect(mobileResult.data?.siteSnapshots[0]?.ranks[0]).toMatchObject({
      siteUrl: "m.example.com",
      rank: 2,
      pageUrl: "https://m.example.com/seo",
      siteWeight: "5",
    });
    assertEnvelopeMatchesOutputSchema("get_mobile_top50_sites_5118", mobileResult);
  });

  it("enforces top50 input limits", async () => {
    await expect(
      getPcTop50Sites5118Handler({
        keywords: ["SEO优化"],
        checkRow: 101,
        executionMode: "submit",
      }),
    ).rejects.toBeInstanceOf(ToolError);

    await expect(
      getMobileTop50Sites5118Handler({
        keywords: Array.from({ length: 51 }, (_, index) => `词${String(index)}`),
        executionMode: "submit",
      }),
    ).rejects.toBeInstanceOf(ToolError);
  });
});