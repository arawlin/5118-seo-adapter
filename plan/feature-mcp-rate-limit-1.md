---
goal: Implement MCP-side rate limiting and retry orchestration for 5118 APIs
version: 1.0
date_created: 2026-05-01
last_updated: 2026-05-01
owner: GitHub Copilot
status: Planned
tags: [feature, mcp, rate-limit, retry, reliability, 5118]
---

# Introduction

This document is also available in [Chinese](./feature-mcp-rate-limit-1-zh.md).

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines a deterministic implementation for MCP-side request control.
The skill layer remains stateless and only invokes tools. The MCP server owns
throttling, retry, and backoff behavior and returns normalized data.

## 1. Requirements & Constraints

- **REQ-001**: Implement unified outbound request control in
  `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts` so that
  all tool HTTP calls pass through one MCP-side control path.
- **REQ-002**: Keep tool input and output contracts unchanged for all existing
  tools in `/Users/axe/work/seo/5118-seo-adapter/src/tools/`.
- **REQ-003**: Retry only short-window retryable failures:
  vendor `errcode=100102`, vendor `errcode=200107`, network failure, and
  `HTTP 5xx`.
- **REQ-004**: Do not retry non-retryable quota failures:
  vendor `errcode=100101`, `100103`, `100104`.
- **REQ-005**: Use exponential backoff with jitter for retry delays.
- **REQ-006**: Enforce per-key and per-endpoint rate limiting at MCP-side
  before every upstream request.
- **REQ-007**: Provide deterministic runtime defaults and environment override
  support for rate and retry settings.
- **SEC-001**: Never log raw API keys, including in retry errors, limiter keys,
  telemetry, and test snapshots.
- **SEC-002**: Ensure request control does not bypass existing input validation
  in tool handlers.
- **OPS-001**: Export internal counters for attempts and retries for test
  assertions without exposing secrets.
- **CON-001**: Do not add request control logic to skills. Skills only call MCP
  tools and consume MCP responses.
- **CON-002**: Do not change async tool execution semantics in
  `/Users/axe/work/seo/5118-seo-adapter/src/lib/asyncExecutor.ts`.
- **GUD-001**: Pin new dependencies to exact versions.
- **PAT-001**: Use one shared limiter instance per process and key by hashed
  API key plus endpoint.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Add deterministic request-control dependencies and runtime config.
- PHASE-DEP-001: This phase has no upstream dependency.
- CRI-001: `npm install` and `npm run build` succeed with exact dependency
  versions and no type errors.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | Update `/Users/axe/work/seo/5118-seo-adapter/package.json` and `/Users/axe/work/seo/5118-seo-adapter/package-lock.json` to add `bottleneck@2.19.5` and `p-retry@6.2.0` as runtime dependencies. Keep versions exact with no range specifier. |  |  |
| TASK-002 | Create `/Users/axe/work/seo/5118-seo-adapter/src/config/requestControl.ts` and export `REQUEST_CONTROL_DEFAULTS` with exact defaults: `minTimeMs=1000`, `maxConcurrent=1`, `reservoir=2`, `reservoirRefreshAmount=2`, `reservoirRefreshIntervalMs=1000`, `maxRetries=3`, `baseBackoffMs=800`, `maxBackoffMs=3200`, `jitterMs=300`. |  |  |
| TASK-003 | In `/Users/axe/work/seo/5118-seo-adapter/src/config/requestControl.ts`, implement `resolveRequestControlConfig(env)` to parse env vars `MCP_5118_MIN_TIME_MS`, `MCP_5118_MAX_CONCURRENT`, `MCP_5118_RESERVOIR`, `MCP_5118_MAX_RETRIES`, `MCP_5118_BASE_BACKOFF_MS`, `MCP_5118_MAX_BACKOFF_MS`, and `MCP_5118_JITTER_MS` with strict numeric validation. |  |  |

### Implementation Phase 2

- GOAL-002: Implement shared limiter and retry orchestration in lib layer.
- PHASE-DEP-002: This phase depends on TASK-001 through TASK-003.
- CRI-002: The shared request controller schedules all calls and retries only
  retryable failures with bounded backoff.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | Create `/Users/axe/work/seo/5118-seo-adapter/src/lib/requestController.ts` and implement `createRequestController(config)` using `Bottleneck.Group` keyed by `${endpoint}:${apiKeyHash}` where `apiKeyHash` is SHA-256 truncated to 12 chars. |  |  |
| TASK-005 | In `/Users/axe/work/seo/5118-seo-adapter/src/lib/requestController.ts`, implement `scheduleWithControl({ endpoint, apiKey, run })` that enqueues `run()` through the limiter and returns upstream payload. |  |  |
| TASK-006 | In `/Users/axe/work/seo/5118-seo-adapter/src/lib/requestController.ts`, implement `executeWithRetry({ operation, shouldRetry, maxRetries, baseBackoffMs, maxBackoffMs, jitterMs })` via `p-retry` with randomized jitter in `[0, jitterMs]`. |  |  |
| TASK-007 | In `/Users/axe/work/seo/5118-seo-adapter/src/lib/requestController.ts`, implement `isRetryableFailure(errorOrPayload)` that returns true only for retryable classes: mapped tool errors `RATE_LIMIT_PER_SECOND`, `UPSTREAM_TIMEOUT`, `HTTP_ERROR` with `status>=500`, and network fetch failures. |  |  |

### Implementation Phase 3

- GOAL-003: Integrate request controller into shared HTTP client.
- PHASE-DEP-003: This phase depends on TASK-004 through TASK-007.
- CRI-003: `postForm` enforces limiter and retry behavior by default and keeps
  existing call signatures backward compatible.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | Update `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts` to create a module-level singleton `requestController` initialized from `resolveRequestControlConfig(process.env)`. |  |  |
