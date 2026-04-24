# 5118 MCP 工程总规格

本文档亦提供[英文版](./5118-mcp-engineering-spec.md)。

## 用途

本文档是完整 5118 MCP 工程的唯一工程规格基线。

它定义了目标架构、共享运行时规则、归一化模型、错误模型、分阶段交付边界，以及
官方 5118 厂商资料包中全部 API 的工具目录。

后续实现计划可以只覆盖关键词研究子集，但任何阶段性方案都必须兼容本文档定义的
总约束。

## 权威输入

MCP 工程应首先以项目本地保存的官方 5118 厂商资料包为依据，任何补充说明都只能作
为设计辅助，不能反过来覆盖厂商语义。

项目本地的厂商资料包至少应包含这些输入：

- 顶层 `SKILL.md`
- 顶层 `README.md`
- `references/` 目录中的全部 API 参考文档
- `references/error-codes.md`

## 关键盘点说明

厂商资料内部并不完全一致，MCP 工程必须显式处理这点。

- 顶层厂商 skill 包和 README 都写的是 38 个 API。
- `references/` 目录里实际有 39 份 API 参考文档。
- `original.md` 定义了原创度检测 API，对应环境变量是 `API_5118_ORIGINAL`。
- 这个原创度接口没有出现在顶层路由总表里。

因此，终极目标的 MCP 工程应覆盖 39 个工具，而不是 38 个，除非后续厂商正式修正
并删除其中某份 reference。

## 工程目标

终极目标工程要把 39 个已确认的官方 API 统一封装到一个 MCP server 里，并共享一套
实现模型。

生成出来的工程必须满足这些目标：

- 每个 5118 官方 API 对应一个语义清晰的 MCP tool。
- 对上层屏蔽 URL 编码、异步轮询、分页和错误细节。
- 保留厂商原始响应，便于调试和后续字段扩展。
- 支持分模块渐进上线，但不改变公共契约。
- 当共享 API key 缺失时，能够明确失败并指出所需环境变量。

## 推荐参考栈

本文档本身不绑定语言，但推荐参考实现采用：

- Node.js + TypeScript
- 官方 MCP SDK
- 先实现 `stdio` transport
- 再视需要补充 Streamable HTTP transport
- 一个统一的 5118 HTTP client，负责 `POST` 表单请求
- 基于 fixture 的契约测试，加上可选的真实 smoke test

如果你最终选择其他运行时，也必须完整实现本文档定义的工具契约和共享规则。

## 共享运行时契约

| 项目 | 约束 |
| --- | --- |
| 基础域名 | `https://apis.5118.com` |
| HTTP 方法 | 只允许 `POST` |
| Content-Type | `application/x-www-form-urlencoded; charset=utf-8` |
| 认证头 | `Authorization: <APIKEY>`，直接传原始 key，不加前缀 |
| 成功条件 | `errcode == "0"` |
| 通用响应字段 | `errcode`、`errmsg`，外加各接口自有负载 |
| API key 模型 | 当前实现统一使用一个环境变量：`API_KEY` |
| 请求编码 | 可能包含中文或长文本的字段必须先做 URL 编码 |
| 响应解码 | 对返回给上层的字符串字段执行 URL 解码 |
| 原始负载保留 | 原厂 JSON 必须放到 `raw` 字段中保留 |
| 密钥处理 | 日志和报错中都不能泄露真实 API key |
| 缺 key 行为 | 直接返回配置错误，并指出具体缺少的环境变量 |

## 必备内部模块

在真正实现任何 tool 之前，生成的 MCP 工程应先具备这些共享模块。

- 配置注册表：把每个 MCP tool 映射到当前已实现工具集共享的 key 环境变量。
- 5118 HTTP client：负责发送带认证的表单请求。
- 编解码层：对入参做 URL 编码，对响应字符串做 URL 解码。
- 异步轮询器：支持 `submit`、`poll`、`wait` 三种模式。
- 分页映射器：统一 `page_index`、`page_size`、`page_count`、`total`。
- 错误映射器：把厂商错误码翻译成稳定的 MCP 错误语义。
- 响应归一化层：对上层输出稳定结构，同时保留 `raw`。
- 限流防护层：处理可重试的超限和超时错误。
- 测试夹具：保存成功、处理中、参数错误、鉴权错误等样本。

## 工具命名与契约规则

### 命名约定

