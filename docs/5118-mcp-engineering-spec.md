# 5118 MCP Engineering Specification

This document is also available in [Chinese](./5118-mcp-engineering-spec-zh.md).

## Purpose

This document is the source-of-truth engineering specification for a full 5118
MCP project.

It defines the target architecture, shared runtime rules, normalization model,
error model, rollout boundaries, and the complete tool catalog for every 5118
API documented in the official 5118 vendor bundle.

Later implementation plans may target only a keyword research subset, but every
partial plan must remain compatible with this document.

## Authoritative Inputs

The MCP project should be generated from a project-local copy of the official
5118 vendor documentation bundle first. Any supplementary notes may be used as
design aids, but they must never override vendor semantics.

That local vendor bundle must contain at least:

- the top-level `SKILL.md`
- the top-level `README.md`
- every API reference under `references/`
- `references/error-codes.md`

## Critical Inventory Note

The vendor package is internally inconsistent and the MCP project must account
for that inconsistency explicitly.

- The top-level vendor skill package and README advertise 38 APIs.
- The `references/` directory contains 39 API reference files.
- `original.md` defines an originality-check API with env var
  `API_5118_ORIGINAL`.
- That originality API is not listed in the top-level route table.

The MCP target therefore includes 39 tools, not 38, unless a later official
vendor correction removes one of the reference files.

## Project Outcome

The target project wraps all 39 confirmed vendor APIs behind one MCP server and
one shared implementation model.

The generated project must:

- Expose one semantic MCP tool per official 5118 API.
- Hide vendor-specific encoding, polling, paging, and error quirks.
- Preserve the raw vendor payload for debugging and future field expansion.
- Support partial rollout by module without changing the public contract.
- Fail clearly when the required API key env var is missing.

## Recommended Reference Stack

This specification is runtime-agnostic, but the recommended reference stack is:

- Node.js with TypeScript
- Official MCP SDK
- `stdio` transport first
- Optional Streamable HTTP transport second
- One shared 5118 HTTP client for `POST` form requests
- Fixture-based contract tests plus opt-in smoke tests

If another runtime is used, the generated project must still implement the same
tool contracts and shared rules defined here.

## Shared Runtime Contract

| Item | Requirement |
| --- | --- |
| Base URL | `https://apis.5118.com` |
| HTTP method | `POST` only |
| Content type | `application/x-www-form-urlencoded; charset=utf-8` |
| Auth header | `Authorization: <APIKEY>` with the raw key value and no prefix |
| Success condition | `errcode == "0"` |
| Common response fields | `errcode`, `errmsg`, plus tool-specific payload |
| API key model | The current implementation uses one shared env var: `API_KEY` |
| Request encoding | URL-encode text fields that may contain Chinese or long text |
| Response decoding | URL-decode returned string fields before exposing normalized data |
| Raw payload retention | Always keep the original vendor JSON under `raw` |
| Secret handling | Never log raw API keys or echo them in tool errors |
| Missing key behavior | Return a configuration error naming the required env var |

## Mandatory Internal Modules

The generated MCP project should include these shared modules before any tool
implementation begins.

- Config registry: maps each MCP tool to one shared key env var for the currently implemented tool set.
- 5118 HTTP client: sends authenticated form requests.
- Encoding layer: URL-encodes required request fields and URL-decodes returned
  strings.
- Async poller: supports `submit`, `poll`, and `wait` flows.
- Pagination mapper: normalizes `page_index`, `page_size`, `page_count`, and
  `total`.
- Error mapper: translates vendor error codes into stable MCP-facing errors.
- Response normalizer: converts vendor field names into predictable top-level
  structures while preserving `raw`.
- Rate-limit guard: handles retryable quota and timeout errors.
- Test fixtures: stores stable success, pending, invalid-input, and auth-error
  samples.

## Tool Naming and Contract Rules

### Naming Convention

- Use one MCP tool per vendor API.
- Use snake_case names ending in `_5118`.
- Prefer semantic task names instead of raw endpoint names.

