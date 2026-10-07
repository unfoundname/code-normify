# Code Normify · PromptManager 架构设计工具

[English](./README_EN.md) · 简体中文

`@promptmanager/code-normify` 0.8.0 是 PromptManager 的本地架构与分支规划工具。先设计模块树、数据类型和接口输入输出，校验后生成可下钻的架构图，再按可独立验证的交付单元划分开发组，为实现 Worker 提供固定版本的契约与目标文件。提供 **43 个工具**、Node.js ESM library 和受管 stdio MCP，运行环境为 **Node.js 20+**。

Normify 负责结构数据、诊断、编译、渲染与静态分支计划；PromptManager 负责真实组身份、角色权限、执行组分支与工作区、原生进程租约、Worker 派工、审查、集成和任务状态。本仓库提供工具边界和接入示例，未修改 PromptManager 或注册新的宿主 IPC 通道。

## 先设计，再实现

1. 调用 `normify_schema_get` 获取当前契约，调用 `normify_graph_get` 读取完整图和 `digest`。
2. 将需求拆成模块树，叶子声明命名数据类型及 API 的 `input` / `output`；用 `state: "planned"`、`fingerprint: "pending"` 和目标 `source.path` 描述尚未实现的代码。保留未修改模块和已分配的 `uid`。
3. 调用 `normify_graph_validate({ graph })` 校验候选。修正所有 error，再用 `normify_graph_put({ graph, expect_digest })` 提交完整图；成功后生成编译产物和 HTML。
4. 用 `normify_branch_plan_suggest` 按显式范围、共同修改约束和文件重叠生成分组候选。编辑同一份 `BranchPlan`，补齐需求覆盖、独立验收、资源隔离和组外依赖策略；经 `normify_branch_plan_validate` 校验后，以 `normify_branch_plan_put({ plan, expect_digest })` 保存。
5. 用 `normify_branch_packet({ unit_id })` 读取固定版本的组交接包，或用 `normify_branch_plan_export({ lead_ref })` 取得 PromptManager 组计划。宿主在已有授权和调度流程中核对计划、配置与权限后创建执行组；组内可有多个 Worker，同一文件保持唯一写入负责人。按模块读取契约仍可使用 `normify_work_packet({ ids })`。
6. 用 `normify_change_open` 记录开发变更；实际执行交付单元声明的验收命令与场景。实现后调用 `normify_module_refresh({ ids, activate: true })`、`normify_validate` 和 `normify_change_close({ id, render: true })`，核对最终诊断、测试证据和代码版本。

已有代码可以通过 `normify_brief`、`normify_sync`、模块 CRUD 和规则工具增量维护。Normify 不写源码，源码由获授权的实现 Worker 修改。结构变更始终经工具提交。

## 统一 JSON 契约

可编辑图只有一种形态：`{ schema_version: 1, modules: Module[], layouts: LayoutData[] }`。只存 `parent` 和出向 `deps`；`children`、API 索引和类型关系由引擎派生。下面的叶子声明计划文件、IPC 接口和两种命名类型，源码尚未存在也可完成设计校验：

```json
{
  "schema_version": 1,
  "modules": [
    {
      "uid": "aabbccdd",
      "id": "app",
      "parent": null,
      "name": { "zh": "应用", "en": "Application" },
      "description": { "zh": "应用模块树。", "en": "Application module tree." },
      "source": [],
      "revision": "0000000000000000000000000000000000000000",
      "updated_at": "2026-10-03T00:00:00.000Z",
      "fingerprint": "pending",
      "state": "planned"
    },
    {
      "uid": "11223344",
      "id": "app.worker",
      "parent": "app",
      "name": { "zh": "任务执行", "en": "Task execution" },
      "description": { "zh": "执行一个任务并返回结果。", "en": "Execute a task and return its result." },
      "source": [{ "path": "src/main/worker.ts" }],
      "revision": "0000000000000000000000000000000000000000",
      "updated_at": "2026-10-03T00:00:00.000Z",
      "fingerprint": "pending",
      "state": "planned",
      "types": [
        {
          "name": "Request",
          "description": { "zh": "任务输入。", "en": "Task input." },
          "schema": {
            "type": "object",
            "properties": { "taskId": { "type": "string", "minLength": 1 } },
            "required": ["taskId"],
            "additionalProperties": false
          }
        },
        {
          "name": "Result",
          "description": { "zh": "任务结果。", "en": "Task result." },
          "schema": {
            "type": "object",
            "properties": { "completed": { "type": "boolean" } },
            "required": ["completed"],
            "additionalProperties": false
          }
        }
      ],
      "apis": [
        {
          "protocol": "ipc",
          "path": "app:execute",
          "description": { "zh": "执行任务。", "en": "Execute a task." },
          "input": { "module": "app.worker", "name": "Request" },
          "output": { "module": "app.worker", "name": "Result" }
        }
      ]
    }
  ],
  "layouts": []
}
```