| TASK-009 | Refactor `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts` by extracting `performFetch(endpoint, apiKey, formData, signal)` and wrapping it with `scheduleWithControl` and `executeWithRetry` before returning parsed JSON payload. |  |  |
| TASK-010 | In `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts`, inspect parsed JSON payload and classify vendor `errcode` values so that retries happen only for `100102` and `200107` before returning the final payload to tool handlers. |  |  |
| TASK-011 | Preserve existing exported API `postForm(endpoint, apiKey, formData, signal?)` to avoid tool-level refactors in `/Users/axe/work/seo/5118-seo-adapter/src/tools/*.ts`. |  |  |

### Implementation Phase 4

- GOAL-004: Add deterministic tests and update integration documentation.
- PHASE-DEP-004: This phase depends on TASK-008 through TASK-011.
- CRI-004: Test suite verifies retry/limit behavior and docs describe MCP-side
  ownership of request control.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Create `/Users/axe/work/seo/5118-seo-adapter/tests/requestController.test.ts` with deterministic unit tests for limiter keying, queue scheduling, and bounded retry attempts using mocked timers. |  |  |
| TASK-013 | Create `/Users/axe/work/seo/5118-seo-adapter/tests/http5118Client.rateLimitRetry.test.ts` to validate: retry on `100102`, no retry on `100103`, retry on `HTTP 503`, no retry on `HTTP 400`, and no secret leakage in thrown details. |  |  |
| TASK-014 | Update `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage.md` to document MCP env knobs for rate/retry control and explicitly state that skills should not implement their own wait/retry logic. |  |  |
| TASK-015 | Update `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage-zh.md` with content synchronized to TASK-014. |  |  |

## 3. Alternatives

- **ALT-001**: Implement rate limiting inside skills only. Not chosen because it
  duplicates logic across clients and cannot protect all callers.
- **ALT-002**: Implement custom limiter and retry without external libraries.
  Not chosen because `bottleneck` and `p-retry` are stable and reduce defect
  risk.
- **ALT-003**: Retry every upstream error code. Not chosen because quota and
  daily-limit failures are non-retryable and would waste capacity.

## 4. Dependencies

- **DEP-001**: `bottleneck@2.19.5` for deterministic queueing and throttling.
- **DEP-002**: `p-retry@6.2.0` for bounded exponential retry behavior.
- **DEP-003**: Existing `/Users/axe/work/seo/5118-seo-adapter/src/lib/errorMapper.ts`
  for retryability classification.
- **DEP-004**: Existing `/Users/axe/work/seo/5118-seo-adapter/tests/testUtils.ts`
  for test helpers and mocking patterns.

## 5. Files

- **FILE-001**: `/Users/axe/work/seo/5118-seo-adapter/package.json` - add
  runtime dependencies for request control.
- **FILE-002**: `/Users/axe/work/seo/5118-seo-adapter/package-lock.json` -
  lock exact dependency graph.
- **FILE-003**: `/Users/axe/work/seo/5118-seo-adapter/src/config/requestControl.ts`
  - runtime config defaults and env parsing.
- **FILE-004**: `/Users/axe/work/seo/5118-seo-adapter/src/lib/requestController.ts`
  - limiter and retry orchestration.
- **FILE-005**: `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts`
  - integrate controlled execution path.
- **FILE-006**: `/Users/axe/work/seo/5118-seo-adapter/tests/requestController.test.ts`
  - unit tests for queue and retry orchestration.
- **FILE-007**: `/Users/axe/work/seo/5118-seo-adapter/tests/http5118Client.rateLimitRetry.test.ts`
  - integration-level client behavior tests.
- **FILE-008**: `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage.md`
  - document MCP-side rate control knobs.
- **FILE-009**: `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage-zh.md`
  - synchronized Chinese documentation for FILE-008.

## 6. Testing

- **TEST-001**: Run `npm run build` and assert no TypeScript errors.
- **TEST-002**: Run `npm test -- tests/requestController.test.ts` and assert
  limiter keying and bounded retries.
- **TEST-003**: Run `npm test -- tests/http5118Client.rateLimitRetry.test.ts`
  and assert retry policy by status and vendor code.
- **TEST-004**: Run
  `API_5118_SUGGEST=<valid> node scripts/test-live-gate.mjs --tool suggest --word 比特币 --platform baidu --verbose`
  in burst mode to verify fewer immediate rate-limit failures.
- **TEST-005**: Verify docs synchronization by checking matching sections in
  `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage.md`
  and
  `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage-zh.md`.

## 7. Risks & Assumptions

- **RISK-001**: Actual vendor per-second limits may differ by endpoint and key,
  requiring runtime tuning beyond default values.
- **RISK-002**: Overly aggressive retries can increase queue latency under
  sustained traffic spikes.
- **RISK-003**: Live tests can pass in low traffic but still hit limits under
  concurrent external callers.
- **ASSUMPTION-001**: All tool outbound requests continue to use
  `postForm` from `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts`.
- **ASSUMPTION-002**: Vendor retryable short-window errors remain stable at
  `100102` and `200107`.

## 8. Related Specifications / Further Reading

- [../docs/5118-mcp-engineering-spec.md](../docs/5118-mcp-engineering-spec.md)
- [../docs/5118-mcp-engineering-spec-zh.md](../docs/5118-mcp-engineering-spec-zh.md)
- [../docs/integration/standalone-usage.md](../docs/integration/standalone-usage.md)
- [../docs/integration/standalone-usage-zh.md](../docs/integration/standalone-usage-zh.md)
