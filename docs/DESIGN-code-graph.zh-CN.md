# 符号级引用图 + 改动记录：设计（DESIGN-code-graph）

> 状态：设计稿（**方向变更版**）。本文档取代同目录下原「行级溯源 + 全仓文件台账」设计稿，原稿已删除、旧路径不留悬空引用（核实方式见附录 A 第 1 条）。
> 方向依据（用户原话，逐字引用）：①「其实我们只需要知道删了某个夹具后相互之间的引用，引用和被引用之间的关系就好了」；②「最小的变量也要，就是每做一个改动都有」；③ 观测点确认为「每次提交 / 每次 CAS 写入」（**不是**每次保存）。
> 取证基线：`git status --porcelain` 无未跟踪（`??`）残留；`git config --get core.ignoreCase` → `true`；`git ls-files` 共 1,399 条；`package.json` 版本 0.8.0；仓库自带 TypeScript 5.9.3。
> 数字口径：标「实测」的数字一律给出命令与原始输出（附录 A）；**未实测的一律标「待实测」并写出测量方法**，不写推测值。凡标「外推」的数字都由两个实测值相乘/相加得到，并写明是哪两个。
> 边界：本文档只写设计与验收标准。**不新增 MCP 工具契约**；图与改动记录的生成器放在 `scripts/`（与增量 1 一致），因此**不改 `src/` 行为、不需要重建 `lib/`**；门禁是否新增由第 11 节 P1 拍板。

---

## 1. 目标与验收问句

### 1.1 一句话目标

让「**删了某个东西之后能组织起来**」变成可查询、可断言的事实：任意一个**文件、声明、函数内局部变量或参数**被删除时，能立刻回答**谁还在引用它**、**它又引用了谁**（直接与传递），以及**这次改动动了哪些声明与边、这些影响处理了没有**。

「东西」的最小单位是**符号**，不是行。用户原话「最小的变量也要」中的「变量」按字面实现：**函数内的局部变量与参数都是图上的节点**（见第 2.1 节）。

### 1.2 可验收问句清单

设计是否达标不看形容词，看下面五条问句能否给出**结构化**答案（不是"翻 git 碰运气"）。

| # | 问句 | 今天能否回答 | 依据（实测） |
| --- | --- | --- | --- |
| **Q1** | **谁引用了它？**（直接入边） | ⚠ 部分（仅文件级、且不持久化） | `scripts/check-references.cjs:2184-2209` 用 `ts.createSourceFile` 逐文件取 import/export-from/require/动态 import 说明符，能回答"哪些文件 import 了这个文件"，但**只用于判悬空、不建图、不落盘**，每次都要全仓重扫；`src/engine/types.ts:113-119` 的 `ChangeModules` 只有模块 id 级，无符号 |
| **Q2** | **它引用了谁？**（直接出边） | ⚠ 部分（同上） | 同上；另有一条**声明式**近似：模块的 `deps`（`src/engine/reference.ts` 的 `DEPS_REFERENCE`）是人工在 `modules/*.md` 里写的箭头，不是从源码解析出来的引用 |
| **Q3** | **删了它之后哪些引用会断？**（直接 + 传递闭包） | ❌ 不能 | 现有门禁只做**存在性**判定：`dangling-reference` / `dangling-module-specifier` 在"目标根本不存在"时报 error（`scripts/check-references.cjs:84-94`）。**存在性 ≠ 影响传播**：它不会告诉你"删掉 `src/execution.ts` 会波及哪 12 个文件、其中哪些是类型引用"，也没有传递闭包查询 |
| **Q4** | **这次改动动了哪些声明与边？** | ❌ 不能 | `ChangeData`（`src/engine/types.ts:121-137`）只有 `id`/`title`/`intent`/`modules.create|modify|delete`/`api_add|api_remove`/`revision.before|after`，**无文件路径、无符号、无边**；且**本仓库当前不存在 `changes/` 目录**（实测 `git ls-files` 无任何 `changes/` 条目），所以连"变更意图"都还没有落点 |
| **Q5** | **这些影响处理了没有？** | ❌ 不能 | 全仓没有任何"引用影响处理状态"的概念；`ChangeData.status`（`ChangeStatus`）是**变更**的状态，不是**某条受影响引用**的状态 |

> **验收方式**：每期增量必须至少把一条 ❌ 变成"可由脚本或测试断言的结构化回答"（见第 10 节各期的验收标准）。**部分**不算达标，只算起点。

### 1.3 现状边界（仓库现在能回答什么）

| 能力 | 位置（实测） | 实际粒度 | 能否回答 Q1–Q5 |
| --- | --- | --- | --- |
| 模块 → 源码路径 | `src/engine/types.ts:8-12` `SourceRef{path,line?,end_line?}`；`types.ts:146` `Module.source: SourceRef[]` | 模块 → 路径（可选行区间） | 只能给"这个文件属于哪个模块"，**没有**符号 |
| 整文件指纹 | `src/engine/store.ts` 的 `fingerprintOf`；`types.ts:149` `Module.fingerprint` | **模块级**：按 path 升序去重后哈希文件字节 → 单个 SHA-256 | 只回答"这个模块的源码变了"，**不回答哪里变了、谁被波及** |
| L2 证据诊断 | `src/engine/validate.ts:299,306,321,328,334,343,346,351`（8 个 `evidence/*` code） | 路径可用性 / 根无 source / 不是普通文件 / 缺失 / 指纹 pending / 指纹不可算 / 指纹漂移 / 跳过校验 | 全部是"**现在**是否漂移"，**没有引用维度、没有历史维度** |
| 相对说明符解析 | `scripts/check-references.cjs` 的 `collectSpecifiersWithTypescript`(2184) / `collectSpecifiersWithRegex`(2274) / `resolveRelativeSpecifier`(2336) | **单文件语法树** + 相对路径解析 | 能列边，但**不解析符号**：`import { foo }` 里的 `foo` 到底指哪个声明，它不知道 |
| 文件级台账 | `scripts/check-file-ledger.cjs`（1997 行）+ 共享内核 `scripts/file-ledger-core.cjs`（462 行）+ `ledger/file-ledger.json`（`schema_version: 2`，168 行 / 10131 B）+ 独立豁免清单 `ledger/exempt.gitignore`（56 行 / 19 条模式） | **文件级**归属状态 | 回答"这个文件有没有人管"，与引用关系无关 |
| 声明式依赖箭头 | `src/engine/reference.ts` 的 `DEPS_REFERENCE`；`DEP_KINDS`（`src/engine/types.ts`） | 模块/API 级，人工在 `modules/*.md` 写 | 是**设计意图**，不是**代码事实**；两者不能互相替代 |

**一句话**：仓库现在能回答"哪个模块现在漂移了"和"哪个文件没人管"，**完全不能**回答"这个符号谁在用、删了会波及谁"。

### 1.4 与非目标的关系

第 8 节列出的整套「行级内容溯源」机制在本方向下**全部作废**（逐行哈希、逐行指纹、区间块、块大小定标、CRLF 行哈希稳定性）。作废理由见 8.1，此处不重复。

---

## 2. 图的模型

### 2.1 三层：文件 → 声明 → 边

图分三层。**前两层是节点，第三层是边**；边自带两端（`from` / `to`），因此不为边单独建节点表。

| 层 | 节点/边的种类 | 回答什么 | 粒度锚点 |
| --- | --- | --- | --- |
| **L0 文件层** | 节点 `kind: "file"` | 哪些文件参与引用面；跨文件边的两端 | `git ls-files` 的 1,399 条（实测） |
| **L1 声明层** | 节点 `kind: "declaration"` | 导出的 / 顶层的 / **函数内的局部变量与参数**，各自被谁引用 | 声明名 + `文件:行:列` |
| **L2 边层** | 边 `kind ∈ {import, export-from, require, dynamic-import, type-reference, markdown-link, package-field, ci-target, anchor, module-id-reference}` | Q1 / Q2 / Q3 | `文件:行:列`（源端）→ 目标 |

**L1 的 `decl_kind` 必须覆盖函数内的最小变量**（用户口径的硬要求）：

| `decl_kind` | 是否节点 | 说明 |
| --- | --- | --- |
| `module` / `function` / `class` / `interface` / `type` / `enum` | ✅ | 顶层或模块级声明 |
| `variable`（顶层） | ✅ | 模块级 `const`/`let`/`var` |
| `variable`（函数内） | ✅ | **函数内局部变量**——用户原话「最小的变量也要」 |
| `parameter` | ✅ | **函数形参**（含箭头函数、方法、构造函数、存取器） |
| `property` / `method` | ⭕ 可选 | 类成员；由所属 `class` 节点派生，v1 可只记边不记节点（待拍板 P3） |
| `import-binding` | ✅ | `import { foo } from './x.js'` 引入的本地名字；它是一条边的**目标端绑定**，同时在本地是一个声明 |

**作用域字段**：函数内声明（`variable` 在函数内、`parameter`）必须有 `scope`，指向所属函数声明的节点 id；顶层声明的 `scope` 为 `null`。

### 2.2 节点字段表

| 字段 | 类型 | 必填 | 语义 | 示例 |
| --- | --- | --- | --- | --- |
| `id` | string | ✅ | 稳定标识。文件节点 = 仓库相对 posix 路径；声明节点 = `<file>#<name>@<line>:<col>`（同文件同名不同位置不冲突） | `src/tools.ts#key@64:6` |
| `kind` | enum `file` \| `declaration` | ✅ | 节点种类 | `declaration` |
| `lang` | enum `ts` \| `js` \| `md` \| `json` \| `yaml` \| `other` | ✅ | 决定边由哪个解析器产出 | `ts` |
| `name` | string \| null | ✅（`kind=file` 时为 null） | 声明名；文件节点为 null | `key` |
| `decl_kind` | enum（见 2.1） \| null | `kind=declaration` 时 ✅ | 声明种类 | `parameter` |
| `exported` | boolean | ✅ | 是否被 `export` 修饰或经 export-from 再导出 | `false` |
| `scope` | string \| null | ✅（函数内声明必填） | 所属函数声明的 `id` | `src/tools.ts#buildTool@58:10` |
| `pos` | object `{file,line,column}` | ✅ | 声明名的**起始位置**（1 基，行号按 LF 归一化文本计） | `{"file":"src/tools.ts","line":64,"column":6}` |
| `origin` | enum `source` \| `declared-only` \| `generated` | ✅ | `declared-only` = 只在模块声明里被提到、源码中不存在（计划态） | `source` |
| `module_id` | string \| null | ⭕ | 与 `Module.id` 对齐的语义归属；对账用，不参与引用解析 | `null` |

### 2.3 边：引用类型、位置、是否跨文件

| `kind` | 由来 | 源端位置 | 目标端 | 跨文件 |
| --- | --- | --- | --- | --- |
| `import` | `import ... from '<spec>'`、`import '<spec>'` | 说明符字面量处 `文件:行:列` | 目标文件的导出声明（symbol 级）或目标文件 | ✅ |
| `export-from` | `export ... from '<spec>'`、`export * from '<spec>'` | 说明符字面量处 | 同上 | ✅ |
| `require` | `require('<spec>')` | 实参字面量处 | 同上 | ✅ |
| `dynamic-import` | `import('<spec>')` | 实参字面量处 | 同上 | ✅ |
| `type-reference` | 类型位置的标识符（`TypeReferenceNode`） | 类型名标识符处 | 被引用的 `interface`/`type`/`class`/`enum` 声明 | 可跨可同 |
| `markdown-link` | `[t](p)` / `![t](p)` / 引用式定义 `[r]: p` | 行内起始列 | 目标文件 / 目标文件的 `#fragment` | ✅ |
| `package-field` | `package.json` 的 `main` / `types` / `exports` / `bin` / `files` | 字段值所在行 | 文件或目录 | ✅ |
| `ci-target` | `.github/workflows/*.yml` 的 `run:` 里的 `node <路径>` / `npm run <script>` | 命令行内偏移 | 脚本文件 / `package.json` 的 script | ✅ |
| `anchor` | Markdown 链接的 `#fragment` | 同 `markdown-link` | 目标文件的标题 slug 或显式 HTML `id`/`name` | ✅ |
| `module-id-reference` | 模块声明 `source.path`、`deps[].to`、`apis[].input/output`、Schema 的 `$ref` | 声明字段值处 | 目标 `Module.id` / 命名类型 | 可跨可同 |

**边的公共字段**：

| 字段 | 类型 | 必填 | 语义 | 示例 |
| --- | --- | --- | --- | --- |
| `id` | string | ✅ | 稳定标识（默认 `<from.file>:<line>:<col>:<kind>`） | `src/tools.ts:1:98:import` |
| `kind` | enum（见上表） | ✅ | 引用类型 | `import` |
| `from` | object `{sym,file,line,column}` | ✅ | 源端；`sym` 为 source 所属声明 id（文件级边为 null） | `{"sym":"src/tools.ts#createNormifyTools@57:17","file":"src/tools.ts","line":1,"column":98}` |
| `to` | object `{sym,file,line,column}` | ✅ | 目标端；解析失败时 `sym`/`file`/`line` 可为 null，`status` 必须说明原因 | `{"sym":"src/execution.ts#checkExecution@12:17","file":"src/execution.ts","line":12,"column":17}` |
| `cross_file` | boolean | ✅ | `from.file !== to.file`（**冗余但必须落盘**：稀疏化策略按它分区，见 2.6） | `true` |
| `specifier` | string \| null | ⭕ | 原始说明符原文（`'./execution.js'`）；非说明符类边为 null | `./execution.js` |
| `resolved` | string \| null | ⭕ | 解析后的规范路径 / 模块 id | `src/execution.ts` |
| `status` | enum `resolved` \| `unresolved` \| `external` \| `ambiguous` \| `dangling` | ✅ | **不得假绿**的关键字段，见 5.5 | `resolved` |
| `type_only` | boolean | ✅ | 是否为 `import type` / 纯类型位置（删除它只影响类型检查，不影响运行时） | `false` |

### 2.4 JSON Schema 草案

