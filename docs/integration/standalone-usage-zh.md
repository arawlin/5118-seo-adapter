# 独立使用说明

本文档亦提供[英文版](./standalone-usage.md)。

## 范围

本工程是独立的 MCP server，仅封装 5118 官方 API。

当前实现共包含 16 个工具。

当前阶段：

- `get_longtail_keywords_5118`
- `get_industry_frequency_words_5118`
- `get_suggest_terms_5118`
- `get_keyword_metrics_5118`
- `get_mobile_traffic_keywords_5118`

Wave 1：

- `get_domain_rank_keywords_5118`
- `get_bid_keywords_5118`
- `get_site_weight_5118`
- `get_pc_rank_snapshot_5118`
- `get_mobile_rank_snapshot_5118`
- `check_url_indexing_5118`

Wave 2：

- `get_pc_site_rank_keywords_5118`
- `get_mobile_site_rank_keywords_5118`
- `get_bid_sites_5118`
- `get_pc_top50_sites_5118`
- `get_mobile_top50_sites_5118`

## 环境变量

按需为要调用的工具设置对应的 API key 环境变量：

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

## 构建与启动

```bash
npm install
npm run build
node dist/index.js
```

## Live Runner

构建产物就绪后，可以使用 `scripts/test-live-gate.mjs` 做人工真实调用校验。

内置场景：

- `wave-one` -> `examples/wave-one-sequence.json`，覆盖当前阶段工具与全部 Wave 1 工具
- `wave-two` -> `examples/wave-two-sequence.json`，覆盖全部 Wave 2 工具
- `all-tools` -> `examples/all-tools-sequence.json`，一次覆盖全部已实现工具

单工具模式支持完整 MCP tool 名，也支持以下别名：

| 别名 | MCP tool |
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

常见命令示例：

```bash
API_5118_DOMAIN_V2=xxxx npm run test:live -- --tool domain-rank --url www.baidu.com --pageIndex 1
API_5118_INCLUDE=xxxx npm run test:live -- --tool include --urls https://www.baidu.com/,https://www.jd.com/ --executionMode submit
API_5118_RANK_PC=xxxx npm run test:live -- --tool rank-pc --url www.baidu.com --keywords "比特币价格" --executionMode submit
API_5118_BAIDUPC_V2=xxxx API_5118_MOBILE_V2=xxxx API_5118_BIDSITE=xxxx API_5118_KWRANK_PC=xxxx API_5118_KWRANK_MOBILE=xxxx npm run test:live -- --scenario wave-two
```

如果你需要不同的执行顺序或输入组合，可以使用 `--sequence <path>` 指向
自定义 JSON 场景文件，而不是使用内置的 `wave-one`、`wave-two` 或 `all-tools`。

## Stdio 配置示例

请参考 [examples/vscode-mcp.stdio.example.json](../../examples/vscode-mcp.stdio.example.json)
中的标准配置。

示例里的 env 配置现在列出了全部已支持工具的 API key。若你的本地接入只会启用
部分工具，可以删掉不需要的键。

## 工具执行模型

- 同步工具直接返回归一化结果。
- 异步工具统一支持 `submit`、`poll`、`wait`。
- 异步处理中状态包含厂商错误码 `101` 和 `200104`。

## 响应外壳

每个工具都返回统一外壳：

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

### 外壳字段说明

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `source` | string | 固定上游来源标识，始终为 `5118`。 |
| `sourceType` | string | 固定来源分类，始终为 `official-api-backed`。 |
| `tool` | string | 产出该响应的 MCP 工具名。 |
| `apiName` | string | 便于阅读的厂商 API 名称。 |
| `endpoint` | string | 厂商接口路径。 |
| `mode` | string | 同步工具为 `sync`，异步工具为 `async`。 |
| `executionStatus` | string | 归一化执行状态。异步工具主要返回 `pending` 或 `completed`。 |
| `taskId` | string 或 number 或 null | 异步任务标识。异步处理中一定会有，完成时通常也会保留。 |
| `pagination` | object 或 null | 工具支持分页时返回的归一化分页对象。 |
| `data` | object 或 array 或 null | 归一化业务数据。异步任务处理中时为 `null`。 |
| `warnings` | string[] | 非致命适配层告警，当前通常为空数组。 |
| `raw` | unknown | 未归一化的厂商原始响应。 |

