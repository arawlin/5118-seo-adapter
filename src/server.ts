import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { API_TOOL_NAMES } from "./config/apiKeyRegistry.js";
import { checkUrlIndexing5118Handler } from "./tools/checkUrlIndexing5118.js";
import { getBidKeywords5118Handler } from "./tools/getBidKeywords5118.js";
import { getDomainRankKeywords5118Handler } from "./tools/getDomainRankKeywords5118.js";
import { getIndustryFrequencyWords5118Handler } from "./tools/getIndustryFrequencyWords5118.js";
import { getKeywordMetrics5118Handler } from "./tools/getKeywordMetrics5118.js";
import { getLongtailKeywords5118Handler } from "./tools/getLongtailKeywords5118.js";
import { getMobileRankSnapshot5118Handler } from "./tools/getMobileRankSnapshot5118.js";
import { getMobileTrafficKeywords5118Handler } from "./tools/getMobileTrafficKeywords5118.js";
import { getPcRankSnapshot5118Handler } from "./tools/getPcRankSnapshot5118.js";
import { getSiteWeight5118Handler } from "./tools/getSiteWeight5118.js";
import {
  getSuggestTerms5118Handler,
  SUGGEST_PLATFORM_VALUES,
} from "./tools/getSuggestTerms5118.js";

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
      inputSchema: {
        keyword: z
          .string()
          .min(1)
          .describe("Required seed keyword. This is the root term that 5118 expands into long-tail keywords."),
        pageIndex: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional 1-based result page number. Use it to read a later page of normalized keywords. Defaults to 1."),
        pageSize: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Optional number of rows per page. Maximum 100. Larger values return more keywords per request."),
        sortField: z
          .string()
          .optional()
          .describe("Optional vendor sort selector. Common values: 2=bidCompanyCount advertiser count, 3=longKeywordCount long-tail count, 4=index PC search index, 5=mobileIndex mobile search index."),
        sortType: z
          .enum(["asc", "desc"])
          .optional()
          .describe("Optional sort direction for sortField. asc=low to high, desc=high to low."),
        filter: z
          .string()
          .optional()
          .describe("Optional vendor quick filter selector. Common values: 1=all results, 2=traffic words, 9=keywords with bidding ads."),
        filterDate: z
          .string()
          .optional()
          .describe("Optional vendor filter date in yyyy-MM-dd format. Use it when you need a specific date snapshot supported by 5118."),
      },
    },
    async (input) => toToolResult(await getLongtailKeywords5118Handler(input)),
  );

  server.registerTool(
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
      inputSchema: {
        keyword: z
          .string()
          .min(1)
          .describe("Required industry or topic seed keyword. 5118 uses it to calculate frequently co-occurring industry words."),
      },
    },
    async (input) => toToolResult(await getIndustryFrequencyWords5118Handler(input)),
  );

  server.registerTool(
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
      inputSchema: {
        word: z
          .string()
          .min(1)
          .describe("Required seed word used to query related suggestion terms from the selected platform."),
        platform: z
          .enum(SUGGEST_PLATFORM_VALUES)
          .describe("Required official vendor platform enum. Examples include baidu, baidumobile, zhihu, douyin, and amazon. The platform changes the suggestion corpus."),
      },
    },
    async (input) => toToolResult(await getSuggestTerms5118Handler(input)),
  );

  server.registerTool(
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
      inputSchema: {
        keywords: z
          .array(z.string().min(1))
          .max(50)
          .optional()
          .describe("Optional keyword list to submit to 5118. Required for submit mode, and also required for wait mode when taskId is not provided. Maximum 50 keywords per task."),
        executionMode: z
          .enum(["submit", "poll", "wait"])
          .optional()
          .describe("Optional async execution mode. submit=create a vendor task and return taskId; poll=query an existing task by taskId; wait=submit or resume a task and keep polling until completion or timeout."),
        taskId: z
          .union([z.string(), z.number()])
          .optional()
          .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling an already-created task."),
        maxWaitSeconds: z
          .number()
          .positive()
          .optional()
          .describe("Optional maximum client-side wait time in seconds for wait mode. The tool stops polling and returns the latest pending state when this limit is reached."),
        pollIntervalSeconds: z
          .number()
          .positive()
          .optional()
          .describe("Optional polling interval in seconds for wait mode. Defaults to 60 seconds when omitted."),
      },
    },
    async (input) => toToolResult(await getKeywordMetrics5118Handler(input)),
  );

  server.registerTool(
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
      inputSchema: {
        keyword: z
          .string()
          .min(1)
          .optional()
          .describe("Optional seed keyword to mine. Required for submit mode, and also required for poll mode because the upstream 5118 poll request still expects the original keyword."),
        pageIndex: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional 1-based page number for completed traffic keyword results. Defaults to 1."),
        pageSize: z
          .number()
          .int()
          .positive()
          .max(500)
          .optional()
          .describe("Optional completed result page size. Maximum 500. Defaults to 20."),
        executionMode: z
          .enum(["submit", "poll", "wait"])
          .optional()
          .describe("Optional async execution mode. submit=create a vendor task; poll=check an existing task; wait=submit or resume and keep polling until completion or timeout. Defaults to submit for this long-running API."),
        taskId: z
          .union([z.string(), z.number()])
          .optional()
          .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling."),
        maxWaitSeconds: z
          .number()
          .positive()
          .optional()
          .describe("Optional maximum client-side wait time in seconds for wait mode before timeout. The tool returns the latest pending state if the limit is reached first."),
        pollIntervalSeconds: z
          .number()
          .positive()
          .optional()
          .describe("Optional polling interval in seconds for wait mode. Defaults to the shared async poll interval when omitted."),
      },
    },
    async (input) => toToolResult(await getMobileTrafficKeywords5118Handler(input)),
  );

  server.registerTool(
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
      inputSchema: {
        url: z
          .string()
          .min(1)
          .describe("Required domain or host to inspect for PC ranking keywords, including subdomains when supported by 5118."),
        pageIndex: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional 1-based result page number. Defaults to 1."),
      },
    },
    async (input) => toToolResult(await getDomainRankKeywords5118Handler(input)),
  );

  server.registerTool(
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
      inputSchema: {
        url: z
          .string()
          .min(1)
          .describe("Required domain or host to inspect for bid keywords."),
        pageIndex: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Optional 1-based result page number. Defaults to 1."),
        pageSize: z
          .number()
          .int()
          .positive()
          .max(500)
          .optional()
          .describe("Optional number of rows per page. Maximum 500. Defaults to 20 for adapter responses."),
        includeHighlight: z
          .boolean()
          .optional()
          .describe("Optional upstream highlight toggle. true requests highlighted HTML from 5118; false keeps the upstream request plain."),
      },
    },
    async (input) => toToolResult(await getBidKeywords5118Handler(input)),
  );

  server.registerTool(
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
      inputSchema: {
        url: z
          .string()
          .min(1)
          .describe("Required domain or host to inspect for 5118 weight values."),
      },
    },
    async (input) => toToolResult(await getSiteWeight5118Handler(input)),
  );

  server.registerTool(
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
      inputSchema: {
        url: z
          .string()
          .min(1)
          .optional()
          .describe("Optional target domain for submit or wait mode. Required unless taskId is used to resume polling."),
        keywords: z
          .array(z.string().min(1))
          .max(50)
          .optional()
          .describe("Optional keyword list for submit or wait mode. Required unless taskId is used to resume polling. Maximum 50 keywords per task."),
        checkRow: z
          .number()
          .int()
          .positive()
          .max(50)
          .optional()
          .describe("Optional maximum ranking depth to inspect. Maximum 50 for the PC endpoint."),
        executionMode: z
          .enum(["submit", "poll", "wait"])
          .optional()
          .describe("Optional async execution mode. submit=create a vendor task; poll=check an existing task; wait=submit or resume and keep polling until completion or timeout."),
        taskId: z
          .union([z.string(), z.number()])
          .optional()
          .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling."),
        maxWaitSeconds: z
          .number()
          .positive()
          .optional()
          .describe("Optional maximum client-side wait time in seconds for wait mode."),
        pollIntervalSeconds: z
          .number()
          .positive()
          .optional()
          .describe("Optional polling interval in seconds for wait mode. Defaults to 60 seconds."),
      },
    },
    async (input) => toToolResult(await getPcRankSnapshot5118Handler(input)),
  );

  server.registerTool(
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
      inputSchema: {
        url: z
          .string()
          .min(1)
          .optional()
          .describe("Optional target domain for submit or wait mode. Required unless taskId is used to resume polling."),
        keywords: z
          .array(z.string().min(1))
          .max(50)
          .optional()
          .describe("Optional keyword list for submit or wait mode. Required unless taskId is used to resume polling. Maximum 50 keywords per task."),
        checkRow: z
          .number()
          .int()
          .positive()
          .max(100)
          .optional()
          .describe("Optional maximum ranking depth to inspect. Maximum 100 for the mobile endpoint."),
        executionMode: z
          .enum(["submit", "poll", "wait"])
          .optional()
          .describe("Optional async execution mode. submit=create a vendor task; poll=check an existing task; wait=submit or resume and keep polling until completion or timeout."),
        taskId: z
          .union([z.string(), z.number()])
          .optional()
          .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling."),
        maxWaitSeconds: z
          .number()
          .positive()
          .optional()
          .describe("Optional maximum client-side wait time in seconds for wait mode."),
        pollIntervalSeconds: z
          .number()
          .positive()
          .optional()
          .describe("Optional polling interval in seconds for wait mode. Defaults to 60 seconds."),
      },
    },
    async (input) => toToolResult(await getMobileRankSnapshot5118Handler(input)),
  );

  server.registerTool(
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
      inputSchema: {
        urls: z
          .array(z.string().min(1))
          .max(200)
          .optional()
          .describe("Optional URL list to submit for indexing checks. Required unless taskId is used to resume polling. Maximum 200 URLs per task."),
        executionMode: z
          .enum(["submit", "poll", "wait"])
          .optional()
          .describe("Optional async execution mode. submit=create a vendor task; poll=check an existing task; wait=submit or resume and keep polling until completion or timeout."),
        taskId: z
          .union([z.string(), z.number()])
          .optional()
          .describe("Optional existing vendor task identifier. Required in poll mode, and can also be used in wait mode to resume polling."),
        maxWaitSeconds: z
          .number()
          .positive()
          .optional()
          .describe("Optional maximum client-side wait time in seconds for wait mode."),
        pollIntervalSeconds: z
          .number()
          .positive()
          .optional()
          .describe("Optional polling interval in seconds for wait mode. Defaults to 60 seconds."),
      },
    },
    async (input) => toToolResult(await checkUrlIndexing5118Handler(input)),
  );

  return server;
}
