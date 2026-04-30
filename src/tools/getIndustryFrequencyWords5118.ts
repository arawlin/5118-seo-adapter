import { z } from "zod";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import {
  createResponseOutputSchema,
  NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA,
  NUMBER_OR_NULL_OUTPUT_SCHEMA,
  STRING_OR_NULL_OUTPUT_SCHEMA,
  createToolResult,
  type RegisterTool,
} from "./toolRegistration.js";
import { asArray, asRecord, toNumber, toStringOrNull } from "./normalizationUtils.js";

export const GET_INDUSTRY_FREQUENCY_WORDS_5118_INPUT_SCHEMA = {
  keyword: z
    .string()
    .min(1)
    .describe(
      "Required. Industry or topic seed keyword. 5118 returns words that co-occur frequently in articles about this topic, ranked by frequency. Pass a broad domain term (e.g. '美食') for richer output.",
    ),
} as const;

export const FREQUENCY_WORD_ITEM_OUTPUT_SCHEMA = z.object({
  word: STRING_OR_NULL_OUTPUT_SCHEMA.describe(
    "Co-occurring industry term (5118 field `Word`). Surface words by descending frequency for content briefs.",
  ),
  ratio: NUMBER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Share of the industry corpus that contains this term, expressed as a percentage value (e.g. 5.84 for 5.84%). null when missing upstream.",
  ),
  count: NON_NEGATIVE_INTEGER_OR_NULL_OUTPUT_SCHEMA.describe(
    "Raw occurrence frequency of the term in the industry corpus (5118 field `Frequency`).",
  ),
});

export const FREQUENCY_WORDS_DATA_OUTPUT_SCHEMA = z.object({
  frequencyWords: z
    .array(FREQUENCY_WORD_ITEM_OUTPUT_SCHEMA)
    .describe(
      "Industry co-occurring words sorted by upstream frequency (descending). Empty when 5118 has no segmentation data for the seed.",
    ),
});

export type FrequencyWordItem = z.infer<typeof FREQUENCY_WORD_ITEM_OUTPUT_SCHEMA>;
export type FrequencyWordsData = z.infer<typeof FREQUENCY_WORDS_DATA_OUTPUT_SCHEMA>;
export type GetIndustryFrequencyWords5118Item = FrequencyWordItem;
export type GetIndustryFrequencyWords5118Data = FrequencyWordsData;

export type GetIndustryFrequencyWords5118Input = z.infer<
  z.ZodObject<typeof GET_INDUSTRY_FREQUENCY_WORDS_5118_INPUT_SCHEMA>
>;
export type GetIndustryFrequencyWordsInput = GetIndustryFrequencyWords5118Input;

const TOOL_NAME = "get_industry_frequency_words_5118";
const API_NAME = "Industry Frequency Analysis";
const ENDPOINT = "/tradeseg";

export const TOOL_OUTPUT_SCHEMA = createResponseOutputSchema(FREQUENCY_WORDS_DATA_OUTPUT_SCHEMA);

function normalizeIndustryFrequencyWordsResponse(raw: unknown): FrequencyWordsData {
  const root = asRecord(raw);
  const data = asRecord(root.data);
  const list = asArray(data.list).length > 0 ? asArray(data.list) : asArray(data.words);

  return {
    frequencyWords: list.map((item) => {
      const record = asRecord(item);
      return {
        word: toStringOrNull(record.word ?? record.keyword ?? record.text),
        ratio: toNumber(record.ratio ?? record.percent),
        count: toNumber(record.count ?? record.num),
      };
    }),
  };
}


export function registerGetIndustryFrequencyWords5118Tool(
  registerTool: RegisterTool,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Industry Frequency Words 5118",
      description:
        [
          "Return high-frequency co-occurring terms for a topic, sourced from 5118's industry corpus segmentation.",
          "Use case: building topical entity lists, content briefs, and TF-IDF-style outline checks; identify the vocabulary an authoritative article in the industry should cover.",
          "Difference vs neighbors: get_longtail_keywords_5118 returns search-demand variants of the seed (with metrics); this tool returns the words other industry pages use alongside the seed (with frequency only, no SERP metrics).",
          "Most actionable output fields: data.frequencyWords[].word, .count (absolute frequency), .ratio (percentage share).",
          "Known limits: synchronous one-shot call; no pagination (returns the full top list); coverage depends on whether the seed is recognized as an industry term.",
        ].join(" "),
      inputSchema: GET_INDUSTRY_FREQUENCY_WORDS_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getIndustryFrequencyWords5118Handler(input);
      return createToolResult(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload);
    },
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
