import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { API_TOOL_NAMES } from "./config/apiKeyRegistry.js";
import { checkUrlIndexing5118Handler } from "./tools/checkUrlIndexing5118.js";
import { getBidKeywords5118Handler } from "./tools/getBidKeywords5118.js";
import { getBidSites5118Handler } from "./tools/getBidSites5118.js";
import { getDomainRankKeywords5118Handler } from "./tools/getDomainRankKeywords5118.js";
import { getIndustryFrequencyWords5118Handler } from "./tools/getIndustryFrequencyWords5118.js";
import { getKeywordMetrics5118Handler } from "./tools/getKeywordMetrics5118.js";
import { getLongtailKeywords5118Handler } from "./tools/getLongtailKeywords5118.js";
import { getMobileRankSnapshot5118Handler } from "./tools/getMobileRankSnapshot5118.js";
import { getMobileSiteRankKeywords5118Handler } from "./tools/getMobileSiteRankKeywords5118.js";
import { getMobileTop50Sites5118Handler } from "./tools/getMobileTop50Sites5118.js";
import { getMobileTrafficKeywords5118Handler } from "./tools/getMobileTrafficKeywords5118.js";
import { getPcRankSnapshot5118Handler } from "./tools/getPcRankSnapshot5118.js";
import { getPcSiteRankKeywords5118Handler } from "./tools/getPcSiteRankKeywords5118.js";
import { getPcTop50Sites5118Handler } from "./tools/getPcTop50Sites5118.js";
import { getSiteWeight5118Handler } from "./tools/getSiteWeight5118.js";
import { getSuggestTerms5118Handler } from "./tools/getSuggestTerms5118.js";
import { TOOL_INPUT_SCHEMAS } from "./types/toolInputSchemas.js";
import {
  TOOL_OUTPUT_SCHEMAS,
  validateToolOutputEnvelope,
} from "./types/toolOutputSchemas.js";

export const REGISTERED_TOOL_NAMES = API_TOOL_NAMES;

function joinDescription(...parts: string[]) {
  return parts.join(" ");
}

function jsonExample(label: string, value: unknown) {
  return `${label}: ${JSON.stringify(value)}.`;
}

const COMMON_RESPONSE_FIELDS_DESCRIPTION =
  "Top-level response fields: source=upstream provider name; sourceType=adapter source classification; tool=MCP tool name; apiName=official 5118 API name; endpoint=official endpoint path; mode=sync or async; executionStatus=completed, pending, or failed; taskId=vendor async task id or null; pagination=normalized page info or null; warnings=non-fatal notices; raw=original vendor payload kept for debugging.";

const COMMON_PAGINATION_FIELDS_DESCRIPTION =
  "Pagination fields: pageIndex=current 1-based page number; pageSize=result count per page; pageCount=total number of pages; total=total number of matching rows.";

const ASYNC_RESPONSE_STATE_DESCRIPTION =
  "Async state rule: data=null while executionStatus=pending; completed tasks return normalized data; failed tasks surface executionStatus=failed plus warnings or raw vendor details.";
type RegisteredToolName = (typeof REGISTERED_TOOL_NAMES)[number];
type RegisterToolMethod = McpServer["registerTool"];

