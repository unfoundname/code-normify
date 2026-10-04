# 真实工具调用与结果证据（由脚本从工具响应与产物中抽取）

## 调用渠道（只写实际发生的，不虚构）

| 渠道 | 实际调用 | 说明 |
| --- | --- | --- |
| pi 的 MCP 网关（mcp / mcpScript） | `normify_schema_get` ×1、`normify_graph_get` ×2 | 仅用于读取 Schema 与当前图；**没有**经网关调用 graph_validate / graph_put / policy_upsert / validate |
| 基线内 SDK 客户端（`project/tools/mcp-client.mjs`，@modelcontextprotocol/sdk → 同一批 `lib/mcp.js`） | `graph_validate/put`、`policy_upsert`、`build`、`render`、`validate`、`branch_plan_suggest/get/validate/put`、`branch_packet`、`branch_plan_export` | 本轮的图、计划、包与渲染全部经此渠道完成 |

两者都是真实的 MCP 调用，但渠道不同：SDK 调用**不经过** pi 的 adapter，因此 `pi-mcp-trace.jsonl` 不覆盖它们；本文件不做任何超出实际记录的推断。

## 回执（区分初始 put 与最终 build）

| 架构 normify_graph_put（初始写入回执） | ok，digest `(见 .step-arch.log)`，214 模块 |
| 架构 normify_build + render（最终视图摘要） | digest `72bc6aa01bbcb87e80f593008effa18d2ff11e39bc38d416f41c3b16d51ed7dc`（与 HTML/receipt/tree 一致，见 view-consistency.json） |
| 架构 normify_validate | 0 error / 199 warning（均为 planned 源码未落地、叶粒度与未锚定边提示） |
| 架构 normify_policy_upsert | 6 条规则（acyclic、client/assembly 终端性、契约不反向依赖、max-depth） |
| 数据 normify_graph_put | ok，170 模块（149 实体 / 186 关系），digest `e19b52a258122306c3bf697e71095cf66bb4a30d60eca32d7046d66e09923d6c` |
| 数据 normify_validate | 0 error / 151 warning |
| 数据 normify_policy_upsert | 3 条规则（acyclic、max-depth 4、deprecated 目标） |
| normify_branch_plan_suggest | 候选 174 个单元、ready:false（原始候选见 branch-plan-candidate.json） |
| normify_branch_plan_validate | 0 error（19 单元恰好覆盖 186 个叶子） |
| normify_branch_plan_put | ok，plan digest `f459426c73686b5ea9f7165a7053de69f7eef13bda8cd52e2ffc3c26ac750e44`，graph digest `72bc6aa01bbcb87e80f593008effa18d2ff11e39bc38d416f41c3b16d51ed7dc`，base_commit `7b0ea7f5a56933f004bdd50d29b6ffae7bc74cde` |
| normify_branch_packet ×19 | 全部 ok，冻结交接包保存为 branch-packets.json（19 个） |
| normify_branch_plan_export | ok，lead_ref=`lead_ref:promptmanager/worker-plan/default`，19 项，保存为 worker-plan.json |
| 交付投影 normify_graph_put | ok，22 模块，digest `d05d1559e4fd161f607371f6d1acb183ba59b21aff17964f0b5c6235c614a356` |
| 交付投影 normify_validate | 0 error / 1 warning |
| 评审自检脚本（只读） | 17/17 项通过（12 项契约修正 + 授权/事件/分页/时区/检索边界/方言等） |

## 实际执行的检查（隔离工作树，不借用活目录）

- 工作树 `.verify-worktree` @ `7b0ea7f5a56933f004bdd50d29b6ffae7bc74cde`（等于 base_commit：true）。
- `node tools/verify-contracts.mjs --all`：退出码 0，校验类型实例 390 个、叶子归属与写入独占、外部依赖策略、负例拒绝。
- 逐单元 `node tools/verify-contracts.mjs --unit <unit>`：19 次，退出码 0/0/0/0/0/0/0/0/0/0/0/0/0/0/0/0/0/0/0。
- TypeScript 冻结契约：`tsc -p contracts/types/tsconfig.json` 退出码 0（44 个桩文件、57 条跨文件 import）。
- fixture：186 个样例 / 390 个类型实例通过严格校验；19 个负例全部被拒绝。
- 这些检查只证明设计/契约与 fixture 层，不代表业务实现或集成通过。

## 业务验收（未执行）

- 共 57 条业务验收定义已登记且 `executed=false`；基线内没有业务实现或测试文件，因此没有任何业务通过结论。
- 计划中的业务命令示例：node --test contracts/tests/common.test.mjs；node --test contracts/tests/event.test.mjs；node --test contracts/tests/state.test.mjs …

## 只读浏览器验收

- architecture：根层 21 个节点；下钻 bili.client:5 子节点/22 详情面板；bili.contract:4 子节点/0 详情面板；bili.assembly:7 子节点/0 详情面板；截图 architecture.png。
- data：根层 20 个节点；下钻 data.content:13 子节点/0 详情面板；data.media:11 子节点/0 详情面板；data.relations:0 子节点/2 详情面板；截图 data.png。
- delivery：根层 21 个节点；下钻 delivery.waves:0 子节点/3 详情面板；delivery.u-playback:0 子节点/4 详情面板；delivery.u-integration:0 子节点/4 详情面板；截图 delivery.png。
- index：标题「bilibili 类视频网站 · 设计交付入口（评审修正版）」；截图 index.png。
- 页面错误：0 个。

