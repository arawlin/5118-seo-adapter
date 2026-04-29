import { assertApiKey, type ApiToolName } from "../config/apiKeyRegistry.js";
import { getErrcode, map5118Error, ToolError } from "../lib/errorMapper.js";
import { postForm } from "../lib/http5118Client.js";
import { createResponseEnvelope } from "../lib/responseEnvelope.js";
import { decodeResponseStrings, encodeInputFields } from "../lib/urlCodec.js";
import type { ResponseEnvelope } from "../types/toolContracts.js";
import type { SiteRankKeywordsData } from "../types/toolOutputSchemas.js";

export interface SiteRankKeywordsInput {
  url: string;
  pageIndex?: number;
}

interface SiteRankKeywordsConfig {
  toolName: ApiToolName;
  apiName: string;
  endpoint: string;
  normalize: (raw: unknown) => SiteRankKeywordsData;
}

export async function createSiteRankKeywordsHandler(
  input: SiteRankKeywordsInput,
  config: SiteRankKeywordsConfig,
): Promise<ResponseEnvelope<SiteRankKeywordsData>> {
  const pageIndex = input.pageIndex ?? 1;

  if (pageIndex <= 0) {
    throw new ToolError("INVALID_INPUT", "pageIndex must be greater than 0.");
  }

  const apiKey = assertApiKey(config.toolName);
  const encoded = encodeInputFields(
    {
      url: input.url,
      page_index: pageIndex,
    },
    ["url"],
  );

  const raw = await postForm(config.endpoint, apiKey, encoded);
  const errcode = getErrcode(raw);

  if (errcode !== "0") {
    const errmsg = String((raw as Record<string, unknown>)?.errmsg ?? "");
    throw map5118Error(errcode, errmsg, raw);
  }

  const decoded = decodeResponseStrings(raw);
  const normalized = config.normalize(decoded);

  return createResponseEnvelope({
    tool: config.toolName,
    apiName: config.apiName,
    endpoint: config.endpoint,
    mode: "sync",
    executionStatus: "completed",
    pagination: normalized.pagination,
    data: normalized,
    raw,
  });
}