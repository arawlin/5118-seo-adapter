---
goal: 实现 5118 官方 API 的 MCP 一期独立封装方案
version: 1.0
date_created: 2026-04-21
last_updated: 2026-04-21
owner: GitHub Copilot
status: Planned
tags: [feature, plan, mcp, 5118, api-wrapper, wave-one]
---

# Introduction

本文档亦提供[英文版](./feature-keyword-research-wave-one-1.md)。

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

本计划定义了一个新的 5118 MCP 一期实现方案，用于构建独立的 5118 官方 API MCP
工程。一期只覆盖 5118 官方 API 的封装职责，不假设任何宿主仓库、connector 模型、
workspace 配置或外部工作流字段语义。

<!-- markdownlint-disable MD060 -->

## 1. Requirements & Constraints

- **REQ-001**: 一期只实现 5 个 MCP 工具：`get_longtail_keywords_5118`、`get_industry_frequency_words_5118`、`get_suggest_terms_5118`、`get_keyword_metrics_5118`、`get_mobile_traffic_keywords_5118`。
- **REQ-002**: 新 MCP 项目的固定路径是 `/Users/axe/work/seo/5118-seo-adapter`。
- **REQ-003**: 工具名、异步控制模型、归一化响应外壳和错误语义必须遵循 `../docs/5118-mcp-engineering-spec-zh.md`。
- **REQ-004**: 一期工程必须保持独立，不依赖任何宿主仓库的 connector 模型、字段命名、workspace 设置或外部集成约定。
- **REQ-005**: 一期不得封装任何非 5118 数据源，包括 search console、SERP 抓取、竞品交集、当前排名或自定义关键词难度模型。
- **REQ-006**: 每个工具响应都必须在顶层 `raw` 字段中保留原始厂商负载。
- **REQ-007**: 两个异步工具都必须支持 `submit`、`poll`、`wait` 三种 `executionMode`。
- **REQ-008**: 归一化输出必须直接暴露厂商支持的扩词、联想、关键词指标和流量词字段，不得生成任何宿主工作流专属字段。
- **REQ-009**: 为每个一期工具和每个共享运行时模块创建确定性的 fixture 测试。
- **REQ-010**: 一期必须把核心依赖固定到当前稳定版且使用精确版本号，不得使用 `^`、`~` 或范围版本。固定版本为 `@modelcontextprotocol/sdk@1.29.0`、`zod@4.3.6`、`typescript@6.0.3`、`vitest@4.1.4`、`tsx@4.21.0`、`@types/node@25.6.0`。
- **REQ-011**: 总规格和一期计划必须同时以中英文形式保存在 MCP 工程自身的 `docs/` 和 `plan/` 目录中。
- **SEC-001**: 不得在 stdout、stderr、测试输出或工具错误里打印、序列化或回显任何真实 5118 API key。
- **SEC-002**: 在发起 HTTP 请求之前必须先校验输入边界，避免把已知超限请求发送到上游。
- **ENV-001**: `PROJECT_ROOT` 固定为 `/Users/axe/work/seo/5118-seo-adapter`。
- **ENV-002**: `DOCS_ROOT` 固定为 `/Users/axe/work/seo/5118-seo-adapter/docs`。
- **ENV-003**: `PLAN_ROOT` 固定为 `/Users/axe/work/seo/5118-seo-adapter/plan`。
- **CON-001**: 一期不实现排名词导出、竞价情报、站点验证、改写、分析或内容生成类 API。
- **CON-002**: 一期只允许创建或修改 `PROJECT_ROOT` 下的文件。
- **CON-003**: 一期不得生成任何宿主仓库专用的 bridge 文档、connector 配置、workspace 设置或字段映射说明。
- **CON-004**: 一期的 5118 server 只能封装 5118 官方 API，不能内置任何第三方数据抓取、百度搜索资源平台代理或 SERP 爬取逻辑。
- **GUD-001**: 使用 `npm` 作为包管理器，并在新 MCP 项目中生成并提交 `package-lock.json`。
- **GUD-002**: MCP 项目内部的归一化字段统一使用 camelCase，字段映射和响应说明只在项目内文档化。
- **GUD-003**: `package.json` 中的依赖和开发依赖必须写入精确版本号，且与 REQ-011 一致。
- **PAT-001**: 每个 MCP 工具使用一个独立 handler 模块，每类响应使用一个独立 normalizer 模块。
- **PAT-002**: 所有厂商 HTTP 调用都只能通过共享的 `postForm` 客户端发起。

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: 搭建新的 MCP 项目骨架和共享运行时模块。
- PHASE-DEP-001: 本阶段无上游依赖。
- CRI-001: 在 `/Users/axe/work/seo/5118-seo-adapter` 中执行 `npm run build` 成功，并且构建后的 server 只注册一期这 5 个工具。

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-001 | 创建 `/Users/axe/work/seo/5118-seo-adapter/package.json`、`/Users/axe/work/seo/5118-seo-adapter/package-lock.json`、`/Users/axe/work/seo/5118-seo-adapter/tsconfig.json`、`/Users/axe/work/seo/5118-seo-adapter/src/index.ts`、`/Users/axe/work/seo/5118-seo-adapter/src/server.ts`。包名固定为 `5118-seo-adapter`。脚本固定包含 `build`、`dev`、`start`、`test`、`test:live`。运行时依赖固定为 `@modelcontextprotocol/sdk@1.29.0`、`zod@4.3.6`；开发依赖固定为 `typescript@6.0.3`、`vitest@4.1.4`、`tsx@4.21.0`、`@types/node@25.6.0`。 |  |  |
| TASK-002 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/config/apiKeyRegistry.ts`，定义 `WAVE_ONE_TOOL_ENV_MAP`、`getRequiredEnvVar(toolName)`、`assertApiKey(toolName)`，精确映射 `API_5118_LONGTAIL_V2`、`API_5118_FREQ_WORDS`、`API_5118_SUGGEST`、`API_5118_KW_PARAM_V2`、`API_5118_TRAFFIC`。 |  |  |
| TASK-003 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts`，定义 `BASE_URL = "https://apis.5118.com"`，实现 `postForm(endpoint, apiKey, formData)`，固定使用 `POST` 和 `application/x-www-form-urlencoded; charset=utf-8`。 |  |  |
| TASK-004 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/lib/urlCodec.ts`、`/Users/axe/work/seo/5118-seo-adapter/src/lib/errorMapper.ts`、`/Users/axe/work/seo/5118-seo-adapter/src/lib/responseEnvelope.ts`、`/Users/axe/work/seo/5118-seo-adapter/src/types/toolContracts.ts`。实现 `encodeInputFields`、`decodeResponseStrings`、`map5118Error`、`createResponseEnvelope`。 |  |  |
| TASK-005 | 在 `/Users/axe/work/seo/5118-seo-adapter/src/server.ts` 中注册一期的 5 个 MCP 工具，使用精确的工具名、zod 输入 schema 和 handler import，不得注册二期或三期工具。 |  |  |

### Implementation Phase 2

- GOAL-002: 实现 3 个同步型关键词发现工具及其 normalizer。
- PHASE-DEP-002: 本阶段依赖 TASK-001 到 TASK-005 完成。
- CRI-002: 3 个同步工具都返回归一化外壳，具备输入校验、字符串解码、分页元数据和 `raw` 原始负载保留。

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/normalizers/keywordDiscovery.ts`，实现 `normalizeLongtailKeywordsResponse`、`normalizeIndustryFrequencyWordsResponse`、`normalizeSuggestTermsResponse`。所有函数都必须返回 camelCase 归一化字段和 `raw`。 |  |  |
| TASK-007 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/tools/getLongtailKeywords5118.ts`，实现 `getLongtailKeywords5118Handler`。把 `keyword`、`pageIndex`、`pageSize`、`sortField`、`sortType`、`filter`、`filterDate` 映射到 `/keyword/word/v2`，并强制 `pageSize <= 100`。 |  |  |
| TASK-008 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/tools/getIndustryFrequencyWords5118.ts`，实现 `getIndustryFrequencyWords5118Handler`。把 `keyword` 映射到 `/tradeseg`，并把返回列表归一化到 `frequencyWords[]`。 |  |  |
| TASK-009 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/tools/getSuggestTerms5118.ts`，实现 `getSuggestTerms5118Handler`。平台枚举值必须精确限制为 `baidu`、`baidumobile`、`shenma`、`360`、`360mobile`、`sogou`、`sogoumobile`、`zhihu`、`toutiao`、`taobao`、`tmall`、`pinduoduo`、`jingdong`、`douyin`、`amazon`、`xiaohongshu`。 |  |  |

### Implementation Phase 3

- GOAL-003: 实现 2 个异步型关键词研究工具和共享轮询引擎。
- PHASE-DEP-003: 本阶段依赖 TASK-001 到 TASK-009 完成。
- CRI-003: 两个异步工具都支持 `submit`、`poll`、`wait`，能把厂商状态码 `101` 和 `200104` 视为 pending，并提供确定性的超时行为。

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-010 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/lib/asyncExecutor.ts`。定义 `DEFAULT_POLL_INTERVAL_SECONDS = 10`、`DEFAULT_KEYWORD_METRICS_MAX_WAIT_SECONDS = 120`、`DEFAULT_TRAFFIC_MAX_WAIT_SECONDS = 600`。实现 `executeAsyncTool`、`submitTask`、`pollTask`、`waitForCompletion`。 |  |  |
| TASK-011 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/normalizers/keywordMetrics.ts`，实现 `normalizeKeywordMetricsResponse` 和 `normalizeMobileTrafficKeywordsResponse`。归一化输出必须保留 `index`、`mobileIndex`、`longKeywordCount`、`bidCompanyCount` 以及其他厂商原生指标字段。 |  |  |
| TASK-012 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/tools/getKeywordMetrics5118.ts`，实现 `getKeywordMetrics5118Handler`。接受 `keywords[]`，把它们转换成厂商 `\|` 分隔格式，强制最多 50 个关键词，并调用 `/keywordparam/v2`。 |  |  |
| TASK-013 | 创建 `/Users/axe/work/seo/5118-seo-adapter/src/tools/getMobileTrafficKeywords5118.ts`，实现 `getMobileTrafficKeywords5118Handler`。接受 `keyword`、`taskId`、`pageIndex`、`pageSize`、`executionMode`、`maxWaitSeconds`、`pollIntervalSeconds`。调用 `/traffic`，强制 `pageSize <= 500`，并在 `poll` 模式下同时要求 `taskId` 和 `keyword`。 |  |  |

