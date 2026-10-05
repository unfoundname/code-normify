# Normify 引擎规范与 PromptManager 0.8 接入契约

> 当前实现：`@promptmanager/code-normify` **0.8.0**，Node.js 20+，43 个工具，ESM library 与受管 stdio MCP。图数据与分支计划的 `schema_version` 仍为 1，不能将软件版本与数据版本混用。
> 本文保留原有模块树、源格式、校验、编译与查看器规范，并补充当前宿主契约。下述 0.8 契约及运行时 `normify_schema_get` 优先于旧引擎文档中的历史描述。原项目由 yan-mc 创建，曾以 DSH 插件交付；从 0.6 起使用 PromptManager library 与受管 MCP，不再使用 Cordis 注入、plugin apply 或 DSH 安装流程。

## 0.8 当前契约

宿主发现当前设计版本使用 `readBranchPlanningHead(options, signal, check)`：返回当前 `plan`（尚无计划时为 `null`）与 `plan_digest`、`graph_digest`，不要求 Git 端口，也不执行接纳；等待项目锁 MUST 可取消。宿主固定设计读取使用 `readBranchPlanningSnapshot(options, { plan_digest, graph_digest }, readGit, signal, check)`：MUST 显式提供绑定仓库的只读 Git 端口及预期 graph/plan digest，MUST 在项目锁内复核读取前后的两个版本。取消等待 MUST 保留其他进程的锁所有权。返回 `BranchPlanningHead` / `BranchPlanningSnapshot` 仅表示静态设计快照；Worker 身份、资源、执行与交付证据仍由宿主持有。

### 设计数据与命名类型

- 可编辑图 MUST 使用 `{ schema_version: 1, modules: Module[], layouts: LayoutData[] }`，复用原有 `modules/` 和 `renders/` 持久化；`tree.json` 只作为编译产物。
- 基本模块保留原有九个必填字段。叶子 MAY 声明 `types: [{ name, description: {zh,en}, schema }]`；`schema` MUST 使用 JSON Schema 2020-12。容器（包括始终为容器的根）MUST NOT 声明 `types` 或 `apis`。
- API 增加 `ipc` 协议，`path` 为 Electron IPC channel；可选 `input` / `output` MUST 使用 `{ module, name }` 引用已声明类型。命名类型跨 Schema 的 `$ref` MUST 使用 `urn:normify:<module-id>:<type-name>`；本地 `#` 引用保留 JSON Schema 语义。
- 设计先于实现：计划模块使用 `state: planned`、`fingerprint: pending` 和未来目标 `source.path`。源码尚未存在时仍可校验设计；激活计划叶子前 MUST 实现其源码证据。结构容器可用 `source: []`，派工叶子 SHOULD 明确目标文件。
- 统一结果 MUST 为对象，包含 `ok: boolean`、`errors: Diagnostic[]` 和 `warnings: Diagnostic[]`；业务字段按工具追加。不得混用字符串错误与诊断对象。

### 完整图事务与分工契约

- `normify_graph_get` 返回完整 `graph` 与 64 位 SHA-256 `digest`；digest 覆盖模块、布局、规则和变更源数据。
- `normify_graph_validate({ graph })` 校验候选而不替换当前图。`normify_graph_put({ graph, expect_digest })` MUST 提供读取时的 digest；不匹配报 `graph/conflict`。
- `graph_put` 是破坏性完整替换，未包含模块及布局会删除；候选先校验、编译，通过后替换并生成 HTML。MUST NOT 将局部子树当成完整图提交。
- 受管服务使用项目锁协调进程内和跨进程访问。非只读 CRUD 操作执行后须全项目校验；失败恢复快照并返回 `rolled_back: true`，避免悬空依赖与类型引用。
- 支持 `dry_run` 的编辑 MUST 在隔离候选目录中实际执行并通过 L2 校验，再清理候选；不能只校验字段形状即报告成功。
- `normify_work_packet({ ids })` 返回固定 digest、模块正文、依赖接口和共享类型、目标 `write_paths`、文件冲突与验收要求；文件与未选中叶子重叠时拒绝独立分工。
- 文件责任冲突 MUST 比较真实规范化源码位置，包含 junction 别名和 Windows 大小写，而非仅比较传入路径字符串。
- `write_paths` 是分工契约，MUST NOT 当作宿主文件授权。包不创建 Worker、不调度、不改变任务状态；这些行为由 PromptManager 既有内核负责。内置 coordinator 的角色上限保持有效。

### 分支交付契约

分支划分 MUST 以“在固定基线上可独立实现、验证并交付”的单元为目标。一个单元 MAY 包含多个叶子模块；PromptManager 为一个执行组提供一个 branch/worktree，组内 MAY 分给多个 Worker，但一个文件 MUST 有唯一写入负责人。模块导航树、软件调用图、交付单元和组内 Worker 分工是不同契约，MUST NOT 默认每个接口一个 Worker，或自动把调用箭头转成实施前置条件。

分支计划 MUST 使用唯一 `BranchPlan` 形态，候选、编辑、校验、保存与读取均不得另造别名结构。`normify_schema_get` MUST 返回完整 `branch_plan` JSON Schema。持久化文件为绑定结构目录内的 `branch-plan.json`；文件中不得保存真实 Worker 身份、授权或运行状态。

| BranchPlan 字段 | 契约 |
| --- | --- |
| `schema_version` | 固定为整数 `1`。 |
| `id`、`title` | 逻辑计划 ID 与 `{ zh, en }` 双语标题。 |
| `graph_digest` | 冻结的 64 位 SHA-256 架构摘要，MUST 与当前图一致。 |
| `base_commit` | 绑定仓库内可读取的完整 Git commit OID，支持 40 或 64 位；不得用移动的 `HEAD` 或分支名。 |
| `scope` | 非空模块 ID 数组；容器展开为非废弃叶子，构成完整且显式的工作范围。 |
| `requirement_ids` | 正式需求 ID 数组，ID 为非空字符串；需求可以由多个单元共担。 |
| `together` | 二维模块 ID 数组，每项至少两个模块；展开后的叶子必须在 scope 内且归入同一单元。 |
| `units` | 非空 BranchUnit 数组；ID 唯一，scope 中每个叶子恰有一个 owner。 |

BranchUnit MUST 包含 `id`、双语 `title`、`modules`、`requirement_ids`、`needs`、`external_dependencies` 与 `verification`。其中 `modules` MUST 明确列出非废弃叶子，不能以容器替代；不能重复分配、遗漏或超出 scope。正式计划每单元 MUST 负责至少一项需求，计划需求 MUST 全部被覆盖。

文件归属 MUST 从模块 `source` 派生，不能另存可漂移的写入清单。范围内叶子 MUST 有目标源码文件；真实规范化位置重叠的叶子 MUST 同组，包括同文件不同源码行、junction 别名和 Windows 大小写。共享文件还属于 scope 外叶子时 MUST 拒绝独立交付，要求调整 scope 或重新划分文件边界。同组共享文件仍由宿主的组内分工确定唯一写入负责人。

独立验收 MUST 明确声明：

```ts
verification: {
  commands: { id: string; argv: string[]; cwd: string }[];
  cases: {
    id: string;
    description: string;
    requirement_ids: string[];
    command_ids: string[];
  }[];
  resources: {
    id: string;
    kind: 'database' | 'port' | 'filesystem' | 'service';
    description: string;
    isolation: 'unit';
  }[];
}
```

- `commands` 和 `cases` MUST 非空；各集合中的 ID MUST 唯一。命令使用 argv 数组，MUST NOT 用一个 shell 字符串代替。`cwd` 是绑定仓库内相对目录，可为 `.`。
- 场景引用的 command ID MUST 存在；场景需求 MUST 属于该单元；单元负责的需求 MUST 全部有场景覆盖。
- 数据库、端口、文件目录、服务等依赖资源 MUST 声明 `isolation: unit`，并在 description 说明隔离方式；无此类资源时 MAY 用空数组。声明只描述所需隔离，实际分配与验证由宿主持有。
- 工具只静态检查这些声明，不执行命令。MUST 明确区分静态 0 error、真实验收成功及宿主集成完成。

