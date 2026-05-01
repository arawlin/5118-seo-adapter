---
goal: 实现 5118 API 的 MCP 侧限流与重试编排
version: 1.0
date_created: 2026-05-01
last_updated: 2026-05-01
owner: GitHub Copilot
status: Planned
tags: [feature, mcp, rate-limit, retry, reliability, 5118]
---

# Introduction

本文档亦提供[英文版](./feature-mcp-rate-limit-1.md)。

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

本计划定义一个确定性的 MCP 侧请求控制实现。Skill 层保持无状态并
仅发起工具调用。MCP server 统一负责节流、重试和退避策略，并返回
归一化数据。

## 1. Requirements & Constraints

- **REQ-001**: 在
  `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts` 中实现
  统一的外发请求控制路径，确保所有工具 HTTP 调用都经过 MCP 侧
  控制。
- **REQ-002**: 保持
  `/Users/axe/work/seo/5118-seo-adapter/src/tools/` 下现有工具的输入输出
  契约不变。
- **REQ-003**: 仅对短窗口可重试失败执行重试：厂商
  `errcode=100102`、厂商 `errcode=200107`、网络失败、`HTTP 5xx`。
- **REQ-004**: 对不可重试配额失败不执行重试：厂商
  `errcode=100101`、`100103`、`100104`。
- **REQ-005**: 重试延迟采用指数退避并附加抖动。
- **REQ-006**: 在每次上游请求前，按 API key 与 endpoint 在 MCP 侧强制
  限流。
- **REQ-007**: 提供确定性的运行时默认值，并支持通过环境变量覆盖速率与
  重试配置。
- **SEC-001**: 不得记录原始 API key，包括重试错误、限流键、遥测字段和
  测试快照。
- **SEC-002**: 请求控制逻辑不得绕过工具 handler 现有的输入校验。
- **OPS-001**: 导出内部尝试次数与重试次数计数器以支持测试断言，且不得
  暴露敏感信息。
- **CON-001**: 不在 skill 层添加请求控制逻辑。Skill 仅调用 MCP 工具并
  消费 MCP 响应。
- **CON-002**: 不改变
  `/Users/axe/work/seo/5118-seo-adapter/src/lib/asyncExecutor.ts` 中的异步
  工具执行语义。
- **GUD-001**: 新增依赖必须使用精确版本。
- **PAT-001**: 使用进程级单例限流器，并以“哈希 API key + endpoint”
  作为分组键。

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: 增加确定性的请求控制依赖与运行时配置。
- PHASE-DEP-001: 本阶段无上游依赖。
- CRI-001: `npm install` 与 `npm run build` 成功，且依赖版本精确、
  无类型错误。

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | 更新 `/Users/axe/work/seo/5118-seo-adapter/package.json` 与 `/Users/axe/work/seo/5118-seo-adapter/package-lock.json`，新增运行时依赖 `bottleneck@2.19.5` 与 `p-retry@6.2.0`。版本号必须精确，不允许范围写法。 |  |  |
| TASK-002 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/config/requestControl.ts`，导出 `REQUEST_CONTROL_DEFAULTS`，固定默认值：`minTimeMs=1000`、`maxConcurrent=1`、`reservoir=2`、`reservoirRefreshAmount=2`、`reservoirRefreshIntervalMs=1000`、`maxRetries=3`、`baseBackoffMs=800`、`maxBackoffMs=3200`、`jitterMs=300`。 |  |  |
| TASK-003 | 在 `/Users/axe/work/seo/5118-seo-adapter/src/config/requestControl.ts` 中实现 `resolveRequestControlConfig(env)`，解析环境变量 `MCP_5118_MIN_TIME_MS`、`MCP_5118_MAX_CONCURRENT`、`MCP_5118_RESERVOIR`、`MCP_5118_MAX_RETRIES`、`MCP_5118_BASE_BACKOFF_MS`、`MCP_5118_MAX_BACKOFF_MS`、`MCP_5118_JITTER_MS`，并执行严格数字校验。 |  |  |

### Implementation Phase 2

- GOAL-002: 在 lib 层实现共享限流器与重试编排。
- PHASE-DEP-002: 本阶段依赖 TASK-001 到 TASK-003。
- CRI-002: 共享请求控制器可调度全部请求，并且仅对可重试失败执行有界
  退避重试。

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-004 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/lib/requestController.ts`，使用 `Bottleneck.Group` 实现 `createRequestController(config)`，分组键为 `${endpoint}:${apiKeyHash}`，其中 `apiKeyHash` 为 SHA-256 截断 12 位。 |  |  |
| TASK-005 | 在 `/Users/axe/work/seo/5118-seo-adapter/src/lib/requestController.ts` 中实现 `scheduleWithControl({ endpoint, apiKey, run })`，通过限流队列执行 `run()` 并返回上游负载。 |  |  |
| TASK-006 | 在 `/Users/axe/work/seo/5118-seo-adapter/src/lib/requestController.ts` 中实现 `executeWithRetry({ operation, shouldRetry, maxRetries, baseBackoffMs, maxBackoffMs, jitterMs })`，通过 `p-retry` 执行重试，抖动范围为 `[0, jitterMs]`。 |  |  |
| TASK-007 | 在 `/Users/axe/work/seo/5118-seo-adapter/src/lib/requestController.ts` 中实现 `isRetryableFailure(errorOrPayload)`，仅对以下类型返回 true：映射后的 `RATE_LIMIT_PER_SECOND`、`UPSTREAM_TIMEOUT`、`status>=500` 的 `HTTP_ERROR`、网络 fetch 失败。 |  |  |

