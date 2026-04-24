# Standalone Usage

This document is also available in [Chinese](./standalone-usage-zh.md).

## Scope

This project is a standalone MCP server that wraps official 5118 APIs.

The current implementation includes exactly five tools:

- `get_longtail_keywords_5118`
- `get_industry_frequency_words_5118`
- `get_suggest_terms_5118`
- `get_keyword_metrics_5118`
- `get_mobile_traffic_keywords_5118`

## Environment Variables

Set one shared API key for all currently implemented tools:

- `API_KEY`

## Build and Run

```bash
npm install
npm run build
node dist/index.js
```

## Live Runner and Debugging

The repository now includes a runnable live test script:

```bash
API_KEY="your-5118-api-key" npm run test:live
```

Run a specific tool with verbose output:

```bash
API_KEY="your-5118-api-key" npm run test:live -- --tool suggest --word "比特币" --platform baidu --verbose
```

Run the wave-one scenario from the bundled sequence file:

```bash
API_KEY="your-5118-api-key" npm run test:live -- --scenario wave-one
```

Start with Node inspector for step-by-step debugging:

```bash
API_KEY="your-5118-api-key" npm run test:live:debug -- --tool metrics --keywords "比特币价格,比特币是什么" --executionMode wait
```

## Stdio Transport Example

Use [examples/vscode-mcp.stdio.example.json](../../examples/vscode-mcp.stdio.example.json)
as the reference entry.

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