> 草案用 `json` 代码块（不参与文档示例编译门禁），draft 2020-12，与 `docs/SPEC.zh-CN.md` 声明的 Schema 版本一致；仓库已有 `ajv` 依赖可直接校验。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/wishbreeze/code-normify/schemas/code-graph/v1.json",
  "title": "Normify 符号级引用图 v1",
  "type": "object",
  "required": ["schema_version", "meta", "files", "declarations", "edges"],
  "additionalProperties": false,
  "properties": {
    "schema_version": { "const": 1 },
    "meta": {
      "type": "object",
      "required": ["generated_at", "generator", "universe", "tracked_total", "universe_hash", "ts_version"],
      "additionalProperties": true,
      "properties": {
        "generated_at": { "type": "string" },
        "generator": { "type": "string" },
        "universe": { "type": "string" },
        "tracked_total": { "type": "integer", "minimum": 0 },
        "universe_hash": { "type": "string", "pattern": "^[0-9a-f]{64}$" },
        "ts_version": { "type": ["string", "null"] },
        "positions_basis": { "type": "string" }
      }
    },
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "lang", "bytes", "decl_count", "edge_out", "edge_in"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string" },
          "lang": { "enum": ["ts", "js", "md", "json", "yaml", "other"] },
          "bytes": { "type": "integer", "minimum": 0 },
          "decl_count": { "type": "integer", "minimum": 0 },
          "edge_out": { "type": "integer", "minimum": 0 },
          "edge_in": { "type": "integer", "minimum": 0 },
          "module_id": { "type": ["string", "null"] }
        }
      }
    },
    "declarations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "file", "name", "decl_kind", "exported", "line", "column"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string" },
          "file": { "type": "string" },
          "name": { "type": "string" },
          "decl_kind": {
            "enum": ["module", "function", "class", "interface", "type", "enum", "variable", "parameter", "property", "method", "import-binding"]
          },
          "exported": { "type": "boolean" },
          "scope": { "type": ["string", "null"] },
          "line": { "type": "integer", "minimum": 1 },
          "column": { "type": "integer", "minimum": 1 },
          "origin": { "enum": ["source", "declared-only", "generated"] }
        }
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "kind", "from", "to", "cross_file", "status", "type_only"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string" },
          "kind": {
            "enum": ["import", "export-from", "require", "dynamic-import", "type-reference", "markdown-link", "package-field", "ci-target", "anchor", "module-id-reference"]
          },
          "from": { "$ref": "#/$defs/endpoint" },
          "to": { "$ref": "#/$defs/endpoint" },
          "cross_file": { "type": "boolean" },
          "specifier": { "type": ["string", "null"] },
          "resolved": { "type": ["string", "null"] },
          "status": { "enum": ["resolved", "unresolved", "external", "ambiguous", "dangling"] },
          "type_only": { "type": "boolean" }
        }
      }
    }
  },
  "$defs": {
    "endpoint": {
      "type": "object",
      "required": ["file"],
      "additionalProperties": false,
      "properties": {
        "sym": { "type": ["string", "null"] },
        "file": { "type": ["string", "null"] },
        "line": { "type": ["integer", "null"], "minimum": 1 },
        "column": { "type": ["integer", "null"], "minimum": 1 }
      }
    }
  }
}
```

### 2.5 符号表 / 边表 / 按需展开

**问题**：函数内每个标识符都是一条边。`src/` 逐文件实测（附录 A 第 3 条）：

| 量 | 实测值（`src/**/*.ts`，28 文件） |
| --- | --- |
| 行数（`\n` 计数） | **9,782** |
| 字节数 | 521,118 |
| 声明名（`declaration_names`） | **2,624**（其中模块级/顶层 207，**函数内 2,417**） |
| 标识符引用（`identifier_references`） | **10,336** |
| 模块说明符边（`import` 声明 201 + `export … from` 19） | **220** |
| 导入绑定（`ImportSpecifier` / `ImportClause` / `NamespaceImport` 节点） | 672 |
| 类型引用节点（`TypeReferenceNode`） | 805 |
| 动态 `import()` / `require()` 调用 | 0 / 0 |

即 `src/` 一个目录就有 **12,960 个图元素**（2,624 声明 + 10,336 引用），与用户预期的「上万条边」一致。因此**不能**把每条边都按最啰嗦的形态落盘。

**分层与稀疏化策略**（四层，逐层放大）：

| 层 | 落盘内容 | 规模（`src/` 实测锚点） | 为什么这么切 |
| --- | --- | --- | --- |
| **① 文件表** | 每个已跟踪文件一行：`id` / `lang` / `bytes` / `decl_count` / `edge_out` / `edge_in` | 28（全仓 1,399） | 极小、可全量重算、是分片与失效判定的索引 |
| **② 符号表** | 每条**声明**一条（含函数内局部变量与参数） | 2,624 | 用户要求的最小单位，必须落盘；体量只有引用的 1/4 |
| **③ 跨文件边表** | 只落 `cross_file=true` 的边 | **≥ 220**（模块说明符边），精确值待实测（见 9.7） | 这类边**必须** `ts.createProgram` + 类型解析才能算出，是最贵、最不可重算的信息 |
| **④ 文件内边（按需展开）** | **不落盘**。查询时对单个文件重新解析（`createSourceFile`，不需要 program）即可得到 | 其余 10,116 条（外推：10,336 − 220） | 函数内引用的解析范围天然局限在**本文件 + 本函数作用域**；"删了局部变量谁引用它"只需单文件展开，答案完整且成本 O(一个文件) |

**判据（为什么 ④ 可以不落盘）**：用户的三条问句里，只有 Q3（传递闭包）需要跨文件传播；而跨文件传播的**边**全部落在 ③。④ 里的边两端必在同一文件内（局部变量、参数、文件内私有函数/类型），因此"影响传播"不会穿过它离开本文件——展开该文件即可闭合。这一点在增量 4 必须用测试断言（见 10.4）。

**改动记录对 ④ 的处理**：因为 ④ 不落盘，两份快照之差看不到文件内引用的增删。补法是每条 `accounted`/变更记录对每个受影响文件存一个 `intra_ref_digest`（**整文件级**，不是行级）——它只回答"这个文件的文件内引用面是否变过"，需要细节时再展开。若实测证明该摘要的误报率过高，退化为"受影响文件一律重展开"（成本 = 文件数 × 单文件解析耗时，待实测）。

### 2.6 分层存储的落点与体积预估

- **落点**：仓库根 `ledger/` 目录（与增量 1 的 `ledger/file-ledger.json` 同域）；图数据分片存放，分片键 = 文件路径的 **UTF-8 字节序**排序后的连续段（**不用** `localeCompare`——`src/engine/manifest.ts:11` 用 `localeCompare` 是本仓的一处已知跨平台风险，图数据不得沿用它）。
- **分片依据（实测）**：逐文件记录数在 `src/` 内分布极不均——最大 `src/tools.ts` 2,371 条、均值 462.6 条/文件、最小 `src/index.ts` 0 条（该文件不含任何声明，只有 16 条 `export … from`，正说明"文件层节点"与"边"是两层不同的东西）。因此分片按**文件**切，而不是按固定条数切，才能让一次改动的重算面等于改动的文件面。
- **单条字节数（实测，用本文档 2.2/2.3 的字段构造真实记录后 `JSON.stringify` + UTF-8 字节数）**：节点记录 199–243 B（n=13，均值 221.3）；边记录 234–270 B（n=20，均值 253.2）。
- **外推（记录数实测 × 单条字节实测）**：`src/` 按最啰嗦形态全量落盘约 `12,960 × ~250 B ≈ 3.1 MiB`；采用 2.5 的分层后，落盘部分为 `2,624 声明 + ≥220 跨文件边 ≈ 2,844 条 ≈ 0.7 MiB`。**这两个数都是外推不是实测总量**；真实总量与压缩后体积按 9.7 的方法测。
- **全仓规模**：工作区（排除 `node_modules/` 与 `.git/`）合计约 **99.3 万行**（实测，附录 A 第 4 条），是 `src/` 的约 100 倍。全仓符号级图的规模**待实测**，测量方法见 9.7；在测出来之前**不预设**它可接受。

---

## 3. 实现路径

### 3.1 为什么必须 `ts.createProgram`（不能只遍历单文件 AST）

现有门禁的解析器用 `ts.createSourceFile`（`scripts/check-references.cjs:2185`）——**单文件**语法树，没有类型检查器，因此拿不到符号绑定。后果：

- `import { foo } from './x.js'` 里的 `foo` 在语法树上只是一个 `ImportSpecifier` 节点，**它指向 `x.ts` 里哪个声明，语法树不回答**；
- 同名符号（`src/engine/store.ts` 与 `src/engine/edit.ts` 各有一个 `load`）无法区分；
- `export * from './x.js'` 的再导出链无法展开，`import { foo } from './index.js'` 的 `foo` 真正来源不可知（`src/index.ts` 全是这种再导出）。

**做法**：`ts.createProgram(fileNames, compilerOptions)` + `program.getTypeChecker()`，对每个 `Identifier` / `ImportSpecifier` 调用 `checker.getSymbolAtLocation(node)`，再用 `checker.getAliasedSymbol(symbol)` 穿透 import/再导出别名，最后用 `symbol.declarations[0]` 反查声明位置（`getLineAndCharacterOfPosition`）。

**compilerOptions 的来源**：直接读仓库根的 `tsconfig.json`（实测 `target: ES2023` / `module: NodeNext` / `moduleResolution: NodeNext` / `strict: true` / `include: ["src"]`），用 `ts.parseJsonConfigFileContent` 解析，保证与 `tsc` 的解析行为一致（含 `NodeNext` 的 `.js` → `.ts` 扩展名映射）。

**成本与降级**：`createProgram` 是全仓级、比 `createSourceFile` 贵一个量级，因此只在增量 3 的生成器里跑全量；`--json` 之外的一切按需查询（Q1/Q2 单文件视角）优先走 `createSourceFile` 快速路径，只有需要跨文件符号时才建 program。实测耗时见 9.7。

### 3.2 枚举文件内的局部变量与参数

用 `ts.forEachChild` 深度遍历，配合一个"当前函数作用域栈"：

1. 进入 `FunctionDeclaration` / `FunctionExpression` / `ArrowFunction` / `MethodDeclaration` / `Constructor` / `GetAccessor` / `SetAccessor` → 压栈；
2. 遇到 `Parameter`（`node.name` 是 `Identifier`）→ 产出 `decl_kind: "parameter"`，`scope` = 栈顶函数声明 id；
3. 遇到 `VariableDeclaration`（`node.name` 是 `Identifier`）→ `decl_kind: "variable"`，栈非空时 `scope` = 栈顶 id（**函数内局部变量**），栈空时为顶层；
4. 解构模式（`const { a, b } = x`）→ 遍历 `BindingElement`，每个绑定名各产出一条声明（实测 `src/tools.ts` 中存在这类写法）；
5. 离开函数节点 → 弹栈。

位置一律取 `node.name.getStart(sourceFile)` 换算的 `{line, column}`（1 基），与 2.3 的边位置口径一致。

### 3.3 边的枚举与符号解析

| 边 kind | 枚举方式 | 目标端解析 |
| --- | --- | --- |
| `import` / `export-from` / `require` / `dynamic-import` | 语法树节点（沿用 `check-references.cjs:2200-2205` 的判定：`ImportDeclaration` / 带说明符的 `ExportDeclaration` / `ImportKeyword` 调用 / 裸 `require` 调用） | 先按 3.5 的解析器定位目标文件，再对每个 `ImportSpecifier` 用 `checker.getSymbolAtLocation` + `getAliasedSymbol` 定位目标声明 |
| `type-reference` | `TypeReferenceNode`（`src/` 实测 805 个） | 同上；`type_only: true` |
| `markdown-link` / `anchor` | 沿用 `check-references.cjs` 的 `forEachMarkdownLink`(1134) 与 `extractHeadingAnchors`(2694) | 目标文件 + `githubSlug`(2664) 或显式 HTML `id`/`name` |
| `package-field` | 沿用 `collectPackageFieldTargets`(1390) | 文件/目录存在性 |
| `ci-target` | 沿用 `collectWorkflowRunLines`(1515) / `extractNodeTargets`(1422) / `extractNpmScriptRefs`(1544) | 脚本文件 / `package.json` script 名 |
| `module-id-reference` | 解析 `modules/*.md` frontmatter 的 `source.path`、`deps[].to`、`apis[].input/output`、Schema `$ref` | `Module.id` / 命名类型 |

### 3.4 非 TS 文件的退化处理

| 后缀 | 处理 | 产出粒度 | 依据 |
| --- | --- | --- | --- |
| `.ts` / `.tsx` / `.mts` / `.cts` | `createProgram` 全精度 | 文件 + 声明 + 边 | 3.1 |
| `.mjs` / `.cjs` / `.js` / `.jsx` | 归入同一个 `createProgram`（`allowJs`）或用 `createSourceFile` + `scriptKindFor` 退化为文件级 | **文件级**（不保证符号级） | `check-references.cjs:2166-2173` 已有 `scriptKindFor` 映射 |
| `.md` | 只解析 Markdown 链接、图片、引用式定义、标题锚点 | 文件级 + 锚点 | `forEachMarkdownLink`(1134)、`extractHeadingAnchors`(2694) |
| `.json` | 只解析 `package.json` 的 `main`/`types`/`exports`/`bin`/`files`；其它 `.json` 只记文件节点 | 文件级 | `collectPackageFieldTargets`(1390)、`collectExportStrings`(1405) |
| `.yml` / `.yaml` | 只解析 workflow 的 `run:` 里的 `node <路径>` 与 `npm run <script>` | 文件级 | `collectWorkflowRunLines`(1515) |
| `.toml` 及其它 | 只记文件节点（参与 L0 文件表与 `edge_in`/`edge_out` 计数），不产边 | 文件级 | `TEXT_EXTENSIONS`（`check-references.cjs:73`）当前含 `.toml` |

**退化必须显式标注**：每条边的 `status` 之外，`meta` 里记录每个后缀降到了哪一级；文档与查询输出**不得**把"文件级"答案说成"符号级"（见 5.5 的降级契约）。

### 3.5 复用 `scripts/check-references.cjs` 的既有解析器（不造第二套）

该脚本**已经**在算文件级的 import / markdown / package.json / CI / 锚点边，必须复用而不是重写。现状约束（实测）：

- 它是一个 **CLI-only 的 3,089 行（136,739 B）脚本**，文件末尾直接 `main(process.argv.slice(2));`，**全仓 `git grep "module.exports" scripts/` 无命中** ⇒ 现在**无法被 require 复用**。
- 它的解析器是**闭包内函数**，依赖 `ctx`（`createContext` 的产物）与模块级可变状态（如 `SPECIFIER_ANALYSIS`、`TYPESCRIPT_CANDIDATE_ROOTS`）。

**复用方案（唯一改动面）**：把纯函数解析器抽到一个共享模块（例如 `scripts/lib/reference-parsers.cjs`），由 `check-references.cjs` 与新的图生成器**同时** require。抽取清单（含行号，均为实测）：

| 抽取目标 | 现位置 | 用途 |
| --- | --- | --- |
| `scriptKindFor` | 2166 | 后缀 → `ts.ScriptKind` |
| `collectSpecifiersWithTypescript` | 2184 | 模块说明符（语法树） |
| `maskSource` / `collectSpecifiersWithRegex` | 2218 / 2274 | 拿不到 typescript 时的降级路径 |
| `resolveRelativeSpecifier` / `moduleSpecifierCandidates` | 2336 / 2122 | 说明符 → 目标文件 |
| `forEachMarkdownLink` | 1134 | Markdown 链接/图片/引用式定义 |
| `extractHeadingAnchors` / `githubSlug` / `anchorMatches` | 2694 / 2664 / 2765 | 锚点 |
| `collectPackageFieldTargets` / `collectExportStrings` | 1390 / 1405 | package.json 字段 |
| `extractNodeTargets` / `collectWorkflowRunLines` / `extractNpmScriptRefs` | 1422 / 1515 / 1544 | CI 目标 |
| `globToRegExp` | 411 | 模式匹配（复用同一套 `*` / `?` 语义） |
| `pathState` / `indexPathState` / `isIgnoredPath` | 1002 / 2036 / 2072 | 以 git 索引为权威的存在性判定 |

**硬约束**：抽取是**纯重构**——`check-references.cjs` 的行为、诊断码、`--json` 输出、退出码、`CHECK_TITLES`（9 项）与 `--help` 编号**逐字节不变**。验收方式：抽取前后各跑一次 `node scripts/check-references.cjs --json`，两份输出逐字节相同（见 10.2 验收标准）。

**注意（并发）**：写作本稿时另一条工作流正在改 `scripts/check-references.cjs`（其 `git status` 为 `AM`）。抽取必须在那个工作流落地**之后**做，否则会冲突。

### 3.6 确定性与跨平台

- 位置口径：**LF 归一化文本**上的 1 基行列；不使用字节偏移（CRLF 检出下字节偏移会变，行列不会）。
- 排序：一律 **UTF-8 字节序**（`Buffer.compare`），**不用** `localeCompare`（`src/engine/manifest.ts:11` 的反例）。
- 大小写：路径按 git 索引的原样保留；`scripts/check-references.cjs` 把大小写不一致当 error（"Windows 能过、Linux CI 会挂"），图数据不得引入新的不一致。
- 不哈希原始字节：节点/边的位置与标识都是文本派生的，跨平台不受 CRLF 影响——这也是本方向比行级哈希更稳的根本原因。

---

## 4. 改动记录

### 4.1 观测点（用户拍板的边界）

**观测点 = 每次提交 / 每次 CAS 写入。**

- 「提交」= 一次 git commit（在该提交落定后取一次图快照）；
- 「CAS 写入」= 引擎的一次内容寻址写入（`src/engine/manifest.ts` 的 `graphDigest` 语义域：`SOURCE_ROOTS = ['modules','renders','policy.yml','changes']`，`manifest.ts:5`）。
- **「每次保存」不在本设计范围内**：它需要常驻文件监听（`fs.watch` / 编辑器钩子 / 常驻守护进程），会引入"同一秒内多次半写状态"的竞态与跨平台差异（`fs.watch` 在 Windows 与 Linux 的行为不同），而用户要回答的是"每做一个改动都有记录"——一个改动 = 一次提交或一次 CAS 写入，不是一次按键。**这条边界是用户拍板确认的**，任何后续把观测点下沉到保存级的提案都必须重开这个决定。

### 4.2 记录内容

一条改动记录 = **引用图两份快照之差** + 受影响的引用方 + 处理状态。

| 组成 | 内容 | 来源 |
| --- | --- | --- |
| 快照对 | `from_snapshot` / `to_snapshot`（各自的 `universe_hash` + 分片摘要） | 4.1 的两个观测点上各取一次 |
| 节点差 | `declarations.added` / `.removed` / `.moved`（id 级） | 两份快照的符号表之差 |
| 边差 | `edges.added` / `.removed`（id 级）；**只覆盖落盘的跨文件边**（见 2.5 ④） | 两份快照的跨文件边表之差 |
| 文件内引用面 | 每个受影响文件的 `intra_ref_digest`（整文件级） | 按需展开 |
| 受影响引用方 | 由边差反向闭包得到（Q1 的落地形态）：`affected_referrers[]` | 第 5 节查询接口 |
| 处理状态 | `handled` / `pending` / `waived`（+ 理由） | 人工或后续提交回填 |
| 关联 | `change_id`（可空）、`commit`（可空）、`cas_digest`（可空） | 4.3 |

### 4.3 与变更意图的关联

**先说清事实**：本仓库**当前不存在 `changes/` 目录**（实测 `git ls-files` 无任何 `changes/` 条目；`Get-ChildItem -Recurse -Directory -Filter changes` 无命中）。`changes` 是**目标工程数据目录**的四个源根之一（`src/engine/manifest.ts:5`），其记录形态由 `src/engine/types.ts:121-137` 的 `ChangeData` 定义（`id` / `title` / `status` / `intent` / `modules` / `acceptance` / `revision.before|after` …）。

因此关联规则必须是**可选外键**，不能假定它存在：

| 场景 | `change_id` | 说明 |
| --- | --- | --- |
| 目标工程里有对应的 `changes/<id>.json` | 记录其 `id` | "为什么改"由 `ChangeData.intent` 展开，**不复制自然语言**（避免第二份可写源） |
| 本仓库自身的提交（无 `changes/`） | `null` + `commit` 非空 | 用提交信息作为意图来源；记录里存 `commit` 与 `summary` |
| CAS 写入 | `cas_digest` 非空 | 见 4.1 |

**与 `ChangeModules` 的分工**：`ChangeModules.create/modify/delete` 是**模块 id 级**的人工声明；改动记录的节点差是**符号级**的机器事实。两者**不互相取代**：前者回答"这个变更声称动了哪些模块"，后者回答"实际动了哪些声明与边"。二者的不一致本身是可断言的对账项（见 9.8）。

### 4.4 存放、命名与保留策略

| 项 | 决定 | 理由 |
| --- | --- | --- |
| 目录 | `ledger/changes/`（与增量 1 的 `ledger/file-ledger.json` 同域） | 一次改动只写自己的文件，写放大隔离；不碰 `modules/*.md`（否则改一个符号要重写模块正文，写放大最差） |
| 命名 | `<utc-iso8601>-<short-hash>.json`，例如 `2026-10-05T140312Z-1b2a3c6.json` | 时间序天然可排序；`short-hash` 避免同一秒内两次写入撞名 |
| 格式 | 单文件一条记录，确定性序列化（键序固定、缩进固定、UTF-8 无 BOM、LF） | 逐字节可比对，便于门禁做幂等断言 |
| 保留 | **只增不改**：已落盘的记录不修改；处理状态用**追加**一条状态记录表达，或就地更新 `handling` 字段但保留 `history[]` | 记录是"当时发生了什么"的事实；改状态不等于改事实 |
| 体积 | 单条记录 = 边差条数 × 单条边字节（实测 234–270 B）+ 元信息 | 外推依据见 2.6；真实体积待实测（9.7） |
| 写入者 | 只由生成器写；**CI 只读校验，绝不自动改记录** | 与增量 1 的"生成器写、门禁只读"一致 |

### 4.5 记录字段表与示例

| 字段 | 类型 | 必填 | 语义 |
| --- | --- | --- | --- |
| `schema_version` | integer | ✅ | 固定 `1`；结构变了必须显式升版，不做静默兼容 |
| `kind` | enum `commit` \| `cas-write` | ✅ | 观测点种类（4.1） |
| `commit` | string(40 hex) \| null | `kind=commit` 时 ✅ | 触发记录的提交 |
| `cas_digest` | string(64 hex) \| null | `kind=cas-write` 时 ✅ | 触发记录的 CAS 摘要 |
| `change_id` | string \| null | ✅ | 可选外键（4.3）；本仓库自身提交为 null |
| `created_at` | string（UTC ISO-8601） | ✅ | 记录写入时刻 |
| `from_snapshot` / `to_snapshot` | object `{universe_hash, shards}` | ✅ | 两份快照的定位信息（不含全量图，图在分片文件里） |
| `declarations` | object `{added[],removed[],moved[]}` | ✅ | 节点差（id 数组） |
| `edges` | object `{added[],removed[]}` | ✅ | 边差（id 数组，只覆盖跨文件边） |
| `affected_files` | array `{file, intra_ref_digest, intra_ref_expanded}` | ✅ | 受影响文件 + 文件内引用面摘要 + 是否已重展开 |
| `affected_referrers` | array `{sym, file, line, column, depth, via}` | ✅ | 受影响的引用方（含传递深度） |
| `handling` | object `{status, by, at, note}` | ✅ | `status ∈ handled \| pending \| waived`；`waived` 必须带 `note` |
| `summary` | string | ⭕ | 人类可读一行 |

```json
{
  "schema_version": 1,
  "kind": "commit",
  "commit": "0000000000000000000000000000000000000000",
  "cas_digest": null,
  "change_id": null,
  "created_at": "2026-10-05T14:03:12Z",
  "from_snapshot": { "universe_hash": "2ccf4b7fcbebabe343254a7732b6153da8e770d2ce0a47ebd26fa51753a3942c", "shards": ["0000"] },
  "to_snapshot": { "universe_hash": "0000000000000000000000000000000000000000000000000000000000000000", "shards": ["0000"] },
  "declarations": {
    "added": ["src/engine/manifest.ts#SOURCE_ROOTS@5:14"],
    "removed": ["src/tools.ts#legacySync@988:10"],
    "moved": []
  },
  "edges": {
    "added": ["src/service.ts:41:7:import"],
    "removed": ["src/tools.ts:988:7:import", "src/index.ts:3:1:export-from"]
  },
  "affected_files": [
    { "file": "src/tools.ts", "intra_ref_digest": "0000000000000000", "intra_ref_expanded": true }
  ],
  "affected_referrers": [
    { "sym": "src/tools.ts#normifySync@980:17", "file": "src/tools.ts", "line": 988, "column": 12, "depth": 1, "via": "import" },
    { "sym": "src/index.ts#@3:1", "file": "src/index.ts", "line": 3, "column": 1, "depth": 2, "via": "export-from" }
  ],
  "handling": { "status": "pending", "by": null, "at": null, "note": null },
  "summary": "删除 legacySync，2 条边断开，1 个文件受影响"
}
```

> 示例中的 `universe_hash` 一处取自 `ledger/file-ledger.json` 的真实值，一处为占位全零；`commit` 亦为占位。示例**不是**真实记录。

---

## 5. 查询接口

四个查询都必须能回答"在什么粒度回答"与"图不完整时怎么降级"。**共同铁律：不得假绿**（见 5.5）。

### 5.1 谁引用我（inbound）

| 项 | 内容 |
| --- | --- |
| 输入 | 目标标识：文件路径 / 声明 id / `文件:行:列`（定位最近的包围声明） |
| 输出 | `{target, referrers:[{sym,file,line,column,kind,cross_file,type_only,status}], truncated}` |
| 粒度 | **符号级**（TS 文件）；非 TS 目标按 3.4 退化到文件级并在输出里注明 `granularity: "file"` |
| 覆盖 | 落盘的跨文件边（全量）+ 目标所在文件的文件内边（按需展开） |
| 今天 | ⚠ 部分（只有文件级、且要全仓重扫；见 1.2 Q1） |

### 5.2 我引用谁（outbound）

| 项 | 内容 |
| --- | --- |
| 输入 | 同上 |
| 输出 | `{source, references:[{sym,file,line,column,kind,status}]}` |
| 粒度 | 同 5.1 |
| 特别注意 | `export * from './x.js'`（`src/index.ts` 全是这种）必须穿透到真实来源，否则"我引用谁"会退化成"我引用了 index.ts"——这正是必须用 `getAliasedSymbol` 的原因（3.1） |

### 5.3 删了我什么会断（传递闭包）

| 项 | 内容 |
| --- | --- |
| 输入 | 目标标识 + `max_depth`（默认 8）+ `include_type_only`（默认 true） |
| 输出 | `{target, broken:[{sym,file,line,column,depth,path[]}], cycles[], truncated, completeness}` |
| 算法 | 在**反向边图**上做 BFS/DFS；`path[]` 给出从目标到该引用方的完整链路 |
| 循环 | 必须检测并回显 `cycles[]`（`src/index.ts` 的再导出与 `src/engine/*` 的互相引用会产生环），不得无限递归 |
| 粒度 | 符号级；跨文件传播只走落盘的跨文件边，进入某文件后闭合该文件的文件内边（2.5 ④） |
| 分类 | 结果必须区分 `type_only`（删了只影响类型检查）与运行时引用——这是"会不会真断"的关键区分 |
| 今天 | ❌ 不能 |

### 5.4 本次改动动了什么 / 影响处理没有

| 项 | 内容 |
| --- | --- |
| 输入 | `commit` 或 `cas_digest` 或记录文件名 |
| 输出 | 4.5 的整条记录 + `handling.status` + 未处理项清单 |
| 粒度 | 节点差与边差是符号级；`affected_files` 是文件级（含 `intra_ref_digest`） |
| 今天 | ❌ 不能 |

### 5.5 降级契约（不得假绿）

**铁律：宁可返回"不知道"，也不返回一个看起来完整的空答案。** 每个查询的返回体都必须带 `completeness` 字段，取值与语义：

| `completeness` | 含义 | 何时出现 |
| --- | --- | --- |
| `complete` | 图覆盖了查询涉及的全部边 | 落盘分片齐全 + 目标文件可读 + 解析器未降级 |
| `partial` | 有已知缺口，且缺口已枚举 | 目标是非 TS 文件（3.4 退化）、`truncated=true`、`max_depth` 截断、文件内边未展开 |
| `unknown` | 无法判定，且原因已给出 | git 索引取不到、分片缺失/不可解析、TypeScript 不可用、文件读不到（`check-references.cjs` 的 fail-closed 约定："读不到就必须红"，见其文件头注释） |
| `stale` | 图对应的 `universe_hash` 与当前 git 索引不一致 | 有文件增删改名但未重算图 |

**硬约束**：`unknown` 与 `stale` **不得**被当成"没有引用"（空数组必须与"未查出"可区分）。`broken: []` 只有在 `completeness === "complete"` 时才允许被读成"删了它没人受影响"。

### 5.6 既存证据错误是否阻断分支计划生成（R5 结论：维持短路，但把实际值变成契约）

**问题**：`src/engine/branches.ts` 的 `:257`（`validateWithContext`）与 `:504`（`suggestBranchPlan`）在 `ctx.errors` 非空时直接清空 `units`。于是一个**准确的**既存证据错误（模块 source 指向真实目录 → `evidence/source-not-a-file`）会让分支层不出任何计划。5.5 的铁律管的是"查询不得返回看起来完整的空答案"，本小节的问句是它的兄弟：**一个与本次计划无关的既存错误，该不该阻断整层计划生成？**

**实测四种形态**（临时夹具：`demo` 根 + 叶子 `demo.alpha`（source 指向真实目录 `src/real-dir`）+ 叶子 `demo.beta`（source 指向真实文件）；命令为 `node` 直跑 `lib/`）：

| 入口 | 直接数据 | 目录型 source 实测 | 文件型对照 |
| --- | --- | --- | --- |
| suggest | 计划在生成**之前**短路，无候选 | `ok:false`、`units:[]`、`plan:null`、errors 仅 `evidence/source-not-a-file` | `units` 非空、`plan` 非 null |
| validate | 计划由调用方提供，`plan` 原样保留 | `ok:false`、`units:[]`，而 `plan.units.length === 2`（**为空的是推导结果，不是计划**） | `units.length === 2` |
| put | 经 `validateWithContext` 后不落盘 | 同 validate，`plan` 保留、`units:[]` | 同 validate |
| packet | 经 `packetContext` → `validateWithContext` | `packet:null`、`units:[]` | 同 validate |

**可分辨性（决定选型的唯一硬约束）**：`ctx.errors` 的 23 个产出点里，只有 3 类**不带**模块归属——`structure/no-root`、`structure/uid-duplicate`、`api/key-duplicate`；其余 20 类都带 `subject.module`，因此"错误属于哪个模块"是可判定的（证据：`src/engine/validate.ts:83`、`:66`、`:188` 无 `{ module }`，其余 `errors.push(diag(...))` 均带）。据此**再叠加** `subject.module` 是否落在 `plan.scope`，就能把"scope 外模块的既存错误"整类摘出来——实测该形态下 `suggest` 仍返回 `plan:null`，即今天**连 scope 外、与本次计划无关的错误也会阻断生成**。

**为什么仍然维持现状（不实现"只对影响本计划的 error 短路"）**：

1. **判据不在诊断里，而在"模块图是否还自洽"这个全项目属性上。** `:187-189` 已经把 `directReferences`（依赖推导）门控在 `checked.ok` 上，`:504` 的短路与它同口径。要放行，就得在 `branches.ts` 里维护一张"哪些错误码不破坏依赖推导"的白名单——这份白名单正是会被误分类的东西，且它一旦漏判，产出的就是**格式合法、语义错误**的计划。
2. **失败关闭的方向不能反。** 今天 `ok:false` ⟹ `units:[]`，消费方拿不到半成品；反过来（放行部分 units）会让"有一次 error 但拿到了计划"成为常态，而错误清单只要有一处误判就变成假绿。这直接违反 5.5 的"不得让空/缺看起来完整"。
3. **信息并没有被丢掉，阻断是响的。** validate/put/packet 三条通路里 `plan` 原样保留（实测 `plan.units.length === 2`），调用方看到的是"计划在你手里、但这层推导不出单元 + 一条准确的诊断"，不是静默空结果。
4. **没有消费方依赖 `units` 的值。** 全仓无任何代码按顶层 `units` 分支（`grep` 仅命中定义与返回）。

**因此本项不改语义**：仅在 `tests/branch-e2e.mjs` 把"目录型 source 时四个入口的 `units` 实际值"断言下来（suggest 为 `0` 且 `plan:null`，validate 为 `0` 且 `plan.units` 保留 1，另有真实文件型对照必须 `>0`）。任何一侧改语义都会在该断言处变红，而不是悄悄改变门禁强度。

**R5 顺带发现的相邻缺陷（本项未改，另立条目）**：`state: active` 的模块 source 指向目录时，`fingerprintOf` 返回 `null`，写入模块文件后 `structure/fingerprint-invalid` 让 `parseModule` 在 `src/engine/frontmatter.ts:281-293` **返回 `module: null`**，该模块因此从 `validateProject` 的 `files` 里彻底消失（实测 `byId` 3 → 2、叶子只剩 `demo.beta`），分支层随后报的是 `branch/module-not-found`（"模块不存在"）而不是指纹问题。这是与 5.5 同族的误导性诊断，比"目录型 source 让 units 清空"更危险，应单独修。

---

## 6. 门禁与校验

### 6.1 悬空边 = error（零新增，复用既有诊断码）

| 既有 code | 位置 | 覆盖什么 | 与图的关系 |
| --- | --- | --- | --- |
| `dangling-reference` | `scripts/check-references.cjs` `CHECK_TITLES`（84-94） | Markdown / `package.json` 字段 / CI `run:` 指向不存在的文件 | 图里 `kind ∈ {markdown-link, package-field, ci-target}` 的边，其 `status: "dangling"` 与之一一对应 |
| `dangling-module-specifier` | 同上 | 相对 import/export/`import()`/`require()` 指向磁盘上根本不存在的文件 | 图里 `kind ∈ {import, export-from, require, dynamic-import}` 的边 |
| `dead-anchor` | 同上 | Markdown 相对链接的 `#fragment` 落不到目标文件真实标题 | 图里 `kind: "anchor"` 的边 |
| `untracked-reference` | 同上 | 引用了"磁盘上有、索引里没有"的路径 | 图里的边的目标若被忽略/未跟踪，必须与它口径一致 |

**结论：悬空边不新增任何检查项。** 图的 `status: "dangling"` 是这些既有诊断码的**结构化投影**，两者必须同源（同一批解析器，见 3.5），否则会出现"图说悬空、门禁说没事"的双真相。

### 6.2 新增：本次改动引入了未处理的引用影响 = error

这是本次方向下**唯一**的新检查项，判据：

> 对最新一条改动记录（`kind` 为 `commit` 或 `cas-write`），若其 `edges.removed` 或 `declarations.removed` 非空，则 `affected_referrers` 中每一条必须有对应的 `handling.status`；存在 `pending` 项时 **error**。

**它为什么不是 6.1 的重复**：

| 维度 | 6.1 悬空边 | 6.2 未处理影响 |
| --- | --- | --- |
| 判据 | **目标根本不存在**（磁盘/索引层面的事实） | 目标**不存在或已改**，且**引用方还没被处理**（流程层面的事实） |
| 触发时机 | 任何一次扫描 | 只在**有新的改动记录**时 |
| 会不会因为"目标还在"而漏报 | 会（这正是缺口） | 不会——删了符号但目标文件还在时，悬空边检查完全不响 |
| 状态 | 无状态、可对任意 root 跑 | 有状态（依赖图快照与改动记录） |

**归属（待拍板 P1）**：

- 选项 (a)：作为 `scripts/check-references.cjs` 的一个新 check id。**不新增门禁脚本**，但会把有状态检查塞进一个刻意无状态的脚本，破坏它"只信任 git 索引文本、可对任意 `--root` 跑"的 fail-closed 边界（见该脚本文件头 `--root` 的 fail-closed 约定）。
- 选项 (b)：新增 `scripts/check-change-impact.cjs` + `package.json` 脚本 `check:impact`，成为**第 6 道门禁**。
- **建议 (b)**，理由同上；但代价是门禁数量再 +1，而增量 1 已经把门禁从 4 道推到 5 道（`scripts/check-file-ledger.cjs`，`package.json:79`）。**这是用户要拍板的点。**

### 6.3 与五道既有门禁的分工（不重复）

| 门禁 | 脚本 | 它管什么 | 与图/改动记录的边界（**不重复的判据**） |
| --- | --- | --- | --- |
| `check:refs` | `scripts/check-references.cjs`（3,089 行，`CHECK_TITLES` 9 项） | 引用**完整性**：悬空、未跟踪、已删除、版本字面量、测试清单、锚点 | 图**复用**它的解析器（3.5）；图的悬空状态是它的诊断码的投影（6.1）。图**不**做版本字面量与测试清单 |
| `check:docs` | `scripts/check-doc-snippets.cjs`（1,629 行，4 项检查） | 文档代码块能否编译、必填选项、工具数量断言、`execute` 签名描述 | 图**不解析文档代码块**；本文档落在 `docs/` 下会被它扫描（约束见附录 C） |
| `check:libsync` | `scripts/check-lib-sync.cjs`（1,439 行） | **git 索引里的 `lib/`** 与"索引版 `src/` 全新编译产物"逐字节一致 | 图生成器放 `scripts/` ⇒ 与它零交互（9.5）。若将来把生成器移进 `src/`，则必须同提交重建 `lib/` |
| `check:examples` | `scripts/check-examples.cjs`（974 行） | 示例可执行 + 运行前后 git 快照**零变化**（含 `--ignored`） | 图生成器**不得**在示例运行期间写工作区；生成器只写 `ledger/`，且 `ledger/**` 已在台账豁免模式内 |
| `check:ledger` | `scripts/check-file-ledger.cjs`（1997 行，`CHECK_TITLES` 13 项）+ 共享内核 `scripts/file-ledger-core.cjs`（462 行） | **文件级**台账：每个已跟踪文件落到四态之一（`owned` / `exempt` / `accounted` / `unowned`），并与真 `.gitignore` 交叉校验（交集 / 折叠误伤 / 放行本该 `git add` 的普通文件） | 图是**符号级**、与文件归属无关；两者共用 `ledger/` 目录但**不共用判定**。第 7 节的用户口径**已于 2026-10-05 落地** |
| （建议新增）`check:impact` | `scripts/check-change-impact.cjs` | 6.2 的未处理引用影响 | 只在有改动记录时触发；不重做 6.1 的任何判定 |

**统一接线**：`package.json` 的 `check` 链（当前 `typecheck → build → test → ci-contract-check.cjs → check:refs → check:docs → check:libsync → check:examples → check:ledger`）与 `.github/workflows/ci.yml`（每道门禁一个独立 step）。新增门禁必须同时改这三处（`package.json` / `ci.yml` / `CONTRIBUTING.md` 的检查项清单与快照行）——CI 注释里已有这条约束。

---

## 7. 台账语义校准（用户口径）

> 本节是**用户口径的照写**，不是可以自由发挥的设计空间。增量 1 的实现（`scripts/check-file-ledger.cjs` + `scripts/generate-file-ledger.cjs` + `ledger/file-ledger.json`）**已接线但语义未经此校准**，必须按本节对齐。
>
> **状态（2026-10-05）：本节口径已落地。** `schema_version` 1 → 2——台账数据（`accounted` 每条带 `accounted_at` + `basis`）、门禁（`scripts/check-file-ledger.cjs`，13 项检查）、生成器、独立豁免清单 `ledger/exempt.gitignore`（gitignore 语法 + 每条必填 reason）与共享内核 `scripts/file-ledger-core.cjs` **同一次提交**一起改。实测：`node scripts/check-file-ledger.cjs --json` → `trackedTotal: 1402`、`states: {owned: 0, exempt: 1373, accounted: 29, unowned: 0}`、`statesSum: 1402`、`exempt.total: 19`、交叉校验三类均为 0，**绿灯依据 = 台账里有条目**。落地清单与逐条断言见第 10 节「增量 1」末尾的 v2 小节。

### 7.1 绿灯依据

**绿灯依据 = 台账里有条目。** 一个已跟踪文件是绿的，当且仅当它能在台账里查到**至少一条**条目（`owned` / `exempt` / `accounted` 三者之一）。

台账宇宙 = `git ls-files`（git 索引）。索引只定义**待清点的全集**，**不等于**绿灯。

### 7.2 三条来路

| 来路 | 含义 | 必填内容 | 判据 |
| --- | --- | --- | --- |
| **`owned`** | 有模块归属 | 归属的 `module_id` | 被某个模块的 `source.path` **精确声明**，且该路径是仓库里真实存在的普通文件（目录不算），且在 git 索引里 |
| **`exempt`** | 显式豁免 | `pattern` + **每条必填理由** | 条目存放在**独立豁免文件**里（不是台账 JSON 的内嵌数组）；模式语法 = **gitignore 语法**；必须与真实 `.gitignore` 交叉校验（7.5） |
| **`accounted`** | 已清点记账 | **清点日期** + **清点依据** | 明确登记"这个文件已被人工清点过，依据是 X"，日期与依据都要落盘、都要可回显 |

### 7.3 明确否掉的两套旧说法

| 被否掉的说法 | 实质 | 为什么必须否掉 |
| --- | --- | --- |
| **「在 HEAD 里即绿」** | 把"文件已在 git 索引里"当成"有人管"的证据 | 已在索引只说明它**被提交过**，不说明有人管。增量 1 的判定事实上已不接受它（`unowned-file` 检查：已跟踪但四态落空 → error），但**台账的措辞**仍在往这个方向误导——`ledger/file-ledger.json` 的 `meta.universe` 与 `meta.byte_basis` 写的是"台账宇宙 = 已跟踪文件""以 git 索引为权威"，极易被读成"进了 HEAD 就是绿的"。**必须改写为**："索引只定义待清点的全集；绿灯的唯一依据是台账里有条目。" |
| **「祖父清单 = 欠账」** | 把 `grandfathered` 读成"历史遗留的欠账，只减不增" | 用户口径是 **`accounted`（已清点记账）**：它是**已经清点过并写明日期与依据的正账**，不是欠账。因此"只减不增的棘轮"这套叙事不成立——不允许用新增未归属文件稀释覆盖率这件事，由"**无条目即 error**"直接实现（7.4），比棘轮更直接、更少歧义。代价是必须补"条目新鲜度"：`accounted` 的依据若已失效（目标文件消失、模块废弃），门禁必须报出来（现状 `grandfathered-removable` 是 **warning**，建议升为 **error**，待拍板 P4） |

### 7.4 已跟踪但无条目 → error（包括刚提交的）

任何已跟踪文件在台账里查不到条目 → **error**，没有例外：

- **刚刚提交的文件同样不豁免**——"它刚进 HEAD"不是条目；
- 新增文件必须**先**拿到条目（`owned` / `exempt` / `accounted`）才能过门禁；
- 不允许通过"往 `accounted` 里加一条"来绕过——`accounted` **必须**带清点日期与依据（7.2），空依据的条目是非法条目（现行 `exempt-invalid` 对"缺 reason"的处理就是这个先例：缺理由 → error，不是 warning）。

### 7.5 豁免清单 × `.gitignore` 交叉校验

**为什么必须做**：一条本想忽略审阅稿的规则，可能意外变成若干文件的**永久豁免依据**。本会话真实发生过：

| 证据 | 内容（实测） |
| --- | --- |
| 事故现场 | `examples/bilibili-pi-full/.gitignore` 里的规则 `*review*.md` |
| 误伤对象 | 该目录下的 `normify-architecture/modules/bili/media/preview.md` 与 `normify-data/modules/data/media/preview-artifact.md` |
| 误伤机理 | `preview` 含子串 `review`（p-**review**），`*review*.md` 直接命中；`git config --get core.ignoreCase` → **`true`**（实测本仓），大小写不敏感进一步放大误伤面 |
| 现场留下的证据 | 同一 `.gitignore` 里已有显式注释「注意 "preview" 含子串 "review"，会被 `*review*.md` 误伤，故显式反选」，并配了反选规则 `!**/modules/**/*.md` |
| 台账侧记录 | `ledger/file-ledger.json` 的 `meta.known_divergences[0]`：「历史上 `examples/bilibili-pi-full` 下有两个被 `*review*.md` 规则命中的模块文件」 |
| 当前状态 | 这两个文件已在 git 索引里（`git status --porcelain` 显示为 `A`）；对该路径跑 `git check-ignore -v` 当前**无输出**（未被忽略） |

**交叉校验规则（新增，必须实现）**：

1. **交集必须报出**：`{台账 exempt 模式命中的路径}` ∩ `{真实 .gitignore 命中的路径}` ≠ ∅ 时 → 报出并**要求人工确认**。理由：如果一个路径同时被 `.gitignore` 覆盖，那它根本不在台账宇宙里，为它写豁免是把忽略规则当成了豁免依据。
2. **每条 `exempt` 必须能追到来源**：条目要么是"仓库级基础设施"（`docs/**`、`lib/**`、`scripts/**`、`tests/**`、`.github/**` 等，依据是"它不属于任何架构模块"），要么显式标注它引用了哪条 `.gitignore` 规则；后者必须带 `gitignore_backed: true` + reason，否则 error。 —— **落地调整（2026-10-05）**：本轮**未**引入 `gitignore_backed` 字段（那会新增一个可填字段来"声明"来源，而"引用了某条 .gitignore 规则"这件事恰恰正是规则 1 要报出的不一致）。改为两条更硬的判据：① 每条豁免**必须**在 `reason` 里写明依据（仓库级基础设施 / 编译产物 / 历史文体等），缺理由即 `exempt-invalid`（error）；② "拿 .gitignore 规则当豁免依据"的路径由规则 1 的**交集检查**直接报出（`exempt-gitignore-cross-check`，error），不依赖人工声明。
3. **大小写敏感性必须显式**：模式匹配的大小写语义必须与 `core.ignoreCase` 一致（本仓为 `true`）；不得依赖平台默认，也不得用 `localeCompare` 之类的区域相关比较。
4. **反选规则必须被尊重**：`.gitignore` 里的 `!` 反选（如 `!**/modules/**/*.md`）必须参与求交，否则会把"已被反选、其实在索引里"的文件误报成"被忽略"。
5. **豁免过期检测保留**：未被任何已跟踪文件命中的 `exempt` 条目 → warning（现行 `exempt-unused` 已有此语义）。理由：未被命中的豁免等于**永久空白特权**，它会无声地放过未来任何匹配该模式的路径。

### 7.6 与增量 1 现状的差异清单（必须逐条对齐）

| 用户口径（新） | 增量 1 现状（实测） | 需要的改动 |
| 用户口径（新） | 增量 1 现状（改造前，实测） | 落地结果（2026-10-05，已实现） |
| --- | --- | --- |
| `owned` | `bound` | **已改名**：门禁代码 / `--json` / 人类报告 / `CONTRIBUTING.md` / CI 注释全用 `owned`；判据不变（`source.path` 精确声明 + 目标真实存在 + 在索引里） |
| `exempt`（独立文件 + gitignore 语法 + 每条必填理由） | `exempt_patterns` **内嵌在 `ledger/file-ledger.json`**（改造前 18-115 行） | **已抽成 `ledger/exempt.gitignore`**：gitignore 语法（`**`（至少一层）/`*`/`?`）、`!` 反选（顺序敏感，最后命中的条目说了算）、`#` 整行注释；行尾字段约定 `<pattern> ## reason=<非空理由> [ ## since=YYYY-MM-DD ] [ ## broad_confirmed=true\|false ]`，缺理由 / 未知字段 → `exempt-invalid`（error）；未命中的条目 → `exempt-unused`（warning）；「过宽」三条判据保留 |
| `accounted`（已清点记账 + 日期 + 依据） | `grandfathered`（**纯路径字符串数组**，29 条，无日期无依据） | **已升级结构**：每条 `{path, accounted_at, basis}`；字段缺失 / 空依据 → `accounted-invalid`（error）；措辞统一为"**已清点记账的正账**（只减不增，相对 HEAD 比对）" |
| 绿灯依据 = 台账里有条目 | "已跟踪 − bound − exempt-pattern − grandfathered ≠ ∅ → error" | **判定不变、措辞已改**：报告首段即"绿灯依据 = 台账里有条目"，`--help` / `CONTRIBUTING.md` 写明「在 HEAD 里」不是绿灯理由、"`accounted` 不是欠账，是已记账的正账"；台账 `meta.universe` / `meta.byte_basis` 同步改写 |
| 豁免 × `.gitignore` 交叉校验 | **不存在**任何交叉校验 | **已新增 `exempt-gitignore-cross-check`（error）**：`git check-ignore --no-index -v -z --stdin` 求交集（尊重 `!` 反选）+ 仅靠 `core.ignoreCase` 折叠才命中的路径 + 「未被忽略也不在索引里」却被豁免放行的普通文件；三类都是 error |
| 无条目即 error（含刚提交的） | `unowned-file` 已是 error | 判定不变；报错措辞已改（"它已经在 HEAD / 已在 git 索引里"不是条目） |