- 一个厂商 API 对应一个 MCP tool。
- 工具名统一使用 snake_case，并以 `_5118` 结尾。
- 优先使用语义化任务名，而不是直接暴露 endpoint 名称。

### 同步与异步暴露模型

厂商的异步接口在 MCP 层仍然只表现为一个逻辑工具，不拆成“提交任务工具”和
“轮询任务工具”两套公开名字。

### 共享异步控制字段

异步工具除了业务参数外，还应支持这些共享控制字段。

| 字段 | 类型 | 含义 |
| --- | --- | --- |
| `executionMode` | `submit \| poll \| wait` | `submit` 只返回 `taskId`，`poll` 查询已有任务，`wait` 由适配层内部完成轮询 |
| `taskId` | string 或 number | `poll` 模式必填 |
| `maxWaitSeconds` | number | `wait` 模式下的最大等待时长 |
| `pollIntervalSeconds` | number | 自定义轮询间隔 |

推荐默认值：

- 对较短的异步流程，默认使用 `wait`。
- 对可能耗时数分钟的接口，尤其是 `/traffic`，默认使用 `submit`。
- 允许调用方显式覆盖默认值。

### 归一化响应外壳

每个工具都应返回统一的顶层外壳，形态类似这样：

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

### 归一化规则

- 归一化字段统一使用 camelCase。
- `raw` 中完整保留厂商原始字段名和原始类型。
- 只有在确定无损时，才在归一化字段里把数字字符串转成 number。
- 对不可用字段返回 `null`，不要臆造默认值。
- 所有分页型输出统一使用 `pagination` 对象。
- 把数组数据归一到有语义的字段，例如 `keywords`、`items`、`rankings`、
  `records`、`titles`、`issues`。

## 错误翻译策略

| 厂商错误码 | 含义 | MCP 侧行为 |
| --- | --- | --- |
| `0` | 成功 | 返回归一化数据 |
| `100101` | 额度不足 | 作为不可重试的计费或配额错误返回 |
| `100102` | 每秒限流 | 采用退避重试 |
| `100103` | 每小时限流 | 返回失败并附带稍后重试指引 |
| `100104` | 每天限流 | 返回失败并附带稍后重试指引 |
| `100202` | 缺少 API key | 作为配置错误返回 |
| `100203` | API key 无效 | 作为配置错误返回 |
| `100204` | API 不存在 | 作为上游契约错误返回 |
| `100208` | HTTP 方法错误 | 视为内部实现错误 |
| `200103` | 任务不存在 | 作为无效任务引用返回 |
| `200104` | 数据处理中 | 返回 `pending` 或继续轮询 |
| `200107` | 服务器超时 | 在上限内退避重试 |
| `200121` | 域名暂不支持导出 | 作为目标不支持错误返回 |
| `200201` | 参数为空 | 作为输入错误返回 |
| `200203` | 缺少关键词 | 作为输入错误返回 |
| `200204` | 缺少网址 | 作为输入错误返回 |
| `200301` | URL 格式错误 | 作为输入错误返回 |
| `200401` | 关键词数量超限 | 自动分片，或返回超限明细错误 |
| `101` | `keywordparam/v2` 的处理中状态 | 虽然通用错误码文档未列出，但必须按 pending 处理 |

## 异步工作流矩阵

| 工具 | Endpoint | 提交参数 | 轮询参数 | 完成信号 | 说明 |
| --- | --- | --- | --- | --- | --- |
| `get_keyword_metrics_5118` | `/keywordparam/v2` | `keywords` | `taskId` | `errcode == "0"` | 厂商可能用 `101` 表示处理中 |
| `get_mobile_traffic_keywords_5118` | `/traffic` | `keyword` | `taskId`、`keyword`、分页参数 | `errcode == "0"` | 第一步通常返回 `200104` 和 `taskid`；应允许长等待 |
| `get_pc_rank_snapshot_5118` | `/morerank/baidupc` | `url`、`keywords`、`checkRow` | `taskId` | `errcode == "0"` | 可包装为内部轮询 |
| `get_mobile_rank_snapshot_5118` | `/morerank/baidumobile` | `url`、`keywords`、`checkRow` | `taskId` | `errcode == "0"` | 与 PC 相同模式 |
| `get_pc_top50_sites_5118` | `/keywordrank/baidupc` | `keywords`、`checkRow` | `taskId` | `errcode == "0"` | 结果根字段是 `keyword_monitor` |
| `get_mobile_top50_sites_5118` | `/keywordrank/baidumobile` | `keywords`、`checkRow` | `taskId` | `errcode == "0"` | 结果根字段是 `keyword_monitor` |
| `check_url_indexing_5118` | `/include` | `urls` | `taskId` | `check_status == 1` | 完成判断不能只看 `errcode` |
| `get_icp_record_instant_5118` | `/icp/instant` | `searchText` | `taskId` | 厂商成功负载出现 | 返回结构文档不完整 |

