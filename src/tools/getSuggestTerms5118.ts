import { z } from "zod";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import { normalizeSuggestTermsResponse } from "../normalizers/keywordDiscovery.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import { TOOL_OUTPUT_SCHEMAS } from "../types/toolOutputSchemas.js";
import type { SuggestTermsData } from "../types/toolOutputSchemas.js";
import type { RegisterTool, ToToolResult } from "./toolRegistration.js";

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

export type GetSuggestTerms5118Input = z.infer<
  z.ZodObject<typeof GET_SUGGEST_TERMS_5118_INPUT_SCHEMA>
>;

export type GetSuggestTermsInput = GetSuggestTerms5118Input;

const TOOL_NAME = "get_suggest_terms_5118";
const API_NAME = "Suggestion Mining";
const ENDPOINT = "/suggest/list";

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
      outputSchema: TOOL_OUTPUT_SCHEMAS[TOOL_NAME],
    },
    async (input) => toToolResult(TOOL_NAME, await getSuggestTerms5118Handler(input)),
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
