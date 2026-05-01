# Standalone Usage

This document is also available in [Chinese](./standalone-usage-zh.md).

## Scope

This project is a standalone MCP server that wraps official 5118 APIs.

The current implementation includes 16 tools.

Current set:

- `get_longtail_keywords_5118`
- `get_industry_frequency_words_5118`
- `get_suggest_terms_5118`
- `get_keyword_metrics_5118`
- `get_mobile_traffic_keywords_5118`

Wave 1:

- `get_domain_rank_keywords_5118`
- `get_bid_keywords_5118`
- `get_site_weight_5118`
- `get_pc_rank_snapshot_5118`
- `get_mobile_rank_snapshot_5118`
- `check_url_indexing_5118`

Wave 2:

- `get_pc_site_rank_keywords_5118`
- `get_mobile_site_rank_keywords_5118`
- `get_bid_sites_5118`
- `get_pc_top50_sites_5118`
- `get_mobile_top50_sites_5118`

## Environment Variables

Set one API key env var per tool you plan to call:

- `API_5118_LONGTAIL_V2`
- `API_5118_FREQ_WORDS`
- `API_5118_SUGGEST`
- `API_5118_KW_PARAM_V2`
- `API_5118_TRAFFIC`
- `API_5118_DOMAIN_V2`
- `API_5118_BIDWORD_V2`
- `API_5118_WEIGHT`
- `API_5118_RANK_PC`
- `API_5118_RANK_MOBILE`
- `API_5118_INCLUDE`
- `API_5118_BAIDUPC_V2`
- `API_5118_MOBILE_V2`
- `API_5118_BIDSITE`
- `API_5118_KWRANK_PC`
- `API_5118_KWRANK_MOBILE`

### MCP-side Request Control

Request throttling and retry are implemented in MCP. Skills should call tools
directly and should not implement separate sleep/retry loops.

Optional MCP request-control env vars:

- `MCP_5118_MIN_TIME_MS` (default `1000`)
- `MCP_5118_MAX_CONCURRENT` (default `1`)
- `MCP_5118_RESERVOIR` (default `2`)
- `MCP_5118_MAX_RETRIES` (default `3`)
- `MCP_5118_BASE_BACKOFF_MS` (default `800`)
- `MCP_5118_MAX_BACKOFF_MS` (default `3200`)
- `MCP_5118_JITTER_MS` (default `300`)

## Build and Run

```bash
npm install
npm run build
node dist/index.js
```

## Live Runner

Use `scripts/test-live-gate.mjs` for manual live checks after the build output
is available.

Built-in scenarios:

- `wave-one` -> `examples/wave-one-sequence.json`, covering the current-set tools plus all Wave 1 tools
- `wave-two` -> `examples/wave-two-sequence.json`, covering all Wave 2 tools
- `all-tools` -> `examples/all-tools-sequence.json`, covering every implemented tool in one run

Single-tool mode accepts either a full MCP tool name or one of these aliases:

| Alias | MCP tool |
| --- | --- |
| `longtail` | `get_longtail_keywords_5118` |
| `frequency` | `get_industry_frequency_words_5118` |
| `suggest` | `get_suggest_terms_5118` |
| `metrics` | `get_keyword_metrics_5118` |
| `traffic` | `get_mobile_traffic_keywords_5118` |
| `domain-rank` | `get_domain_rank_keywords_5118` |
| `bid-keywords` | `get_bid_keywords_5118` |
| `weight` | `get_site_weight_5118` |
| `rank-pc` | `get_pc_rank_snapshot_5118` |
| `rank-mobile` | `get_mobile_rank_snapshot_5118` |
| `include` | `check_url_indexing_5118` |
| `indexing` | `check_url_indexing_5118` |
| `pc-site-rank` | `get_pc_site_rank_keywords_5118` |
| `mobile-site-rank` | `get_mobile_site_rank_keywords_5118` |
| `bid-sites` | `get_bid_sites_5118` |
| `top50-pc` | `get_pc_top50_sites_5118` |
| `top50-mobile` | `get_mobile_top50_sites_5118` |

Representative commands:

```bash
API_5118_DOMAIN_V2=xxxx npm run test:live -- --tool domain-rank --url www.baidu.com --pageIndex 1
API_5118_INCLUDE=xxxx npm run test:live -- --tool include --urls https://www.baidu.com/,https://www.jd.com/ --executionMode submit
API_5118_RANK_PC=xxxx npm run test:live -- --tool rank-pc --url www.baidu.com --keywords "比特币价格" --executionMode submit
API_5118_BAIDUPC_V2=xxxx API_5118_MOBILE_V2=xxxx API_5118_BIDSITE=xxxx API_5118_KWRANK_PC=xxxx API_5118_KWRANK_MOBILE=xxxx npm run test:live -- --scenario wave-two
```

Use `--sequence <path>` when you want to run a custom JSON scenario file instead
of the built-in `wave-one`, `wave-two`, or `all-tools` sequence.

## Stdio Transport Example

Use [examples/vscode-mcp.stdio.example.json](../../examples/vscode-mcp.stdio.example.json)
as the reference entry.

The example env block now lists all supported tool API keys. Remove any unused
entries for your local setup if you only plan to expose a subset of tools.

## Tool Execution Model

- Sync tools return normalized data immediately.
- Async tools support `submit`, `poll`, and `wait`.
- Async pending states include vendor code `101` and `200104`.

## Response Envelope

Every tool returns a unified envelope:

```json
{
  "source": "5118",
  "sourceType": "official-api-backed",
  "tool": "get_keyword_metrics_5118",
  "apiName": "Keyword Search Volume Info API v2",
  "endpoint": "/keywordparam/v2",
  "mode": "async",
  "executionStatus": "completed",
  "taskId": 40724567,
  "pagination": null,
  "data": {},
  "warnings": [],
  "raw": {}
}
```

### Envelope Field Reference

| Field | Type | Meaning |
| --- | --- | --- |
| `source` | string | Fixed upstream source identifier. Always `5118`. |
| `sourceType` | string | Fixed source classification. Always `official-api-backed`. |
| `tool` | string | MCP tool name that produced the response. |
| `apiName` | string | Human-readable vendor API name. |
| `endpoint` | string | Vendor endpoint path. |
| `mode` | string | `sync` for sync tools, `async` for async tools. |
| `executionStatus` | string | Normalized execution state. Async tools mainly return `pending` or `completed`. |
| `taskId` | string or number or null | Async task identifier. Present for async pending responses and usually preserved on completion. |
| `pagination` | object or null | Normalized pagination object when the tool supports paging. |
| `data` | object or array or null | Normalized business payload. `null` while an async task is still pending. |
| `warnings` | string[] | Non-fatal adapter warnings. Currently usually empty. |
| `raw` | unknown | Original vendor payload without normalization. |

### Structured Output Schema

- Every tool now publishes a full `outputSchema` in MCP tool metadata.
- Each tool's register function under `src/tools/` declares its own
  `outputSchema` during registration.
- Each tool validates its own normalized envelope against its
  `outputSchema` before returning MCP structured content.
- `src/server.ts` now only serializes already-validated payloads.
- If the validation fails, the call throws an MCP tool error instead of
  returning a partially valid envelope.

### Structured Input Schema

- Each tool defines its own input schema in its own module under
  `src/tools/`.
- The schema used for MCP registration is the same object used by that
  tool's handler typing, so there is now a single source of truth per tool.
- Tool registration in `src/server.ts` is delegated to tool-local register
  functions, keeping the server as a thin orchestration layer.

### Error Behavior

Tool failures are normally raised as MCP tool errors instead of returning an
envelope with `executionStatus: "failed"`. Clients should treat a returned
envelope as a successful adapter response and branch on `executionStatus` for
async task state.

## Current Tool Reference

This section maps each currently implemented MCP tool to its official 5118 API
detail page and documents the MCP-facing request and response contract.

The compact table below covers all 16 tools. The long-form sections that follow
focus on the current-set tools and representative async patterns. For the full
Wave 1 and Wave 2 field matrix, also see
[docs/5118-mcp-engineering-spec.md](../5118-mcp-engineering-spec.md).

### Tool-Local Type Imports

The unified package-level type entry has been removed. Import normalized
contracts directly from the owning tool module, and import shared envelope
contracts from `toolContracts`:

```ts
import type {
  GetKeywordMetrics5118Data,
  GetKeywordMetrics5118Item,
} from "5118-seo-adapter/dist/tools/getKeywordMetrics5118.js";
import type { GetLongtailKeywords5118Data } from "5118-seo-adapter/dist/tools/getLongtailKeywords5118.js";
import type {
  PaginationInfo,
  ResponseEnvelope,
} from "5118-seo-adapter/dist/types/toolContracts.js";
```

Use the `Get...Data` and `Get...Item` aliases from each tool module as the
preferred contract names. The generic names such as `KeywordMetricsData` are
also exported by the same module for compatibility.

| MCP tool | Endpoint | Official API | Detail URL | Normalized data key |
| --- | --- | --- | --- | --- |
| `get_longtail_keywords_5118` | `/keyword/word/v2` | Massive Long-tail Keyword Mining API v2 | [Detail](https://www.5118.com/apistore/detail/8cf3d6ed-2b12-ed11-8da8-e43d1a103141) | `data.keywords[]` |
| `get_industry_frequency_words_5118` | `/tradeseg` | Industry Frequency Analysis API | [Detail](https://www.5118.com/apistore/detail/19bb1381-bcbc-ec11-8da8-e43d1a103141) | `data.frequencyWords[]` |
| `get_suggest_terms_5118` | `/suggest/list` | Suggestion Mining API | [Detail](https://www.5118.com/apistore/detail/597e2193-9490-eb11-8daf-e4434bdf6706) | `data.suggestions[]` |
| `get_keyword_metrics_5118` | `/keywordparam/v2` | Keyword Search Volume Info API v2 | [Detail](https://www.5118.com/apistore/detail/90f3d6ed-2b12-ed11-8da8-e43d1a103141) | `data.items[]` |
| `get_mobile_traffic_keywords_5118` | `/traffic` | Mobile Traffic Keyword Mining API | [Detail](https://www.5118.com/apistore/detail/540c9870-b2b9-e911-80d2-1866da4dbcc0) | `data.keywords[]` |
| `get_domain_rank_keywords_5118` | `/keyword/domain/v2` | Domain Ranking Keywords API v2 | [Detail](https://www.5118.com/apistore/detail/8ff3d6ed-2b12-ed11-8da8-e43d1a103141) | `data.items[]` |
| `get_bid_keywords_5118` | `/bidword/v2` | Site Bid Keywords API v2 | [Detail](https://www.5118.com/apistore/detail/8af3d6ed-2b12-ed11-8da8-e43d1a103141) | `data.items[]` |
| `get_site_weight_5118` | `/weight` | Site 5118 Weight API | [Detail](https://www.5118.com/apistore/detail/69429f16-24f0-e711-80c8-1866da4dbcc0) | `data.weights[]` |
| `get_pc_rank_snapshot_5118` | `/morerank/baidupc` | PC Rank Snapshot API | [Detail](https://www.5118.com/apistore/detail/0d5b519e-d2a2-e711-b5b0-d4ae52d0f72c) | `data.rankings[]` |
| `get_mobile_rank_snapshot_5118` | `/morerank/baidumobile` | Mobile Rank Snapshot API | [Detail](https://www.5118.com/apistore/detail/9d211434-d3a2-e711-b5b0-d4ae52d0f72c) | `data.rankings[]` |
| `check_url_indexing_5118` | `/include` | URL Indexing Check API | [Detail](https://www.5118.com/apistore/detail/f18cc2ae-8ea2-e711-b5b0-d4ae52d0f72c) | `data.items[]` |
| `get_pc_site_rank_keywords_5118` | `/keyword/pc/v2` | PC Site Rank Keywords API v2 | [Detail](https://www.5118.com/apistore/detail/8df3d6ed-2b12-ed11-8da8-e43d1a103141) | `data.items[]` |
| `get_mobile_site_rank_keywords_5118` | `/keyword/mobile/v2` | Mobile Site Rank Keywords API v2 | [Detail](https://www.5118.com/apistore/detail/8ef3d6ed-2b12-ed11-8da8-e43d1a103141) | `data.items[]` |
| `get_bid_sites_5118` | `/bidsite` | Bid Site Mining API | [Detail](https://www.5118.com/apistore/detail/d1995837-e3e7-e811-80cd-1866da4dbcc0) | `data.items[]` |
| `get_pc_top50_sites_5118` | `/keywordrank/baidupc` | PC Top-50 Sites API | [Detail](https://www.5118.com/apistore/detail/92d9a902-cca2-e711-b5b0-d4ae52d0f72c) | `data.siteSnapshots[]` |
| `get_mobile_top50_sites_5118` | `/keywordrank/baidumobile` | Mobile Top-50 Sites API | [Detail](https://www.5118.com/apistore/detail/f582d2b1-cea2-e711-b5b0-d4ae52d0f72c) | `data.siteSnapshots[]` |

### get_longtail_keywords_5118

- Official API: Massive Long-tail Keyword Mining API v2
- Detail URL: [5118 detail page](https://www.5118.com/apistore/detail/8cf3d6ed-2b12-ed11-8da8-e43d1a103141)
- MCP mode: sync
- Public contracts: `GetLongtailKeywords5118Data`, `GetLongtailKeywords5118Item`

#### Longtail Request Parameters

| MCP field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `keyword` | string | yes | Seed keyword to expand. |
| `pageIndex` | number | no | 1-based page number. Defaults to `1`. |
| `pageSize` | number | no | Page size. Maximum `100`. |
| `sortField` | string | no | Vendor sort selector. Common values include index, mobile index, long-tail count, and bid company count. |
| `sortType` | `asc` or `desc` | no | Sort direction. |
| `filter` | string | no | Vendor quick filter selector, such as traffic words or keywords with bidding ads. |
| `filterDate` | string | no | Optional date filter in `yyyy-MM-dd` format. |

#### Longtail Minimal Request Example

```json
{
  "keyword": "衬衫"
}
```

#### Longtail Normalized Response Shape

```json
{
  "keywords": [
    {
      "keyword": "衬衫",
      "index": 1063,
      "mobileIndex": 919,
      "haosouIndex": 1163,
      "douyinIndex": 89,
      "toutiaoIndex": 256,
      "longKeywordCount": 6045520,
      "bidCompanyCount": 185,
      "pageUrl": "https://example.com/shirt",
      "competition": 1,
      "pcSearchVolume": 240,
      "mobileSearchVolume": 1433,
      "semReason": "High-frequency keyword",
      "semPrice": "0.35~4.57",
      "semRecommendPriceAvg": 3.25,
      "googleIndex": 12100,
      "kuaishouIndex": 580,
      "weiboIndex": 320
    }
  ],
  "pagination": {
    "pageIndex": 1,
    "pageSize": 20,
    "pageCount": 18,
    "total": 52
  }
}
```

#### Longtail Normalized Field Reference

| Field | Type | Meaning |
| --- | --- | --- |
| `keyword` | string or null | Expanded keyword text. |
| `index` | number or null | Search volume index. |
| `mobileIndex` | number or null | Mobile search index. |
| `haosouIndex` | number or null | 360 index. |
| `douyinIndex` | number or null | Douyin index. |
| `toutiaoIndex` | number or null | Toutiao index. |
| `longKeywordCount` | number or null | Related long-tail keyword count. |
| `bidCompanyCount` | number or null | Number of bidding companies. |
| `pageUrl` | string or null | Vendor recommendation URL when provided. |
| `competition` | number or null | Competition level. |
| `pcSearchVolume` | number or null | PC daily search volume. |
| `mobileSearchVolume` | number or null | Mobile daily search volume. |
| `semReason` | string or null | Traffic characteristic or SEM reason text. |
| `semPrice` | string or null | SEM price range text. |
| `semRecommendPriceAvg` | number or null | Recommended SEM bid average. |
| `googleIndex` | number or null | Google index. |
| `kuaishouIndex` | number or null | Kuaishou index. |
| `weiboIndex` | number or null | Weibo index. |

#### Longtail Notes

- All currently known official fields for this API are available directly in
  `data.keywords[]`.
- `raw` is still preserved for debugging and forward compatibility with future
  upstream fields.

### get_industry_frequency_words_5118

- Official API: Industry Frequency Analysis API
- Detail URL: [5118 detail page](https://www.5118.com/apistore/detail/19bb1381-bcbc-ec11-8da8-e43d1a103141)
- MCP mode: sync
- Public contracts: `GetIndustryFrequencyWords5118Data`, `GetIndustryFrequencyWords5118Item`

#### Industry Frequency Request Parameters

| MCP field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `keyword` | string | yes | Keyword used as the topic seed. |

#### Industry Frequency Minimal Request Example

```json
{
  "keyword": "减肥餐"
}
```

#### Industry Frequency Normalized Response Shape

```json
{
  "frequencyWords": [
    {
      "word": "做法",
      "ratio": 5.58,
      "count": 46826
    }
  ]
}
```

#### Industry Frequency Normalized Field Reference

| Field | Type | Meaning |
| --- | --- | --- |
| `word` | string or null | Frequency word. |
| `ratio` | number or null | Percentage-style ratio. |
| `count` | number or null | Absolute occurrence count. |

#### Industry Frequency Notes

- The adapter normalizes to `word`, `ratio`, and `count`.
- Use `raw` if you need the original vendor field names such as `Word`,
  `Frequency`, and `Rate`.

### get_suggest_terms_5118

- Official API: Suggestion Mining API
- Detail URL: [5118 detail page](https://www.5118.com/apistore/detail/597e2193-9490-eb11-8daf-e4434bdf6706)
- MCP mode: sync
- Public contracts: `GetSuggestTerms5118Data`, `GetSuggestTerms5118Item`

#### Suggest Terms Request Parameters

| MCP field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `word` | string | yes | Seed word used to query suggestion terms. |
| `platform` | enum | yes | Official vendor platform enum, such as `baidu`, `baidumobile`, `zhihu`, `douyin`, or `amazon`. |

#### Suggest Terms Minimal Request Example

```json
{
  "word": "国庆假期",
  "platform": "zhihu"
}
```

#### Suggest Terms Normalized Response Shape

```json
{
  "suggestions": [
    {
      "term": "国庆假期去哪玩",
      "sourceWord": "国庆假期",
      "promotedTerm": "国庆假期去哪玩",
      "platform": "zhihu",
      "addTime": "2022-09-24T11:28:10.027"
    }
  ]
}
```

#### Suggest Terms Normalized Field Reference

| Field | Type | Meaning |
| --- | --- | --- |
| `term` | string or null | Primary suggestion term to display or consume. |
| `sourceWord` | string or null | Source word returned by the vendor for the suggestion row. |
| `promotedTerm` | string or null | Promoted or expanded suggestion text. |
| `platform` | string or null | Source platform. |
| `addTime` | string or null | Vendor timestamp for the suggestion item. |

#### Suggest Terms Notes

- All currently known official fields for this API are available directly in
  `data.suggestions[]`.
- `raw` remains useful for debugging and future upstream changes.

## get_keyword_metrics_5118 Response Reference

- Official API: Keyword Search Volume Info API v2
- Detail URL: [5118 detail page](https://www.5118.com/apistore/detail/90f3d6ed-2b12-ed11-8da8-e43d1a103141)
- MCP mode: async
- Public contracts: `GetKeywordMetrics5118Data`, `GetKeywordMetrics5118Item`

### Keyword Metrics Request Parameters

| MCP field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `keywords` | string[] | required for submit and wait without taskId | Keywords to query. Maximum `50`. |
| `executionMode` | `submit` or `poll` or `wait` | no | Async mode. `submit` creates the task, `poll` checks a task, `wait` manages polling internally. |
| `taskId` | string or number | required in poll | Existing async task identifier. |
| `maxWaitSeconds` | number | no | Maximum wait time in `wait` mode. |
| `pollIntervalSeconds` | number | no | Polling interval in `wait` mode. The tool defaults to `60` seconds. |

### Keyword Metrics Minimal Request Examples

Submit a new async task:

```json
{
  "keywords": ["比特币价格"],
  "executionMode": "submit"
}
```

Poll an existing task:

```json
{
  "taskId": 40724567,
  "executionMode": "poll"
}
```

Wait until completion inside the adapter:

```json
{
  "keywords": ["比特币价格"],
  "executionMode": "wait",
  "maxWaitSeconds": 120,
  "pollIntervalSeconds": 60
}
```

This tool always returns the shared envelope shown above. The important part is
how `executionStatus`, `taskId`, and `data` change across async states.

### Keyword Metrics State Rules

| State | `executionStatus` | `taskId` | `data` | Client action |
| --- | --- | --- | --- | --- |
| Submit accepted, still processing | `pending` | present | `null` | Store `taskId` and call again with `poll`, or use `wait` next time. |
| Poll still processing | `pending` | present | `null` | Continue polling with the same `taskId`. |
| Completed | `completed` | usually present | object with `items[]` | Read normalized metrics from `data.items[]`. |

### Keyword Metrics Completed Data Shape

When `executionStatus` is `completed`, `data` has this normalized shape:

```json
{
  "items": [
    {
      "keyword": "比特币价格",
      "index": 12000,
      "mobileIndex": 9800,
      "haosouIndex": 351,
      "douyinIndex": 564,
      "toutiaoIndex": 14,
      "googleIndex": 0,
      "kuaishouIndex": 0,
      "weiboIndex": 0,
      "longKeywordCount": 320,
      "bidCompanyCount": 12,
      "cpc": 6.5,
      "competition": 1,
      "pcSearchVolume": 258,
      "mobileSearchVolume": 372,
      "recommendedBidMin": 0,
      "recommendedBidMax": 10.16,
      "recommendedBidAvg": 4.54,
      "ageBest": "20-29",
      "ageBestValue": 54.99,
      "sexMale": 48.71,
      "sexFemale": 51.29,
      "bidReason": "高频热搜词"
    }
  ]
}
```

### Keyword Metrics Completed Item Fields

| Field | Type | Meaning |
| --- | --- | --- |
| `keyword` | string or null | Decoded keyword text returned by 5118. |
| `index` | number or null | Search volume index. |
| `mobileIndex` | number or null | Mobile search volume index. |
| `haosouIndex` | number or null | 360 index. |
| `douyinIndex` | number or null | Douyin index. |
| `toutiaoIndex` | number or null | Toutiao index. |
| `googleIndex` | number or null | Google index. |
| `kuaishouIndex` | number or null | Kuaishou index. |
| `weiboIndex` | number or null | Weibo index. |
| `longKeywordCount` | number or null | Number of related long-tail keywords. |
| `bidCompanyCount` | number or null | Number of bidding companies detected for the keyword. |
| `cpc` | number or null | Cost-per-click style price field normalized from vendor bid price fields. |
| `competition` | number or null | Competition level normalized from vendor competition fields. |
| `pcSearchVolume` | number or null | PC search volume. |
| `mobileSearchVolume` | number or null | Mobile search volume. |
| `recommendedBidMin` | number or null | Recommended minimum bid. |
| `recommendedBidMax` | number or null | Recommended maximum bid. |
| `recommendedBidAvg` | number or null | Recommended average bid. |
| `ageBest` | string or null | Age segment with strongest interest. |
| `ageBestValue` | number or null | Ratio for the strongest-interest age segment. |
| `sexMale` | number or null | Male audience percentage. |
| `sexFemale` | number or null | Female audience percentage. |
| `bidReason` | string or null | Bid display reason or traffic characteristic note. |

### Keyword Metrics Normalized Coverage

The adapter now exposes all currently known official response fields directly in
`data.items[]`.

`raw.data.keyword_param[]` is still preserved for debugging, contract tracing,
and future upstream additions.

### Keyword Metrics Raw Result Shape Example

This is the official vendor-style inner object preserved under
`raw.data.keyword_param[]`:

```json
{
  "keyword": "%E6%B0%94%E7%9B%B8%E8%89%B2%E8%B0%B1%E4%BB%AA",
  "index": 330,
  "mobile_index": 212,
  "haosou_index": 351,
  "bidword_kwc": 1,
  "bidword_pcpv": 258,
  "bidword_wisepv": 372,
  "long_keyword_count": 48718,
  "bidword_price": 9.3,
  "bidword_company_count": 276,
  "toutiao_index": 14,
  "douyin_index": 564,
  "bidword_recommendprice_min": 0,
  "bidword_recommendprice_max": 10.16,
  "age_best": "20-29",
  "age_best_value": 54.99,
  "sex_male": 48.71,
  "sex_female": 51.29,
  "bidword_showreasons": "高频热搜词"
}
```

### Keyword Metrics Important Parsing Notes

- `data.items[]` is the adapter's stable normalized contract.
- `raw.data.keyword_param[]` is the complete official field set currently known
  from the 5118 documentation.
- Some vendor examples include `taskid` at `data.taskid` instead of at the root.
  The adapter tolerates both shapes.
- Official docs show successful submit responses with `errcode: "0"` and a
  nested `data.taskid`, even though live pending polling may also return vendor
  code `101`.

### Keyword Metrics Pending Response Example

This is the typical response for `submit` or `poll` before the async task is
ready:

```json
{
  "source": "5118",
  "sourceType": "official-api-backed",
  "tool": "get_keyword_metrics_5118",
  "apiName": "Keyword Search Volume Info API v2",
  "endpoint": "/keywordparam/v2",
  "mode": "async",
  "executionStatus": "pending",
  "taskId": 40724567,
  "pagination": null,
  "data": null,
  "warnings": [],
  "raw": {
    "errcode": "101",
    "errmsg": "processing",
    "taskid": 40724567
  }
}
```

### Keyword Metrics Completed Response Example

This is the normalized response once the async task is ready:

```json
{
  "source": "5118",
  "sourceType": "official-api-backed",
  "tool": "get_keyword_metrics_5118",
  "apiName": "Keyword Search Volume Info API v2",
  "endpoint": "/keywordparam/v2",
  "mode": "async",
  "executionStatus": "completed",
  "taskId": 40724567,
  "pagination": null,
  "data": {
    "items": [
      {
        "keyword": "比特币价格",
        "index": 12000,
        "mobileIndex": 9800,
        "haosouIndex": 351,
        "douyinIndex": 564,
        "toutiaoIndex": 14,
        "googleIndex": 0,
        "kuaishouIndex": 0,
        "weiboIndex": 0,
        "longKeywordCount": 320,
        "bidCompanyCount": 12,
        "cpc": 6.5,
        "competition": 1,
        "pcSearchVolume": 258,
        "mobileSearchVolume": 372,
        "recommendedBidMin": 0,
        "recommendedBidMax": 10.16,
        "recommendedBidAvg": 4.54,
        "ageBest": "20-29",
        "ageBestValue": 54.99,
        "sexMale": 48.71,
        "sexFemale": 51.29,
        "bidReason": "高频热搜词"
      }
    ]
  },
  "warnings": [],
  "raw": {
    "errcode": "0",
    "errmsg": "success",
    "data": {
      "taskid": 40724567,
      "keyword_param": [
        {
          "keyword": "%E6%AF%94%E7%89%B9%E5%B8%81%E4%BB%B7%E6%A0%BC",
          "index": "12000",
          "mobile_index": "9800",
          "long_keyword_count": "320",
          "bidword_company_count": "12",
          "bidword_price": "6.5",
          "bidword_kwc": "1"
        }
      ]
    }
  }
}
```

### Keyword Metrics Client Guidance

- Prefer branching on `executionStatus` instead of vendor `raw.errcode`.
- Read normalized values from `data.items[]` and use `raw` only for debugging
  or vendor-specific fallback handling.
- Expect `pagination` to stay `null` for this tool.

### get_mobile_traffic_keywords_5118

- Official API: Mobile Traffic Keyword Mining API
- Detail URL: [5118 detail page](https://www.5118.com/apistore/detail/540c9870-b2b9-e911-80d2-1866da4dbcc0)
- MCP mode: async
- Public contracts: `GetMobileTrafficKeywords5118Data`, `GetMobileTrafficKeywords5118Item`

#### Mobile Traffic Request Parameters

| MCP field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `keyword` | string | required for submit, wait without taskId, and poll | Keyword to mine. The vendor poll call also expects it. |
| `pageIndex` | number | no | 1-based result page number. Defaults to `1`. |
| `pageSize` | number | no | Result page size. Maximum `500`. Defaults to `20`. |
| `executionMode` | `submit` or `poll` or `wait` | no | Async mode. This tool defaults to `submit` because vendor processing may take minutes. |
| `taskId` | string or number | required in poll | Existing async task identifier. |
| `maxWaitSeconds` | number | no | Maximum wait time in `wait` mode. |
| `pollIntervalSeconds` | number | no | Polling interval override for `wait` mode. |

#### Mobile Traffic Minimal Request Examples

Submit a new async task:

```json
{
  "keyword": "比特币",
  "executionMode": "submit"
}
```

Poll an existing task:

```json
{
  "keyword": "比特币",
  "taskId": 50724567,
  "executionMode": "poll"
}
```

Wait until completion inside the adapter:

```json
{
  "keyword": "比特币",
  "executionMode": "wait",
  "maxWaitSeconds": 180,
  "pollIntervalSeconds": 60
}
```

#### Mobile Traffic State Rules

| State | `executionStatus` | `taskId` | `data` | Client action |
| --- | --- | --- | --- | --- |
| Submit accepted, still processing | `pending` | present | `null` | Keep `taskId` and retry with `poll`, or use `wait`. |
| Poll still processing | `pending` | present | `null` | Continue polling with the same `taskId` and keyword. |
| Completed | `completed` | usually present | object with `keywords[]` and `pagination` | Read normalized result rows from `data.keywords[]`. |

#### Mobile Traffic Normalized Response Shape

```json
{
  "keywords": [
    {
      "keyword": "比特币行情",
      "index": 8800,
      "weight": 85,
      "mobileIndex": 230,
      "mobileSearchVolume": 340,
      "rank": 3,
      "url": "https://example.com/btc"
    }
  ],
  "pagination": {
    "pageIndex": 1,
    "pageSize": 20,
    "pageCount": 1,
    "total": 1
  }
}
```

#### Mobile Traffic Normalized Field Reference

| Field | Type | Meaning |
| --- | --- | --- |
| `keyword` | string or null | Traffic keyword text. |
| `index` | number or null | Index value when present in the upstream payload. |
| `weight` | number or null | Vendor weight or value score. |
| `mobileIndex` | number or null | Mobile index. |
| `mobileSearchVolume` | number or null | Mobile daily search volume. |
| `rank` | number or null | Ranking position when returned by the upstream payload. |
| `url` | string or null | URL associated with the keyword row. |

#### Mobile Traffic Pending Response Example

This is the typical response for `submit` or `poll` before the async task is
ready:

```json
{
  "source": "5118",
  "sourceType": "official-api-backed",
  "tool": "get_mobile_traffic_keywords_5118",
  "apiName": "Mobile Traffic Keyword Mining API",
  "endpoint": "/traffic",
  "mode": "async",
  "executionStatus": "pending",
  "taskId": 50724567,
  "pagination": null,
  "data": null,
  "warnings": [],
  "raw": {
    "errcode": "200104",
    "errmsg": "processing",
    "taskid": 50724567
  }
}
```

#### Mobile Traffic Completed Response Example

This is the normalized response once the async task is ready:

```json
{
  "source": "5118",
  "sourceType": "official-api-backed",
  "tool": "get_mobile_traffic_keywords_5118",
  "apiName": "Mobile Traffic Keyword Mining API",
  "endpoint": "/traffic",
  "mode": "async",
  "executionStatus": "completed",
  "taskId": 50724567,
  "pagination": {
    "pageIndex": 1,
    "pageSize": 20,
    "pageCount": 1,
    "total": 1
  },
  "data": {
    "keywords": [
      {
        "keyword": "比特币行情",
        "index": 8800,
        "rank": 3,
        "url": "https://example.com/btc",
        "weight": null,
        "mobileIndex": null,
        "mobileSearchVolume": null
      }
    ],
    "pagination": {
      "pageIndex": 1,
      "pageSize": 20,
      "pageCount": 1,
      "total": 1
    }
  },
  "warnings": [],
  "raw": {
    "errcode": "0",
    "errmsg": "success",
    "data": {
      "list": [
        {
          "keyword": "%E6%AF%94%E7%89%B9%E5%B8%81%E8%A1%8C%E6%83%85",
          "index": "8800",
          "rank": "3",
          "url": "https%3A%2F%2Fexample.com%2Fbtc"
        }
      ],
      "page_index": 1,
      "page_size": 20,
      "page_count": 1,
      "total": 1
    }
  }
}
```

#### Mobile Traffic Client Guidance

- Prefer branching on `executionStatus` instead of vendor `raw.errcode`.
- Keep the original `keyword` together with `taskId` when polling because the
  upstream API expects both values.
- Read normalized values from `data.keywords[]`; keep `raw` for debugging or
  future vendor compatibility handling.

#### Mobile Traffic Notes

- All currently known official fields for this API are available directly in
  `data.keywords[]`.
- `raw` is still preserved for debugging and future upstream additions.