**兼容性代价（实测值）**：`schema_version` 1 → 2，门禁与生成器对**不匹配的版本直接 error**（`LEDGER_SCHEMA_VERSION = 2`，"结构变了必须显式升级，不做静默兼容"）。因此台账数据、门禁、生成器、独立豁免清单、共享内核**必须同一次提交**一起改——改造期间 HEAD 仍是 v1，门禁与 `check:ledger:gen` 都按预期 **exit 1** 报「HEAD 版台账不可用作棘轮基线：schema_version=1，本门禁要求 2」，这正是"版本不匹配直接 error 是有意的"的实测证据。

---

## 8. 明示不做（非目标）

### 8.1 作废：行级内容溯源整套

原方向的行级内容溯源机制**整套作废**，不再实现、不再保留数据结构：

| 作废项 | 它原本要回答的问题 | 作废理由 |
| --- | --- | --- |
| **逐行哈希 / 逐行指纹** | "这一行的内容变了吗" | 用户要的是"**引用与被引用**"，逐行哈希回答的是"**内容是否变过**"——不是同一个问题。为每行生成一条记录，是把预算花在信息密度最低的地方：`src/` 单目录就有 9,782 行（实测），全仓约 99.3 万行（实测），而其中**引用关系**只有 12,960 个图元素（`src/` 实测） |
| **区间块（block/span）与块大小定标** | "变了大概在哪一段" | 块是行级哈希的降级近似（用它换体积）。本方向不需要"哪一段"：需要的是"**哪个符号**"，而符号边界（声明起止）比任何固定行数的块都准确，且**不需要**"块大小敏感性实验"这类定标工作 |
| **CRLF 行哈希稳定性** | 同一文件在 LF/CRLF 检出下哈希必须相同 | 这是一个 0 容忍项，却要求长期维护"LF 归一化 + 去 BOM"的归一化规则。符号级图不受影响：声明与引用的位置按 **LF 归一化文本的行列**表达（3.6），跨平台天然一致 |
| **内容副本 / 内容指针（`git_blob` 之类）** | "被删的内容是什么、能不能恢复" | 不在用户提出的三条问句里（1.2 Q1–Q5 一条都不问内容）。内容归 git 对象库；图只管引用关系 |

