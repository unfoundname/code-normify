# 符号级引用图 + 改动记录：设计（DESIGN-code-graph）

> 状态：设计稿（**方向变更版**）。本文档取代同目录下原「行级溯源 + 全仓文件台账」设计稿，原稿已删除、旧路径不留悬空引用（核实方式见附录 A 第 1 条）。
> 方向依据（用户原话，逐字引用）：①「其实我们只需要知道删了某个夹具后相互之间的引用，引用和被引用之间的关系就好了」；②「最小的变量也要，就是每做一个改动都有」；③ 观测点确认为「每次提交 / 每次 CAS 写入」（**不是**每次保存）。
> 取证基线：`git status --porcelain` 无未跟踪（`??`）残留；`git config --get core.ignoreCase` → `true`；`git ls-files` 共 1,399 条；`package.json` 版本 0.8.0；仓库自带 TypeScript 5.9.3。
> 数字口径：标「实测」的数字一律给出命令与原始输出（附录 A）；**未实测的一律标「待实测」并写出测量方法**，不写推测值。凡标「外推」的数字都由两个实测值相乘/相加得到，并写明是哪两个。**「实测」是带时点的快照，不是恒真式**——`git ls-files` 条数、各文件行数/字节数都会随后续提交变化，复核时请按同一条命令重测；历次复核：1,399（原稿）→ **1,402**（补版本字面量门禁轮）→ **1,412**（本批：增量 2 的改动记录一侧落地，新增 5 个文件），各文件的行数/字节数见 §7.6 数据行（**那是本批快照，不是现值**；现值请按同一条命令重测）。
> **引用约定**：本文档引用代码位置时，**行号是写作时点的**，会随改动漂移。读的时候**不要信行号**——
> 请用行内给出的**引文片段**去 `grep` 定位（本文档尽量同时给"路径 + 引文"）。
> 若你发现某处行号已漂移，**改动本身不必迁就本文档**；请就地补一句「（写作时为 `旧坐标`，已漂移）」，
> 这样后来人能看到这条引用曾经指向哪里。
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
| **Q1** | **谁引用了它？**（直接入边） | ⚠ 部分（仅文件级、且不持久化） | `scripts/reference-graph-core.cjs` 的 `collectSpecifiersWithKinds`（`ts.createSourceFile` + 语法树遍历，逐文件取 import/export-from/require/动态 import 说明符；写作时为 `scripts/check-references.cjs:2184-2209`，已漂移——该坐标今天是 `reportUntrackedReference` 与 `checkUntrackedMarkdownLinks` 两段检查，解析器已抽到共享内核）能回答"哪些文件 import 了这个文件"，但**只用于判悬空、不建图、不落盘**，每次都要全仓重扫；`src/engine/types.ts:113-119` 的 `ChangeModules` 只有模块 id 级，无符号 |
| **Q2** | **它引用了谁？**（直接出边） | ⚠ 部分（同上） | 同上；另有一条**声明式**近似：模块的 `deps`（`src/engine/reference.ts` 的 `DEPS_REFERENCE`）是人工在 `modules/*.md` 里写的箭头，不是从源码解析出来的引用 |
| **Q3** | **删了它之后哪些引用会断？**（直接 + 传递闭包） | ❌ 不能 | 现有门禁只做**存在性**判定：`dangling-reference` / `dangling-module-specifier` 在"目标根本不存在"时报 error（`scripts/check-references.cjs` 的 `CHECK_TITLES`，实测 `:116`；写作时为 `scripts/check-references.cjs:84-94`，已漂移）。**存在性 ≠ 影响传播**：它不会告诉你"删掉 `src/execution.ts` 会波及哪 12 个文件、其中哪些是类型引用"，也没有传递闭包查询 |
| **Q4** | **这次改动动了哪些声明与边？** | ❌ 不能 | `ChangeData`（`src/engine/types.ts:121-137`）只有 `id`/`title`/`intent`/`modules.create|modify|delete`/`api_add|api_remove`/`revision.before|after`，**无文件路径、无符号、无边**；且**本仓库当前不存在 `changes/` 目录**（实测 `git ls-files` 无任何 `changes/` 条目），所以连"变更意图"都还没有落点 |
| **Q5** | **这些影响处理了没有？** | ❌ 不能 | 全仓没有任何"引用影响处理状态"的概念；`ChangeData.status`（`ChangeStatus`）是**变更**的状态，不是**某条受影响引用**的状态 |

> **验收方式**：每期增量必须至少把一条 ❌ 变成"可由脚本或测试断言的结构化回答"（见第 10 节各期的验收标准）。**部分**不算达标，只算起点。

### 1.3 现状边界（仓库现在能回答什么）

| 能力 | 位置（实测） | 实际粒度 | 能否回答 Q1–Q5 |
| --- | --- | --- | --- |
| 模块 → 源码路径 | `src/engine/types.ts:8-12` `SourceRef{path,line?,end_line?}`；`types.ts:146` `Module.source: SourceRef[]` | 模块 → 路径（可选行区间） | 只能给"这个文件属于哪个模块"，**没有**符号 |
| 整文件指纹 | `src/engine/store.ts` 的 `fingerprintOf`；`types.ts:149` `Module.fingerprint` | **模块级**：按 path 升序去重后哈希文件字节 → 单个 SHA-256 | 只回答"这个模块的源码变了"，**不回答哪里变了、谁被波及** |
| L2 证据诊断 | `src/engine/validate.ts:299,306,321,328,334,343,346,351`（8 个 `evidence/*` code） | 路径可用性 / 根无 source / 不是普通文件 / 缺失 / 指纹 pending / 指纹不可算 / 指纹漂移 / 跳过校验 | 全部是"**现在**是否漂移"，**没有引用维度、没有历史维度** |
| 相对说明符解析 | `scripts/reference-graph-core.cjs` 的 `collectSpecifiersWithTypescript` / `collectSpecifiersWithRegex` / `resolveRelativeSpecifier`（写作时为 `scripts/check-references.cjs` 的 `(2184)` / `(2274)` / `(2336)`，已漂移——解析器已抽到共享内核） | **单文件语法树** + 相对路径解析 | 能列边，但**不解析符号**：`import { foo }` 里的 `foo` 到底指哪个声明，它不知道 |
| 文件级台账 | `scripts/check-file-ledger.cjs`（2003 行）+ 共享内核 `scripts/file-ledger-core.cjs`（462 行）+ `ledger/file-ledger.json`（`schema_version: 2`，168 行 / 10131 B）+ 独立豁免清单 `ledger/exempt.gitignore`（56 行 / 19 条模式） | **文件级**归属状态 | 回答"这个文件有没有人管"，与引用关系无关 |
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
| **L0 文件层** | 节点 `kind: "file"` | 哪些文件参与引用面；跨文件边的两端 | `git ls-files` 的 **1,412** 条（本批实测；原稿记的 1,399、增量 2 首批记的 1,402 都是各自批次的快照） |
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
| 字节数 | 516,319（旧记 521,118 B 是改造前快照，见 §7.6） |
| 声明名（`declaration_names`） | **2,624**（其中模块级/顶层 207，**函数内 2,417**） |
| 标识符引用（`identifier_references`） | **10,336** |
| 模块说明符边（`import` 声明 201 + `export … from` 19） | **220** |
| 导入绑定（`ImportSpecifier` / `ImportClause` / `NamespaceImport` 节点） | 672 |
| 类型引用节点（`TypeReferenceNode`） | 805 |
| 动态 `import()` / `require()` 调用 | 0 / 0 |

即 `src/` 一个目录就有 **12,960 个图元素**（2,624 声明 + 10,336 引用），与用户预期的「上万条边」一致。因此**不能**把每条边都按最啰嗦的形态落盘。

> **口径警告（读任何行数之前先读这一段）：本文档的「行数」有两族，口径相差 1，两者不可互相求和、也不可互相校验。**
> - **① 文档规模表（如本节 / §9.7 的符号面）= LF 口径**：文本里 `\n` 的个数（= `(git show :<p> -split "\n").Length - 1`）。本表的 `src/**/*.ts` = **9,782**。
> - **② 脚本与数据文件的行数（如 §1.3 / §6.3 / §10 偏差记录）= 「显式行数」= split 口径**：与产物 `ledger/references.json` 的 `files[].lines` 同源，`split('\n')` 后数组的长度**恒 = `\n` 个数 + 1**（本批实测：扫描面 75 条非 null 项无一例外，且末尾都带换行）。同一批 28 个文件在产物里求和 = **9,810**（= 9,782 + 28）。
> - 单文件对照（实测，`git show :<p>`，均属上述 ② 口径）：`scripts/check-references.cjs` 在产物里 `lines = 2374`，其 LF 计数 = **2373**；`ledger/file-ledger.json` 在产物里 `lines = 168`，其 LF 计数 = **167**；本文档自身在产物里 `lines = 1331`，其 LF 计数 = **1330**。
> - **处置：产物口径不改，只在这里声明差异。** 把产物改成 LF 会让 1,412 条登记项的 `lines` 全体变动、图摘要随之改变，为纯口径问题不值得；因此两张表**各按各的口径读**，跨表引用行数时必须先换算（减 1/文件）或改用字节数。

**分层与稀疏化策略**（四层，逐层放大）：

| 层 | 落盘内容 | 规模（`src/` 实测锚点） | 为什么这么切 |
| --- | --- | --- | --- |
| **① 文件表** | 每个已跟踪文件一行：`id` / `lang` / `bytes` / `decl_count` / `edge_out` / `edge_in` | 28（全仓 1,412） | 极小、可全量重算、是分片与失效判定的索引 |
| **② 符号表** | 每条**声明**一条（含函数内局部变量与参数） | 2,624 | 用户要求的最小单位，必须落盘；体量只有引用的 1/4 |
| **③ 跨文件边表** | 只落 `cross_file=true` 的边 | **756 条**（实测，增量 3；下界 220 已作废） | 这类边**必须** `ts.createProgram` + 类型解析才能算出，是最贵、最不可重算的信息 |
| **④ 文件内边（按需展开）** | **不落盘**。查询时对单个文件重新解析（`createSourceFile`，不需要 program）即可得到 | 其余 10,116 条（外推：10,336 − 220） | 函数内引用的解析范围天然局限在**本文件 + 本函数作用域**；"删了局部变量谁引用它"只需单文件展开，答案完整且成本 O(一个文件) |

**判据（为什么 ④ 可以不落盘）**：用户的三条问句里，只有 Q3（传递闭包）需要跨文件传播；而跨文件传播的**边**全部落在 ③。④ 里的边两端必在同一文件内（局部变量、参数、文件内私有函数/类型），因此"影响传播"不会穿过它离开本文件——展开该文件即可闭合。这一点在增量 4 必须用测试断言（见 10.4）。

> **增量 3 的落地口径（2026-10-05，实测）**：本批把 ② 的**顶层声明**与 ③ 落盘（`declarations` 402 条 / `symbol_edges` 1,347 条，其中 `cross_file` **756 条**），**函数内声明（2,417 条）仍不产**，④ 也仍不落盘。③ 的 756 条与下表 2.5 首段那个"220 条模块说明符边"**不是同一个量**：220 只数 `import` 声明 + `export … from`（文件级模块边），756 还含 `type-reference`（340 条）与穿透后的逐名字 `import`（346 条）。逐条口径与实测命令见 §2.8。
>
> **按需展开的实测代价（增量 3 顺带测掉，属 9.7 第 3 项）**：单文件**语法树**（`ts.createSourceFile`，不需要 program）中位数 **0.08–5.72 ms**（`src/index.ts` 18 行 → `src/tools.ts` 1,835 行）；单文件**Program**（含其 import 闭包）中位数 **0.8–49.6 ms**。**结论：④ 的按需展开必须走"单文件语法树"，不能走"单文件 Program"**——`src/index.ts` 只有 18 行却要 49.6 ms（它拖进 26 个源文件），是全部样本里最贵的一个，远超 2.5 表里"建议 ≤ 20 ms/文件"。这条取舍留给增量 4 落实（那里才真正需要展开文件内边）。

**改动记录对 ④ 的处理**：因为 ④ 不落盘，两份快照之差看不到文件内引用的增删。补法是每条 `accounted`/变更记录对每个受影响文件存一个 `intra_ref_digest`（**整文件级**，不是行级）——它只回答"这个文件的文件内引用面是否变过"，需要细节时再展开。若实测证明该摘要的误报率过高，退化为"受影响文件一律重展开"（成本 = 文件数 × 单文件解析耗时，待实测）。

### 2.6 分层存储的落点与体积预估

- **落点**：仓库根 `ledger/` 目录（与增量 1 的 `ledger/file-ledger.json` 同域）；图数据分片存放，分片键 = 文件路径的 **UTF-8 字节序**排序后的连续段（**不用** `localeCompare`——`src/engine/manifest.ts:11` 用 `localeCompare` 是本仓的一处已知跨平台风险，图数据不得沿用它）。
- **分片依据（实测）**：逐文件记录数在 `src/` 内分布极不均——最大 `src/tools.ts` 2,371 条、均值 462.6 条/文件、最小 `src/index.ts` 0 条（该文件不含任何声明，只有 16 条 `export … from`，正说明"文件层节点"与"边"是两层不同的东西）。因此分片按**文件**切，而不是按固定条数切，才能让一次改动的重算面等于改动的文件面。
- **单条字节数（实测，用本文档 2.2/2.3 的字段构造真实记录后 `JSON.stringify` + UTF-8 字节数）**：节点记录 199–243 B（n=13，均值 221.3）；边记录 234–270 B（n=20，均值 253.2）。**符号级层的单条字节数（增量 3 实测，同一口径）**：声明记录 **155–230 B（n=402，均值 191.0）**；符号边记录 **309–463 B（n=1,347，均值 391.1）**——符号边比文件级边胖约 54%，因为它多了 `from.sym` / `to.sym` / `cross_file` / `type_only` 四栏。
- **外推（记录数实测 × 单条字节实测）**：`src/` 按最啰嗦形态全量落盘约 `12,960 × ~250 B ≈ 3.1 MiB`；采用 2.5 的分层后，落盘部分为 `2,624 声明 + ≥220 跨文件边 ≈ 2,844 条 ≈ 0.7 MiB`。**这两个数都是外推不是实测总量**；真实总量与压缩后体积按 9.7 的方法测。**增量 3 实测结果（2026-10-05）：外推偏乐观**——实际落盘的顶层声明 + 全部符号边共 1,749 条，符号级两数组紧凑序列化 ≈ **605,344 B（0.58 MiB）**（口径 = 两数组各自**无缩进** `JSON.stringify` 的 UTF-8 字节之和，本批复测），产物整份 **1,482,686 B（1.41 MiB）**。差异来自两点：① 本批落的是**全部**符号边（1,347 条，不只 `cross_file` 的 756 条）；② 符号边单条 391.1 B 而非外推用的 ~250 B。详见 §2.8。
- **全仓规模**：工作区（排除 `node_modules/` 与 `.git/`）合计约 **99.3 万行**（实测，附录 A 第 4 条），是 `src/` 的约 100 倍。全仓符号级图的规模**待实测**，测量方法见 9.7；在测出来之前**不预设**它可接受。**增量 3 的实测边界**：本批符号面刻意只覆盖扫描面内的 `.ts`（本仓 = `src/**/*.ts`，**28 个文件 / 9,782 行 / 516,319 B**），因此上面那个"全仓 ≈100 倍"的担忧在本批**不适用**——全仓级（`examples/` 的机器产物、`lib/` 的编译产物）**不在符号面内**，也进不了 Program（§2.8 的结构性保证）。

### 2.7 增量 2 落地：文件级引用图的字段表与 JSON Schema 草案

> 状态（2026-10-05）：**已落地**。产物 `ledger/references.json`、生成器 `scripts/generate-reference-graph.cjs`、共享解析内核 `scripts/reference-graph-core.cjs`（从 `scripts/check-references.cjs` 逐字抽取，抽取前后 `--json` 的 stdout **逐字节相同**）。本节是**本批实际落盘的结构**，与 2.2–2.4 的符号级草案的差异逐条列在下面——不写「以后大概是这样」。**升版提示**：本节记录的是增量 2 落地的 **v1** 结构（`schema_version: 1`）；增量 3 已升到 **v2**（新增 `declarations` / `symbol_edges` 两个顶层数组，本节其余部分一字未改），v2 的字段表与实测见 **§2.8**。

