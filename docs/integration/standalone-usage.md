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

Set one API key env var per currently implemented tool:

- `API_5118_LONGTAIL_V2`
- `API_5118_FREQ_WORDS`
- `API_5118_SUGGEST`
- `API_5118_KW_PARAM_V2`
- `API_5118_TRAFFIC`

## Build and Run

```bash
npm install
npm run build
node dist/index.js
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