每个有效组外依赖 MUST 使用 `{ module, mode, fixture_paths }` 声明且恰好一次，不允许遗漏或声明无关模块。单元 MUST 继承叶子祖先容器显式声明的 `deps`，将容器目标展开到叶子；这些依赖与叶子自身的出向依赖、API 输入输出和 Schema 类型引用共同形成冻结契约上下文。同组选中的模块 MUST 从外部集合排除。有效依赖统一用于策略校验和 packet 上下文，MUST NOT 自动推导 `needs` 或自动合组。

| mode | 校验要求 |
| --- | --- |
| `baseline` | 模块的全部 source 在固定 base_commit 中是可读取的非空常规文件；fixture_paths MUST 为空。 |
| `contract` | fixture_paths MUST 非空；测试替身或 fixture 的每个文件 MUST 在固定基线中存在，或属于本单元的 canonical 写入范围。 |
| `after` | 依赖有负责单元，且该单元 MUST 在本单元显式 needs 的前置链中；fixture_paths MUST 为空。 |
| `unresolved` | 候选允许保留；正式校验、保存、交接包与导出 MUST 拒绝。 |

`needs` 只描述真实实施前置条件，MUST 显式给出交付单元 ID。自依赖、缺失单元和环 MUST 拒绝。运行时调用某接口不自动产生 `needs`；固定基线或可用契约 fixture 能支持独立验收时，可并行实施。

`normify_branch_plan_suggest({ id, title, base_commit, scope, requirement_ids, together })` 的字段全部必填。建议只根据 canonical 源文件重叠与 together 的连通分量分组，MUST NOT 猜需求分配、业务耦合、验收命令或实施 DAG。生成可编辑候选返回 `ok: true`；未完成语义检查返回 `ready: false` 与 `readiness.errors`，并记录候选未就绪 warning。硬结构错误仍返回 `ok: false`。空验收、空单元需求与 unresolved 使用正式计划同一形态，必须由设计实例补齐。

`normify_branch_plan_get()` 返回 `plan` 与独立 `digest`：摘要按 branch-plan.json 原始字节计算；缺文件返回 `plan: null` 和空字节的 SHA-256。`normify_branch_plan_validate({ plan })` 不替换已保存计划。`put({ plan, expect_digest, dry_run? })` 校验通过后完整替换计划；`delete({ expect_digest, dry_run? })` 删除该版本计划。写删操作 MUST 使用最新计划摘要并遵守受管项目锁，冲突报 `branch/conflict`。dry_run MUST 不改变已保存计划。

计划 digest 与 graph_digest MUST 分别管理；计划编辑不会改变架构源摘要。任何图摘要漂移 MUST 报 `branch/graph-drift`，包括读取 packet 与 export；设计实例须读取当前图，重新核对范围、契约、分组与验收后更新计划，MUST NOT 自动换摘要后声称重新验证完成。

`normify_branch_packet({ unit_id })` MUST 对已保存完整计划重跑静态校验，再返回 `packet`：

```ts
{
  unit: BranchUnit;
  base_commit: string;
  graph_digest: string;
  plan_digest: string;
  modules: Module[];
  context: { id: string; body: string }[];
  dependencies: Module[];
  write_paths: string[];
  acceptance: string[];
}
```

unit 包含验收、needs 和 external_dependencies；模块正文、接口和命名类型均沿用现有 work packet 投影。包的三份固定版本与目标文件是交接契约，MUST NOT 充当宿主授权或真实验收证据。

`normify_branch_plan_export({ lead_ref })` 只输出匹配 PromptManager WorkerPlan 的静态组计划：

```ts
{
  ok, errors, warnings,
  plan_digest, graph_digest, base_commit,
  worker_plan: {
    id,
    items: [{
      key: unit.id,
      title: unit.title.zh,
      spec: JSON.stringify(packet),
      requirementIds: unit.requirement_ids,
      role: 'lead',
      ref: lead_ref,
      needs: unit.needs
    }]
  }
}
```

每单元只导出一个 lead 项；WorkerPlan ID MUST 区分逻辑计划及其固定摘要。`lead_ref` 只表示模板引用，MUST NOT 声称已取得真实组身份、角色或文件权限。宿主 MUST 核对正式 WorkerConfiguration，复用已有分支/worktree 创建、组内 Worker 分工、状态、审查与集成服务。本次不修改 PromptManager 源码；静态适配器通过不代表应用内端到端接线已完成。

宿主 MUST 按包内 `base_commit` 创建工作树，并为 `after` 解析、固定和物化前置单元的交付提交。当前 PromptManager 普通 lead 工作树从 `main` 取得基线，`needs` 只等待任务完成；宿主须接通上述语义后才能声称冻结契约在执行层生效。

