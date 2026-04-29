#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";

const DEFAULT_KEYWORD = "比特币";
const DEFAULT_PLATFORM = "baidu";
const DEFAULT_DOMAIN = "www.baidu.com";
const DEFAULT_MOBILE_DOMAIN = "m.baidu.com";
const DEFAULT_PAGE_URL = "https://www.baidu.com/";

const DEFAULT_SCENARIO_PATHS = new Map([
  ["wave-one", "examples/wave-one-sequence.json"],
  ["wave-two", "examples/wave-two-sequence.json"],
]);

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
  console.log(`5118 Live Runner

Usage:
  API_5118_SUGGEST=xxxx npm run test:live
  API_5118_SUGGEST=xxxx npm run test:live -- --tool suggest --word "比特币" --platform baidu --verbose
  API_5118_KW_PARAM_V2=xxxx npm run test:live -- --tool metrics --keywords "比特币价格,比特币是什么" --executionMode wait
  API_5118_LONGTAIL_V2=xxxx API_5118_FREQ_WORDS=xxxx API_5118_SUGGEST=xxxx API_5118_KW_PARAM_V2=xxxx API_5118_TRAFFIC=xxxx npm run test:live -- --scenario wave-one
  API_5118_BAIDUPC_V2=xxxx API_5118_MOBILE_V2=xxxx API_5118_BIDSITE=xxxx API_5118_KWRANK_PC=xxxx API_5118_KWRANK_MOBILE=xxxx npm run test:live -- --scenario wave-two
  API_5118_DOMAIN_V2=xxxx npm run test:live -- --tool domain-rank --url www.baidu.com --pageIndex 1
  API_5118_RANK_PC=xxxx npm run test:live -- --tool rank-pc --url www.baidu.com --keywords "比特币价格" --executionMode submit
  API_5118_SUGGEST=xxxx npm run test:live:debug -- --tool suggest --word "比特币"

Options:
  --tool <name>                 Tool alias or full MCP tool name for any implemented tool
  --scenario <name>             Built-in scenario name: wave-one or wave-two
  --sequence <path>             Custom scenario JSON file path
  --keyword <value>             Generic keyword input
  --url <value>                 Generic domain or URL input for URL-based tools
  --urls <a,b,c>                Comma-separated URL list for indexing checks
  --word <value>                Suggest tool word input
  --platform <value>            Suggest tool platform (default: baidu)
  --keywords <a,b,c>            Comma-separated keywords for metrics tool
  --checkRow <number>           Optional ranking depth for rank snapshot and top50 tools
  --executionMode <mode>        submit | poll | wait for async tools
  --taskId <id>                 Existing task ID for poll mode
  --pageIndex <number>          Optional page index
  --pageSize <number>           Optional page size
  --includeHighlight            Request upstream highlight HTML for bid tools
  --maxWaitSeconds <number>     Optional wait timeout
  --pollIntervalSeconds <num>   Optional poll interval
  --verbose                     Print full envelopes
  --help                        Show this help message
`);
}