### Implementation Phase 4

- GOAL-004: 增加工程内说明、独立启动示例和项目本地文档副本。
- PHASE-DEP-004: 本阶段依赖 TASK-001 到 TASK-013 完成。
- CRI-004: 工程根目录下存在独立使用说明、通用 `stdio` 示例配置、确定性工具顺序示例，以及本地保存的中英文总规格与一期计划副本。

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-014 | 创建 `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage.md`。说明环境变量、构建方式、启动方式、`stdio` transport、工具发现方式和响应外壳，不得提及任何宿主仓库或外部 MCP 依赖。 |  |  |
| TASK-015 | 创建 `/Users/axe/work/seo/5118-seo-adapter/examples/vscode-mcp.stdio.example.json`，只写入名为 `5118-seo-adapter` 的 `stdio` server 配置，`command` 固定为 `node`，`args` 固定为 `[/Users/axe/work/seo/5118-seo-adapter/dist/index.js]`。 |  |  |
| TASK-016 | 创建 `/Users/axe/work/seo/5118-seo-adapter/examples/wave-one-sequence.json`，用一个固定种子词展示 `get_longtail_keywords_5118` -> `get_suggest_terms_5118` -> `get_keyword_metrics_5118` -> `get_mobile_traffic_keywords_5118` 的确定性执行顺序。 |  |  |
| TASK-017 | 在 `/Users/axe/work/seo/5118-seo-adapter/docs/` 中写入中英文总规格副本：`5118-mcp-engineering-spec.md` 和 `5118-mcp-engineering-spec-zh.md`。 |  |  |
| TASK-018 | 在 `/Users/axe/work/seo/5118-seo-adapter/plan/` 中写入中英文一期计划副本：`feature-keyword-research-wave-one-1.md` 和 `feature-keyword-research-wave-one-1-zh.md`。 |  |  |