**落点取舍（对 P2 / P8 的答复）**：落 `ledger/references.json` **单文件**，**不**采用 P2 的 `ledger/graph/` 分片、也**不**采用 P8 的分片键。理由是可实测的：增量 2 只有文件层，产物 **580,354 B（567 KiB）/ 482 条边 / 1,412 个节点**（实测见下；本批新增改动记录一侧的 5 个文件后，节点 1,407 → 1,412、边 465 → 482、产物 569,850 B → 580,354 B），单文件一次性重算耗时 **≈2.2 s**；分片是为「符号级图每次改一个文件就重写整个图」的写放大准备的，而那套规模（2.5 估算 ≈ 0.7 MiB 起步、全量形态 ≈ 3.1 MiB）在本批还不存在。**先量后切**：等增量 3 的符号表落地并按 9.7 测出真实体积，再决定是否分片——现在分片等于凭空引入一套分片/合并/失效判定的复杂度。

**两个面必须分开说（本批最容易读错的地方）**：

| 面 | 定义 | 实测 |
| --- | --- | --- |
| **节点面** | `git ls-files` 的**全量**已跟踪文件，一条不少；另外把「被引用到、却不在索引里」的目标也登记为节点（`ignored` / `untracked` / `deleted` 三态） | 1,412 个节点（全部 `indexed`；当前仓库没有指向索引外目标的引用——门禁是绿的，这是事实而不是缺口。本批新增改动记录一侧的 5 个文件，节点 1,407 → 1,412） |
| **扫描面** | 真正**产边**的文件 = 已跟踪 + 文本后缀（与 `check-references.cjs` 的 `TEXT_EXTENSIONS` 同源）+ 不在 `EXCLUDED_PREFIXES` 内；排除 `examples/`（示例产物，占工作区行数绝大部分且几乎不改，P9 的取舍）与 `lib/`（`src/` 的编译产物，它的 import 是派生的，不是新事实） | 76 个文件（本批 71 → 76）；被排除的文件仍是节点，只是 `lines: null` 且不产边 |

**`meta` 字段表**：

| 字段 | 类型 | 语义 |
| --- | --- | --- |
| `schema_version` | integer | 固定 `1`；结构变了显式升版 |
| `generator` / `generator_version` | string | 生成器路径与版本 |
| `universe` | string | 宇宙 = git 索引的一句话定义 |
| `universe_hash` | string(64 hex) | `sha256(sort(git ls-files, 码点升序).join('\n') + '\n')`——**与 `ledger/file-ledger.json` 的算法逐字相同**，两份数据因此可以互相对账 |
| `universe_hash_algorithm` | string | 上面那条算法的原文 |
| `tracked_total` | integer | 已跟踪文件数 |
| `positions_basis` | string | 位置口径 = **索引 blob 的 LF 归一化文本**上的 1 基行列（字节偏移会随 CRLF 漂移） |
| `byte_basis` / `read_basis` | string | 字节数取 `git cat-file --batch-check`；内容取 `git cat-file --batch`——**一律不读工作区** |
| `history_basis` | string | `git log --diff-filter=D --name-only`（当前 37 条）用于 `deleted` 状态 |
| `scope` | object | `text_extensions` / `excluded_prefixes` / `scanned_total`——扫描面自证 |
| `analysis` | object | `mode`（`typescript` / `regex-fallback`）、`typescript_version`、`degraded`。**刻意不落降级原因**：那段字符串含机器相关的绝对路径，落盘就破坏幂等 |
| `edge_id_rule` | string | 边 id 规则（含消歧规则） |
| `node_states` / `edge_kinds` / `edge_status` | object | 计数（键按 UTF-8 字节序排序） |
| `omitted` | array | 本批明示不做的东西：`declarations`、`type-reference` 边、传递闭包、查询接口 |

**刻意不写 `generated_at`**：台账允许 `meta.generated_at`，因为那是**人写**字段（生成器只保留、不生成）；图是**纯机器产物**，没有可写的人字段，写时间戳就做不到「同一份索引连跑两次逐字节相同」，而幂等正是 `--check` 的判据。

**`files`（节点）字段表**：

| 字段 | 类型 | 语义 |
| --- | --- | --- |
| `id` | string | 仓库相对 posix 路径 |
| `lang` | enum `ts`\|`js`\|`md`\|`json`\|`yaml`\|`other` | 与 2.2 的 `lang` 同枚举 |
| `state` | enum `indexed`\|`ignored`\|`untracked`\|`deleted` | L0 四态；`deleted` = 在 git 历史删除清单里 |
| `bytes` | integer\|null | 索引 blob 字节数；非索引节点为 `null`（磁盘字节数会随检出变，不落盘） |
| `lines` | integer\|null | 行数，口径 = `split('\n').length`（**split 口径**：在 LF 归一化文本上切分，末尾有换行时比 `\n` 计数多 1——与本文档表格的 **LF 口径**不同，**不可互相求和**，见 §2.5 表下的口径警告）；未扫描文件为 `null` |
| `edge_out` / `edge_in` | integer | 出边 / 入边计数（按 `from.file` / `to.file` 统计；目录与非节点目标只计入边表，不建节点） |

**`edges`（边）字段表**：

| 字段 | 类型 | 语义 |
| --- | --- | --- |
| `id` | string | `<from.file>:<line>:<column>:<kind>`；同一位置有多条边时追加 `:<field→specifier>` 消歧（`exports` 的条件分支就是这种形状）。消歧后仍冲突 → **生成失败**，不静默去重 |
| `kind` | enum `import`\|`export-from`\|`require`\|`dynamic-import`\|`markdown-link`\|`package-field`\|`ci-target`\|`anchor` | 本批覆盖的 8 类（`type-reference` / `module-id-reference` 属增量 3） |
| `from` | `{file, line, column}` | 源端位置（1 基） |
| `to` | `{file, line, column, state}` | 目标端；`state` ∈ `indexed`\|`ignored`\|`untracked`\|`deleted`\|`missing`\|`outside`（`missing` = 哪里都没有；`outside` = 仓库外/裸模块名） |
| `cross_file` | boolean | `to.file` 非空且 `from.file !== to.file` |
| `specifier` | string\|null | 原文（`'./execution.js'` / 链接目标 / 脚本名） |
| `resolved` | string\|null | 解析后的仓库相对路径（CI 的 `npm run <script>` 解析到 `package.json`） |
| `fragment` | string\|null | 锚点片段（URL 解码后） |
| `field` | string\|null | `package.json` 的字段路径（`main` / `exports["."]` / `scripts["build"]`） |
| `status` | enum（见下） | 解析结果 |
| `type_only` | boolean | 该边**所在语句**是否为纯类型级（`import type …` / `export type … from`）：为 `true` 时这条边运行时不会加载目标。**保守边界（猜错的方向是「谎称不必跑测试」，故宁可当运行时）**：`import { type X }`（行内修饰符）、`require(…)` / `import(…)`、以及拿不到 TypeScript 时的正则回退一律记 `false`。不写 `null`，免得被读成「不知道」 |

**`status` 枚举与 §2.4 草案的差异（诚实记录）**：草案给的是 `resolved｜unresolved｜external｜ambiguous｜dangling` 五值；本批**新增 3 个**——`untracked`（目标在磁盘上、不在索引里）、`ignored`（目标被忽略规则覆盖）、`case-mismatch`（大小写与索引不一致）。理由：这三类在既有门禁里**本来就有各自的诊断码**（`untracked-reference` / 被忽略目标逐条列出 / `path-case-mismatch`），图必须与它口径一致，否则「门禁红、图说 resolved」就会出现两份真相；把 `untracked` 压成 `unresolved` 会让查图的人看不到这一类。`unresolved` 在本批专指「锚点目标不是可读的 Markdown」。

**JSON Schema 草案**（draft 2020-12；`json` 代码块不参与文档示例编译门禁）——**这是 v1 的草案，保留原样**：增量 3 升到 `schema_version: 2` 时**只加了两个顶层数组**（`declarations` / `symbol_edges`），`meta` / `files` / `edges` 的 required 与 properties 当时**一字未改**（实测见 §2.8）；**此后有一处已改**：`edges[].type_only` 由 `{"const": false}` 改为 `{"type": "boolean"}`（文件级边如实表达纯类型语句，见上表），因此下面草案里的 `"type_only": { "const": false }` 只记录 v1 当时的形状、**不再描述当前产物**（当前产物的 `schema_version` 仍是 `2`，这一处收窄没有随版本号一起升——读产物请以本节字段表与 §2.8 为准）。v2 的两个新数组字段表在 §2.8。因此读这份草案时请把 `schema_version` 的 `const: 1` 读成"v1 当时的形状"，当前产物的值是 `2`：

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://github.com/wishbreeze/code-normify/schemas/reference-graph/v1.json",
  "title": "Normify 文件级引用图 v1（增量 2）",
  "type": "object",
  "required": ["schema_version", "meta", "files", "edges"],
  "additionalProperties": false,
  "properties": {
    "schema_version": { "const": 1 },
    "meta": {
      "type": "object",
      "required": [
        "generator", "generator_version", "universe", "universe_hash", "tracked_total",
        "positions_basis", "byte_basis", "read_basis", "history_basis", "scope", "analysis",
        "edge_id_rule", "node_states", "edge_kinds", "edge_status", "omitted"
      ],
      "additionalProperties": true
    },
    "files": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "lang", "state", "bytes", "lines", "edge_out", "edge_in"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string" },
          "lang": { "enum": ["ts", "js", "md", "json", "yaml", "other"] },
          "state": { "enum": ["indexed", "ignored", "untracked", "deleted"] },
          "bytes": { "type": ["integer", "null"], "minimum": 0 },
          "lines": { "type": ["integer", "null"], "minimum": 1 },
          "edge_out": { "type": "integer", "minimum": 0 },
          "edge_in": { "type": "integer", "minimum": 0 }
        }
      }
    },
    "edges": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "kind", "from", "to", "cross_file", "specifier", "resolved", "status", "type_only"],
        "additionalProperties": false,
        "properties": {
          "id": { "type": "string" },
          "kind": {
            "enum": ["import", "export-from", "require", "dynamic-import", "markdown-link", "package-field", "ci-target", "anchor"]
          },
          "from": { "$ref": "#/$defs/source" },
          "to": { "$ref": "#/$defs/target" },
          "cross_file": { "type": "boolean" },
          "specifier": { "type": ["string", "null"] },
          "resolved": { "type": ["string", "null"] },
          "fragment": { "type": ["string", "null"] },
          "field": { "type": ["string", "null"] },
          "status": {
            "enum": ["resolved", "dangling", "untracked", "ignored", "case-mismatch", "ambiguous", "external", "unresolved"]
          },
          "type_only": { "const": false }
        }
      }
    }
  },
  "$defs": {
    "source": {
      "type": "object",
      "required": ["file", "line", "column"],
      "additionalProperties": false,
      "properties": {
        "file": { "type": "string" },
        "line": { "type": "integer", "minimum": 1 },
        "column": { "type": "integer", "minimum": 1 }
      }
    },
    "target": {
      "type": "object",
      "required": ["file", "line", "column", "state"],
      "additionalProperties": false,
      "properties": {
        "file": { "type": ["string", "null"] },
        "line": { "type": ["integer", "null"], "minimum": 1 },
        "column": { "type": ["integer", "null"], "minimum": 1 },
        "state": { "enum": ["indexed", "ignored", "untracked", "deleted", "missing", "outside", null] }
      }
    }
  }
}
```

### 2.8 增量 3 落地：符号级层的字段表与实测（2026-10-05）

> 状态：**已落地**。产物 `ledger/references.json` **`schema_version: 2`**（v1 → v2 = 新增 `declarations` 与 `symbol_edges` 两个顶层数组），生成器 `scripts/generate-reference-graph.cjs` **v1.1.0**，符号级实现落在共享内核 `scripts/reference-graph-core.cjs`（`buildSymbolGraph` + `createIndexCompilerHost` + `SYMBOL_REASONS`）。本节只写**实际落盘的东西**；§2.2–2.4 的符号级草案里没做的部分逐条在 `meta.omitted` 里自证，不写"以后大概是这样"。

**与 §2.7 的关系（升版改了什么、没改什么）**：新增**只有两个顶层数组**，`files` / `edges` 的字段集合一个都没动（实测：`files` 键集合 = `bytes, edge_in, edge_out, id, lang, lines, state`，与 §2.7 的 required 逐字相同；`edges` 键集合与 §2.7 相同）。因此 `ledger/change-log/schema.json` 的 `graph_schema_version` 从 `1` 改为 `2` 只改了「这份差是哪一版结构算出来的」这个标签——两条已落盘记录的 `files` / `edges` 差**一个字节都没变**（该结论由 `npm run check:changes` 的重算复核实测证实：当时那 2 条记录全部通过）。

**`declarations`（声明节点表）字段表**：

| 字段 | 类型 | 语义 |
| --- | --- | --- |
| `id` | string | `<file>#<name>@<line>:<column>`——**符号身份的唯一键**（决定"同名不合并"能不能成立，见下） |
| `file` | string | 声明所在的仓库相对 posix 路径 |
| `name` | string | 声明名（**不是**唯一键：同名跨文件必须共存） |
| `decl_kind` | enum `function`\|`class`\|`interface`\|`type`\|`enum`\|`variable` | 顶层声明的种类 |
| `exported` | boolean | 是否出现在**模块导出表**里（`checker.getExportsOfModule`）——它覆盖直接 `export`、本地 `export { x }` 与 `export *` 再导出，是语法修饰符看不出来的 |
| `scope` | `null` | **本批恒为 null**：函数内声明的 scope 属增量 4，本批不产函数内声明 |
| `line` / `column` | integer | 1 基位置（`getLineAndCharacterOfPosition`，索引 blob 的 LF 归一化文本上） |
| `origin` | `'source'` | 本批恒为 `source`（合成符号不在表内） |

**`symbol_edges`（符号级边）字段表**：

| 字段 | 类型 | 语义 |
| --- | --- | --- |
| `id` | string | `<from.file>:<line>:<column>:<kind>[:<discriminator>]`；`export *` 展开时 discriminator = 被再导出的名字，命名空间导入 = 绑定名 |
| `kind` | enum `import`\|`export-from`\|`type-reference` | 本批三类。`.mjs` / `.cjs` / `.js` / `.jsx` 按 §3.4 退化为文件级，不产符号边 |
| `from` | `{file, line, column, sym}` | 源端；`sym` = 该引用落在哪条顶层声明内（顶层语句级归属，无归属则 `null`） |
| `to` | `{sym, file, line, column, state}` | 目标端；`sym` = `declarations` 里的节点 id，或 `null` + 非空 `reason` |
| `cross_file` | boolean | `to.file` 非空且 ≠ `from.file` |
| `specifier` | string\|null | 模块说明符原文（`type-reference` 在无说明符时为 `null`） |
| `resolved` | string\|null | 解析结果（相对路径 / 说明符） |
| `status` | enum `resolved`\|`unresolved`\|`external`\|`untracked`\|`ignored`\|`dangling`\|`case-mismatch`\|`ambiguous` | 与文件级边**共用同一张** `STATUS_OF_INDEX_STATE` 表（单一事实来源） |
| `reason` | string\|null | **无静默 null 的落点**：`to.sym` 为 `null` 时必填，取值闭集见内核 `SYMBOL_REASONS`（13 个原因码） |
| `type_only` | boolean | 纯类型引用（`import type` / `export type` / 整个 `type-reference`） |

**三条不变量在生成器里是抛错级（违反 ⇒ 生成失败、不写盘）**：① **无静默 null**——`to.sym === null && !reason` 直接 `throw`（不是统计出来的：`meta.symbol_graph.silent_null_edges` 恒为 0）；② `to.sym` 必须命中 `declarations` 里的真实节点 id，否则 `throw`；③ 两个数组按 UTF-8 字节序排序（`declarations` 按 `id`、`symbol_edges` 按 `(from.file, line, column, kind)`），**不用** `localeCompare`。

