---
goal: Implement Wave One of the standalone 5118 official API MCP wrapper
version: 1.0
date_created: 2026-04-21
last_updated: 2026-04-21
owner: GitHub Copilot
status: Planned
tags: [feature, plan, mcp, 5118, api-wrapper, wave-one]
---

# Introduction

This document is also available in [Chinese](./feature-keyword-research-wave-one-1-zh.md).

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines the first implementation wave for a standalone 5118 MCP
project that wraps the official 5118 API surface. Wave One covers only the
official 5118 API wrapper responsibility and does not assume any host
repository, connector model, workspace config, or external workflow schema.

<!-- markdownlint-disable MD060 -->

## 1. Requirements & Constraints

- **REQ-001**: Implement exactly five MCP tools in Wave One: `get_longtail_keywords_5118`, `get_industry_frequency_words_5118`, `get_suggest_terms_5118`, `get_keyword_metrics_5118`, and `get_mobile_traffic_keywords_5118`.
- **REQ-002**: Create the new MCP project at `/Users/axe/work/seo/5118-seo-adapter`.
- **REQ-003**: Use the tool names, async control model, normalized response envelope, and error semantics defined in `../docs/5118-mcp-engineering-spec.md`.
- **REQ-004**: Keep Wave One fully standalone and do not depend on any host repository connector model, field naming convention, workspace setting, or integration contract.
- **REQ-005**: Do not wrap any non-5118 data source in Wave One, including search console feeds, SERP retrieval, competitor overlap, current rankings, or a custom keyword-difficulty model.
- **REQ-006**: Preserve raw vendor payloads under a top-level `raw` field for every tool response.
- **REQ-007**: Support the `executionMode` values `submit`, `poll`, and `wait` for the two async tools.
- **REQ-008**: Return only vendor-backed expansion, suggestion, keyword-metric, and traffic-keyword fields in normalized form. Do not synthesize host-workflow-specific fields.
- **REQ-009**: Create deterministic fixture-based tests for every Wave One tool and for every shared runtime module.
- **REQ-010**: Pin the core dependencies to current stable non-prerelease versions with exact version numbers and no ranges. The required versions are `@modelcontextprotocol/sdk@1.29.0`, `zod@4.3.6`, `typescript@6.0.3`, `vitest@4.1.4`, `tsx@4.21.0`, and `@types/node@25.6.0`.
- **REQ-011**: Keep bilingual copies of the engineering specification and the Wave One plan inside the MCP project itself under `docs/` and `plan/`.
- **SEC-001**: Never log, serialize, or echo raw 5118 API keys in stdout, stderr, test output, or tool errors.
- **SEC-002**: Validate input limits before issuing HTTP requests so that known oversize requests never reach the upstream API.
- **ENV-001**: Set `PROJECT_ROOT` to `/Users/axe/work/seo/5118-seo-adapter`.
- **ENV-002**: Set `DOCS_ROOT` to `/Users/axe/work/seo/5118-seo-adapter/docs`.
- **ENV-003**: Set `PLAN_ROOT` to `/Users/axe/work/seo/5118-seo-adapter/plan`.
- **CON-001**: Do not implement ranking export, bid intelligence, site verification, rewrite, analysis, or content generation APIs in Wave One.
- **CON-002**: Only create or modify files under `PROJECT_ROOT`.
- **CON-003**: Do not generate host-repository-specific bridge docs, connector configs, workspace settings, or field-mapping notes.
- **CON-004**: The Wave One server may only wrap official 5118 APIs and may not embed third-party scraping, Baidu Search Resource Platform proxying, or SERP crawling logic.
- **GUD-001**: Use `npm` as the package manager and generate a committed `package-lock.json` in the new MCP project.
- **GUD-002**: Keep normalization field names in camelCase inside the MCP project and document response mapping only inside project-local docs.
- **GUD-003**: Write exact versions into `package.json` and keep them aligned with REQ-011.
- **PAT-001**: Implement one handler module per MCP tool and one normalizer module per response family.
- **PAT-002**: Implement all vendor HTTP calls through one shared `postForm` client.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Scaffold the new MCP project and shared runtime modules.
- PHASE-DEP-001: This phase has no upstream dependency.
- CRI-001: `npm run build` in `/Users/axe/work/seo/5118-seo-adapter` completes successfully and the built server advertises exactly five Wave One tools.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Create `/Users/axe/work/seo/5118-seo-adapter/package.json`, `/Users/axe/work/seo/5118-seo-adapter/package-lock.json`, `/Users/axe/work/seo/5118-seo-adapter/tsconfig.json`, `/Users/axe/work/seo/5118-seo-adapter/src/index.ts`, and `/Users/axe/work/seo/5118-seo-adapter/src/server.ts`. Set package name to `5118-seo-adapter`. Add scripts `build`, `dev`, `start`, `test`, and `test:live`. Pin runtime dependencies to `@modelcontextprotocol/sdk@1.29.0` and `zod@4.3.6`. Pin development dependencies to `typescript@6.0.3`, `vitest@4.1.4`, `tsx@4.21.0`, and `@types/node@25.6.0`. |  |  |
| TASK-002 | Create `/Users/axe/work/seo/5118-seo-adapter/src/config/apiKeyRegistry.ts` and define `WAVE_ONE_TOOL_ENV_MAP`, `getRequiredEnvVar(toolName)`, and `assertApiKey(toolName)` for the exact env vars `API_5118_LONGTAIL_V2`, `API_5118_FREQ_WORDS`, `API_5118_SUGGEST`, `API_5118_KW_PARAM_V2`, and `API_5118_TRAFFIC`. |  |  |
| TASK-003 | Create `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts`, define `BASE_URL = "https://apis.5118.com"`, and implement `postForm(endpoint, apiKey, formData)` with `POST` and `application/x-www-form-urlencoded; charset=utf-8`. |  |  |
| TASK-004 | Create `/Users/axe/work/seo/5118-seo-adapter/src/lib/urlCodec.ts`, `/Users/axe/work/seo/5118-seo-adapter/src/lib/errorMapper.ts`, `/Users/axe/work/seo/5118-seo-adapter/src/lib/responseEnvelope.ts`, and `/Users/axe/work/seo/5118-seo-adapter/src/types/toolContracts.ts`. Implement `encodeInputFields`, `decodeResponseStrings`, `map5118Error`, and `createResponseEnvelope`. |  |  |
| TASK-005 | Register the five Wave One MCP tools in `/Users/axe/work/seo/5118-seo-adapter/src/server.ts` with exact tool names, zod schemas, and handler imports. Do not register any Wave Two or Wave Three tools. |  |  |