`types[].schema` 使用 **JSON Schema 2020-12**。跨类型 `$ref` 统一写为 `urn:normify:<module-id>:<type-name>`；API 类型引用统一写为 `{ module, name }`。容器不能声明 `types` 或 `apis`；引用必须指向已声明的类型。`ipc.path` 表示 IPC channel，接口键为 `ipc:app:execute`。`source.path` 是绑定源码仓库内的相对路径；计划态使用未来的目标文件路径。

### 图提交与并发

`normify_graph_put` 是完整替换：没有包含的模块和布局会被删除，MCP 标记为破坏性操作。必须先读取图，并传入读取时的 64 位 SHA-256 `digest`：

```js
const current = await call('normify_graph_get', {})
const candidate = current.graph // 在完整快照上编辑
await call('normify_graph_validate', { graph: candidate })
await call('normify_graph_put', {
  graph: candidate,
  expect_digest: current.digest
})
```

`call` 表示已建立的工具调用接口。digest 覆盖模块、布局、规则和变更源数据；其他 Worker 更新后，旧 digest 提交会报 `graph/conflict`。重新读取并合并实际变更后再提交。候选先校验和编译，通过后才替换当前图；失败返回结构化诊断。受管服务使用项目锁协调进程内和跨进程访问。

受管 CRUD 写操作按快照、执行、全项目校验、提交或回滚处理；违反模块依赖或类型引用等约束时返回 `rolled_back: true`，避免留下不一致的图。支持 `dry_run` 的编辑在隔离候选目录中实际执行并通过 L2 校验，然后清理候选；不会只检查补丁形状就报告预演成功。

`graph_put` 自动 build 和 render；普通 CRUD 修改后显式调用 `normify_build` 再 `normify_render`。编译将架构源数据摘要写入 `tree.json` 的 `project.source_digest` 和 `receipt.json` 的 `source_digest`。渲染核对当前摘要及 tree 的 SHA-256；源数据变化后旧图返回 `render/stale-tree`，回执与 tree 不一致则拒绝渲染。回执的 `artifacts` 只记录 tree、outline 和 api-index 三个产物，不记录回执自身哈希。

### Worker 实现包

`normify_work_packet({ ids: ["app.worker"] })` 返回固定 `digest`、选中模块及正文、外部依赖和共享类型、`write_paths`、文件冲突与验收要求。选中叶子的目标文件与其他未选中叶子重叠时拒绝独立分工；冲突按真实规范化源码位置比较，包括 junction 别名与 Windows 大小写。

`write_paths` 是分工契约，实际源码写权限由 PromptManager 宿主配置。实现包不授予文件权限，不创建 Worker，不改变任务状态，也不替代授权、调度、验收和合并流程。内置 coordinator 的角色上限仍然有效；架构工具应授予允许使用 MCP 的设计或 Worker 实例。

### 按独立交付单元规划组分支

一个交付单元应能在固定 Git 基线上实现、验证并交付。它可以包含多个叶子模块和多个 Worker；PromptManager 当前为每个执行组提供一个 branch/worktree，组内每个文件须有唯一写入负责人。模块与 API 的粒度服务于架构阅读，不直接决定 Worker 数量。