## 共享枚举与边界说明

这些值很关键，因为自动生成工程时最容易在这里出错。

| 字段 | 已知取值或限制 | 适用工具 |
| --- | --- | --- |
| `platform` | `baidu`、`baidumobile`、`shenma`、`360`、`360mobile`、`sogou`、`sogoumobile`、`zhihu`、`toutiao`、`taobao`、`tmall`、`pinduoduo`、`jingdong`、`douyin`、`amazon`、`xiaohongshu` | `get_suggest_terms_5118` |
| `searchType` | `domain`、`icp`、`name`、`company` | `get_icp_record_5118` |
| `retype` | `1`、`2`、`3` | `rewrite_text_5118` |
| `strict` | `0` 到 `4` | `paraphrase_sentence_5118` |
| `strict` | 越高越严格，默认 `1` | `replace_terms_5118` |
| `scheme` | `1` 优选，`2` 多样化 | `compose_article_paragraphs_5118` |
| 关键词数量 | 最多 `50` 个 | `get_keyword_metrics_5118`、实时排名类、前 50 网站类 |
| URL 数量 | 最多 `200` 个 | `check_url_indexing_5118` |
| 导出分页大小 | 固定 `500` | PC/移动/整站排名词导出类 |
| 常规分页大小 | 最大 `100` | 长尾词和垂直关键词类 |
| 竞价分页大小 | 最大 `500` | 竞价公司和竞价词工具 |
| 改写文本长度 | 小于 `5000` 字符 | 改写类工具 |
| 原创度检测长度 | 小于 `7500` 字符 | `check_originality_5118` |
| AI 检测长度 | `100` 到 `6000` 字符 | `detect_ai_content_5118` |
| 整句原创长度 | 最大 `150` 字符 | `paraphrase_sentence_5118` |
| 扩写输入长度 | `5` 到 `300` 字符 | `expand_text_5118` |
| 扩写目标字数 | 最大 `1000` 字符 | `expand_text_5118` |
| 文章组合目标字数 | 最大 `3000` 字符 | `compose_article_paragraphs_5118` |

## 全量 API 工具目录

### 关键词发现与扩展

| MCP 工具 | 官方 API / endpoint | 环境变量 | 模式 | 必填输入 | 关键可选参数 | 归一化数据字段 | 约束与说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `get_longtail_keywords_5118` | 海量长尾词挖掘 v2 / `/keyword/word/v2` | `API_KEY` | 同步 | `keyword` | `pageIndex`、`pageSize`、`sortField`、`sortType`、`filter`、`filterDate` | `keywords[]` | `pageSize <= 100`；支持排序和快速筛选 |
| `get_industry_frequency_words_5118` | 细分行业分析 / `/tradeseg` | `API_KEY` | 同步 | `keyword` | 无 | `frequencyWords[]` | 返回高频分词及占比 |
| `get_suggest_terms_5118` | 下拉联想词挖掘 / `/suggest/list` | `API_KEY` | 同步 | `word`、`platform` | 无 | `suggestions[]` | `platform` 必须是文档列出的厂商取值之一 |
| `get_keyword_metrics_5118` | 关键词搜索量信息 v2 / `/keywordparam/v2` | `API_KEY` | 异步 | `keywords[]` | 共享异步控制字段 | `items[]` | 最多 50 个关键词；厂商使用 `\|` 分隔；处理中可能返回 `101` |
| `get_taobao_keywords_5118` | 淘宝长尾词挖掘 / `/keyword/taobao` | `API_5118_TAOBAO` | 同步 | `keyword` | 分页与排序参数 | `keywords[]` | 与其他垂直关键词工具同族 |
| `get_jd_keywords_5118` | 京东长尾词挖掘 / `/keyword/jd` | `API_5118_JD` | 同步 | `keyword` | 分页与排序参数 | `keywords[]` | 分页模式与淘宝相同 |
| `get_pdd_keywords_5118` | 拼多多长尾词挖掘 / `/keyword/pinduoduo` | `API_5118_PDD` | 同步 | `keyword` | 分页与排序参数 | `keywords[]` | 分页模式与淘宝相同 |
| `get_sm_keywords_5118` | 神马长尾词挖掘 / `/keyword/sm/word` | `API_5118_SM` | 同步 | `keyword` | 分页与排序参数 | `keywords[]` | 神马搜索垂直词库 |
| `get_google_keywords_5118` | Google 长尾词挖掘 / `/keyword/google` | `API_5118_GOOGLE` | 同步 | `keyword` | 分页与排序参数 | `keywords[]` | Google 搜索垂直词库 |
| `get_amazon_keywords_5118` | 亚马逊长尾词挖掘 / `/keyword/amazon` | `API_5118_AMAZON` | 同步 | `keyword` | 分页与排序参数 | `keywords[]` | Amazon 跨境电商词库 |
| `get_mobile_traffic_keywords_5118` | 移动流量词挖掘 / `/traffic` | `API_KEY` | 异步 | `keyword` | 共享异步控制字段、分页参数 | `keywords[]` | 长耗时任务；第二步必须同时传 `taskId` 和 `keyword` |