**保留的部分**：文件级台账（增量 1）与新方向的**文件层**是同构的，继续有效，但语义按第 7 节校准。

### 8.2 「每次保存」级别的监听

不做。观测点是**每次提交 / 每次 CAS 写入**（4.1，用户拍板）。"每次保存"需要常驻文件监听（`fs.watch` / 编辑器钩子 / 守护进程），会引入半写状态竞态与跨平台行为差异，且不改变任何一条验收问句的答案。

### 8.3 把编译产物变成第二份可写源

不做。理由沿用既有代码注释的立场（`src/engine/manifest.ts:6` 的 `BUILD_ARTIFACTS` 刻意与 `SOURCE_ROOTS` 分开，注释写明"只冻结源数据，编译产物不能反过来参与自己的输入摘要"）：产物写进台账 ⇒ 台账进摘要 ⇒ 摘要依赖产物 ⇒ 产物依赖摘要，形成自我指涉的不动点。图数据的方向必须单向：**源码 → 图 → 改动记录**，且图只被生成器写。

### 8.4 逐行存内容副本

不做。内容由 git 对象库负责；副本会制造第二份真相（库里的内容与工作区可能不一致，而"哪份对"无解）。

---

## 9. 兼容性与成本

### 9.1 与 CAS digest 范围