### Implementation Phase 2

- GOAL-002: Implement the three synchronous keyword discovery tools and their normalizers.
- PHASE-DEP-002: This phase depends on TASK-001 through TASK-005.
- CRI-002: The three sync tools return normalized envelopes with validated input schemas, decoded string fields, pagination metadata where applicable, and raw vendor payload retention.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Create `/Users/axe/work/seo/5118-seo-adapter/src/normalizers/keywordDiscovery.ts` and implement `normalizeLongtailKeywordsResponse`, `normalizeIndustryFrequencyWordsResponse`, and `normalizeSuggestTermsResponse`. Each function must return camelCase normalized fields plus `raw`. |  |  |
| TASK-007 | Create `/Users/axe/work/seo/5118-seo-adapter/src/tools/getLongtailKeywords5118.ts` and implement `getLongtailKeywords5118Handler`. Map the input fields `keyword`, `pageIndex`, `pageSize`, `sortField`, `sortType`, `filter`, and `filterDate` to `/keyword/word/v2`. Enforce `pageSize <= 100`. |  |  |
| TASK-008 | Create `/Users/axe/work/seo/5118-seo-adapter/src/tools/getIndustryFrequencyWords5118.ts` and implement `getIndustryFrequencyWords5118Handler`. Map `keyword` to `/tradeseg` and normalize the returned segmentation list into `frequencyWords[]`. |  |  |
| TASK-009 | Create `/Users/axe/work/seo/5118-seo-adapter/src/tools/getSuggestTerms5118.ts` and implement `getSuggestTerms5118Handler`. Enforce the exact platform enum `baidu`, `baidumobile`, `shenma`, `360`, `360mobile`, `sogou`, `sogoumobile`, `zhihu`, `toutiao`, `taobao`, `tmall`, `pinduoduo`, `jingdong`, `douyin`, `amazon`, and `xiaohongshu`. |  |  |

### Implementation Phase 3