`BranchPlan` 始终使用同一份 JSON 形态，建议候选、编辑、校验和保存都使用它。`normify_schema_get` 返回的 `branch_plan` 是字段契约；计划保存到 `branch-plan.json`。顶层包含 `schema_version: 1`、`id`、双语 `title`、`graph_digest`、`base_commit`、`scope`、`requirement_ids`、`together` 和 `units`：

- `scope` 显式选择模块，可选择容器并展开其非废弃叶子；`units[].modules` 则必须明确列出叶子。范围内每个叶子只归属一个单元且全部覆盖。
- `together` 是必须共同修改的模块集合。共享同一 canonical 文件的模块也必须归入同组，包括不同源码行、junction 别名和 Windows 大小写。与 scope 外模块共享文件时须调整范围或文件边界。
- `graph_digest` 固定架构契约；`base_commit` 必须是绑定仓库可读取的完整 Git commit OID。计划的 CAS `digest` 是 `branch-plan.json` 原始字节的 SHA-256，与图摘要分别管理。缺文件时 `get` 返回 `plan: null` 和空字节摘要。
- `requirement_ids` 记录正式需求，每项至少由一个单元负责，允许多单元共担；每个单元必须有非空需求列表，其验收场景还须覆盖该单元负责的全部需求。
- `verification.commands` 使用 `{ id, argv: string[], cwd }` 声明命令，`cwd` 相对绑定仓库；`cases` 使用 `{ id, description, requirement_ids, command_ids }` 关联场景、需求和命令。命令与场景必须非空。所需数据库、端口、文件目录或服务在 `resources` 中声明 `{ id, kind, description, isolation: "unit" }`，由宿主实现各组隔离；无此类资源时可声明空数组。

`suggest` 只按真实文件重叠和显式 `together` 形成初始分组。它不猜业务语义、需求归属、验收场景或施工顺序，也不从调用图生成 `needs`。可编辑候选生成成功时返回 `ok: true`；空验收、未分配需求及 `unresolved` 依赖会使 `ready: false`，具体缺项在 `readiness.errors` 中列出。硬结构错误仍返回 `ok: false`。必须补全候选才能保存和派工。

每个单元的 `external_dependencies` 为有效组外依赖声明 `{ module, mode, fixture_paths }`。单元继承叶子祖先容器显式声明的 `deps`，容器目标展开到叶子；这些依赖与叶子自身的依赖、API 输入输出及 Schema 类型引用共同构成冻结契约上下文。同组模块从外部集合中排除；这些关系不自动推导 `needs` 或合组：

| `mode` | 独立验证条件 |
| --- | --- |
| `baseline` | 依赖模块的全部源码在固定 `base_commit` 中是可读取的非空文件；`fixture_paths: []`。 |
| `contract` | 使用契约测试替身或 fixture；`fixture_paths` 非空，每个文件属于固定基线或本单元的明确写入范围。 |
| `after` | 必须等待负责该依赖的交付单元，且该单元位于显式 `needs` 前置链中；`fixture_paths: []`。 |
| `unresolved` | 尚未决定验证策略；正式校验、保存和派工包读取均被阻断。 |

例如“投稿发布”和“播放器”互有调用关系，仍可用固定契约与播放器 fixture 独立开发。只有真实实现必须先到位时才声明 `after` 与 `needs`；`needs` 禁止自依赖、引用缺失单元和成环。

```js
const current = await call('normify_branch_plan_get', {})
const suggested = await call('normify_branch_plan_suggest', {
  id: 'video-development',
  title: { zh: '视频交付计划', en: 'Video delivery plan' },
  base_commit: baseCommit, // 绑定仓库中的完整 commit OID。
  scope: ['video.publication', 'video.player'],
  requirement_ids: ['REQ-publish', 'REQ-play'],
  together: []
})
if (!suggested.ok) throw new Error(JSON.stringify(suggested.errors))
const candidate = structuredClone(suggested.plan)
// 编辑 candidate.units：补齐需求、独立命令/场景/资源和全部外部依赖策略。
const checked = await call('normify_branch_plan_validate', { plan: candidate })
if (!checked.ok) throw new Error(JSON.stringify(checked.errors))
await call('normify_branch_plan_put', {
  plan: candidate,
  expect_digest: current.digest
})
```