### 排名词导出

| MCP 工具 | 官方 API / endpoint | 环境变量 | 模式 | 必填输入 | 关键可选参数 | 归一化数据字段 | 约束与说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `export_pc_site_keywords_5118` | PC 网站排名词导出 v2 / `/keyword/pc/v2` | `API_5118_BAIDUPC_V2` | 同步 | `url` | `pageIndex` | `keywords[]` | 厂商结果根字段是 `data.baidupc[]`；`pageSize` 固定 500 |
| `get_baijiahao_rankings_5118` | 百家号排名词导出 / `/keyword/baijiahao` | `API_5118_BAIJIAHAO` | 同步 | `keyword`、`platform` | 无 | `rankings[]` | `platform` 仅 `pc` 或 `mobile`；`keyword` 代表百家号目标 |
| `export_mobile_site_keywords_5118` | 移动网站排名词导出 v2 / `/keyword/mobile/v2` | `API_5118_MOBILE_V2` | 同步 | `url` | `pageIndex` | `keywords[]` | 厂商结果根字段是 `data.baidumobile[]`；`pageSize` 固定 500 |
| `export_domain_keywords_5118` | PC 整站排名词导出 v2 / `/keyword/domain/v2` | `API_5118_DOMAIN_V2` | 同步 | `url` | `pageIndex` | `keywords[]` | 面向整域聚合；`pageSize` 固定 500 |

### 竞价情报

| MCP 工具 | 官方 API / endpoint | 环境变量 | 模式 | 必填输入 | 关键可选参数 | 归一化数据字段 | 约束与说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `get_bid_companies_5118` | 竞价推广公司挖掘 / `/bidsite` | `API_5118_BIDSITE` | 同步 | `keyword` | `pageIndex`、`pageSize` | `companies[]` | 竞价公司情报查询；分页大小最多 500 |
| `export_bid_keywords_5118` | 网站竞价词 v2 / `/bidword/v2` | `API_5118_BIDWORD_V2` | 同步 | `url` | `pageIndex`、`pageSize` | `keywords[]` | 竞价词导出；分页大小最多 500 |

### 实时排名检查

| MCP 工具 | 官方 API / endpoint | 环境变量 | 模式 | 必填输入 | 关键可选参数 | 归一化数据字段 | 约束与说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `get_pc_rank_snapshot_5118` | PC 实时排名查询 / `/morerank/baidupc` | `API_5118_RANK_PC` | 异步 | `url`、`keywords[]` | `checkRow`、共享异步控制字段 | `rankings[]` | 最多 50 个关键词；`checkRow <= 50`；结果根字段是 `data.keywordmonitor[]` |
| `get_mobile_rank_snapshot_5118` | 移动实时排名查询 / `/morerank/baidumobile` | `API_5118_RANK_MOBILE` | 异步 | `url`、`keywords[]` | `checkRow`、共享异步控制字段 | `rankings[]` | 最多 50 个关键词；`checkRow <= 100`；结果根字段是 `data.keywordmonitor[]` |

### 前 50 网站快照

