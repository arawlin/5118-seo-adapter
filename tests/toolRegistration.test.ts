import { describe, expect, it } from "vitest";
import { z } from "zod";
import { INVALID_TOOL_OUTPUT_CODE, ToolError } from "../src/lib/errorMapper.js";
import {
  createToolResult,
  TOOL_OUTPUT_VALIDATION_ERROR_CODE,
} from "../src/tools/toolRegistration.js";

const TOOL_NAME = "get_bid_keywords_5118";

const OUTPUT_SCHEMA = {
  tool: z.string(),
  mode: z.enum(["sync", "async"]),
  data: z.object({
    items: z.array(
      z.object({
        keyword: z.string(),
      }),
    ),
  }),
};

describe("toolRegistration createToolResult", () => {
  it("returns text content and structured content for valid payload", () => {
    const payload = {
      tool: "get_bid_keywords_5118",
      mode: "sync",
      data: { items: [{ keyword: "seo" }] },
    };

    const result = createToolResult(TOOL_NAME, OUTPUT_SCHEMA, payload);

    expect(result.structuredContent).toEqual(payload);
    expect(result.content).toEqual([{ type: "text", text: JSON.stringify(payload) }]);
  });

  it("throws mapped ToolError for invalid payload", () => {
    const payload = {
      tool: "get_bid_keywords_5118",
      mode: "sync",
      data: { items: [{ keyword: 1 }] },
    };

    let caught: unknown;

    try {
      createToolResult(TOOL_NAME, OUTPUT_SCHEMA, payload);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(ToolError);

    const toolError = caught as ToolError;
    expect(toolError.code).toBe(INVALID_TOOL_OUTPUT_CODE);
    expect(toolError.message).toContain(`[${TOOL_OUTPUT_VALIDATION_ERROR_CODE}]`);

    const details = toolError.details as Record<string, unknown>;
    expect(details.toolName).toBe(TOOL_NAME);
    expect(details.issueCount).toBeGreaterThanOrEqual(1);

    const issues = details.issues as Array<{ path: string }>;
    expect(issues[0]?.path).toContain("data.items[0].keyword");
  });
});