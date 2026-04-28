# Skill API Fit Matrix

This document is also available in [Chinese](./skill-api-fit-matrix-zh.md).

## Purpose

This reference maps the external SEO and GEO skills to the 5118 APIs that fit
the current implementation direction of this repository.

This version is intentionally narrow.

- Only data-query APIs are considered in scope.
- AI content generation, rewriting, title writing, and content detection APIs
  are excluded.
- E-commerce keyword APIs are excluded.
- ICP and filing-record APIs are excluded.

The result is a planning document for query-only MCP tool expansion.

## In-Scope API Families

The current scope keeps only these 5118 query families:

- keyword discovery and keyword metrics
- industry frequency and suggestion mining
- rank snapshots and top-site snapshots
- site keyword export and domain keyword export
- bid keyword and bid-site intelligence
- site weight and URL indexing checks

## Unified MCP Tool Matrix

The table below merges the former current-coverage table, the master tool
table, and the proposed-tool catalog into one source-of-truth matrix.

- `Status` distinguishes implemented tools from planned tools.
- `Stage` replaces the previous current, wave 1, and wave 2 split.
- `Minimal input` and `Normalized output` keep the implementation-relevant
  contract details in the same place.

| MCP tool | Status | Stage | Endpoint | Official API name | Minimal input | Normalized output | Primary skills | API detail |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `get_longtail_keywords_5118` | implemented | current | `/keyword/word/v2` | 海量长尾词挖掘 API v2 | `keyword`; `pageIndex?`; `pageSize?`; `sort/filter?` | `items[]`; `pagination` | `keyword-research`; `content-gap-analysis` | [apistore](https://www.5118.com/apistore/detail/8cf3d6ed-2b12-ed11-8da8-e43d1a103141) |
| `get_industry_frequency_words_5118` | implemented | current | `/tradeseg` | 细分行业分析 API | `keyword` | `items[]` | `keyword-research`; `competitor-analysis` | [apistore](https://www.5118.com/apistore/detail/19bb1381-bcbc-ec11-8da8-e43d1a103141) |
| `get_suggest_terms_5118` | implemented | current | `/suggest/list` | 下拉联想词挖掘 API | `word`; `platform` | `items[]` | `keyword-research`; `serp-analysis` | [apistore](https://www.5118.com/apistore/detail/597e2193-9490-eb11-8daf-e4434bdf6706) |
| `get_keyword_metrics_5118` | implemented | current | `/keywordparam/v2` | 关键词搜索量信息 API v2 | `keywords[]`; `executionMode?`; `taskId?` | `items[]`; `executionStatus`; `taskId` | `keyword-research`; `content-gap-analysis`; `performance-reporter` | [apistore](https://www.5118.com/apistore/detail/90f3d6ed-2b12-ed11-8da8-e43d1a103141) |
| `get_mobile_traffic_keywords_5118` | implemented | current | `/traffic` | 移动流量词挖掘 API | `keyword`; `pageIndex?`; `pageSize?`; `executionMode?`; `taskId?` | `items[]`; `pagination`; `executionStatus` | `keyword-research`; `rank-tracker`; `performance-reporter` | [apistore](https://www.5118.com/apistore/detail/540c9870-b2b9-e911-80d2-1866da4dbcc0) |
| `get_domain_rank_keywords_5118` | planned | wave 1 | `/keyword/domain/v2` | PC-整网站排名词导出 API v2 | `url`; `pageIndex?` | `items[]`; `pagination` | `content-gap-analysis`; `competitor-analysis`; `domain-authority-auditor` | [apistore](https://www.5118.com/apistore/detail/8ff3d6ed-2b12-ed11-8da8-e43d1a103141) |
| `get_bid_keywords_5118` | planned | wave 1 | `/bidword/v2` | 网站竞价词挖掘 API v2 | `url`; `pageIndex?`; `pageSize?`; `includeHighlight?` | `items[]`; `pagination` | `content-gap-analysis`; `competitor-analysis` | [apistore](https://www.5118.com/apistore/detail/8af3d6ed-2b12-ed11-8da8-e43d1a103141) |
| `get_site_weight_5118` | planned | wave 1 | `/weight` | 网站5118权重查询 API | `url` | `weights` | `competitor-analysis`; `performance-reporter`; `domain-authority-auditor` | [apistore](https://www.5118.com/apistore/detail/69429f16-24f0-e711-80c8-1866da4dbcc0) |
| `get_pc_rank_snapshot_5118` | planned | wave 1 | `/morerank/baidupc` | PC-排名查询 API（实时） | `url`; `keywords[]`; `checkRow?`; `executionMode?`; `taskId?` | `rankings[]`; `executionStatus`; `taskId` | `rank-tracker`; `serp-analysis`; `alert-manager` | [apistore](https://www.5118.com/apistore/detail/0d5b519e-d2a2-e711-b5b0-d4ae52d0f72c) |
| `get_mobile_rank_snapshot_5118` | planned | wave 1 | `/morerank/baidumobile` | 移动-排名查询 API（实时） | `url`; `keywords[]`; `checkRow?`; `executionMode?`; `taskId?` | `rankings[]`; `executionStatus`; `taskId` | `rank-tracker`; `serp-analysis`; `alert-manager` | [apistore](https://www.5118.com/apistore/detail/9d211434-d3a2-e711-b5b0-d4ae52d0f72c) |
| `check_url_indexing_5118` | planned | wave 1 | `/include` | PC-URL收录检测 API | `urls[]`; `executionMode?`; `taskId?`; `maxWaitSeconds?`; `pollIntervalSeconds?` | `items[]`; `executionStatus`; `taskId` | `technical-seo-checker`; `alert-manager`; `performance-reporter` | [apistore](https://www.5118.com/apistore/detail/f18cc2ae-8ea2-e711-b5b0-d4ae52d0f72c) |
| `get_pc_site_rank_keywords_5118` | planned | wave 2 | `/keyword/pc/v2` | PC-网站排名词导出 API v2 | `url`; `pageIndex?` | `items[]`; `pagination` | `content-gap-analysis`; `competitor-analysis` | [apistore](https://www.5118.com/apistore/detail/8df3d6ed-2b12-ed11-8da8-e43d1a103141) |
| `get_mobile_site_rank_keywords_5118` | planned | wave 2 | `/keyword/mobile/v2` | 移动-网站排名词导出 API v2 | `url`; `pageIndex?` | `items[]`; `pagination` | `content-gap-analysis`; `competitor-analysis` | [apistore](https://www.5118.com/apistore/detail/8ef3d6ed-2b12-ed11-8da8-e43d1a103141) |
| `get_bid_sites_5118` | planned | wave 2 | `/bidsite` | 竞价推广公司挖掘 API | `keyword`; `pageIndex?`; `pageSize?` | `items[]`; `pagination` | `competitor-analysis` | [apistore](https://www.5118.com/apistore/detail/d1995837-e3e7-e811-80cd-1866da4dbcc0) |
| `get_pc_top50_sites_5118` | planned | wave 2 | `/keywordrank/baidupc` | PC-前50网站信息 API | `keywords[]`; `checkRow?`; `executionMode?`; `taskId?` | `keywords[]`; `topSites[]`; `executionStatus` | `rank-tracker`; `serp-analysis` | [apistore](https://www.5118.com/apistore/detail/92d9a902-cca2-e711-b5b0-d4ae52d0f72c) |
| `get_mobile_top50_sites_5118` | planned | wave 2 | `/keywordrank/baidumobile` | 移动-前50网站信息 API | `keywords[]`; `checkRow?`; `executionMode?`; `taskId?` | `keywords[]`; `topSites[]`; `executionStatus` | `rank-tracker`; `serp-analysis` | [apistore](https://www.5118.com/apistore/detail/f582d2b1-cea2-e711-b5b0-d4ae52d0f72c) |

## Skill Fit Summary

### Strong Fit

- `keyword-research`
  APIs: `longtail-keyword-v2`, `suggest`, `keyword-param-v2`,
  `frequency-words`, `traffic-dig`
  Proposed next MCP work: none required for a query-only MVP.
- `content-gap-analysis`
  APIs: `domain-rank-v2`, `baidupc-rank-v2`, `mobile-rank-v2`,
  `bidword-v2`, plus `keyword-param-v2`
  Proposed next MCP tools: `get_domain_rank_keywords_5118`,
  `get_pc_site_rank_keywords_5118`, `get_mobile_site_rank_keywords_5118`,
  `get_bid_keywords_5118`.
- `competitor-analysis`
  APIs: `domain-rank-v2`, `baidupc-rank-v2`, `mobile-rank-v2`,
  `bidword-v2`, `bid-site`, `weight`
  Proposed next MCP tools: `get_domain_rank_keywords_5118`,
  `get_pc_site_rank_keywords_5118`, `get_mobile_site_rank_keywords_5118`,
  `get_bid_keywords_5118`, `get_bid_sites_5118`, `get_site_weight_5118`.
- `rank-tracker`
  APIs: `rank-pc`, `rank-mobile`, `kwrank-pc`, `kwrank-mobile`, `traffic-dig`
  Proposed next MCP tools: `get_pc_rank_snapshot_5118`,
  `get_mobile_rank_snapshot_5118`, `get_pc_top50_sites_5118`,
  `get_mobile_top50_sites_5118`.
- `serp-analysis`
  APIs: `rank-pc`, `rank-mobile`, `kwrank-pc`, `kwrank-mobile`, `suggest`
  Proposed next MCP tools: `get_pc_rank_snapshot_5118`,
  `get_mobile_rank_snapshot_5118`, `get_pc_top50_sites_5118`,
  `get_mobile_top50_sites_5118`.

### Partial Fit

- `performance-reporter`
  APIs: `keyword-param-v2`, `traffic-dig`, ranking exports, `weight`, `include`
  Gap: traffic, conversion, and attribution still need analytics systems.
- `alert-manager`
  APIs: `rank-pc`, `rank-mobile`, `weight`, `include`
  Gap: the query layer can surface signals, but scheduling and delivery remain
  outside 5118.
- `technical-seo-checker`
  APIs: `include`, `weight`
  Gap: no Core Web Vitals, crawl graph, or render diagnostics from 5118 alone.
- `domain-authority-auditor`
  APIs: `weight`, `domain-rank-v2`, `include`
  Gap: no backlink authority graph.

### Out of Scope for This Query-Only Plan

- `seo-content-writer`
- `geo-content-optimizer`
- `meta-tags-optimizer`
- `content-refresher`
- `on-page-seo-auditor`
- `content-quality-auditor`
- `entity-optimizer`
- `schema-markup-generator`
- `internal-linking-optimizer`
- `backlink-analyzer`
- `memory-management`

These skills are either content-generation driven, require non-query workflow
logic, or depend on data sources that are not part of the retained 5118 scope.

## Practical Recommendation

If the product goal is to stay query-only, the next implementation cycle should
focus on these six skills first:

- `keyword-research`
- `content-gap-analysis`
- `competitor-analysis`
- `rank-tracker`
- `serp-analysis`
- `performance-reporter`

These six have the best overlap with the current adapter and the cleanest path
to expansion without pulling in AI authoring, e-commerce, or filing APIs.
