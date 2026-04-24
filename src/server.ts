import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { API_TOOL_NAMES } from "./config/apiKeyRegistry.js";
import { getIndustryFrequencyWords5118Handler } from "./tools/getIndustryFrequencyWords5118.js";
import { getKeywordMetrics5118Handler } from "./tools/getKeywordMetrics5118.js";
import { getLongtailKeywords5118Handler } from "./tools/getLongtailKeywords5118.js";
import { getMobileTrafficKeywords5118Handler } from "./tools/getMobileTrafficKeywords5118.js";
import {
  getSuggestTerms5118Handler,
  SUGGEST_PLATFORM_VALUES,
} from "./tools/getSuggestTerms5118.js";

export const REGISTERED_TOOL_NAMES = API_TOOL_NAMES;

function toToolResult(payload: unknown) {
  const structuredContent = payload as Record<string, unknown>;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(structuredContent),
      },
    ],
    structuredContent,
  };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "5118-seo-adapter",
    version: "0.1.0",
  });

  server.registerTool(
    "get_longtail_keywords_5118",
    {
      title: "Get Longtail Keywords 5118",
      description: "Fetch longtail keywords from 5118 /keyword/word/v2.",
      inputSchema: {
        keyword: z.string().min(1),
        pageIndex: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().max(100).optional(),
        sortField: z.string().optional(),
        sortType: z.enum(["asc", "desc"]).optional(),
        filter: z.string().optional(),
        filterDate: z.string().optional(),
      },
    },
    async (input) => toToolResult(await getLongtailKeywords5118Handler(input)),
  );

  server.registerTool(
    "get_industry_frequency_words_5118",
    {
      title: "Get Industry Frequency Words 5118",
      description: "Fetch industry frequency words from 5118 /tradeseg.",
      inputSchema: {
        keyword: z.string().min(1),
      },
    },
    async (input) => toToolResult(await getIndustryFrequencyWords5118Handler(input)),
  );

  server.registerTool(
    "get_suggest_terms_5118",
    {
      title: "Get Suggest Terms 5118",
      description: "Fetch suggestion terms from 5118 /suggest/list.",
      inputSchema: {
        word: z.string().min(1),
        platform: z.enum(SUGGEST_PLATFORM_VALUES),
      },
    },
    async (input) => toToolResult(await getSuggestTerms5118Handler(input)),
  );

  server.registerTool(
    "get_keyword_metrics_5118",
    {
      title: "Get Keyword Metrics 5118",
      description: "Fetch async keyword metrics from 5118 /keywordparam/v2.",
      inputSchema: {
        keywords: z.array(z.string().min(1)).max(50).optional(),
        executionMode: z.enum(["submit", "poll", "wait"]).optional(),
        taskId: z.union([z.string(), z.number()]).optional(),
        maxWaitSeconds: z.number().positive().optional(),
        pollIntervalSeconds: z.number().positive().optional(),
      },
    },
    async (input) => toToolResult(await getKeywordMetrics5118Handler(input)),
  );

  server.registerTool(
    "get_mobile_traffic_keywords_5118",
    {
      title: "Get Mobile Traffic Keywords 5118",
      description: "Fetch async mobile traffic keywords from 5118 /traffic.",
      inputSchema: {
        keyword: z.string().min(1).optional(),
        pageIndex: z.number().int().positive().optional(),
        pageSize: z.number().int().positive().max(500).optional(),
        executionMode: z.enum(["submit", "poll", "wait"]).optional(),
        taskId: z.union([z.string(), z.number()]).optional(),
        maxWaitSeconds: z.number().positive().optional(),
        pollIntervalSeconds: z.number().positive().optional(),
      },
    },
    async (input) => toToolResult(await getMobileTrafficKeywords5118Handler(input)),
  );

  return server;
}
