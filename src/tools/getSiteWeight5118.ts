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
  validateToolOutputPayload,
  type RegisterTool,
  type ToToolResult,
} from "./toolRegistration.js";
import { asArray, asRecord, toStringOrNull } from "./normalizationUtils.js";

export const GET_SITE_WEIGHT_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .describe("Required domain or host to inspect for 5118 weight values."),
} as const;

export const SITE_WEIGHT_ITEM_OUTPUT_SCHEMA = z.object({
  type: STRING_OR_NULL_OUTPUT_SCHEMA,
  weight: STRING_OR_NULL_OUTPUT_SCHEMA,
});

export const SITE_WEIGHT_DATA_OUTPUT_SCHEMA = z.object({
  weights: z.array(SITE_WEIGHT_ITEM_OUTPUT_SCHEMA),
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

  return {
    weights: list.map((item) => {
      const record = asRecord(item);
      const type = toStringOrNull(record.type);
      const weight = toStringOrNull(record.weight);

      if (type || weight) {
        return { type, weight };
      }

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
  toToolResult: ToToolResult,
): void {
  registerTool(
    TOOL_NAME,
    {
      title: "Get Site Weight 5118",
      description: "Sync site weight lookup via 5118 /weight.",
      inputSchema: GET_SITE_WEIGHT_5118_INPUT_SCHEMA,
      outputSchema: TOOL_OUTPUT_SCHEMA,
    },
    async (input) => {
      const payload = await getSiteWeight5118Handler(input);
      return toToolResult(validateToolOutputPayload(TOOL_NAME, TOOL_OUTPUT_SCHEMA, payload));
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