import { z } from "zod";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  STRING_OR_NULL_OUTPUT_SCHEMA,
  createToolResult,
  type RegisterTool,
} from "./toolRegistration.js";
import { asArray, asRecord, toStringOrNull } from "./normalizationUtils.js";

export const GET_SITE_WEIGHT_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .describe(
      "Required. Domain or host to look up (e.g. 'www.example.com'). Do not include protocol or path. The lookup returns weights across multiple search engines.",
    ),
} as const;

export const SITE_WEIGHT_ITEM_OUTPUT_SCHEMA = z.object({
  type: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Search-engine label for the weight value. Known values: 'BaiduPCWeight' (Baidu PC), 'BaiduMobileWeight' (Baidu Mobile), 'SMWeight' (Shenma), 'TouTiaoWeight' (Toutiao). null only if 5118 returns an unrecognized shape.",
  ),
  weight: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "5118 weight tier as a string (typically '0'-'10'). String form because the upstream may surface non-numeric tiers; cast to number on the consumer side when needed.",
  ),
});

export const SITE_WEIGHT_DATA_OUTPUT_SCHEMA = z.object({
  weights: z
    .array(SITE_WEIGHT_ITEM_OUTPUT_SCHEMA)
    .describe(
      "One entry per search engine that 5118 tracks. Empty when the domain is unknown to 5118.",
    ),
});

export type SiteWeightItem = z.infer<typeof SITE_WEIGHT_ITEM_OUTPUT_SCHEMA>;
export type SiteWeightData = z.infer<typeof SITE_WEIGHT_DATA_OUTPUT_SCHEMA>;
export type GetSiteWeight5118Item = SiteWeightItem;
export type GetSiteWeight5118Data = SiteWeightData;

export type GetSiteWeight5118Input = z.infer<
  z.ZodObject<typeof GET_SITE_WEIGHT_5118_INPUT_SCHEMA>
>;
export type GetSiteWeightInput = GetSiteWeight5118Input;

const TOOL_NAME = "get_site_weight_5118";
const API_NAME = "Site 5118 Weight API";
const ENDPOINT = "/weight";

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(SITE_WEIGHT_DATA_OUTPUT_SCHEMA);

function normalizeSiteWeightResponse(raw: unknown): SiteWeightData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.result);

  // Vendor spec: each row is a single-key object like { "BaiduPCWeight": "5" }.
  return {
    weights: list.map((item) => {
      const record = asRecord(item);
      const [entryType, entryWeight] = Object.entries(record)[0] ?? [];
      return {
        type: toStringOrNull(entryType),
        weight: toStringOrNull(entryWeight),
      };
    }),
  };
}


export function registerGetSiteWeight5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Site Weight 5118",
      description:
        [
          "Look up a domain's 5118 weight tiers across Baidu PC, Baidu Mobile, Shenma, and Toutiao.",
          "Use case: domain-authority audits, competitor benchmarking, and performance reporting; weight is 5118's proprietary 0-10-style score derived from Baidu/etc. ranking footprint.",
          "Difference vs neighbors: get_domain_rank_keywords_5118 returns the underlying ranking-keyword list; this tool returns the aggregated tier only, with one row per search engine.",
          "Most actionable output fields: data.weights[].type and .weight; consumers usually pivot the array into a flat object keyed by `type`.",
          "Known limits: synchronous one-shot call; weight is a 5118 estimate (not Baidu's official metric); very new domains may return all '0' or empty arrays.",
        ].join(" "),
      inputSchema: GET_SITE_WEIGHT_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getSiteWeight5118Handler(input);
      return createToolResult(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload);
    },
  );
}

export async function getSiteWeight5118Handler(
  input: GetSiteWeight5118Input,
): Promise<ResponseEnvelope<SiteWeightData>> {
  const apiKey = assertApiKey(TOOL_NAME);
  const encoded = encodeInputFields({ url: input.url }, ["url"]);
  const raw = await postForm(ENDPOINT, apiKey, encoded);
  const errcode = getErrcode(raw);

  if (errcode !== "0") {
    const errmsg = String((raw as Record<string, unknown>)?.errmsg ?? "");
    throw map5118Error(errcode, errmsg, raw);
  }

  const decoded = decodeResponseStrings(raw);
  const normalized = normalizeSiteWeightResponse(decoded);

  return createResponseEnvelope({
    tool: TOOL_NAME,
    apiName: API_NAME,
    endpoint: ENDPOINT,
    mode: "sync",
    executionStatus: "completed",
    data: normalized,
    raw,
  });
}