实际可运行示例位于[源码仓库](https://github.com/wishbreeze/code-normify)的 `examples/branch-development/example.mjs`，须在源码 checkout 中运行，并具备 Git 与 Node.js 20+；npm 发布包不包含 `examples/` 目录。它用临时 Git 仓库固定基线、通过受管工具保存计划态图与完整计划，再读取交接包和导出静态组计划；业务验收命令保持声明状态。

### 宿主与 MCP

- `createPromptManagerTools({ repoRoot, dataDir, access, execution, requireBilingual? })` 位于 package 的 `./service` ESM 导出。library 的两个目录 MUST 为宿主提供的绝对路径，`access` MUST 显式为 `read` 或 `write`，`execution` MUST 显式配置为 `host` 或 `standalone`；缺失或取值非法 MUST 以 `workspace/config` 拒绝，不得留默认值。
- CLI MUST 显式接收 `--repo-root <path> --data-dir <path> --access <read|write>`。相对路径统一按 `process.cwd()`（宿主启动 cwd）解析为绝对路径，再交给服务；不缺省路径或权限。stdio 服务 MUST 固定以 `execution: 'standalone'` 构造（使用库内置只读 Git 端口），MUST NOT 经命令行接收 `signal`/`check`/`readGit` 等宿主能力；`host` 模式只能由宿主在进程内以 library 直接使用。
- 一个服务实例只绑定一个源码仓库与结构数据目录。`project`、`dir`、`repoRoot`、`dataDir` 与项目枚举的 `root` MUST 从模型可见的参数 Schema 中移除；模型参数出现这些键 MUST 以 `workspace/binding-fixed` 拒绝。`signal`、`check`、`readGit` MUST NOT 出现在工具 JSON Schema 或模型参数中。结构目录 MUST 名为 `normify-<slug>`；读取源码、渲染输出和符号链接均受工作区约束。
- `read` 只暴露 read 工具；`write` 暴露 43 个工具。PromptManager 的 `mcpBindings: [{ serverId, tools: [...] }]` MUST 精确授权工具，不能因登记服务器获得整台服务器的能力。
- PromptManager 的 `command: "node"` 解析到安装工具链；静态 `args` 在执行组工作区使用。推荐 `--repo-root . --data-dir normify-architecture`，以跟随各组 worktree。主仓库绝对路径不可代表其他执行组。
- stdout MUST 仅传 stdio MCP 协议；日志到 stderr。业务失败映射 `isError` 并保留 structuredContent；异常映射 MCP 错误。MCP 协议取消 MUST 在进入内核前阻止执行；宿主执行信号另按「宿主执行契约（execution）」贯穿队列、项目锁等待与 Git。任何取消都不能据此声称已开始的操作未落盘。
- Electron 主进程消费统一 service；React 经现有 IPC 边界取得只读图数据，MUST NOT 直接导入 Node 文件系统或在渲染进程读写仓库。本仓库未注册 PromptManager IPC channel。

### 宿主执行契约（execution）

- 每个受管工具 MUST 暴露 `execute(args, execution)`：`args` 为模型 JSON，`execution` 只由宿主在进程内传入，MUST NOT 出现在工具 JSON Schema 或模型参数中。
- `host` 模式：每次调用 MUST 提供 `{ signal, check, readGit }`；缺失任一能力 MUST 以 `workspace/execution-required` 拒绝，MUST NOT 退化为库内置 Git。`signal` MUST 为 `AbortSignal`；`check(phase)` 的 `phase` 为 `'access'` 或 `'publish'`。
- `check(phase)` 两阶段：`access` MUST 在取项目锁、读文件与读 Git 前后核对固定的 Worker/尝试/需求身份；`publish` MUST 在写边界提交前再次核对，宿主据此核对草稿 CAS。一次 `access` 通过 MUST NOT 被当作 `publish` 仍然有效的依据。
- `readGit` MUST 为绑定仓库的固定只读 Git 端口：库只以绑定的 `repoRoot` 调用它，传入其他根 MUST 以 `workspace/binding-fixed` 拒绝；`host` 模式下库 MUST NOT 自行 spawn Git。
- 取消 MUST 贯穿串行队列、项目锁等待与 Git；每个关键 await 之后 MUST 用同一 `execution` 重新核对身份，撤权 MUST NOT 被降级成坏 OID 或"Git 缺失"之类的普通诊断。
- `standalone` 模式 MAY 使用库内置只读 Git 端口（`git --no-replace-objects` 加固定超时），仅用于 CLI 与独立示例；它 MUST NOT 声称拥有宿主身份、草稿 CAS 或真实执行组授权。
- `readBranchPlanningHead` / `readBranchPlanningSnapshot` 同受本节约束：前者 MUST NOT 读取 Git，后者 MUST 使用宿主提供的 `readGit`；两者都 MUST 在项目锁内复核版本，等待锁 MUST 可取消且 MUST 保留其他进程的锁所有权。

### 编译来源与渲染校验

- 架构源数据摘要 MUST 写入 `tree.project.source_digest` 和 `receipt.source_digest`。摘要只覆盖模块、布局、规则及变更源数据，不能把派生产物反过来当作源数据。
- 渲染 MUST 同时核对当前源摘要、tree 的 SHA-256 和编译回执。源摘要不同报 `render/stale-tree`，缺失或损坏回执、tree 被修改也必须拒绝；要求重新 `normify_build`。
- `graph_put` 自动 build/render；普通 CRUD 后显式 build/render。
- 回执 `artifacts` MUST 只记录 `tree.json`、`outline.md` 和 `api-index.json` 三个产物的哈希和字节数，不加入回执自身 SHA-256。

完整 JSON、实际 MCP 配置与 43 工具分类见 [README](../README.md)。

---

## 0. 文档性质与决策落地

### 0.1 文档性质

本文档是 Normify 的**正式规范**，是 M0 起的实现依据。规范用语遵循 RFC 2119：

- **MUST / MUST NOT**：强制要求（违反即校验 error 或实现缺陷）；
- **SHOULD / SHOULD NOT**：强烈建议（违反记 warning 或需说明理由）；
- **MAY**：可选能力。

### 0.2 决策落地表（草案 §11 十项开放问题的最终决定）

| # | 问题 | 最终决定 | 规范章节 |
|---|---|---|---|
| 1 | 命名 | **Normify**；包名 `@promptmanager/code-normify`；技能名 `normify-gen`；工具前缀 `normify_*` | §8 |
| 2 | 渲染器形态 | 引擎产出单文件 HTML；PromptManager 通过既有主进程与预览边界读取产物，避免另写图引擎 | §7.1 |
| 3 | 当前层导出 | **v1 不含**；渲染器稳定后以 v2 特性加入 | §7.7、§9 |
| 4 | 展开交互 | 未展开：只显示名称；**悬停：显示介绍（tooltip）**；点击：进入子层，层头显示本模块**名称 + 介绍**，主体为子模块图；正文 body v1 仍不消费 | §7.2 |
| 5 | `deps.kind` 枚举 | 定稿 `call | event | dataflow | reference`；**新增枚举值向后兼容**（老数据不受影响），扩枚举 = 校验器/渲染器各改一处常量表，属小改动 | §5.4、§11 |
| 6 | 多仓库/多树 | **v1 数据模型原生支持多树**（MC 多模组互调等场景必须）：树 = 一个 `parent: null` 的单段 id 根模块；跨树箭头 = 普通 `deps`，零新语法 | §2.5、§7.4 |
| 7 | 结构数据目录 | 固定 `normify-<项目slug>/`；由宿主显式绑定，CLI 相对路径按执行组启动 cwd 解析 | §3.1 |
| 8 | 双语强制 | 默认 error（MUST）；library 可显式配置 `requireBilingual: false` | §5.5 |
| 9 | fingerprint 成本 | v1 全量哈希，不做采样优化 | §5.2 |
| 10 | 回执消费 | HTML 页脚仅**摘要**（构建时间/模块数/API 数/哈希前 12 位）；完整回执只落 `receipt.json` | §4.3 |

---

## 1. 概述

### 1.1 定位

Normify 把一个项目（或**多个互相调用的项目**，如一组 MC 模组）描述为**若干棵由结构完全相同的基本模块递归堆叠而成的分形树**：

- 顶层（树根层）= 项目骨架；
- 点开任意模块 = 看到它内部更精细的一张同构"子流程图"；
- 叶子模块 = 单一功能单元，承载该功能的全部 API 与双语简介；
- 依赖箭头可**跨子树、跨树**，记录真实调用/数据关系；
- AI 沿 id 路径逐层定位、增量维护；人通过可点击下钻的 HTML 阅读。

### 1.2 目标（v1）

1. 严格的模块结构数据规范 + 零容忍校验器；
2. PromptManager 设计实例：需求与已有仓库 → 计划态架构契约 → 可独立验证的交付单元 → 固定组交接包与宿主组计划 → 增量维护；
3. 渲染器：编译产物 → 单文件交互式 HTML（下钻、悬停介绍、深链接、语言切换、多树）；
4. 完整闭环：代码变更 → 增量重建子树 → 校验 → 编译 → 渲染。

### 1.3 非目标（v1）

- 不修改、不生成源码；不做通用图布局引擎；不做机器翻译；
- 不做多用户协作/权限；不发明新文件格式；
- **不做 client UI 面板与多平台适配**；不含当前层 PNG/SVG 导出。

---

## 2. 核心数据模型

### 2.1 唯一元素：模块（Module）

整个数据库由无数个结构完全相同的模块构成。模块 = YAML frontmatter（机器读）+ Markdown 正文（人读，可选）。

### 2.2 模块字段规范

| 字段 | 类型 | 必填 | 约束（MUST） |
|---|---|---|---|
| `uid` | string | ✅ | 8 位小写 hex；全项目（跨树）唯一；重命名/移动不变 |
| `id` | string | ✅ | 路径式：段 `[a-z0-9][a-z0-9-]*`，`.` 分隔；首段 = 树名（treeId）；无固定段数上限，总长度 ≤4096；全项目唯一 |
| `parent` | string 或 null | ✅ | 唯一存储的结构引用；**MUST 等于 id 去掉最后一段**；根（单段 id）MUST 为 `null` |
| `name` | `{zh, en}` | ✅ | 各 ≤ 60 字符，均非空 |
| `description` | `{zh, en}` | ✅ | 各 ≤ 500 字符，均非空 |
| `source` | array of `{path, line?, end_line?}` | ✅ | repo 相对 POSIX 路径（正斜杠，禁 `..`/`/` 绝对/`\`）；根模块允许 `source: []`（记 notice） |
| `revision` | string | ✅ | 40 位 git SHA（生成时仓库提交） |
| `updated_at` | string | ✅ | ISO 8601 |
| `fingerprint` | string | ✅ | `source` 的确定性指纹（v1 全量哈希）：按 `source.path` 升序，逐个 `update(UTF-8(path)) + update(0x00) + update(文件字节)` 后取 SHA-256；用 `normify_fingerprint` 计算 |
| `state` | string | 可选 | `active`（默认）、`planned`（计划态）、`deprecated`（废弃）；planned 允许 `source` 未落地且 `fingerprint: pending` |
| `replacement` | string | 可选 | 仅 `state: deprecated`：替代模块 id（必须存在） |
| `tags` | string[] | 可选 | ≤12 个自由标签，用于检索/分组/开发指引 |
| `apis` | array | 叶子必填 | **只允许叶子持有**；根模块 MUST NOT 有 `apis` |
| `types` | array | 可选 | **只允许叶子持有**；每项为命名 JSON Schema 2020-12 数据契约，名称在模块内唯一 |
| `deps` | array | 可选 | 出向依赖箭头，**只在源端存储** |

### 2.3 API 条目

```yaml
apis:
  - protocol: http            # http | ws | rpc | ipc | amqp | kafka | mysql | redis | file | grpc | graphql
    method: POST              # 仅 http 必须；其余 MUST NOT 出现
    path: /api/v1/orders/{order_id}/pay   # URL 路径或 topic/队列名/表名
    description:
      zh: 发起支付请求。
      en: Initiates a payment for an order.
```

- **API 键（key）**：http 类为 `METHOD path`（METHOD 大写）；其余为 `protocol:path`。全项目唯一。
- **未接任何箭头的 API 完全合法**：不产生任何诊断（含 warning）。API 的存在性独立于边。

### 2.4 两类边

| 边 | 表达 | 存储 | 约束 |
|---|---|---|---|
| **containment**（父子） | `parent` | 每模块自存 parent | 每棵树恰好一个根；无环；`parent == derive(id)` |
| **dependency**（箭头） | `deps` 数组 | 只存源端 | 目标存在（可跨树）；可指向模块或目标模块的 API |

```yaml
deps:
  - kind: call                # call | event | dataflow | reference
    to: demo.order.checkout.invoice     # 目标模块 id（MUST 存在，可跨树）
    from_api: POST /api/v1/orders/{order_id}/pay   # MAY：本模块 API（仅叶子可用）
    to_api: POST /internal/invoices                  # MAY：目标模块自身 API
    label: { zh: 开票, en: Create invoice }          # MAY：各 ≤ 30 字符
```

- MUST：`to != id`（禁自环）；`(from_api?, to, to_api?, kind)` 组合不重复；
- MUST：`from_api` 为本模块 API（非叶子禁用）；`to_api` 为目标模块自身 API。

### 2.5 树与多树（v1 原生支持）

- **树 = 以某个单段 id 的根模块为顶的整棵子树**。树名（treeId）= 根模块 id。
- 多树 = 存在多个 `parent: null` 的根（MUST ≥ 1）。每棵树的根各自在 frontmatter 声明 `repository`（该树对应仓库的 URL，展示/跳转用）。
- **跨树箭头 = 普通 `deps`**：`to` 直接引用另一棵树的模块 id 或 API。**零新语法**，单树场景完全无感。
- 典型场景：一组互相调用的 MC 模组 = 每个模组一棵树 + 若干跨树箭头。

### 2.6 叶子规则

- **叶子 = 没有任何模块以它为 parent**（索引导出；不存 `children`、不存 `is_leaf`）。
- 叶子 MUST 有 `apis`（空数组 → warning"无接口的功能单元"）。
- 非叶子与根 MUST NOT 出现 `apis` 键。
- 叶子晋升容器：由工具迁移 `x.md` → `x/index.md` 并重写子级 parent（§6.4）。

---

## 3. 源格式规范

### 3.1 目录约定

- 结构数据目录 MUST 名为 `normify-<项目slug>/`，由宿主显式绑定；CLI 相对路径按宿主启动 cwd 解析。
- 单项目对话多项目时 = 多个 `normify-*` 目录并存，互不干扰。

### 3.2 文件布局（目录树 = 模块树；多树 = 多棵子树）

```
normify-demo-repo/               # 结构数据目录（工作目录下）
├── modules/
│   ├── demo/                    # 树 1（treeId: demo）
│   │   ├── index.md             # 根模块（id: demo，parent: null）
│   │   ├── auth.md              # 叶子（id: demo.auth）
│   │   └── order/
│   │       ├── index.md         # 容器（id: demo.order）
│   │       └── checkout/
│   │           ├── index.md     # 容器（id: demo.order.checkout）
│   │           └── payment.md   # 叶子（id: demo.order.checkout.payment）
│   └── helper-lib/              # 树 2（treeId: helper-lib，被 demo 跨树调用）
│       ├── index.md
│       └── utils.md
├── policy.yml                   # 架构规则（项目创建时自动安装；normify_validate 强制执行）
├── changes/                     # 开发变更日志（每次任务一份 JSON，随结构目录回档）
│   └── 2026-09-12-add-feature.json
├── branch-plan.json             # 显式范围、组划分、需求覆盖、验收与组外依赖策略
├── renders/                     # 渲染数据集（仅容器模块；与 modules/ 一一对应）
│   ├── demo.json                # 根 demo 层的排布（mode/order/groups/reading/edge_hints）
│   └── demo/order.json          # demo.order 层
├── outline.md                   # 派生：全项目索引（AI 导航入口）
├── tree.json                    # 编译产物（渲染器唯一输入）
├── api-index.json               # 派生：API key → 模块 id 反查表
└── receipt.json                 # 派生：构建回执
```

- 容器模块文件 = `<最后一段>/index.md`；叶子 = `<最后一段>.md`。
- 映射规则：`id = (modules/ 下相对路径，去文件名，/ → .)`；根文件 `<treeId>/index.md` 的 id = `treeId`（唯一例外）。
- id 段数无固定上限；总长度 ≤4096，如需限制深度应显式配置 policy。

### 3.6 渲染数据集（renders/，v0.3）

结构数据描述“是什么”，渲染数据描述“这一层怎么画”，两者并行且同步维护：

- **只存在于容器模块**（有子模块的模块）；叶子没有子层，不需要渲染数据。
- 文件路径：`renders/<id 的点号换斜杠>.json`，与容器模块一一对应：
  `renders/demo.json`、`renders/demo/order.json`、`renders/demo/order/checkout.json`。
- 字段（JSON，`normify_layout_upsert` 写时校验并补 `schema_version/id/updated_at`）：

| 字段 | 约束 |
|---|---|
| `mode` | `auto` / `groups` / `layers` / `grid`（可选，默认 auto） |
| `max_columns` | 1..6 整数（可选） |
| `order` | 直接子模块 id 数组，不重复；未列出的按启发式追加（warning） |
| `groups` | `[{id, title:{zh,en}, children:[...]}]`；children 必须是直接子模块且不重复、不跨组 |
| `reading` | `{zh,en}` 非空双语，显示在图上方 |
| `edge_hints` | `[{from,to,kind?,lane?,style?,bundle?,priority?}]`；from/to 必须是直接子模块且存在对应 `deps` 边 |
| `schema_version` | 1 |

- 校验：`layout/orphan`（无对应模块）、`layout/not-container`（叶子不该有）、`layout/order-child`、`layout/group-child`、`layout/hint-edge-missing` 等为 error；`layout/missing`（容器缺渲染数据）为 warning。
- 编译：渲染数据编入 `tree.json.layouts`；`normify_render` 的查看器在点开任意模块时，结构数据 + 该层渲染数据一起消费。

### 3.3 frontmatter 严格 YAML 子集

只允许：普通标量、`{zh, en}` 内联映射、数组、`>` 折叠块、双引号字符串。**禁用**：锚点/别名（`&`/`*`）、`|` 块、复杂 flow、TAB 缩进、非 UTF-8。解析失败 = error，报告精确行号。

### 3.4 正文（body）

- 每个模块文件 SHOULD 有正文：给人类读者的展开介绍（可含图/表/链接），与 frontmatter 介绍一致但可更详细。
- v1 渲染器 MUST NOT 消费正文（仅人用编辑器/仓库阅读）。

### 3.5 完整示例模块文件

`modules/demo/order/checkout/payment.md`（treeId = `demo`，id = `demo.order.checkout.payment`）：

````markdown
---
uid: 8f3a9c2e
id: demo.order.checkout.payment
parent: demo.order.checkout
revision: 9f1a1cf0b6e9e2a3d4c5b6a7f8e9d0c1b2a3f4e5
updated_at: 2026-08-30T12:00:00Z
fingerprint: e3b0c44298fc1c149afbf4c8996fb924
source:
  - path: src/order/checkout/payment.ts
    line: 12
    end_line: 340
name:
  zh: 支付
  en: Payment
description:
  zh: >
    负责订单支付：对接支付渠道、处理回调、维护支付状态机，
    并向发票模块发起开票请求。
  en: >
    Handles order payment: channel integration, callback processing,
    payment state machine, and invoice requests.
apis:
  - protocol: http
    method: POST
    path: /api/v1/orders/{order_id}/pay
    description:
      zh: 发起支付请求。
      en: Initiates a payment for an order.
  - protocol: kafka
    path: payment.completed
    description:
      zh: 支付完成后发布的事件。
      en: Event published after a successful payment.
deps:
  - kind: call
    to: demo.order.checkout.invoice
    from_api: POST /api/v1/orders/{order_id}/pay
    to_api: POST /internal/invoices
    label: { zh: 开票, en: Create invoice }
  - kind: call
    to: helper-lib.utils
    from_api: POST /api/v1/orders/{order_id}/pay
    to_api: rpc:format_amount
    label: { zh: 金额格式化, en: Format amount }
---

# 支付模块

（正文 = 给人类读者的展开介绍，可含图、表、链接；v1 渲染器不消费。）
````

---

### 3.7 模块生命周期与计划态（v0.4）

- `state` 可选，缺省 = `active`；序列化时 active 不落盘（旧数据零差异）。
- **planned（计划态）**：先建树、后实现。`source` 可指向尚未落地的文件；`fingerprint` 允许 `pending`（仅 planned 或空 source 模块）。
  - `normify_validate` 对 planned 的未落地 source 记 warning（不阻断）；active 的缺失/漂移仍为 error。
  - 实现后用 `normify_module_refresh({ ids, activate: true, repoRoot })`：重算指纹与 revision、转 active；源码未落地时 activate 报 error（禁止假激活）。
  - 容器/根模块没有 source：子树全部落地后同一次 refresh 会激活（fingerprint 保持 pending）。
- **deprecated**：可带 `replacement`；指向 deprecated 的 `deps` 记 `deprecation/inbound` warning，`replacement` 不存在为 error。

### 3.8 架构规则 policy.yml（v0.4）

- 位置：结构数据目录根 `policy.yml`；项目创建（`resolveProject(create)`）时自动安装默认模板（含 `core-acyclic` 与“禁止指向废弃模块”警告 + 全部规则类型的注释示例）。
- 规则类型（severity 默认 `error`，可 `warning`；`enabled: false` 可临时停用）：

| 类型 | 字段 | 语义 |
|---|---|---|
| `forbid-dependency` | `from[]/to[]`（id 模式，`*` 单段、`**` 任意段）、`kind[]?`、`fromState?/toState?` | 禁止匹配的依赖 |
| `dependency-direction` | `layers[{name,match[]}]`、`allowSameLayer?`、`allowBackward?` | 层顺序即允许方向 |
| `acyclic` | `scope[]?`、`includeCrossTree?` | 依赖图无环 |
| `max-depth` | `maxDepth(1..12)`、`scope[]?` | id 段数上限 |
| `cross-tree` | `mode: forbid / allow / require-to-api` | 跨树依赖策略（require 时必须写 `to_api`） |
| `naming` | `pattern`（正则）、`scope[]?` | 作用域内 id 段的命名约束 |

- 执行：`normify_validate` 产出 `policy/<rule-id>` 诊断（error 阻断 build）；`normify_check` 在动手前对“拟建模块 + 拟加依赖”做同样的模拟校验。
- 工具：`normify_policy_get`（读取/模板/参考）、`normify_policy_upsert`（安装/覆盖，dry_run 可预检）。

### 3.9 开发变更日志 changes/（v0.4）

每个开发任务一份 `changes/<YYYY-MM-DD-slug>.json`，随结构目录一起回档：

```json
{
  "schema_version": 1,
  "id": "2026-09-12-add-feature",
  "title": { "zh": "新增功能", "en": "Add feature" },
  "status": "in_progress",
  "intent": { "zh": "意图与背景", "en": "Intent" },
  "modules": { "create": ["demo.new"], "modify": ["demo.core"], "delete": [], "api_add": [], "api_remove": [] },
  "acceptance": ["validate 0 error"],
  "revision": { "before": null, "after": null },
  "created_at": "…", "updated_at": "…", "closed_at": null
}
```

- 工具：`normify_change_open/update/list/close`；`close` 流程 = 刷新 create/modify 指纹并激活 planned → `validate` **0 error 强制** → `build`（可选 render）→ 标记 `verified` + `revision.after`；任何一步失败都不关闭。
- L2 校验：变更引用的模块必须存在（计划态允许）；`change/module-missing`、`change/create-not-landed` 等为 error；多个 in_progress 记 warning。

### 3.10 历史宿主提醒钩子

0.5 及以前的 DSH 插件曾使用 `tools/post-execute` 和 `devCompanionReminder` 提醒同步。0.6 已移除该宿主钩子与 Cordis patch；维护流程通过受管工具和 PromptManager 既有任务流程执行，不注册自动写入或第二套任务状态。

## 4. 编译产物规范

### 4.1 `tree.json` 结构（节选）

```json
{
  "schema_version": 1,
  "project": {
    "name": "demo-repo",
    "trees": [ { "tree_id": "demo", "root_uid": "a1b2c3d4", "repository": "https://github.com/owner/demo" } ],
    "revision": "9f1a1cf...",
    "compiled_at": "2026-08-30T12:05:00Z",
    "stats": { "tree_count": 2, "module_count": 412, "leaf_count": 371, "api_count": 1830, "dep_count": 962, "cross_tree_dep_count": 14, "max_depth": 6, "layout_count": 41, "planned_count": 3, "deprecated_count": 1, "policy_rule_count": 5, "change_count": 2, "open_change_count": 1 }
  },
  "modules": {
    "demo.order.checkout.payment": {
      "uid": "8f3a9c2e",
      "id": "demo.order.checkout.payment",
      "parent": "demo.order.checkout",
      "tree": "demo",
      "depth": 4,
      "name": { "zh": "支付", "en": "Payment" },
      "description": { "zh": "...", "en": "..." },
      "source": [ { "path": "src/order/checkout/payment.ts", "line": 12, "end_line": 340 } ],
      "revision": "9f1a1cf...",
      "updated_at": "2026-08-30T12:00:00Z",
      "fingerprint": "e3b0c442...",
      "apis": [ { "key": "POST /api/v1/orders/{order_id}/pay", "protocol": "http", "method": "POST", "path": "...", "description": { "zh": "...", "en": "..." } } ],
      "deps": [ { "kind": "call", "to": "helper-lib.utils", "from_api": "...", "to_api": "rpc:format_amount", "cross_tree": true, "label": { "zh": "...", "en": "..." } } ],
      "aggregate": { "descendant_count": 0, "own_api_count": 2, "inherited_api_count": 0, "dep_out": 2, "dep_in": 3 }
    }
  },
  "api_index": {
    "POST /api/v1/orders/{order_id}/pay": "demo.order.checkout.payment",
    "kafka:payment.completed": "demo.order.checkout.payment"
  },
  "policy": { "schema_version": 1, "updated_at": "…", "rules": [] },
  "changes": [ { "id": "2026-09-12-add-feature", "status": "in_progress", "title": { "zh": "…", "en": "…" } } ],
  "layouts": { "demo": { "schema_version": 1, "id": "demo", "updated_at": "...", "mode": "groups", "order": ["demo.order","demo.auth"], "groups": [], "reading": { "zh": "…", "en": "…" } } },
  "edges": [
    { "from": "demo.order.checkout.payment", "from_api": "...", "to": "helper-lib.utils", "to_api": "rpc:format_amount", "kind": "call", "cross_tree": true, "label": { "zh": "...", "en": "..." } }
  ]
}
```

### 4.2 派生内容（编译时计算，源中不存）

- `tree`（所属树）、`depth`、`aggregate`、`api_index`、`edges`、`cross_tree` 标记；
- `outline.md`：全项目 `id + 名称 + 一行介绍 + 统计` 分层大纲（含多树分节）。

### 4.3 冻结与回执

- 编译通过后冻结 `tree.json` 字节 → `receipt.json`（校验摘要、SHA-256、字节数、统计、warning 清单）。
- `tree.project.source_digest` 与 `receipt.source_digest` 记录架构源摘要；回执 `artifacts` 只含 tree、outline、api-index。渲染前核对当前摘要及 tree 哈希，拒绝过期或被修改的图。
- 存在 error 时 MUST NOT 产出任何产物（fail-closed），旧产物保持原样。
- HTML 页脚 MUST 仅展示**摘要**（构建时间、模块数、API 数、哈希前 12 位）；完整回执只落文件。

---

## 5. 校验规范

### 5.1 三层校验

| 层 | 时机 | 内容 |
|---|---|---|
| L1 单文件 | `normify_module_upsert` 写入时 | frontmatter 解析、字段类型、必填、id/uid 格式、YAML 子集 |
| L2 全项目 | `normify_validate` / `normify_build` | 多树结构、无环无孤儿、parent 一致性、文件↔id 映射、API 全局唯一、边两端存在、叶子规则、双语完备 |
| L3 冻结 | `normify_build` 收尾 | 产物完整性、哈希、回执 |

### 5.2 规则全集（error 级 MUST）

**结构类**
1. `uid` 8 位小写 hex，全项目唯一；
2. `id` 段格式合法、全项目唯一、总长度 ≤4096；深度限制如有需要由 policy 显式配置；
3. `parent: null` 的根 ≥ 1（每棵树一个根）；根的 id 必为单段；
4. 非根 `parent` 存在且等于 id 去尾段；
5. 无孤儿（可回溯到某个根）、无环（DFS）；
6. 文件位置与 id 映射一致（§3.2 规则）；`modules/` 下无游离文件、无空树目录；
7. `name/description` 双语义非空不超长；
8. `revision` 40 位 SHA；`updated_at` ISO 8601；`fingerprint` 非空。

**API 类**
9. 非叶子与根出现 `apis` → error；叶子必须有（空数组 → warning）；
10. API key 全项目唯一；`protocol` 在枚举内；http 必须/非 http 禁止 `method`；
11. API 双语 description 非空。

**边类**
12. `deps[].to` 存在（悬空 → error，诊断附反查引用方）；
13. `to != id`；`(from_api?, to, to_api?, kind)` 不重复；
14. `from_api` 为本模块 API（非叶子禁用）；`to_api` 为目标模块自身 API；
15. `kind` ∈ `call | event | dataflow | reference`。

**一致性类（有仓库上下文时）**
16. `--repo-root` 给定：`source.path` 存在（缺失 → error，提示 `normify_sync`）；`fingerprint` 与按 §5.2 算法重算的值一致（不一致 → error，提示用 `normify_fingerprint` 重算）；
17. **未接箭头的 API：合法，不产生任何诊断**（含 warning）。
18. `state`/`replacement`/`tags` 形状合法；replacement 指向存在模块；deprecated 入边记 warning；
19. `policy.yml` 存在且规则合法；规则命中产出 `policy/<rule-id>`（severity error 阻断）；
20. `changes/*.json` 形状合法、引用模块存在、状态与 closed_at 自洽；close 要求全项目 0 error。

**warning 级（不阻断）**：叶子 `apis: []`；根 `source: []`；根无子模块（空树）；正文缺失；`--repo-root` 未给定而存在 `source` 时的一致性跳过提示。

### 5.3 诊断格式（面向 LLM）

每条诊断 MUST 含 `code/severity/message/subject/evidence/supportedFixes`（Archify 模式）：

```json
{
  "code": "structure/parent-mismatch",
  "severity": "error",
  "message": "parent 字段与 id 推导不一致",
  "subject": { "module": "demo.order.checkout.payment", "path": "/parent" },
  "evidence": { "parent": "demo.order", "derived": "demo.order.checkout" },
  "supportedFixes": ["将 parent 改为 demo.order.checkout"]
}
```

修复 MUST 只动 `subject` 指向位置、采纳 `supportedFixes` 之一；重跑至 **0 error**；warning 全部记入回执。

### 5.4 `kind` 枚举与扩展兼容性

- 定稿：`call | event | dataflow | reference`。
- **新增枚举值向后兼容**：新值只出现在未来数据里；旧渲染器遇未知值按 `reference` 样式渲染并记 warning；扩展成本 = 校验器与渲染器各改一处常量表。**因此 v1 不加 `publish/subscribe`，留待真实需求出现时低成本扩展。**

### 5.5 双语强制与开关

- 默认：双语缺失 = error（MUST）。
- library 配置 `requireBilingual: false` 时缺少英文降级为 warning；中文描述仍须满足基本字段校验。MCP CLI 默认强制双语。

---

## 6. 生成器规范

### 6.1 形态：技能 + 工具

- 技能 `skills/normify-gen/SKILL.md`：分析策略、创作规程、增量再生成策略（§6.3 原文收录）。
- 工具集（§6.4）：AI 经工具写结构数据，**写时即过 L1 校验**，不裸写文件。

### 6.2 需求先行设计与已有代码分析

需求先行设计采用本文 0.8 契约与 `normify-gen` 当前技能：Schema/完整图读取 → 计划模块、类型与输入输出接口 → 候选校验 → 图 CAS 提交 → 分支计划建议与补全 → 计划校验与 CAS 保存 → 固定组交接包/宿主组计划 → PromptManager 派工与实际验收 → 激活与变更关闭。下面保留已有代码的分析策略，目录和源码仓库均以受管绑定为准。

1. **确认范围**：当前服务绑定的源码仓库、`revision` 与结构数据目录；多个仓库分别使用明确绑定的服务，多树本身不扩大文件访问范围；
2. **顶层骨架**：每仓库产出一棵树（根 = 项目名 slug，一级 3–8 个模块）；
3. **逐层下钻**：直到叶子（"单一功能单元"判据：一个文件/类/服务/一组内聚路由，不再需要更细粒度）；
4. **叶子收尾**：提取全部 API（路由/RPC/事件/表/队列），逐一写双语简介；
5. **箭头补全**：从 import/调用点提取出向依赖写 `deps`；**跨仓库调用 = 跨树箭头，直接指向目标树模块**；
6. **证据落盘**：`source`/`revision`/`fingerprint`（fingerprint 调 `normify_fingerprint` 计算）；
7. **逐文件写入**（写时校验）；8. **`normify_build`** 至 0 error；9. **`normify_render`** 交付路径 + 回执摘要。

**规模控制**：按职责和上下文容量分轮编辑；每次受管提交须全项目 0 error。完整图提交须保留所有未修改模块，不以局部批次代替完整快照。

### 6.3 增量再生成策略（SKILL.md 核心章）

**触发**：用户要求同步，或指定 `git diff` 版本范围；`normify_sync` 默认对比 HEAD，并包含未跟踪文件。

1. **取 diff 文件路径集 P**（逐树归属）；
2. **脏子树定位**：`source.path` 前缀匹配 → 直接命中集 A；A 的祖先标"待复核"（统计/介绍/职责边界可能变）；
3. **深到浅重建**：叶子重读代码（增删 API、更新介绍、必要时拆分晋升）；祖先只复核介绍与子级变化，不重读全部代码；`source` 全部失效的模块 → 删除模块及子树，**用反查修复所有指向它的 `deps`（含跨树）**；
4. **重校验 + 重编译**：`normify_validate` → `normify_build`，0 error 才交付；
5. **更新 `revision/fingerprint/updated_at`** 于所有改动模块；
6. **汇报变更摘要**：新增/删除/拆分/合并/改名模块与 API、增删边清单（标注跨树）。

**约束**：只修改受影响内容；保留无关模块；增量后全项目校验仍 0 error。

### 6.4 引擎工具与 0.8 受管扩展

下表列出原有引擎工具；受管目录与源码根由宿主绑定，不作为模型参数，执行能力（`execution`）同样只由宿主提供（见「宿主执行契约（execution）」）。0.6 增加 `normify_schema_get`、`normify_graph_get`、`normify_graph_validate`、`normify_graph_put` 和 `normify_work_packet`；0.7 再增加 7 个分支计划工具，总数 43；0.8 不增减工具，但 `createPromptManagerTools` 的 `execution` 成为必填项、`closeChange` 的 refresh 阶段与分支计划删除补上宿主执行端口和发布前 CAS 复核，`readBranchPlanningHead` 作为库入口公开。

| 工具 | 作用 |
|---|---|
| `normify_tree_list()` | 列出全部树（treeId + 根模块 + 仓库 URL） |
| `normify_module_get(id)` | 读单个模块 |
| `normify_module_list(parent?, direct_only?)` | 列模块（含统计） |
| `normify_module_upsert(frontmatter, body)` | 写模块，写时 L1 校验，幂等 |
| `normify_module_delete(id)` | 删模块及子树（附悬空边预警清单，含跨树） |
| `normify_module_promote(id)` | 叶子晋升容器（文件迁移 + 子树 parent 重写） |
| `normify_validate()` | 全项目校验（0 error 门禁） |
| `normify_build()` | 编译 tree.json + outline + api-index + 回执 + 冻结 |
| `normify_sync({diff?})` | 只读增量分析，返回脏子树清单供 AI 维护 |
| `normify_search(query)` | 跨 id/name/description/API 检索 |
| `normify_deps_find(to=id)` | 反查"谁依赖我"（删除/改名前的安全网，含跨树） |
| `normify_outline()` | 读取派生 outline.md |
| `normify_fingerprint(source)` | 按引擎算法计算绑定仓库内的 source 指纹 |
| `normify_layout_get(id)` | 读某容器模块的渲染数据 |
| `normify_layout_upsert(id, mode?, max_columns?, order?, groups?, reading?, edge_hints?)` | 写/覆盖渲染数据（写时校验） |
| `normify_layout_delete(id)` | 删除渲染数据（回退自动布局） |
| `normify_render({out?})` | 校验编译来源后渲染绑定项目的 tree.json（§7） |
| `normify_module_patch(id, patch, expect_updated_at?)` | 部分更新（并发保护 / dry_run） |
| `normify_module_batch(items, mode, dry_run?)` | 原子批量 upsert/patch |
| `normify_module_move(id, new_id?|new_parent?, dry_run?)` | 改名/移动子树（级联 deps/渲染数据） |
| `normify_module_refresh(ids|all, activate?)` | 绑定仓库内重算指纹/revision；planned → active |
| `normify_policy_get()` / `normify_policy_upsert(rules)` | 架构规则读取/安装 |
| `normify_check(modules?, deps?)` | 设计前预检（核心约束 + policy） |
| `normify_brief(task?|id?|files?)` | 开发指引（契约/影响面/规则/建议/清单） |
| `normify_change_open/update/list/close` | 变更日志；close 强制 0 error |
| `normify_branch_plan_suggest({id,title,base_commit,scope,requirement_ids,together})` | 按源码重叠和显式耦合生成同一 BranchPlan 形态的候选 |
| `normify_branch_plan_get()` | 读取 branch-plan.json 和独立计划 digest |
| `normify_branch_plan_validate({plan})` | 静态校验范围、需求、独立验收、资源隔离和依赖策略 |
| `normify_branch_plan_put({plan,expect_digest,dry_run?})` | 校验后 CAS 保存完整分支计划 |
| `normify_branch_plan_delete({expect_digest,dry_run?})` | CAS 删除分支计划 |
| `normify_branch_packet({unit_id})` | 读取固定图/计划/基线的交付单元交接包 |
| `normify_project_init(root?)` | 初始化结构数据目录并安装默认架构规则（幂等）；可选一步建"计划态根模块" |
| `normify_help({topic?})` | 规范速查：fields / deps / renders / flow / tools / policy / errors / all / `tool:<工具名>`（单工具完整参数树） |
| `normify_schema_get()` | 返回 JSON 架构图、模块与数据类型的统一 Schema（含工具完整参数 Schema） |
| `normify_graph_get()` | 读当前完整 JSON 架构图与固定 digest（写前 CAS 基准） |
| `normify_graph_validate({graph})` | 静态校验候选 JSON 图（模块树/类型/接口/依赖/规则），不修改当前图 |
| `normify_graph_put({graph, expect_digest})` | 以完整 JSON 图替换当前架构（候选先校验和编译；未包含的模块会被删除） |
| `normify_work_packet({ids})` | 生成 Worker 实现包（契约/正文/共享类型/目标文件/验收/架构 digest；文件重叠时拒绝独立分工） |
| `normify_branch_plan_export({lead_ref})` | 将已保存且重新校验的分支计划投影为 PromptManager WorkerPlan |

工具白名单：只允许读写指定 `normify-*` 目录与只读指定仓库；其余路径一律拒绝。

### 6.5 生成器护栏

- 只读仓库，绝不改源码；
- 计划叶子 SHOULD 声明目标 `source`；激活后须提供真实源码证据；根与结构容器可无 source；
- 深度按职责划分，无固定上限；如需限制，显式使用 policy 的 `max-depth`；
- 双语缺失 = error（除非 library 显式配置放宽）；
- 未接箭头的 API 保持原样，**不得**因"孤立"而删除。

---

## 7. 渲染器规范

> v0.4.1（渲染器 v3）：连线只走"自由通道"并保持 ≥16px 框体间距；viewBox 由全部几何包围盒动态计算，连线不会出界；
> 叶子框内展示 API 明细行（最多 4 行 + `+N`），精确边按 `from_api/to_api` 锚定到 API 行端口（API 直接连线）；
> 跨层依赖聚合为虚线 `×N` 边（tooltip 列明细）；支持缩放与悬停高亮。模块总量不设上限，粒度到单一功能单元。


### 7.1 形态与输入

渲染输入 = `tree.json`（结构数据 + 编入的 `layouts` 渲染数据）。查看器在每一层同时消费：结构数据给出模块/API/边，渲染数据给出该层的 `order`/`groups`/`mode`/`reading`/`edge_hints`；无渲染数据时回退自动布局（依赖分层 / 均衡网格）。连线由渲染器在运行时智能编排（不是结构数据的一部分）。

- 输入：**仅 `tree.json`**。
- 输出：**单文件自包含 HTML**（内联 CSS/JS、无外部依赖），写入绑定结构数据目录；工具 MUST 返回产物精确路径。
- PromptManager 通过主进程与现有预览/IPC 边界读取产物；渲染进程不直接访问仓库文件。

### 7.2 核心交互（作者已确认的行为规范）

1. **未展开的模块节点：只显示名称**。
2. **悬停：tooltip 显示介绍**（当前语言的 `description`；叶子同此规则）。
3. **点击容器/根模块：进入该模块层**——层头显示本模块**名称 + 介绍**（双语按语言）+ 面包屑 + 统计；主体 = 子模块图（各子节点同样只显名称、悬停出介绍）+ 本层箭头 + 进出箭头。
4. **点击叶子：打开模块详情视图**（名称+介绍+全部 API+`deps` 列表+source 跳转链接）。
5. **面包屑**：`demo / order / checkout / payment`，任意段可回跳；多树时首段为树名。
6. **一键语言切换**：`中 / EN` 按钮，全局切换所有 `name/description/label`（结构化双语，不依赖浏览器翻译）。
7. **搜索**：顶栏搜索，走 `api_index` 与模块索引，命中即跳转。
8. **进出边展示**：当前层每个节点显示与其他子树/树的箭头（出边实线、入边虚线，跨树箭头标注目标树名）。

### 7.3 API 聚合渲染（防"上层几千个 API"）

原则：**编译时算好、渲染时按需展开，绝不一次性平铺。**

- 详情面板三区：① 本模块 API（仅叶子）；② 继承 API（按直接子模块分组折叠：`invoice (12)`，展开再按孙分组，**递归惰性**）；③ 空态说明。
- **API 浏览器视图**：左树导航 + 右**虚拟化滚动列表**（只渲染可视区），按 protocol/method 过滤 + 全文搜索。
- 性能目标（M2 验收）：412 模块/1830 API 首屏 < 1s；3000 模块/10000 API 展开任意组 < 50ms。

### 7.4 多树视图

- 多树时：顶层 = **树根列表**（每树一个节点：名称 + 悬停介绍 + 仓库 URL 链接），点击进入该树。
- 单树时：直接进入该树（无树选择层）。
- 跨树箭头在任意层级视图中可见，标注 `树名` 前缀。

### 7.5 视图模式

| 视图 | 内容 |
|---|---|
| 分层图（默认） | 当前层模块框（名称 only）+ 本层箭头 + 进出边；点击下钻 |
| 大纲 | 全项目可折叠目录 + 统计（读 `outline.md` 编译数据），按树分节 |
| 模块详情 | 叶子：介绍 + API + deps + source 跳转；容器：见 §7.3 聚合面板 |
| 依赖视角 | 选中 API/模块 → 高亮上下游可达（沿 `edges`），回答"谁调用了 X" |

### 7.6 深链接规范

| 链接 | 行为 |
|---|---|
| `normify.html#module=demo.order.checkout.payment` | 下钻到该模块层并聚焦 |
| `normify.html#tree=helper-lib` | 进入某棵树 |
| `normify.html#api=POST%20%2Fapi%2Fv1%2Forders%2F%7Border_id%7D%2Fpay` | 聚焦 API，显示归属模块与上下游 |
| `normify.html#view=outline` | 大纲视图 |
| `?lang=en/zh` · `?theme=dark/light` | 初始语言 / 主题 |

### 7.7 导出（v2+）

当前层 PNG/SVG 导出等能力**不进入 v1**，渲染器稳定后以 v2 特性加入。

---

## 8. PromptManager 工具工程规范

### 8.1 包结构

```text
code-normify/
├── package.json              # @promptmanager/code-normify；Node.js 20+
├── src/
│   ├── index.ts              # ESM 导出
│   ├── tools.ts              # 31 个宿主无关引擎工具及统一 Schema/结果
│   ├── service.ts            # 固定项目、权限、执行能力与事务；增加 5 个图工具与 7 个分支计划工具
│   ├── execution.ts          # 宿主执行能力（signal/check/readGit 与两阶段 check）及库内置只读 Git 端口
│   ├── planning.ts           # 固定设计读取（readBranchPlanningHead / readBranchPlanningSnapshot）
│   ├── workspace.ts          # 真实路径边界与跨进程项目锁
│   ├── mcp.ts                # 显式 CLI 参数及 stdio 生命周期
│   ├── adapters/mcp.ts       # MCP 协议转换
│   └── engine/               # 模块、类型、编辑、规则、校验、编译、渲染
├── lib/                      # tsc 构建产物与声明
├── skills/normify-gen/SKILL.md
├── tests/
└── README.md
```

### 8.2 构建与接入

```sh
npm ci
npm run check
npm pack
```

在目标项目安装构建包。PromptManager 的受管配置使用 `command = "node"`，`args` 为 `node_modules/@promptmanager/code-normify/lib/mcp.js` 和三个显式 CLI 参数；在执行组启动 cwd 下解析相对路径。完整配置及精确 `mcpBindings` 见 README。library 使用 `@promptmanager/code-normify/service` 并 MUST 显式声明 `execution`（宿主进程内为 `host`，见「宿主执行契约（execution）」），不使用历史 DSH plugin apply。

### 8.3 测试策略

- 校验器单测覆盖全部违规类型（含多树：双根合法、N 根、跨树悬空边、跨树自环…）+ 诊断快照；
- 编译器金样哈希比对；渲染器金样（含悬停/下钻/深链用例）；端到端小仓库闭环。

---

## 9. 历史引擎里程碑与当前验收

| 里程碑 | 交付物 | 验收标准 |
|---|---|---|
| **M0 格式与校验器** | 规范定稿、L1/L2/L3 校验器、编译器、冻结回执 | 手工 3 层 20 模块样例树 + 第二棵树 + 跨树箭头：`normify_build` 通过；每类违规被精确定位为 error；回执含 SHA-256 |
| **M1 生成器** | §6.4 工具集、`normify-gen` 技能 | 单仓库从零生成 0 error、source 可跳转；AI 依据诊断自行修复至通过 |
| **M2 渲染器 MVP** | `normify_render`、单文件 HTML、名称/悬停/下钻交互、多树根选择器、深链接、语言切换、API 聚合视图 | §7.3 性能目标达成；深链接全直达；跨树箭头正确标注树名；千级 API 不卡顿 |
| **M3 增量再生成** | `normify_sync`、fingerprint 防漂移、悬空边反查修复（含跨树） | 改 2 个文件同步：只重写受影响子树（diff 可证）、全项目 0 error、变更摘要准确 |
| **M4 体验完善** | API 浏览器、依赖视角、大纲视图、主题 | 全部视图在 412 模块样例可用；无 JS 报错 |
| **M5 规模化与发布** | 3000+ 模块压测、npm 打包 | 作为性能目标验证，不代表当前已完成该规模验收 |
| **0.6 受管契约** | 类型 Schema、接口输入输出、完整图 CAS、实现包、library 与 stdio MCP | 引擎回归、事务回滚、工作区越界、相对 cwd、只读权限、真实 SDK 生命周期通过 |
| **0.7 分支交付计划** | 统一 BranchPlan、范围与需求覆盖、文件/together 分组、固定基线、独立验收、依赖策略、计划 CAS、组交接包与静态 WorkerPlan 导出 | 契约和静态诊断通过；真实验收执行及 PromptManager 应用内接线分别提供证据 |
| **0.8 宿主执行契约** | `execution` 必填（host/standalone）、`{ signal, check, readGit }` 宿主执行端口、同步 `check` 门禁、`readBranchPlanningHead` 与发布前 CAS 复核 | 宿主撤权/取消贯穿队列、项目锁与 Git 的回归通过；`npm run check:refs` 与 `npm run check:docs` 并入 `npm run check` 与 CI |
| **后续候选** | 当前层 PNG/SVG 导出、正文渲染、宿主预览集成、fingerprint 采样 | 按实际需求启动 |

---

## 10. 风险与对策

| # | 风险 | 对策 |
|---|---|---|
| 1 | 上层 API 聚合爆炸 | 编译期 `api_index`+计数；递归惰性分组 + 虚拟列表（§7.3，M2 压测） |
| 2 | 模块重命名级联 | `uid` 保 diff 稳定；`normify_module_promote`/改名工具统一迁移；悬空边 error 逼出修复 |
| 3 | YAML 解析歧义 | 严格子集（§3.3）+ 写时校验 + 精确行号 |
| 4 | 双语漏写 | 默认 error 门禁 + library 显式配置 |
| 5 | 数据与代码漂移 | `revision`+`fingerprint`+`normify_sync` |
| 6 | 大树超上下文 | 每模块独立文件 + `outline.md` + 检索工具 |
| 7 | 纯树掩盖真实依赖 | 两类边分离 + 跨树箭头 + 依赖视角 |
| 8 | Windows 路径深度 | 按实际平台文件路径约束规划目录；如需限制架构深度显式配置 policy；容器/叶子形态由工具维护 |
| 9 | 校验器自身缺陷 | 全违规类型单测 + 诊断快照 + 编译器金样 |
| 10 | 多树数据膨胀 | 树按目录分区、按树 diff/同步、`normify_tree_list` 隔离操作面 |

---

## 11. 兼容性与迁移承诺

1. **`schema_version`**：当前为 1；破坏性变更 MUST 升版本并提供迁移工具。
2. **`kind` 枚举扩展**：新增值向后兼容（§5.4），不升版本。
3. **`id`/`uid` 命名空间**：全项目（跨树）唯一；`uid` 一经分配终身不变。
4. **产物格式**：`tree.json` 字段新增遵循"加不减、语义不变"原则；渲染器 MUST 忽略未知字段。
5. **草案迁移**：ModTree 草案中的单树布局（`modules/index.md` 为根）MUST 按 §3.2 迁移为 `modules/<treeId>/index.md`（M0 提供一次性迁移脚本或用生成器重建）。

---

## 12. 附录

### 12.1 关键设计原则

1. 单方向引用：只存 `parent`、只存出向 `deps`；反向关系全由索引导出。
2. 单一事实源：API 只在叶子存一次；聚合/统计/索引全是派生数据。
3. 派生优于存储：`depth/tree/children/aggregate/api_index/outline` 不进源。
4. fail-closed：任何 error 不产产物；诊断必带 subject/evidence/supportedFixes。
5. 人机共读：Markdown 源 + JSON 产物 + HTML 视图。
6. 增量优于全量：只重建脏子树，但全项目校验永远 0 error。
7. 不发明新格式：Markdown + JSON，规避 grep tax。
8. 叶子即功能：API 与最细功能单元绑定，孤立 API 与有边 API 同等合法。
9. **树 = 导航骨架，箭头 = 真实图**；多树零新语法。

### 12.2 验收剧本（MC 多模组场景）

1. 用户："分析 `core-mod` 与 `addon-mod` 两个仓库并生成结构图"（addon 依赖 core）。
2. AI：逐仓库生成两棵树（`core-mod`、`addon-mod`）→ addon 调用 core 的 API 写成跨树 `deps` → `normify_build` 0 error → `normify_render`。
3. 用户打开 `normify.html`：树根列表两个节点，进入 `addon-mod` 逐层下钻，跨树箭头标注 `core-mod`。
4. core 的 API 变更后：AI 跑 `normify_sync` 只重建 core 相关子树与 addon 的跨树箭头 → 0 error → 重新渲染。

---

*Normify 规范 v1.0 完。实现从 M0 开始：先按 §3/§5 落地校验器与编译器。*
