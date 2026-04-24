import { assertApiKey } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import {
  normalizeLongtailKeywordsResponse,
  type LongtailKeywordsData,
} from "../normalizers/keywordDiscovery.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";

export interface GetLongtailKeywordsInput {
  keyword: string;
  pageIndex?: number;
  pageSize?: number;
  sortField?: string;
  sortType?: "asc" | "desc";
  filter?: string;
  filterDate?: string;
}

const TOOL_NAME = "get_longtail_keywords_5118";
const API_NAME = "Massive Long-tail Keyword Mining v2";
const ENDPOINT = "/keyword/word/v2";

export async function getLongtailKeywords5118Handler(
  input: GetLongtailKeywordsInput,
): Promise<ResponseEnvelope<LongtailKeywordsData>> {
  if ((input.pageSize ?? 20) > 100) {
    throw new ToolError("INPUT_LIMIT", "pageSize must be less than or equal to 100.");
  }

  const apiKey = assertApiKey(TOOL_NAME);
  const encoded = encodeInputFields(
    {
      keyword: input.keyword,
      page_index: input.pageIndex ?? 1,
      page_size: input.pageSize ?? 20,
      sort_field: input.sortField,
      sort_type: input.sortType,
      filter: input.filter,
      filter_date: input.filterDate,
    },
    ["keyword", "filter"],
  );

  const raw = await postForm(ENDPOINT, apiKey, encoded);
  const errcode = getErrcode(raw);

  if (errcode !== "0") {
    const errmsg = String((raw as Record<string, unknown>)?.errmsg ?? "");
    throw map5118Error(errcode, errmsg, raw);
  }

  const decoded = decodeResponseStrings(raw);
  const normalized = normalizeLongtailKeywordsResponse(decoded);

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
