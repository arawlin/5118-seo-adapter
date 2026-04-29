import { describe, expect, it } from "vitest";
import {
  TOOL_INPUT_SCHEMAS,
  validateToolInput,
} from "../src/types/toolInputSchemas.js";

const VALID_INPUT_FIXTURES: {
  [K in keyof typeof TOOL_INPUT_SCHEMAS]: Record<string, unknown>;
} = {
  get_longtail_keywords_5118: { keyword: "seo" },
  get_industry_frequency_words_5118: { keyword: "marketing" },
  get_suggest_terms_5118: { word: "seo", platform: "baidu" },
  get_keyword_metrics_5118: { keywords: ["seo"] },
  get_mobile_traffic_keywords_5118: { keyword: "seo" },
  get_domain_rank_keywords_5118: { url: "example.com" },
  get_bid_keywords_5118: { url: "example.com" },
  get_site_weight_5118: { url: "example.com" },
  get_pc_rank_snapshot_5118: { url: "example.com", keywords: ["seo"] },
  get_mobile_rank_snapshot_5118: { url: "example.com", keywords: ["seo"] },
  check_url_indexing_5118: { urls: ["https://example.com"] },
  get_pc_site_rank_keywords_5118: { url: "example.com" },
  get_mobile_site_rank_keywords_5118: { url: "example.com" },
  get_bid_sites_5118: { keyword: "seo" },
  get_pc_top50_sites_5118: { keywords: ["seo"] },
  get_mobile_top50_sites_5118: { keywords: ["seo"] },
};

describe("tool input schemas", () => {
  it("accepts canonical valid fixtures for every tool", () => {
    const entries = Object.entries(VALID_INPUT_FIXTURES) as Array<
      [keyof typeof TOOL_INPUT_SCHEMAS, Record<string, unknown>]
    >;

    for (const [toolName, payload] of entries) {
      const parsed = validateToolInput(toolName, payload);
      expect(parsed.success, toolName).toBe(true);
    }
  });

  it("rejects unsupported suggest platform values", () => {
    const parsed = validateToolInput("get_suggest_terms_5118", {
      word: "seo",
      platform: "google",
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects invalid pagination constraints", () => {
    const parsed = validateToolInput("get_longtail_keywords_5118", {
      keyword: "seo",
      pageIndex: 0,
    });

    expect(parsed.success).toBe(false);
  });
});
