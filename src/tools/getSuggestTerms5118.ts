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
  validateToolOutputPayload,
  type RegisterTool,
  type ToToolResult,
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
    .describe("Required seed word used to query related suggestion terms from the selected platform."),
  platform: z
    .enum(SUGGEST_PLATFORM_VALUES)
    .describe("Required official vendor platform enum. Examples include baidu, baidumobile, zhihu, douyin, and amazon. The platform changes the suggestion corpus."),
} as const;

export const SUGGEST_TERM_ITEM_OUTPUT_SCHEMA = z.object({
  term: STRING_OR_NULL_OUTPUT_SCHEMA,
  sourceWord: STRING_OR_NULL_OUTPUT_SCHEMA,
  promotedTerm: STRING_OR_NULL_OUTPUT_SCHEMA,
  platform: STRING_OR_NULL_OUTPUT_SCHEMA,
  addTime: STRING_OR_NULL_OUTPUT_SCHEMA,
});

export const SUGGEST_TERMS_DATA_OUTPUT_SCHEMA = z.object({
  suggestions: z.array(SUGGEST_TERM_ITEM_OUTPUT_SCHEMA),
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
  toToolResult: ToToolResult,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Suggest Terms 5118",
      description: "Sync suggestion mining via 5118 /suggest/list.",
      inputSchema: GET_SUGGEST_TERMS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getSuggestTerms5118Handler(input);
      return toToolResult(validateToolOutputPayload(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload));
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