### Implementation Phase 3

- GOAL-003: 将请求控制器集成到共享 HTTP 客户端。
- PHASE-DEP-003: 本阶段依赖 TASK-004 到 TASK-007。
- CRI-003: `postForm` 默认执行限流与重试，并保持现有调用签名向后
  兼容。

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-008 | 更新 `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts`，创建模块级单例 `requestController`，并基于 `resolveRequestControlConfig(process.env)` 初始化。 |  |  |
| TASK-009 | 重构 `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts`：提取 `performFetch(endpoint, apiKey, formData, signal)`，并在返回 JSON 前通过 `scheduleWithControl` 与 `executeWithRetry` 包装执行。 |  |  |
| TASK-010 | 在 `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts` 中检查解析后的 JSON 负载，对厂商 `errcode` 进行分类，仅对 `100102` 与 `200107` 执行重试，然后返回最终负载给工具 handler。 |  |  |
| TASK-011 | 保留导出 API `postForm(endpoint, apiKey, formData, signal?)` 不变，避免对 `/Users/axe/work/seo/5118-seo-adapter/src/tools/*.ts` 进行大规模改造。 |  |  |

### Implementation Phase 4

- GOAL-004: 增加确定性测试并更新集成文档。
- PHASE-DEP-004: 本阶段依赖 TASK-008 到 TASK-011。
- CRI-004: 测试覆盖重试与限流策略，文档明确请求控制由 MCP 侧负责。

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | 创建 `/Users/axe/work/seo/5118-seo-adapter/tests/requestController.test.ts`，使用可控 timer 编写限流分组、队列调度和有界重试次数的确定性单元测试。 |  |  |
| TASK-013 | 创建 `/Users/axe/work/seo/5118-seo-adapter/tests/http5118Client.rateLimitRetry.test.ts`，校验：`100102` 触发重试、`100103` 不重试、`HTTP 503` 重试、`HTTP 400` 不重试、错误详情不泄露密钥。 |  |  |
| TASK-014 | 更新 `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage.md`，增加 MCP 侧速率与重试环境变量说明，并明确 skill 不应自行实现 wait/retry 逻辑。 |  |  |
| TASK-015 | 更新 `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage-zh.md`，与 TASK-014 保持结构和内容同步。 |  |  |

## 3. Alternatives

