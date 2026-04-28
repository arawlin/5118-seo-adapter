import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import { normalizeIndustryFrequencyWordsResponse } from "../normalizers/keywordDiscovery.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import type { FrequencyWordsData } from "../types/toolDataContracts.js";

export interface GetIndustryFrequencyWordsInput {
  keyword: string;
}

const TOOL_NAME = "get_industry_frequency_words_5118";
const API_NAME = "Industry Frequency Analysis";
const ENDPOINT = "/tradeseg";

export async function getIndustryFrequencyWords5118Handler(
  input: GetIndustryFrequencyWordsInput,
): Promise<ResponseEnvelope<FrequencyWordsData>> {
  const apiKey = assertApiKey(TOOL_NAME);
  const encoded = encodeInputFields({ keyword: input.keyword }, ["keyword"]);
  const raw = await postForm(ENDPOINT, apiKey, encoded);
  const errcode = getErrcode(raw);

  if (errcode !== "0") {
    const errmsg = String((raw as Record<string, unknown>)?.errmsg ?? "");
    throw map5118Error(errcode, errmsg, raw);
  }

  const decoded = decodeResponseStrings(raw);
  const normalized = normalizeIndustryFrequencyWordsResponse(decoded);

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