- GOAL-003: Implement the two asynchronous keyword research tools and the shared polling engine.
- PHASE-DEP-003: This phase depends on TASK-001 through TASK-009.
- CRI-003: The two async tools support `submit`, `poll`, and `wait` execution modes, treat vendor codes `101` and `200104` as pending, and expose deterministic timeout behavior.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | Create `/Users/axe/work/seo/5118-seo-adapter/src/lib/asyncExecutor.ts`. Define `DEFAULT_POLL_INTERVAL_SECONDS = 10`, `DEFAULT_KEYWORD_METRICS_MAX_WAIT_SECONDS = 120`, and `DEFAULT_TRAFFIC_MAX_WAIT_SECONDS = 600`. Implement `executeAsyncTool`, `submitTask`, `pollTask`, and `waitForCompletion`. |  |  |
| TASK-011 | Create `/Users/axe/work/seo/5118-seo-adapter/src/normalizers/keywordMetrics.ts` and implement `normalizeKeywordMetricsResponse` and `normalizeMobileTrafficKeywordsResponse`. Ensure the normalized payload preserves `index`, `mobileIndex`, `longKeywordCount`, `bidCompanyCount`, and other vendor-native metric fields. |  |  |
| TASK-012 | Create `/Users/axe/work/seo/5118-seo-adapter/src/tools/getKeywordMetrics5118.ts` and implement `getKeywordMetrics5118Handler`. Accept `keywords[]`, convert them to the vendor `\|` delimiter, enforce a hard limit of 50 keywords, and use `/keywordparam/v2`. |  |  |
| TASK-013 | Create `/Users/axe/work/seo/5118-seo-adapter/src/tools/getMobileTrafficKeywords5118.ts` and implement `getMobileTrafficKeywords5118Handler`. Accept `keyword`, `taskId`, `pageIndex`, `pageSize`, `executionMode`, `maxWaitSeconds`, and `pollIntervalSeconds`. Use `/traffic`, enforce `pageSize <= 500`, and require both `taskId` and `keyword` during `poll` mode. |  |  |

### Implementation Phase 4

- GOAL-004: Add project-local usage docs, standalone launch examples, and local copies of the governing documents.
- PHASE-DEP-004: This phase depends on TASK-001 through TASK-013.
- CRI-004: The project root contains standalone usage docs, one generic `stdio` config example, one deterministic tool-sequence example, and bilingual local copies of the engineering specification and Wave One plan.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | Create `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage.md`. Document environment variables, build commands, launch commands, `stdio` transport behavior, tool discovery, and the normalized response envelope. Do not mention any host repository or external MCP dependency. |  |  |
| TASK-015 | Create `/Users/axe/work/seo/5118-seo-adapter/examples/vscode-mcp.stdio.example.json` containing only one `stdio` server entry named `5118-seo-adapter` with command `node` and args `[/Users/axe/work/seo/5118-seo-adapter/dist/index.js]`. |  |  |
| TASK-016 | Create `/Users/axe/work/seo/5118-seo-adapter/examples/wave-one-sequence.json` showing the deterministic execution order `get_longtail_keywords_5118` -> `get_suggest_terms_5118` -> `get_keyword_metrics_5118` -> `get_mobile_traffic_keywords_5118` for one seed keyword. |  |  |
| TASK-017 | Write bilingual local copies of the engineering specification into `/Users/axe/work/seo/5118-seo-adapter/docs/` as `5118-mcp-engineering-spec.md` and `5118-mcp-engineering-spec-zh.md`. |  |  |
| TASK-018 | Write bilingual local copies of the Wave One implementation plan into `/Users/axe/work/seo/5118-seo-adapter/plan/` as `feature-keyword-research-wave-one-1.md` and `feature-keyword-research-wave-one-1-zh.md`. |  |  |

### Implementation Phase 5

- GOAL-005: Add deterministic tests, fixtures, and validation scripts for Wave One.
- PHASE-DEP-005: This phase depends on TASK-001 through TASK-018.
- CRI-005: All test commands pass without live credentials, and live smoke tests remain opt-in through explicit environment variables.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-019 | Create `/Users/axe/work/seo/5118-seo-adapter/tests/fixtures/wave-one/longtail.success.json`, `frequency.success.json`, `suggest.success.json`, `keyword-metrics.submit.json`, `keyword-metrics.pending.json`, `keyword-metrics.success.json`, `traffic.submit.json`, `traffic.pending.json`, and `traffic.success.json`. Use vendor-shaped payloads. |  |  |
| TASK-020 | Create `/Users/axe/work/seo/5118-seo-adapter/tests/waveOneSyncTools.test.ts`, `/Users/axe/work/seo/5118-seo-adapter/tests/waveOneAsyncTools.test.ts`, `/Users/axe/work/seo/5118-seo-adapter/tests/urlCodec.test.ts`, and `/Users/axe/work/seo/5118-seo-adapter/tests/errorMapper.test.ts`. Assert normalization, pending-state handling, input-limit enforcement, and raw payload retention. |  |  |
| TASK-021 | Create `/Users/axe/work/seo/5118-seo-adapter/scripts/validate-wave-one.mjs`. Assert that the built server registers exactly five tools, the tool names match the plan, the example `stdio` config points at `dist/index.js`, the core package versions match REQ-010 exactly, and the project-local document copies satisfy REQ-011. |  |  |
| TASK-022 | Add a live smoke test gate in `/Users/axe/work/seo/5118-seo-adapter/package.json` named `test:live` that only runs when the exact env vars required by the invoked tool are present. The default `test` script must never hit the live 5118 API. |  |  |

