import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import { normalizeSiteWeightResponse } from "../normalizers/siteInsights.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import type { SiteWeightData } from "../types/toolOutputSchemas.js";

export interface GetSiteWeightInput {
  url: string;
}

const TOOL_NAME = "get_site_weight_5118";
const API_NAME = "Site 5118 Weight API";
const ENDPOINT = "/weight";

export async function getSiteWeight5118Handler(
  input: GetSiteWeightInput,
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