### Implementation Phase 5

- GOAL-005: 为一期方案补齐确定性测试、fixtures 和校验脚本。
- PHASE-DEP-005: 本阶段依赖 TASK-001 到 TASK-018 完成。
- CRI-005: 所有默认测试都在无真实凭证时通过，真实 smoke test 必须显式 opt-in。

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-019 | 创建 `/Users/axe/work/seo/5118-seo-adapter/tests/fixtures/wave-one/longtail.success.json`、`frequency.success.json`、`suggest.success.json`、`keyword-metrics.submit.json`、`keyword-metrics.pending.json`、`keyword-metrics.success.json`、`traffic.submit.json`、`traffic.pending.json`、`traffic.success.json`。所有 fixture 都必须使用厂商风格的负载结构。 |  |  |
| TASK-020 | 创建 `/Users/axe/work/seo/5118-seo-adapter/tests/waveOneSyncTools.test.ts`、`/Users/axe/work/seo/5118-seo-adapter/tests/waveOneAsyncTools.test.ts`、`/Users/axe/work/seo/5118-seo-adapter/tests/urlCodec.test.ts`、`/Users/axe/work/seo/5118-seo-adapter/tests/errorMapper.test.ts`。断言归一化结果、pending 处理、输入边界校验和 `raw` 保留。 |  |  |
| TASK-021 | 创建 `/Users/axe/work/seo/5118-seo-adapter/scripts/validate-wave-one.mjs`。校验构建后的 server 只注册 5 个工具、工具名与本计划一致、示例 `stdio` 配置指向 `dist/index.js`，并校验 `package.json` 中的核心依赖版本与 REQ-010 一致、项目本地文档副本与 REQ-011 一致。 |  |  |
| TASK-022 | 在 `/Users/axe/work/seo/5118-seo-adapter/package.json` 中增加 `test:live`。该命令只在对应工具所需的环境变量存在时执行。默认 `test` 脚本不得访问真实 5118 API。 |  |  |