### 结构化输出 Schema

- 每个工具现在都会在 MCP tool 元数据中发布完整的 `outputSchema`。
- 每个工具在 `src/tools/` 下的注册函数会自行声明该工具的
  `outputSchema`。
- 每个工具会在返回 MCP 结构化内容前，按自己的 `outputSchema`
  校验归一化外壳。
- `src/server.ts` 现在只负责序列化已通过校验的 payload。
- 如果校验失败，调用会抛出 MCP 工具错误，而不是返回部分有效的外壳。

### 结构化输入 Schema

- 每个工具都在 `src/tools/` 下各自模块中定义输入 schema。
- MCP 注册时使用的 schema 与该工具 handler 的类型约束是同一个对象，
  每个工具只有一份输入契约来源。
- `src/server.ts` 通过调用各工具本地注册函数完成注册，server 本身只保留
  编排与一致性校验逻辑。

### 错误行为

工具调用失败时，当前实现通常直接抛出 MCP 工具错误，而不是返回
`executionStatus: "failed"` 的外壳。因此，只要拿到了响应外壳，就应优先根据
`executionStatus` 判断异步状态。

## 当前 Tool 参考

这一节把当前全部 16 个已实现 MCP tool，与官方 5118 API 详情页以及 MCP 侧实际调用契约
对齐起来。

下面的总表覆盖全部 16 个工具。后面的长篇章节主要展开当前阶段工具和典型异步模式。
如果你需要完整的 Wave 1 与 Wave 2 字段矩阵，请同时参考
[docs/5118-mcp-engineering-spec-zh.md](../5118-mcp-engineering-spec-zh.md)。

### 按 Tool 模块导入类型

包级统一类型入口已移除。请从各自 tool 模块直接导入归一化契约类型，
并从 `toolContracts` 导入公共外壳契约：

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

建议优先使用每个 tool 模块导出的 `Get...Data` 和 `Get...Item` 契约名称。
通用名称（例如 `KeywordMetricsData`）也会在同一模块导出，用于兼容。

