import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { TOOL_OUTPUT_SCHEMA as CHECK_URL_INDEXING_OUTPUT_SCHEMA } from "../src/tools/checkUrlIndexing5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_BID_KEYWORDS_OUTPUT_SCHEMA } from "../src/tools/getBidKeywords5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_BID_SITES_OUTPUT_SCHEMA } from "../src/tools/getBidSites5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_DOMAIN_RANK_KEYWORDS_OUTPUT_SCHEMA } from "../src/tools/getDomainRankKeywords5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_INDUSTRY_FREQUENCY_WORDS_OUTPUT_SCHEMA } from "../src/tools/getIndustryFrequencyWords5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_KEYWORD_METRICS_OUTPUT_SCHEMA } from "../src/tools/getKeywordMetrics5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_LONGTAIL_KEYWORDS_OUTPUT_SCHEMA } from "../src/tools/getLongtailKeywords5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_MOBILE_RANK_SNAPSHOT_OUTPUT_SCHEMA } from "../src/tools/getMobileRankSnapshot5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_MOBILE_SITE_RANK_KEYWORDS_OUTPUT_SCHEMA } from "../src/tools/getMobileSiteRankKeywords5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_MOBILE_TOP50_SITES_OUTPUT_SCHEMA } from "../src/tools/getMobileTop50Sites5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_MOBILE_TRAFFIC_KEYWORDS_OUTPUT_SCHEMA } from "../src/tools/getMobileTrafficKeywords5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_PC_RANK_SNAPSHOT_OUTPUT_SCHEMA } from "../src/tools/getPcRankSnapshot5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_PC_SITE_RANK_KEYWORDS_OUTPUT_SCHEMA } from "../src/tools/getPcSiteRankKeywords5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_PC_TOP50_SITES_OUTPUT_SCHEMA } from "../src/tools/getPcTop50Sites5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_SITE_WEIGHT_OUTPUT_SCHEMA } from "../src/tools/getSiteWeight5118.js";
import { TOOL_OUTPUT_SCHEMA as GET_SUGGEST_TERMS_OUTPUT_SCHEMA } from "../src/tools/getSuggestTerms5118.js";

const FIXTURE_ROOT = "/Users/axe/work/seo/5118-seo-adapter/tests/fixtures";

const TOOL_OUTPUT_SCHEMAS = {
  get_longtail_keywords_5118: GET_LONGTAIL_KEYWORDS_OUTPUT_SCHEMA,
  get_industry_frequency_words_5118: GET_INDUSTRY_FREQUENCY_WORDS_OUTPUT_SCHEMA,
  get_suggest_terms_5118: GET_SUGGEST_TERMS_OUTPUT_SCHEMA,
  get_keyword_metrics_5118: GET_KEYWORD_METRICS_OUTPUT_SCHEMA,
  get_mobile_traffic_keywords_5118: GET_MOBILE_TRAFFIC_KEYWORDS_OUTPUT_SCHEMA,
  get_domain_rank_keywords_5118: GET_DOMAIN_RANK_KEYWORDS_OUTPUT_SCHEMA,
  get_bid_keywords_5118: GET_BID_KEYWORDS_OUTPUT_SCHEMA,
  get_site_weight_5118: GET_SITE_WEIGHT_OUTPUT_SCHEMA,
  get_pc_rank_snapshot_5118: GET_PC_RANK_SNAPSHOT_OUTPUT_SCHEMA,
  get_mobile_rank_snapshot_5118: GET_MOBILE_RANK_SNAPSHOT_OUTPUT_SCHEMA,
  check_url_indexing_5118: CHECK_URL_INDEXING_OUTPUT_SCHEMA,
  get_pc_site_rank_keywords_5118: GET_PC_SITE_RANK_KEYWORDS_OUTPUT_SCHEMA,
  get_mobile_site_rank_keywords_5118: GET_MOBILE_SITE_RANK_KEYWORDS_OUTPUT_SCHEMA,
  get_bid_sites_5118: GET_BID_SITES_OUTPUT_SCHEMA,
  get_pc_top50_sites_5118: GET_PC_TOP50_SITES_OUTPUT_SCHEMA,
  get_mobile_top50_sites_5118: GET_MOBILE_TOP50_SITES_OUTPUT_SCHEMA,
} as const;

type ToolOutputSchemaName = keyof typeof TOOL_OUTPUT_SCHEMAS;

export async function readFixture<T>(name: string): Promise<T> {
  const relativePath = name.includes("/") ? name : path.join("wave-one", name);
  const filePath = path.join(FIXTURE_ROOT, relativePath);
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as T;
}

export function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  });
}

export function assertEnvelopeMatchesOutputSchema(
  toolName: ToolOutputSchemaName,
  envelope: unknown,
): void {
  const parsed = z.object(TOOL_OUTPUT_SCHEMAS[toolName]).safeParse(envelope);

  if (!parsed.success) {
    const issueSummary = parsed.error.issues
      .slice(0, 5)
      .map((issue) => {
        const issuePath = issue.path.length > 0 ? issue.path.join(".") : "<root>";
        return `${issuePath}: ${issue.message}`;
      })
      .join("; ");

    throw new Error(
      `Output schema mismatch for ${toolName}: ${issueSummary}`,
    );
  }
}