## 3. Alternatives

- **ALT-001**: Implement all 39 APIs before any Wave One delivery. This was not chosen because Wave One is intentionally limited to the smallest viable five-tool official API subset.
- **ALT-002**: Implement only the three synchronous tools and skip async support. This was not chosen because keyword metrics and mobile traffic are required to provide defensible keyword demand signals.
- **ALT-003**: Expose raw vendor field names directly without normalization. This was not chosen because the engineering specification requires stable camelCase normalization while preserving `raw`.

## 4. Dependencies

- **DEP-001**: Node.js runtime for `/Users/axe/work/seo/5118-seo-adapter`.
- **DEP-002**: `npm` for dependency installation and script execution.
- **DEP-003**: `@modelcontextprotocol/sdk@1.29.0` for server registration and stdio transport.
- **DEP-004**: `zod@4.3.6` for deterministic input schema validation.
- **DEP-005**: `typescript@6.0.3` for build output to `dist/`.
- **DEP-006**: `vitest@4.1.4` for deterministic test execution.
- **DEP-007**: `tsx@4.21.0` as the local TypeScript dev runner.
- **DEP-008**: `@types/node@25.6.0` for Node.js type definitions.
- **DEP-009**: `../docs/5118-mcp-engineering-spec.md` as the authoritative contract for tool names, envelope shape, and async execution semantics.
- **DEP-010**: One accessible official 5118 vendor documentation bundle containing `SKILL.md`, `README.md`, `references/`, and `references/error-codes.md`.

## 5. Files

- **FILE-001**: `/Users/axe/work/seo/5118-seo-adapter/docs/5118-mcp-engineering-spec.md` - English engineering specification.
- **FILE-002**: `/Users/axe/work/seo/5118-seo-adapter/docs/5118-mcp-engineering-spec-zh.md` - Chinese engineering specification.
- **FILE-003**: `/Users/axe/work/seo/5118-seo-adapter/plan/feature-keyword-research-wave-one-1.md` - English Wave One implementation plan.
- **FILE-004**: `/Users/axe/work/seo/5118-seo-adapter/plan/feature-keyword-research-wave-one-1-zh.md` - Chinese Wave One implementation plan.
- **FILE-005**: `/Users/axe/work/seo/5118-seo-adapter/package.json` - project manifest and scripts.
- **FILE-006**: `/Users/axe/work/seo/5118-seo-adapter/tsconfig.json` - TypeScript build configuration.
- **FILE-007**: `/Users/axe/work/seo/5118-seo-adapter/src/index.ts` - process entrypoint.
- **FILE-008**: `/Users/axe/work/seo/5118-seo-adapter/src/server.ts` - MCP server registration.
- **FILE-009**: `/Users/axe/work/seo/5118-seo-adapter/src/config/apiKeyRegistry.ts` - Wave One env var registry.
- **FILE-010**: `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts` - shared HTTP form client.
- **FILE-011**: `/Users/axe/work/seo/5118-seo-adapter/src/lib/urlCodec.ts` - request encoding and response decoding.
- **FILE-012**: `/Users/axe/work/seo/5118-seo-adapter/src/lib/errorMapper.ts` - vendor error translation.
- **FILE-013**: `/Users/axe/work/seo/5118-seo-adapter/src/lib/asyncExecutor.ts` - submit, poll, and wait engine.
- **FILE-014**: `/Users/axe/work/seo/5118-seo-adapter/src/normalizers/keywordDiscovery.ts` - sync tool normalizers.
- **FILE-015**: `/Users/axe/work/seo/5118-seo-adapter/src/normalizers/keywordMetrics.ts` - async tool normalizers.
- **FILE-016**: `/Users/axe/work/seo/5118-seo-adapter/src/tools/getLongtailKeywords5118.ts` - long-tail keyword tool handler.
- **FILE-017**: `/Users/axe/work/seo/5118-seo-adapter/src/tools/getIndustryFrequencyWords5118.ts` - frequency words tool handler.
- **FILE-018**: `/Users/axe/work/seo/5118-seo-adapter/src/tools/getSuggestTerms5118.ts` - suggest terms tool handler.
- **FILE-019**: `/Users/axe/work/seo/5118-seo-adapter/src/tools/getKeywordMetrics5118.ts` - async keyword metrics tool handler.
- **FILE-020**: `/Users/axe/work/seo/5118-seo-adapter/src/tools/getMobileTrafficKeywords5118.ts` - async traffic tool handler.
- **FILE-021**: `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage.md` - standalone usage guide.
- **FILE-022**: `/Users/axe/work/seo/5118-seo-adapter/examples/vscode-mcp.stdio.example.json` - generic `stdio` config example.
- **FILE-023**: `/Users/axe/work/seo/5118-seo-adapter/examples/wave-one-sequence.json` - deterministic Wave One tool sequence example.
- **FILE-024**: `/Users/axe/work/seo/5118-seo-adapter/tests/fixtures/wave-one/*.json` - Wave One fixtures.
- **FILE-025**: `/Users/axe/work/seo/5118-seo-adapter/tests/*.test.ts` - deterministic Wave One tests.
- **FILE-026**: `/Users/axe/work/seo/5118-seo-adapter/scripts/validate-wave-one.mjs` - validation script.

