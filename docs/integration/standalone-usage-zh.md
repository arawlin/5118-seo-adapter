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