**先纠正一个伪问题**：`graphDigest(dataDir)` 的输入是**目标工程的数据目录**（`src/engine/manifest.ts:7` `snapshotProject(dataDir, SOURCE_ROOTS)`，`SOURCE_ROOTS = ['modules','renders','policy.yml','changes']` 都是**相对 `dataDir` 的名字**）。而本仓库根**没有** `modules/` / `renders/` / `policy.yml` / `changes/`（实测：`git ls-files` 无任何 `changes/` 条目；`src/engine/store.ts` 的 `resolveProject` 要求数据目录名以 `normify-` 开头且含 `modules/`）。

⇒ **本仓库根的 `ledger/` 不在任何 `graphDigest` 的输入域内**，"台账/图要不要进 CAS 摘要"在本仓库是**伪问题**。只有当把图放进某个 `normify-*` 数据目录时才需要决定，届时两个选项：

| 选项 | 含义 | 影响 |
| --- | --- | --- |
| (a) 不进摘要 | 图是派生缓存 | 图漂移无 CAS 信号；由 5.5 的 `stale` 状态与门禁兜底 |
| (b) 进摘要（加进该工程的 `SOURCE_ROOTS`） | 每次图写入都改变 `graphDigest` | 会触发下游重算与只读复核的额外差异；且 `graphDigest` 的排序用 `localeCompare`（`manifest.ts:11`），跨平台 ICU 差异会改变摘要值 |

**建议 (a)**：图可从源码重算，进摘要买到的是"图与源码不一致"这个信号——而 5.5 的 `stale`（`universe_hash` 与 git 索引对账）已经用更便宜的方式给出了同一信号。

### 9.2 与 L1/L2/L3 校验

代码里的 L1/L2/L3 是**按域分组**的，不是一套全局分层：

| 域 | L1（单文件形状） | L2（全项目一致性） | L3 |
| --- | --- | --- | --- |
| 模块 frontmatter | `src/engine/frontmatter.ts` | `src/engine/validate.ts:33` 起 | — |
| 渲染数据 layout | `src/engine/layout.ts` | 同文件 L2 段 | — |
| JSON Schema 契约 | `src/engine/contracts.ts` | 同文件 L2 段 | — |
| policy.yml | `src/engine/policy.ts` | 同文件 L2 段 | — |
| 变更记录 | `src/engine/changes.ts` | 同文件 L2 段 | — |
| 编译 | — | — | `src/engine/compile.ts`（校验通过后编译产物） |

**图的接入点**：`src/engine/validate.ts` 的 L2 证据诊断**只作用于目标工程的数据目录**（诊断码 8 个：`evidence/path-unavailable`(299) / `root-no-source`(306) / `source-not-a-file`(321) / `source-missing`(328) / `fingerprint-pending`(334) / `fingerprint-unavailable`(343) / `fingerprint-drift`(346) / `checks-skipped`(351)，全部以 `Module` 为单位）。本仓库自身的图**不在 L2 的域内**，因此 v1 **不**新增 `evidence/*` 诊断码——图的一致性由脚本门禁负责（6.2）。若将来把图放进目标工程数据目录，再考虑 `evidence/graph-stale` 之类的码（不建议在 v1 做）。

### 9.3 与工具契约