**Program 范围的结构性保证（本批修掉的一处实测假绿）**：自建 `ts.CompilerHost` 把 `fileExists` / `readFile` / `getSourceFile` / `directoryExists` / `getDirectories` **全部**重定向到 git 索引，**仓库外路径一律返回「不存在」**（连磁盘都不看）。修复前的实现把仓库外路径委派给 `ts.createCompilerHost` 的默认实现，于是「Program 里只有 rootNames」这条自证**只在仓库根的父目录恰好没有 `node_modules` 时成立**——实测：`tests/reference-graph-e2e.mjs` 的夹具物化到 `%TEMP%\…` 下（夹具自身没有 `node_modules`，但 `%TEMP%\node_modules` 存在），默认宿主把 `zod` / `ajv` / `yaml` / `@modelcontextprotocol` 等 **212 个仓库外源文件**拉进了 Program（`program_outside_repo_files = 212`、`program_source_files = 247 ≠ root_names 35`）。本仓当时没暴露，只是因为它自己的父目录凑巧没有 `node_modules`。现在 `program_outside_repo_files` **恒为 0 是结构性的**，不再依赖检出位置。

**实测（2026-10-05，命令与条件照抄可复现）**：

| 量 | 实测值 | 命令 / 条件 |
| --- | --- | --- |
| 声明节点 | **402**（`function` 206 · `interface` 114 · `variable` 62 · `type` 18 · `class` 2） | `node scripts/generate-reference-graph.cjs --json` → `symbolGraph.declarationKinds` |
| 符号级边 | **1,347**（`type-reference` 805 · `import` 472 · `export-from` 70） | 同上 → `symbolGraph.edgeKinds` |
| 边状态 | `resolved` **989** · `unresolved` **224** · `external` **134** | 同上 → `symbolGraph.edgeStatus` |
| 跨文件边 | **756**（`import` 346 · `type-reference` 340 · `export-from` 70），其中 `to.sym` 非空 **756 条（100%）** | 同上 → `symbolGraph.crossFileEdges` |
| 未解析原因码 | `symbol-not-found-in-program` 215 · `bare-module-specifier` 126 · `declaration-out-of-scope` 9 · `external-module-symbol` 8 | 同上 → `symbolGraph.unresolvedReasons` |
| **无静默 null** | `to.sym === null && !reason` 的边 **0 条**（抛错级不变量，不是统计值） | 同上 → `symbolGraph.silentNullEdges` |
| Program 范围 | `root_names` **28** · `program_source_files` **28** · `program_outside_repo_files` **0** | 同上 → `symbolGraph.rootNames / programSourceFiles / programOutsideRepoFiles` |
| 符号面规模 | **28 个文件 / 9,782 行（LF 口径） / 516,319 B**（= 扫描面内 `lang=ts`；全仓扫描面 **76 个文件 / 93,496 行（split 口径） / 3,462,125 B**——这两个数**含图自身** `ledger/references.json`（图里该条 `bytes`/`lines` 记 `null`，自指，设计如此）⇒ **随每次重算同步**，两处引用（本行与 §9.7 测量条件）必须同批一起改；与符号面那个 LF 口径的 9,782 **不可相加**，完整口径说明见 §2.5 表下的口径警告） | `git ls-files` + 索引 blob 逐文件求和（`git cat-file -s :<p>` 求字节、`git show :<p>` 按 `\n` 切分求 split 行数） |
| 产物体积 | **1,482,686 B（1.41 MiB）**（LF；`schema_version` 2 整份） | `git cat-file blob :ledger/references.json` 的长度 |
| 体积分解（缩进 2，与产物同口径） | `symbol_edges` **727,531 B** + `files` 291,466 B + `edges` 239,834 B + `declarations` **101,293 B** + `meta` 4,789 B（五项之和 = **1,364,913 B**；余项 **117,773 B** = 各部分的括号/逗号 **+ 嵌套缩进差**——各部分单独 `JSON.stringify` 时缩进从 0 起算，在整份产物里整体多一层 ⇒ `1,364,913 + 117,773 = 1,482,686`，实测自洽） | `JSON.stringify(<该部分>, null, 2) + '\n'` 的 UTF-8 字节 |
| 相对文件级的增长 | **2.543 倍**（1,482,686 ÷ 583,014；分母 = 同一份索引上「`meta` + `files` + `edges` + `schema_version: 1`」的口径近似） | 同上 |
| 参考上界 | `.git` 目录 **47,284,561 B**（本批实测；测量时刻 = 本批改动**尚未 `git add`** 的检出态，提交后复核只会略大；含本产物提交后的 1,482,686 B ⇒ 扣掉产物本身 **45,801,875 B**）⇒ 产物占 **3.14%**（毛值；按净 .git 是 **3.24%**）（§9.7 的红线建议是 ≤ 10%） | `(Get-ChildItem .git -Recurse -File -Force \| Measure-Object Length -Sum).Sum` |
| 幂等 | 连跑两次逐字节相同；`--check` exit 0 | `node scripts/generate-reference-graph.cjs --check` |

> 这张表与 §2.7 的规模表同一条纪律：**是带时点的快照**，任何一次提交只要增删改名文件或改 `src/`，计数都会变，复核时按同一组命令重测。**「跨文件边 756」与 §2.5 首段的「模块说明符边 220」不是同一个量**——220 只数 `import` 声明 + `export … from`（文件级模块边，28 个文件上的静态计数），756 是符号级边里 `to.file ≠ from.file` 的那批，含 `type-reference` 340 条与穿透后的逐名字 `import`。两个数都对，**不要互相替代**。
>
> **「同名不合并」为什么落在 `id` 上**：`dep_kind` 一类的短名在 `src/` 里会重复（实测 4 个名字、14 个节点）。判据不是「名字字符串不同」，而是**符号身份**：`checker.getSymbolAtLocation` 给出的 `Symbol` 对象逐个别，再映射到各自的声明节点。极端例子是 4 个 `DepKind`（`src/engine/edit.ts:31` / `frontmatter.ts:17` / `layout.ts:20` / `policy.ts:18`），它们的**源码行逐字相同**（`type DepKind = (typeof DEP_KINDS)[number];`）——只有类型系统能把它们区分成 4 个节点；图中的引用也如实分成 4 条边、各自指向各自那个节点。

**接线（三处同步，`check` 链第 11 环）**：`package.json` 的 `check:graph` / `graph:gen`（未变）+ `.github/workflows/ci.yml` 的独立 step 注释（已按本节改写：`v1.1.0` / `schema_version 2` / 符号级快照行）+ `CONTRIBUTING.md` 的门禁清单与快照行（同样已改写）。**回归用例** = `tests/reference-graph-e2e.mjs` **111 条断言**（第 13 组 31 条覆盖符号级：三层 `export *` 穿透、同名不合并、无静默 null、Program 自证、排序确定性、原因码与 `meta` 一致；第 14 组 3 条覆盖版本 fail-closed；**第 15 组 14 条覆盖根级仓库**——`.ts` 直接在仓库根的夹具必须同样全 resolved / 未解析 = 0 / `export *` 穿透到真实声明，同一套内容的 `src/` 版作对照。这条路径此前**无门禁覆盖**：根分支把仓库根判成仓库外，符号级层整体退化成「全部 unresolved + exit 0 + 零诊断」）。

**本批不做的（`meta.omitted` 逐条自证）**：函数内局部变量与参数（增量 4）、文件内边按需展开（增量 4）、传递闭包与查询接口（增量 5）、变更影响门禁（增量 6）、`import-binding` 节点化（本批把 import 绑定表达成符号级边的源端，不单独节点化）、非 TS 后缀的符号级解析（按 §3.4 退化为文件级）、库类型与 `@types`（Program 刻意 `noLib: true` + `types: []`，这类名字记 `unresolved` + `symbol-not-found-in-program`）。

**确定性与幂等（做法，不是口号）**：

- 内容与字节数**只从索引读**（`git ls-files -s` → `git cat-file --batch` / `--batch-check`），一个字节都不碰工作区；磁盘只用来区分 `untracked` / `ignored`；
- 位置口径 = 索引 blob 的 LF 归一化文本（CRLF 检出下字节偏移会变、行列不会）；
- 排序一律 **UTF-8 字节序**（`Buffer.compare`），**不用** `localeCompare`；
- 产物里**没有**时间戳、绝对路径、机器相关信息（连降级原因都不落）；
- 判据：同一份索引连跑两次 → **逐字节相同**（`--check` 拿它当红线）。

**实测（2026-10-05，命令照抄可复现）**——**符号级层落地后（增量 3），本表的图规模数字已全部刷新为 v2 口径；括号里给出增量 2（v1）时的旧值**，方便对照"哪一部分是文件级、哪一部分是符号级新增的"：

| 量 | 实测值 | 命令 |
| --- | --- | --- |
| 节点 | 1,412（`indexed` 1,412 · `ignored` 0 · `untracked` 0 · `deleted` 0；与 v1 相同） | `node scripts/generate-reference-graph.cjs --json` |
| 边 | 482（`import` 315 · `require` 46 · `export-from` 19 · `dynamic-import` 1 · `markdown-link` 35 · `package-field` 47 · `ci-target` 16 · `anchor` 3；与 v1 相同） | 同上 |
| 边状态 | `resolved` 306 · `external` 176 · 其余 0（306 + 176 = 482，与边总数自洽；与 v1 相同） | 同上落盘的 `meta.edge_status` |
| **声明节点（v2 新增）** | **402**；**符号边（v2 新增）1,347**（`type-reference` 805 · `import` 472 · `export-from` 70） | 同上 → `symbolGraph.declarationKinds` / `edgeKinds` |
| 扫描面 | 76 个文件（排除 `examples/`、`lib/`；与 v1 相同） | 同上 |
| 产物 | **1,482,686 B（1.41 MiB）**，LF，无 BOM（v1 为 580,354 B / 567 KiB） | `git cat-file blob :ledger/references.json` 的长度 |
| 耗时 | 单次全量重算端到端 **≈1.7 s**（热态中位数；`typescript` 模式，Node 24.21.0 / TypeScript 5.9.3。其中 `createProgram` 热态中位数 69.5 ms；v1 为 ≈2.2 s） | 生成器人类报告末行 + §9.7 的实测表 |
| 幂等 | 连跑两次 sha256 相同；`--check` exit 0 | `Get-FileHash ledger/references.json` |

> 这张表是**带时点的快照**（2026-10-05，本批刷新：本批新增了改动记录一侧的 5 个文件，节点 1,407 → 1,412、边 465 → 482、产物 569,850 B → 580,354 B、耗时 1.3 s → 2.2 s），不是恒真式：任何一次提交只要增删改名文件，`tracked_total` 与各计数都会变，复核时按同一组命令重测。**节点/边四态在干净仓库里全是 `indexed` / `resolved`+`external` 是正常的**——它说明当前没有任何悬空引用；四态里的另三种（`ignored` / `untracked` / `deleted`）与 `dangling` / `unresolved` 由 `tests/reference-graph-e2e.mjs` 的夹具逐条断言（夹具里每种都造了一个真探针）。

**接线（三处同步，`check` 链第 11 环）**：`package.json` 的 `check:graph`（`--check`）与 `graph:gen`，并追加进 `check` 链；`.github/workflows/ci.yml` 的独立 step；`CONTRIBUTING.md` 的门禁清单与快照行。**验收（本批补强，与台账侧对称）**：`--check` 除「索引 blob 与重算结果不一致」外，另有两条红线——`graph-index-drift`（**索引里的图与工作区里的图不是同一份事实**：工作区那份被写坏 / 不可解析 / 被删掉，或两边都能读但内容不同，逐条带 `type` 点名）与降级词 `unknown`（索引里没有图文件、判定退回工作区副本 ⇒ **不判绿**）。加它的理由与台账侧 `ledger-index-drift` 一样：判定基准是索引 blob，「本地看到的」与「索引里的」不是同一份文件时不得给绿——否则「把工作区那份图写坏」在本地 `npm run check` 里完全看不见。**本批仍不加**「图与真实不一致就红」的语义判定（那类判定属增量 6）：这一步只做「生成 + 幂等可校验 + 基准对称可校验 + 接线」。降级词汇与 §5.5 / §4.6 同词同义（本生成器只用 `complete` 与 `unknown`，`partial` / `stale` 用不到：图的观测点就是「当前索引」，没有历史维度）。

**纯重构的验收证据（带条件的、可复现的）**：抽取是否"纯"，判据是**同一仓库根、同一索引**下两次 `node scripts/check-references.cjs --json` 的 stdout **逐字节相同**——这一条与机器、目录、文档内容都无关，是本节真正的不变量。直接拿新旧两份脚本对跑**不满足**这个条件——本批同时动了 `check-references.cjs` 的**豁免面**（`DELETED_REFERENCE_ALLOWLIST` 新增 3 条 + `SELF_EXCLUDED_FILES` 新增 `scripts/reference-graph-core.cjs`，逐条 reason 见 §10 增量 2 的改动面）：**判定逻辑一个字没动，判定的结果面动了**。把这两个常量**逐字还原成 `607e1a2`（v0.8.3）那一版**（其余代码保持出货版）后再对跑，两侧 stdout 逐字节相同：

| 侧 | 脚本 | 退出码 | stdout 字节 | 行数 | sha256 |
| --- | --- | --- | --- | --- | --- |
| 抽取前 | `git show 607e1a2:scripts/check-references.cjs` | 1 | 526,906 | 13,221 | `a8520ffa43f5b240b3788fb581049c2aeea59075a1f16e5c0661078ad531cd1e` |
| 抽取后（豁免面拉平） | 出货版 + 两个常量还原成 `607e1a2` 版 | 1 | 526,906 | 13,221 | 同上（与左侧**逐字节相同**） |
| 抽取后（出货默认态，作对照） | 出货版原样 | 0 | 587,516 | 11,251 | `cb67be253beb6db9c3e7cca2a79082b15954b6fc9efb0762686b2b7be8c8dfbb` |

即：**不还原**时两侧的差额恰好是新增的 3 条豁免 + 1 条自指排除（10 error / 1,001 warning / `allowlisted` 3 → 0 error / 633 warning / `allowlisted` 371，退出码 1 → 0）；**还原后**两侧逐字节相同 ⇒ 差额全部来自豁免面，代码搬家本身是纯的。`--help` 两侧同为 `3ce53fcc7109bdb6e2582dac3566128ad52bbc9c967c91e9c8a4702f42f63cf6`（6,605 B / 76 个 LF，退出码 0）；未知参数两侧一致 exit 2。

> **复现条件（缺一不可，否则数字对不上）**：
> ① **同一索引**：两侧必须跑在**同一份索引**上——物化夹具后先 `git add -A`，让新内核文件 `scripts/reference-graph-core.cjs` 进索引。本次实测的索引 = **本批提交态**（父提交 `607e1a2`），`git ls-files` **1,412 条**、`universe_hash` = `6caeeaeb42d60f6a8bdc671098ee0a70eec1a10f2732aaa8e1763059c32cf056`（`universe_hash` 只由**路径集合**算出，与文件内容无关，因此它是个稳定的锚点；索引树哈希会因本段文字本身而变，故意不写死）。不这么钉住，差异会掺进"索引变了"这个无关变量。
> ② **同一仓库根**：`--json` 的 stdout 里含 `root` **绝对路径**字段，它是**唯一随环境变化的字段**，因此**字节数与 sha256 随 root 路径长度变化**。本次用**同一份索引、同一份脚本**做了受控对照（两者索引树同为 `109bcb97e5f391c6bd3e7a780b124ea7efd03aa4`）：48 字符的临时夹具根 → 526,935 B / sha `02a2c17881c955213a16cba55c649327caeec336b79b2f3e076cb809d73bb23c`；23 字符的规范根 `<repo-root>` → **526,906 B**（即上表的值）。两者相差 **29 B**、且**只差 `root` 一行**（29 = 两个 root 字符串 JSON 转义后的长度差）。**这条解释了复验方在自建夹具里得到的 526,114 B**：那是同一份输出在 48 字符夹具根下、且文档尚未加入本段文字时的值（526,085 B + 29 B），与判定无关。所以复核时请**连同 root 一起记录**，或干脆只比对"两侧是否逐字节相同"（与 root 无关的判据）。
> ③ **行数口径** = `stdout.split('\n').length`（末行有换行，故 = LF 个数 + 1；表中 13,221 行对应 13,220 个 LF）。
> ④ **本表是时点快照，不是恒真式**：`--json` 的正文逐条回显每个违规的 `文件:行:列`，因此**任何改动被扫描内容（含本文档自身的行号）都会移动这些数字**——这与 §2.7 上面那张规模表是同一条纪律。复核时按 ① ② 的条件重测一遍即可，别把快照当成"重构的哈希"。
> 复现命令（PowerShell，`$fx` = 夹具根、`$w` = 输出目录）：`git -C $fx show 607e1a2:scripts/check-references.cjs > $w\a.cjs`；把出货版的两个常量换成 `a.cjs` 里的同名块得到 `$w\b.cjs`；两次 `node <脚本> --root <repo-root> --json > $w\<侧>.json`；最后比 `Get-FileHash -Algorithm SHA256`。**注意 `>` 必须走原始字节重定向**（PowerShell 的管道重定向会改写行尾、把字节数与哈希一起带偏），本批用的是 `cmd /c "... > file"`。