`put` 与 `delete` 都要求最新计划摘要；冲突返回 `branch/conflict`，须重新读取并核对修改。`dry_run: true` 仅预演，不替换或删除已保存计划。更新架构图后旧计划返回 `branch/graph-drift`，读取组包与导出也会拒绝；应重新确认计划，而非绕过摘要。

`normify_branch_packet({ unit_id })` 返回该单元的模块正文、完整数据/API 契约、组外依赖、`write_paths`、验收声明以及 `base_commit`、`graph_digest`、`plan_digest` 三个固定版本。`normify_branch_plan_export({ lead_ref })` 返回 `worker_plan`，每个单元对应一项 `role: "lead"`；`spec` 为冻结交接包 JSON，`requirementIds` 与 `needs` 对接宿主原有组计划结构。计划标识同时包含逻辑计划 ID 与计划摘要，区分不同版本。

`lead_ref` 只引用宿主的 leader 模板，不代表真实组身份或授权。PromptManager 须核对正式 `WorkerConfiguration`，复用现有分支、worktree、角色、Worker 状态、审查与集成服务。库提供固定设计读取和纯计划投影，不持有运行权限。`validate`、`packet` 和 `export` 的 0 error 只证明声明满足静态契约，工具不会执行验收命令，也不会证明资源隔离或真实集成已通过。

宿主接线时须按包内 `base_commit` 创建工作树，并为 `after` 策略解析、固定和物化前置单元的交付提交。PromptManager 当前已增加 SQL 设计快照、结构化单元引用、固定 Git 输入/候选证明物化和 argv 验收接线；普通人工分工仍使用其原有契约。数据库、服务与命名端口声明的专属绑定和新版原生整链验收仍未完成，不能据静态导出宣称交付通过。

