/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../src/lib/errorMapper.js";
import {
  postForm,
  resetHttp5118ClientRuntimeForTests,
} from "../src/lib/http5118Client.js";
import { jsonResponse } from "./testUtils.js";

const ENV_SNAPSHOT = { ...process.env };

function applyRequestControlTestEnv(): void {
  process.env.MCP_5118_MIN_TIME_MS = "0";
  process.env.MCP_5118_MAX_CONCURRENT = "5";
  process.env.MCP_5118_RESERVOIR = "1000";
  process.env.MCP_5118_MAX_RETRIES = "2";
  process.env.MCP_5118_BASE_BACKOFF_MS = "0";
  process.env.MCP_5118_MAX_BACKOFF_MS = "0";
  process.env.MCP_5118_JITTER_MS = "0";
}

describe("http5118Client request control", () => {
  beforeEach(() => {
    applyRequestControlTestEnv();
    resetHttp5118ClientRuntimeForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = { ...ENV_SNAPSHOT };
    resetHttp5118ClientRuntimeForTests();
  });

  it("retries vendor per-second limit and succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ errcode: "100102", errmsg: "rate" }))
      .mockResolvedValueOnce(jsonResponse({ errcode: "0", errmsg: "", data: { ok: true } }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await postForm("/suggest/list", "k-suggest", {
      word: "比特币",
      platform: "baidu",
    });

    expect((result as Record<string, unknown>).errcode).toBe("0");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable vendor hour-limit payload", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ errcode: "100103", errmsg: "hour limit" }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await postForm("/suggest/list", "k-suggest", {
      word: "比特币",
      platform: "baidu",
    });

    expect((result as Record<string, unknown>).errcode).toBe("100103");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries retryable HTTP 5xx responses", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("temporary failure", { status: 503 }))
      .mockResolvedValueOnce(jsonResponse({ errcode: "0", errmsg: "", data: { ok: true } }));

    vi.stubGlobal("fetch", fetchMock);

    const result = await postForm("/suggest/list", "k-suggest", {
      word: "比特币",
      platform: "baidu",
    });

    expect((result as Record<string, unknown>).errcode).toBe("0");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry HTTP 4xx and keeps api keys out of error fields", async () => {
    const apiKey = "sensitive-api-key-123";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("bad request", { status: 400 }));

    vi.stubGlobal("fetch", fetchMock);

    try {
      await postForm("/suggest/list", apiKey, {
        word: "比特币",
        platform: "baidu",
      });
      throw new Error("Expected postForm to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(ToolError);

      const toolError = error as ToolError;

      expect(toolError.code).toBe("HTTP_ERROR");
      expect(toolError.message.includes(apiKey)).toBe(false);
      expect(JSON.stringify(toolError.details ?? {}).includes(apiKey)).toBe(false);
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