---

## 3. 实现路径

### 3.1 为什么必须 `ts.createProgram`（不能只遍历单文件 AST）

现有门禁的解析器用 `ts.createSourceFile`（`scripts/reference-graph-core.cjs` 的 `collectSpecifiersWithKinds` 内，实测 `:817`；写作时为 `scripts/check-references.cjs:2185`，已漂移，该坐标今天是 `reportUntrackedReference`）——**单文件**语法树，没有类型检查器，因此拿不到符号绑定。后果：

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
| `import` / `export-from` / `require` / `dynamic-import` | 语法树节点（沿用 `scripts/reference-graph-core.cjs` 的 `collectSpecifiersWithKinds` 判定（实测 `:835-848`；写作时为 `check-references.cjs:2200-2205`，已漂移，该坐标今天是 `checkUntrackedMarkdownLinks` 的 `forEachMarkdownLink` 循环）：`ImportDeclaration` / 带说明符的 `ExportDeclaration` / `ImportKeyword` 调用 / 裸 `require` 调用） | 先按 3.5 的解析器定位目标文件，再对每个 `ImportSpecifier` 用 `checker.getSymbolAtLocation` + `getAliasedSymbol` 定位目标声明 |
| `type-reference` | `TypeReferenceNode`（`src/` 实测 805 个） | 同上；`type_only: true` |
| `markdown-link` / `anchor` | 沿用共享内核 `scripts/reference-graph-core.cjs` 的 `function forEachMarkdownLink(ctx, rel, visit, options) {`（实测 `:425`）与 `function extractHeadingAnchors(ctx, rel) {`（实测 `:1099`）；写作时为 `check-references.cjs:1134` / `:2694`，已漂移 | 目标文件 + `function githubSlug(headingText) {`（`scripts/reference-graph-core.cjs`，实测 `:1069`；写作时为 `check-references.cjs:2664`，已漂移）或显式 HTML `id`/`name` |
| `package-field` | 沿用共享内核 `scripts/reference-graph-core.cjs` 的 `function collectPackageFieldTargets(pkg) {`（实测 `:539`；写作时为 `check-references.cjs:1390`，已漂移） | 文件/目录存在性 |
| `ci-target` | 沿用共享内核 `scripts/reference-graph-core.cjs` 的 `function collectWorkflowRunLines(text) {`（实测 `:608`）/ `function extractNodeTargets(command) {`（实测 `:572`）/ `function extractNpmScriptRefs(line) {`（实测 `:637`）；写作时为 `check-references.cjs:1515` / `:1422` / `:1544`，已漂移 | 脚本文件 / `package.json` script 名 |
| `module-id-reference` | 解析 `modules/*.md` frontmatter 的 `source.path`、`deps[].to`、`apis[].input/output`、Schema `$ref` | `Module.id` / 命名类型 |

### 3.4 非 TS 文件的退化处理

| 后缀 | 处理 | 产出粒度 | 依据 |
| --- | --- | --- | --- |
| `.ts` / `.tsx` / `.mts` / `.cts` | `createProgram` 全精度 | 文件 + 声明 + 边 | 3.1 |
| `.mjs` / `.cjs` / `.js` / `.jsx` | 归入同一个 `createProgram`（`allowJs`）或用 `createSourceFile` + `scriptKindFor` 退化为文件级 | **文件级**（不保证符号级） | `scripts/reference-graph-core.cjs` 的 `scriptKindFor`（后缀 → `ts.ScriptKind`，实测 `:797`；写作时为 `check-references.cjs:2166-2173`，已漂移，该坐标今天是 `checkUntrackedWorkflowRefs` 的循环）已有映射 |
| `.md` | 只解析 Markdown 链接、图片、引用式定义、标题锚点 | 文件级 + 锚点 | `scripts/reference-graph-core.cjs` 的 `function forEachMarkdownLink(ctx, rel, visit, options) {`（实测 `:425`）、`function extractHeadingAnchors(ctx, rel) {`（实测 `:1099`）；写作时为 `check-references.cjs:1134` / `:2694`，已漂移 |
| `.json` | 只解析 `package.json` 的 `main`/`types`/`exports`/`bin`/`files`；其它 `.json` 只记文件节点 | 文件级 | `scripts/reference-graph-core.cjs` 的 `function collectPackageFieldTargets(pkg) {`（实测 `:539`）、`function collectExportStrings(exportsField, key = '.', out = []) {`（实测 `:554`）；写作时为 `check-references.cjs:1390` / `:1405`，已漂移 |
| `.yml` / `.yaml` | 只解析 workflow 的 `run:` 里的 `node <路径>` 与 `npm run <script>` | 文件级 | `scripts/reference-graph-core.cjs` 的 `function collectWorkflowRunLines(text) {`（实测 `:608`）；写作时为 `check-references.cjs:1515`，已漂移 |
| `.toml` 及其它 | 只记文件节点（参与 L0 文件表与 `edge_in`/`edge_out` 计数），不产边 | 文件级 | `TEXT_EXTENSIONS`（`scripts/check-references.cjs`，实测 `:105`；写作时为 `check-references.cjs:73`，已漂移）当前含 `.toml` |

**退化必须显式标注**：每条边的 `status` 之外，`meta` 里记录每个后缀降到了哪一级；文档与查询输出**不得**把"文件级"答案说成"符号级"（见 5.5 的降级契约）。

### 3.5 复用 `scripts/check-references.cjs` 的既有解析器（不造第二套）

该脚本**已经**在算文件级的 import / markdown / package.json / CI / 锚点边，必须复用而不是重写。现状约束（实测；**下列两条是抽取前的形态**——抽取后 `scripts/check-references.cjs` = **2374 行 / 107,815 B** 且已 `module.exports`，见 §7.6）：

- 它是一个 **CLI-only 的 3,384 行（151,442 B）脚本**，文件末尾直接 `main(process.argv.slice(2));`，**全仓 `git grep "module.exports" scripts/` 无命中** ⇒ 现在**无法被 require 复用**。
- 它的解析器是**闭包内函数**，依赖 `ctx`（`createContext` 的产物）与模块级可变状态（如 `SPECIFIER_ANALYSIS`、`TYPESCRIPT_CANDIDATE_ROOTS`）。

**复用方案（唯一改动面）**：把纯函数解析器抽到一个共享模块（计划时写的是 `scripts/lib/reference-parsers.cjs`，**实际落地名 = `scripts/reference-graph-core.cjs`**，见 §2.7 / §10 增量 2 的落地状态），由 `check-references.cjs` 与新的图生成器**同时** require。抽取清单（**每条 = 路径 + 可 grep 的定义行引文 + 实测坐标**；本列原先只给裸行号，旧数字逐条留痕在表内，见表下「留痕」段）：

| 抽取目标 | 现位置（**路径 + 可 grep 的定义行引文 + 实测坐标**；括号里留痕写作时点的旧坐标） | 用途 |
| --- | --- | --- |
| `scriptKindFor` | `scripts/reference-graph-core.cjs` 的 `function scriptKindFor(ts, rel) {`（实测 `:797`；写作时为 `scripts/check-references.cjs:2166`，已漂移） | 后缀 → `ts.ScriptKind` |
| `collectSpecifiersWithTypescript` | `scripts/reference-graph-core.cjs` 的 `function collectSpecifiersWithTypescript(ts, rel, text) {`（实测 `:862`；写作时为 `scripts/check-references.cjs:2184`，已漂移） | 模块说明符（语法树） |
| `maskSource` / `collectSpecifiersWithRegex` | `scripts/reference-graph-core.cjs` 的 `function maskSource(text) {`（实测 `:873`）/ `function collectSpecifiersWithRegex(text) {`（实测 `:984`）（写作时为 `scripts/check-references.cjs:2218` / `:2274`，已漂移） | 拿不到 typescript 时的降级路径 |
| `resolveRelativeSpecifier` / `moduleSpecifierCandidates` | `scripts/reference-graph-core.cjs` 的 `function resolveRelativeSpecifier(ctx, fromRel, spec) {`（实测 `:1022`）/ `function moduleSpecifierCandidates(fromRel, spec) {`（实测 `:753`）（写作时为 `scripts/check-references.cjs:2336` / `:2122`，已漂移） | 说明符 → 目标文件 |
| `forEachMarkdownLink` | `scripts/reference-graph-core.cjs` 的 `function forEachMarkdownLink(ctx, rel, visit, options) {`（实测 `:425`；写作时为 `scripts/check-references.cjs:1134`，已漂移） | Markdown 链接/图片/引用式定义 |
| `extractHeadingAnchors` / `githubSlug` / `anchorMatches` | `scripts/reference-graph-core.cjs` 的 `function extractHeadingAnchors(ctx, rel) {`（实测 `:1099`）/ `function githubSlug(headingText) {`（实测 `:1069`）/ `function anchorMatches(anchors, fragment) {`（实测 `:1170`）（写作时为 `scripts/check-references.cjs:2694` / `:2664` / `:2765`，已漂移） | 锚点 |
| `collectPackageFieldTargets` / `collectExportStrings` | `scripts/reference-graph-core.cjs` 的 `function collectPackageFieldTargets(pkg) {`（实测 `:539`）/ `function collectExportStrings(exportsField, key = '.', out = []) {`（实测 `:554`）（写作时为 `scripts/check-references.cjs:1390` / `:1405`，已漂移） | package.json 字段 |
| `extractNodeTargets` / `collectWorkflowRunLines` / `extractNpmScriptRefs` | `scripts/reference-graph-core.cjs` 的 `function extractNodeTargets(command) {`（实测 `:572`）/ `function collectWorkflowRunLines(text) {`（实测 `:608`）/ `function extractNpmScriptRefs(line) {`（实测 `:637`）（写作时为 `scripts/check-references.cjs:1422` / `:1515` / `:1544`，已漂移） | CI 目标 |
| `globToRegExp` | `scripts/reference-graph-core.cjs` 的 `function globToRegExp(glob) {`（实测 `:145`；写作时为 `scripts/check-references.cjs:411`，已漂移）。同名副本另有两份**独立实现**，不是本次抽取对象：`scripts/check-doc-snippets.cjs:152` 与 `scripts/check-examples.cjs:269` 的 `function globToRegExp(glob) {` | 模式匹配（复用同一套 `*` / `?` 语义） |
| `pathState` / `indexPathState` / `isIgnoredPath` | `scripts/reference-graph-core.cjs` 的 `function pathState(ctx, rel) {`（实测 `:296`）/ `function indexPathState(ctx, rel) {`（实测 `:667`）/ `function isIgnoredPath(ctx, rel) {`（实测 `:703`）（写作时为 `scripts/check-references.cjs:1002` / `:2036` / `:2072`，已漂移） | 以 git 索引为权威的存在性判定 |

**留痕（本列原来的 19 个裸行号，一个都没删）**：旧写法只给数字，语境文件是 `scripts/check-references.cjs`。逐条复核：文档创建提交 `9a2f167` 时该文件 3,089 行，这 19 个数字**逐个命中同名 `function`**（是写作时点的真坐标）；到抽取落地前（`c493e80^`，该文件已涨到 3,383 行）它们**已经漂移**（例：`scriptKindFor` 当时在 `:2460`、`forEachMarkdownLink` 在 `:1237`）；今天该文件 2,574 行、这些实现**一个都不在里面**——它改为从共享内核复用（`scripts/check-references.cjs` 里 `const {` … `} = require('./reference-graph-core.cjs');`，实测 `:66` / `:95`）。所以：**复核请按上表的引文 grep，不要按旧数字跳转**。

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
| 目录 | `ledger/change-log/`（与增量 1 的 `ledger/file-ledger.json` 同域）——**本批把落点从本行原定的 `ledger/changes/` 改名为 `ledger/change-log/`**，理由逐条见 §4.6 | 一次改动只写自己的文件，写放大隔离；不碰 `modules/*.md`（否则改一个符号要重写模块正文，写放大最差） |
| 命名 | `<utc-iso8601 紧凑式>-<short-hash>.json`，例如 `20261005T183940Z-ed404e5.json`（**去掉冒号**：Windows 文件名不允许 `:`；原稿示例 `2026-10-05T140312Z-1b2a3c6.json` 里的 `-`/`:` 在 Windows 上是非法文件名） | 时间序天然可排序；`short-hash` 避免同一秒内两次写入撞名 |
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

### 4.6 增量 2 落地：文件级改动记录的实际字段、降级契约与落点改名

> 状态（2026-10-05，增量 2 批次）：**已落地**。产物目录 `ledger/change-log/`（已落盘 2 条真实记录）、生成器 `scripts/generate-change-log.cjs`（v1.0.0）、机器判据 `ledger/change-log/schema.json`（draft 2020-12，ajv 校验）、门禁 `npm run check:changes`。本节是**本批实际落盘的结构**，与 §4.5 符号级草案的差异逐条列在下面——不写「以后大概是这样」。

**落点改名（对 §4.4 原决定的修正，理由可复核）**：`ledger/changes/` → `ledger/change-log/`。

1. **消歧**：`changes/` 是**目标工程**的数据目录名（`src/engine/types.ts:121-137` 的 `ChangeData`，本仓库不存在它）；记录里的 `change_id` 是**指回目标工程** `changes/<id>.json` 的**可选外键**（§4.3）。目录同名会让同一份文档里 `changes/` 有两个所指——一个是我们的事实记录，一个是别人的变更意图。
2. **名字自证语义**：记录是「一次提交发生了什么」的**日志**（只增不改），不是「变更意图」。
3. **同域不变**：仍在 `ledger/` 下，命中既有豁免模式 `ledger/**`，不需要新增豁免条目（`git grep -n "ledger/changes"` 在本批之后零命中——旧路径不留悬空引用）。

**观测点（对 §4.1 的落地口径）**：`kind: "commit"`（每次提交，`from` = 父提交、根提交 → 空树）**已落地**；`--index`（当前暂存态）是**未落定**的观测点，写出的记录 `kind: "index"`，索引一变即为 `stale`；设计稿 §4.1 的第二个观测点 **cas-write 本批不实现**（引擎的 CAS 写入不落在本仓库的数据面里），`schema.json` 用 `cas_digest: {"const": null}` 把它钉死，**不假装支持**。「每次保存」不在范围内（§4.1 已拍板）。

**实际字段（文件层；机器判据 = `ledger/change-log/schema.json`，本节只是它的说明）**：