function parseNumberOption(raw, fieldName) {
  if (raw === undefined) {
    return undefined;
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid number for ${fieldName}: ${raw}`);
  }

  return parsed;
}

function parseTaskId(raw) {
  if (raw === undefined) {
    return undefined;
  }

  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }

  return raw;
}

function parseKeywords(raw, fallbackKeyword) {
  if (raw === undefined) {
    return [fallbackKeyword];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseUrls(raw, fallbackUrl) {
  if (raw === undefined) {
    return [fallbackUrl];
  }

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function summarizeData(data) {
  if (Array.isArray(data)) {
    return { kind: "array", length: data.length };
  }

  if (data && typeof data === "object") {
    const keys = Object.keys(data);
    return { kind: "object", keys: keys.slice(0, 8) };
  }

  return data;
}

function resolveToolName(rawTool) {
  if (!rawTool) {
    return TOOL_ALIASES.get("suggest");
  }

  return TOOL_ALIASES.get(rawTool) ?? rawTool;
}

function getRequiredEnvVarForTool(toolName) {
  return TOOL_REQUIRED_ENV_VARS.get(toolName);
}

function assertToolEnv(toolName) {
  const envVar = getRequiredEnvVarForTool(toolName);
  if (!envVar) {
    throw new Error(`No API key env mapping configured for ${toolName}.`);
  }

  if (!process.env[envVar]?.trim()) {
    throw new Error(
      `Missing ${envVar}. Set ${envVar} before running live checks for ${toolName}.`,
    );
  }
}

async function loadHandlers() {
  try {
    const [
      longtailMod,
      frequencyMod,
      suggestMod,
      metricsMod,
      trafficMod,
      domainRankMod,
      bidKeywordsMod,
      siteWeightMod,
      pcRankMod,
      mobileRankMod,
      indexingMod,
      pcSiteRankMod,
      mobileSiteRankMod,
      bidSitesMod,
      pcTop50Mod,
      mobileTop50Mod,
    ] = await Promise.all([
      import("../dist/tools/getLongtailKeywords5118.js"),
      import("../dist/tools/getIndustryFrequencyWords5118.js"),
      import("../dist/tools/getSuggestTerms5118.js"),
      import("../dist/tools/getKeywordMetrics5118.js"),
      import("../dist/tools/getMobileTrafficKeywords5118.js"),
      import("../dist/tools/getDomainRankKeywords5118.js"),
      import("../dist/tools/getBidKeywords5118.js"),
      import("../dist/tools/getSiteWeight5118.js"),
      import("../dist/tools/getPcRankSnapshot5118.js"),
      import("../dist/tools/getMobileRankSnapshot5118.js"),
      import("../dist/tools/checkUrlIndexing5118.js"),
      import("../dist/tools/getPcSiteRankKeywords5118.js"),
      import("../dist/tools/getMobileSiteRankKeywords5118.js"),
      import("../dist/tools/getBidSites5118.js"),
      import("../dist/tools/getPcTop50Sites5118.js"),
      import("../dist/tools/getMobileTop50Sites5118.js"),
    ]);

    return {
      get_longtail_keywords_5118: longtailMod.getLongtailKeywords5118Handler,
      get_industry_frequency_words_5118: frequencyMod.getIndustryFrequencyWords5118Handler,
      get_suggest_terms_5118: suggestMod.getSuggestTerms5118Handler,
      get_keyword_metrics_5118: metricsMod.getKeywordMetrics5118Handler,
      get_mobile_traffic_keywords_5118: trafficMod.getMobileTrafficKeywords5118Handler,
      get_domain_rank_keywords_5118: domainRankMod.getDomainRankKeywords5118Handler,
      get_bid_keywords_5118: bidKeywordsMod.getBidKeywords5118Handler,
      get_site_weight_5118: siteWeightMod.getSiteWeight5118Handler,
      get_pc_rank_snapshot_5118: pcRankMod.getPcRankSnapshot5118Handler,
      get_mobile_rank_snapshot_5118: mobileRankMod.getMobileRankSnapshot5118Handler,
      check_url_indexing_5118: indexingMod.checkUrlIndexing5118Handler,
      get_pc_site_rank_keywords_5118: pcSiteRankMod.getPcSiteRankKeywords5118Handler,
      get_mobile_site_rank_keywords_5118: mobileSiteRankMod.getMobileSiteRankKeywords5118Handler,
      get_bid_sites_5118: bidSitesMod.getBidSites5118Handler,
      get_pc_top50_sites_5118: pcTop50Mod.getPcTop50Sites5118Handler,
      get_mobile_top50_sites_5118: mobileTop50Mod.getMobileTop50Sites5118Handler,
    };
  } catch {
    throw new Error("Build output is missing. Run `npm run build` first.");
  }
}

function buildSingleInput(toolName, values) {
  const keyword = values.keyword ?? DEFAULT_KEYWORD;
  const url = values.url;
  const executionMode = values.executionMode;
  const taskId = parseTaskId(values.taskId);
  const pageIndex = parseNumberOption(values.pageIndex, "pageIndex");
  const pageSize = parseNumberOption(values.pageSize, "pageSize");
  const checkRow = parseNumberOption(values.checkRow, "checkRow");
  const maxWaitSeconds = parseNumberOption(values.maxWaitSeconds, "maxWaitSeconds");
  const pollIntervalSeconds = parseNumberOption(
    values.pollIntervalSeconds,
    "pollIntervalSeconds",
  );
  const includeHighlight = values.includeHighlight === true ? true : undefined;

  switch (toolName) {
    case "get_longtail_keywords_5118": {
      return {
        keyword,
        pageIndex,
        pageSize,
      };
    }
    case "get_industry_frequency_words_5118": {
      return { keyword };
    }
    case "get_suggest_terms_5118": {
      return {
        word: values.word ?? keyword,
        platform: values.platform ?? DEFAULT_PLATFORM,
      };
    }
    case "get_keyword_metrics_5118": {
      return {
        keywords: parseKeywords(values.keywords, keyword),
        executionMode,
        taskId,
        maxWaitSeconds,
        pollIntervalSeconds,
      };
    }
    case "get_mobile_traffic_keywords_5118": {
      return {
        keyword,
        executionMode,
        taskId,
        pageIndex,
        pageSize,
        maxWaitSeconds,
        pollIntervalSeconds,
      };
    }
    case "get_domain_rank_keywords_5118": {
      return {
        url: url ?? DEFAULT_DOMAIN,
        pageIndex,
      };
    }
    case "get_bid_keywords_5118": {
      return {
        url: url ?? DEFAULT_DOMAIN,
        pageIndex,
        pageSize,
        includeHighlight,
      };
    }
    case "get_site_weight_5118": {
      return {
        url: url ?? DEFAULT_DOMAIN,
      };
    }
    case "get_pc_rank_snapshot_5118": {
      return {
        url: url ?? DEFAULT_DOMAIN,
        keywords: parseKeywords(values.keywords, keyword),
        checkRow,
        executionMode,
        taskId,
        maxWaitSeconds,
        pollIntervalSeconds,
      };
    }
    case "get_mobile_rank_snapshot_5118": {
      return {
        url: url ?? DEFAULT_MOBILE_DOMAIN,
        keywords: parseKeywords(values.keywords, keyword),
        checkRow,
        executionMode,
        taskId,
        maxWaitSeconds,
        pollIntervalSeconds,
      };
    }
    case "check_url_indexing_5118": {
      return {
        urls: parseUrls(values.urls, url ?? DEFAULT_PAGE_URL),
        executionMode,
        taskId,
        maxWaitSeconds,
        pollIntervalSeconds,
      };
    }
    case "get_pc_site_rank_keywords_5118": {
      return {
        url: url ?? DEFAULT_DOMAIN,
        pageIndex,
      };
    }
    case "get_mobile_site_rank_keywords_5118": {
      return {
        url: url ?? DEFAULT_MOBILE_DOMAIN,
        pageIndex,
      };
    }
    case "get_bid_sites_5118": {
      return {
        keyword,
        pageIndex,
        pageSize,
        includeHighlight,
      };
    }
    case "get_pc_top50_sites_5118": {
      return {
        keywords: parseKeywords(values.keywords, keyword),
        checkRow,
        executionMode,
        taskId,
        maxWaitSeconds,
        pollIntervalSeconds,
      };
    }
    case "get_mobile_top50_sites_5118": {
      return {
        keywords: parseKeywords(values.keywords, keyword),
        checkRow,
        executionMode,
        taskId,
        maxWaitSeconds,
        pollIntervalSeconds,
      };
    }
    default:
      throw new Error(`Unsupported tool: ${toolName}`);
  }
}

function printResult(envelope, verbose) {
  if (verbose) {
    console.log(JSON.stringify(envelope, null, 2));
    return;
  }

  const summary = {
    tool: envelope.tool,
    executionStatus: envelope.executionStatus,
    taskId: envelope.taskId,
    pagination: envelope.pagination,
    data: summarizeData(envelope.data),
    warnings: envelope.warnings,
  };

  console.log(JSON.stringify(summary, null, 2));
}

async function runSingle(values, handlers) {
  const toolName = resolveToolName(values.tool);
  if (!toolName) {
    throw new Error("Cannot resolve tool name.");
  }

  assertToolEnv(toolName);

  const handler = handlers[toolName];
  if (!handler) {
    throw new Error(`Tool handler not found for ${toolName}`);
  }

  const input = buildSingleInput(toolName, values);
  console.log(`[live] invoking ${toolName}`);
  const startedAt = Date.now();
  const result = await handler(input);
  const elapsedMs = Date.now() - startedAt;
  printResult(result, values.verbose === true);
  console.log(`[live] done in ${elapsedMs}ms`);
}

async function runScenario(values, handlers) {
  const scenarioName = values.scenario ?? "wave-one";
  const defaultSequencePath = DEFAULT_SCENARIO_PATHS.get(scenarioName);

  if (!defaultSequencePath && values.sequence === undefined) {
    throw new Error(`Unsupported scenario: ${scenarioName}`);
  }

  const sequencePath = values.sequence ?? defaultSequencePath;
  const fullPath = path.resolve(process.cwd(), sequencePath);
  const rawText = await readFile(fullPath, "utf8");
  const sequence = JSON.parse(rawText);

  if (!sequence || !Array.isArray(sequence.steps)) {
    throw new Error(`Invalid scenario file: ${sequencePath}`);
  }

  const steps = [...sequence.steps].sort((a, b) => Number(a.order) - Number(b.order));

  const requiredEnvVars = new Set();
  for (const step of steps) {
    const toolName = resolveToolName(step.tool);
    if (!toolName) {
      throw new Error(`Cannot resolve step tool: ${String(step.tool)}`);
    }

    const envVar = getRequiredEnvVarForTool(toolName);
    if (!envVar) {
      throw new Error(`No API key env mapping configured for ${toolName}.`);
    }

    requiredEnvVars.add(envVar);
  }

  const missingEnvVars = [...requiredEnvVars].filter(
    (envVar) => !process.env[envVar]?.trim(),
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing API key env vars for scenario ${scenarioName}: ${missingEnvVars.join(", ")}.`,
    );
  }

  for (const step of steps) {
    const toolName = resolveToolName(step.tool);
    if (!toolName) {
      throw new Error(`Cannot resolve step tool: ${String(step.tool)}`);
    }

    const handler = handlers[toolName];
    if (!handler) {
      throw new Error(`Tool handler not found for ${toolName}`);
    }

    console.log(`[live] step ${step.order}: ${toolName}`);
    const startedAt = Date.now();
    const result = await handler(step.input ?? {});
    const elapsedMs = Date.now() - startedAt;
    printResult(result, values.verbose === true);
    console.log(`[live] step ${step.order} done in ${elapsedMs}ms`);
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      help: { type: "boolean", short: "h" },
      verbose: { type: "boolean", short: "v" },
      tool: { type: "string", short: "t" },
      scenario: { type: "string" },
      sequence: { type: "string" },
      keyword: { type: "string", short: "k" },
      word: { type: "string" },
      url: { type: "string" },
      urls: { type: "string" },
      platform: { type: "string" },
      keywords: { type: "string" },
      checkRow: { type: "string" },
      executionMode: { type: "string" },
      taskId: { type: "string" },
      pageIndex: { type: "string" },
      pageSize: { type: "string" },
      includeHighlight: { type: "boolean" },
      maxWaitSeconds: { type: "string" },
      pollIntervalSeconds: { type: "string" },
    },
    allowPositionals: false,
  });

  if (values.help === true) {
    printUsage();
    return;
  }

  const handlers = await loadHandlers();

  if (values.scenario || values.sequence) {
    await runScenario(values, handlers);
    return;
  }

  await runSingle(values, handlers);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[live] failed: ${message}`);
  if (error instanceof Error && process.env.DEBUG_LIVE_RUNNER === "1") {
    console.error(error.stack);
  }
  process.exit(1);
});