**零变更**：图与改动记录的生成/校验走 `scripts/` 与门禁，**不暴露任何 MCP 工具**——避免"模型可以改图"（与增量 1 的立场一致：台账由生成器写、门禁只读）。

**本文档不重复工具数量**：文档里任何「数字 + 个工具」式的断言都会被 `scripts/check-doc-snippets.cjs` 的 `tool-count` 检查拿去与运行时注册数比对（该检查扫描 `docs/**` 与 `skills/**` 下的全部 `.md`），写错即 error。数量受门禁保护、以运行时 `lib/index.js` 的注册数为唯一事实来源，**重复它只会制造一个新的漂移面**。

### 9.4 与五道既有门禁

见 6.3 的分工表（判据是"不重复"）。补充两条硬约束：

- **`check:refs` 会扫描本文档**：文档里引用的路径必须存在于磁盘**且在 git 索引里**（`untracked-reference`：磁盘上有、索引没有 → error）；不得引用 git 历史中已删除的路径（`deleted-reference`）；Markdown 相对链接必须命中目标与真实标题（`dangling-reference` / `dead-anchor`）。**因此本文档对尚未落地的脚本只写行内代码、不写 Markdown 链接**（与旧稿同一策略）。
- **`check:docs` 会扫描本文档**：约束与规避写法见附录 C。

### 9.5 与 `lib/src` 同步

- `lib/` 是**跟踪并提交**的编译产物（实测 84 个已跟踪文件）；`check:libsync` 的判定基准是 **git 索引**而不是工作区（"若比工作区就永远绿，恰好放过它唯一要抓的那种提交"），且**零归一化、逐字节**比对。
- **本设计的落点选择**：图的生成器与门禁放在 `scripts/`（与增量 1 的 `scripts/generate-file-ledger.cjs` / `scripts/check-file-ledger.cjs` 一致）⇒ **不需要改 `src/`、不需要重建 `lib/`**，与 `check:libsync` 零交互。
- 若后续需要把查询能力暴露给宿主（例如让工具能查"谁引用我"），才把实现提升到 `src/`；那时的落地顺序是：改 `src/` → `npm run build` → **同一次提交里**带上 `lib/` → 跑 `check:libsync`。

### 9.6 跨平台 CI

- 当前 CI 只跑 `ubuntu-latest`，Node 22（`actions/setup-node@v4`），`package.json` 的 `engines.node` 是 `>=20`；`actions/checkout` 显式 `fetch-depth: 0`（因为 `check-references` 的 `deleted-reference` 依赖 `git log --diff-filter=D`；浅克隆会让该检查退化成 warning）。
- **确定性要求**（3.6）：UTF-8 字节序排序、LF 归一化行列、不哈希原始字节、路径大小写与索引一致。
- **已知的既有风险点**（不要复制到图里）：`src/engine/manifest.ts:11` 的 `localeCompare`；`src/engine/store.ts` 的 `fingerprintOf` 直接哈希**原始字节**（CRLF 会让同一文件在 Windows 与 Linux 上指纹不同）。
- 若将来把 CI 扩到 Windows 矩阵，图数据的"同一提交两平台逐字节相同"应作为可断言项（增量 6）。

### 9.7 成本：全量重算耗时与体积（实测锚点 + 待实测）

**已实测的锚点**（附录 A）：

| 量 | 实测值 |
| --- | --- |
| `src/**/*.ts` 文件数 / 行数 / 字节数 | 28 / 9,782 / 521,118 |
| `src/` 声明名（含函数内 2,417） | 2,624 |
| `src/` 标识符引用 | 10,336 |
| `src/` 模块说明符边（`import` 声明 + `export … from`） | 220 |
| `src/` 导入绑定 / 类型引用节点 | 672 / 805 |
| 单条节点记录字节（示例字段，`JSON.stringify` + UTF-8） | 199–243 B（n=13，均值 221.3） |
| 单条边记录字节（同上） | 234–270 B（n=20，均值 253.2） |
| 工作区总行数（排除 `node_modules/` 与 `.git/`） | 约 993,000 |
| 已跟踪文件数 / `.git` 目录字节 | 1,399 / 43,479,139 |

**外推（记录数实测 × 单条字节实测，非实测总量）**：`src/` 全量落盘 ≈ 3.1 MiB；采用 2.5 的分层后落盘 ≈ 0.7 MiB。

**待实测项与测量方法**（不得用推测值替代）：

| 待实测项 | 测量方法 | 用途 / 建议阈值（待用户确认） |
| --- | --- | --- |
| `ts.createProgram` 全仓耗时（冷/热） | 单进程计时：`performance.now()` 包住 `createProgram(fileNames, opts)` + `getPreEmitDiagnostics` + 一次完整遍历；冷 = 无 `tsbuildinfo`、OS 文件缓存冷；热 = 连跑 3 次取中位数 | **红线建议：单次 CAS 提交 ≤ 2 s**；超了就必须走增量重算（只重算改动文件 + 其反向闭包） |
| 全仓图的记录数与落盘体积 | 跑一次全量生成，`git ls-files` 逐后缀统计记录数与字节数；与 2.6 的外推值对比 | 判断 2.5 的分层是否够；**红线建议：图数据 ≤ `.git` 的 10%**（当前 `.git` 43,479,139 B ⇒ 约 4.1 MiB） |
| 单文件按需展开耗时（2.5 ④） | 对 `src/tools.ts`（最大，实测 2,371 条记录）与 `src/engine/store.ts` 各展开 10 次取中位数 | 决定"文件内边按需展开"是否可行；**建议 ≤ 20 ms/文件** |
| 跨文件边的精确条数 | 全量 `createProgram` 后按 `from.file !== to.file` 计数 | 校验 2.5 ③ 的规模；`src/` 的下界是实测的 220 |
| `intra_ref_digest` 的误报率（2.5 末） | 对历史提交做回放：算出"摘要变了但引用面语义未变"（仅格式/重排）的比例 | 决定是否放弃摘要、改为"受影响文件一律重展开"；**建议 ≤ 5%** |
| CRLF/LF 两种检出下图的逐字节一致性 | 同一提交分别在 `core.autocrlf=true` 与 `false` 下生成图，逐字节 diff | **0 容忍项**：必须完全相同 |
| 改动记录单条体积 | 取一次真实提交跑出记录，测字节数 | 决定 4.4 的分片与保留策略 |

### 9.8 会被取代 / 需迁移的字段与诊断

| 既有物 | 图落地后的关系 | 是否迁移 |
| --- | --- | --- |
| `Module.source: SourceRef[]`（`src/engine/types.ts:8-12,146`） | 图的**输入**之一（`module-id-reference` 边的来源），**不取代** | 否（保留为声明式事实来源） |
| `Module.fingerprint` + 8 个 `evidence/*` 诊断码 | 仍是"模块漂移"信号；图不接管 | 否 |
| `ChangeData` / `ChangeModules`（`types.ts:113-137`） | 改动记录的**可选外键**（4.3）；图的节点差是它的符号级细化，两者做对账（"声称动了哪些模块" vs "实际动了哪些声明"） | 否；建议新增**对账**项（图说动了、变更没提；或变更说动了、图没找到）——是否升级为 error 待拍板 P5 |
| `scripts/check-references.cjs` 的解析器 | 被抽取为共享模块（3.5），行为逐字节不变 | **是**（纯重构，唯一改动面） |
| 行级溯源相关的一切字段（`chash` / `pre_hash` / `block_start` / `block_end` / `ownership` / `tombstone`） | **从未在本仓落地过任何一条**（`git grep` 无命中），随本方向作废 | 不存在迁移 |
| 台账四态词汇（`bound` / `exempt-pattern` / `grandfathered` / `unowned`） | 按第 7 节校准为 `owned` / `exempt` / `accounted`（`unowned` 语义保留为 error 的判据，不再作为状态名） | **是**（`schema_version` 1 → 2，最小完整改动面见 7.6） |

---

## 10. 分期增量（重排）

> 原则：每期都能**独立验收**（脚本或测试断言），且**不**要求后续期存在。行级增量（原方向的"行级归属 / 墓碑 / G2 扩展 / 块大小定标"）**全部删除**，替换为下面的符号级路径。

### 增量 1 落地偏差记录（补记，2026-10-05）

> **为什么要补这一节**：增量 1 的实现方把 3 处偏差记在**旧设计稿**（原路径 `docs/DESIGN-line-provenance.zh-CN.md`）里；该稿被本文档**改名取代**，那节记录随之丢失。本节的写法照用户指令：逐条写清「偏差内容 / 原文档的说法 / 为何按用户指令实现 / 影响面」，并给出**可在当前仓库里复核**的证据锚点。
>
> **一处必须说明的取证边界**：旧稿从未进入 git（`git log --all -- docs/DESIGN-line-provenance.zh-CN.md` 无输出），改名后工作区与索引里也不再有旧路径（`git grep -n "DESIGN-line-provenance"` 在本仓库**零命中**）—— 因此下表「原文档的说法」一列**无法逐字引用旧稿原文**，只能引用**本文档承接下来的同一批命题**（§10 增量 1 小节、附录 A）与仓库里可复核的事实，并明确指出哪一句是被本次落地推翻的假设。不写"我记得旧稿写了……"这类无法复核的转述。

| # | 偏差内容（实测） | 原文档的说法（承接自旧稿的同一命题） | 为何按用户指令实现 | 影响面 |
| --- | --- | --- | --- | --- |
| **1** | **新增了第 5 道门禁**：`scripts/check-file-ledger.cjs`（`npm run check:ledger`）+ 配套写入侧 `scripts/generate-file-ledger.cjs`（`npm run ledger:gen` / `check:ledger:gen`），并把 `ledger/file-ledger.json` 作为唯一新增数据文件 | 旧稿的分工假设是"门禁数量不变、复用既有解析器"；该假设在本文档里已被改写为**既定事实**——§6.3 标题即"与五道既有门禁的分工"（`docs/DESIGN-code-graph.zh-CN.md:547`），第 11 节 P1 也记着"增量 1 已经把门禁从 4 道推到 5 道"（`:843`、`:545`） | 用户的增量 1 目标就是"让『这个文件有没有人管』变成可断言的机器事实"。既有四道门禁没有一道管**文件归属**：`check-references` 管引用完整性、`check-doc-snippets` 管文档示例、`check-lib-sync` 管产物逐字节、`check-examples` 管示例可执行。不新增门禁就只能"描述"归属而不能"断言"它 | 门禁计数 4 → 5；`package.json`（`check:ledger`/`check:ledger:gen`/`ledger:gen`/`check` 链）、`.github/workflows/ci.yml`（两个独立 step）、`CONTRIBUTING.md:22-34` 三处同步；后续增量新增门禁时**必须**按这套三处同步走（§6.3 末段 `:558` 已写成约束） |
| **2** | **改动了 `src/` 行为**：索引里 `src/*.ts` 的改动面是 18 个文件（`git status --porcelain -- src` 有 18 条，含新增的 `src/execution.ts`） | 本文档两处写"不改 `src/` 行为、不需要重建 `lib/`"（文档头边界声明 `docs/DESIGN-code-graph.zh-CN.md:7`、§9.5 `:706`）。但这两句的**主语是"图与改动记录的生成器"（第 2–6 节的新方向）**，不是增量 1：增量 1 的门禁脚本本身只读、确实不碰 `src/`；改动 `src/` 的是同一工作区里**另一批已暂存的引擎改造**（`git diff --cached --stat -- src`：17 个文件的差异统计为 524 插入 / 157 删除，另加新增的 `src/execution.ts`，合计 18 条） | 该批 `src/` 改动早于本轮、已 `git add` 进索引在本轮之前，不是增量 1 的产物；本轮（R4 + 文档对齐）**一个字都没有改 `src/`**（改动前后 `git status --porcelain -- src` 输出逐字节相同） | ⚠ **必须区分两个命题，否则会把"增量 2 不改 `src/`"误推成"增量 1 没改 `src/`"**：① 增量 2 的落点选择（生成器放 `scripts/`）⇒ 与 `check:libsync` 零交互；② 增量 1 落地时的 `src/` 改动面 = 索引里那 18 个文件。二者都真，但说的不是同一件事。本轮只**记录**这张改动面，不动它（触碰它会牵连 `lib/` 重建与 `check:libsync`，超出本轮范围） |
| **3** | **跨文档引用的行号与命中范围更正**：脚本内枚举（`CHECK_TITLES`）、`--help`、人类报告、`--json` 的 `summary.checks` 曾各自演进，文档里引用的"行号 / 命中范围"随之失效，必须按当前实测值写 | 旧稿与本轮的早期引用给过已失效的锚点，例如"台账豁免模式的 2-115 行"；按**当时**文件实测，`exempt_patterns` 数组的范围是 **18-115 行**（`:18` 是数组起点、`:116` 是 `grandfathered` 起点）——**该内嵌数组已在 v2 迁到 `ledger/exempt.gitignore`，这两个行号只是改造前的历史锚点，现状不再适用**；旧的 `tracked-mismatch / unlisted` 检查名现已不存在，被拆成 `tracked-mismatch`（`:120`）、`ledger-index-drift`（`:119`）、`ledger-missing`（`:118`）三项 | 用户要求"结论必须带文件:行号"，行号写了就得能复核；引用一个已改名或已删的入口，等于制造第二份真相互相矛盾 | 只动**引用与措辞**，不动任何判定与数字。本轮（v2 语义校准）复核后的实测值：门禁 `scripts/check-file-ledger.cjs` **1997 行**、生成器 `scripts/generate-file-ledger.cjs` **732 行**、共享内核 `scripts/file-ledger-core.cjs` **462 行**、台账 `ledger/file-ledger.json` **168 行 / 10131 B**、豁免清单 `ledger/exempt.gitignore` **56 行**、`CONTRIBUTING.md` **88 行**（上一轮的 1,426 行 / 403 行 / 147 行 / 82 行已被本次语义校准取代，本节按新值更正） |

**本轮顺带修正的 3 处已失效交叉引用**（与上表第 3 条同源，只改引用、不改判定）：