| 字段 | 类型 | 语义 |
| --- | --- | --- |
| `schema_version` | integer | 固定 `1`；结构变了显式升版，不做静默兼容 |
| `kind` | enum `commit` \| `index` | 观测点种类（本批两个；`cas-write` 落地时升版到 2） |
| `commit` / `commit_parent` | string(40 hex) / string(40 hex)\|null | `kind=commit`：`commit` = to 侧提交、`commit_parent` = from 侧提交（空树基准为 null）；`kind=index`：`commit` = from 侧 HEAD，`commit_parent` 恒 null |
| `cas_digest` | `const null` | 不支持就钉死，不写 `null` 之外的任何值 |
| `change_id` | string \| null | 可选外键（§4.3）；本仓库没有 `changes/` ⇒ 恒 null；生成器 `--change-id` 只在文件真的存在时才写（fail-closed） |
| `created_at` | string（UTC ISO-8601 秒级） | 记录**写入**时刻。这是**事实**（这条记录何时写下），不是幂等产物；`--check` **不比对**它 |
| `from_snapshot` / `to_snapshot` | object `{basis, rev, tree, universe_hash, tracked_total, files, edges, analysis_mode}` | 快照身份。`basis ∈ commit \| index \| empty-tree`；`tree` = 树对象 id（内容寻址 ⇒ 不可变 ⇒ 可复核），索引侧为 `null`（算索引的树要 `git write-tree`，会往对象库写东西，记录生成不该有写副作用） |
| `files` | object `{added[], removed[], state_changed[]}` | 文件层差：新增 / 消失 / **状态变化**（`{file, from, to}`，如 `indexed` → `deleted`） |
| `edges` | object `{added[], removed[], status_changed[]}` | 边差：新增 / 消失 / **解析状态变化**（`{edge, from_status, to_status, from_target_state, to_target_state}`，如 `resolved` → `dangling`） |
| `affected_referrers` | array `{edge, file, line, column, kind, target, target_state, edge_status, classification, needs_change}` | 受影响的引用方，**只到直接引用方**（无传递闭包）。`classification ∈ dangling-target \| edge-removed \| edge-added`；`dangling-target` ⇒ `needs_change: true`（这就是 Q1/Q3 的落地形态） |
| `counts` | object（8 个整数） | **真实计数（截断前）**。数组有上限（生成器 `MAX_LIST`）——判据是 counts，不是数组长度 |
| `handling` | object `{status, by, at, note}` | 处理状态，**粒度 = 整条记录**（§4.5）；`waived` 必须带理由（schema 用 `if/then` 强制）。生成器恒写 `pending`；改它不影响复核 |
| `summary` | string | 人类可读一行（确定性：含提交主题、各栏计数） |
| `omitted` | array | 本批明示不做的东西（自证范围边界，免得被读成「符号级记录」） |

**为什么必须有 `state_changed` / `status_changed`（本轮实测踩出来的，不是设计洁癖）**：一个被删除、但**仍被引用**的文件，在 to 快照里仍然是一个节点（`state: "deleted"`），它的边 id 也不变（边 id 里不含状态）——**只比 id 的差会得到一张空表**，「删了某个东西之后谁还在引用它」这条最核心的问句会当场失效。本仓 `ed404e5`（Delete docs/VIDEO-SCRIPT.zh-CN.md，而 `README.md:486` 仍在链接它）就是这种形状：第一版生成器给出 `文件 +0/−0 · 边 +0/−0`，加上这两栏之后是 `文件 ±1（indexed → deleted）· 边 ±1（resolved → dangling）· 受影响引用方 1 条（需改 1 条）`。这条记录就在 `ledger/change-log/20261005T183940Z-ed404e5.json`。

**降级契约（§5.5 的文件层落地；**不得把「不知道」读成「没有引用」**）**：

| `degradation.status` | 含义 | 机器判据 | 不得读成 |
| --- | --- | --- | --- |
| `complete` | 两侧快照完整重建，差在文件层完整 | 默认 | ——（数组为空 = **真的**没有差异） |
| `partial` | 差已算出，但有**已知缺口** | `reasons`：`specifier-analysis-regex-fallback`（任一侧拿不到 typescript，说明符边可能不全）、`history-unavailable`（浅克隆，`deleted` 态不可判） | 「没有引用」或「完整清单」 |
| `unknown` | 差额**不可判定** | `--check` 在基准不可用（提交缺失）、结构不合规、重算不一致时给出 | 「没有引用」——判据**只能是本字段**，不是数组长度 |
| `stale` | 记录描述的**那个状态已不存在** | `--check` 对 `kind: "index"` 的记录比对当前索引的 `universe_hash` 与 HEAD | 「记录有错」——`stale ≠ 记录有错` |

> `kind: "commit"` 的记录**结构上不可能 `stale`**：提交是内容寻址的不可变基准。这是「可复核」的根基，也是为什么正式记录的观测点选「提交」而不是「工作区」。

> **与 §5.5 的词汇对齐**：§5.5 给的是**查询返回体**的 `completeness` 字段（四态同名同义）；改动记录里叫 `degradation.status`（记录是「一次改动」的事实，不是一个查询的回答），四态取值与「不得把不知道读成没有」这条铁律完全一致。两者落地时若分叉，以 §5.5 的定义为准并同步两边。

**复核（`npm run check:changes` = 生成器 `--check`）**：每条记录（1）按 `schema.json` 校验结构；（2）用记录里的那对基准**重算**两份快照与差，与落盘记录**逐字段**比对，不一致 exit 1 并点名到字段（`edges.status_changed[0].to_status` 这种粒度）。`created_at` 与 `handling` 是**人类字段**，不参与复核——「改处理状态」不会被判红，「改差去迎合自己」一定会。**`unknown` 与 `stale` 都不判绿**（exit 1）。

**与 §4.5 符号级草案的差异（诚实记账；`omitted` 字段里逐条自证）**：`declarations`（符号级节点差）与 `moved` 属增量 3；`affected_files[].intra_ref_digest`（文件内引用面摘要）在文件层没有对应物（边表已全量落盘，§2.5 ④ 的「按需展开」是符号级才需要）；`affected_referrers[].depth` / `.via` 与 `sym` 属增量 5（传递闭包与符号定位）。**本批不写这些字段，而不是写空值**——空数组会被读成「没有」，而事实是「本批不测这个维度」。

**"可复现"的做法**：提交侧快照用「临时索引（`GIT_INDEX_FILE` + `git read-tree <rev>`）+ 空工作树（`GIT_WORK_TREE`）」物化，并把历史删除清单**钉到该提交**（`git log --diff-filter=D … <rev>`）——不钉的话，日后新增的删除会把旧的 `missing` 悄悄改判成 `deleted`，记录就不可复核了。运行期**不碰工作区、不向对象库写任何东西**（`git ls-files -s` 只读），临时目录建在 `os.tmpdir()` 下、跑完删掉。

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
| `dangling-reference` | `scripts/check-references.cjs` `CHECK_TITLES`（实测 `:116`；写作时为 `84-94`，已漂移） | Markdown / `package.json` 字段 / CI `run:` 指向不存在的文件 | 图里 `kind ∈ {markdown-link, package-field, ci-target}` 的边，其 `status: "dangling"` 与之一一对应 |
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
- 选项 (b)：新增 `scripts/check-impact.cjs` + `package.json` 脚本 `check:impact`，成为**第 6 道门禁**。
> 命名说明：本设计稿早期拟名 `check-change-impact.cjs`，实际定名为 `scripts/check-impact.cjs`（`check` 链第 13 环）。下文凡出现旧名处，均指同一脚本。
- **建议 (b)**，理由同上；但代价是门禁数量再 +1，而增量 1 已经把门禁从 4 道推到 5 道（`scripts/check-file-ledger.cjs`，`package.json` 的 `check:ledger`，实测 `:83`；写作时为 `package.json:79`，已漂移，该坐标今天是 `check:refs`）。**这是用户要拍板的点。**

### 6.3 与五道既有门禁的分工（不重复）

| 门禁 | 脚本 | 它管什么 | 与图/改动记录的边界（**不重复的判据**） |
| --- | --- | --- | --- |
| `check:refs` | `scripts/check-references.cjs`（2374 行，`CHECK_TITLES` 9 项） | 引用**完整性**：悬空、未跟踪、已删除、版本字面量、测试清单、锚点 | 图**复用**它的解析器（3.5）；图的悬空状态是它的诊断码的投影（6.1）。图**不**做版本字面量与测试清单 |
| `check:docs` | `scripts/check-doc-snippets.cjs`（1630 行，4 项检查） | 文档代码块能否编译、必填选项、工具数量断言、`execute` 签名描述 | 图**不解析文档代码块**；本文档落在 `docs/` 下会被它扫描（约束见附录 C） |
| `check:libsync` | `scripts/check-lib-sync.cjs`（1,573 行） | **git 索引里的 `lib/`** 与"索引版 `src/` 全新编译产物"逐字节一致 | 图生成器放 `scripts/` ⇒ 与它零交互（9.5）。若将来把生成器移进 `src/`，则必须同提交重建 `lib/` |
| `check:examples` | `scripts/check-examples.cjs`（1,051 行） | 示例可执行 + 运行前后 git 快照**零变化**（含 `--ignored`） | 图生成器**不得**在示例运行期间写工作区；生成器只写 `ledger/`，且 `ledger/**` 已在台账豁免模式内 |
| `check:ledger` | `scripts/check-file-ledger.cjs`（2003 行，`CHECK_TITLES` 13 项）+ 共享内核 `scripts/file-ledger-core.cjs`（462 行） | **文件级**台账：每个已跟踪文件落到四态之一（`owned` / `exempt` / `accounted` / `unowned`），并与真 `.gitignore` 交叉校验（交集 / 折叠误伤 / 放行本该 `git add` 的普通文件） | 图是**符号级**、与文件归属无关；两者共用 `ledger/` 目录但**不共用判定**。第 7 节的用户口径**已于 2026-10-05 落地** |
| （建议新增）`check:impact` | `scripts/check-impact.cjs` | 6.2 的未处理引用影响 | 只在有改动记录时触发；不重做 6.1 的任何判定 |

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
- 新增文件必须**先**拿到条目才能过门禁，而**新增的已跟踪文件只有两条路**：`owned`（模块 `source.path` 精确声明）或 `exempt`（独立豁免清单里一条带 reason 的模式）。**「加进 `accounted`」不是第三条路**：`accounted` 是**存量正账、只减不增**，任何新增条目都会被 `accounted-growth`（error）、`check:ledger:gen`（exit 1）与生成器写盘模式（拒绝写盘 + exit 1，逐条点名）拦下——本节原先把它与 `owned`/`exempt` 并列写成「新增文件的三条来路」，那句话是错的，已在此更正（2026-10-05，增量 2 批次）；
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

**先纠正一个伪问题**：`graphDigest(dataDir)` 的输入是**目标工程的数据目录**（`src/engine/manifest.ts` 的 `graphDigest` 内，实测 `:9` `snapshotProject(dataDir, SOURCE_ROOTS)`；写作时为 `src/engine/manifest.ts:7`，已漂移，该坐标今天是空行，`SOURCE_ROOTS = ['modules','renders','policy.yml','changes']` 都是**相对 `dataDir` 的名字**）。而本仓库根**没有** `modules/` / `renders/` / `policy.yml` / `changes/`（实测：`git ls-files` 无任何 `changes/` 条目；`src/engine/store.ts` 的 `resolveProject` 要求数据目录名以 `normify-` 开头且含 `modules/`）。

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
| **同步义务（先说清）** | 下表的「行数 / 字节数」是**当时实测的快照**——**数据随实现变化，改实现要同步这里**。涉及的文件：门禁 `scripts/check-file-ledger.cjs`（2003 行）、生成器 `scripts/generate-file-ledger.cjs`（799 行）、共享内核 `scripts/file-ledger-core.cjs`（462 行）、台账 `ledger/file-ledger.json`（168 行 / 10131 B）、豁免清单 `ledger/exempt.gitignore`（56 行 / 7226 B）；另有 `scripts/check-references.cjs`（**2374 行 / 107815 B**——本批复核，口径 = `git cat-file -s :scripts/check-references.cjs` 与 `(git show :scripts/check-references.cjs).split('\n').length`；原记的 3384 行 / 151442 B 是解析器抽到 `scripts/reference-graph-core.cjs` **之前**的快照）等既有门禁脚本，**这四个文件只被引用、不被本节定义**。 |
| `src/**/*.ts` 文件数 / 行数 / 字节数 | 28 / 9,782 / **516,319 B**（本批复测；原记 521,118 B 是**索引口径不同**的旧值——见下方 9.7 实测表的条件栏，两者都不是"行数变了"） |
| `src/` 声明名（含函数内 2,417） | 2,624 |
| `src/` 标识符引用 | 10,336 |
| `src/` 模块说明符边（`import` 声明 + `export … from`） | 220 |
| `src/` 导入绑定 / 类型引用节点 | 672 / 805 |
| 单条节点记录字节（示例字段，`JSON.stringify` + UTF-8） | 199–243 B（n=13，均值 221.3） |
| 单条边记录字节（同上） | 234–270 B（n=20，均值 253.2） |
| **单条符号级记录字节（增量 3 实测，同上口径）** | 声明 **155–230 B**（n=402，均值 191.0）；符号边 **309–463 B**（n=1,347，均值 391.1） |
| 工作区总行数（排除 `node_modules/` 与 `.git/`） | 约 993,000 |
| 已跟踪文件数 / `.git` 目录字节 | 1,412 / **47,284,561**（本批实测；口径 = `(Get-ChildItem -LiteralPath .git -Recurse -File -Force \| Measure-Object -Property Length -Sum).Sum`，测量时刻 = 本批改动**尚未 `git add`** 的检出态 ⇒ 提交后复核只会略大（差额 = 本批新增对象）；`.git` 体积还随本地克隆 / 打包历史变化，**不是跨克隆可复现量**。原记的 46,588,290 / 45,380,380 / 44,307,366 / 43,479,139 都是各自批次的快照） |

**外推（记录数实测 × 单条字节实测，非实测总量）**：`src/` 全量落盘 ≈ 3.1 MiB；采用 2.5 的分层后落盘 ≈ 0.7 MiB。**该外推已被实测证伪为偏乐观**：增量 3 实际落盘符号级两数组 **828,824 B（0.79 MiB）**、整份产物 **1,482,686 B（1.41 MiB）**——差距来自「本批落的是**全部**符号边而不只是 `cross_file` 的」与「符号边单条 391.1 B 而非外推用的 ~250 B」两点。逐项见 9.7 实测表与 §2.8。

**待实测项与测量方法**（不得用推测值替代）——标注「✅ 已实测（增量 3）」的四项已按本表的方法测出，数字在下表紧随其后的实测表里：

| 待实测项 | 测量方法 | 用途 / 建议阈值（待用户确认） |
| --- | --- | --- |
| ✅ **`ts.createProgram` 全仓耗时（冷/热）**（增量 3） | 单进程计时：`performance.now()` 包住 `createProgram(fileNames, opts)` + 一次完整遍历；本批加测 `getTypeChecker()` 与 `buildSymbolGraph` 全流程；冷 = 同进程首次调用、热 = 第 2/3 次取中位数 | **红线建议：单次 CAS 提交 ≤ 2 s —— 通过（热态 createProgram 69.5 ms；全流程热态中位数 164.7 ms；端到端 1.7 s）** |
| ✅ **全仓图的记录数与落盘体积**（增量 3） | 跑一次全量生成，按数组逐项测字节（缩进 2，与产物同口径）；与 2.6 的外推值对比 | 判断 2.5 的分层是否够；**红线建议：图数据 ≤ `.git` 的 10% —— 通过（1,482,686 B / 47,284,561 B = 3.14%；分母与 §2.8 / `:1076` 是同一实测值，若按扣掉产物本身的净 .git 45,801,875 B 则为 3.24%）** |
| ✅ **单文件按需展开耗时（2.5 ④）**（增量 3） | 对 `src/tools.ts`（最大）/ `src/engine/store.ts` / `src/engine/edit.ts` / `src/index.ts` / `src/engine/template.ts` 各展开 5 次取中位数；**两种方式都测**：单文件语法树（`createSourceFile`）与单文件 Program（`createProgram`） | 决定"文件内边按需展开"是否可行；**建议 ≤ 20 ms/文件 —— 单文件语法树通过（0.08–5.72 ms）；单文件 Program 不通过（0.8–49.6 ms）⇒ 增量 4 必须走语法树路线** |
| ✅ **跨文件边的精确条数**（增量 3） | 全量 `createProgram` 后按 `from.file !== to.file` 计数 | 校验 2.5 ③ 的规模；`src/` 的下界是实测的 220 —— **实测 756 条**（`import` 346 / `type-reference` 340 / `export-from` 70） |
| `intra_ref_digest` 的误报率（2.5 末） | 对历史提交做回放：算出"摘要变了但引用面语义未变"（仅格式/重排）的比例 | 决定是否放弃摘要、改为"受影响文件一律重展开"；**建议 ≤ 5%**。**仍未实测**：`intra_ref_digest` 属增量 4（本批不产文件内边），此时测它没有可测对象 |
| CRLF/LF 两种检出下图的逐字节一致性 | 同一提交分别在 `core.autocrlf=true` 与 `false` 下生成图，逐字节 diff | **0 容忍项**：必须完全相同。**仍未实测**，两点间接证据：① 内容与字节数一律取自**索引 blob**（`git cat-file`），索引里的 blob 与检出时的行尾转换无关；② 位置口径写在 LF 归一化文本上（`normalizeEol`）。但"结构上应当一致"**不等于**实测，本批不拿它替代 |
| 改动记录单条体积 | 取一次真实提交跑出记录，测字节数 | 决定 4.4 的分片与保留策略。**已实测（增量 2 批次）**：`ed404e5`（删 1 个文件 + 1 条悬空引用）**3,022 B**；`10766d1`（文件 +2 / 边 +24−20 / 受影响引用方 44 条）**21,368 B**——体积由**受影响引用方条数**主导（≈ 480 B/条），因此分片与否的判据是「单次改动的引用面大小」，不是仓库规模 |