| MCP 工具 | 官方 API / endpoint | 环境变量 | 模式 | 必填输入 | 关键可选参数 | 归一化数据字段 | 约束与说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `get_pc_top50_sites_5118` | PC 前 50 网站信息 / `/keywordrank/baidupc` | `API_5118_KWRANK_PC` | 异步 | `keywords[]` | `checkRow`、共享异步控制字段 | `siteSnapshots[]` | 最多 50 个关键词；结果根字段是 `data.keyword_monitor[]` |
| `get_mobile_top50_sites_5118` | 移动前 50 网站信息 / `/keywordrank/baidumobile` | `API_5118_KWRANK_MOBILE` | 异步 | `keywords[]` | `checkRow`、共享异步控制字段 | `siteSnapshots[]` | 最多 50 个关键词；结果根字段是 `data.keyword_monitor[]` |

### 站点验证与备案

| MCP 工具 | 官方 API / endpoint | 环境变量 | 模式 | 必填输入 | 关键可选参数 | 归一化数据字段 | 约束与说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `check_url_indexing_5118` | URL 收录检测 / `/include` | `API_5118_INCLUDE` | 异步 | `urls[]` | 共享异步控制字段 | `results[]` | 最多 200 个 URL；完成信号依赖 `check_status` |
| `get_site_weight_5118` | 5118 网站权重查询 / `/weight` | `API_5118_WEIGHT` | 同步 | `url` | 无 | `weights` | 厂商返回 `data.result[]` 的单键对象数组；归一化层需扁平化 |
| `get_icp_record_5118` | 备案数据查询 / `/icp/getinfo` | `API_5118_ICP` | 同步 | `searchText` | `searchType` | `record` | 厂商文档只说明 `subject` 与 `webList`，没有完整 JSON 示例 |
| `get_icp_record_instant_5118` | 即时备案查询 / `/icp/instant` | `API_5118_ICP_INSTANT` | 异步 | `searchText` | 共享异步控制字段 | `record` | 返回结构只部分公开，必须保守归一化并完整保留 `raw` |

### 改写与换词

| MCP 工具 | 官方 API / endpoint | 环境变量 | 模式 | 必填输入 | 关键可选参数 | 归一化数据字段 | 约束与说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `rewrite_text_5118` | 一键智能改写 / `/wyc/rewrite` | `API_5118_REWRITE` | 同步 | `text` | `retype`、`keepHtml`、`sim` | `text`、`similarity` | 文本必须 URL 编码；长度小于 5000 字符 |
| `rewrite_text_senior_5118` | 一键改写升级版 / `/wyc/seniorrewrite` | `API_5118_SENIOR_REWRITE` | 同步 | `text` | `sim` | `text`、`similarity` | 文本必须 URL 编码；长度小于 5000 字符 |
| `replace_terms_5118` | 一键换词 / `/wyc/akey` | `API_5118_AKEY` | 同步 | `text` | `th`、`filter`、`corewordfilter`、`sim`、`strict` | `text`、`coreTerms`、`similarity` | 文本必须 URL 编码；`filter` 使用厂商 `\|` 分隔 |

### 文本分析与检测

| MCP 工具 | 官方 API / endpoint | 环境变量 | 模式 | 必填输入 | 关键可选参数 | 归一化数据字段 | 约束与说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `extract_core_terms_5118` | 智能核心词提取 / `/coreword` | `API_5118_COREWORD` | 同步 | `text` | 无 | `coreTerms[]` | 文本必须 URL 编码 |
| `detect_banned_words_5118` | 智能违规词检测 / `/bannedword/v2` | `API_5118_BANNEDWORD` | 同步 | `text` | 无 | `issues[]` | 厂商结果按 level 和 item 分层 |
| `extract_abstract_5118` | 智能摘要提取 / `/abstract` | `API_5118_ABSTRACT` | 同步 | `text` | 无 | `abstract` | 文本必须 URL 编码 |
| `check_text_similarity_5118` | 相似度检测 / `/wyc/sim` | `API_5118_SIM` | 同步 | `originalText`、`newText` | 无 | `similarity` | 两个字段都必须 URL 编码 |
| `detect_ai_content_5118` | AI 内容检测 / `/aidetect` | `API_5118_AIDETECT` | 同步 | `content` | 无 | `aiReport` | 文本必须 URL 编码；长度 100 到 6000 字符；包含逐行评分 |
| `check_originality_5118` | 原创度检测 / `/wyc/original` | `API_5118_ORIGINAL` | 同步 | `text` | 无 | `originalityMatches[]` | 文本必须 URL 编码；长度小于 7500 字符；顶层总表漏掉了这个接口 |

### 内容生成与创作输出