1. `docs/DESIGN-code-graph.zh-CN.md:14` 原写 "由本门禁的 tracked-mismatch / **unlisted** 检查报出" —— `unlisted` 在本门禁里**不存在**，已改为 `tracked-mismatch` / `ledger-index-drift` / `ledger-missing` 三项（它们负责台账与索引不一致这一族）。
2. §7.6 表（`docs/DESIGN-code-graph.zh-CN.md:621`）里的 "147 行里的 18-115 行" 已标注为**实测**范围，并写明两条边界分别落在 `:18` 与 `:116`。
3. §6.3 的 "**五道**既有门禁"（`docs/DESIGN-code-graph.zh-CN.md:547`）与第 11 节 P1（`:873`）的计数口径统一：门禁总数 = **5**（含增量 1 新增的 `check:ledger`），`check:ledger:gen` 是同一道门禁的写入侧校验，不另计一道。

**§7.6 承诺的「台账语义校准」已落地（2026-10-05，后续增量）**：`owned` / `exempt` / `accounted`、豁免抽成独立文件（`ledger/exempt.gitignore`）、`accounted` 补清点日期与依据、`.gitignore` 交叉校验、`schema_version` 1 → 2 **全部实现**，与上表的缺陷修复（R1/R2/R3/R4/R6/R7/R8）分两批进行：上表是本轮（R 系列）的偏差记录，语义校准是随后一轮的落地，两者都在本节的"增量 1"里留了实测锚点。改造前的状态**不再代表现状**，现状以第 7 节的状态行与下面的 v2 小节为准。

### 增量 1：全仓文件台账（**已落地**）

- **产物（实测存在）**：数据 `ledger/file-ledger.json`（168 行 / 10131 B，`schema_version: 2`）+ 独立豁免清单 `ledger/exempt.gitignore`（56 行 / 19 条模式）；生成器 `scripts/generate-file-ledger.cjs`（732 行）；门禁 `scripts/check-file-ledger.cjs`（1997 行，`CHECK_TITLES` **13 项**）；两者共用的内核 `scripts/file-ledger-core.cjs`（462 行，唯一事实来源）。
- **接线（实测存在）**：`package.json` 的 `check:ledger` / `check:ledger:gen` / `ledger:gen`，并已追加进 `check` 链；`.github/workflows/ci.yml` 的 "File ledger guard (four-state ownership ratchet)" 与 "File ledger generator check" 两个独立 step；`CONTRIBUTING.md` 的检查项清单（13 项）与快照行。
- **状态：已落地（v2 语义校准完成）。** 机器可算部分能生成并与 git 索引对账（`meta.universe_hash` = `sha256(sort(git ls-files).join('\n') + '\n')`、`meta.tracked_total` = 1402）。独立验证方在 2026-10-05 给过一次 **fail**（实测假绿 + 文档与实现逐字矛盾），随后两轮按清单修完：
  - **R1 门禁可被一条豁免模式静默关掉** → 「过宽模式」三条判据保留（判据 1/2 不可人工确认；判据 3 可用 `broad_confirmed=true` 人工确认），被判过宽的模式**不参与匹配**。负例：`tests/file-ledger-ratchet-e2e.mjs` 第 4 组断言豁免清单里一条 `**` → **exit 1**、报 `exempt-too-broad-no-literal`。
  - **R2 棘轮可被官方修复命令洗白** → 生成器只保留基线清单里、且仍满足条件的条目。负例：第 3 组断言「新增无条目文件 + 跑一次生成器」不会把它写进 `accounted`，门禁仍 **exit 1**（`unowned-file`）。
  - **R3/R7 索引里的台账陈旧** → 判定基准 = **git 索引 blob**（台账与豁免清单**两份**都是），工作区不一致 → `ledger-index-drift`（error）。
  - **R6 死 check id `ledger-missing`** → 台账缺失 / 不可解析 / 结构非法三处改报 `ledger-missing`；`guard-unavailable` 只留给 git / yaml / 模块文件 / `git check-ignore` 输出不可用。
  - **R8 小项** → 四态计数之和有真正的 invariant 断言；`meta.known_divergences` 与 `meta.exempt_file` 纳入必填结构校验；`--json` 顶层 `root` 回显请求路径；`**` 语义写进 `--help` 与 `CONTRIBUTING.md`。
  - **手工洗白后门（第三轮）** → 棘轮基线改为 **HEAD 版台账**。负例：第 5 组断言「手工把一条在索引里的路径写进 `accounted` + `git add`」→ 门禁 **exit 1**（`accounted-added-vs-head`）、生成器 `--check` **exit 1**；第 5b 组断言「条数不变但集合不相等」仍 **exit 1**。
  - **v2 语义校准（本轮）** → 四态 `owned` / `exempt` / `accounted` / `unowned`；豁免抽成独立文件（gitignore 语法 + 每条必填 reason + 未命中告警 + 过宽判据）；`accounted` 每条带 `accounted_at` + `basis`（缺依据 → `accounted-invalid`/error）；与真 `.gitignore` 交叉校验（交集 / 折叠误伤 / 放行本该 `git add` 的普通文件，都是 error）；`--help` 与 `CONTRIBUTING.md` 写明「绿灯依据 = 台账里有条目」「在 HEAD 里不是绿灯理由」「`accounted` 不是欠账，是已记账的正账」。
- **本轮实测口径（2026-10-05，命令照抄可复现）**：
  - `node scripts/check-file-ledger.cjs --json` → `trackedTotal: 1402`、`states: {owned: 0, exempt: 1373, accounted: 29, unowned: 0}`、`statesSum: 1402`、`exempt.total: 19`、`exempt.gitignoreCrossCheck: {交集 0 / 折叠误伤 0 / 放行本该 git add 的普通文件 0}`、`moduleCoverage.percent: 0`。`.github/workflows/ci.yml` 的 File ledger guard 注释快照行与之一致（1,402 / 0 / 1,373 / 29 / 0，豁免 19 条）。
  - `git ls-files --others --ignored --exclude-standard` → **4336**（其中 `node_modules/` 4315）；台账 `meta.known_divergences` 的自述数与之一致。
- **仍遗留（明确记账）**：
  - **P4（`accounted` 条目依据失效时报 error 还是 warning）**：本轮实现取**折中**，与第 11 节 P4 的推荐值 (a) 不同，如实记账——**字段缺失 / 空依据 → error**（`accounted-invalid`），**条目腐烂**（已 `owned` / 已豁免 / 已从索引消失 / 重复）**仍为 warning**（`accounted-removable`，报告回显"还可再减 N 条"）。理由：腐烂是清单卫生问题，条目本身的依据仍在；把它做成 error 会让"把一条已记账路径改成豁免"这类合法动作直接变红。
  - 行级内容溯源**整套作废**（§8.1），不再实现。
- **可被脚本或测试断言的验收标准（本轮全部有断言）**：
  1. 台账数据文件存在且可解析；`git ls-files` 的每一条都能在台账里查到条目（三来路之一），查不到即 error —— `tests/file-ledger-ratchet-e2e.mjs` 第 3 组（exit 1 + 逐条点名）；
  2. 新增一个已跟踪文件后，门禁**退出码非 0** 且点名该文件 —— 同上（第 3 组）；
  3. 给该文件补上条目后门禁退出 0 —— 第 7 组（合法缩小 → exit 0）；
  4. **豁免独立文件**存在、每条带非空理由；缺理由 → 退出码非 0 —— 第 1 组（干净态解析）+ 门禁 `exempt-invalid`（error）；
  5. **`.gitignore` 交叉校验**：构造一条会在 `.gitignore` 与豁免清单上同时命中的模式，门禁必须报出 —— 第 6 组（`*review*.md` 复现真实事故：交集 + 折叠误伤，exit 1）；
  6. `accounted` 每条都有非空 `accounted_at` 与非空 `basis`；缺失 → 退出码非 0 —— 第 2 组（缺 `basis` → exit 1，生成器同样 fail-closed）。
  - 全链证据：`npm test` 里的 `file-ledger-ratchet-e2e.mjs` 共 **62 条断言全通过**（含两条验收项：「`schema_version` 不匹配 → 门禁与生成器都 exit 1」与「豁免条目缺 `reason` → exit 1」）；`npm run check:ledger` 与 `npm run check:ledger:gen` 在本轮提交后 **exit 0**、`npm run ledger:gen` 再次运行报告"未改动文件"（幂等）。
- **不做**：不做符号级图、不做改动记录、不碰工具契约、不跑全仓重算。

### 增量 2：文件级引用图 + 改动记录骨架

- **范围**：先只做**文件层**——复用 `check-references.cjs` 的解析器（3.5 的抽取）产出文件级节点与边，落盘为分片图；同时建立改动记录的目录、命名与字段（4.4 / 4.5），观测点 = 每次提交 / 每次 CAS 写入。
- **改动面**：新增 `scripts/lib/reference-parsers.cjs`（纯抽取，`check-references.cjs` 改为 require 它，行为逐字节不变）；新增图生成器与 `ledger/graph/`、`ledger/changes/`；`check-references.cjs` 本身**不改判定**。
- **可被断言的验收标准**：
  1. 抽取前后各跑一次 `node scripts/check-references.cjs --json`，两份输出**逐字节相同**（证明纯重构）；
  2. 文件级图的边集合 ⊇ `check-references` 报出的悬空边目标集合（同源校验，6.1）；
  3. 生成器幂等：同一工作区连跑两次，图数据**逐字节相同**；
  4. 一次真实提交后生成一条改动记录，字段齐全（4.5 的必填项），且 `from_snapshot.universe_hash` 等于提交前的 `git ls-files` 摘要；
  5. `universe_hash` 与当前索引不一致时，查询返回 `completeness: "stale"`（不是空数组）。
- **不做**：不做符号解析（不建 `createProgram`）、不做函数内变量、不做传递闭包。

### 增量 3：符号级跨文件解析

- **范围**：接入 `ts.createProgram` + `getTypeChecker`，把 `import` / `export-from` / `type-reference` 边从文件级提升到**符号级**，并穿透 `export *` 再导出（`src/index.ts` 是主要受益者）。
- **改动面**：图生成器新增 program 路径；`meta.ts_version` 落盘；`.mjs`/`.cjs` 按 3.4 退化并标注。
- **可被断言的验收标准**：
  1. 对 `src/index.ts` 的再导出，`import { createNormifyTools } from './index.js'` 的目标符号解析到 `src/tools.ts` 的**真实声明**，而不是 `src/index.ts`；
  2. 同名符号（`src/engine/store.ts` 与 `src/engine/edit.ts` 各自的 `load`）在图中是**两个不同的目标**，不得合并；
  3. 每条边的 `to.sym` 要么是已解析的声明 id，要么 `status ∈ {unresolved, external, ambiguous, dangling}` 且原因可查——**不存在"静默 null"**；
  4. 全仓 `createProgram` 耗时与体积按 9.7 的方法测出并回填本文档（把"待实测"改成实测值）。
- **不做**：不做函数内局部变量与参数（增量 4）、不做查询接口。

### 增量 4：最小变量（函数内局部变量与参数）与按需展开

- **范围**：把 `decl_kind ∈ {variable(函数内), parameter}` 全部纳入节点表（用户原话「最小的变量也要」）；实现 2.5 ④ 的按需展开——文件内边不落盘，查询时对单文件重解析。
- **改动面**：节点枚举的作用域栈（3.2）；`intra_ref_digest` 与 `affected_files`（4.2）。
- **可被断言的验收标准**：
  1. `src/` 的节点数 = 2,624 ± 并行改动引起的漂移，且**函数内声明（2,417）逐条可查**；随机抽 20 个局部变量，每个都能回答"谁引用它"且答案与该文件的重新解析一致；
  2. 删除一个函数内局部变量并重算，改动记录的 `declarations.removed` 恰好含它一条；
  3. 按需展开耗时按 9.7 的方法测出；若 > 20 ms/文件，必须回退到"文件内边也落盘"并记录该取舍；
  4. **跨文件传播不穿过文件内边**这一点有测试：构造"局部变量 A 被同文件私有函数 B 使用、B 被另一文件引用"的夹具，删除 A 的传递闭包必须包含那个另一文件（证明 2.5 ④ 的判据成立）。
- **不做**：不把文件内边默认落盘（除非验收标准 3 触发回退）。

### 增量 5：查询接口（三个问句落地）

- **范围**：实现 5.1 / 5.2 / 5.3 / 5.4 四个查询，含 `completeness` 降级契约（5.5）。
- **改动面**：`scripts/` 下的查询 CLI（`--json`）；**不新增 MCP 工具**（9.3）。
- **可被断言的验收标准**：
  1. Q1/Q2 对同一目标互为反向：`A ∈ inbound(B)` ⟺ `B ∈ outbound(A)`（在 `completeness` 相同的条件下）；
  2. Q3 的传递闭包在含环的图上**终止**且回显 `cycles[]`（`src/index.ts` 的再导出与 `src/engine/*` 的互引是现成夹具）；
  3. Q3 的结果区分 `type_only`：删一个纯类型导出，运行时引用数为 0 而类型引用数非 0；
  4. **不得假绿**：故意移除一个已跟踪文件使 `universe_hash` 失配，查询必须返回 `stale` 而不是空数组；故意让一个目标文件不可读，必须返回 `unknown`（对应 `check-references` 的"读不到就必须红"）。
- **不做**：不做变更影响门禁（增量 6）、不做跨平台矩阵。

### 增量 6：变更影响门禁 + 规模与跨平台定标

- **范围**：落地 6.2 的"本次改动引入了未处理的引用影响 → error"（归属按 P1 拍板）；补齐 9.7 剩余待实测项；把 9.8 的变更意图对账项落地（按 P5 拍板）。
- **改动面**：若 P1 选 (b)：新增 `scripts/check-change-impact.cjs` + `package.json` 的 `check:impact` + `ci.yml` 独立 step + `CONTRIBUTING.md` 检查项清单与快照行（三处同步）。
- **可被断言的验收标准**：
  1. 构造一次"删了被引用的符号但未处理"的提交，门禁**退出码非 0** 并点名未处理的引用方；
  2. 把 `handling.status` 补成 `handled`（或带 `note` 的 `waived`）后，门禁退出 0；
  3. 删一个**无人引用**的符号，门禁退出 0（不误报）；
  4. 9.7 的待实测表**全部填上实测值**，且"单次 CAS 提交 ≤ 2 s"、"图数据 ≤ `.git` 的 10%"、"CRLF/LF 逐字节一致"三项通过；任一不过则按表里的降级路径处理并回填本文档。