## 3. Alternatives

- **ALT-001**: 先一次性实现全部 39 个 API，再开始一期编码。这条路线未采用，因为一期只实现最小可用的 5 个官方 API 工具。
- **ALT-002**: 一期只实现 3 个同步工具，不支持异步接口。这条路线未采用，因为关键词指标和移动流量词是可辩护需求信号所必需的。
- **ALT-003**: 直接暴露厂商原始字段名而不做归一化。这条路线未采用，因为总规格要求 MCP 项目内部保持稳定的 camelCase 归一化契约，同时保留 `raw` 原始负载。

## 4. Dependencies

- **DEP-001**: `/Users/axe/work/seo/5118-seo-adapter` 需要 Node.js 运行时。
- **DEP-002**: 需要 `npm` 完成依赖安装和脚本执行。
- **DEP-003**: 需要 `@modelcontextprotocol/sdk@1.29.0` 完成 server 注册和 `stdio` transport。
- **DEP-004**: 需要 `zod@4.3.6` 完成确定性的输入 schema 校验。
- **DEP-005**: 需要 `typescript@6.0.3` 生成 `dist/` 构建产物。
- **DEP-006**: 需要 `vitest@4.1.4` 完成确定性的测试执行。
- **DEP-007**: 需要 `tsx@4.21.0` 作为本地 TypeScript 开发执行器。
- **DEP-008**: 需要 `@types/node@25.6.0` 提供 Node.js 类型定义。
- **DEP-009**: `../docs/5118-mcp-engineering-spec-zh.md` 是工具名、响应外壳和异步语义的权威契约。
- **DEP-010**: 官方 5118 厂商资料包必须可用，并至少包含 `SKILL.md`、`README.md`、`references/` 和 `references/error-codes.md`。

