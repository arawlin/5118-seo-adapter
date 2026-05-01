import { describe, expect, it } from "vitest";
import type { RequestControlConfig } from "../src/config/requestControl.js";
import { ToolError } from "../src/lib/errorMapper.js";
import { createRequestController } from "../src/lib/requestController.js";

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createConfig(overrides: Partial<RequestControlConfig> = {}): RequestControlConfig {
  return {
    minTimeMs: 0,
    maxConcurrent: 1,
    reservoir: 100,
    reservoirRefreshAmount: 100,
    reservoirRefreshIntervalMs: 1000,
    maxRetries: 0,
    baseBackoffMs: 0,
    maxBackoffMs: 0,
    jitterMs: 0,
    ...overrides,
  };
}

describe("requestController", () => {
  it("builds limiter key without exposing raw api key", () => {
    const controller = createRequestController(createConfig());
    const limiterKey = controller.buildLimiterKey("/suggest/list", "secret-api-key-value");

    expect(limiterKey).toContain("/suggest/list:");
    expect(limiterKey).not.toContain("secret-api-key-value");
    expect(limiterKey.split(":")[1]).toHaveLength(12);
  });

  it("serializes jobs for the same endpoint and api key", async () => {
    const controller = createRequestController(createConfig({ maxConcurrent: 1 }));
    const timeline: string[] = [];

    const first = controller.scheduleWithControl({
      endpoint: "/suggest/list",
      apiKey: "k-suggest",
      run: async () => {
        timeline.push("first-start");
        await sleepMs(20);
        timeline.push("first-end");
        return "first";
      },
    });

    const second = controller.scheduleWithControl({
      endpoint: "/suggest/list",
      apiKey: "k-suggest",
      run: async () => {
        timeline.push("second-start");
        timeline.push("second-end");
        return "second";
      },
    });

    await Promise.all([first, second]);

    expect(timeline).toEqual([
      "first-start",
      "first-end",
      "second-start",
      "second-end",
    ]);
  });

  it("retries retryable tool errors until success", async () => {
    const controller = createRequestController(createConfig());
    let attempts = 0;

    const result = await controller.executeWithRetry({
      maxRetries: 2,
      baseBackoffMs: 0,
      maxBackoffMs: 0,
      jitterMs: 0,
      operation: async () => {
        attempts += 1;

        if (attempts < 3) {
          throw new ToolError("RATE_LIMIT_PER_SECOND", "rate limited", true);
        }

        return "ok";
      },
    });

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
  });

  it("does not retry non-retryable errors", async () => {
    const controller = createRequestController(createConfig());
    let attempts = 0;

    await expect(
      controller.executeWithRetry({
        maxRetries: 3,
        baseBackoffMs: 0,
        maxBackoffMs: 0,
        jitterMs: 0,
        operation: async () => {
          attempts += 1;
          throw new ToolError("RATE_LIMIT_PER_HOUR", "hour limit", false);
        },
      }),
    ).rejects.toBeInstanceOf(ToolError);

    expect(attempts).toBe(1);
  });
});
