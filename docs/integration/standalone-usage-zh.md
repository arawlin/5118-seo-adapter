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

当前实现的 5 个工具共用一个 API key：

- `API_KEY`

## 构建与启动

```bash
npm install
npm run build
node dist/index.js
```

## 真实调用与调试

仓库现已包含可直接运行的真实调用脚本：

```bash
API_KEY="your-5118-api-key" npm run test:live
```

指定单个工具并输出详细结果：

```bash
API_KEY="your-5118-api-key" npm run test:live -- --tool suggest --word "比特币" --platform baidu --verbose
```

按内置序列执行 wave-one 场景：

```bash
API_KEY="your-5118-api-key" npm run test:live -- --scenario wave-one
```

使用 Node 调试器逐步调试：

```bash
API_KEY="your-5118-api-key" npm run test:live:debug -- --tool metrics --keywords "比特币价格,比特币是什么" --executionMode wait
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