- **ALT-001**: 只在 skill 层做限流。未采用，因为逻辑会在多客户端重复，
  且无法保护所有调用入口。
- **ALT-002**: 不使用第三方库，自研限流与重试。未采用，因为
  `bottleneck` 与 `p-retry` 更稳定，缺陷风险更低。
- **ALT-003**: 对所有上游错误码都重试。未采用，因为配额和日限额错误
  不可重试，会浪费容量。

## 4. Dependencies

- **DEP-001**: `bottleneck@2.19.5`，用于确定性排队与节流。
- **DEP-002**: `p-retry@6.2.0`，用于有界指数退避重试。
- **DEP-003**: 现有
  `/Users/axe/work/seo/5118-seo-adapter/src/lib/errorMapper.ts`，用于可重试
  分类。
- **DEP-004**: 现有
  `/Users/axe/work/seo/5118-seo-adapter/tests/testUtils.ts`，用于测试辅助和
  mock 模式。

## 5. Files

- **FILE-001**: `/Users/axe/work/seo/5118-seo-adapter/package.json` - 新增
  请求控制运行时依赖。
- **FILE-002**: `/Users/axe/work/seo/5118-seo-adapter/package-lock.json` -
  锁定精确依赖图。
- **FILE-003**: `/Users/axe/work/seo/5118-seo-adapter/src/config/requestControl.ts`
  - 运行时默认配置与环境变量解析。
- **FILE-004**: `/Users/axe/work/seo/5118-seo-adapter/src/lib/requestController.ts`
  - 限流与重试编排实现。
- **FILE-005**: `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts`
  - 集成受控执行路径。
- **FILE-006**: `/Users/axe/work/seo/5118-seo-adapter/tests/requestController.test.ts`
  - 队列与重试编排单元测试。
- **FILE-007**: `/Users/axe/work/seo/5118-seo-adapter/tests/http5118Client.rateLimitRetry.test.ts`
  - 客户端策略行为测试。
- **FILE-008**: `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage.md`
  - MCP 侧请求控制参数说明。
- **FILE-009**: `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage-zh.md`
  - FILE-008 的中文同步文档。

## 6. Testing

- **TEST-001**: 执行 `npm run build`，确认无 TypeScript 编译错误。
- **TEST-002**: 执行 `npm test -- tests/requestController.test.ts`，确认限流
  分组与有界重试生效。
- **TEST-003**: 执行 `npm test -- tests/http5118Client.rateLimitRetry.test.ts`，
  确认按状态码和厂商错误码执行正确重试策略。
- **TEST-004**: 执行
  `API_5118_SUGGEST=<valid> node scripts/test-live-gate.mjs --tool suggest --word 比特币 --platform baidu --verbose`，
  在突发调用场景下验证即时限流失败显著减少。
- **TEST-005**: 检查
  `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage.md`
  与
  `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage-zh.md`
  的章节同步性。

## 7. Risks & Assumptions

- **RISK-001**: 厂商各 endpoint 与 key 的真实每秒阈值可能不同，默认参数
  可能需要运行时调优。
- **RISK-002**: 在持续高流量下，过于激进的重试参数可能放大排队延迟。
- **RISK-003**: 低流量 live 测试通过不代表并发外部调用场景下一定不会限流。
- **ASSUMPTION-001**: 所有工具外发请求持续使用
  `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts` 中的
  `postForm`。
- **ASSUMPTION-002**: 厂商短窗口可重试错误码保持为 `100102` 与 `200107`。

## 8. Related Specifications / Further Reading

- [../docs/5118-mcp-engineering-spec.md](../docs/5118-mcp-engineering-spec.md)
- [../docs/5118-mcp-engineering-spec-zh.md](../docs/5118-mcp-engineering-spec-zh.md)
- [../docs/integration/standalone-usage.md](../docs/integration/standalone-usage.md)
- [../docs/integration/standalone-usage-zh.md](../docs/integration/standalone-usage-zh.md)