- **不做**：不为跨平台一致而牺牲 3.6 的确定性规则。

---

## 11. 未决问题（需用户拍板）

| # | 问题 | 建议选项 | 我的建议与理由 |
| --- | --- | --- | --- |
| **P1** | 6.2 的"未处理引用影响"检查放哪？ | (a) 塞进 `scripts/check-references.cjs` 的新 check id；(b) 新增 `scripts/check-change-impact.cjs`（第 6 道门禁）；(c) 只做查询、不做门禁 | **(b)**：它依赖图快照与改动记录（有状态），而 `check-references` 的核心不变量是"无状态、只信任 git 索引、可对任意 `--root` fail-closed"。代价是门禁数量再 +1（增量 1 已把 4 道推到 5 道）。若用户不接受第 6 道门禁，退 **(a)** 但需接受该脚本边界被破坏 |
| **P2** | 图数据放哪？ | (a) 仓库根 `ledger/graph/`（与增量 1 同域）；(b) 仓库根新目录 `graph/`；(c) 放进某个 `normify-*` 数据目录 | **(a)**：与 `ledger/file-ledger.json` 同域，`ledger/**` 已在台账豁免模式内（`git ls-files` 宇宙一致），且 9.1 已证明它不在任何 `graphDigest` 域内 |
| **P3** | 类成员（`property` / `method`）算不算节点？ | (a) 算（完整）；(b) 只记边不记节点 | **(b) 起步**：类成员可由所属 `class` 节点派生，先记边即可回答"谁引用了这个成员"；节点化留到有实际问句时再加 |
| **P4** | `accounted` 条目依据失效时报 error 还是 warning？ | (a) error；(b) warning（沿用现状 `grandfathered-removable` 的级别） | **本轮实测取折中（与推荐值 (a) 不同，如实记账）**：字段缺失 / 空依据（缺 `accounted_at` / `basis`）→ **error**（`accounted-invalid`）；**条目腐烂**（已 `owned` / 已豁免 / 已从索引消失 / 重复）→ **warning**（`accounted-removable`）。理由：腐烂是清单卫生问题，条目本身的依据仍在；升为 error 会让"把一条已记账路径改成豁免"这类合法动作直接变红 |
| **P5** | 图与 `ChangeModules` 的对账不一致时报什么？ | (a) error；(b) warning；(c) 只报告不断言 | **(b)**：两者是"人工声明"与"机器事实"，不一致既可能是漏声明也可能是解析缺口（3.4 的退化）；先按 warning 观察，等增量 3 的解析精度实测出来再决定是否升 error |
| **P6** | `exempt` 的独立豁免文件叫什么、放哪？ | (a) `ledger/exempt.txt`（gitignore 语法，纯文本）；(b) `ledger/exempt.json`（每条 `{pattern, reason, since}`）；(c) `.normifyignore`（仓库根，独立于 `ledger/`） | **(a) 的变体：`ledger/exempt.gitignore`**（纯文本、gitignore 语法、与台账同域）+ **行尾字段约定** `<pattern> ## reason=<非空理由> [ ## since=YYYY-MM-DD ] [ ## broad_confirmed=true\|false ]`——纯文本保住"像 .gitignore 一样好写"，行尾 `key=value` 保住"每条必填理由"可机器校验（缺理由 → `exempt-invalid`/error）。用户口径优先于本表原推荐值 (b)：JSON 字符串里装 gitignore 语法既不好写，也表达不了 `#` 注释 |
| **P7** | 观测点的"每次 CAS 写入"具体挂在哪？ | (a) 引擎写 `graphDigest` 域时顺带触发；(b) 由宿主（PromptManager）在 CAS 成功回调里触发；(c) 只做提交级、CAS 级留到宿主明确后再做 | **待用户拍板**：本仓库无法单方面决定 CAS 写入的触发点（`graphDigest` 的域在目标工程数据目录，见 9.1）。在拍板前，增量 2 只实现**提交级**观测点并保留 `kind: "cas-write"` 字段 |
| **P8** | 图不分片 vs 分片？分片键用什么？ | (a) 单文件；(b) 按文件路径 UTF-8 字节序连续段分片；(c) 按目录分片 | **(b)**：单文件会让"改一个文件"变成"重写整个图"（写放大最差）；按目录分片会让 `src/engine/` 这种高频目录成为热点。分片粒度与体积的最终取舍按 9.7 的实测定 |
| **P9** | `src/` 之外的覆盖面？ | (a) 全部已跟踪文本文件；(b) 先 `src/` + `scripts/` + `tests/`，`examples/` 留到规模实测后 | **(b)**：`examples/` 占工作区行数的绝大部分（工作区约 99.3 万行 vs `src/` 9,782 行），而它几乎不改；先在有改动密度的地方拿到精度，再按 9.7 的实测决定是否外扩 |

---

## 附录 A：复现清单（实测命令与原始输出）

| # | 目的 | 命令 | 原始输出/结论 |
| --- | --- | --- | --- |
| 1 | 旧路径是否被引用（改名前核实） | `git grep -n -i "line-provenance"`；`git grep -n -i "provenance"` | 改名前：前者**仅命中旧文档自身的标题行**；后者命中的全是 `examples/` 里目标工程的业务词（`ProvenanceChain` 等），与本设计无关。`package.json` 的 `files` 字段只列 `docs/SPEC.zh-CN.md` ⇒ **改名安全，零悬空引用**。改名后复跑：前者唯一的命中就是**本表格这一行**（它记录的是一条历史检索命令，不是路径引用；`check-references` 的 `dangling-reference` / `deleted-reference` 均为 0），`git ls-files docs` 里已无旧路径 |
| 2 | 仓库状态 | `git status --porcelain`；`git config --get core.ignoreCase` | 无 `??` 条目；`core.ignoreCase=true` |
| 3 | `src/` 图元素普查 | `node <临时只读脚本>`：`ts.createSourceFile` 逐文件遍历（`declaration_names` / `identifier_references` / `ImportSpecifier` / `TypeReferenceNode` / `ImportDeclaration` / `ExportDeclaration`）；TypeScript **5.9.3**（仓库自带 `node_modules/typescript`） | `ts_files=28`、`declaration_names=2624`（顶层 207 / **函数内 2417**）、`identifier_references=10336`、`import_declarations=201`、`export_from_declarations=19`、`import_specifiers=672`、`type_reference_nodes=805`、`dynamic_imports=0`、`require_calls=0`；逐文件最大 `src/tools.ts` 2371 条、均值 462.6、最小 `src/index.ts` 0 条 |
| 4 | 规模 | `Get-ChildItem -Recurse src -Filter *.ts` 逐文件统计 `\n` 数与字节；工作区同法（排除 `node_modules/`、`.git/`） | `src/**.ts`：9,782 行 / 521,118 B；工作区：约 992,790 行（部分二进制/空文件读取报错，不影响量级） |
| 5 | 单条记录字节 | 用本文档 2.2/2.3 的字段构造**真实**记录（真实文件、真实行列）后 `JSON.stringify` + `Buffer.byteLength` | 节点记录 199–243 B（n=13，均值 221.3）；边记录 234–270 B（n=20，均值 253.2） |
| 6 | 索引与目录规模 | `git ls-files` / `git ls-files 'src/*.ts'` / `git ls-files 'lib/*'`；`Get-ChildItem .git -Recurse \| Measure-Object Length -Sum` | 已跟踪 **1,399**；`src/*.ts` **28**；`lib/*` **84**；`.git` **43,479,139 B** |
| 7 | `changes/` 是否存在 | `git ls-files \| Select-String 'changes/'`；`Get-ChildItem -Recurse -Directory -Filter changes` | **两处均无命中** ⇒ 本仓库没有 `changes/` 目录；`changes` 只是目标工程数据目录的源根名（`src/engine/manifest.ts:5`） |
| 8 | 豁免误伤事故的现场 | `Get-Content examples/bilibili-pi-full/.gitignore`；`git check-ignore -v <preview.md>`；读 `ledger/file-ledger.json` 的 `meta.known_divergences` | `.gitignore` 含 `*review*.md` 与注释「注意 "preview" 含子串 "review"，会被 `*review*.md` 误伤，故显式反选」+ 反选规则 `!**/modules/**/*.md`；当前 `git check-ignore -v` 对那两个文件**无输出**；台账 `known_divergences[0]` 记录了该历史 |
| 9 | 门禁基线（改稿前） | `node scripts/check-references.cjs`；`node scripts/check-doc-snippets.cjs` | 两者均 **EXIT 0** |
| 10 | 门禁复跑（改稿后） | 同上 | 两者均 **EXIT 0**（0 error / 0 warning）；`git status --porcelain` 无 `??` |
| 11 | 改名的连带影响核实 | `node scripts/check-file-ledger.cjs`；按 `scripts/generate-file-ledger.cjs:250-261` 的算法复算索引哈希，并做"旧路径在 / 新路径不在"的反事实复算 | 台账门禁 **EXIT 1**，报 `ledger-universe-hash-drift`；反事实复算结果与台账存值**逐字符相同** ⇒ 漂移由本次改名唯一造成；修法是重跑 `npm run ledger:gen`（见附录 C） |

> 说明：#3/#5 的探针是**一次性只读脚本**，写在 `%TEMP%` 下、只读仓库文件、不写任何仓库内文件；用后删除。测量方法已完整写入本表，任何人可复现。

## 附录 B：术语速查

- **符号级引用图（code graph）**：节点 = 文件 + 声明（含函数内局部变量与参数）；边 = 引用关系（10 种 kind）。
- **三个问句**：谁引用我（inbound）/ 我引用谁（outbound）/ 删了我什么会断（传递闭包）。
- **观测点**：每次提交 / 每次 CAS 写入（**不是**每次保存）。
- **改动记录**：两份图快照之差 + 受影响引用方 + 处理状态。
- **落盘 vs 按需展开**：跨文件边必须落盘（最贵、不可重算）；文件内边按需展开（O(单文件)）。
- **三来路（台账）**：`owned`（有模块归属）/ `exempt`（独立豁免文件 + gitignore 语法 + 每条必填理由）/ `accounted`（已清点记账 + 日期 + 依据）。
- **绿灯依据**：**台账里有条目**。不是"在 HEAD 里"，也不是"祖父清单里挂着"。
- **不得假绿**：查询必须带 `completeness`；`unknown` / `stale` 不得被读成"没有引用"。
- **0 容忍项**：UTF-8 字节序排序（不用 `localeCompare`）；LF 归一化行列；CRLF/LF 两平台图逐字节一致；图不得成为第二份可写源。

## 附录 C：本文档自身的门禁约束（写作规范，供后续修改者遵守）

本文档落在 `docs/` 下，会被两道门禁扫描，以下约束是实测出来的、**违反即红**：

| 门禁 | 约束 | 依据 |
| --- | --- | --- |
| `scripts/check-doc-snippets.cjs` | ① **不要写「数字 + 个工具」/「数字 + tools」/「exposes all + 数字」**——它会被 `tool-count` 拿去与运行时注册数比对，而该检查的正则是 `/(\d+)\s*个工具/g`、`/(\d+)\s+tools?\b/gi`、`/exposes\s+all\s+(\d+)/gi`（**不带 lookbehind**），因此连中文序数写法也会被当成数量断言。本文档的做法是**不重复该数字**；② `ts` 代码块若含包 `import`/`require('@promptmanager/code-normify…')` 会被还原成 `.ts` 并以 `--noEmit --strict` 编译，**编译不过即 error**；`js`/`cjs`/`mjs` 块里出现包 import/require 却未被编译也是 error；③ 散文里以「形参清单」形式描述工具的执行签名会与 `lib/types/tools.d.ts` 比对，**错名/错序即 error**（写成省略号形式则按"不是形参清单"跳过） | 脚本内 `COUNT_CLAIMS`、`CODE_LANGS`/`COMPILABLE_LANGS`、`checkExecuteSignature` |
| `scripts/check-references.cjs` | ① 引用的路径必须**存在且在 git 索引里**（`untracked-reference` → error）；② 不得引用 git 历史中已删除的路径（`deleted-reference`，完整路径 error / basename warning）；③ Markdown 相对链接必须命中目标与真实标题（`dangling-reference` / `dead-anchor`）。**本文档因此对尚未落地的脚本只写行内代码、不写 Markdown 链接** | 脚本内 `CHECK_TITLES`(84-94) 与各 `check*` 实现 |

**改名的连带影响（已实测，不是推测）**：`scripts/check-file-ledger.cjs` 的 `tracked-mismatch` 检查要求 `ledger/file-ledger.json` 的 `meta.universe_hash` 等于 `sha256(按码点升序排序后的 git ls-files 清单 join('\n') + '\n')`（算法见 `scripts/generate-file-ledger.cjs:250-261`）。本文档改名（删旧路径、增新路径）改变了该清单，实测后果：

| 项 | 实测值 |
| --- | --- |
| 台账里存的 `meta.universe_hash` | `2ccf4b7fcbebabe343254a7732b6153da8e770d2ce0a47ebd26fa51753a3942c` |
| 改名后按上述算法复算 | `72f515834bc893835595bc4c3d92ff29866ba572c198ab9726366039d6c2c4ae` |
| 台账门禁输出 | `ERROR ledger/file-ledger.json:1 -> meta.universe_hash [ledger-universe-hash-drift]` → **EXIT 1** |
| 归因验证（决定性） | 把索引换成"旧路径在、新路径不在"后复算 = `2ccf4b7f…`，**与台账存的值逐字符相同** ⇒ 该漂移由本次改名**唯一造成**，不是并发工作流带来的 |
| `tracked_total` | 旧 1399 / 新 1399（**数量不变**，只有哈希变——因为改名是"删一个、加一个"） |

⇒ **必须重跑 `npm run ledger:gen`** 重新生成台账，否则 `check:ledger` 会红。**改名本身不改台账条目**：`ledger/file-ledger.json` 的豁免模式已含 `docs/**`，新路径无需新增条目（这也是为什么唯一要做的动作就是重跑生成器）。