| MCP 工具 | 官方 API / endpoint | 环境变量 | 模式 | 必填输入 | 关键可选参数 | 归一化数据字段 | 约束与说明 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `expand_text_5118` | 文本扩写精灵 / `/ai/autoexpander` | `API_5118_EXPANDER` | 同步 | `keywords` | `wishContentCount`、`modelVersion` | `text` | 输入长度 5 到 300 字符；目标输出最多 1000 字符 |
| `paraphrase_sentence_5118` | 整句智能原创 / `/wyc/sentence` | `API_5118_SENTENCE` | 同步 | `text` | `strict` | `candidates[]` | 文本必须 URL 编码；长度最多 150 字符；`strict` 取值 0 到 4 |
| `generate_title_from_text_5118` | 智能标题生成 / `/wyc/title` | `API_5118_TITLE` | 同步 | `text` | 无 | `title` | 文本必须 URL 编码；长度最多 5000 字符 |
| `optimize_title_from_keywords_5118` | 标题助手 / `/ai/titleoptimizer` | `API_5118_TITLEOPTIMIZER` | 同步 | `keywords` | 无 | `titles[]` | 厂商返回一个按换行拼接的字符串；归一化时拆成数组 |
| `compose_article_paragraphs_5118` | 段落组合大师 / `/articlewriter` | `API_5118_ARTICLEWRITER` | 同步 | `keywords`、`excludeKeywords`、`maxContentCount`、`startDate`、`endDate` | `scheme` | `article` | `keywords` 最多 5 个词且以空格分隔；两个文本字段都要 URL 编码；`maxContentCount <= 3000` |

## 分阶段交付建议

本文档定义的是终极目标面，但实际落地建议分阶段完成。

1. Wave 0：先完成共享运行时模块、环境变量注册、错误映射、编解码、归一化和
   异步控制模型。
2. Wave 1：实现关键词发现类接口，服务关键词研究工作流。
3. Wave 2：实现排名、导出、竞价和站点验证类接口。
4. Wave 3：实现改写、检测、生成与创作类接口。

后续任何阶段性实施计划都可以只选一部分工具，但不能改写本文档定义的名字、响应
外壳、错误语义或环境变量契约。

## 测试要求

每个生成出来的工具，至少都应具备这些测试层。

- 一份成功 fixture，负载形状必须接近真实厂商响应。
- 一份缺 key 测试，并明确断言所需环境变量名。
- 一份基于文档边界值的输入错误测试。
- 一份限流或配额路径测试，只要该接口文档涉及额度限制。
- 对异步接口，分别覆盖 `submit`、`pending`、`completed`、超时四类场景。
- 对文本类接口，覆盖请求 URL 编码和响应 URL 解码。
- 对归一化层，既要校验归一化字段，也要校验 `raw` 完整保留。

真实 smoke test 应做成可选项，因为每个 API 都对应独立且可能计费的 key。

## 未决问题与必要验证

以下内容在厂商文档里没有被完整定义，工程里必须把它们视为显式假设，直到获得更
明确的官方确认。

- `keywordparam/v2` 文档说明处理中会返回 `101`，但通用错误码文档没有定义它。
- `/traffic` 在处理中会返回 `200104` 和 `taskid`，但除了“1 到 10 分钟”之外，
  没有更细的生命周期描述。
- `/icp/getinfo` 只描述了顶层字段，没有完整 JSON 样例。
- `/icp/instant` 没有公开完整 JSON 示例，因此归一化字段必须保守，`raw` 必须总
  是可用。
- 厂商文档没有定义限流响应头，也没有给出明确的 retry-after 秒数。
- 厂商文档没有保证所有嵌套字符串字段都一定经过 URL 编码，因此解码器要容错而
  不是强行破坏字符串。

## 验收标准

只有当下面这些条件都满足时，生成出来的 MCP 工程才算符合本文档。

- 39 个厂商 API 都有对应的 MCP tool。
- 每个 tool 都绑定到它文档中对应的环境变量。
- 所有异步工具都支持 `submit`、`poll`、`wait` 三种执行模式。
- 文本类工具会透明处理请求编码和响应解码。
- 分页型工具都会返回统一的 `pagination` 对象。
- 每次调用都会保留原厂 `raw` 响应。
- 缺 key、输入错误、处理中状态和限流都会被稳定地暴露出来。
- 原创度检测 API 会被纳入实现范围，不能因为顶层路由表漏写就被忽略。
- 后续任何子集实现计划都可以只选部分工具，但不能改变本文档定义的共享契约。
