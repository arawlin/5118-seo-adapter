import { z } from "zod";
import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import { normalizeSiteWeightResponse } from "../normalizers/siteInsights.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import { TOOL_OUTPUT_SCHEMAS } from "../types/toolOutputSchemas.js";
import type { SiteWeightData } from "../types/toolOutputSchemas.js";
import type { RegisterTool, ToToolResult } from "./toolRegistration.js";

export const GET_SITE_WEIGHT_5118_INPUT_SCHEMA = {
  url: z
    .string()
    .min(1)
    .describe("Required domain or host to inspect for 5118 weight values."),
} as const;

export type GetSiteWeight5118Input = z.infer<
  z.ZodObject<typeof GET_SITE_WEIGHT_5118_INPUT_SCHEMA>
>;
export type GetSiteWeightInput = GetSiteWeight5118Input;

const TOOL_NAME = "get_site_weight_5118";
const API_NAME = "Site 5118 Weight API";
const ENDPOINT = "/weight";

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
      outputSchema: TOOL_OUTPUT_SCHEMAS[TOOL_NAME],
    },
    async (input) => toToolResult(TOOL_NAME, await getSiteWeight5118Handler(input)),
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