## 5. Files

- **FILE-001**: `/Users/axe/work/seo/5118-seo-adapter/docs/5118-mcp-engineering-spec.md` - 英文版总规格。
- **FILE-002**: `/Users/axe/work/seo/5118-seo-adapter/docs/5118-mcp-engineering-spec-zh.md` - 中文版总规格。
- **FILE-003**: `/Users/axe/work/seo/5118-seo-adapter/plan/feature-keyword-research-wave-one-1.md` - 英文版一期实施计划。
- **FILE-004**: `/Users/axe/work/seo/5118-seo-adapter/plan/feature-keyword-research-wave-one-1-zh.md` - 中文版一期实施计划。
- **FILE-005**: `/Users/axe/work/seo/5118-seo-adapter/package.json` - 项目清单和脚本入口。
- **FILE-006**: `/Users/axe/work/seo/5118-seo-adapter/tsconfig.json` - TypeScript 构建配置。
- **FILE-007**: `/Users/axe/work/seo/5118-seo-adapter/src/index.ts` - 进程入口。
- **FILE-008**: `/Users/axe/work/seo/5118-seo-adapter/src/server.ts` - MCP server 注册中心。
- **FILE-009**: `/Users/axe/work/seo/5118-seo-adapter/src/config/apiKeyRegistry.ts` - 一期环境变量注册表。
- **FILE-010**: `/Users/axe/work/seo/5118-seo-adapter/src/lib/http5118Client.ts` - 共享 HTTP 表单客户端。
- **FILE-011**: `/Users/axe/work/seo/5118-seo-adapter/src/lib/urlCodec.ts` - 请求编码和响应解码。
- **FILE-012**: `/Users/axe/work/seo/5118-seo-adapter/src/lib/errorMapper.ts` - 厂商错误码翻译。
- **FILE-013**: `/Users/axe/work/seo/5118-seo-adapter/src/lib/asyncExecutor.ts` - 提交、轮询和等待引擎。
- **FILE-014**: `/Users/axe/work/seo/5118-seo-adapter/src/normalizers/keywordDiscovery.ts` - 同步工具 normalizer。
- **FILE-015**: `/Users/axe/work/seo/5118-seo-adapter/src/normalizers/keywordMetrics.ts` - 异步工具 normalizer。
- **FILE-016**: `/Users/axe/work/seo/5118-seo-adapter/src/tools/getLongtailKeywords5118.ts` - 长尾词工具 handler。
- **FILE-017**: `/Users/axe/work/seo/5118-seo-adapter/src/tools/getIndustryFrequencyWords5118.ts` - 高频词分析工具 handler。
- **FILE-018**: `/Users/axe/work/seo/5118-seo-adapter/src/tools/getSuggestTerms5118.ts` - 下拉联想工具 handler。
- **FILE-019**: `/Users/axe/work/seo/5118-seo-adapter/src/tools/getKeywordMetrics5118.ts` - 异步关键词指标工具 handler。
- **FILE-020**: `/Users/axe/work/seo/5118-seo-adapter/src/tools/getMobileTrafficKeywords5118.ts` - 异步移动流量词工具 handler。
- **FILE-021**: `/Users/axe/work/seo/5118-seo-adapter/docs/integration/standalone-usage.md` - 独立使用说明。
- **FILE-022**: `/Users/axe/work/seo/5118-seo-adapter/examples/vscode-mcp.stdio.example.json` - 通用 `stdio` 配置示例。
- **FILE-023**: `/Users/axe/work/seo/5118-seo-adapter/examples/wave-one-sequence.json` - 一期工具调用顺序示例。
- **FILE-024**: `/Users/axe/work/seo/5118-seo-adapter/tests/fixtures/wave-one/*.json` - 一期 fixtures。
- **FILE-025**: `/Users/axe/work/seo/5118-seo-adapter/tests/*.test.ts` - 一期测试文件。
- **FILE-026**: `/Users/axe/work/seo/5118-seo-adapter/scripts/validate-wave-one.mjs` - 一期校验脚本。