### Sync and Async Exposure Model

Async vendor APIs should still appear as one logical MCP tool each. They must
accept shared execution controls rather than splitting into separate submit and
poll tools.

### Shared Async Control Fields

Async tools should accept these control fields in addition to their business
parameters.

| Field | Type | Meaning |
| --- | --- | --- |
| `executionMode` | `submit \| poll \| wait` | `submit` returns a `taskId`, `poll` checks an existing task, `wait` handles the polling loop internally |
| `taskId` | string or number | Required for `poll` mode |
| `maxWaitSeconds` | number | Upper bound for internal polling in `wait` mode |
| `pollIntervalSeconds` | number | Poll interval override |

Recommended defaults:

- Use `wait` by default for short async flows.
- Use `submit` by default for APIs that may take minutes, especially
  `/traffic`.
- Allow clients to override defaults explicitly.

### Normalized Response Envelope

Every tool should return a normalized top-level envelope like this:

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
  "pagination": {
    "pageIndex": 1,
    "pageSize": 100,
    "pageCount": 10,
    "total": 1000
  },
  "data": {},
  "warnings": [],
  "raw": {}
}
```

### Normalization Rules

- Use camelCase for normalized field names.
- Keep vendor-specific names and types intact under `raw`.
- Convert obvious numeric strings to numbers only in normalized fields.
- Return `null` for unavailable normalized values instead of inventing values.
- Normalize paginated outputs into one `pagination` object.
- Normalize arrays into descriptive keys such as `keywords`, `items`,
  `rankings`, `records`, `titles`, or `issues`.

## Error Translation Policy

| Vendor code | Meaning | MCP behavior |
| --- | --- | --- |
| `0` | Success | Return normalized data |
| `100101` | Quota exhausted | Fail as non-retryable billing/quota error |
| `100102` | Per-second rate limit | Retry with backoff |
| `100103` | Per-hour rate limit | Fail with retry-after guidance |
| `100104` | Per-day rate limit | Fail with retry-after guidance |
| `100202` | Missing API key | Fail as configuration error |
| `100203` | Invalid API key | Fail as configuration error |
| `100204` | API does not exist | Fail as upstream contract error |
| `100208` | Wrong HTTP method | Internal implementation error |
| `200103` | Task does not exist | Fail as invalid task reference |
| `200104` | Data is still processing | Return `pending` or continue polling |
| `200107` | Server timeout | Retry with capped backoff |
| `200121` | Domain export unsupported | Fail as unsupported target error |
| `200201` | Empty parameter | Fail as invalid input |
| `200203` | Missing keyword | Fail as invalid input |
| `200204` | Missing URL | Fail as invalid input |
| `200301` | Invalid URL format | Fail as invalid input |
| `200401` | Keyword count over limit | Split the request or fail with limit detail |
| `101` | Task still processing in `keywordparam/v2` | Treat as pending even though it is not listed in the shared error doc |

## Async Workflow Matrix

| Tool | Endpoint | Submit parameters | Poll parameters | Completion signal | Notes |
| --- | --- | --- | --- | --- | --- |
| `get_keyword_metrics_5118` | `/keywordparam/v2` | `keywords` | `taskId` | `errcode == "0"` | Vendor may use `101` for pending |
| `get_mobile_traffic_keywords_5118` | `/traffic` | `keyword` | `taskId`, `keyword`, paging | `errcode == "0"` | First response normally returns `200104` plus `taskid`; allow long waits |
| `get_pc_rank_snapshot_5118` | `/morerank/baidupc` | `url`, `keywords`, `checkRow` | `taskId` | `errcode == "0"` | Polling can be wrapped or exposed |
| `get_mobile_rank_snapshot_5118` | `/morerank/baidumobile` | `url`, `keywords`, `checkRow` | `taskId` | `errcode == "0"` | Same pattern as PC |
| `get_pc_top50_sites_5118` | `/keywordrank/baidupc` | `keywords`, `checkRow` | `taskId` | `errcode == "0"` | Result root is `keyword_monitor` |
| `get_mobile_top50_sites_5118` | `/keywordrank/baidumobile` | `keywords`, `checkRow` | `taskId` | `errcode == "0"` | Result root is `keyword_monitor` |
| `check_url_indexing_5118` | `/include` | `urls` | `taskId` | `check_status == 1` | The completion flag is not only `errcode` |
| `get_icp_record_instant_5118` | `/icp/instant` | `searchText` | `taskId` | vendor-specific success payload | Response schema is only partially documented |

## Shared Enum and Constraint Notes

These values are important because code generation often gets them wrong.

| Field | Known values or limits | Applies to |
| --- | --- | --- |
| `platform` | `baidu`, `baidumobile`, `shenma`, `360`, `360mobile`, `sogou`, `sogoumobile`, `zhihu`, `toutiao`, `taobao`, `tmall`, `pinduoduo`, `jingdong`, `douyin`, `amazon`, `xiaohongshu` | `get_suggest_terms_5118` |
| `searchType` | `domain`, `icp`, `name`, `company` | `get_icp_record_5118` |
| `retype` | `1`, `2`, `3` | `rewrite_text_5118` |
| `strict` | `0` to `4` | `paraphrase_sentence_5118` |
| `strict` | higher is stricter, default `1` | `replace_terms_5118` |
| `scheme` | `1` preferred, `2` diverse | `compose_article_paragraphs_5118` |
| keyword count | max `50` | `get_keyword_metrics_5118`, live rank tools, top-50 tools |
| URL count | max `200` | `check_url_indexing_5118` |
| export page size | fixed `500` | PC/mobile/domain ranking export tools |
| standard page size | max `100` | long-tail and vertical keyword tools |
| bid paging size | max `500` | bid company and bid keyword tools |
| rewrite text length | less than `5000` chars | rewrite tools |
| originality text length | less than `7500` chars | `check_originality_5118` |
| AI detect length | `100` to `6000` chars | `detect_ai_content_5118` |
| sentence length | max `150` chars | `paraphrase_sentence_5118` |
| expander input length | `5` to `300` chars | `expand_text_5118` |
| expander output target | max `1000` chars | `expand_text_5118` |
| article length target | max `3000` chars | `compose_article_paragraphs_5118` |

## Full API Catalog

### Keyword Discovery and Expansion

| MCP tool | Official API / endpoint | Env var | Mode | Required input | Key options | Normalized data field | Constraints and notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `get_longtail_keywords_5118` | Massive Long-tail Keyword Mining v2 / `/keyword/word/v2` | `API_KEY` | Sync | `keyword` | `pageIndex`, `pageSize`, `sortField`, `sortType`, `filter`, `filterDate` | `keywords[]` | `pageSize <= 100`; supports sorting and quick filters |
| `get_industry_frequency_words_5118` | Industry Frequency Analysis / `/tradeseg` | `API_KEY` | Sync | `keyword` | none | `frequencyWords[]` | Returns high-frequency segmentation words and ratios |
| `get_suggest_terms_5118` | Suggestion Mining / `/suggest/list` | `API_KEY` | Sync | `word`, `platform` | none | `suggestions[]` | `platform` must be one of the documented vendor values |
| `get_keyword_metrics_5118` | Keyword Search Volume Info v2 / `/keywordparam/v2` | `API_KEY` | Async | `keywords[]` | async control fields | `items[]` | Max 50 keywords; vendor uses `\|` delimiter; pending may return `101` |
| `get_taobao_keywords_5118` | Taobao Long-tail Mining / `/keyword/taobao` | `API_5118_TAOBAO` | Sync | `keyword` | paging and sort options | `keywords[]` | Same family as other vertical keyword tools |
| `get_jd_keywords_5118` | JD Long-tail Mining / `/keyword/jd` | `API_5118_JD` | Sync | `keyword` | paging and sort options | `keywords[]` | Same paging model as Taobao |
| `get_pdd_keywords_5118` | Pinduoduo Long-tail Mining / `/keyword/pinduoduo` | `API_5118_PDD` | Sync | `keyword` | paging and sort options | `keywords[]` | Same paging model as Taobao |
| `get_sm_keywords_5118` | Shenma Long-tail Mining / `/keyword/sm/word` | `API_5118_SM` | Sync | `keyword` | paging and sort options | `keywords[]` | Search vertical for Shenma |
| `get_google_keywords_5118` | Google Long-tail Mining / `/keyword/google` | `API_5118_GOOGLE` | Sync | `keyword` | paging and sort options | `keywords[]` | Search vertical for Google |
| `get_amazon_keywords_5118` | Amazon Long-tail Mining / `/keyword/amazon` | `API_5118_AMAZON` | Sync | `keyword` | paging and sort options | `keywords[]` | Search vertical for Amazon |
| `get_mobile_traffic_keywords_5118` | Mobile Traffic Keyword Mining / `/traffic` | `API_KEY` | Async | `keyword` | async control fields, paging | `keywords[]` | Long-running task; second step requires both `taskId` and `keyword` |

### Ranking Keyword Exports

| MCP tool | Official API / endpoint | Env var | Mode | Required input | Key options | Normalized data field | Constraints and notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `export_pc_site_keywords_5118` | PC Site Ranking Keywords v2 / `/keyword/pc/v2` | `API_5118_BAIDUPC_V2` | Sync | `url` | `pageIndex` | `keywords[]` | Vendor result root is `data.baidupc[]`; `pageSize` is fixed at 500 |
| `get_baijiahao_rankings_5118` | Baijiahao Ranking Export / `/keyword/baijiahao` | `API_5118_BAIJIAHAO` | Sync | `keyword`, `platform` | none | `rankings[]` | `platform` is `pc` or `mobile`; keyword means the Baijiahao target |
| `export_mobile_site_keywords_5118` | Mobile Site Ranking Keywords v2 / `/keyword/mobile/v2` | `API_5118_MOBILE_V2` | Sync | `url` | `pageIndex` | `keywords[]` | Vendor result root is `data.baidumobile[]`; `pageSize` is fixed at 500 |
| `export_domain_keywords_5118` | Domain Ranking Keywords v2 / `/keyword/domain/v2` | `API_5118_DOMAIN_V2` | Sync | `url` | `pageIndex` | `keywords[]` | Whole-domain aggregation; `pageSize` is fixed at 500 |

### Bid Intelligence

| MCP tool | Official API / endpoint | Env var | Mode | Required input | Key options | Normalized data field | Constraints and notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `get_bid_companies_5118` | Bid Company Mining / `/bidsite` | `API_5118_BIDSITE` | Sync | `keyword` | `pageIndex`, `pageSize` | `companies[]` | Bid intelligence query; page size may go up to 500 |
| `export_bid_keywords_5118` | Site Bid Keywords v2 / `/bidword/v2` | `API_5118_BIDWORD_V2` | Sync | `url` | `pageIndex`, `pageSize` | `keywords[]` | Bid keyword export; page size may go up to 500 |

### Live Rank Checks

| MCP tool | Official API / endpoint | Env var | Mode | Required input | Key options | Normalized data field | Constraints and notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `get_pc_rank_snapshot_5118` | PC Live Rank Query / `/morerank/baidupc` | `API_5118_RANK_PC` | Async | `url`, `keywords[]` | `checkRow`, async control fields | `rankings[]` | Max 50 keywords; `checkRow <= 50`; result root is `data.keywordmonitor[]` |
| `get_mobile_rank_snapshot_5118` | Mobile Live Rank Query / `/morerank/baidumobile` | `API_5118_RANK_MOBILE` | Async | `url`, `keywords[]` | `checkRow`, async control fields | `rankings[]` | Max 50 keywords; `checkRow <= 100`; result root is `data.keywordmonitor[]` |

### Top-50 Ranking Snapshots

| MCP tool | Official API / endpoint | Env var | Mode | Required input | Key options | Normalized data field | Constraints and notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `get_pc_top50_sites_5118` | PC Top-50 Sites / `/keywordrank/baidupc` | `API_5118_KWRANK_PC` | Async | `keywords[]` | `checkRow`, async control fields | `siteSnapshots[]` | Max 50 keywords; result root is `data.keyword_monitor[]` |
| `get_mobile_top50_sites_5118` | Mobile Top-50 Sites / `/keywordrank/baidumobile` | `API_5118_KWRANK_MOBILE` | Async | `keywords[]` | `checkRow`, async control fields | `siteSnapshots[]` | Max 50 keywords; result root is `data.keyword_monitor[]` |

### Site Verification and Registry

| MCP tool | Official API / endpoint | Env var | Mode | Required input | Key options | Normalized data field | Constraints and notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `check_url_indexing_5118` | URL Inclusion Check / `/include` | `API_5118_INCLUDE` | Async | `urls[]` | async control fields | `results[]` | Max 200 URLs; vendor completion signal uses `check_status` |
| `get_site_weight_5118` | 5118 Site Weight / `/weight` | `API_5118_WEIGHT` | Sync | `url` | none | `weights` | Vendor result is `data.result[]` with one-key objects; flatten in normalized output |
| `get_icp_record_5118` | ICP Record Lookup / `/icp/getinfo` | `API_5118_ICP` | Sync | `searchText` | `searchType` | `record` | Vendor docs describe `subject` and `webList` but do not provide a full JSON example |
| `get_icp_record_instant_5118` | Instant ICP Record Lookup / `/icp/instant` | `API_5118_ICP_INSTANT` | Async | `searchText` | async control fields | `record` | Response schema is partially documented; preserve `raw` carefully |

### Rewrite and Replacement

| MCP tool | Official API / endpoint | Env var | Mode | Required input | Key options | Normalized data field | Constraints and notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `rewrite_text_5118` | Rewrite / `/wyc/rewrite` | `API_5118_REWRITE` | Sync | `text` | `retype`, `keepHtml`, `sim` | `text`, `similarity` | Text must be URL-encoded; length under 5000 chars |
| `rewrite_text_senior_5118` | Senior Rewrite / `/wyc/seniorrewrite` | `API_5118_SENIOR_REWRITE` | Sync | `text` | `sim` | `text`, `similarity` | Text must be URL-encoded; length under 5000 chars |
| `replace_terms_5118` | Term Replacement / `/wyc/akey` | `API_5118_AKEY` | Sync | `text` | `th`, `filter`, `corewordfilter`, `sim`, `strict` | `text`, `coreTerms`, `similarity` | Text must be URL-encoded; `filter` uses vendor `\|` delimiter |

### Text Analysis and Inspection

| MCP tool | Official API / endpoint | Env var | Mode | Required input | Key options | Normalized data field | Constraints and notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `extract_core_terms_5118` | Core Term Extraction / `/coreword` | `API_5118_COREWORD` | Sync | `text` | none | `coreTerms[]` | Text must be URL-encoded |
| `detect_banned_words_5118` | Banned Word Detection / `/bannedword/v2` | `API_5118_BANNEDWORD` | Sync | `text` | none | `issues[]` | Vendor result is hierarchical by level and item |
| `extract_abstract_5118` | Abstract Extraction / `/abstract` | `API_5118_ABSTRACT` | Sync | `text` | none | `abstract` | Text must be URL-encoded |
| `check_text_similarity_5118` | Similarity Check / `/wyc/sim` | `API_5118_SIM` | Sync | `originalText`, `newText` | none | `similarity` | Both fields must be URL-encoded |
| `detect_ai_content_5118` | AI Content Detection / `/aidetect` | `API_5118_AIDETECT` | Sync | `content` | none | `aiReport` | Text must be URL-encoded; length 100 to 6000 chars; includes line scores |
| `check_originality_5118` | Originality Check / `/wyc/original` | `API_5118_ORIGINAL` | Sync | `text` | none | `originalityMatches[]` | Text must be URL-encoded; length under 7500 chars; missing from top-level vendor route table |

### Content Generation and Creative Output

| MCP tool | Official API / endpoint | Env var | Mode | Required input | Key options | Normalized data field | Constraints and notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `expand_text_5118` | Auto Expander / `/ai/autoexpander` | `API_5118_EXPANDER` | Sync | `keywords` | `wishContentCount`, `modelVersion` | `text` | Input length 5 to 300 chars; target output max 1000 chars |
| `paraphrase_sentence_5118` | Sentence Paraphrase / `/wyc/sentence` | `API_5118_SENTENCE` | Sync | `text` | `strict` | `candidates[]` | Text must be URL-encoded; length max 150 chars; strict range 0 to 4 |
| `generate_title_from_text_5118` | Title Generation / `/wyc/title` | `API_5118_TITLE` | Sync | `text` | none | `title` | Text must be URL-encoded; length max 5000 chars |
| `optimize_title_from_keywords_5118` | Title Optimizer / `/ai/titleoptimizer` | `API_5118_TITLEOPTIMIZER` | Sync | `keywords` | none | `titles[]` | Vendor returns one newline-delimited string; split into array in normalized output |
| `compose_article_paragraphs_5118` | Article Writer / `/articlewriter` | `API_5118_ARTICLEWRITER` | Sync | `keywords`, `excludeKeywords`, `maxContentCount`, `startDate`, `endDate` | `scheme` | `article` | `keywords` max 5 terms separated by spaces; both text fields require URL encoding; `maxContentCount <= 3000` |

## Delivery Waves

This document defines the full target surface, but staged delivery is expected.

1. Wave 0: shared runtime modules, env registry, error mapping, encoding,
   normalization, and async control model.
2. Wave 1: keyword discovery APIs for keyword research workflows.
3. Wave 2: ranking, export, bid, and site verification APIs.
4. Wave 3: rewrite, analysis, generation, and creative content APIs.

Wave plans may choose fewer tools, but they must not redefine names, response
envelopes, error semantics, or env var contracts.

## Testing Requirements

Every generated tool should have at least these test layers.

- One success fixture using a captured vendor-shaped payload.
- One missing-key test that names the exact required env var.
- One invalid-input test for documented limits.
- One rate-limit or quota test where the API documents a limit path.
- For async tools, separate `submit`, `pending`, `completed`, and timeout tests.
- For text tools, request URL-encoding and response URL-decoding tests.
- For normalization, tests that verify both normalized fields and untouched
  `raw` payload retention.

Smoke tests should be opt-in because each API uses a separate billable key.

## Open Questions and Required Validation

The following items are not fully specified by the vendor docs and should be
treated as explicit engineering assumptions until confirmed.

- `keywordparam/v2` documents pending state `101`, but the shared error-code
  document does not define it.
- `/traffic` returns `200104` and `taskid` during generation, but the exact
  pending lifecycle is not described beyond the 1 to 10 minute guidance.
- `/icp/getinfo` describes top-level fields but does not publish a full sample
  payload.
- `/icp/instant` does not publish a full JSON example, so normalized fields
  must be conservative and `raw` must always be preserved.
- The vendor docs do not define rate-limit headers or explicit retry windows.
- The vendor docs do not define whether all nested response strings are always
  URL-encoded, so decoders should be tolerant rather than destructive.

## Acceptance Criteria

The generated MCP project satisfies this specification only if all of the
following are true.

- All 39 vendor APIs have a corresponding MCP tool.
- Every tool is bound to the documented env var for its API.
- Async tools support `submit`, `poll`, and `wait` execution modes.
- Text tools transparently encode requests and decode returned strings.
- Paginated tools return a normalized `pagination` object.
- Raw vendor responses are preserved for every call.
- Missing keys, invalid input, pending states, and rate limits are surfaced
  deterministically.
- The originality API is included despite being omitted from the top-level
  vendor route table.
- A later subset implementation plan can select only part of the tool catalog
  without changing the shared contract defined here.
