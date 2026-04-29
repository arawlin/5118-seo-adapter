# Skill API 适配矩阵

本文档亦提供[英文版](./skill-api-fit-matrix.md)。

## 目的

这份参考文档将外部 SEO 与 GEO skill，映射到当前仓库实现方向下真正保留的
5118 API 能力面上。

这一版刻意收窄了范围。

- 只考虑数据查询类 API。
- 不接入 AI 编写、改写、标题生成、内容检测类 API。
- 不接入电商关键词类 API。
- 不接入 ICP 与备案查询类 API。

因此，这是一份面向“查询型 MCP tool 扩展”的排期参考文档。

## 当前保留的 API 家族

当前范围内仅保留这些 5118 查询能力：

- 关键词挖掘与关键词指标查询
- 行业高频词与联想词查询
- 排名快照与 Top 站点快照查询
- 网站排名词导出与整站排名词导出
- 竞价词与竞价站点情报查询
- 网站权重与 URL 收录查询

## 统一 MCP Tool 矩阵

- `状态` 区分已经实现和待实现。
- `阶段` 取代原来的 current、Wave 1、Wave 2 拆分。
- `最小输入` 与 `归一化输出` 保留实现设计所需的关键信息。

| MCP tool | 状态 | 阶段 | Endpoint | 官方 API 名称 | 最小输入 | 归一化输出 | 主要服务的 skill | API 详情 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `get_longtail_keywords_5118` | 已实现 | 当前 | `/keyword/word/v2` | 海量长尾词挖掘 API v2 | `keyword`; `pageIndex?`; `pageSize?`; `sort/filter?` | `items[]`; `pagination` | `keyword-research`; `content-gap-analysis` | [apistore](https://www.5118.com/apistore/detail/8cf3d6ed-2b12-ed11-8da8-e43d1a103141) |
| `get_industry_frequency_words_5118` | 已实现 | 当前 | `/tradeseg` | 细分行业分析 API | `keyword` | `items[]` | `keyword-research`; `competitor-analysis` | [apistore](https://www.5118.com/apistore/detail/19bb1381-bcbc-ec11-8da8-e43d1a103141) |
| `get_suggest_terms_5118` | 已实现 | 当前 | `/suggest/list` | 下拉联想词挖掘 API | `word`; `platform` | `items[]` | `keyword-research`; `serp-analysis` | [apistore](https://www.5118.com/apistore/detail/597e2193-9490-eb11-8daf-e4434bdf6706) |
| `get_keyword_metrics_5118` | 已实现 | 当前 | `/keywordparam/v2` | 关键词搜索量信息 API v2 | `keywords[]`; `executionMode?`; `taskId?` | `items[]`; `executionStatus`; `taskId` | `keyword-research`; `content-gap-analysis`; `performance-reporter` | [apistore](https://www.5118.com/apistore/detail/90f3d6ed-2b12-ed11-8da8-e43d1a103141) |
| `get_mobile_traffic_keywords_5118` | 已实现 | 当前 | `/traffic` | 移动流量词挖掘 API | `keyword`; `pageIndex?`; `pageSize?`; `executionMode?`; `taskId?` | `items[]`; `pagination`; `executionStatus` | `keyword-research`; `rank-tracker`; `performance-reporter` | [apistore](https://www.5118.com/apistore/detail/540c9870-b2b9-e911-80d2-1866da4dbcc0) |
| `get_domain_rank_keywords_5118` | 已实现 | Wave 1 | `/keyword/domain/v2` | PC-整网站排名词导出 API v2 | `url`; `pageIndex?` | `items[]`; `pagination` | `content-gap-analysis`; `competitor-analysis`; `domain-authority-auditor` | [apistore](https://www.5118.com/apistore/detail/8ff3d6ed-2b12-ed11-8da8-e43d1a103141) |
| `get_bid_keywords_5118` | 已实现 | Wave 1 | `/bidword/v2` | 网站竞价词挖掘 API v2 | `url`; `pageIndex?`; `pageSize?`; `includeHighlight?` | `items[]`; `pagination` | `content-gap-analysis`; `competitor-analysis` | [apistore](https://www.5118.com/apistore/detail/8af3d6ed-2b12-ed11-8da8-e43d1a103141) |
| `get_site_weight_5118` | 已实现 | Wave 1 | `/weight` | 网站5118权重查询 API | `url` | `weights` | `competitor-analysis`; `performance-reporter`; `domain-authority-auditor` | [apistore](https://www.5118.com/apistore/detail/69429f16-24f0-e711-80c8-1866da4dbcc0) |
| `get_pc_rank_snapshot_5118` | 已实现 | Wave 1 | `/morerank/baidupc` | PC-排名查询 API（实时） | `url`; `keywords[]`; `checkRow?`; `executionMode?`; `taskId?` | `rankings[]`; `executionStatus`; `taskId` | `rank-tracker`; `serp-analysis`; `alert-manager` | [apistore](https://www.5118.com/apistore/detail/0d5b519e-d2a2-e711-b5b0-d4ae52d0f72c) |
| `get_mobile_rank_snapshot_5118` | 已实现 | Wave 1 | `/morerank/baidumobile` | 移动-排名查询 API（实时） | `url`; `keywords[]`; `checkRow?`; `executionMode?`; `taskId?` | `rankings[]`; `executionStatus`; `taskId` | `rank-tracker`; `serp-analysis`; `alert-manager` | [apistore](https://www.5118.com/apistore/detail/9d211434-d3a2-e711-b5b0-d4ae52d0f72c) |
| `check_url_indexing_5118` | 已实现 | Wave 1 | `/include` | PC-URL收录检测 API | `urls[]`; `executionMode?`; `taskId?`; `maxWaitSeconds?`; `pollIntervalSeconds?` | `items[]`; `executionStatus`; `taskId` | `technical-seo-checker`; `alert-manager`; `performance-reporter` | [apistore](https://www.5118.com/apistore/detail/f18cc2ae-8ea2-e711-b5b0-d4ae52d0f72c) |
| `get_pc_site_rank_keywords_5118` | 已实现 | Wave 2 | `/keyword/pc/v2` | PC-网站排名词导出 API v2 | `url`; `pageIndex?` | `items[]`; `pagination` | `content-gap-analysis`; `competitor-analysis` | [apistore](https://www.5118.com/apistore/detail/8df3d6ed-2b12-ed11-8da8-e43d1a103141) |
| `get_mobile_site_rank_keywords_5118` | 已实现 | Wave 2 | `/keyword/mobile/v2` | 移动-网站排名词导出 API v2 | `url`; `pageIndex?` | `items[]`; `pagination` | `content-gap-analysis`; `competitor-analysis` | [apistore](https://www.5118.com/apistore/detail/8ef3d6ed-2b12-ed11-8da8-e43d1a103141) |
| `get_bid_sites_5118` | 已实现 | Wave 2 | `/bidsite` | 竞价推广公司挖掘 API | `keyword`; `pageIndex?`; `pageSize?`; `includeHighlight?` | `items[]`; `pagination` | `competitor-analysis` | [apistore](https://www.5118.com/apistore/detail/d1995837-e3e7-e811-80cd-1866da4dbcc0) |
| `get_pc_top50_sites_5118` | 已实现 | Wave 2 | `/keywordrank/baidupc` | PC-前50网站信息 API | `keywords[]`; `checkRow?`; `executionMode?`; `taskId?` | `siteSnapshots[]`; `executionStatus`; `taskId` | `rank-tracker`; `serp-analysis` | [apistore](https://www.5118.com/apistore/detail/92d9a902-cca2-e711-b5b0-d4ae52d0f72c) |
| `get_mobile_top50_sites_5118` | 已实现 | Wave 2 | `/keywordrank/baidumobile` | 移动-前50网站信息 API | `keywords[]`; `checkRow?`; `executionMode?`; `taskId?` | `siteSnapshots[]`; `executionStatus`; `taskId` | `rank-tracker`; `serp-analysis` | [apistore](https://www.5118.com/apistore/detail/f582d2b1-cea2-e711-b5b0-d4ae52d0f72c) |

## Skill 适配总结

### 强适配

- `keyword-research`
  适配 API：`longtail-keyword-v2`、`suggest`、`keyword-param-v2`、
  `frequency-words`、`traffic-dig`
  后续 MCP 建议：查询型 MVP 阶段无需新增。
- `content-gap-analysis`
  适配 API：`domain-rank-v2`、`baidupc-rank-v2`、`mobile-rank-v2`、
  `bidword-v2`，再加 `keyword-param-v2`
  后续 MCP 建议：当前查询型范围内无需新增。
- `competitor-analysis`
  适配 API：`domain-rank-v2`、`baidupc-rank-v2`、`mobile-rank-v2`、
  `bidword-v2`、`bid-site`、`weight`
  后续 MCP 建议：当前查询型范围内无需新增。
- `rank-tracker`
  适配 API：`rank-pc`、`rank-mobile`、`kwrank-pc`、`kwrank-mobile`、`traffic-dig`
  后续 MCP 建议：当前查询型范围内无需新增。
- `serp-analysis`
  适配 API：`rank-pc`、`rank-mobile`、`kwrank-pc`、`kwrank-mobile`、`suggest`
  后续 MCP 建议：当前查询型范围内无需新增。

### 部分适配

- `performance-reporter`
  适配 API：`keyword-param-v2`、`traffic-dig`、各类排名词导出、`weight`、`include`
  缺口：流量、转化、归因仍需要 analytics 系统。
- `alert-manager`
  适配 API：`rank-pc`、`rank-mobile`、`weight`、`include`
  缺口：查询层可以提供信号，但调度与通知投递不属于 5118。
- `technical-seo-checker`
  适配 API：`include`、`weight`
  缺口：仅靠 5118 无法覆盖 Core Web Vitals 和站点抓取图。
- `domain-authority-auditor`
  适配 API：`weight`、`domain-rank-v2`、`include`
  缺口：没有外链权威图谱。

### 不纳入本次查询型范围

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

这些 skill 要么以内容生成能力为主，要么依赖非查询型工作流逻辑，要么依赖当前
保留范围之外的数据源。

## 实操建议

如果产品目标就是保持“只做数据查询接口”，下一轮实现建议优先围绕以下 6 个
skill：

- `keyword-research`
- `content-gap-analysis`
- `competitor-analysis`
- `rank-tracker`
- `serp-analysis`
- `performance-reporter`

这 6 个 skill 与当前适配器重合度最高，也最容易在不引入 AI 编写、电商和备案
接口的前提下继续扩展。
