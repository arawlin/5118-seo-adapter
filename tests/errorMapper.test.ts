import { describe, expect, it } from "vitest";
import {
  getErrcode,
  INVALID_TOOL_OUTPUT_CODE,
  map5118Error,
  mapInternalToolError,
} from "../src/lib/errorMapper.js";

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

  it("maps output schema validation to internal tool error code", () => {
    const error = mapInternalToolError(
      "TOOL_OUTPUT_SCHEMA_VALIDATION_FAILED",
      "validation failed",
      { toolName: "get_bid_keywords_5118" },
    );

    expect(error.code).toBe(INVALID_TOOL_OUTPUT_CODE);
    expect(error.retryable).toBe(false);
    expect(error.details).toEqual({ toolName: "get_bid_keywords_5118" });
  });
});
