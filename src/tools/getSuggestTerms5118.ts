import { z } from "zod";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
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

export const SUGGEST_PLATFORM_VALUES = [
  "baidu",
  "baidumobile",
  "shenma",
  "360",
  "360mobile",
  "sogou",
  "sogoumobile",
  "zhihu",
  "toutiao",
  "taobao",
  "tmall",
  "pinduoduo",
  "jingdong",
  "douyin",
  "amazon",
  "xiaohongshu",
] as const;

export type SuggestPlatform = (typeof SUGGEST_PLATFORM_VALUES)[number];

export const GET_SUGGEST_TERMS_5118_INPUT_SCHEMA = {
  word: z
    .string()
    .min(1)
    .describe(
      "Required. Seed query whose autocomplete/suggestion list will be returned by the chosen platform. Pass the user-facing term as-is.",
    ),
  platform: z
    .enum(SUGGEST_PLATFORM_VALUES)
    .describe(
      "Required. Suggestion source platform. Allowed values: baidu, baidumobile, shenma, 360, 360mobile, sogou, sogoumobile, zhihu, toutiao, taobao, tmall, pinduoduo, jingdong, douyin, amazon, xiaohongshu. The platform fundamentally changes both the corpus and the freshness of returned terms.",
    ),
} as const;

export const SUGGEST_TERM_ITEM_OUTPUT_SCHEMA = z.object({
  term: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Canonical suggestion term. Equal to `promotedTerm` for object responses, or to the raw string for string-only upstream responses. null when 5118 omits all source fields.",
  ),
  sourceWord: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Original seed word echoed by the upstream. May equal the input `word` exactly.",
  ),
  promotedTerm: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Suggested completion returned by the platform's autocomplete (5118 field `promote_word`). This is the user-facing suggestion.",
  ),
  platform: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Source platform label echoed from the upstream (matches the input `platform`). Sometimes null when the upstream returns plain strings.",
  ),
  addTime: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Timestamp when 5118 captured the suggestion, in ISO-8601 form (e.g. '2022-09-24T11:28:10.027'). null when not provided.",
  ),
});

export const SUGGEST_TERMS_DATA_OUTPUT_SCHEMA = z.object({
  suggestions: z
    .array(SUGGEST_TERM_ITEM_OUTPUT_SCHEMA)
    .describe(
      "Suggestion rows for the seed word on the selected platform. Empty array means no suggestions were available; this is normal for niche terms.",
    ),
});

export type SuggestTermItem = z.infer<typeof SUGGEST_TERM_ITEM_OUTPUT_SCHEMA>;
export type SuggestTermsData = z.infer<typeof SUGGEST_TERMS_DATA_OUTPUT_SCHEMA>;
export type GetSuggestTerms5118Item = SuggestTermItem;
export type GetSuggestTerms5118Data = SuggestTermsData;

export type GetSuggestTerms5118Input = z.infer<
  z.ZodObject<typeof GET_SUGGEST_TERMS_5118_INPUT_SCHEMA>
>;

export type GetSuggestTermsInput = GetSuggestTerms5118Input;

const TOOL_NAME = "get_suggest_terms_5118";
const API_NAME = "Suggestion Mining";
const ENDPOINT = "/suggest/list";

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(SUGGEST_TERMS_DATA_OUTPUT_SCHEMA);

function normalizeSuggestTermsResponse(raw: unknown): SuggestTermsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.list).length > 0 ? asArray(data.list) : asArray(data.suggestions);

  return {
    suggestions: list.map((item) => {
      if (typeof item === "string") {
        return {
          term: item,
          sourceWord: item,
          promotedTerm: item,
          platform: null,
          addTime: null,
        };
      }

      const record = asRecord(item);
      return {
        term: toStringOrNull(
          record.promote_word ?? record.promoteWord ?? record.word ?? record.keyword ?? record.term,
        ),
        sourceWord: toStringOrNull(
          record.word ?? record.keyword ?? record.source_word ?? record.sourceWord,
        ),
        promotedTerm: toStringOrNull(
          record.promote_word ?? record.promoteWord ?? record.term ?? record.word ?? record.keyword,
        ),
        platform: toStringOrNull(record.platform),
        addTime: toStringOrNull(record.add_time ?? record.addTime),
      };
    }),
  };
}


export function registerGetSuggestTerms5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Suggest Terms 5118",
      description:
        [
          "Fetch the autocomplete/suggestion list a target platform shows for a seed word, mirroring the search box dropdown.",
          "Use case: SERP-feature analysis, intent discovery, social/e-commerce title research; pick the platform that matches the channel you optimize for.",
          "Difference vs neighbors: get_longtail_keywords_5118 returns full long-tail metrics (PC index, SEM volume) but only Baidu-centric data; this tool returns lightweight cross-platform suggestions without metrics.",
          "Most actionable output fields: data.suggestions[].promotedTerm (the suggestion text) and .addTime for freshness.",
          "Known limits: synchronous one-shot call; no search-volume metrics; some platforms may be sparsely covered or rate-limited; suggestions may be stale relative to the live SERP autocomplete.",
        ].join(" "),
      inputSchema: GET_SUGGEST_TERMS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getSuggestTerms5118Handler(input);
      return createToolResult(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload);
    },
  );
}

export async function getSuggestTerms5118Handler(
  input: GetSuggestTerms5118Input,
): Promise<ResponseEnvelope<SuggestTermsData>> {
  if (!SUGGEST_PLATFORM_VALUES.includes(input.platform)) {
    throw new ToolError("INVALID_INPUT", "platform is not in the allowed vendor enum set.");
  }

  const apiKey = assertApiKey(TOOL_NAME);
  const encoded = encodeInputFields(
    {
      word: input.word,
      platform: input.platform,
    },
    ["word"],
  );
  const raw = await postForm(ENDPOINT, apiKey, encoded);
  const errcode = getErrcode(raw);

  if (errcode !== "0") {
    const errmsg = String((raw as Record<string, unknown>)?.errmsg ?? "");
    throw map5118Error(errcode, errmsg, raw);
  }

  const decoded = decodeResponseStrings(raw);
  const normalized = normalizeSuggestTermsResponse(decoded);

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