可运行例子位于[源码仓库](https://github.com/unfoundname/code-normify)的 `examples/branch-development/example.mjs`。请在源码仓库中运行，需 Git 与 Node.js 20+；npm 发布包不包含 `examples/` 目录：

```sh
npm run build
node examples/branch-development/example.mjs
```

例子创建临时 Git 基线与计划态图，补全两个独立交付单元并读取组包、导出组计划；打印摘要与保留产物路径。示例以相对路径 `../../lib/service.js` 直接消费本仓库构建产物，无需安装包或建立 `node_modules` 链接，`npm run build` 之后即可从仓库根直接运行。示例中的业务验收命令仅作声明。

## PromptManager 受管 MCP 接入

先在本仓库构建并打包，再将生成的 tarball 安装进目标项目，确保执行组工作区中的 `node_modules/@promptmanager/code-normify/lib/mcp.js` 及依赖可用：

```sh
npm ci
npm run build
npm pack
# 在目标项目安装上一步生成的包，路径按实际文件填写
npm install --save-dev /absolute/path/promptmanager-code-normify-0.8.0.tgz
```

本示例使用本地构建包，不假定包已经发布到 npm。各执行组须通过 PromptManager 既有依赖准备流程获得该包。

PromptManager 配置使用 `mcp_servers`。`command = "node"` 由宿主解析为已安装工具链的固定 Node 可执行文件，`args` 原样传递，进程在执行组工作区启动。不要将 `command` 配成 PATH 里的 `normify-mcp`：当前原生命令契约只解析固定命令名或绝对可执行路径。

```toml
[mcp_servers.normify-design]
command = "node"
args = ["node_modules/@promptmanager/code-normify/lib/mcp.js", "--repo-root", ".", "--data-dir", "normify-architecture", "--access", "write"]

[mcp_servers.normify-read]
command = "node"
args = ["node_modules/@promptmanager/code-normify/lib/mcp.js", "--repo-root", ".", "--data-dir", "normify-architecture", "--access", "read"]
```

CLI 三个参数都必填。相对 `repo-root` 和 `data-dir` 按**宿主启动 cwd**解析为绝对路径，再传入受管服务；绝对路径也支持。使用 `.` 可跟随各执行组的 worktree，避免固定主仓库路径造成源码证据指向错误工作区。数据目录名必须是 `normify-<slug>`。

仅登记服务器不会授予工具。下面是设计实例 `AgentSpec` 的精确 `mcpBindings` 片段；角色、MCP 语义组和原生沙箱授权仍按 PromptManager 的已有配置设置：

```json
{
  "mcpBindings": [
    {
      "serverId": "normify-design",
      "tools": [
        "normify_schema_get",
        "normify_graph_get",
        "normify_graph_validate",
        "normify_graph_put",
        "normify_work_packet",
        "normify_branch_plan_suggest",
        "normify_branch_plan_get",
        "normify_branch_plan_validate",
        "normify_branch_plan_put",
        "normify_branch_plan_delete",
        "normify_branch_packet",
        "normify_branch_plan_export"
      ]
    }
  ]
}
```

只读实例可绑定 `normify-read`，明确列出需要的读取工具：

```json
{
  "mcpBindings": [
    {
      "serverId": "normify-read",
      "tools": ["normify_schema_get", "normify_graph_get", "normify_module_get", "normify_work_packet", "normify_branch_plan_get", "normify_branch_packet", "normify_branch_plan_export"]
    }
  ]
}
```

PromptManager 注入的调用名为 `mcp__normify-design__normify_graph_get` 等；binding 中使用服务器原始工具名。`read` 服务只暴露只读工具；`write` 服务暴露 43 个工具，宿主仍按精确 binding 授权。模型不能通过工具参数覆盖 `project`、`dir` 或 `repoRoot`。源码读取、产物路径和符号链接均受绑定工作区约束。

stdio stdout 仅传 MCP 协议，日志进入 stderr。业务失败保留 `{ ok, errors, warnings, ... }` 结构化结果并设置 MCP `isError`；异常使用 MCP 错误响应。取消只在进入内核前阻止执行，不能用取消推断已开始的写入没有发生。

## Electron 主进程 library 接入

主进程可以消费与 MCP 同一套受管工具，避免第二套校验和文件访问实现：

```ts
import { join } from 'node:path'
import { createPromptManagerTools } from '@promptmanager/code-normify/service'

export async function openArchitectureTools(groupWorkspace: string) {
  const tools = await createPromptManagerTools({
    repoRoot: groupWorkspace,
    dataDir: join(groupWorkspace, 'normify-architecture'),
    access: 'write',
    execution: 'host',
    requireBilingual: true
  })
  return new Map(tools.map(tool => [tool.name, tool]))
}
```

`groupWorkspace` 必须来自宿主已授权的执行组绝对路径。 `execution` 模式必须明确选择 `host` 或 `standalone`；MCP CLI 显式使用 standalone。host 模式的每次调用必须提供 `{ signal, check, readGit }`，缺失任何能力都会拒绝，绝不调用独立 Git。`check(phase)` 的阶段为 `access` 或 `publish`：宿主核对固定 Worker/尝试/需求身份，并在 publish 核对草稿 CAS。取消信号贯穿队列、项目锁等待和 Git，关键 await 后重新检查身份。模型 JSON 不接受这些能力，也不能设置 `repoRoot`、`dataDir`、`dir` 或 `project`。工具提供 `name`、`description`、`behavior`、标准 JSON Schema `parameters` 和 `execute(args, execution)`；结果统一为对象，包含 `ok`、`errors` 和 `warnings`。

宿主可先调用 `readBranchPlanningHead(options, signal, check)` 发现当前计划和两个 digest；接纳时调用 `readBranchPlanningSnapshot(options, {plan_digest, graph_digest}, readGit, signal, check)`。调用方必须提供绑定仓库的只读 Git 端口；读取复用项目锁，在前后核对完整图和计划版本，返回统一 `BranchPlanningSnapshot`（plan、packets 与两个 digest）。等待锁可取消。`projectBranchWorkerPlan(snapshot, leadRef)` 只投影已固定的快照，不重新读文件。PromptManager 将接纳结果保存为不可变 SQL 快照；这些库入口不创建 Worker，也不证明实际交付或验收完成。

图发布仍逐文件替换并在失败时回滚，并非多文件原子提交。宿主编辑应绑定唯一候选目录，成功后由宿主原子 CAS 切换 SQL 草稿头；已接纳的 SQL 设计快照不随候选目录修改而改变。库不持有 SQL 草稿头或正式需求权威。

React 通过 PromptManager 现有主进程 IPC 边界取得只读图数据或预览结果；不要在渲染进程导入本 package、`node:fs` 或自行扫描仓库。宿主接线应复用现有 IPC、角色和任务资源授权机制；本示例没有新增 IPC channel。

## 43 个工具

| 分类 | 工具 |
| --- | --- |
| 完整图与派工契约（5） | `normify_schema_get`、`normify_graph_get`、`normify_graph_validate`、`normify_graph_put`、`normify_work_packet` |
| 分支交付计划（7） | `normify_branch_plan_suggest`、`normify_branch_plan_get`、`normify_branch_plan_validate`、`normify_branch_plan_put`、`normify_branch_plan_delete`、`normify_branch_plan_export`、`normify_branch_packet` |
| 导航与查询（8） | `normify_tree_list`、`normify_module_get`、`normify_module_list`、`normify_search`、`normify_outline`、`normify_deps_find`、`normify_brief`、`normify_help` |
| 项目与模块编辑（7） | `normify_project_init`、`normify_module_upsert`、`normify_module_patch`、`normify_module_batch`、`normify_module_move`、`normify_module_promote`、`normify_module_delete` |
| 证据、同步与校验（5） | `normify_fingerprint`、`normify_sync`、`normify_module_refresh`、`normify_validate`、`normify_check` |
| 架构规则（2） | `normify_policy_get`、`normify_policy_upsert` |
| 开发变更（4） | `normify_change_open`、`normify_change_update`、`normify_change_list`、`normify_change_close` |
| 布局与产物（5） | `normify_layout_get`、`normify_layout_upsert`、`normify_layout_delete`、`normify_build`、`normify_render` |

完整参数以 `normify_schema_get` 和 MCP `tools/list` 为准；工具可通过 `normify_help({ topic: "tool:normify_module_patch" })` 查看参数说明。帮助目录与当前实例的只读或读写权限保持一致。

## 数据与产物

```text
normify-architecture/
├── modules/       模块 Markdown，严格 YAML frontmatter
├── renders/       每层布局 JSON
├── policy.yml     架构规则
├── changes/       开发变更记录
├── branch-plan.json 显式交付单元、验收与组外依赖策略
├── tree.json      编译结构、API、类型契约及布局
├── outline.md     派生大纲
├── api-index.json 派生接口索引
├── receipt.json   产物哈希与校验回执
└── normify.html   可下钻、搜索和切换语言的单文件查看器
```

`graph_get` / `graph_put` 是编辑入口，持久化继续复用现有模块及布局文件。`tree.json` 是编译产物，不作为第二份可写源数据。规则包括依赖方向、禁依赖、无环、深度、跨树和命名。规范详见 [SPEC.zh-CN.md](./docs/SPEC.zh-CN.md)，配套流程见 [normify-gen](./skills/normify-gen/SKILL.md)。

## 开发验证

```sh
npm run check
npx playwright install chromium
npm run test:render
```

验证涵盖原有引擎回归、命名类型与 Schema 引用、完整图 CAS、实现包文件冲突、变更删除闭环、真实 SDK stdio 生命周期、相对启动目录、只读权限、越界拒绝和取消语义。浏览器验证覆盖类型和接口跳转、搜索、完整 Schema、双语及窄屏显示。测试结果不等于已完成 PromptManager 应用内接线。

## 来源与许可

本项目由 [yan-mc/dsh-normify](https://github.com/yan-mc/dsh-normify) 派生，保留原有结构引擎、查看器及 MIT 许可。当前派生仓库为 [unfoundname/code-normify](https://github.com/unfoundname/code-normify)，0.6.0 将宿主入口迁移为 PromptManager 工具 library 与受管 MCP，0.7.0 增加按可独立验证交付单元划分的分支计划，0.8.0 把 `execution`（host/standalone）变成 `createPromptManagerTools` 的必填项并确立宿主执行契约。原作者归属 **Copyright (c) 2026 yan-mc** 见 [LICENSE](./LICENSE)。