## 6. Testing

- **TEST-001**: Run `npm test` in `/Users/axe/work/seo/5118-seo-adapter` and assert that all sync tool fixtures pass through normalization without live network calls.
- **TEST-002**: Run `npm test` and assert that `get_keyword_metrics_5118` handles `submit`, `poll`, `wait`, vendor code `101`, and vendor code `200401` correctly.
- **TEST-003**: Run `npm test` and assert that `get_mobile_traffic_keywords_5118` handles vendor code `200104`, timeout boundaries, and required `taskId + keyword` poll semantics correctly.
- **TEST-004**: Run `npm test` and assert that `encodeInputFields` URL-encodes Chinese input strings and `decodeResponseStrings` safely decodes returned values.
- **TEST-005**: Run `node scripts/validate-wave-one.mjs` and assert that the built MCP server registers exactly five tools, that the example `stdio` config points to `/Users/axe/work/seo/5118-seo-adapter/dist/index.js`, that the core package versions match REQ-010 exactly, and that the project-local document copies satisfy REQ-011.
- **TEST-006**: Run `node dist/index.js` and confirm that the built server starts in `stdio` mode without module-resolution errors, tool-registration errors, or an immediate crash.
- **TEST-007**: Run `npm run test:live -- --tool=get_longtail_keywords_5118` only when `API_5118_LONGTAIL_V2` is present and verify that the live gate refuses execution when the env var is missing.

## 7. Risks & Assumptions

- **RISK-001**: The vendor uses undocumented pending code `101` for `/keywordparam/v2`, which may require one adjustment after first live verification.
- **RISK-002**: `/traffic` may remain pending for several minutes, so an aggressive default timeout can create false failures.
- **RISK-003**: Separate billable API keys per tool can block live testing even when the project code is correct.
- **RISK-004**: The project-local vendor documentation bundle may drift from upstream updates and leave env vars, fields, or error semantics stale.
- **ASSUMPTION-001**: The target MCP project will remain a sibling directory at `/Users/axe/work/seo/5118-seo-adapter`.
- **ASSUMPTION-002**: Wave One only needs the five official 5118 API tools listed in REQ-001.
- **ASSUMPTION-003**: A complete and reviewable official 5118 vendor documentation bundle is available before implementation begins.
- **ASSUMPTION-004**: The engineering specification in `../docs/5118-mcp-engineering-spec.md` remains the authoritative contract during Wave One implementation.

## 8. Related Specifications / Further Reading

- [../docs/5118-mcp-engineering-spec.md](../docs/5118-mcp-engineering-spec.md)
- [../docs/5118-mcp-engineering-spec-zh.md](../docs/5118-mcp-engineering-spec-zh.md)
- project-local vendor `SKILL.md`
- project-local vendor `README.md`
- project-local vendor `references/`
- project-local vendor `references/error-codes.md`