**增量 3 实测结果（2026-10-05；四个 ✅ 项的原始数字与条件）**

**测量条件（缺一不可，否则数字对不上）**：Windows 10.0.26200 x64 · Intel Core i5-13500H（16 逻辑核）· 15.7 GiB 内存 · **Node v24.21.0**（V8 13.6.233.17-node.53）· **TypeScript 5.9.3**（仓库自带 `node_modules/typescript/lib/typescript.js`）· **不含 `node_modules` 类型**（Program 显式 `noLib: true` + `types: []`）· **`skipLibCheck: true`**（与仓库 `tsconfig.json` 一致；本批没有 lib 文件，取值只为口径一致）· 扫描面 **76 个文件 / 93,496 行 / 3,462,125 B**（**split 口径**：按 `\n` 切分后数组长度求和；**含图自身** `ledger/references.json`——图里该条 `bytes`/`lines` 记 `null`（自指，设计如此），因此本行**随每次重算同步**，改完文档必须与 §2.8 的同一行一起重测、一起改；测量 = 扫描面 76 个文件的 `git ls-tree -r -l` 尺寸与 `git show :<p>` 的切分求和），其中符号面（`lang=ts`）**28 个文件 / 9,782 行（LF 口径，与上一条不同口径） / 516,319 B** · 索引 = 本批提交态（`git ls-files` 1,412 条）。**「冷」的定义与限度**：同一进程中 `createProgram` 的**首次**调用（TypeScript 模块本身已在更早的 `initSpecifierAnalysis` 里加载）——测量脚本自身只做了一次 blob 读取，因此它测的是「TypeScript 解析器未预热」，**不是**「OS 文件缓存冷」；后者在本机无法在不重启的前提下可控复现，故**不声称**测过。**测量脚本**：临时脚本（写在系统 temp、跑完自删），用与生成器**同一批**内核函数（`createIndexCompilerHost` / `symbolCompilerOptions` / `buildSymbolGraph`）避免另造第二套解析；逐项命令见下表。

| 量 | 实测值 | 条件 / 命令 |
| --- | --- | --- |
| ① `createProgram` + `getTypeChecker` + 遍历全部源文件 | **冷 167.1 ms** · **热 72.9 / 66.0 ms（中位数 69.5 ms）** | 同进程 3 次；`rootNames` = 28 个符号面文件；Program 源文件 28 个（仓库外 0） |
| ①b `buildSymbolGraph` 全量（createProgram + 声明表 + 符号边） | **冷 176.1 ms** · 热 179.1 / 150.3 ms（**中位数 164.7 ms**）；内核自报 `createProgram` 42–44 ms / 符号遍历 107–135 ms | 同进程 3 次；声明 402 / 符号边 1,347（三次逐项相同 ⇒ 顺带证明确定性不是"平均下来一致"） |
| ①c **端到端**进程耗时（`node scripts/generate-reference-graph.cjs`，含 git 读取 + 文件级边 + 序列化 + 写盘判定） | **冷 1,786 ms** · 热 1,934 / 1,534 ms（**中位数 1,734 ms**）；生成器自报 1,263–1,576 ms | `spawnSync` 3 次；**红线「单次 CAS 提交 ≤ 2 s」在热态中位数下通过（1.73 s < 2 s），但冷/热三次里有 1 次 1,934 ms 逼近红线**——如实记账 |
| ② 声明 / 符号边条数 | **402 / 1,347**（`type-reference` 805 · `import` 472 · `export-from` 70） | `--json` → `symbolGraph.*` |
| ② 符号级两数组字节（缩进 2，与产物同口径） | `declarations` **101,293 B** + `symbol_edges` **727,531 B** = **828,824 B（0.79 MiB）** | `JSON.stringify(<该数组>, null, 2) + '\n'` 的 UTF-8 字节 |
| ② 产物整份字节 | **1,482,686 B（1.41 MiB）**，分解：`symbol_edges` 727,531 + `files` 291,466 + `edges` 239,834 + `declarations` 101,293 + `meta` 4,789 = **1,364,913** + 余项 **117,773**（括号/逗号 + 嵌套缩进差）= 1,482,686 | `git cat-file blob :ledger/references.json` 的长度 |
| ② 相对文件级的增长倍数 | **2.543 倍**（1,482,686 ÷ 583,014；分母 = 同一份索引上「`meta` + `files` + `edges` + `schema_version: 1`」的口径近似，**不是**历史 v1 产物的原样字节——那一份从未提交、已不在仓库里） | 同上 |
| ② 规模护栏（产物 ≤ 5 MB · 生成 ≤ 30 s） | **都通过且余量很大**：产物 1.41 MiB（占护栏 28%）· 端到端 1.73 s（占护栏 5.8%）⇒ **本批不需要分层存储 / 按需展开 / 分片**（P8 的取舍判据） | 同上 |
| ③ 单文件语法树（`ts.createSourceFile`，`ScriptTarget.Latest` + `setParentNodes`） | `src/index.ts`（18 行）**0.08 ms** · `src/engine/store.ts`（378 行）**1.31 ms** · `src/engine/template.ts`（1,893 行）**0.23 ms** · `src/engine/edit.ts`（869 行）**3.16 ms** · `src/tools.ts`（1,835 行）**5.72 ms**（各 5 次取中位数） | 注意 `template.ts` 比 `tools.ts` **行数更多却快 25 倍**：`createSourceFile` 只构造语法树、不求值，单文件耗时由**语法复杂度**而非行数主导。所以「按需展开的代价」不能按行数外推 |
| ③ 单文件 Program（`createProgram` + `getTypeChecker`，含其 import 闭包） | `src/engine/template.ts`（闭包 1 个源文件）**0.8 ms** · `src/engine/store.ts`（10 个）**14.0 ms** · `src/engine/edit.ts`（11 个）**19.3 ms** · `src/tools.ts`（20 个）**38.0 ms** · `src/index.ts`（26 个）**49.6 ms**（各 5 次取中位数） | **最贵的不是最大的文件，是最"中心"的文件**：`src/index.ts` 只有 18 行却要 49.6 ms，因为它是 barrel、拖进 26 个源文件 |
| ③ 与 2.5 ④ 的判据比对 | **结论：按需展开必须走「单文件语法树」**（0.08–5.72 ms，全部远低于建议阈值 20 ms/文件）；**不能**走「单文件 Program」（4/5 个样本超阈值，最贵 49.6 ms）。这条不改 2.5 的分层设计（④ 本来就不落盘），但**定死了增量 4 的实现路线** | 同上 |
| ④ 跨文件边 | **756 条**（`cross_file = to.file 非空且 ≠ from.file`），占符号边 56.1%；其中 `to.sym` 非空 **756 条（100%）**；按 kind 分：`import` 346 / `type-reference` 340 / `export-from` 70 | `--json` → `symbolGraph.crossFileEdges` |
| ④ 与 2.5 ③ 的下界比对 | 实测 756 ≫ 下界 220，且**口径不同**（220 只数文件级模块说明符边；756 含 `type-reference` 与穿透后的逐名字 `import`）——**两个数都对，不得互相替代** | 见 §2.8 的同一处说明 |
| 附带：**无静默 null** | `to.sym === null && !reason` 的边 **0 条**（生成器里是抛错级不变量，不是统计值） | `--json` → `symbolGraph.silentNullEdges` |
| 附带：幂等 | 连跑两次逐字节相同（同为 1,482,686 B）；`--check` exit 0 | 临时脚本内 `spawnSync` 两次后比 sha256 |

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
| **1** | **新增了第 5 道门禁**：`scripts/check-file-ledger.cjs`（`npm run check:ledger`）+ 配套写入侧 `scripts/generate-file-ledger.cjs`（`npm run ledger:gen` / `check:ledger:gen`），并把 `ledger/file-ledger.json` 作为唯一新增数据文件 | 旧稿的分工假设是"门禁数量不变、复用既有解析器"；该假设在本文档里已被改写为**既定事实**——§6.3 标题即"与五道既有门禁的分工"（节标题现行位置 `docs/DESIGN-code-graph.zh-CN.md:573`；本文档本行以下又新增了内容，全部自引用锚点都会随之漂移，按内容搜而不是按行号数；§6.3 里的 "CHECK_TITLES（84-94）" 这类**指向脚本**的行号同样会随脚本改动漂移），第 11 节 P1 也记着"增量 1 已经把门禁从 4 道推到 5 道"（§10.2 建议段 `docs/DESIGN-code-graph.zh-CN.md:571`、P1 行 `:905`） | 用户的增量 1 目标就是"让『这个文件有没有人管』变成可断言的机器事实"。既有四道门禁没有一道管**文件归属**：`check-references` 管引用完整性、`check-doc-snippets` 管文档示例、`check-lib-sync` 管产物逐字节、`check-examples` 管示例可执行。不新增门禁就只能"描述"归属而不能"断言"它 | 门禁计数 4 → 5；`package.json`（`check:ledger`/`check:ledger:gen`/`ledger:gen`/`check` 链）、`.github/workflows/ci.yml`（两个独立 step）、`CONTRIBUTING.md` 的台账门禁清单（实测 `:29-46`；写作时为 `CONTRIBUTING.md:22-34`，已漂移）三处同步；后续增量新增门禁时**必须**按这套三处同步走（§6.3 末段 `:558` 已写成约束） |
| **2** | **改动了 `src/` 行为**：索引里 `src/*.ts` 的改动面是 18 个文件（`git status --porcelain -- src` 有 18 条，含新增的 `src/execution.ts`） | 本文档两处写"不改 `src/` 行为、不需要重建 `lib/`"（文档头边界声明 `docs/DESIGN-code-graph.zh-CN.md:7`、§9.5 `:706`）。但这两句的**主语是"图与改动记录的生成器"（第 2–6 节的新方向）**，不是增量 1：增量 1 的门禁脚本本身只读、确实不碰 `src/`；改动 `src/` 的是同一工作区里**另一批已暂存的引擎改造**（`git diff --cached --stat -- src`：17 个文件的差异统计为 524 插入 / 157 删除，另加新增的 `src/execution.ts`，合计 18 条） | 该批 `src/` 改动早于本轮、已 `git add` 进索引在本轮之前，不是增量 1 的产物；本轮（R4 + 文档对齐）**一个字都没有改 `src/`**（改动前后 `git status --porcelain -- src` 输出逐字节相同） | ⚠ **必须区分两个命题，否则会把"增量 2 不改 `src/`"误推成"增量 1 没改 `src/`"**：① 增量 2 的落点选择（生成器放 `scripts/`）⇒ 与 `check:libsync` 零交互；② 增量 1 落地时的 `src/` 改动面 = 索引里那 18 个文件。二者都真，但说的不是同一件事。本轮只**记录**这张改动面，不动它（触碰它会牵连 `lib/` 重建与 `check:libsync`，超出本轮范围） |
| **3** | **跨文档引用的行号与命中范围更正**：脚本内枚举（`CHECK_TITLES`）、`--help`、人类报告、`--json` 的 `summary.checks` 曾各自演进，文档里引用的"行号 / 命中范围"随之失效，必须按当前实测值写 | 旧稿与本轮的早期引用给过已失效的锚点，例如"台账豁免模式的 2-115 行"；按**当时**文件实测，`exempt_patterns` 数组的范围是 **18-115 行**（`:18` 是数组起点、`:116` 是 `grandfathered` 起点）——**该内嵌数组已在 v2 迁到 `ledger/exempt.gitignore`，这两个行号只是改造前的历史锚点，现状不再适用**；旧的 `tracked-mismatch / unlisted` 检查名现已不存在，被拆成 `tracked-mismatch`（`:120`）、`ledger-index-drift`（`:119`）、`ledger-missing`（`:118`）三项 | 用户要求"结论必须带文件:行号"，行号写了就得能复核；引用一个已改名或已删的入口，等于制造第二份真相互相矛盾 | 只动**引用与措辞**，不动任何判定与数字。**数据随实现变化，改实现要同步这里**：每次改门禁 / 生成器 / 内核 / 台账 / 豁免清单，都要按下面的实测值回改本行。本轮（v2 语义校准）复核后的实测值：门禁 `scripts/check-file-ledger.cjs` **2003 行**、生成器 `scripts/generate-file-ledger.cjs` **799 行**、共享内核 `scripts/file-ledger-core.cjs` **462 行**、台账 `ledger/file-ledger.json` **168 行 / 10131 B**、豁免清单 `ledger/exempt.gitignore` **56 行 / 7226 B**、`CONTRIBUTING.md` **100 行**（上一轮的 1,426 行 / 403 行 / 147 行 / 82 行已被本次语义校准取代，本节按新值更正；`CONTRIBUTING.md` 的 88 行是本轮补文档前的值）。**补测（v3 版本字面量门禁轮次）**：`scripts/check-references.cjs` **2374 行 / 107815 B**（v3 记 3384 行 / 151442 B、更早记 3,089 行 / 136,739 B，两者都已被本次复核取代——解析器已抽到 `scripts/reference-graph-core.cjs`）、`scripts/check-doc-snippets.cjs` **1630 行**、`scripts/check-lib-sync.cjs` **1573 行**（原写 1,439 行）、`scripts/check-examples.cjs` **1051 行**（原写 974 行）。**行数口径**：等于「显式行数」= `([IO.File]::ReadAllText(f) -split "\`n").Length`，等价于编辑器 / `Set-Content` 的**末行号**（文件末尾有换行时少 1），等价于 Linux `wc -l` 的**换行符数 + 1**；`ledger/file-ledger.json` 的 168 行可由数据自证（`meta.tracked_total` 之外，其 `git ls-files` 计数与本文件行数同口径）。字面量数量口径见下方「字面量清单规模」小节 |

**本轮顺带修正的 3 处已失效交叉引用**（与上表第 3 条同源，只改引用、不改判定）。

> **这些行号是"当时实测"，改本文档本身就会让它们漂移**（本轮补版本字面量门禁时，本文档在 `:33` 附近新增了几行，下面三个锚点就整体后移了 1–2 行）。所以每个锚点都同时给出**它当时指向的内容**，复核时按内容搜、别只按行号数；数据随实现变化，改实现要同步这里。

1. 文档头 `docs/DESIGN-code-graph.zh-CN.md:14` 原写 "由本门禁的 tracked-mismatch / **unlisted** 检查报出" —— `unlisted` 在本门禁里**不存在**，已被替换为 `tracked-mismatch` / `ledger-index-drift` / `ledger-missing` 三项（它们负责台账与索引不一致这一族）。**锚点状态：已失效**——`:14` 现在是空白行，而按内容搜 `tracked-mismatch` 在文档里只命中本偏差表的三行（`:803` / `:809` / `:956`，全是"事后叙述"而非那句原文），**无法判定该句现在落在哪一行**（原文已在后续改写中被替换掉）。标 **待实测**：复核时请直接搜 `tracked-mismatch` 看这三处叙述，不要按 `:14` 数。
2. §7.6 表（**当时实测**的锚点 `docs/DESIGN-code-graph.zh-CN.md:621`）里的 "147 行里的 18-115 行"：**锚点已漂移**，该句现落在 `:810`；`:621` 现在是 `accounted` 相关的另一句。内容本身也已改变——那句话已标注为**改造前的历史锚点**：`exempt_patterns` 内嵌数组**已迁到** `ledger/exempt.gitignore`，两条边界（`:18` 数组起点 / `:116` `grandfathered` 起点）指的是**改造前**的 `ledger/file-ledger.json`，现状不再适用。
3. §6.3 的 "**五道**既有门禁"：节标题现落在 `docs/DESIGN-code-graph.zh-CN.md:573`（**当时实测**的锚点写的是 `:547`，该行现在是 §6.1 表里的 `dead-anchor` 行）；第 11 节 P1 行现落在 `docs/DESIGN-code-graph.zh-CN.md:905`（**当时实测**的锚点写的是 `:873`，该行现为空白行）。两者计数口径统一：门禁总数 = **5**（含增量 1 新增的 `check:ledger`），`check:ledger:gen` 是同一道门禁的写入侧校验，不另计一道。

