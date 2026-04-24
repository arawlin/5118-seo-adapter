import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getIndustryFrequencyWords5118Handler } from "../src/tools/getIndustryFrequencyWords5118.js";
import { getLongtailKeywords5118Handler } from "../src/tools/getLongtailKeywords5118.js";
import { getSuggestTerms5118Handler } from "../src/tools/getSuggestTerms5118.js";
import { ToolError } from "../src/lib/errorMapper.js";
import { jsonResponse, readFixture } from "./testUtils.js";

const ENV_SNAPSHOT = { ...process.env };

function applyTestApiEnv(): void {
  process.env.API_KEY = "k-wave-one";
}

describe("sync tools", () => {
  beforeEach(() => {
    applyTestApiEnv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ENV_SNAPSHOT };
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
  });
});