## 6. Testing

- **TEST-001**: 在 `/Users/axe/work/seo/5118-seo-adapter` 中运行 `npm test`，确认所有同步工具 fixture 都能在无真实网络请求的前提下通过归一化测试。
- **TEST-002**: 运行 `npm test`，确认 `get_keyword_metrics_5118` 正确处理 `submit`、`poll`、`wait`、厂商状态码 `101` 和厂商状态码 `200401`。
- **TEST-003**: 运行 `npm test`，确认 `get_mobile_traffic_keywords_5118` 正确处理厂商状态码 `200104`、超时边界以及 `taskId + keyword` 轮询语义。
- **TEST-004**: 运行 `npm test`，确认 `encodeInputFields` 会对中文输入执行 URL 编码，`decodeResponseStrings` 会安全解码响应值。
- **TEST-005**: 运行 `node scripts/validate-wave-one.mjs`，确认构建后的 MCP server 只注册 5 个工具，示例 `stdio` 配置指向 `/Users/axe/work/seo/5118-seo-adapter/dist/index.js`，`package.json` 中核心依赖版本与 REQ-010 完全一致，且项目本地文档副本与 REQ-011 完全一致。
- **TEST-006**: 运行 `node dist/index.js`，确认构建后的 server 可以在 `stdio` 模式下启动，且不存在模块解析错误、工具注册错误或立即退出的问题。
- **TEST-007**: 只在 `API_5118_LONGTAIL_V2` 存在时运行 `npm run test:live -- --tool=get_longtail_keywords_5118`，并确认当环境变量缺失时 live gate 会拒绝执行。

## 7. Risks & Assumptions

- **RISK-001**: 厂商为 `/keywordparam/v2` 使用了未文档化的 pending 状态码 `101`，首次真实联调后可能需要微调。
- **RISK-002**: `/traffic` 可能持续 pending 数分钟，过于激进的默认超时会产生假失败。
- **RISK-003**: 每个工具都对应独立计费 key，即使代码正确，也可能因为 key 未购买而阻塞 live 测试。
- **RISK-004**: 项目本地保存的厂商资料包如果与上游更新漂移，可能导致环境变量、字段或错误码解释过时。
- **ASSUMPTION-001**: 目标 MCP 项目会一直作为兄弟目录存在于 `/Users/axe/work/seo/5118-seo-adapter`。
- **ASSUMPTION-002**: 一期只需要 REQ-001 中列出的 5 个 5118 官方 API 工具。
- **ASSUMPTION-003**: 实现开始前，工程内可获得一份完整且可审阅的官方 5118 厂商资料包。
- **ASSUMPTION-004**: `../docs/5118-mcp-engineering-spec-zh.md` 在一期实现期间保持为权威契约。

## 8. Related Specifications / Further Reading

- [../docs/5118-mcp-engineering-spec.md](../docs/5118-mcp-engineering-spec.md)
- [../docs/5118-mcp-engineering-spec-zh.md](../docs/5118-mcp-engineering-spec-zh.md)
- 项目本地厂商资料包中的 `SKILL.md`
- 项目本地厂商资料包中的 `README.md`
- 项目本地厂商资料包中的 `references/`
- 项目本地厂商资料包中的 `references/error-codes.md`