**§7.6 承诺的「台账语义校准」已落地（2026-10-05，后续增量）**：`owned` / `exempt` / `accounted`、豁免抽成独立文件（`ledger/exempt.gitignore`）、`accounted` 补清点日期与依据、`.gitignore` 交叉校验、`schema_version` 1 → 2 **全部实现**，与上表的缺陷修复（R1/R2/R3/R4/R6/R7/R8）分两批进行：上表是本轮（R 系列）的偏差记录，语义校准是随后一轮的落地，两者都在本节的"增量 1"里留了实测锚点。改造前的状态**不再代表现状**，现状以第 7 节的状态行与下面的 v2 小节为准。

### 增量 1：全仓文件台账（**已落地**）

- **产物（实测存在）**：数据 `ledger/file-ledger.json`（168 行 / 10131 B，`schema_version: 2`）+ 独立豁免清单 `ledger/exempt.gitignore`（56 行 / 19 条模式）；生成器 `scripts/generate-file-ledger.cjs`（799 行）；门禁 `scripts/check-file-ledger.cjs`（2003 行，`CHECK_TITLES` **13 项**）；两者共用的内核 `scripts/file-ledger-core.cjs`（462 行，唯一事实来源）。
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
  - 全链证据：`npm test` 里的 `file-ledger-ratchet-e2e.mjs` 共 **84 条断言全通过**（含两条验收项：「`schema_version` 不匹配 → 门禁与生成器都 exit 1」与「豁免条目缺 `reason` → exit 1」）；`npm run check:ledger` 与 `npm run check:ledger:gen` 在本轮提交后 **exit 0**、`npm run ledger:gen` 再次运行报告"未改动文件"（幂等）。
- **不做**：不做符号级图、不做改动记录、不碰工具契约、不跑全仓重算。

### 增量 2：文件级引用图 + 改动记录骨架

- **范围**：先只做**文件层**——复用 `check-references.cjs` 的解析器（3.5 的抽取）产出文件级节点与边，落盘为图数据；同时建立改动记录的目录、命名、字段（4.4 / 4.5）与**生成器**，观测点 = 每次提交（CAS 写入见 §4.6 的落地口径）。
- **改动面（实际落地，与原计划的偏差逐条注明）**：抽取目标是 `scripts/reference-graph-core.cjs`（**不是**原计划的 `scripts/lib/reference-parsers.cjs`；纯抽取，`check-references.cjs` 改为 require 它，行为逐字节不变）；图是**单文件** `ledger/references.json`（**不是**原计划的 `ledger/graph/` 分片——先量后切，理由见 §2.7）；改动记录落点 `ledger/change-log/`（**不是**原计划的 `ledger/changes/`，改名理由见 §4.6）；`check-references.cjs` 本身**不改判定**。
- **豁免面（本批新增，必须单独披露）**：`scripts/check-references.cjs` 的 `DELETED_REFERENCE_ALLOWLIST` 新增 **3 条**（`ledger/references.json`、`ledger/change-log/*`、`docs/DESIGN-code-graph.zh-CN.md` → `docs/VIDEO-SCRIPT.zh-CN.md`），`SELF_EXCLUDED_FILES` 新增 **1 个自指排除文件**（`scripts/reference-graph-core.cjs`）。**判定逻辑一个字没动，但判定的结果面变了**（同输入下 10 error / 1,001 warning / `allowlisted` 3 → 0 error / 633 warning / `allowlisted` 371），所以它属于"改动面"而不是实现细节——不写出来，读者会把「本批让门禁由红转绿」误读成"代码搬家顺手修了 bug"。逐条 reason 与收窄方式（把 `deleted` 从 `'*'` 收窄到具体路径）见 `scripts/check-references.cjs:213-248` 与 `:257`。
  **为什么是必要的**：本批新增的**图产物**（`ledger/references.json`）、**改动记录**（`ledger/change-log/*`）与**本文档 §4.6** 都按构造要写出**真实删除路径的字面量**——机器生成的路径索引（每个节点一个 `id`、每条边一个 `resolved`）必然包含历史删除路径的 basename，那是**数据**，不是残留提及；§4.6 用一次真实删除（`ed404e5`）当反例，也是在叙述历史事实（与 `CHANGELOG.md` 同一类文体，后者从一开始就在豁免清单里）。真正的「谁还在引用被删的东西」由**图里**的 `status=dangling` + `to.state=deleted` 表达，比 basename 次级线索精确得多——所以这 3 条豁免是**收窄到具体产物**的（两条 `deleted: '*'` 只覆盖机器生成物的单文件/单目录，第三条只豁免 `docs/VIDEO-SCRIPT.zh-CN.md` 这一条路径），不是把 `deleted-reference` 检查整体放开。
- **可被断言的验收标准**：
  1. 抽取前后各跑一次 `node scripts/check-references.cjs --json`，两份输出**逐字节相同**（证明纯重构）；
  2. 文件级图的边集合 ⊇ `check-references` 报出的悬空边目标集合（同源校验，6.1）；
  3. 生成器幂等：同一工作区连跑两次，图数据**逐字节相同**；
  4. 一次真实提交后生成一条改动记录，字段齐全（4.5 的必填项），且 `from_snapshot.universe_hash` 等于提交前的 `git ls-files` 摘要；
  5. `universe_hash` 与当前索引不一致时，记录/复核返回 `degradation.status: "stale"`（不是空数组）。
- **不做**：不做符号解析（不建 `createProgram`）、不做函数内变量、不做传递闭包。

> **落地状态（2026-10-05，增量 2 批次）**：
> - **已完成（文件级图）**：解析器抽取（`scripts/reference-graph-core.cjs`，纯重构、`--json` stdout 逐字节相同）、文件级图产物 `ledger/references.json`（**增量 2 时为 `schema_version: 1`，增量 3 已升到 2**，字段表与 JSON Schema 草案见 §2.7）、生成器 `scripts/generate-reference-graph.cjs`（幂等 / 确定性 / 索引基准）、接线三处（`package.json` 的 `check:graph` + `graph:gen` 与 `check` 链、`ci.yml` 独立 step、`CONTRIBUTING.md` 清单与快照行）、回归用例 `tests/reference-graph-e2e.mjs`（增量 2 时 **57 条断言**，增量 3 增至 **97 条**，本批因新增第 15 组根级用例增到 **111 条**；夹具里造出 `ignored` / `untracked` / `deleted` / `dangling` / 死锚点五种负例，另有 `graph-index-drift` 与降级词 `unknown` 的退出码级负例）、规模与耗时实测（§2.7 的表）。
> - **已完成（改动记录，本批新增）**：落点 `ledger/change-log/` + 机器判据 `ledger/change-log/schema.json` + 生成器 `scripts/generate-change-log.cjs`（v1.0.0）+ 门禁 `npm run check:changes`（接线三处：`package.json` 的 `check:changes` / `changelog:gen` 与 `check` 链第 12 环、`ci.yml` 独立 step、`CONTRIBUTING.md` 清单与快照行）+ 回归用例 `tests/change-log-e2e.mjs`（**103 条断言**，含 `complete` / `partial` / `unknown` / `stale` **四态的退出码级负例**）+ 2 条**真实历史**的记录。字段表、降级契约与落点改名理由见 §4.6。
> - **验收标准 1 的实测（本批修正：原值不可复现，已换成受控对照）**：抽取的**纯度**由「同一仓库根、同一索引下两侧 `--json` 的 stdout 逐字节相同」证明，但两侧必须先把**豁免面拉平**——本批给 `check-references.cjs` 新增了 3 条 `DELETED_REFERENCE_ALLOWLIST` 与 1 个自指排除文件（见上一条），判定逻辑没动、判定的**结果面**动了。把这两个常量逐字还原成 `607e1a2`（v0.8.3）版后：**两侧 stdout 同为 526,906 B / 13,221 行 / sha256 `a8520ffa43f5b240b3788fb581049c2aeea59075a1f16e5c0661078ad531cd1e` / 退出码 1、1**（root = `<repo-root>`；索引 = 本批提交态，`git ls-files` 1,412 条、`universe_hash` `6caeeaeb42d60f6a…`）。**不还原**则两侧不同：出货默认态 0 error / 633 warning / `allowlisted` 371（587,516 B / sha256 `cb67be253beb6db9c3e7cca2a79082b15954b6fc9efb0762686b2b7be8c8dfbb` / 退出码 0），抽取前 10 error / 1,001 warning / `allowlisted` 3——差额恰好是新增的豁免。上一批本文档写的 `c283b076…`（327,576 B / 8,047 行）是一次**陈旧测量**（既不等于抽取前的当前值、也不等于抽取后的当前值），本批删除该值、保留条件化的可复现证据；完整复现条件（含「`--json` 的 stdout 内嵌 `root` 绝对路径 ⇒ 字节数与 sha256 随 root 路径长度变化，实测同内容下 48 字符根 526,935 B / 23 字符根 526,906 B，只差 `root` 一行 29 B」以及「本表是时点快照，文档自身行号也会移动它」这两条）见 §2.7。
> - **验收标准 3 的实测**：同一工作区连跑两次，`ledger/references.json` 逐字节相同、`--check` exit 0。
> - **本批补强：`graph-index-drift`（与台账侧 `ledger-index-drift` 对称，负例已接进 `npm test`）**：`--check` 的判定基准是索引 blob，于是「工作区那份图被写坏」原本**完全不可见**（索引里那份是对的 ⇒ 照旧 exit 0）。现在三种情形都逐条点名并 exit 1——① 工作区图不可解析（`type: graph-worktree-unparsable`）；② 坏图 `git add` 之后（`unparsable` 与"索引不一致"两条红线同时亮，不因"两边一样坏"而互相抵消）；③ 工作区图是**合法 JSON 但与索引不一致**（`type: graph-worktree-vs-index`，旧实现在这一条上正是 exit 0，最能说明问题）；恢复一致 → exit 0 且回显 `降级状态 = complete`。索引里没有图文件时判定退回工作区副本，输出 `[unknown]` + `type: graph-not-in-index` 并 **exit 1**（基准不可用 ⇒ 不判绿，与 §4.6「`unknown` 与 `stale` 都不判绿（exit 1）」同一条铁律，不另立词汇）。回归用例 = `tests/reference-graph-e2e.mjs` 第 12 组（14 条断言，a–e 五段）。
> - **验收标准 2（图 ⊇ 悬空边）**：**未做**——当前仓库 `dangling` 边为 0，这条同源校验要等有真实悬空目标时才谈得上；图与门禁共用同一批解析器（同一个 `resolveRelativeSpecifier` / `indexPathState`），因此结构上不会出现「门禁说悬空、图说没事」。
> - **验收标准 4 的实测（本批完成）**：`node scripts/generate-change-log.cjs --commit ed404e5` 产出的记录字段齐全，`from_snapshot.universe_hash` = `3f4ee1e9c384d7c3…`、`to_snapshot.universe_hash` = `0b97042b8cca2786…`，两者都与测试里**独立算出**的 `sha256(sort(git ls-tree -r --name-only <rev>).join('\n') + '\n')` 相等（`tests/change-log-e2e.mjs` 第 2 组）。**注意口径差异**：`--commit <rev>` 的 `from` 是**父提交的树**（不是「提交前的 `git ls-files` 索引」，那条口径只对 `--index` 成立）——这是刻意的：提交树的基准不可变，才谈得上「可复核」。
> - **验收标准 5 的实测（本批完成）**：`degradation.status` 四态齐备（`complete` / `partial` / `unknown` / `stale`，语义与判据见 §4.6），**四态都有退出码级证据**：① `complete` —— 两条真实记录；② `partial` —— 在 `--depth 2` 的**浅克隆**里生成记录 → `status = "partial"`、`reasons = ["history-unavailable"]`、`note` 明说「有已知缺口，不得当完整清单」（且**不得**写成 complete 的那句「数组为空 = 真的没有差异」），该记录随后 `--check` **exit 0**（partial 是可复核的降级，不是红）；③ `unknown` —— 记录指向不存在的提交 → `--check` **exit 1**、报「基准不可用，无法复核（未证伪也未证实）」；④ `stale` —— 暂存态记录（`--index`）在其后索引变化 → `--check` **exit 1**、报 `[stale]` 与「记录描述的暂存态已经不存在」。另有负例：谎称 `resolved`（篡改 `edges.status_changed[0].to_status`）→ `--check` **exit 1** 并**点名到字段**。
> - **刻意不做**：不新增「图与真实不一致就红」之外的严格判定（增量 6）；不做符号表（`declarations`）、不做 `type-reference` 边、不做传递闭包与查询接口（这几条写进每条记录的 `omitted` 字段自证）。
> - **本批顺带修掉的两处诚实性缺口**（`scripts/generate-file-ledger.cjs` 的写盘模式 + 台账指引，均带负例断言）：
>   ① **生成器写盘模式不再静默自愈**：写盘模式检出「索引版 / 工作区版台账里有、而 HEAD 基线里没有」的 `accounted` 条目时，**逐条点名 + 拒绝写盘 + exit 1**（判据是**索引版 ∪ 工作区版**，只查一份会漏）。修复前的危害窗口是「手工加条目 → 跑生成器（静默剔除、报告还写『剔除的非基线条目 0 条』、exit 0）→ `git add` 台账 → 不跑 `check:ledger:gen` 就提交」，事后全链绿、洗白被固化。选「直接红」而不是「warning + exit 0」的理由是本仓既定哲学 fail-closed、宁可红不假绿：生成器的职责是重算机器可算的部分，**绝不能替一条非法条目做静默自愈**；拒绝写盘还保证了「跳过 `--check` 直接提交」拿不到被洗干净的台账。负例：`tests/file-ledger-ratchet-e2e.mjs` 第 9a 组（门禁 exit 1 / `--check` exit 1 / **写盘模式 exit 1 + 点名 + 台账未被改写**）、第 9a-2 组（**只改工作区不 `git add`** 同样拦）。
>   ② **「把新文件加进 `accounted` 转绿」这条错误指引已改对**：`check-file-ledger.cjs` 的 `--help`、`exempt`/`unowned-file` 的 hint、`generate-file-ledger.cjs` 的 `--help` 与 `CONTRIBUTING.md` 现在都写明**新增已跟踪文件只有两条路**（`owned` / `exempt`），并明确否掉第三条。正负例成对：第 9a 组按旧指引走 → **exit 1**；第 9b 组按新指引在豁免清单里加一条**带 reason** 的模式 → 门禁与生成器**都 exit 0**。

### 增量 3：符号级跨文件解析（**已落地**，2026-10-05）

