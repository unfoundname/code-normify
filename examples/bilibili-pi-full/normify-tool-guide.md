---
name: normify-gen
description: Design or maintain a PromptManager project's Normify architecture and split it into independently verifiable delivery units using module, type, API and branch-plan contracts. Use for design-first architecture, parallel branch handoffs or synchronization after implementation; do not use for ordinary source edits without an architecture task.
---

# Normify 架构设计与维护

通过 PromptManager 已授权的 `normify_*` 工具设计架构，校验和提交结构数据，生成实现 Worker 的契约包。Normify 不修改源码；实现 Worker 的文件权限、创建、调度和任务状态由 PromptManager 负责。本技能不扩大既有授权。

## 接入与契约发现

- 使用当前实例已经绑定的工具。PromptManager 可能注入为 `mcp__<serverId>__normify_*`；binding 使用原始工具名。
- 先调用 `normify_schema_get` 和 `normify_graph_get`。以运行时 Schema 为准，记录完整图和 `digest`；数据目录和源码仓库由宿主绑定，不传 `project`、`dir` 或 `repoRoot`。
- 若实例只获只读权限，完成读取、诊断或候选设计；交由获授权的设计实例提交，不更换服务器或绕过宿主权限。
- 完整字段及 JSON 示例见 [README](../../README.md#统一-json-契约)；引擎规则见 [SPEC](../../docs/SPEC.zh-CN.md)。

## 设计先于代码

1. 从用户需求及已有架构划分职责，检查现有模块、类型和接口，复用已有契约。
2. 设计模块树：`parent` 必须等于去掉末段后的 `id`，根为 `null`；分配唯一 8 位小写 hex `uid`，移动或改名时保留。只存出向 `deps`，不写 `children`。
3. 叶子声明 `types: [{ name, description: {zh,en}, schema }]` 和 `apis`。Schema 使用 JSON Schema 2020-12；API 的 `input` / `output` 只使用 `{ module, name }`；跨类型 `$ref` 只使用 `urn:normify:<module-id>:<type-name>`。Electron channel 使用 `protocol: "ipc"` 与 `path`。容器不得声明 `types` 或 `apis`。
4. 未实现模块使用 `state: "planned"`、`fingerprint: "pending"`，在 `source` 写未来目标文件的仓库相对路径。尚无代码版本时 `revision` 可用 40 位零。根或结构容器可使用 `source: []`；叶子派工需要明确目标文件。
5. 为需要组织的容器设计布局，保留其他模块与布局。先 `normify_graph_validate({ graph })` 修至 0 error，再 `normify_graph_put({ graph, expect_digest })` 提交。

`graph_put` 是破坏性完整替换，不能只传修改的子树。`expect_digest` 必填；发生 `graph/conflict` 时重新读取、核对并合并实际变更，不自动覆盖。局部编辑使用模块 patch/batch/move 工具，仍以全项目 0 error 验收。支持 `dry_run` 的操作在隔离候选中执行并全项目校验；不能只以局部字段合法作为成功标准。

## 实现分工

调用 `normify_work_packet({ ids })` 获取固定架构 `digest`、模块正文、依赖接口和共享类型、`write_paths`、冲突及验收要求。工具按真实源码位置识别重叠，包含 junction 和 Windows 大小写别名。目标文件与未选中叶子重叠时，先修改模块文件边界，或将相关模块交给同一实现任务。

将包交给 PromptManager 现有派工机制。`write_paths` 是分工契约，实际权限来自宿主配置；包不授权文件、不创建 Worker、不修改任务状态。内置 coordinator 的 MCP 和源码角色上限照常执行。实现 Worker 依据包与实际授权实现源码，发现接口需改变时回到设计契约流程。

## 拆分为可独立验证的分支

用户要求并行分支开发时，用 `normify_schema_get` 的 `branch_plan` 定义同一份 BranchPlan；从验收场景划分模块集合，不按接口数或固定模块大小拆分。一个交付单元映射 PromptManager 一个 lead 编排组/分支/worktree，组内 Worker 的写入负责人仍须唯一。

- 指定固定 Git `base_commit`、当前 `graph_digest`、选区 `scope` 和正式 `requirement_ids`。`together` 表达必须共同交付的模块；`normify_branch_plan_suggest` 按此约束及真实源路径重叠给出候选，不猜业务耦合。候选沿用完整 BranchPlan 形态，待补齐项会明确列出。
- 为每个 unit 分配叶子模块和需求，声明具体 `verification.commands`（argv/cwd）及引用命令的验收 `cases`，需要数据库、端口或服务时写隔离资源要求。源码未落地不阻止计划，但声明命令不等于命令已执行。
- 外部依赖逐项选择 `baseline`（源码在固定提交可取）、`contract`（按冻结契约提供测试替身/fixture）或 `after`（等待对应单元）。`unresolved` 阻止保存与交接。`needs` 只表达真实前置成果，不把普通调用箭头直接翻译成实施顺序。
- 读取 `normify_branch_plan_get` 的 CAS digest，修正 `normify_branch_plan_validate` 的诊断，再用 `normify_branch_plan_put` 完整保存；同组约束、文件归属、依赖和需求/验收覆盖均须通过。支持 `dry_run`；计划源、图摘要和候选不可手改绕过检查。
- `normify_branch_packet` 冻结单元契约与验收定义；`normify_branch_plan_export` 投影为宿主已有 WorkerPlan。`lead_ref` 仅是模板引用，宿主须核对正式配置。工具不创建 Git 分支、派发 Worker、授予权限或签发验证证明；这些由 PromptManager 负责。

图变更后重新读取、审查并保存计划；陈旧计划不能导出。外部测试替身支持独立验证，实际集成版本仍需真实依赖对接、独立审查与合流复验。报告要区分静态检查结果、独立分支测试和整体交付证据。

## 开发闭环与维护

- 实现前用 `normify_change_open` 记录意图、涉及模块和字符串验收要求；用 `normify_brief` / `normify_check` 检查影响面与规则。
- 实现后运行 `normify_sync` 检查漂移，维护相关模块、接口、类型和布局；用 `normify_module_refresh({ ids, activate: true })` 刷新证据并激活。缺失源码的计划叶子不能假激活。
- `normify_validate` 必须 0 error，再 `normify_change_close({ id, render: true })` 收尾；核对返回阶段、`revision` 和产物。检查 `rolled_back` 与诊断，不能把失败或取消当作完全未写入。
- `graph_put` 自动编译和渲染；普通 CRUD 后显式 build 再 render。`render/stale-tree` 表示架构源数据摘要变化或未冻结，须重新 build；不得手改 tree 或回执绕过来源核对。
- 双语 `name` / `description` 默认必填。保留合法未连边 API；深度按职责划分，不为固定层数合并模块。增量维护只改受影响内容。
- 交付架构 digest、诊断摘要、HTML 路径和实现验证结果。架构校验通过不等于业务测试通过，实际代码验收仍由 PromptManager 执行。
