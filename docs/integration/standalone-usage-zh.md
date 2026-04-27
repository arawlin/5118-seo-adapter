# 独立使用说明

本文档亦提供[英文版](./standalone-usage.md)。

## 范围

本工程是独立的 MCP server，仅封装 5118 官方 API。

当前实现固定包含 5 个工具：

- `get_longtail_keywords_5118`
- `get_industry_frequency_words_5118`
- `get_suggest_terms_5118`
- `get_keyword_metrics_5118`
- `get_mobile_traffic_keywords_5118`

## 环境变量

当前实现的 5 个工具分别使用独立的 API key 环境变量：

- `API_5118_LONGTAIL_V2`
- `API_5118_FREQ_WORDS`
- `API_5118_SUGGEST`
- `API_5118_KW_PARAM_V2`
- `API_5118_TRAFFIC`

## 构建与启动

```bash
npm install
npm run build
node dist/index.js
```

## Stdio 配置示例

请参考 [examples/vscode-mcp.stdio.example.json](../../examples/vscode-mcp.stdio.example.json)
中的标准配置。

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

### 错误行为

工具调用失败时，当前实现通常直接抛出 MCP 工具错误，而不是返回
`executionStatus: "failed"` 的外壳。因此，只要拿到了响应外壳，就应优先根据
`executionStatus` 判断异步状态。

## get_keyword_metrics_5118 返回格式参考

这个工具始终返回上面的统一外壳。真正需要看清的是异步状态变化时
`executionStatus`、`taskId` 和 `data` 的关系。

### 状态规则

| 状态 | `executionStatus` | `taskId` | `data` | 调用方动作 |
| --- | --- | --- | --- | --- |
| 已提交但仍处理中 | `pending` | 有值 | `null` | 保存 `taskId`，随后用 `poll` 继续查，或者下次直接用 `wait`。 |
| 轮询后仍处理中 | `pending` | 有值 | `null` | 使用同一个 `taskId` 继续轮询。 |
| 已完成 | `completed` | 通常有值 | 含 `items[]` 的对象 | 从 `data.items[]` 读取归一化后的指标数据。 |

### 完成态数据结构

当 `executionStatus` 为 `completed` 时，`data` 的归一化结构如下：

```json
{
  "items": [
    {
      "keyword": "比特币价格",
      "index": 12000,
      "mobileIndex": 9800,
      "longKeywordCount": 320,
      "bidCompanyCount": 12,
      "cpc": 6.5,
      "competition": 1
    }
  ]
}
```

### 完成态字段说明

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `keyword` | string 或 null | 5118 返回并已解码的关键词文本。 |
| `index` | number 或 null | 搜索指数。 |
| `mobileIndex` | number 或 null | 移动搜索指数。 |
| `longKeywordCount` | number 或 null | 相关长尾词数量。 |
| `bidCompanyCount` | number 或 null | 该词检测到的竞价公司数量。 |
| `cpc` | number 或 null | 从厂商竞价价格字段归一化来的单价值。 |
| `competition` | number 或 null | 从厂商竞争度字段归一化来的竞争度。 |

### 归一化字段与原始字段覆盖范围

当前适配器只把官方返回里一组稳定字段归一化到 `data.items[]`。官方接口里更完整的
字段集合仍然会完整保留在 `raw.data.keyword_param[]` 下。

如果你需要稳定做程序解析，优先使用归一化字段。如果你需要更丰富的平台指数、
人群属性或推荐出价信息，再读取 `raw.data.keyword_param[]`。

### `raw.data.keyword_param[]` 中保留的官方原始字段

| 厂商字段 | 类型 | 含义 | 当前是否已归一化 |
| --- | --- | --- | --- |
| `keyword` | string | 原始关键词文本，raw 中可能仍是 URL 编码值。 | `data.items[].keyword` |
| `index` | int | 搜索量或流量指数。 | `data.items[].index` |
| `mobile_index` | int | 移动搜索指数。 | `data.items[].mobileIndex` |
| `haosou_index` | int | 360 指数。 | 仅 raw |
| `douyin_index` | int | 抖音指数。 | 仅 raw |
| `toutiao_index` | int | 头条指数。 | 仅 raw |
| `google_index` | int | Google 指数。 | 仅 raw |
| `kuaishou_index` | int | 快手指数。 | 仅 raw |
| `weibo_index` | int | 微博指数。 | 仅 raw |
| `bidword_kwc` | int | 竞价竞争度。官方定义：`1` 高、`2` 中、`3` 低。 | `data.items[].competition` |
| `bidword_pcpv` | int | PC 检索量。 | 仅 raw |
| `bidword_wisepv` | int | 移动检索量。 | 仅 raw |
| `long_keyword_count` | int | 长尾词个数。 | `data.items[].longKeywordCount` |
| `bidword_price` | number | SEM 点击价格。 | `data.items[].cpc` |
| `bidword_company_count` | int | 竞价公司数量。 | `data.items[].bidCompanyCount` |
| `bidword_recommendprice_min` | number | 推荐最低出价。 | 仅 raw |
| `bidword_recommendprice_max` | number | 推荐最高出价。 | 仅 raw |
| `bidword_recommend_price_avg` | number | 推荐平均出价。 | 仅 raw |
| `age_best` | string | 最关注年龄段。 | 仅 raw |
| `age_best_value` | number | 最关注年龄段占比。 | 仅 raw |
| `sex_male` | number | 男性用户占比。 | 仅 raw |
| `sex_female` | number | 女性用户占比。 | 仅 raw |
| `bidword_showreasons` | string | 竞价展示原因或流量特征说明。 | 仅 raw |

### 原始结果对象示例

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

### 解析注意事项

- `data.items[]` 是当前适配器承诺稳定的归一化契约。
- `raw.data.keyword_param[]` 是目前已知最完整的官方字段集合。
- 官方示例里，成功提交任务时 `taskid` 可能出现在 `data.taskid`，不一定在根节点。
- 官方文档展示的是提交成功返回 `errcode: "0"` + `data.taskid`；而真实轮询处理中也可能返回
  `101`，这两种情况都需要按异步处理中理解。

### 处理中响应示例

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

### 完成态响应示例

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
        "longKeywordCount": 320,
        "bidCompanyCount": 12,
        "cpc": 6.5,
        "competition": 1
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

### 调用建议

- 优先根据 `executionStatus` 分支，不要直接把厂商 `raw.errcode` 当成最终业务状态。
- 业务读取请优先使用 `data.items[]` 中的归一化字段，`raw` 更适合调试或做厂商兼容兜底。
- 这个工具不会返回分页结果，因此 `pagination` 会一直是 `null`。
