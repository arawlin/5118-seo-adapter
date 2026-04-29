import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import { normalizeBidKeywordsResponse } from "../normalizers/siteInsights.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import type { BidKeywordsData } from "../types/toolOutputSchemas.js";

export interface GetBidKeywordsInput {
  url: string;
  pageIndex?: number;
  pageSize?: number;
  includeHighlight?: boolean;
}

const TOOL_NAME = "get_bid_keywords_5118";
const API_NAME = "Site Bid Keywords Mining API v2";
const ENDPOINT = "/bidword/v2";

export async function getBidKeywords5118Handler(
  input: GetBidKeywordsInput,
): Promise<ResponseEnvelope<BidKeywordsData>> {
  const pageIndex = input.pageIndex ?? 1;
  const pageSize = input.pageSize ?? 20;

  if (pageIndex <= 0) {
    throw new ToolError("INVALID_INPUT", "pageIndex must be greater than 0.");
  }

  if (pageSize <= 0 || pageSize > 500) {
    throw new ToolError("INPUT_LIMIT", "pageSize must be between 1 and 500.");
  }

  const apiKey = assertApiKey(TOOL_NAME);
  const encoded = encodeInputFields(
    {
      url: input.url,
      page_index: pageIndex,
      page_size: pageSize,
      isc: input.includeHighlight ? 1 : 0,
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
  const normalized = normalizeBidKeywordsResponse(decoded);

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