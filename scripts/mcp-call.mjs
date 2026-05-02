#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const DEFAULT_SERVER_ENTRY = "dist/index.js";

const TOOL_ALIASES = new Map([
  ["longtail", "get_longtail_keywords_5118"],
  ["frequency", "get_industry_frequency_words_5118"],
  ["suggest", "get_suggest_terms_5118"],
  ["metrics", "get_keyword_metrics_5118"],
  ["traffic", "get_mobile_traffic_keywords_5118"],
  ["domain-rank", "get_domain_rank_keywords_5118"],
  ["bid-keywords", "get_bid_keywords_5118"],
  ["weight", "get_site_weight_5118"],
  ["rank-pc", "get_pc_rank_snapshot_5118"],
  ["rank-mobile", "get_mobile_rank_snapshot_5118"],
  ["include", "check_url_indexing_5118"],
  ["indexing", "check_url_indexing_5118"],
  ["pc-site-rank", "get_pc_site_rank_keywords_5118"],
  ["mobile-site-rank", "get_mobile_site_rank_keywords_5118"],
  ["bid-sites", "get_bid_sites_5118"],
  ["top50-pc", "get_pc_top50_sites_5118"],
  ["top50-mobile", "get_mobile_top50_sites_5118"],
]);

const TOOL_REQUIRED_ENV_VARS = new Map([
  ["get_longtail_keywords_5118", "API_5118_LONGTAIL_V2"],
  ["get_industry_frequency_words_5118", "API_5118_FREQ_WORDS"],
  ["get_suggest_terms_5118", "API_5118_SUGGEST"],
  ["get_keyword_metrics_5118", "API_5118_KW_PARAM_V2"],
  ["get_mobile_traffic_keywords_5118", "API_5118_TRAFFIC"],
  ["get_domain_rank_keywords_5118", "API_5118_DOMAIN_V2"],
  ["get_bid_keywords_5118", "API_5118_BIDWORD_V2"],
  ["get_site_weight_5118", "API_5118_WEIGHT"],
  ["get_pc_rank_snapshot_5118", "API_5118_RANK_PC"],
  ["get_mobile_rank_snapshot_5118", "API_5118_RANK_MOBILE"],
  ["check_url_indexing_5118", "API_5118_INCLUDE"],
  ["get_pc_site_rank_keywords_5118", "API_5118_BAIDUPC_V2"],
  ["get_mobile_site_rank_keywords_5118", "API_5118_MOBILE_V2"],
  ["get_bid_sites_5118", "API_5118_BIDSITE"],
  ["get_pc_top50_sites_5118", "API_5118_KWRANK_PC"],
  ["get_mobile_top50_sites_5118", "API_5118_KWRANK_MOBILE"],
]);

function printUsage() {
  console.log(`5118 MCP External Caller

Usage:
  npm run mcp:call -- --listTools
  API_5118_SUGGEST=xxxx npm run mcp:call -- --tool suggest --args '{"word":"比特币","platform":"baidu"}'
  API_5118_RANK_PC=xxxx npm run mcp:call -- --tool rank-pc --args '{"url":"baidu.com","keywords":["比特币"],"executionMode":"wait"}'

Options:
  --server <path>              MCP server entry file (default: dist/index.js)
  --listTools                  Print all registered tools
  --tool <name>                Tool alias or full MCP tool name
  --args <json>                JSON string for tools/call arguments
  --argsFile <path>            Read JSON arguments from file
  --help                       Show this help message
`);
}

function resolveToolName(rawTool) {
  if (!rawTool) {
    return undefined;
  }

  return TOOL_ALIASES.get(rawTool) ?? rawTool;
}

function parseArgsJson(raw) {
  if (raw === undefined || raw.trim().length === 0) {
    return {};
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON in --args.");
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("--args must be a JSON object.");
  }

  return parsed;
}

async function parseArgsFile(filePath) {
  const fullPath = path.resolve(process.cwd(), filePath);
  const text = await readFile(fullPath, "utf8");

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON in --argsFile: ${filePath}`);
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("--argsFile must contain a JSON object.");
  }

  return parsed;
}

function getCallArguments(values) {
  const hasArgs = values.args !== undefined;
  const hasArgsFile = values.argsFile !== undefined;

  if (hasArgs && hasArgsFile) {
    throw new Error("Use only one of --args or --argsFile.");
  }

  if (hasArgsFile) {
    return parseArgsFile(values.argsFile);
  }

  return parseArgsJson(values.args);
}

function assertToolEnv(toolName) {
  const envVar = TOOL_REQUIRED_ENV_VARS.get(toolName);
  if (!envVar) {
    return;
  }

  if (!process.env[envVar]?.trim()) {
    throw new Error(`Missing ${envVar} for ${toolName}.`);
  }
}

function printTools(toolsResult) {
  const names = (toolsResult.tools ?? []).map((tool) => tool.name);
  console.log(
    JSON.stringify(
      {
        count: names.length,
        tools: names,
      },
      undefined,
      2,
    ),
  );
}

async function main() {
  const { values } = parseArgs({
    options: {
      help: { type: "boolean", short: "h" },
      server: { type: "string" },
      listTools: { type: "boolean" },
      tool: { type: "string", short: "t" },
      args: { type: "string" },
      argsFile: { type: "string" },
    },
    allowPositionals: false,
  });

  if (values.help === true) {
    printUsage();
    return;
  }

  const toolName = resolveToolName(values.tool);
  const shouldListTools = values.listTools === true;

  if (!shouldListTools && !toolName) {
    throw new Error("Provide --listTools or --tool.");
  }

  if (toolName) {
    assertToolEnv(toolName);
  }

  const serverPath = values.server ?? DEFAULT_SERVER_ENTRY;
  const fullServerPath = path.resolve(process.cwd(), serverPath);

  const client = new Client(
    {
      name: "5118-seo-adapter-external-caller",
      version: "0.1.0",
    },
    {
      capabilities: {},
    },
  );

  const transport = new StdioClientTransport({
    command: "node",
    args: [fullServerPath],
    env: process.env,
  });

  await client.connect(transport);

  try {
    if (shouldListTools) {
      const toolsResult = await client.listTools();
      printTools(toolsResult);
      if (!toolName) {
        return;
      }
    }

    const input = await getCallArguments(values);
    const result = await client.callTool({
      name: toolName,
      arguments: input,
    });

    console.log(JSON.stringify(result, undefined, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[mcp-call] failed: ${message}`);
  process.exit(1);
});