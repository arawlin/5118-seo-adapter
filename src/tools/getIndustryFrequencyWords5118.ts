import { z } from "zod";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import { normalizeIndustryFrequencyWordsResponse } from "../normalizers/keywordDiscovery.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import { TOOL_OUTPUT_SCHEMAS } from "../types/toolOutputSchemas.js";
import type { FrequencyWordsData } from "../types/toolOutputSchemas.js";
import type { RegisterTool, ToToolResult } from "./toolRegistration.js";

export const GET_INDUSTRY_FREQUENCY_WORDS_5118_INPUT_SCHEMA = {
  keyword: z
    .string()
    .min(1)
    .describe("Required industry or topic seed keyword. 5118 uses it to calculate frequently co-occurring industry words."),
} as const;

export type GetIndustryFrequencyWords5118Input = z.infer<
  z.ZodObject<typeof GET_INDUSTRY_FREQUENCY_WORDS_5118_INPUT_SCHEMA>
>;
export type GetIndustryFrequencyWordsInput = GetIndustryFrequencyWords5118Input;

const TOOL_NAME = "get_industry_frequency_words_5118";
const API_NAME = "Industry Frequency Analysis";
const ENDPOINT = "/tradeseg";

export function registerGetIndustryFrequencyWords5118Tool(
  registerTool: RegisterTool,
  toToolResult: ToToolResult,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Industry Frequency Words 5118",
      description: "Sync industry frequency analysis via 5118 /tradeseg.",
      inputSchema: GET_INDUSTRY_FREQUENCY_WORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMAS[TOOL_NAME],
    },
    async (input) =>
      toToolResult(TOOL_NAME, await getIndustryFrequencyWords5118Handler(input)),
  );
}

export async function getIndustryFrequencyWords5118Handler(
  input: GetIndustryFrequencyWords5118Input,
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