function toToolResult(toolName: RegisteredToolName, payload: unknown) {
  const validationResult = validateToolOutputEnvelope(toolName, payload);

  if (!validationResult.success) {
    const issueSummary = validationResult.error.issues
      .slice(0, 5)
      .map((issue) => {
        const issuePath = issue.path.length > 0 ? issue.path.join(".") : "<root>";
        return `${issuePath}: ${issue.message}`;
      })
      .join("; ");

    throw new Error(
      `Output schema validation failed for ${toolName}: ${issueSummary}`,
    );
  }

  const structuredContent = validationResult.data;

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

function createToolRegistrar(server: McpServer) {
  const registeredToolNames = new Set<RegisteredToolName>();

  const registerTool: RegisterToolMethod = (name, config, handler) => {
    if (!REGISTERED_TOOL_NAMES.includes(name as RegisteredToolName)) {
      throw new Error(`Unsupported tool registration: ${name}.`);
    }

    registeredToolNames.add(name as RegisteredToolName);

    const resolvedConfig = {
      title: config.title,
      description: config.description,
      inputSchema: config.inputSchema,
      outputSchema: TOOL_OUTPUT_SCHEMAS[name as RegisteredToolName],
      annotations: config.annotations,
      _meta: config._meta,
    };

    return server.registerTool(name, resolvedConfig, handler);
  };

  function assertToolCoverage(): void {
    const missing = REGISTERED_TOOL_NAMES.filter(
      (toolName) => !registeredToolNames.has(toolName),
    );

    if (missing.length > 0) {
      throw new Error(
        `Tool registration mismatch. Missing registrations: ${missing.join(", ")}.`,
      );
    }
  }

  return { registerTool, assertToolCoverage };
}

export function createServer(): McpServer {
  const server = new McpServer({
    name: "5118-seo-adapter",
    version: "0.1.0",
  });

  const { registerTool, assertToolCoverage } = createToolRegistrar(server);

  registerTool(
    "get_longtail_keywords_5118",
    {
      title: "Get Longtail Keywords 5118",
      description: joinDescription(
        "Sync long-tail keyword mining via 5118 /keyword/word/v2.",
        "Input fields: keyword=seed keyword to expand; pageIndex=1-based result page; pageSize=result count per page, maximum 100; sortField=vendor sort selector; sortType=sort direction for sortField; filter=vendor quick filter selector; filterDate=optional yyyy-MM-dd snapshot date.",
        jsonExample("Example input JSON", { keyword: "衬衫", pageIndex: 1, pageSize: 20 }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        "Normalized data fields: data.keywords[]=long-tail rows where keyword=long-tail keyword text; index=PC search index; mobileIndex=mobile search index; haosouIndex=360 search index; douyinIndex=Douyin search index; toutiaoIndex=Toutiao search index; googleIndex=Google search index; kuaishouIndex=Kuaishou search index; weiboIndex=Weibo search index; longKeywordCount=number of related long-tail keywords; bidCompanyCount=number of advertisers bidding on the term; pageUrl=sample ranking page URL; competition=SEO competition score; pcSearchVolume=estimated PC search volume; mobileSearchVolume=estimated mobile search volume; semReason=vendor bidding suggestion reason; semPrice=reference bid price text; semRecommendPriceAvg=average recommended bid price.",
        jsonExample("Example normalized data", {
          keywords: [{
            keyword: "衬衫",
            index: 1063,
            mobileIndex: 919,
            haosouIndex: 1163,
            douyinIndex: 89,
            toutiaoIndex: 256,
            longKeywordCount: 6045520,
            bidCompanyCount: 185,
            pageUrl: "https://example.com/shirt",
            competition: 1,
            pcSearchVolume: 240,
            mobileSearchVolume: 1433,
            semReason: "High-frequency keyword",
            semPrice: "0.35~4.57",
            semRecommendPriceAvg: 3.25,
            googleIndex: 12100,
            kuaishouIndex: 580,
            weiboIndex: 320,
          }],
          pagination: { pageIndex: 1, pageSize: 20, pageCount: 18, total: 52 },
        }),
        "The top-level pagination field and data.pagination describe the same page window.",
        COMMON_PAGINATION_FIELDS_DESCRIPTION,
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_longtail_keywords_5118,
    },
    async (input) =>
      toToolResult(
        "get_longtail_keywords_5118",
        await getLongtailKeywords5118Handler(input),
      ),
  );

  registerTool(
    "get_industry_frequency_words_5118",
    {
      title: "Get Industry Frequency Words 5118",
      description: joinDescription(
        "Sync industry frequency analysis via 5118 /tradeseg.",
        "Input fields: keyword=industry or topic seed term.",
        jsonExample("Example input JSON", { keyword: "减肥餐" }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        "Normalized data fields: data.frequencyWords[]=industry word rows where word=returned term; ratio=share of occurrences inside the returned set; count=raw occurrence count reported by 5118 for that term.",
        jsonExample("Example normalized data", {
          frequencyWords: [{ word: "做法", ratio: 5.58, count: 46826 }],
        }),
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_industry_frequency_words_5118,
    },
    async (input) =>
      toToolResult(
        "get_industry_frequency_words_5118",
        await getIndustryFrequencyWords5118Handler(input),
      ),
  );

  registerTool(
    "get_suggest_terms_5118",
    {
      title: "Get Suggest Terms 5118",
      description: joinDescription(
        "Sync suggestion mining via 5118 /suggest/list.",
        "Input fields: word=seed word to expand; platform=required vendor platform enum that decides the suggestion source.",
        jsonExample("Example input JSON", { word: "国庆假期", platform: "zhihu" }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        "Normalized data fields: data.suggestions[]=suggestion rows where term=returned suggestion term; sourceWord=original seed word echoed by the vendor; promotedTerm=vendor promoted or highlighted related term when present; platform=platform that produced the suggestion; addTime=vendor timestamp string when present.",
        jsonExample("Example normalized data", {
          suggestions: [{
            term: "国庆假期去哪玩",
            sourceWord: "国庆假期",
            promotedTerm: "国庆假期去哪玩",
            platform: "zhihu",
            addTime: "2022-09-24T11:28:10.027",
          }],
        }),
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_suggest_terms_5118,
    },
    async (input) =>
      toToolResult("get_suggest_terms_5118", await getSuggestTerms5118Handler(input)),
  );

  registerTool(
    "get_keyword_metrics_5118",
    {
      title: "Get Keyword Metrics 5118",
      description: joinDescription(
        "Async keyword metrics via 5118 /keywordparam/v2.",
        "Input fields: keywords=keyword list for submit or wait; executionMode=submit, poll, or wait; taskId=existing vendor task id for poll or resumed wait; maxWaitSeconds=client-side wait timeout; pollIntervalSeconds=client-side polling interval.",
        jsonExample("Example submit input JSON", { keywords: ["比特币价格"], executionMode: "submit" }),
        jsonExample("Example poll input JSON", { taskId: 40724567, executionMode: "poll" }),
        jsonExample("Example wait input JSON", {
          keywords: ["比特币价格"],
          executionMode: "wait",
          maxWaitSeconds: 120,
          pollIntervalSeconds: 60,
        }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        ASYNC_RESPONSE_STATE_DESCRIPTION,
        jsonExample("Example pending envelope", {
          executionStatus: "pending",
          taskId: 40724567,
          data: null,
        }),
        "Normalized data fields: data.items[]=keyword metric rows where keyword=keyword text; index=PC search index; mobileIndex=mobile search index; haosouIndex=360 search index; douyinIndex=Douyin search index; toutiaoIndex=Toutiao search index; googleIndex=Google search index; kuaishouIndex=Kuaishou search index; weiboIndex=Weibo search index; longKeywordCount=related long-tail keyword count; bidCompanyCount=advertiser count; cpc=estimated cost per click; competition=ad competition score; pcSearchVolume=estimated PC search volume; mobileSearchVolume=estimated mobile search volume; recommendedBidMin=minimum recommended bid; recommendedBidMax=maximum recommended bid; recommendedBidAvg=average recommended bid; ageBest=best matching age group label; ageBestValue=score for the best age group; sexMale=male audience ratio or score; sexFemale=female audience ratio or score; bidReason=vendor bidding recommendation reason.",
        jsonExample("Example completed data", {
          items: [{
            keyword: "比特币价格",
            index: 12000,
            mobileIndex: 9800,
            haosouIndex: 351,
            douyinIndex: 564,
            toutiaoIndex: 14,
            googleIndex: 0,
            kuaishouIndex: 0,
            weiboIndex: 0,
            longKeywordCount: 320,
            bidCompanyCount: 12,
            cpc: 6.5,
            competition: 1,
            pcSearchVolume: 258,
            mobileSearchVolume: 372,
            recommendedBidMin: 0,
            recommendedBidMax: 10.16,
            recommendedBidAvg: 4.54,
            ageBest: "20-29",
            ageBestValue: 54.99,
            sexMale: 48.71,
            sexFemale: 51.29,
            bidReason: "高频热搜词",
          }],
        }),
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_keyword_metrics_5118,
    },
    async (input) =>
      toToolResult("get_keyword_metrics_5118", await getKeywordMetrics5118Handler(input)),
  );

  registerTool(
    "get_mobile_traffic_keywords_5118",
    {
      title: "Get Mobile Traffic Keywords 5118",
      description: joinDescription(
        "Async mobile traffic keyword mining via 5118 /traffic.",
        "Input fields: keyword=seed term used by the vendor for submit and poll; pageIndex=1-based result page for completed data; pageSize=completed result page size; executionMode=submit, poll, or wait; taskId=existing vendor task id; maxWaitSeconds=client-side wait timeout; pollIntervalSeconds=client-side polling interval.",
        jsonExample("Example submit input JSON", { keyword: "比特币", executionMode: "submit" }),
        jsonExample("Example poll input JSON", { keyword: "比特币", taskId: 50724567, executionMode: "poll" }),
        jsonExample("Example wait input JSON", {
          keyword: "比特币",
          executionMode: "wait",
          maxWaitSeconds: 180,
          pollIntervalSeconds: 60,
        }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        ASYNC_RESPONSE_STATE_DESCRIPTION,
        jsonExample("Example pending envelope", {
          executionStatus: "pending",
          taskId: 50724567,
          data: null,
        }),
        "Normalized data fields: data.keywords[]=traffic keyword rows where keyword=returned traffic keyword text; index=PC search index; rank=ranking position reported by 5118; url=ranking page URL; weight=5118 page weight score; mobileIndex=mobile search index; mobileSearchVolume=estimated mobile search volume.",
        jsonExample("Example completed data", {
          keywords: [{
            keyword: "比特币行情",
            index: 8800,
            rank: 3,
            url: "https://example.com/btc",
            weight: 85,
            mobileIndex: 230,
            mobileSearchVolume: 340,
          }],
          pagination: { pageIndex: 1, pageSize: 20, pageCount: 1, total: 1 },
        }),
        "The top-level pagination field and data.pagination describe the same completed result page window.",
        COMMON_PAGINATION_FIELDS_DESCRIPTION,
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_mobile_traffic_keywords_5118,
    },
    async (input) =>
      toToolResult(
        "get_mobile_traffic_keywords_5118",
        await getMobileTrafficKeywords5118Handler(input),
      ),
  );

  registerTool(
    "get_domain_rank_keywords_5118",
    {
      title: "Get Domain Rank Keywords 5118",
      description: joinDescription(
        "Sync domain-wide PC rank keyword export via 5118 /keyword/domain/v2.",
        "Input fields: url=domain or host to query; pageIndex=1-based result page.",
        jsonExample("Example input JSON", { url: "example.com", pageIndex: 1 }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        "Normalized data fields: data.items[]=rank keyword rows where keyword=ranking keyword text; rank=ranking position; index=PC index; mobileIndex=mobile index; haosouIndex=360 index; pageTitle=ranking page title; pageUrl=ranking page URL; bidCompanyCount=advertiser count; competition=bid competition score; pcSearchVolume=PC search volume; mobileSearchVolume=mobile search volume; recommendedBidAvg=average recommended bid; googleIndex=Google index; kuaishouIndex=Kuaishou index; weiboIndex=Weibo index.",
        jsonExample("Example normalized data", {
          items: [{
            keyword: "水质分析仪表",
            rank: 1,
            index: 1063,
            mobileIndex: 919,
            haosouIndex: 1163,
            pageTitle: "示例标题",
            pageUrl: "https://example.com/page",
            bidCompanyCount: 317,
            competition: 1,
            pcSearchVolume: 240,
            mobileSearchVolume: 1433,
            recommendedBidAvg: 3.25,
            googleIndex: 12100,
            kuaishouIndex: 580,
            weiboIndex: 320,
          }],
          pagination: { pageIndex: 1, pageSize: 1000, pageCount: 25, total: 12345 },
        }),
        "The top-level pagination field and data.pagination describe the same page window.",
        COMMON_PAGINATION_FIELDS_DESCRIPTION,
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_domain_rank_keywords_5118,
    },
    async (input) =>
      toToolResult(
        "get_domain_rank_keywords_5118",
        await getDomainRankKeywords5118Handler(input),
      ),
  );

  registerTool(
    "get_bid_keywords_5118",
    {
      title: "Get Bid Keywords 5118",
      description: joinDescription(
        "Sync bid keyword mining via 5118 /bidword/v2.",
        "Input fields: url=domain to inspect; pageIndex=1-based result page; pageSize=rows per page, maximum 500; includeHighlight=whether upstream HTML highlight tags should be returned before normalization strips them into plain text fields.",
        jsonExample("Example input JSON", {
          url: "example.com",
          pageIndex: 1,
          pageSize: 20,
          includeHighlight: false,
        }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        "Normalized data fields: data.items[]=bid keyword rows where keyword=bid keyword text; title=bid title; intro=bid description; semPrice=bid price range text; pcSearchVolume=PC daily search volume; mobileSearchVolume=mobile daily search volume; competition=bid competition score; index=PC index; mobileIndex=mobile index; haosouIndex=360 index; recentBidCompanyCount=recent 30-day advertiser count; totalBidCompanyCount=all-time advertiser count; firstSeenAt=first discovery time; lastSeenAt=latest discovery time; recommendedBidAvg=average recommended bid; googleIndex=Google index; kuaishouIndex=Kuaishou index; weiboIndex=Weibo index.",
        jsonExample("Example normalized data", {
          items: [{
            keyword: "SEO优化",
            title: "竞价标题",
            intro: "竞价文案",
            semPrice: "5.60",
            pcSearchVolume: 384,
            mobileSearchVolume: 115,
            competition: 1,
            index: 330,
            mobileIndex: 212,
            haosouIndex: 0,
            recentBidCompanyCount: 15,
            totalBidCompanyCount: 45,
            firstSeenAt: "2024-01-15",
            lastSeenAt: "2025-03-01",
            recommendedBidAvg: 4.65,
            googleIndex: 1200,
            kuaishouIndex: 35,
            weiboIndex: 78,
          }],
          pagination: { pageIndex: 1, pageSize: 20, pageCount: 3, total: 1200 },
        }),
        "The top-level pagination field and data.pagination describe the same page window.",
        COMMON_PAGINATION_FIELDS_DESCRIPTION,
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_bid_keywords_5118,
    },
    async (input) =>
      toToolResult("get_bid_keywords_5118", await getBidKeywords5118Handler(input)),
  );

  registerTool(
    "get_site_weight_5118",
    {
      title: "Get Site Weight 5118",
      description: joinDescription(
        "Sync site weight lookup via 5118 /weight.",
        "Input fields: url=domain or host to inspect.",
        jsonExample("Example input JSON", { url: "example.com" }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        "Normalized data fields: data.weights[]=weight rows where type=upstream weight type name such as BaiduPCWeight; weight=weight label such as 5, 8+, or 5-.",
        jsonExample("Example normalized data", {
          weights: [
            { type: "BaiduPCWeight", weight: "10+" },
            { type: "BaiduMobileWeight", weight: "5-" },
          ],
        }),
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_site_weight_5118,
    },
    async (input) => toToolResult("get_site_weight_5118", await getSiteWeight5118Handler(input)),
  );

  registerTool(
    "get_pc_rank_snapshot_5118",
    {
      title: "Get PC Rank Snapshot 5118",
      description: joinDescription(
        "Async PC rank snapshot via 5118 /morerank/baidupc.",
        "Input fields: url=target domain for submit; keywords=keyword list for submit; checkRow=maximum ranking depth to inspect, up to 50; executionMode=submit, poll, or wait; taskId=existing vendor task id; maxWaitSeconds=client-side wait timeout; pollIntervalSeconds=client-side polling interval.",
        jsonExample("Example submit input JSON", {
          url: "example.com",
          keywords: ["SEO优化", "关键词挖掘"],
          executionMode: "submit",
        }),
        jsonExample("Example poll input JSON", { taskId: 123456, executionMode: "poll" }),
        jsonExample("Example wait input JSON", {
          url: "example.com",
          keywords: ["SEO优化"],
          executionMode: "wait",
          maxWaitSeconds: 180,
          pollIntervalSeconds: 60,
        }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        ASYNC_RESPONSE_STATE_DESCRIPTION,
        jsonExample("Example pending envelope", {
          executionStatus: "pending",
          taskId: 123456,
          data: null,
        }),
        "Normalized data fields: data.rankings[]=keyword rows where keyword=monitored keyword; searchEngine=search engine id; ip=probe IP; area=probe area; network=probe network; ranks[]=ranking rows where siteUrl=ranking domain; rank=ranking position; pageTitle=page title; pageUrl=ranking page URL; top100=Top100 keyword count; siteWeight=5118 site weight label.",
        jsonExample("Example completed data", {
          rankings: [{
            keyword: "SEO优化",
            searchEngine: "baidupc",
            ip: "1.2.3.4",
            area: "广东",
            network: "电信",
            ranks: [{
              siteUrl: "www.example.com",
              rank: 1,
              pageTitle: "SEO优化教程",
              pageUrl: "https://www.example.com/seo",
              top100: 5200,
              siteWeight: "6",
            }],
          }],
        }),
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_pc_rank_snapshot_5118,
    },
    async (input) =>
      toToolResult("get_pc_rank_snapshot_5118", await getPcRankSnapshot5118Handler(input)),
  );

  registerTool(
    "get_mobile_rank_snapshot_5118",
    {
      title: "Get Mobile Rank Snapshot 5118",
      description: joinDescription(
        "Async mobile rank snapshot via 5118 /morerank/baidumobile.",
        "Input fields: url=target domain for submit; keywords=keyword list for submit; checkRow=maximum ranking depth to inspect, up to 100; executionMode=submit, poll, or wait; taskId=existing vendor task id; maxWaitSeconds=client-side wait timeout; pollIntervalSeconds=client-side polling interval.",
        jsonExample("Example submit input JSON", {
          url: "m.example.com",
          keywords: ["SEO优化"],
          executionMode: "submit",
        }),
        jsonExample("Example poll input JSON", { taskId: 123457, executionMode: "poll" }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        ASYNC_RESPONSE_STATE_DESCRIPTION,
        jsonExample("Example pending envelope", {
          executionStatus: "pending",
          taskId: 123457,
          data: null,
        }),
        "Normalized data fields follow the same schema as get_pc_rank_snapshot_5118, but searchEngine typically resolves to baidumobile and checkRow supports up to 100.",
        jsonExample("Example completed data", {
          rankings: [{
            keyword: "SEO优化",
            searchEngine: "baidumobile",
            ip: "1.2.3.4",
            area: "广东",
            network: "电信",
            ranks: [{
              siteUrl: "m.example.com",
              rank: 2,
              pageTitle: "移动SEO优化教程",
              pageUrl: "https://m.example.com/seo",
              top100: 4200,
              siteWeight: "5",
            }],
          }],
        }),
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_mobile_rank_snapshot_5118,
    },
    async (input) =>
      toToolResult(
        "get_mobile_rank_snapshot_5118",
        await getMobileRankSnapshot5118Handler(input),
      ),
  );

  registerTool(
    "check_url_indexing_5118",
    {
      title: "Check URL Indexing 5118",
      description: joinDescription(
        "Async URL indexing check via 5118 /include.",
        "Input fields: urls=list of URLs to submit; executionMode=submit, poll, or wait; taskId=existing vendor task id; maxWaitSeconds=client-side wait timeout; pollIntervalSeconds=client-side polling interval.",
        jsonExample("Example submit input JSON", {
          urls: ["https://www.example.com/page1", "https://www.example.com/page2"],
          executionMode: "submit",
        }),
        jsonExample("Example poll input JSON", { taskId: 223344, executionMode: "poll" }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        ASYNC_RESPONSE_STATE_DESCRIPTION,
        jsonExample("Example pending envelope", {
          executionStatus: "pending",
          taskId: 223344,
          data: null,
        }),
        "Normalized data fields: data.items[]=URL rows where url=submitted URL; status=indexing status code; title=indexed page title when available; snapshotTime=snapshot or inclusion time; total=submitted URL count; checkStatus=upstream job status; submitTime=submit timestamp; finishedTime=finished timestamp.",
        jsonExample("Example completed data", {
          items: [{
            url: "https://www.example.com/page1",
            status: 1,
            title: "Example Page",
            snapshotTime: "2017-10-11 03:07:00",
          }],
          total: 1,
          checkStatus: 1,
          submitTime: "1507812930",
          finishedTime: "1507812960",
        }),
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.check_url_indexing_5118,
    },
    async (input) =>
      toToolResult("check_url_indexing_5118", await checkUrlIndexing5118Handler(input)),
  );

  registerTool(
    "get_pc_site_rank_keywords_5118",
    {
      title: "Get PC Site Rank Keywords 5118",
      description: joinDescription(
        "Sync PC site rank keyword export via 5118 /keyword/pc/v2.",
        "Input fields: url=domain or host to query; pageIndex=1-based result page.",
        jsonExample("Example input JSON", { url: "example.com", pageIndex: 1 }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        "Normalized data fields: data.items[]=PC site rank rows where keyword=ranking keyword text; rank=ranking position; pageTitle=ranking page title; pageUrl=ranking page URL; bidCompanyCount=advertiser count; longKeywordCount=related long-tail keyword count; index=PC index; mobileIndex=mobile index; haosouIndex=360 index; douyinIndex=Douyin index; toutiaoIndex=Toutiao index; competition=bid competition score; pcSearchVolume=PC search volume; mobileSearchVolume=mobile search volume; semReason=vendor traffic characteristic text; semPrice=SEM reference price range; recommendedBidAvg=average recommended bid; googleIndex=Google index; kuaishouIndex=Kuaishou index; weiboIndex=Weibo index.",
        jsonExample("Example normalized data", {
          items: [{
            keyword: "水质分析仪表",
            rank: 1,
            pageTitle: "示例标题",
            pageUrl: "https://example.com/page",
            bidCompanyCount: 317,
            longKeywordCount: 696,
            index: 1063,
            mobileIndex: 919,
            haosouIndex: 1163,
            douyinIndex: 89,
            toutiaoIndex: 256,
            competition: 1,
            pcSearchVolume: 240,
            mobileSearchVolume: 1433,
            semReason: "高频热词",
            semPrice: "0.35~4.57",
            recommendedBidAvg: 3.25,
            googleIndex: 12100,
            kuaishouIndex: 580,
            weiboIndex: 320,
          }],
          pagination: { pageIndex: 1, pageSize: 500, pageCount: 1182, total: 590511 },
        }),
        "The top-level pagination field and data.pagination describe the same page window.",
        COMMON_PAGINATION_FIELDS_DESCRIPTION,
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_pc_site_rank_keywords_5118,
    },
    async (input) =>
      toToolResult(
        "get_pc_site_rank_keywords_5118",
        await getPcSiteRankKeywords5118Handler(input),
      ),
  );

  registerTool(
    "get_mobile_site_rank_keywords_5118",
    {
      title: "Get Mobile Site Rank Keywords 5118",
      description: joinDescription(
        "Sync mobile site rank keyword export via 5118 /keyword/mobile/v2.",
        "Input fields: url=domain or host to query; pageIndex=1-based result page.",
        jsonExample("Example input JSON", { url: "m.example.com", pageIndex: 1 }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        "Normalized data fields follow the same schema as get_pc_site_rank_keywords_5118, but the upstream list root is mobile-oriented and ranking rows typically resolve to mobile landing pages.",
        jsonExample("Example normalized data", {
          items: [{
            keyword: "黄浦江源安吉白茶",
            rank: 1,
            pageTitle: "黄浦江源安吉白茶价格报价行情-京东",
            pageUrl: "https://m.example.com/page",
            bidCompanyCount: 84,
            longKeywordCount: 155,
            index: 0,
            mobileIndex: 919,
            haosouIndex: 1163,
            douyinIndex: 89,
            toutiaoIndex: 256,
            competition: 1,
            pcSearchVolume: 240,
            mobileSearchVolume: 1433,
            semReason: null,
            semPrice: "0.35~4.57",
            recommendedBidAvg: 3.25,
            googleIndex: 12100,
            kuaishouIndex: 580,
            weiboIndex: 320,
          }],
          pagination: { pageIndex: 1, pageSize: 500, pageCount: 416, total: 207596 },
        }),
        "The top-level pagination field and data.pagination describe the same page window.",
        COMMON_PAGINATION_FIELDS_DESCRIPTION,
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_mobile_site_rank_keywords_5118,
    },
    async (input) =>
      toToolResult(
        "get_mobile_site_rank_keywords_5118",
        await getMobileSiteRankKeywords5118Handler(input),
      ),
  );

  registerTool(
    "get_bid_sites_5118",
    {
      title: "Get Bid Sites 5118",
      description: joinDescription(
        "Sync bid site mining via 5118 /bidsite.",
        "Input fields: keyword=seed keyword to inspect; pageIndex=1-based result page; pageSize=rows per page, maximum 500; includeHighlight=whether upstream HTML highlight tags should be returned before normalization strips them into plain text fields.",
        jsonExample("Example input JSON", {
          keyword: "SEO优化",
          pageIndex: 1,
          pageSize: 20,
          includeHighlight: false,
        }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        "Normalized data fields: data.items[]=bid site rows where title=bid headline; intro=bid copy text; siteTitle=website title; siteUrl=domain or host; fullUrl=landing URL; companyName=matched company name; baiduPcWeight=5118 Baidu PC weight label; bidCount=number of bid discoveries; lastSeenAt=latest discovery time; firstSeenAt=earliest discovery time.",
        jsonExample("Example normalized data", {
          items: [{
            title: "数据仪表,商业智能BI软件",
            intro: "竞价文案",
            siteTitle: "网站标题",
            siteUrl: "sem.example.com",
            fullUrl: "https://sem.example.com/landing",
            companyName: "示例科技有限公司",
            baiduPcWeight: "2",
            bidCount: 14,
            lastSeenAt: "2023-11-23T22:04:00",
            firstSeenAt: "2020-12-22T22:03:00",
          }],
          pagination: { pageIndex: 1, pageSize: 20, pageCount: 1, total: 495 },
        }),
        "The top-level pagination field and data.pagination describe the same page window.",
        COMMON_PAGINATION_FIELDS_DESCRIPTION,
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_bid_sites_5118,
    },
    async (input) => toToolResult("get_bid_sites_5118", await getBidSites5118Handler(input)),
  );

  registerTool(
    "get_pc_top50_sites_5118",
    {
      title: "Get PC Top50 Sites 5118",
      description: joinDescription(
        "Async PC top-50 site snapshot via 5118 /keywordrank/baidupc.",
        "Input fields: keywords=keyword list for submit; checkRow=maximum ranking depth to inspect, up to 100; executionMode=submit, poll, or wait; taskId=existing vendor task id; maxWaitSeconds=client-side wait timeout; pollIntervalSeconds=client-side polling interval.",
        jsonExample("Example submit input JSON", {
          keywords: ["SEO优化", "关键词挖掘"],
          executionMode: "submit",
        }),
        jsonExample("Example poll input JSON", { taskId: 123458, executionMode: "poll" }),
        jsonExample("Example wait input JSON", {
          keywords: ["SEO优化"],
          executionMode: "wait",
          maxWaitSeconds: 180,
          pollIntervalSeconds: 60,
        }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        ASYNC_RESPONSE_STATE_DESCRIPTION,
        jsonExample("Example pending envelope", {
          executionStatus: "pending",
          taskId: 123458,
          data: null,
        }),
        "Normalized data fields: data.siteSnapshots[]=keyword snapshot rows where keyword=monitored keyword; searchEngine=search engine id; ip=probe IP; area=probe area; network=probe network; checkedAt=vendor snapshot time; ranks[]=ranking rows where siteUrl=ranking domain; rank=ranking position; pageTitle=page title; pageUrl=page URL; top100=Top100 keyword count; siteWeight=5118 site weight label.",
        jsonExample("Example completed data", {
          siteSnapshots: [{
            keyword: "SEO优化",
            searchEngine: "baidupc",
            ip: "1.2.3.4",
            area: "广东",
            network: "电信",
            checkedAt: "2026-03-18 10:30:00",
            ranks: [{
              siteUrl: "www.example.com",
              rank: 1,
              pageTitle: "SEO优化教程",
              pageUrl: "https://www.example.com/seo",
              top100: 5200,
              siteWeight: "6",
            }],
          }],
        }),
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_pc_top50_sites_5118,
    },
    async (input) =>
      toToolResult("get_pc_top50_sites_5118", await getPcTop50Sites5118Handler(input)),
  );

  registerTool(
    "get_mobile_top50_sites_5118",
    {
      title: "Get Mobile Top50 Sites 5118",
      description: joinDescription(
        "Async mobile top-50 site snapshot via 5118 /keywordrank/baidumobile.",
        "Input fields follow the same schema as get_pc_top50_sites_5118, but searchEngine typically resolves to baidumobile and the returned page URLs usually point to mobile SERP results.",
        jsonExample("Example submit input JSON", {
          keywords: ["SEO优化"],
          executionMode: "submit",
        }),
        jsonExample("Example poll input JSON", { taskId: 123459, executionMode: "poll" }),
        COMMON_RESPONSE_FIELDS_DESCRIPTION,
        ASYNC_RESPONSE_STATE_DESCRIPTION,
        jsonExample("Example pending envelope", {
          executionStatus: "pending",
          taskId: 123459,
          data: null,
        }),
        jsonExample("Example completed data", {
          siteSnapshots: [{
            keyword: "SEO优化",
            searchEngine: "baidumobile",
            ip: "1.2.3.5",
            area: "广东",
            network: "联通",
            checkedAt: "2026-03-18 10:30:00",
            ranks: [{
              siteUrl: "m.example.com",
              rank: 2,
              pageTitle: "移动SEO优化教程",
              pageUrl: "https://m.example.com/seo",
              top100: 3200,
              siteWeight: "5",
            }],
          }],
        }),
      ),
      inputSchema: TOOL_INPUT_SCHEMAS.get_mobile_top50_sites_5118,
    },
    async (input) =>
      toToolResult(
        "get_mobile_top50_sites_5118",
        await getMobileTop50Sites5118Handler(input),
      ),
  );

  assertToolCoverage();

  return server;
}
