import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import { normalizeDomainRankKeywordsResponse } from "../normalizers/siteInsights.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import type { DomainRankKeywordsData } from "../types/toolOutputSchemas.js";

export interface GetDomainRankKeywordsInput {
  url: string;
  pageIndex?: number;
}

const TOOL_NAME = "get_domain_rank_keywords_5118";
const API_NAME = "PC Domain Rank Keywords Export API v2";
const ENDPOINT = "/keyword/domain/v2";

export async function getDomainRankKeywords5118Handler(
  input: GetDomainRankKeywordsInput,
): Promise<ResponseEnvelope<DomainRankKeywordsData>> {
  if ((input.pageIndex ?? 1) <= 0) {
    throw new ToolError("INVALID_INPUT", "pageIndex must be greater than 0.");
  }

  const apiKey = assertApiKey(TOOL_NAME);
  const encoded = encodeInputFields(
    {
      url: input.url,
      page_index: input.pageIndex ?? 1,
    },
    ["url"],
  );

  const raw = await postForm(ENDPOINT, apiKey, encoded);
  const errcode = getErrcode(raw);

  if (errcode !== "0") {
    const errmsg = String((raw as Record<string, unknown>)?.errmsg ?? "");
    throw map5118Error(errcode, errmsg, raw);
  }

  const decoded = decodeResponseStrings(raw);
  const normalized = normalizeDomainRankKeywordsResponse(decoded);

  return createResponseEnvelope({
    tool: TOOL_NAME,
    apiName: API_NAME,
    endpoint: ENDPOINT,
    mode: "sync",
    executionStatus: "completed",
    pagination: normalized.pagination,
    data: normalized,
    raw,
  });
}