| MCP tool | Endpoint | 官方 API | 详情 URL | 归一化数据键 |
| --- | --- | --- | --- | --- |
| `get_longtail_keywords_5118` | `/keyword/word/v2` | 海量长尾词挖掘 API v2 | [详情](https://www.5118.com/apistore/detail/8cf3d6ed-2b12-ed11-8da8-e43d1a103141) | `data.keywords[]` |
| `get_industry_frequency_words_5118` | `/tradeseg` | 细分行业分析 API | [详情](https://www.5118.com/apistore/detail/19bb1381-bcbc-ec11-8da8-e43d1a103141) | `data.frequencyWords[]` |
| `get_suggest_terms_5118` | `/suggest/list` | 下拉联想词挖掘 API | [详情](https://www.5118.com/apistore/detail/597e2193-9490-eb11-8daf-e4434bdf6706) | `data.suggestions[]` |
| `get_keyword_metrics_5118` | `/keywordparam/v2` | 关键词搜索量信息 API v2 | [详情](https://www.5118.com/apistore/detail/90f3d6ed-2b12-ed11-8da8-e43d1a103141) | `data.items[]` |
| `get_mobile_traffic_keywords_5118` | `/traffic` | 移动流量词挖掘 API | [详情](https://www.5118.com/apistore/detail/540c9870-b2b9-e911-80d2-1866da4dbcc0) | `data.keywords[]` |
| `get_domain_rank_keywords_5118` | `/keyword/domain/v2` | PC 整站排名词导出 API v2 | [详情](https://www.5118.com/apistore/detail/8ff3d6ed-2b12-ed11-8da8-e43d1a103141) | `data.items[]` |
| `get_bid_keywords_5118` | `/bidword/v2` | 网站竞价词挖掘 API v2 | [详情](https://www.5118.com/apistore/detail/8af3d6ed-2b12-ed11-8da8-e43d1a103141) | `data.items[]` |
| `get_site_weight_5118` | `/weight` | 网站 5118 权重查询 API | [详情](https://www.5118.com/apistore/detail/69429f16-24f0-e711-80c8-1866da4dbcc0) | `data.weights[]` |
| `get_pc_rank_snapshot_5118` | `/morerank/baidupc` | PC 排名查询 API | [详情](https://www.5118.com/apistore/detail/0d5b519e-d2a2-e711-b5b0-d4ae52d0f72c) | `data.rankings[]` |
| `get_mobile_rank_snapshot_5118` | `/morerank/baidumobile` | 移动排名查询 API | [详情](https://www.5118.com/apistore/detail/9d211434-d3a2-e711-b5b0-d4ae52d0f72c) | `data.rankings[]` |
| `check_url_indexing_5118` | `/include` | URL 收录检测 API | [详情](https://www.5118.com/apistore/detail/f18cc2ae-8ea2-e711-b5b0-d4ae52d0f72c) | `data.items[]` |
| `get_pc_site_rank_keywords_5118` | `/keyword/pc/v2` | PC 网站排名词导出 API v2 | [详情](https://www.5118.com/apistore/detail/8df3d6ed-2b12-ed11-8da8-e43d1a103141) | `data.items[]` |
| `get_mobile_site_rank_keywords_5118` | `/keyword/mobile/v2` | 移动网站排名词导出 API v2 | [详情](https://www.5118.com/apistore/detail/8ef3d6ed-2b12-ed11-8da8-e43d1a103141) | `data.items[]` |
| `get_bid_sites_5118` | `/bidsite` | 竞价推广公司挖掘 API | [详情](https://www.5118.com/apistore/detail/d1995837-e3e7-e811-80cd-1866da4dbcc0) | `data.items[]` |
| `get_pc_top50_sites_5118` | `/keywordrank/baidupc` | PC 前 50 网站信息 API | [详情](https://www.5118.com/apistore/detail/92d9a902-cca2-e711-b5b0-d4ae52d0f72c) | `data.siteSnapshots[]` |
| `get_mobile_top50_sites_5118` | `/keywordrank/baidumobile` | 移动前 50 网站信息 API | [详情](https://www.5118.com/apistore/detail/f582d2b1-cea2-e711-b5b0-d4ae52d0f72c) | `data.siteSnapshots[]` |

### get_longtail_keywords_5118

- 官方 API：海量长尾词挖掘 API v2
- 详情 URL：[5118 详情页](https://www.5118.com/apistore/detail/8cf3d6ed-2b12-ed11-8da8-e43d1a103141)
- MCP 模式：sync
- 公开契约类型：`GetLongtailKeywords5118Data`、`GetLongtailKeywords5118Item`

#### 长尾词请求参数

| MCP 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `keyword` | string | 是 | 作为扩展起点的母词。 |
| `pageIndex` | number | 否 | 从 1 开始的页码，默认 `1`。 |
| `pageSize` | number | 否 | 每页数量，最大 `100`。 |
| `sortField` | string | 否 | 厂商排序字段选择器，常见值对应指数、移动指数、长尾词数、竞价公司数等。 |
| `sortType` | `asc` 或 `desc` | 否 | 排序方向。 |
| `filter` | string | 否 | 厂商快速过滤器，例如流量词或有竞价的词。 |
| `filterDate` | string | 否 | 可选日期筛选，格式 `yyyy-MM-dd`。 |

#### 长尾词最小请求示例

```json
{
  "keyword": "衬衫"
}
```

#### 长尾词归一化响应结构

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
      "semReason": "高频词",
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

#### 长尾词归一化字段说明

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `keyword` | string 或 null | 扩展关键词文本。 |
| `index` | number 或 null | 搜索指数。 |
| `mobileIndex` | number 或 null | 移动搜索指数。 |
| `haosouIndex` | number 或 null | 360 指数。 |
| `douyinIndex` | number 或 null | 抖音指数。 |
| `toutiaoIndex` | number 或 null | 头条指数。 |
| `longKeywordCount` | number 或 null | 相关长尾词个数。 |
| `bidCompanyCount` | number 或 null | 竞价公司数量。 |
| `pageUrl` | string 或 null | 厂商返回的推荐页面 URL。 |
| `competition` | number 或 null | 竞争度。 |
| `pcSearchVolume` | number 或 null | PC 日检索量。 |
| `mobileSearchVolume` | number 或 null | 移动日检索量。 |
| `semReason` | string 或 null | 流量特点或 SEM 原因说明。 |
| `semPrice` | string 或 null | SEM 价格区间文本。 |
| `semRecommendPriceAvg` | number 或 null | 推荐 SEM 出价均值。 |
| `googleIndex` | number 或 null | Google 指数。 |
| `kuaishouIndex` | number 或 null | 快手指数。 |
| `weiboIndex` | number 或 null | 微博指数。 |

#### 长尾词说明

- 这个 API 当前已知的官方字段都已经直接归一化到 `data.keywords[]`。
- `raw` 仍然保留，主要用于调试和应对后续上游新增字段。

### get_industry_frequency_words_5118

- 官方 API：细分行业分析 API
- 详情 URL：[5118 详情页](https://www.5118.com/apistore/detail/19bb1381-bcbc-ec11-8da8-e43d1a103141)
- MCP 模式：sync
- 公开契约类型：`GetIndustryFrequencyWords5118Data`、`GetIndustryFrequencyWords5118Item`

#### 行业高频词请求参数

| MCP 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `keyword` | string | 是 | 行业或主题母词。 |

#### 行业高频词最小请求示例

```json
{
  "keyword": "减肥餐"
}
```

#### 行业高频词归一化响应结构

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

#### 行业高频词归一化字段说明

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `word` | string 或 null | 高频词文本。 |
| `ratio` | number 或 null | 占比。 |
| `count` | number 或 null | 出现次数。 |

#### 行业高频词说明

- 适配器归一化后的稳定字段是 `word`、`ratio`、`count`。
- 如果你需要保留厂商原始字段名 `Word`、`Frequency`、`Rate`，请读取 `raw`。

### get_suggest_terms_5118

- 官方 API：下拉联想词挖掘 API
- 详情 URL：[5118 详情页](https://www.5118.com/apistore/detail/597e2193-9490-eb11-8daf-e4434bdf6706)
- MCP 模式：sync
- 公开契约类型：`GetSuggestTerms5118Data`、`GetSuggestTerms5118Item`

#### 联想词请求参数

| MCP 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `word` | string | 是 | 查询联想词时使用的母词。 |
| `platform` | enum | 是 | 官方平台枚举，例如 `baidu`、`baidumobile`、`zhihu`、`douyin`、`amazon`。 |

#### 联想词最小请求示例

```json
{
  "word": "国庆假期",
  "platform": "zhihu"
}
```

#### 联想词归一化响应结构

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

#### 联想词归一化字段说明

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `term` | string 或 null | 主展示联想词。 |
| `sourceWord` | string 或 null | 该行对应的源词。 |
| `promotedTerm` | string 或 null | 扩展后的联想词。 |
| `platform` | string 或 null | 来源平台。 |
| `addTime` | string 或 null | 厂商返回的时间戳。 |

#### 联想词说明

- 这个 API 当前已知的官方字段都已经直接归一化到 `data.suggestions[]`。
- `raw` 仍然保留，用于调试或兼容后续上游变化。

## get_keyword_metrics_5118 返回格式参考

- 官方 API：关键词搜索量信息 API v2
- 详情 URL：[5118 详情页](https://www.5118.com/apistore/detail/90f3d6ed-2b12-ed11-8da8-e43d1a103141)
- MCP 模式：async
- 公开契约类型：`GetKeywordMetrics5118Data`、`GetKeywordMetrics5118Item`

### 关键词指标请求参数

| MCP 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `keywords` | string[] | submit 时必填，且 wait 无 taskId 时必填 | 要查询的关键词列表，最多 `50` 个。 |
| `executionMode` | `submit`、`poll`、`wait` | 否 | 异步模式。`submit` 建任务，`poll` 查任务，`wait` 由适配器内部完成轮询。 |
| `taskId` | string 或 number | poll 时必填 | 现有异步任务标识。 |
| `maxWaitSeconds` | number | 否 | `wait` 模式的最大等待时长。 |
| `pollIntervalSeconds` | number | 否 | `wait` 模式轮询间隔。当前工具默认 `60` 秒。 |

### 关键词指标最小请求示例

提交新异步任务：

```json
{
  "keywords": ["比特币价格"],
  "executionMode": "submit"
}
```

轮询已有任务：

```json
{
  "taskId": 40724567,
  "executionMode": "poll"
}
```

在适配器内部等待完成：

```json
{
  "keywords": ["比特币价格"],
  "executionMode": "wait",
  "maxWaitSeconds": 120,
  "pollIntervalSeconds": 60
}
```

这个工具始终返回上面的统一外壳。真正需要看清的是异步状态变化时
`executionStatus`、`taskId` 和 `data` 的关系。

### 关键词指标状态规则

| 状态 | `executionStatus` | `taskId` | `data` | 调用方动作 |
| --- | --- | --- | --- | --- |
| 已提交但仍处理中 | `pending` | 有值 | `null` | 保存 `taskId`，随后用 `poll` 继续查，或者下次直接用 `wait`。 |
| 轮询后仍处理中 | `pending` | 有值 | `null` | 使用同一个 `taskId` 继续轮询。 |
| 已完成 | `completed` | 通常有值 | 含 `items[]` 的对象 | 从 `data.items[]` 读取归一化后的指标数据。 |

### 关键词指标完成态数据结构

当 `executionStatus` 为 `completed` 时，`data` 的归一化结构如下：

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

### 关键词指标完成态字段说明

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `keyword` | string 或 null | 5118 返回并已解码的关键词文本。 |
| `index` | number 或 null | 搜索指数。 |
| `mobileIndex` | number 或 null | 移动搜索指数。 |
| `haosouIndex` | number 或 null | 360 指数。 |
| `douyinIndex` | number 或 null | 抖音指数。 |
| `toutiaoIndex` | number 或 null | 头条指数。 |
| `googleIndex` | number 或 null | Google 指数。 |
| `kuaishouIndex` | number 或 null | 快手指数。 |
| `weiboIndex` | number 或 null | 微博指数。 |
| `longKeywordCount` | number 或 null | 相关长尾词数量。 |
| `bidCompanyCount` | number 或 null | 该词检测到的竞价公司数量。 |
| `cpc` | number 或 null | 从厂商竞价价格字段归一化来的单价值。 |
| `competition` | number 或 null | 从厂商竞争度字段归一化来的竞争度。 |
| `pcSearchVolume` | number 或 null | PC 检索量。 |
| `mobileSearchVolume` | number 或 null | 移动检索量。 |
| `recommendedBidMin` | number 或 null | 推荐最低出价。 |
| `recommendedBidMax` | number 或 null | 推荐最高出价。 |
| `recommendedBidAvg` | number 或 null | 推荐平均出价。 |
| `ageBest` | string 或 null | 最关注年龄段。 |
| `ageBestValue` | number 或 null | 最关注年龄段占比。 |
| `sexMale` | number 或 null | 男性用户占比。 |
| `sexFemale` | number 或 null | 女性用户占比。 |
| `bidReason` | string 或 null | 竞价展示原因或流量特征说明。 |

### 关键词指标归一化覆盖范围

这个 API 当前已知的官方响应字段都已经直接归一化到 `data.items[]`。

`raw.data.keyword_param[]` 仍然保留，用于调试、契约追踪以及未来上游新增字段的兼容。

### 关键词指标原始结果对象示例

这是官方文档里 `raw.data.keyword_param[]` 这一层对象的大致形态：

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

### 关键词指标解析注意事项

- `data.items[]` 是当前适配器承诺稳定的归一化契约。
- `raw.data.keyword_param[]` 是目前已知最完整的官方字段集合。
- 官方示例里，成功提交任务时 `taskid` 可能出现在 `data.taskid`，不一定在根节点。
- 官方文档展示的是提交成功返回 `errcode: "0"` + `data.taskid`；而真实轮询处理中也可能返回
  `101`，这两种情况都需要按异步处理中理解。

### 关键词指标处理中响应示例

这是 `submit` 或 `poll` 时任务尚未完成的典型响应：

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

### 关键词指标完成态响应示例

这是异步任务完成后的归一化响应：

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

### 关键词指标调用建议

- 优先根据 `executionStatus` 分支，不要直接把厂商 `raw.errcode` 当成最终业务状态。
- 业务读取请优先使用 `data.items[]` 中的归一化字段，`raw` 更适合调试或做厂商兼容兜底。
- 这个工具不会返回分页结果，因此 `pagination` 会一直是 `null`。

### get_mobile_traffic_keywords_5118

- 官方 API：移动流量词挖掘 API
- 详情 URL：[5118 详情页](https://www.5118.com/apistore/detail/540c9870-b2b9-e911-80d2-1866da4dbcc0)
- MCP 模式：async
- 公开契约类型：`GetMobileTrafficKeywords5118Data`、`GetMobileTrafficKeywords5118Item`

#### 移动流量词请求参数

| MCP 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `keyword` | string | submit、wait 无 taskId、poll 时都必填 | 要挖掘的关键词。厂商在 poll 请求中也要求它。 |
| `pageIndex` | number | 否 | 从 1 开始的结果页码，默认 `1`。 |
| `pageSize` | number | 否 | 每页数量，最大 `500`，默认 `20`。 |
| `executionMode` | `submit`、`poll`、`wait` | 否 | 异步模式。由于官方采集时间可能较长，这个工具默认 `submit`。 |
| `taskId` | string 或 number | poll 时必填 | 现有异步任务标识。 |
| `maxWaitSeconds` | number | 否 | `wait` 模式最大等待时长。 |
| `pollIntervalSeconds` | number | 否 | `wait` 模式轮询间隔覆盖值。 |

#### 移动流量词最小请求示例

提交新异步任务：

```json
{
  "keyword": "比特币",
  "executionMode": "submit"
}
```

轮询已有任务：

```json
{
  "keyword": "比特币",
  "taskId": 50724567,
  "executionMode": "poll"
}
```

在适配器内部等待完成：

```json
{
  "keyword": "比特币",
  "executionMode": "wait",
  "maxWaitSeconds": 180,
  "pollIntervalSeconds": 60
}
```

#### 移动流量词状态规则

| 状态 | `executionStatus` | `taskId` | `data` | 调用方动作 |
| --- | --- | --- | --- | --- |
| 已提交但仍处理中 | `pending` | 有值 | `null` | 保存 `taskId`，随后用 `poll` 重试，或者改用 `wait`。 |
| 轮询后仍处理中 | `pending` | 有值 | `null` | 使用同一个 `taskId` 和 `keyword` 继续轮询。 |
| 已完成 | `completed` | 通常有值 | 含 `keywords[]` 与 `pagination` 的对象 | 从 `data.keywords[]` 读取归一化结果行。 |

#### 移动流量词归一化响应结构

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

#### 移动流量词归一化字段说明

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `keyword` | string 或 null | 流量词文本。 |
| `index` | number 或 null | 上游响应中的指数值。 |
| `weight` | number 或 null | 厂商价值量或权重分值。 |
| `mobileIndex` | number 或 null | 移动指数。 |
| `mobileSearchVolume` | number 或 null | 移动日检索量。 |
| `rank` | number 或 null | 排名位次。 |
| `url` | string 或 null | 该流量词对应的 URL。 |

#### 移动流量词处理中响应示例

这是 `submit` 或 `poll` 时任务尚未完成的典型响应：

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

#### 移动流量词完成态响应示例

这是异步任务完成后的归一化响应：

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

#### 移动流量词调用建议

- 优先根据 `executionStatus` 分支，不要直接把厂商 `raw.errcode` 当成最终业务状态。
- 轮询时请保留原始 `keyword` 和 `taskId` 一起传入，因为上游接口要求这两个值同时存在。
- 业务读取请优先使用 `data.keywords[]` 中的归一化字段，`raw` 更适合调试或做厂商兼容兜底。

#### 移动流量词说明

- 这个 API 当前已知的官方字段都已经直接归一化到 `data.keywords[]`。
- `raw` 仍然保留，用于调试和兼容未来上游新增字段。
