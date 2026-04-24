import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import {
  normalizeSuggestTermsResponse,
  type SuggestTermsData,
} from "../normalizers/keywordDiscovery.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";

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

export interface GetSuggestTermsInput {
  word: string;
  platform: SuggestPlatform;
}

const TOOL_NAME = "get_suggest_terms_5118";
const API_NAME = "Suggestion Mining";
const ENDPOINT = "/suggest/list";

export async function getSuggestTerms5118Handler(
  input: GetSuggestTermsInput,
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
