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

### Error Behavior

Tool failures are normally raised as MCP tool errors instead of returning an
envelope with `executionStatus: "failed"`. Clients should treat a returned
envelope as a successful adapter response and branch on `executionStatus` for
async task state.

## get_keyword_metrics_5118 Response Reference

This tool always returns the shared envelope shown above. The important part is
how `executionStatus`, `taskId`, and `data` change across async states.

### State Rules

| State | `executionStatus` | `taskId` | `data` | Client action |
| --- | --- | --- | --- | --- |
| Submit accepted, still processing | `pending` | present | `null` | Store `taskId` and call again with `poll`, or use `wait` next time. |
| Poll still processing | `pending` | present | `null` | Continue polling with the same `taskId`. |
| Completed | `completed` | usually present | object with `items[]` | Read normalized metrics from `data.items[]`. |

### Completed Data Shape

When `executionStatus` is `completed`, `data` has this normalized shape:

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

### Completed Item Fields

| Field | Type | Meaning |
| --- | --- | --- |
| `keyword` | string or null | Decoded keyword text returned by 5118. |
| `index` | number or null | Search volume index. |
| `mobileIndex` | number or null | Mobile search volume index. |
| `longKeywordCount` | number or null | Number of related long-tail keywords. |
| `bidCompanyCount` | number or null | Number of bidding companies detected for the keyword. |
| `cpc` | number or null | Cost-per-click style price field normalized from vendor bid price fields. |
| `competition` | number or null | Competition level normalized from vendor competition fields. |

### Normalized vs Raw Field Coverage

The adapter currently normalizes a stable subset of the official 5118 response
into `data.items[]`. The full official vendor payload is still preserved under
`raw.data.keyword_param[]`.

Use the normalized fields for stable programmatic consumption. Use the raw
vendor fields when you need extra dimensions that are not yet mapped into the
top-level normalized shape.

### Official Raw Fields Preserved Under `raw.data.keyword_param[]`

| Vendor field | Type | Meaning | Normalized today |
| --- | --- | --- | --- |
| `keyword` | string | Original keyword text. In raw payload it may still be URL-encoded. | `data.items[].keyword` |
| `index` | int | Search volume or traffic index. | `data.items[].index` |
| `mobile_index` | int | Mobile search index. | `data.items[].mobileIndex` |
| `haosou_index` | int | 360 index. | raw only |
| `douyin_index` | int | Douyin index. | raw only |
| `toutiao_index` | int | Toutiao index. | raw only |
| `google_index` | int | Google index. | raw only |
| `kuaishou_index` | int | Kuaishou index. | raw only |
| `weibo_index` | int | Weibo index. | raw only |
| `bidword_kwc` | int | Bid competition level. Official meaning: `1` high, `2` medium, `3` low. | `data.items[].competition` |
| `bidword_pcpv` | int | PC search volume. | raw only |
| `bidword_wisepv` | int | Mobile search volume. | raw only |
| `long_keyword_count` | int | Number of long-tail keywords. | `data.items[].longKeywordCount` |
| `bidword_price` | number | SEM click price. | `data.items[].cpc` |
| `bidword_company_count` | int | Number of bidding companies. | `data.items[].bidCompanyCount` |
| `bidword_recommendprice_min` | number | Recommended minimum bid price. | raw only |
| `bidword_recommendprice_max` | number | Recommended maximum bid price. | raw only |
| `bidword_recommend_price_avg` | number | Recommended average bid price. | raw only |
| `age_best` | string | Age segment with the strongest interest. | raw only |
| `age_best_value` | number | Percentage for the strongest-interest age segment. | raw only |
| `sex_male` | number | Male audience percentage. | raw only |
| `sex_female` | number | Female audience percentage. | raw only |
| `bidword_showreasons` | string | Bid display reason or traffic characteristic note. | raw only |

### Raw Result Shape Example

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

### Important Parsing Notes

- `data.items[]` is the adapter's stable normalized contract.
- `raw.data.keyword_param[]` is the complete official field set currently known
  from the 5118 documentation.
- Some vendor examples include `taskid` at `data.taskid` instead of at the root.
  The adapter tolerates both shapes.
- Official docs show successful submit responses with `errcode: "0"` and a
  nested `data.taskid`, even though live pending polling may also return vendor
  code `101`.

### Pending Response Example

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

### Completed Response Example

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

### Client Guidance

- Prefer branching on `executionStatus` instead of vendor `raw.errcode`.
- Read normalized values from `data.items[]` and use `raw` only for debugging
  or vendor-specific fallback handling.
- Expect `pagination` to stay `null` for this tool.