- **范围**：接入 `ts.createProgram` + `getTypeChecker`，把 `import` / `export-from` / `type-reference` 边从文件级提升到**符号级**，并穿透 `export *` 再导出（`src/index.ts` 是主要受益者）。
- **改动面（实际落地）**：图生成器 `scripts/generate-reference-graph.cjs` 新增 program 路径（`v1.0.0` → **`v1.1.0`**；`GRAPH_SCHEMA_VERSION` 1 → **2**）；符号级实现落在**共享内核** `scripts/reference-graph-core.cjs`（`buildSymbolGraph` / `createIndexCompilerHost` / `symbolCompilerOptions` / `SYMBOL_REASONS` / `STATUS_OF_INDEX_STATE`），**新增依赖 0 个**（用仓库自带 typescript 5.9.3）；`meta.analysis.typescript_version` 落盘（**注意**：本节的计划文字原写「`meta.ts_version` 落盘」，实际落点叫 `meta.analysis.typescript_version`，与 `meta.analysis.mode` / `.degraded` 同域——口径一致优先于名字一致，如实记账）；`.mjs` / `.cjs` / `.js` / `.jsx` 按 §3.4 退化为文件级并写进 `meta.symbol_graph.degraded_extensions`；`ledger/change-log/schema.json` 的 `graph_schema_version` 1 → 2（图升版的同步面，两条已落盘记录随之改标签，`files` / `edges` 差一个字节未变，`npm run check:changes` 重算复核实测通过）；接线三处（`ci.yml` 注释、`CONTRIBUTING.md` 清单与快照行——`package.json` 的两个 script 未变）。
- **四条验收标准的实测结果**：
  1. **`export *` 穿透 —— 通过**。真仓库：`src/index.ts` 的 `export-from` 符号边 **68 条**，`to.sym` 非空 **68/68**，穿透到 **12 个**定义文件（`src/tools.ts` / `src/engine/*.ts` / `src/service.ts` / `src/planning.ts` / `src/execution.ts` / `src/adapters/promptmanager.ts`），**停在 `src/index.ts` 自身的边 0 条**。代表性证据：`src/index.ts:2:10` 的 `export-from` → `to.sym = src/tools.ts#createNormifyTools@683:17`（**定义文件**，不是 re-export 那一行；`src/index.ts:2` 原文即 `export { createNormifyTools, … } from './tools.js';`）。夹具：`tests/reference-graph-e2e.mjs` 第 13 组造 a→b→c 三层 `export *` 链，断言 `consumer` 的 import 边 `to.sym = src/refgraph-barrel-c.ts#refgraphDeepSymbol@1:14`（**最里层的定义文件**）且 `to.file ≠ barrel-a`（链条入口）。
  2. **同名不合并 —— 通过**。真仓库有 **4 个重名、共 14 个节点**，最有说服力的是 4 个 `DepKind`：`src/engine/edit.ts:31` / `frontmatter.ts:17` / `layout.ts:20` / `policy.ts:18`，四个 id 互不相同，而它们的**源码行逐字相同**（`type DepKind = (typeof DEP_KINDS)[number];`）——**只有符号身份能把它们分开**，图中的类型引用也如实分成 4 条边、各自指向各自那个节点。夹具：第 13 组给 `src/engine/store.ts` 与 `src/engine/edit.ts` 各追加一个 `load`，断言两个节点 id 不同、且 `./engine/store.js` 与 `./engine/edit.js` 两条 import 边分别指向各自那个节点。
  3. **无静默 null —— 通过（抛错级不变量）**。1,347 条符号边中 `to.sym === null && !reason` 的 **0 条**；未解析的 358 条**逐条**带原因码（`symbol-not-found-in-program` 215 / `bare-module-specifier` 126 / `declaration-out-of-scope` 9 / `external-module-symbol` 8）。实现上是 `buildGraph` 里直接 `throw`（违反 ⇒ 生成失败、不写盘），**不是**统计之后写个 0：`meta.symbol_graph.silent_null_edges` 是恒量。外部依赖这条另有真仓库证据：`@modelcontextprotocol/sdk/server/index.js` 的边 `status = external` 且 `reason = bare-module-specifier`。
  4. **§9.7 待实测项回填 —— 完成 4 项**（`createProgram` 冷热耗时、产物体积、按需展开代价、跨文件边条数），数字与条件见 §9.7 的实测表；剩余 3 项（`intra_ref_digest` 误报率、CRLF/LF 逐字节一致性、改动记录单条体积中的最后一项已测）**如实留在「仍未实测」**，不拿结构性推理替代实测。
- **本批修掉的一处实测假绿（必须单独披露）**：`createIndexCompilerHost` 原本把**仓库外**路径委派给 `ts.createCompilerHost` 的默认实现，于是「Program 里只有 rootNames」这条自证**只在仓库根的父目录恰好没有 `node_modules` 时成立**。夹具把仓库物化到 `%TEMP%\…` 下（夹具自身没有 `node_modules`，但 `%TEMP%\node_modules` 存在）⇒ 默认宿主把 `zod` / `ajv` / `yaml` / `@modelcontextprotocol` 等 **212 个仓库外源文件**拉进 Program（`program_outside_repo_files = 212`、`program_source_files = 247 ≠ root_names 35`）。修法是让 `fileExists` / `readFile` / `getSourceFile` / `directoryExists` / `getDirectories` 对仓库外路径**一律返回「不存在」**（连磁盘都不看），于是 `program_outside_repo_files = 0` 成为**结构性保证**。**修复对真仓库是逐字节中性的**（实测：修复前后重生成的 `ledger/references.json` 完全相同，`程序 28 个源文件 / 仓库外 0 个`），它只把「凑巧安全」换成「保证安全」。负例已被测试覆盖：`tests/reference-graph-e2e.mjs` 第 13 组的 `Program 自证` 两条断言在修复前**红**、修复后**绿**。
- **不做**：不做函数内局部变量与参数（增量 4）、不做按需展开（增量 4）、不做传递闭包与查询接口（增量 5）、不做变更影响门禁（增量 6）。
- **`check:refs` 的 warning 面变化（必须披露）**：本批把 `docs/DESIGN-code-graph.zh-CN.md` / `CONTRIBUTING.md` / `.github/workflows/ci.yml` 的说明文字改了，**warning 633 → 643（+10）**，**error 0 → 0**、退出码 0。10 条**全部**是既有的 `deleted-file-basename-mention` 家族（把 `package.json` / `README.md` / `index.ts` / `types.ts` 这类**历史删除路径的 basename**当次级线索报出的提示），与基线那 633 条同类同源；新增的 10 条来自本节新写的文字里出现的这些 basename 字面量（含本条自身）。**没有新增 error，也没有为此新增任何豁免**——既有豁免面（`DELETED_REFERENCE_ALLOWLIST` 3 条 + `SELF_EXCLUDED_FILES` 1 个）一字未动。
- **规模护栏结论**：产物 **1.41 MiB < 5 MB**、端到端 **1.73 s < 30 s** ⇒ **本批不触发**护栏，因此**不**引入分层存储 / 按需展开 / 只对 in-scope 代码建图 / 分片这四种处置中的任何一种；P8「图不分片 vs 分片」的答案因此仍是 §2.7 的「先量后切，本批单文件」。
- **一条实测踩到的操作坑（写给后来者，不是设计缺陷）**：`files[]` 里的 `bytes` / `lines` 取自**索引 blob**，而**生成器脚本自己也在 `files[]` 里**。于是"改完文档 → 跑 `graph:gen` → `git add`"这个顺序**会留下不一致**：`graph:gen` 把**当前索引里**那些文件的旧 `bytes` / `lines` 写进产物，而你刚刚改过、**还没 `git add`** 的文件在索引里仍是旧版本——两次实测都出现「工作区与索引逐字节相同、`--check` 却红」，差额恰好是被改文件的 `bytes` / `lines` 若干行。**正确顺序**：先把改动 `git add`（让索引成为最新事实）→ 再 `npm run graph:gen` → 再 `git add ledger/references.json` → 最后 `npm run check:graph` 确认 exit 0。产物大小可能**恰好不变**（上一批两次的字节数就完全相同，因为差额行数相同），所以"字节数没变"**不能**当作"内容没变"的证据。

### 增量 4：最小变量（函数内局部变量与参数）与按需展开

- **范围**：把 `decl_kind ∈ {variable(函数内), parameter}` 全部纳入节点表（用户原话「最小的变量也要」）；实现 2.5 ④ 的按需展开——文件内边不落盘，查询时对单文件重解析。
- **改动面**：节点枚举的作用域栈（3.2）；`intra_ref_digest` 与 `affected_files`（4.2）。
- **可被断言的验收标准**：
  1. `src/` 的节点数 = 2,624 ± 并行改动引起的漂移，且**函数内声明（2,417）逐条可查**；随机抽 20 个局部变量，每个都能回答"谁引用它"且答案与该文件的重新解析一致；
  2. 删除一个函数内局部变量并重算，改动记录的 `declarations.removed` 恰好含它一条；
  3. 按需展开耗时按 9.7 的方法测出；若 > 20 ms/文件，必须回退到"文件内边也落盘"并记录该取舍；
  4. **跨文件传播不穿过文件内边**这一点有测试：构造"局部变量 A 被同文件私有函数 B 使用、B 被另一文件引用"的夹具，删除 A 的传递闭包必须包含那个另一文件（证明 2.5 ④ 的判据成立）。
- **不做**：不把文件内边默认落盘（除非验收标准 3 触发回退）。

### 增量 5：查询接口（三个问句落地）（**已落地**）

- **范围**：实现 5.1 / 5.2 / 5.3 / 5.4 四个查询，含 `completeness` 降级契约（5.5）。
- **改动面**：`scripts/` 下的查询 CLI（`--json`）；**不新增 MCP 工具**（9.3）。
- **可被断言的验收标准**：
  1. Q1/Q2 对同一目标互为反向：`A ∈ inbound(B)` ⟺ `B ∈ outbound(A)`（在 `completeness` 相同的条件下）；
  2. Q3 的传递闭包在含环的图上**终止**且回显 `cycles[]`（`src/index.ts` 的再导出与 `src/engine/*` 的互引是现成夹具）；
  3. Q3 的结果区分 `type_only`：删一个纯类型导出，运行时引用数为 0 而类型引用数非 0；
  4. **不得假绿**：故意移除一个已跟踪文件使 `universe_hash` 失配，查询必须返回 `stale` 而不是空数组；故意让一个目标文件不可读，必须返回 `unknown`（对应 `check-references` 的"读不到就必须红"）。
- **不做**：不做变更影响门禁（增量 6）、不做跨平台矩阵。

### 增量 6：变更影响门禁 + 规模与跨平台定标（**已落地**）

- **范围**：落地 6.2 的"本次改动引入了未处理的引用影响 → error"（归属按 P1 拍板）；补齐 9.7 剩余待实测项；把 9.8 的变更意图对账项落地（按 P5 拍板）。
- **改动面**：若 P1 选 (b)：新增 `scripts/check-impact.cjs` + `package.json` 的 `check:impact` + `ci.yml` 独立 step + `CONTRIBUTING.md` 检查项清单与快照行（三处同步）。
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
| **P1** | 6.2 的"未处理引用影响"检查放哪？ | (a) 塞进 `scripts/check-references.cjs` 的新 check id；(b) 新增 `scripts/check-impact.cjs`（第 6 道门禁）；(c) 只做查询、不做门禁 | **(b)**：它依赖图快照与改动记录（有状态），而 `check-references` 的核心不变量是"无状态、只信任 git 索引、可对任意 `--root` fail-closed"。代价是门禁数量再 +1（增量 1 已把 4 道推到 5 道）。若用户不接受第 6 道门禁，退 **(a)** 但需接受该脚本边界被破坏 |
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
| 4 | 规模 | `Get-ChildItem -Recurse src -Filter *.ts` 逐文件统计 `\n` 数与字节；工作区同法（排除 `node_modules/`、`.git/`） | `src/**.ts`：9,782 行 / 516,319 B（旧记 521,118 B 是改造前快照，见 §7.6）；工作区：约 992,790 行（部分二进制/空文件读取报错，不影响量级） |
| 5 | 单条记录字节 | 用本文档 2.2/2.3 的字段构造**真实**记录（真实文件、真实行列）后 `JSON.stringify` + `Buffer.byteLength` | 节点记录 199–243 B（n=13，均值 221.3）；边记录 234–270 B（n=20，均值 253.2） |
| 6 | 索引与目录规模 | `git ls-files` / `git ls-files 'src/*.ts'` / `git ls-files 'lib/*'`；`Get-ChildItem .git -Recurse \| Measure-Object Length -Sum` | **当时实测**（改造前快照）：已跟踪 **1,399**；`src/*.ts` **28**；`lib/*` **84**；`.git` **43,479,139 B**。**本轮复测已变**：已跟踪 **1,402**、`.git` **44,307,366 B**（`src/*.ts` 28 与 `lib/*` 84 未变）——见 §7.6 与本表的时点说明 |
| 7 | `changes/` 是否存在 | `git ls-files \| Select-String 'changes/'`；`Get-ChildItem -Recurse -Directory -Filter changes` | **两处均无命中** ⇒ 本仓库没有 `changes/` 目录；`changes` 只是目标工程数据目录的源根名（`src/engine/manifest.ts:5`） |
| 8 | 豁免误伤事故的现场 | `Get-Content examples/bilibili-pi-full/.gitignore`；`git check-ignore -v <preview.md>`；读 `ledger/file-ledger.json` 的 `meta.known_divergences` | `.gitignore` 含 `*review*.md` 与注释「注意 "preview" 含子串 "review"，会被 `*review*.md` 误伤，故显式反选」+ 反选规则 `!**/modules/**/*.md`；当前 `git check-ignore -v` 对那两个文件**无输出**；台账 `known_divergences[0]` 记录了该历史 |
| 9 | 门禁基线（改稿前） | `node scripts/check-references.cjs`；`node scripts/check-doc-snippets.cjs` | 两者均 **EXIT 0** |
| 10 | 门禁复跑（改稿后） | 同上 | 两者均 **EXIT 0**（0 error / 0 warning）；`git status --porcelain` 无 `??` |
| 11 | 改名的连带影响核实 | `node scripts/check-file-ledger.cjs`；按 `scripts/generate-file-ledger.cjs` 的 `universeHash`（`.sort(byCodePoint)` + `sha256(tracked.join('\n') + '\n')`，实测 `:535-546`；写作时为 `scripts/generate-file-ledger.cjs:250-261`，已漂移，该坐标今天是豁免清单报错与 `main()` 开头）的算法复算索引哈希，并做"旧路径在 / 新路径不在"的反事实复算 | 台账门禁 **EXIT 1**，报 `ledger-universe-hash-drift`；反事实复算结果与台账存值**逐字符相同** ⇒ 漂移由本次改名唯一造成；修法是重跑 `npm run ledger:gen`（见附录 C） |

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
| `scripts/check-references.cjs` | ① 引用的路径必须**存在且在 git 索引里**（`untracked-reference` → error）；② 不得引用 git 历史中已删除的路径（`deleted-reference`，完整路径 error / basename warning）；③ Markdown 相对链接必须命中目标与真实标题（`dangling-reference` / `dead-anchor`）。**本文档因此对尚未落地的脚本只写行内代码、不写 Markdown 链接** | 脚本内 `CHECK_TITLES`（实测 `:116`；写作时为 `(84-94)`，已漂移）与各 `check*` 实现 |

**改名的连带影响（已实测，不是推测）**：`scripts/check-file-ledger.cjs` 的 `tracked-mismatch` 检查要求 `ledger/file-ledger.json` 的 `meta.universe_hash` 等于 `sha256(按码点升序排序后的 git ls-files 清单 join('\n') + '\n')`（算法见 `scripts/generate-file-ledger.cjs` 的 `universeHash`，实测 `:535-546`；写作时为 `scripts/generate-file-ledger.cjs:250-261`，已漂移）。本文档改名（删旧路径、增新路径）改变了该清单，实测后果：

| 项 | 实测值 |
| --- | --- |
| 台账里存的 `meta.universe_hash` | `2ccf4b7fcbebabe343254a7732b6153da8e770d2ce0a47ebd26fa51753a3942c` |
| 改名后按上述算法复算 | `72f515834bc893835595bc4c3d92ff29866ba572c198ab9726366039d6c2c4ae` |
| 台账门禁输出 | `ERROR ledger/file-ledger.json:1 -> meta.universe_hash [ledger-universe-hash-drift]` → **EXIT 1** |
| 归因验证（决定性） | 把索引换成"旧路径在、新路径不在"后复算 = `2ccf4b7f…`，**与台账存的值逐字符相同** ⇒ 该漂移由本次改名**唯一造成**，不是并发工作流带来的 |
| `tracked_total` | 旧 1399 / 新 1399（**数量不变**，只有哈希变——因为改名是"删一个、加一个"） |

⇒ **必须重跑 `npm run ledger:gen`** 重新生成台账，否则 `check:ledger` 会红。**改名本身不改台账条目**：`ledger/file-ledger.json` 的豁免模式已含 `docs/**`，新路径无需新增条目（这也是为什么唯一要做的动作就是重跑生成器）。
