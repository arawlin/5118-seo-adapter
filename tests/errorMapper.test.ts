import { describe, expect, it } from "vitest";
import { getErrcode, map5118Error } from "../src/lib/errorMapper.js";

describe("errorMapper", () => {
  it("maps missing key errors", () => {
    const error = map5118Error("100202", "missing key");
    expect(error.code).toBe("MISSING_API_KEY");
    expect(error.retryable).toBe(false);
  });

  it("marks per-second rate limit as retryable", () => {
    const error = map5118Error("100102", "rate limited");
    expect(error.code).toBe("RATE_LIMIT_PER_SECOND");
    expect(error.retryable).toBe(true);
  });

  it("extracts errcode safely", () => {
    expect(getErrcode({ errcode: "0" })).toBe("0");
    expect(getErrcode({})).toBeUndefined();
  });
});