## 实际使用的 MCP 通道（准确区分）

- 经 **pi 的 MCP 网关**（mcp / mcpScript）直接调用：`normify_schema_get` ×1、`normify_graph_get` ×2（仅读取 Schema 与当前图）。
- 经 **基线仓库内的 SDK 客户端**（`project/tools/mcp-client.mjs`，用仓库已有的 @modelcontextprotocol/sdk 连接同一批 `lib/mcp.js` 服务）调用：`normify_graph_validate`、`normify_graph_put`、`normify_policy_upsert`、`normify_build`、`normify_render`、`normify_validate`、`normify_branch_plan_suggest/get/validate/put`、`normify_branch_packet`、`normify_branch_plan_export`。
- 两者都是真实 MCP。本轮**未调用** `normify_help`；`pi-mcp-trace.jsonl` 只记录经网关的会话，不覆盖 SDK transport，也不做超出的推断。

## 最终一致性（真实工具调用）

- `normify_branch_plan_validate`（语义复验，非仅读取）：记录于 `verification.json` 的 `final_integrity`（0 error / 200 warning），图 digest 与计划冻结 digest 一致。
- 三视图 `build` + `render` 后逐项核对：HTML 内嵌摘要 = receipt.source_digest = tree.source_digest = 当前图 digest（见 `view-consistency.json`）。
- 本机只读预览服务：`preview-server.json` 记录 url / pid / 停止命令（仅 127.0.0.1，未部署外网、未访问用户资源）。

## 口径与限制

- 实体口径：数据视图共 186 叶子中的 149 个**业务实体**（RDS 142 + 搜索投影 7）+ 1 个元数据目录叶（data.relations）；OSS 对象元数据存于 RDS，计在 RDS 内。
- 冻结实现基线 = `7b0ea7f5a56933f004bdd50d29b6ffae7bc74cde`；其后提交只含报告/证据/文档，当前 HEAD 不等于基线（19 单元隔离检查确实在基线工作树内运行）。
- 业务验收定义 57 条全部 `executed=false`，**不是** 57 个业务测试通过；已实际执行的只有设计/fixture 检查、契约测试（node --test 回执 pass 16 / fail 0）与 tsc 编译。
- WorkerPlan 是导出结果，未在 PromptManager 实际调度；本轮未实施任何 B 站业务，未访问用户服务器/RDS/OSS，未获取视频资源。
- 计划中保留 expected 的未实施 warning（planned 源码未落地、叶粒度、未锚定边），未视为失败。


- 原始日志：`.step-arch.log`（架构图 validate/put/policy/build 完整响应）、`.step-plan.log`（计划 suggest/validate/put）、`.step-report.log`（汇总）；本轮所有会写盘的原生命令都**完整重定向到日志后再裁剪**，不再用管道截断运行中的进程。
- SDK 调用不经过 pi 的 adapter，因此 `pi-mcp-trace.jsonl` 仅记录网关会话，不覆盖 SDK transport。

```text
# 架构（architecture 服务）
validate: {"ok":true,"errors":0,"errorCodes":[],"warnings":199,"warnCodes":["dep/unanchored","structure/leaf-too-coarse","structure/leaf-too-coarse-many","structure/planned-source-missing"]}
put: {"ok":true,"digest":"4dd5b8901db8e793c8b9ac9c64702bce2d3de0cf4cd7cd1d61a02feb3aa70b1b","modules":{"keys":0},"artifacts":["tree.json","outline.md","api-index.json","receipt.json","normify.html"],"receipt":{"schema_version":1,"ok":true,"project":"normify-architecture","compiled_at":"2026-10-03T23:46:13.898Z","source_digest":"4dd5b8901db8e793c8b9ac9c64702bce2d3de0cf4cd7cd1d61a02feb3aa70b1b","sta …
policy: {"ok":true,"file":"policy.yml","rule_count":6,"hint":"架构规则已生效：后续 normify_validate / normify_build / normify_check 都会执行。","errors":0,"errSample":[],"warnings":0,"warnSample":[],"validation":{"ok":true,"errors":[],"warnings":[{"code":"dep/unanchored","severity":"warning","message":"有 626 条箭头可锚定到具体 API 但未锚定（如 bili.acquire.dedupe → bili.media.asset；bili.acquire.dedupe → bili.infra.db；bili.acqu …
build: {"ok":true,"receipt":{"schema_version":1,"ok":true,"project":"normify-architecture","compiled_at":"2026-10-03T23:46:18.751Z","source_digest":"72bc6aa01bbcb87e80f593008effa18d2ff11e39bc38d416f41c3b16d51ed7dc","stats":{"tree_count":1,"module_count":214,"leaf_count":186,"api_count":278,"type_count":390,"dep_count":640,"cross_tree_dep_count":0,"max_depth":4,"layout_count":28,"planned_count":214 …
stats: {"modules":214,"containers":28,"leaves":186,"types":390,"apis":278,"deps":640,"layouts":28,"owners":["worker:W-ACQUIRE","worker:W-ASSEMBLY","worker:W-CHANNEL","worker:W-COMMERCE","worker:W-COMMUNITY","worker:W-CONTENT","worker:W-CONTRACT","worker:W-CREATOR","worker:W-DANMAKU","worker:W-DISCOVER","worker:W-IDENTITY","worker:W-INFRA","worker:W-LIVE","worker:W-MEDIA","worker:W-MESSAGE","worker …
writeApis: 113 injectedFields: 0

# 分支计划（architecture 服务）

```