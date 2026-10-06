# 交接：符号级引用图 + 逐次改动记录（`code-normify`）

本文档面向**接手这套东西的下一批执行者**。它只讲一件事：本仓的「引用图 + 改动记录 + 查询接口 + 门禁链」这一整套机器事实是怎么落的、字段口径是什么、哪里还是灰的、想改该怎么改。

设计动机与验收标准在 `docs/DESIGN-code-graph.zh-CN.md`（1,332 行，`node scripts/generate-reference-graph.cjs --check` 输出的 `lines` 字段实测值）；本文档不重复设计论证，只写**落地后的现状与口径**。

---

## 0. 本文档的取证基准（先读这一节，否则后面的数字不可信）

**所有数字都附出处**，写法是「数值（命令）」。凡是**我没有亲自跑过**、从别处抄来的数字，一律标 `（转述，未复核）`。

**快照时点**：2026-10-06，仓库根 `<repo-root>`，开工前 `HEAD = 790e626`（`git log --oneline -4`），`git status --porcelain` 输出为空。

**一个必须理解的前提**：本文档自身是**被图扫描的文件**。加入本文档前，图的值是「节点 1,415 · 边 498 · 扫描面 79」（`node scripts/generate-reference-graph.cjs --check`）；加入后是「节点 1,416 · 边 498 · 扫描面 80」（`node scripts/generate-reference-graph.cjs`，同一条命令加 `--check` 复检）。**本文档正文里给出的都是加入后的现值**，除非明确标了「加入前」。

**环境**：`node --version` → `v24.21.0`。

### 0.1 我亲自跑过的命令（原文照抄可复现）

```powershell
node --version
git log --oneline -4
git status --porcelain
node scripts/refs-query.cjs --help
node scripts/check-impact.cjs --help
node scripts/check-references.cjs --help
node scripts/check-doc-snippets.cjs --help
node scripts/generate-change-log.cjs --help
node scripts/check-examples.cjs --help
node scripts/check-lib-sync.cjs --help
node scripts/generate-reference-graph.cjs --check
node scripts/generate-reference-graph.cjs
node scripts/generate-file-ledger.cjs
node scripts/generate-file-ledger.cjs --check
node scripts/check-file-ledger.cjs
node scripts/check-impact.cjs
node scripts/check-references.cjs
node scripts/check-doc-snippets.cjs
node scripts/generate-change-log.cjs --check
node scripts/refs-query.cjs who-references src/engine/types.ts
node scripts/refs-query.cjs who-references src/engine/types.ts --json
node scripts/refs-query.cjs impact src/engine/types.ts
node scripts/refs-query.cjs impact src/engine/types.ts --json
node scripts/refs-query.cjs impact src/engine/types.ts --depth 1
node scripts/refs-query.cjs impact src/engine/types.ts --depth 3
node scripts/refs-query.cjs locals src/engine/types.ts
node scripts/refs-query.cjs who-references docs/NOPE.md
node scripts/refs-query.cjs who-references "src/engine/types.ts#Module@140:18"
node scripts/refs-query.cjs locals README.md
node scripts/refs-query.cjs bogus x
git rev-parse "ed404e5^{tree}"
git rev-parse "ed404e5^^{tree}"
git rev-parse "10766d1^{tree}"
git rev-parse "10766d1^^{tree}"
```

**没有跑过** `npm test`、`npm run check`、`tests/impact-gate-e2e.mjs`（见 §4.6：这三条我明确没跑，跑法与代价写在那里）。

### 0.2 取图产物现值的**一条命令**

本节以及全文所有「节点 / 边 / 声明 / 符号边」的计数，都来自这一条：

```powershell
node -e "const j=require('./ledger/references.json');console.log(JSON.stringify({schema_version:j.schema_version,files:j.files.length,edges:j.edges.length,declarations:j.declarations.length,symbol_edges:j.symbol_edges.length,edge_kinds:j.meta.edge_kinds,scanned:j.meta.scope.scanned_total,tracked:j.meta.tracked_total},null,2))"
```

现值输出（加入本文档后）：

```json
{
  "schema_version": 2,
  "files": 1416,
  "edges": 498,
  "declarations": 402,
  "symbol_edges": 1347,
  "edge_kinds": {"anchor":3,"ci-target":17,"dynamic-import":1,"export-from":19,"import":320,"markdown-link":35,"package-field":51,"require":52},
  "scanned": 80,
  "tracked": 1416
}
```

---

## 1. 这套东西是什么

**一段话**：`code-normify` 把「谁引用了谁」做成了一份**可机器复核的图数据**——`ledger/references.json` 由生成器从 **git 索引**（不是工作区）重算，节点 = 全量已跟踪文件，边 = 8 类文件级引用 + 3 类符号级引用；在其上是三层消费者：**只读查询层** `scripts/refs-query.cjs`（给人回答「谁引用我 / 删了我会炸谁 / 这文件声明了什么」）、**逐次改动记录** `ledger/change-log/*.json`（每次提交产一条「两份图快照之差」的不可变记录）、**门禁链**（`npm run check` 的 13 环，其中 4 环直接管这套数据）。三者共用同一个判定基准（git 索引 / 提交树），因此不会出现「门禁说悬空、查询说没事」的双真相。

### 1.1 产物 ↔ 用途

| 产物 | 谁写 | 谁读 | 回答什么问题 | 判定基准 |
| --- | --- | --- | --- | --- |
| `ledger/references.json`（`schema_version: 2`） | `scripts/generate-reference-graph.cjs` | `scripts/refs-query.cjs`、`scripts/check-impact.cjs`、`generate-change-log.cjs` | 谁引用了谁（文件级 + 符号级） | git 索引 blob |
| `ledger/file-ledger.json`（`schema_version: 2`） | `scripts/generate-file-ledger.cjs` | `scripts/check-file-ledger.cjs` | 这个文件有没有人管（四态归属） | git 索引 blob |
| `ledger/exempt.gitignore` | 人（必须逐条写 reason） | `scripts/check-file-ledger.cjs` | 哪些文件按什么理由豁免归属 | git 索引 blob |
| `ledger/change-log/*.json`（`schema_version: 1`） | `scripts/generate-change-log.cjs` | `node scripts/generate-change-log.cjs --check` | 这次改动动了哪些边与文件、影响了谁、处理了没有 | 由生成器写的**事实记录**，不参与判定 |
| `ledger/change-log/schema.json` | 人 | `--check`（ajv，draft 2020-12） | 记录的机器判据 | —— |
| `scripts/refs-query.cjs` | 人 | 人（**不在门禁链上**） | `who-references` / `impact` / `locals` | 读图产物（索引优先，回退工作区） |

上表「判定基准」一列逐条来自：`ledger/references.json` 的 `meta.read_basis`（实测值 = `文件内容一律取自索引 blob（git cat-file --batch），不读工作区`）、`ledger/file-ledger.json` 的 `meta.byte_basis`、`ledger/change-log/README.md:90-96`。

### 1.2 与「文件台账」的分工

`ledger/file-ledger.json` 管**归属**（这个文件有没有人管），`ledger/references.json` 管**引用**（谁引用谁），`ledger/change-log/` 管**一次改动的影响面**。三者同域（都在 `ledger/` 下）但**不共用判定**。

台账现值（`node scripts/check-file-ledger.cjs`，**加入本文档之后**）：

```text
台账宇宙: git ls-files 1416 条 · universe_hash fe49d5b7fec69b4d…
四态归属: owned 0 · exempt 1387 · accounted 29 · unowned 0
✔ 0 error / 0 warning —— 门禁通过
```

**加入本文档之前**的同一条命令给出的是 `git ls-files 1415 条` / `exempt 1386` / `unowned 0`——多出来的 1 个 `exempt` 就是本文档自己（`docs/**` 已在 `ledger/exempt.gitignore:43` 里有一条带 reason 的模式）。

**这一步踩到的坑（值得单独记）**：新增一个已跟踪文件会让 `git ls-files` 条数变 ⇒ 台账的 `meta.tracked_total` 与 `meta.universe_hash` 立刻漂移，`node scripts/check-file-ledger.cjs` 报 **2 个 error**（`ledger-tracked-total-drift` + `ledger-universe-hash-drift`），**exit 1**。**修法只有一条，而且是本仓明文规定的必做步骤**（`CONTRIBUTING.md:69`：`改完仓库后必须重跑 npm run ledger:gen`）：

```powershell
node scripts/generate-file-ledger.cjs        # = npm run ledger:gen
git add ledger/file-ledger.json
```

生成器**只重算机器可算的部分**（`tracked_total` / `universe_hash`），实测它这次只动了这两处：`accounted` 仍 29 条（**棘轮只减不增**，实测回显 `棘轮基线 = HEAD 版台账（790e626 共 29 条）` / `剔除的**非基线**条目 0 条`），`exempt` 由 1386 变为 1387（**因为本文档命中了已有的 `docs/**` 模式，不是新增了豁免**——生成器绝不自动新增豁免）。

---

## 2. 图的产物与字段契约

**主体文件**：`ledger/references.json`。`generator_version = 1.1.0`（`meta.generator_version`）。

整份大小**刻意不写死**：它随内容变，写进文档就会立刻过期（§7.5 就是手写快照过期的实例）。要现值就现跑：

```powershell
git cat-file -s ":ledger/references.json"
```

### 2.1 顶层结构

顶层键**实测**为 6 个（`node -e "console.log(Object.keys(require('./ledger/references.json')))"`）：

```text
["schema_version", "meta", "files", "edges", "declarations", "symbol_edges"]
```

**关键口径（与常见预期不同，以实测为准）**：

- **节点表叫 `files`，不叫 `nodes`**。不存在 `nodes` 键。
- `schema_version` = `2`。
- `declarations`（声明节点表，402 条）与 `symbol_edges`（符号级边，1,347 条）是 v2 新增的两个顶层数组。

| 数组 | 条数 | 取数命令 |
| --- | --- | --- |
| `files` | 1416 | §0.2 那条 |
| `edges` | 498 | §0.2 那条 |
| `declarations` | 402 | §0.2 那条 |
| `symbol_edges` | 1347 | §0.2 那条 |

### 2.2 `files[]` 字段契约

键名集合实测（`node -e "..."`，1629 行脚本无关，取自产物本身）：

```text
id, lang, state, bytes, lines, edge_out, edge_in
```

样本（实测，`files[]` 中 `id === ".github/workflows/ci.yml"` 那一条）：

```json
{"id":".github/workflows/ci.yml","lang":"yaml","state":"indexed","bytes":31810,"lines":293,"edge_out":17,"edge_in":0}
```

| 字段 | 口径 |
| --- | --- |
| `id` | 仓库相对 posix 路径。**节点身份就是它**，没有单独的 `path` 键 |
| `lang` | `js` / `json` / `md` / `other` / `ts` / `yaml` 六值（实测全集） |
| `state` | 四态 `indexed` / `ignored` / `untracked` / `deleted`。**当前产物里 `{"indexed":1416}`**（`meta.node_states`），另三态只登记**被引用到**的索引外目标，不枚举全部被忽略文件 |
| `bytes` | git 索引 blob 的字节数（`git cat-file --batch-check`）。**非索引节点为 `null`** |
| `lines` | **见下方专条** |
| `edge_out` / `edge_in` | 出边 / 入边条数。与 §1.2 的台账台账口径无关 |

### 2.3 `lines` 的三条口径（**最容易读错的一栏**）

1. **算式**：`lines = text.split('\n').length`，源码位置 `scripts/generate-reference-graph.cjs:613`。⇒ **末尾带换行的文件会比可见行数多 1**。实测：字符串 `"a\nb\n"` 的 `split('\n').length` = 3（可见 2 行）；`"a\nb"` = 2（可见 2 行）。本文档自身也适用：`docs/DESIGN-code-graph.zh-CN.md` 的 `lines` = 1332，而它文件末尾有换行，因此**可见行数 = 1331**（`Get-Content docs/DESIGN-code-graph.zh-CN.md | Measure-Object -Line` 报 1331——注意 `Measure-Object -Line` 与 `lines` 字段相差 1 是**预期**，不是数据错）。

2. **`lines` 只对「扫描面内」的文件有值**。实测：`files[]` 里 `lines !== null` 的只有 **79** 条（= 扫描面 80 个文件 − 自指的 `ledger/references.json`），其余 **1337** 条为 `null`。对比 `bytes`：只有 **1** 条为 `null`（就是自指的 `ledger/references.json`）。
   ⇒ **`lines: null` 的含义是「这个文件没被解析过」，不是「0 行」，也不是「未知内容」。** 想知道扫描面外文件的行数，`git cat-file blob :<path>` 自己数，或把它加进扫描面（§8.2）。

3. **自指例外**：`ledger/references.json` 自己的那一行 `bytes` 与 `lines` **恒为 `null`**（`meta.self_reference` 与 `scripts/generate-reference-graph.cjs:603-607`）。理由是可证的：记了它，产物内容就依赖「上一次写出的自己有多大」，写出后重算必然得到不同的值——那是没有不动点的自指，会当场破坏幂等。**只豁免这两个派生量**；`id` / `lang` / `state` / `edge_*` 一律照记。

### 2.4 降级四态，**以及产物里没有 `degradation` 字段**

降级词汇四态 `complete` / `partial` / `unknown` / `stale`，与设计稿 §5.5 的 `completeness` / §4.6 的 `degradation.status` 同词同义。

**必须写清的一条**：`ledger/references.json` **里不存 `degradation` 字段**。实测：`Object.prototype.hasOwnProperty.call(j,'degradation')` → `false`；`JSON.stringify(j).includes('degradation')` → `false`。

降级状态只活在**生成器的运行期输出**里：
- `node scripts/generate-reference-graph.cjs --check` 的人类可读输出第二行：`降级状态 = complete（基准 = git 索引 blob，且与工作区是同一份事实）`；
- `--check --json` 的 `degradation.status`（生成器自述，`scripts/generate-reference-graph.cjs:1172`）。

**本生成器只用两态**：`complete` 与 `unknown`——图的观测点就是「当前索引」，没有历史维度，所以 `partial` / `stale` 不会出现（`.github/workflows/ci.yml:180-181` 原文照此声明）。`unknown` **不判绿**：`--check` 的通过条件是 `consistent && diagnostics.length === 0 && degradation.status === 'complete'`（`scripts/generate-reference-graph.cjs:991`）。

**四态在别处**：完整四态出现在 `ledger/change-log/*.json` 的 `degradation.status`（§5.4）。跨产物引用降级词时不要张冠李戴。

### 2.5 `edges[]`（文件级，498 条）

键名集合实测：

```text
id, kind, from, to, cross_file, specifier, resolved, fragment, field, status, type_only
```

样本（实测，第一条）：

```json
{"id":".github/workflows/ci.yml:25:9:ci-target:scripts[\"build\"]→build","kind":"ci-target","from":{"file":".github/workflows/ci.yml","line":25,"column":9},"to":{"file":"package.json","line":null,"column":null,"state":"indexed"},"cross_file":true,"specifier":"build","resolved":"package.json","fragment":null,"field":"scripts[\"build\"]","status":"resolved","type_only":false}
```

**8 种边 kind**（实测，`meta.edge_kinds`）：

| kind | 条数 | 从哪来 |
| --- | --- | --- |
| `import` | 320 | 静态 `import … from` |
| `require` | 52 | `require(...)` |
| `package-field` | 51 | `package.json` 的 `main` / `types` / `exports` / `bin` / `files` 等字段 |
| `markdown-link` | 35 | Markdown 相对链接、图片、引用式定义 |
| `export-from` | 19 | `export … from` |
| `ci-target` | 17 | `.github/workflows/*.yml` 的 `run:` 里的 `node <路径>` / `npm run <script>` |
| `anchor` | 3 | 指向仓库内文件某个锚点 |
| `dynamic-import` | 1 | 动态 `import(...)` |

合计 320+52+51+35+19+17+3+1 = **498** ✓（与 `edges` 条数一致）。

**边 id 规则**（`meta.edge_id_rule`）：`<from.file>:<line>:<column>:<kind>`，同一位置多条边时追加 `:<field|specifier>` 消歧，仍冲突即**生成失败**。**id 里不含解析结果**——目标被删 / 改名时 id 不变，这正是 `check-impact` 棘轮能工作的前提（§4.7）。

`status` 实测分布：`{"resolved":311,"external":187}`。**当前产物里没有 `dangling`**（`node scripts/generate-reference-graph.cjs --check` 未报任何悬空；`node scripts/check-impact.cjs` 报「新增悬空 0」）。

**坐标口径**（`meta.positions_basis`）：1 基行列，算在 **git 索引 blob 的 LF 归一化文本**上——**不用字节偏移**，因为 CRLF 检出会让偏移漂移。

### 2.6 `declarations[]`（402 条）

键名集合实测：

```text
id, file, name, decl_kind, exported, scope, line, column, origin
```

样本（实测，第一条）：`{"id":"src/adapters/mcp.ts#NormifyMcpAdapter@6:11","file":"src/adapters/mcp.ts","name":"NormifyMcpAdapter","decl_kind":"interface","exported":false,"scope":null,"line":6,"column":11,"origin":"source"}`

- `id` 形如 `<file>#<name>@<line>:<col>`。
- `decl_kind` 实测分布（`meta.symbol_graph.declaration_kinds`）：`{"class":2,"function":206,"interface":114,"type":18,"variable":62}` = 402 ✓。
- **`scope` 恒为 `null`**：函数内声明（带作用域）属设计稿增量 4，**本产物不产**（`meta.omitted[0]`）。因此 `decl_kind` 里**没有 `parameter`**。
- `origin` 当前恒为 `source`。

### 2.7 `symbol_edges[]`（1347 条）

键名集合实测：

```text
id, kind, from, to, cross_file, specifier, resolved, status, reason, type_only
```

样本（实测，第一条，一条**仓库外**边的完整形状）：

```json
{"id":"src/adapters/mcp.ts:1:10:import","kind":"import","from":{"file":"src/adapters/mcp.ts","line":1,"column":10,"sym":null},"to":{"sym":null,"file":null,"line":null,"column":null,"state":"outside"},"cross_file":false,"specifier":"@modelcontextprotocol/sdk/server/index.js","resolved":null,"status":"external","reason":"bare-module-specifier","type_only":false}
```

**符号层比文件层多一种 kind**：`type-reference`。实测 3 种（`meta.symbol_graph.edge_kinds`）：

| kind | 条数 |
| --- | --- |
| `type-reference` | 805 |
| `import` | 472 |
| `export-from` | 70 |

合计 805+472+70 = **1347** ✓。

`status` 实测：`{"external":134,"resolved":989,"unresolved":224}`。
`reason` 实测（`meta.symbol_graph.unresolved_reasons`）：`{"bare-module-specifier":126,"declaration-out-of-scope":9,"external-module-symbol":8,"symbol-not-found-in-program":215}`。

**抛错级不变量**（违反 ⇒ 生成失败、不写盘，`.github/workflows/ci.yml:192-195`）：
1. 每条 `to.sym` 要么命中 `declarations` 里的真实节点 id、要么带**非空** `reason`——**无静默 null**（实测 `meta.symbol_graph.silent_null_edges` = 0）；
2. `declarations` / `symbol_edges` 按 **UTF-8 字节序**排序，不用 `localeCompare`；
3. Program 里只有扫描面内的 `.ts`（本仓 = `src/**/*.ts`）；`node_modules` / `examples/` / `lib/` 一律不进（实测 `program_source_files` = 28、`program_outside_repo_files` = 0）。

其余实测：`cross_file` = 756 条；Program 刻意 `noLib: true` + `types: []`，编译器选项见 `meta.symbol_graph.compiler_options`。

### 2.8 `type_only` 的判定口径（**两套，别混用**）

仓里有**两套互不相同**的 `type_only`，读产物时务必分清：

| 出现位置 | 判据 | 依据 |
| --- | --- | --- |
| `edges[].type_only` 与 `symbol_edges[].type_only`（**产物字段**） | **语法级**：该边所在语句**是不是纯类型语句**（`import type` / `export type … from`）。`require()` / `import()` 与「拿不到 TypeScript 时的正则回退」一律按运行时 | `scripts/refs-query.cjs:273`（`who-references` 的 `gaps[2]` 原文） |
| `refs-query impact` 的 `buckets[].files[].type_only`（**查询期标注**） | **可达性**：在「目标 ∪ 全量无界反向闭包」内，只沿**运行时边**走，从这个文件**能否到达目标**；到不了 ⇒ 标「仅类型级影响」 | `scripts/refs-query.cjs --help` 的 `impact` 段与 `reasons[]` 第 3 条 |

**可达性口径的精确表述**（`refs-query.cjs --help` 原文照抄）：运行时边 = `import` / `export-from` / `require` / `dynamic-import` / `package-field` / `ci-target`，**以及符号级边**；`type_only=true` 的纯类型语句与 `markdown-link` / `anchor` 这类纯文字引用**不算**。走得到 ⇒ 不标；走不到 ⇒ 标注；**目标不是 `.ts` / `.tsx` ⇒ 「不可判」**——「不标」不等于「没有类型级影响」。

**闭包展开深度**：标注用的闭包**按图产物全深度展开，不受 `--depth` 截断影响**（`scripts/refs-query.cjs:885`）。理由是硬的：展示用的闭包有深度上限，在截断集合里做可达性 BFS，会把「路径长于上限」的文件判成「没有运行时路径」——那是假话。

> **口径的内部张力（诚实记账）**：同一个词 `type_only` 在产物里是「这条边是不是纯类型语句」，在 `impact` 标注里是「这个文件到目标有没有运行时路径」。两者**不是同一个量**，一个文件可以同时在 `edges[]` 里带若干 `type_only=true` 的边、又被标为「非纯类型影响」。`scripts/refs-query.cjs:273` 自己点破了这一点（原文：`impact 的 type_only 档内标注不吃这一套`）。

### 2.9 `meta.omitted`（**活字段，当前有 3 条已过期**）

`meta.omitted` 是 8 条字符串（实测）。它记录的是**写产物那一刻的批次边界**，后续批次落地后**不会自动更新**——这就是「活字段」的性质。

| # | 内容 | 与实测是否相符 |
| --- | --- | --- |
| 1 | 函数内局部变量与参数（设计稿 §10 增量 4） | **相符**：`declarations` 无 `parameter`，`scope` 恒 `null` |
| 2 | 文件内边按需展开（设计稿 §2.5 ④ / 增量 4）：本批的符号级边全部落盘 | **相符**：`symbol_edges` 里 `cross_file=false` 的边存在，按需展开未做 |
| 3 | `import-binding` 节点（把 import 绑定表达成符号级边的源端，不单独节点化） | **相符** |
| 4 | 非 TS 后缀（`.mjs` / `.cjs` / `.js` / `.jsx`）的符号级解析（按设计稿 §3.4 退化为文件级） | **相符**（`meta.symbol_graph.degraded_extensions` 四条自证） |
| 5 | 库类型与 `@types`（Program 刻意 `noLib` + `types: []`） | **相符** |
| 6 | 传递闭包查询（增量 5） | **已过期**：`node scripts/refs-query.cjs impact <路径>` 就是反向传递闭包，已落地 |
| 7 | 查询接口（增量 5） | **已过期**：`scripts/refs-query.cjs` 存在且有 3 条子命令（`--help` 实测） |
| 8 | 变更影响门禁（增量 6） | **已过期**：`scripts/check-impact.cjs` 存在，是 `check` 链第 13 环 |

**第 6/7/8 条为什么还留在产物里**：它们说的是「**产物里没有这些东西**」，而查询接口与门禁**本来就不该进图产物**——所以严格讲这句话永远为真，是**范畴错误**而非单纯的过期。无论按哪种读法，**#6/#7/#8 都不应被读成「本仓没有这些能力」**。修改入口见 §8.1。

---

## 3. 查询接口

**入口**：`scripts/refs-query.cjs`（1,341 行，`git cat-file -s :scripts/refs-query.cjs` 口径见 `files[].bytes`）。**不在门禁链上**——查询结果再可疑也不拦提交（`CONTRIBUTING.md:93`）。

**三条子命令**（以 `node scripts/refs-query.cjs --help` 实测为准）：`who-references` / `impact` / `locals`。

**共同选项**：`--json`（机器可读）、`--root <目录>`（仓库根，默认当前目录；不是 git 仓库根则非零退出）、`--limit <n>`（人类可读输出里最多显示多少条**符号级**边，默认 40，0 = 全部）、`--depth <n>`（仅 `impact`：反向闭包深度上限，默认 8）、`--help`。

**退出码**（实测逐条）：`0` 成功 / `2` 参数或根不合法 / `3` 读不到图（`locals` 另含：读不到目标文件 / 拿不到 typescript）/ `4` 输入不受支持 / `5` 目标不在图里。

### 3.1 `who-references` —— 谁**直接**引用这个文件

```powershell
node scripts/refs-query.cjs who-references src/engine/types.ts
```

**实际输出摘要**（人类可读，实测）：

```text
谁直接引用 src/engine/types.ts（文件级边 edges[]）
basis=index  completeness=partial  unsupported=false
直接引用方：25 条边，来自 18 个文件
符号级边 symbol_edges[]（to.sym 指向本文件）：431 条
  运行时引用数 runtime_refs=41
  类型引用数 type_refs=390
  …（人类可读输出只显示前 40 条；--json 或 --limit 0 可看全部 431 条）
```

**元字段**（`--json`，实测）：

```json
{"query":"who-references","kind":"file","target":"src/engine/types.ts","unsupported":false,"basis":"index","completeness":"partial",
 "counts":{"file_edges":25,"referrer_files":18,"symbol_edges":431,"runtime_refs":41,"type_refs":390}}
```

`--json` 顶层键实测 13 个：`query, kind, target, unsupported, basis, completeness, reasons, gaps, empty_referrers_reading, counts, direct_referrers, symbol_referrers`。

**读法**：`direct_referrers` 只数**文件级**边；`symbol_referrers`（431 条）含 `cross_file=false` 的**文件内边**，所以它比 `direct_referrers` 大得多，**两者不可相加**。

### 3.2 `impact` —— 谁**间接**引用这个文件（反向闭包）

```powershell
node scripts/refs-query.cjs impact src/engine/types.ts
```

**实际输出摘要**（人类可读，实测）：

```text
basis=index  completeness=partial  unsupported=false  depth<=8（实际 3 层）
闭包合计：24 个文件，502 条边（文件级 43 / 符号级 459）
深度 1：18 个文件
深度 2：5 个文件
深度 3：1 个文件
三档分类：必须改 24 条 / 需复核 0 条 / 记录 0 条
环（闭包子图内 size>1 的强连通分量）：1 个 —— src/adapters/promptmanager.ts | src/planning.ts | src/service.ts
自环：0 个
派生产物：3 个（lib/engine/types.js、lib/engine/types.js.map、lib/types/engine/types.d.ts）
门禁义务项：1 条 —— 执行 npm run check:libsync
```

**元字段**（`--json`，实测）：

```json
{"query":"impact","kind":"file","target":"src/engine/types.ts","unsupported":false,"basis":"index","completeness":"partial",
 "max_depth":8,"actual_depth":3,
 "counts":{"affected_files":24,"affected_edges":502,"file_layer_edges":43,"symbol_layer_edges":459,
           "derived_artifacts":3,"gate_obligations":1,"cycles":1,"cycle_files":3,"self_loops":0,
           "must_change_files":24,"needs_review_files":0,"record_files":0}}
```

`--json` 顶层键实测 19 个：`query, kind, target, unsupported, basis, completeness, reasons, gaps, empty_referrers_reading, max_depth, actual_depth, counts, by_depth, buckets, closure, paths, derived_artifacts, gate_obligations, cycles, self_loops`。

**三档 `buckets[]`**（恒存在三档，空档照列 0 条，「没有」与「没做」不混）：

| 档 | 归入条件 |
| --- | --- |
| `必须改 must_change` | 边悬空（`status=dangling`），或 `kind ∈ import / export-from / require / dynamic-import / type-reference`——代码级引用，对方编译或运行会坏 |
| `需复核 needs_review` | `kind ∈ ci-target / package-field / anchor / markdown-link`——要人看一眼 |
| `记录 record` | 其余边，只登记 |

**分档是「先按边、再按文件」**：文件取它 `via` 中那些边的**最高档**，因此**一个文件只进一个档**（优先级 `必须改` > `需复核` > `记录`）。

**`--depth` 的影响**（实测对照）：

| 命令 | `depth<=N（实际 M 层）` | `counts.affected_files` |
| --- | --- | --- |
| `impact src/engine/types.ts --depth 1` | `depth<=1（实际 1 层）` | 18 |
| `impact src/engine/types.ts --depth 3` | `depth<=3（实际 3 层）` | 24 |
| `impact src/engine/types.ts`（默认） | `depth<=8（实际 3 层）` | 24 |

### 3.3 `locals` —— 这个文件里声明了什么

```powershell
node scripts/refs-query.cjs locals src/engine/types.ts
```

**实际输出摘要**（人类可读，实测）：

```text
locals：src/engine/types.ts（只读该文件本身：ts.createSourceFile 语法树；不建 Program、不做类型检查、不读图产物）
形参（parameter）：0 条
箭头形参（arrow_parameter）：0 条
局部变量（local）：0 条
三条局限（连结果一起读）：
  · 不做作用域分析：同名遮蔽无法判定
  · 只覆盖该文件内部
  · 语法级不支持 eval / 动态属性
```

**`locals` 是三条子命令里唯一的例外**：它**只解析目标文件自身的语法树**，**不读图产物、不进图产物**，因此 **`--json` 里没有 `basis`，也没有 `completeness`**（实测：`--json` 顶层键为 `query, target, unsupported, error, message, limitations` 一类，不含 `basis` / `completeness`）。**不要拿它和另外两条查子命令的元字段对齐**。

坐标口径：行、列都是 1-based，取标识符起点，与 `params[]` 同一套坐标（例：`leadRef = 7:75`）。**不按名字合并去重**——同名不同位置各出一条；解构写法按其中的标识符逐个出。

**只认源码扩展名**：`.ts` / `.tsx` / `.mts` / `.cts` / `.js` / `.jsx` / `.mjs` / `.cjs`，其它扩展名以 `unsupported` 拒绝（退出码 4，实测 `node scripts/refs-query.cjs locals README.md` → exit 4）。

### 3.4 `completeness` 恒为 `partial`（**实测结论，不是异常**）

`who-references` 与 `impact` 的 `completeness` **实测恒为 `partial`**（`--json` 的 `completeness` 字段；`diverged` 时为 `stale`；错误路径为 `unknown`）。

源码依据：`scripts/refs-query.cjs:277` 与 `:893` 两处都是 `const completeness = diverged ? 'stale' : 'partial';`——**没有第三条分支**。⇒
- `'complete'` 这两个查询**取不到**；`emptyReading('complete')`（`scripts/refs-query.cjs:199-200`）是**死分支**；
- 「`completeness === 'complete'` 与 `gaps.length > 0` 不得同时成立」这条抛错级不变量（`:206-214`）对这两条查询**永不触发**；
- 因此 `empty_referrers_reading` 恒为「空引用方列表 ≠ 没人引用它：…」。**空结果永远不能读成「没人引用」**，这不是措辞保守，是当前实现的确定行为。

**另一处口径瑕疵（实测）**：`who-references` 的 `gaps[]` 是**照抄 `impact` 的缺口清单**——实测其 `gaps[3]` 里含有 `impact 尚未做 informational 与截断标注` 这类**只属于 `impact` 的描述**。读 `who-references` 的 `gaps` 时不要把整段都当成它自己的缺口。

### 3.5 错误路径（实测退出码）

| 命令 | 退出码 | stderr 原文 |
| --- | --- | --- |
| `node scripts/refs-query.cjs who-references docs/NOPE.md` | `5` | `目标不在图里：docs/NOPE.md（不在 files[] 的 1415 个节点中）` |
| `node scripts/refs-query.cjs who-references "src/engine/types.ts#Module@140:18"` | `4` | `本版未实现符号 id 输入：…（只支持文件路径；符号级信息只在输出里的 symbol_edges[] 出现）` |
| `node scripts/refs-query.cjs locals README.md` | `4` | `locals 只支持源码扩展名（.ts .tsx .mts .cts .js .jsx .mjs .cjs）：README.md` |
| `node scripts/refs-query.cjs bogus x` | `2` | `未实现的查询：bogus（本版只有 who-references、impact、locals）` |

**注意第一行的 `1415`**：那是**加入本文档之前**的节点数。本文档加入后节点数是 1416。这类「嵌在人类可读消息里的活数字」随仓库增长自动更新（它不是写死的常量），但你**在旧输出里看到的数字未必是现值**——报错消息里的数字要按当下重测。

---

## 4. 门禁链

**怎么跑全链**：

```powershell
npm run check
```

**我没有跑过 `npm run check` 全链**（`package.json` 的 `check` 脚本）。**也没有跑过 `npm test`**。原因是代价：`npm test` 串行跑 14 个 e2e 脚本，而 `check-examples` 的纳入清单自报单条示例耗时在 5–17 秒量级（`node scripts/check-examples.cjs --help` 原文 `[实测 5439ms]` / `[实测 10212ms]` / `[实测 16214ms]`——**这三个耗时是脚本注释里的自报值，本次未复测**（**转述，未复核**））。**我跑的是链上我关心的那几环，逐环退出码见 §4.5。**

### 4.1 13 环实际顺序（**取自 `package.json` 的 `check` 脚本，逐字**）

```text
npm run typecheck && npm run build && npm test && node ci-contract-check.cjs && npm run check:refs && npm run check:docs && npm run check:libsync && npm run check:examples && npm run check:ledger:gen && npm run check:ledger && npm run check:graph && npm run check:changes && npm run check:impact
```

用 `&&` 串联 ⇒ **任一环非 0，其后所有环都不执行**。这个顺序与 `CONTRIBUTING.md:75` 的记录**逐字一致**（实测核对通过）。

| # | 环 | 实际命令 | 职责 | 失败意味着什么 |
| --- | --- | --- | --- | --- |
| 1 | `typecheck` | `tsc -p tsconfig.json --noEmit` | 类型检查 | `src/**/*.ts` 有类型错误 |
| 2 | `build` | `tsc -p tsconfig.json` | 产出 `lib/` | 编译失败；**这一步会改工作区 `lib/`** |
| 3 | `test` | 14 个 e2e 脚本串联 | 端到端回归 | 有行为回归（含本套东西的 4 个 e2e：`reference-graph` / `impact-gate` / `change-log` / `file-ledger-ratchet`） |
| 4 | `ci-contract-check.cjs` | `node ci-contract-check.cjs` | 工具目录契约：名字 provider-safe、无重名、`parameters.type === 'object'`、有 `execute`、必填工具齐全 | 工具表结构或必填工具缺了 |
| 5 | `check:refs` | `node scripts/check-references.cjs` | 引用完整性（4 类检查，§4.3） | 悬空路径 / import 指向不存在的文件 / 引用了未纳入索引的路径（或读不到索引内文件 ⇒ 直接红） |
| 6 | `check:docs` | `node scripts/check-doc-snippets.cjs` | 文档用法示例编译 + 数字/签名一致性（§4.4） | 文档里的 `ts` 示例编不过，或工具数量/`execute` 签名断言与运行时不符 |
| 7 | `check:libsync` | `node scripts/check-lib-sync.cjs` | **索引里的 `lib/`** 与「全新编译产物」逐字节一致 | 改了 `src/` 没重建 `lib/`——**恰好是它唯一要抓的那种提交** |
| 8 | `check:examples` | `node scripts/check-examples.cjs` | 纳入清单里的示例可执行 + **跑完仓库零变化** | 示例挂了 / 超时 / 改了仓库 |
| 9 | `check:ledger:gen` | `node scripts/generate-file-ledger.cjs --check` | 台账可否由生成器重算得出 | 手改了机器可算字段（`tracked_total` / `universe_hash` / `accounted` 集合） |
| 10 | `check:ledger` | `node scripts/check-file-ledger.cjs` | 台账四态归属 + 豁免 + 棘轮 | 有 `unowned` 文件 / 豁免写法非法或过宽 / `accounted` 增长 / 索引-工作区漂移 |
| 11 | `check:graph` | `node scripts/generate-reference-graph.cjs --check` | **图产物新鲜度**：索引 blob 与重算结果一致 | 索引清单变了（新增/删除/改名）而图没重跑；或索引-工作区漂移；或降级状态 `unknown` |
| 12 | `check:changes` | `node scripts/generate-change-log.cjs --check` | 改动记录 schema 校验 + **重算逐字段复核** | 记录不符合 `schema.json`，或与用同一对基准重算的结果不一致（点名到字段） |
| 13 | `check:impact` | `node scripts/check-impact.cjs` | **变更影响门禁**（棘轮，§4.7） | 本次改动**新引入**了悬空 / 未解析 |

### 4.2 哪几环 fail-closed

「fail-closed」= **拿不到判据就不判绿**（而不是「读不到就放过」）。逐环实测口径：

| 环 | fail-closed 行为 | 证据 |
| --- | --- | --- |
| 5 `check:refs` | **第一优先级不变量**：凡「在 git 索引里」的文本文件读失败一律 error（`guard-unavailable`，退出码 1）——`EISDIR` / `EPERM` / `EACCES` / `ENOENT` / UTF-16 BOM 或高比例 NUL。只有「本来就不在索引里」的路径才允许静默跳过 | `node scripts/check-references.cjs --help` |
| 7 `check:libsync` | 工具链不可用（git / typescript / 临时工程失败）⇒ 退出码 1 | `node scripts/check-lib-sync.cjs --help` |
| 8 `check:examples` | 无 git 快照能力 ⇒ 退出码 1；且断言「跑完仓库零变化」 | `node scripts/check-examples.cjs --help` |
| 11 `check:graph` | 降级状态 `unknown`（基准不可用）**不判绿**；`graph-index-drift`（索引里的图与工作区里的图不是同一份事实）直接红；写盘前另有一道：工作区那份图若是未知 / 更高版本，**拒绝覆盖**（旧生成器不得静默降级新结构） | `scripts/generate-reference-graph.cjs:991`、`:992`、`:1172` |
| 12 `check:changes` | `unknown`（基准不可用 / 结构不合规 / 重算不一致）**不判绿**，直接红 | `node scripts/generate-change-log.cjs --help` |
| 13 `check:impact` | 两个诊断码一律红线：`impact-baseline-unavailable`（基线不可得）、`impact-current-graph-unavailable`（当前图不可得）；另有 `impact-schema-version-mismatch`、`impact-graph-malformed`。**拿不到基线 / 图就不判绿** | `node scripts/check-impact.cjs --help` |
| 6 `check:docs` | 「挑到了要编译的块却跑不了 tsc」⇒ 退出码 1（宁可红也不要假绿）；取不到运行时工具数量 ⇒ **error**（原为 warning；已升级） | `node scripts/check-doc-snippets.cjs --help` |

**注意第 2 环 `build` 是链条上唯一的写操作**：它改工作区 `lib/`。因此「本地 `npm run check` 全绿」与「工作区干净」是两件事。

### 4.3 `check:refs` 的 4 类检查

1. **悬空路径引用**——Markdown 链接/图片/引用式定义、`package.json` 的 `main`/`types`/`exports`/`bin`/`files`、`package.json` 各 script 里的 `node <路径>`、CI `run:` 里的 `node <路径>` 与 `npm run <script>`；**大小写不一致的路径按 error**（Windows 能过、Linux CI 会挂）。
2. **相对 import/export 说明符指向根本不存在的文件**——优先用仓库自带 typescript 的编译器 API 解析；拿不到 typescript 时降级为正则**并在报告里标注**。
3. **引用了未纳入 git 索引的路径**（磁盘上有、索引里没有）——以 `git ls-files` 为权威，**不是磁盘存在性**。被 `.gitignore` 覆盖的目标跳过不报，但**逐条列出**（文件:行 → 目标 → 命中的忽略规则）。
4. **指向 git 历史中已删除的文件**——用 `git log --diff-filter=D --name-only` 取清单（图的 `meta.history_basis` 实测 = 37 条历史删除路径），在工作区文本里搜完整路径。

**现值**：`✔ 0 error / 700 warning —— 门禁通过`（`node scripts/check-references.cjs`，退出码 0）。**这 700 条 warning 是存量 + 本文档新增，门禁只拦 error。**

**全部 700 条 warning 是同一个 type**（`--json` 的 `violations[]` 实测：`{"deleted-file-basename-mention": 700}`）。其中 **51 条由本文档贡献**——原因见 §7.9，不是本文档写错了路径。

### 4.4 `check:docs` 的扫描面与两条「新增文档会被拦」的规则

**扫描面**（`node scripts/check-doc-snippets.cjs` 实测回显）：`README.md` · `README_EN.md` · `docs/**` 下**所有 `.md`** · `skills/**` · `docs/RELEASE-*.md`。

⇒ **本文件 `docs/HANDOFF-code-graph.zh-CN.md` 自动进入这道门禁的扫描面**（它是 `docs/` 下的 `.md`）。现值：`围栏代码块: 46 · 参与编译: 2 … ✔ 0 error / 0 warning`。

两条会拦住新文档的规则（源码依据 `scripts/check-doc-snippets.cjs:78-88`）：
- `CODE_LANGS = {js, javascript, mjs, cjs, ts, typescript, tsx, jsx}`——**这类语言标记的块里出现包 `import`/`require` 却没被编译 ⇒ error**。因此新文档里的示例**不要**用 `ts` / `js` 标记去写包导入（用 `powershell` / `text` / `json` 之类标记即可，它们不是 code lang，直接跳过）。
- 工具数量断言：`(\d+)\s*个工具` / `(\d+)\s*tools` 之类必须等于运行时数量。`docs/RELEASE-*.md` 是**历史文体**，豁免数字断言（`HISTORICAL_DOC` 正则）——**本文件不匹配该正则**，因此本文档里**没有**写任何「N 个工具」形式的断言。

### 4.5 我这次逐环跑到的退出码（**实测**）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `node scripts/generate-reference-graph.cjs --check` | `0` | `与重新生成的结果一致（比较基准 = git 索引 blob）` / `降级状态 = complete` / `节点 1416 · 边 498 · 扫描面 80 个文件 · universe 1416 条` / `符号级 = 声明 402 · 符号边 1347（schema_version 2）` |
| `node scripts/check-file-ledger.cjs` | `0` | `✔ 0 error / 0 warning —— 门禁通过`；`台账宇宙: git ls-files 1416 条`；`四态归属: owned 0 · exempt 1387 · accounted 29 · unowned 0`；`accounted 棘轮: 基线 = HEAD 版台账（790e626 共 29 条）· 相对基线新增 0 条` |
| `node scripts/generate-file-ledger.cjs --check` | `1` → 修后 `0` | 修前：`台账 tracked_total=1415 · 重算 tracked_total=1416`（见 §1.2）；跑 `node scripts/generate-file-ledger.cjs` + `git add` 后转绿 |
| `node scripts/check-impact.cjs` | `0` | `basis: "HEAD^..HEAD"`；`结论：通过（新增悬空 0，新增未解析 0）` |
| `node scripts/check-references.cjs` | `0` | `✔ 0 error / 700 warning —— 门禁通过`（其中 51 条由本文档贡献，见 §7.9） |
| `node scripts/check-doc-snippets.cjs` | `0` | `✔ 0 error / 0 warning —— 门禁通过` |
| `node scripts/generate-change-log.cjs --check` | `0` | `2 条记录全部通过（Schema 校验 + 重算逐字段复核）`；`降级状态分布 = {"complete":2}` |

### 4.6 没跑的三条（写清跑法与预期代价）

| 没跑的 | 怎么跑 | 为什么这次没跑 |
| --- | --- | --- |
| `npm run check` | 见 §4.1 那行 | 全链含 `npm test` 与 `check:examples`，后者单条示例实测 5–17 秒，整链是分钟量级 |
| `npm test` | `node tests/engine-e2e.mjs && … && node tests/change-log-e2e.mjs`（14 个，逐字见 `package.json`） | 同上 |
| `tests/impact-gate-e2e.mjs` | `node tests/impact-gate-e2e.mjs` 或 `npm run test:impact` | 同上。它是 `check:impact` 的回归用例（609 行，`files[].lines` 口径） |

**结论**：本文档对链上第 5 / 6 / 10 / 11 / 12 / 13 环的结论是**实测**；对第 1 / 2 / 3 / 4 / 7 / 8 / 9 环的结论是**从其 `--help` 与 `package.json` 读来的口径**，**未在本次运行中执行过** ⇒ 冒烟状态**未验证**。

### 4.7 棘轮语义（存量容忍、新增报红）

**`check:impact` 是纯棘轮**：只拦本次改动**新引入**的破坏，历史存量一律不追溯。

```text
新增悬空   = { 当前 status === 'dangling' 的边 } − { 基线中同为 dangling 的边 }      ← 文件被删 / 改名
新增未解析 = { 当前 to.sym === null 的符号级边 } − { 基线中同样未解析的符号级边 }   ← 符号被删（文件还在）
```

**边的身份用 `id`，按集合差比较，不是比条数。** id **不含解析结果**，因此基线取的是「基线中**同样命中**」的边（同为 `dangling` / 同为未解析），不是基线全量边——否则 `resolved → dangling` 的同 id 边会被误判成「基线里已存在」而**漏报**。

**「未解析」的精确口径**（用图自己的词表，不另造）：`to.sym === null` 的符号级边，**但排除** `status === 'external'` 与 `to.state === 'outside'`——仓库外的裸模块说明符（`node:fs`、`ajv`…）与库类型（Program 刻意 `noLib` + `types: []`）本来就「仓库外、无仓库内符号」，属**已按设计处置**；算进来会让门禁在健康仓库上**恒红**。**保留** `status === 'unresolved'`（`symbol-not-found-in-program` / `declaration-out-of-scope`）——那才是该报的。

**两种基准**（`--json` 的 `basis` 字段自证）：

| 模式 | `basis` | 基线 | 当前 |
| --- | --- | --- | --- |
| 默认（无开关） | `HEAD^..HEAD` | `git show HEAD^:ledger/references.json` | `git show HEAD:ledger/references.json` |
| `--staged` | `HEAD..index` | `git show HEAD:ledger/references.json` | `git show :ledger/references.json`（索引 blob） |

**刻意不比 HEAD vs 索引**：新克隆或 CI 检出后索引 == HEAD，那样比会**恒绿**，恰好放过它唯一要抓的那种提交。

**不提供豁免（v1 有意）**：没有 `--allow-*` / 基线冻结 / 注释抑制。本仓「残留零容忍」——正确做法永远是改掉引用（删掉引用、或补回目标），不是给门禁开白名单。

**同一条棘轮也在台账侧**：`check:ledger` 的 `accounted` 清单**只减不增**（实测输出：`accounted 棘轮: 基线 = HEAD 版台账（790e626 共 29 条）· 相对基线新增 0 条 · 已减 0 条——只允许集合缩小`）。

---

## 5. 改动记录（`ledger/change-log/*.json`）

**一条记录 = 引用图两份快照之差**（文件/边的新增与消失 + 受影响的引用方 + 处理状态）。**观测点 = 每次提交，不是每次保存**——「每次保存」需要常驻文件监听，明确不在范围内（用户拍板，`ledger/change-log/README.md:11-17`）。

### 5.1 怎么生成

```powershell
node scripts/generate-change-log.cjs --commit HEAD   # 为 HEAD 写记录（= npm run changelog:gen）
node scripts/generate-change-log.cjs --commit 10766d1
node scripts/generate-change-log.cjs --index         # 暂存态记录（未落定，会 stale）
npm run check:changes                                # = 生成器 --check：结构校验 + 重算逐字段复核
```

- `--commit <rev>`：`from` = `<rev>` 的**父提交**（根提交 = 空树），`to` = `<rev>`；默认 `HEAD`。
- `--from <rev>` / `--to <rev|INDEX>`：显式指定（必须成对）；`INDEX` = 当前 git 索引，`kind = "index"`。
- **幂等**：同一基准已有记录就不再写第二条（记录**只增不改**），重复执行 exit 0 并说明原因。
- **写入者只有生成器**；CI 只读校验，绝不自动改记录。
- 命名：`<utc-iso8601 紧凑式>-<短哈希>.json`（**去掉冒号**，Windows 文件名不允许 `:`），例如 `20261005T183940Z-ed404e5.json`。

**现值**：已落盘 **2 条**记录（`node scripts/generate-change-log.cjs --check` → `2 条记录全部通过`）。

### 5.2 `from_snapshot.tree` / `to_snapshot.tree` 是**冻结树值**

快照身份记录 `basis` / `rev` / `tree` / `universe_hash` / `tracked_total` / 节点边条数 / 解析模式。**`tree` 是 git 提交树的 SHA**——提交树是**内容寻址、不可变**的，因此记录**可逐字节复核**。

### 5.3 怎么验证（`git rev-parse <rev>^{tree}` 对比）

```powershell
git rev-parse "ed404e5^{tree}"      # 对比 to_snapshot.tree
git rev-parse "ed404e5^^{tree}"     # 对比 from_snapshot.tree（^ 是父提交）
git rev-parse "10766d1^{tree}"
git rev-parse "10766d1^^{tree}"
```

**实测核对结果（两条记录全部对上）**：

| 记录 | 字段 | 记录里的值 | `git rev-parse` 实测 | 一致 |
| --- | --- | --- | --- | --- |
| `20261005T183940Z-ed404e5.json` | `from_snapshot.tree` | `654de1f59adf235c9bf40fe08e634d40e7a32988` | `ed404e5^^{tree}` = `654de1f59adf235c9bf40fe08e634d40e7a32988` | ✓ |
| 同上 | `to_snapshot.tree` | `f0d743504d6b812326f5c22f85eebc763b39335a` | `ed404e5^{tree}` = `f0d743504d6b812326f5c22f85eebc763b39335a` | ✓ |
| `20261005T183954Z-10766d1.json` | `from_snapshot.tree` | `62833c76bc45f249b004755b35599dc25e0e121c` | `10766d1^^{tree}` = `62833c76bc45f249b004755b35599dc25e0e121c` | ✓ |
| 同上 | `to_snapshot.tree` | `7d2ea8b3ad15b3d3af49555befeaecef979bb09e` | `10766d1^{tree}` = `7d2ea8b3ad15b3d3af49555befeaecef979bb09e` | ✓ |

**但 `tree` 相等只是必要条件，不是充分条件**——真正判绿的是 `--check` 的**重算逐字段复核**：用同一对基准重建两份图快照、重算差，与落盘记录逐字段比对，不一致就 exit 1 并点名到字段（`edges.status_changed[0].to_status` 这种粒度）。`created_at`（记录写入时刻）与 `handling`（人工/追加式处理状态）是**人类字段，不参与复核**——所以「改处理状态」不会被判红，而「改差去迎合自己」一定会。

**复核用的物化方式**（保证不碰工作区）：提交侧快照用「临时索引（`GIT_INDEX_FILE` + `git read-tree`）+ **空工作树**（`GIT_WORK_TREE`）」物化，历史删除清单钉到该提交。运行期不碰工作区、不向对象库写东西。

### 5.4 记录里有什么

| 栏 | 内容 |
| --- | --- |
| `from_snapshot` / `to_snapshot` | 快照身份（见上） |
| `files` | `added` / `removed` / **`state_changed`**（`indexed` → `deleted` 等） |
| `edges` | `added` / `removed` / **`status_changed`**（`resolved` → `dangling` 等） |
| `affected_referrers` | 受影响的引用方：`dangling-target`（目标在本次改动里变得不可用 → `needs_change: true`）/ `edge-removed` / `edge-added` |
| `counts` | 真实计数（**截断前**）。**判据是 `counts`，不是数组长度**——数组短了不等于差小了 |
| `handling` | 处理状态，**粒度 = 整条记录**（`pending` / `handled` / `waived`；`waived` 必须写理由）。逐条引用方勾选需要第二份可写源，本批不做。**两条现存记录实测均为 `{"status":"pending","by":null,"at":null,"note":null}`** |
| `change_id` | **可选外键**，指向**目标工程**的 `changes/<id>.json`。本仓库**没有** `changes/` 目录 ⇒ 恒为 `null`；生成器的 `--change-id` 只在文件真的存在时才写（fail-closed） |
| `omitted` | 本批明示不做的东西 |

**为什么必须有 `state_changed` / `status_changed` 两栏**（不是装饰）：一个被删除、但**仍被人引用**的文件，在 `to` 快照里**仍然是一个节点**（`state: "deleted"`），它的边 id 也**不变**（id 里不含状态）——只比 id 的话，「删了某个东西之后谁还在引用它」会得到一张**空表**。

### 5.5 降级契约四态（**这里的四态是活的**，与 §2.4 的图产物不同）

`degradation.status` ∈ `complete` / `partial` / `unknown` / `stale`。**`files` / `edges` 的数组为空只在 `complete` 时才等于「没有差异」。**

| status | 含义 | 机器判据 | **不得读成** |
| --- | --- | --- | --- |
| `complete` | 两侧快照完整重建，差在文件层完整 | 默认 | ——（数组为空 = 真的没有差异） |
| `partial` | 差已算出，但有**已知缺口** | `reasons`：`specifier-analysis-regex-fallback`（拿不到 typescript）/ `history-unavailable`（浅克隆） | 「没有引用」或「完整清单」 |
| `unknown` | 差额**不可判定**（基准不可用 / 结构不合规 / 重算不一致） | `--check` 在提交缺失、浅克隆、结构不合规、重算不一致时给出 | 「没有引用」——判据**只能是本字段**，不是数组长度 |
| `stale` | 记录描述的**那个状态已不存在**（HEAD 移动 / 索引变化 / 提交被重写） | `--check` 对 `kind: "index"` 的记录比对当前索引的 `universe_hash` 与 HEAD | 「记录有错」——**`stale ≠ 记录有错`**，它只是描述不了今天 |

> `kind: "commit"` 的记录**结构上永远不会 `stale`**：提交是内容寻址的不可变基准。`stale` 属于 `kind: "index"` 以及将来的 `cas-write`。
> **`unknown` 与 `stale` 都不判绿**，`--check` 直接红。

### 5.6 已落盘的两条记录（实测内容）

| 记录 | 描述的一次提交 | 实测 `counts` |
| --- | --- | --- |
| `20261005T183940Z-ed404e5.json` | 一次**真实的删除提交**（删掉一个仍被 README 链接的文件） | `{"files_added":0,"files_removed":0,"files_state_changed":1,"edges_added":0,"edges_removed":0,"edges_status_changed":1,"affected_referrers":1,"needs_change":1}` |
| `20261005T183954Z-10766d1.json` | 台账语义校准 v1→v2 | `{"files_added":2,"files_removed":0,"files_state_changed":0,"edges_added":24,"edges_removed":20,"edges_status_changed":0,"affected_referrers":44,"needs_change":0}`；`files.added` 实测 = `["ledger/exempt.gitignore","scripts/file-ledger-core.cjs"]` |

两条记录的 `degradation` 实测均为 `{"status":"complete","reasons":[]}`（`--check` 回显 `降级状态分布 = {"complete":2}`）。两条是**真实历史**的记录（`--commit <rev>` 现算），不是手写的示例。

**关于这两条记录的三个时点事实**（均实测）：
1. 它们描述的提交（`ed404e5`、`10766d1`）**不在当前 `HEAD` 的 4 条最近提交里**（`git log --oneline -4` 实测为 `790e626` / `8c30684` / `d32f5fc` / `f31b1a9`）。这是正常的：记录**只增不改**，历史记录留在目录里。
2. 两条记录的**规模各不相同，且都远小于今天**：`ed404e5` 的 `from_snapshot` = `{files:127, edges:227}` / `to_snapshot` = `{files:127, edges:227}`；`10766d1` 的 `from_snapshot` = `{files:1400, edges:440, tracked_total:1400}` / `to_snapshot` = `{files:1402, edges:444, tracked_total:1402}`（`node -e` 读两条记录实测）。今天图的值是 **1416 / 498**（§0.2）。**不要拿记录里的规模当现值**。
3. `ed404e5` 的 `files` / `edges` 两侧相同而只有 `state_changed` / `status_changed` 非空——这正是 §5.4 那条「为什么必须有两栏」的活样本：删除一个**仍被引用**的文件，节点数与边数都不变，变的只是状态。

---

## 6. 纪律（踩过的坑）

这一节每一条都对应一次**真实踩坑**或一次**结构性的坑**，不是泛泛的规范。

### 6.1 判定基准是 **git 索引**，不是工作区

**整套东西的读取基准**：文件内容一律取自**索引 blob**（`git cat-file --batch`），位置算在索引 blob 的 **LF 归一化文本**上。生成器 `meta.read_basis` 原文：`文件内容一律取自索引 blob（git cat-file --batch），不读工作区`。

**为什么**：CI 里「先 `npm run build` 再检查工作区」会让 `check:libsync` **永远绿**，恰好放过它唯一要抓的那种提交（改了 `src/`、没重建 `lib/` 就提交）。同一条理由适用于图与台账：**工作区里改了不 `git add`，等于没改**——`git commit`、CI 与新克隆看到的都是**索引里的那一份**。

**这次实测到的一个旁证**：`git add docs/HANDOFF-code-graph.zh-CN.md` 时 git 提示 `warning: in the working copy of 'docs/HANDOFF-code-graph.zh-CN.md', LF will be replaced by CRLF the next time Git touches it`。**这条 warning 不影响图**——图读的是索引 blob（LF 归一化），工作区的 CRLF 与它无关。**这正是「基准取索引」的价值**：换行风格在 Windows 上不稳定，判定不能挂在它上面。

### 6.2 `git write-tree` 比的是**索引**，相等 ≠ 工作区干净

`git write-tree` 从**索引**生成树对象。因此：

- `git write-tree` 的输出 == `git rev-parse "HEAD^{tree}"`，**只说明索引与 HEAD 的树一致**；
- **不说明工作区干净**——工作区里未 `git add` 的改动、未跟踪文件、被改坏的文件，`write-tree` 一个都看不见。

⇒ **要证明工作区干净，必须另跑 `git status --porcelain` 并确认输出为空。** 两个命令回答的是**两个不同问题**，缺一不可。

### 6.3 只提交索引（**禁 `-a` / `-A` / `--amend`**）

- **禁 `git commit -a` / `-A`**：会把工作区里**你没打算提交**的改动一起带上（本仓常有「另一批已暂存的引擎改造」，见设计稿 §10 增量 1 偏差记录第 2 条）。
- **禁 `--amend`**：本套东西的**记录由提交树的内容寻址**（§5.2 / §5.3）——改写历史会让 `ledger/change-log/*.json` 里钉住的 `to_snapshot.rev` / `tree` 指向一个**不再被任何分支引用的对象**，记录当场失去可复核性。同理禁 `push` / `reset` / `checkout` / `restore` / `stash`。
- **正确做法**：`git add <明确的路径>`，逐个列出。

### 6.4 改动落在扫描面内 ⇒ **顺序不可反**

只要你的改动**新增 / 删除 / 改名了任何被扫到的文件**（或改了图会产边的文件），必须按这个顺序：

```powershell
git add <你改的文件>                              # ① 先进索引（图读索引，不读工作区）
node scripts/generate-reference-graph.cjs        # ② 重算图
git add ledger/references.json                   # ③ 图进索引
node scripts/generate-reference-graph.cjs --check  # ④ 必须 exit 0
```

**每一步为什么不能省 / 不能换序**：

| 步 | 不这么做的后果 |
| --- | --- |
| ① | 图读**索引**。文件只在工作区 ⇒ 图**看不见你的改动**，重算得到的是旧结果，「图是新鲜的」是假绿 |
| ② | 索引变了而图没重跑 ⇒ 第 ④ 步必红（`节点/边` 对不上）；这正是 `check:graph` 存在的理由 |
| ③ | 图写在工作区、没进索引 ⇒ 第 ④ 步报 `graph-index-drift`（索引里的图与工作区里的图不是同一份事实），**不判绿** |
| ④ | 没有这一步，你只是在**假设**它一致。实测过：加入本文档后第 ④ 步先报 `重算：节点 1416 · 边 498…`，**exit 1**，直到重算 + `git add` 后才 exit 0 |

**顺序反了的典型症状**：先 `graph:gen` 再 `git add <你的文件>` ⇒ 图是按**旧索引**算的，`--check` 会报节点/边不符。这时**不要**去手工改图里的数字——重跑 §6.4 的 ①→④ 即可。

### 6.5 其它两条

- **`--check` 只比较、不写盘；`graph:gen` 只写盘、不比较。** 别指望 `--check` 帮你修好图。
- **改了门禁脚本 / 生成器 / 共享内核 / `package.json` / CI 配置，同样要 `git add`**——否则 CI 与新克隆用的是**旧版门禁**，该红的照样报绿。`package.json` 里新加的 script 没 `add`，CI 跑到那一步会以 `npm error Missing script` 直接失败。

---

## 7. 已知局限与灰区

**本节是全文最该细读的一节。** 以下每一条都在本次核对中**实测过**，不是从注释里抄的。

### 7.1 `path_hops` 的口径：它是「BFS 首达那条最短链的跳数」

**实测**：对 `impact src/engine/types.ts` 的 24 个闭包文件，逐条比对 `by_depth[].depth` / `files[].path_hops` / `path.length - 1`——**24 / 24 三者完全相等**，无一条例外。

⇒ `path_hops` **不是**「这个文件到目标的实际跳数」（那可以有多条路径），而是**BFS 首达那条最短链**的跳数。`reasons[]` 自述原文：`path[] 只给一条最短链（BFS 首达即定型）：同一文件存在多条等价最短链时只列首达的那条`。

**实测样本**：`src/mcp.ts` 的 `path` = `["src/mcp.ts","src/adapters/mcp.ts","src/tools.ts","src/engine/types.ts"]`，`path_hops` = 3。

**灰在哪**：人类可读输出把它渲染成「（3 跳）」，**读起来像是「只有 3 跳这一条路」**。实际上 `path_edges[]` 里也只记首达那条链上每跳用的边。要做「这个文件到目标的所有路径」，当前接口**给不了**——**未验证**是否存在别的子命令能给出（`--help` 只列了三条查询，无第四条）。

### 7.2 `via` 未去重（**实测到极端例子**）

`via[]` 的元素是字符串 `"<file>:<line>:<column>"`，**不含 kind / layer**。

**实测**：`impact src/engine/types.ts` 的 `src/index.ts` 那条，`via.length = 29`，按字符串去重后**只剩 1 个**——29 条符号级边全部落在同一位置 `src/index.ts:4:15`。人类可读输出里那一行就是**同一个 token 重复 29 次**：

```text
src/index.ts  <- src/index.ts:4:15  src/index.ts:4:15  src/index.ts:4:15 …（共 29 次）
```

**为什么**：`src/index.ts:4` 是一句 `export * from './engine/types.js'`，它一次性把这些名字全部再导出，于是 29 条符号级边的 `from` 位置**完全相同**。`via` 丢掉了 kind/layer，这 29 条边就变得**不可区分**。

**灰在哪**：`via.length` 看着像「有多少条边把我牵进来」，但在再导出场景下它**严重高估**了「不同的引用点」个数。仓里 24 个闭包文件中有 **1 个**（`src/index.ts`）踩到这个（实测：`via.length > 去重后长度` 的文件数 = 1）。

### 7.3 结果截断：**标注了哪些、没标注哪些**（实测分界）

| 位置 | 是否截断 | 是否标注 |
| --- | --- | --- |
| `who-references` 的**符号级边**人类可读列表 | 是（`--limit`，默认 40） | **标注了**：`…（人类可读输出只显示前 40 条；--json 或 --limit 0 可看全部 431 条）`（`scripts/refs-query.cjs:327-329`） |
| `who-references` 的**文件级**引用方列表 | 否（25 条全列） | —— |
| `impact` 的人类可读输出 | **无任何切片**（`renderImpactHuman` 里没有 `.slice()`；全脚本只有 `:1334` 一处显示切片） | —— |
| `impact` 的**闭包**（`--depth` 截断） | 是 | **只标注了上限本身，没标注「这次是否真的被截断」**（见下） |

**§7.3 的实质问题**：`--depth` 截断闭包时，输出里只有 `depth<=N（实际 M 层）` 与 `counts.affected_files`。

- `impact ... --depth 1` → `depth<=1（实际 1 层）`，`counts.affected_files = 18`（**被截断**）
- `impact ... --depth 3` → `depth<=3（实际 3 层）`，`counts.affected_files = 24`（**自然结束**）

**这两种情况在输出形式上不可区分**——`actual_depth === max_depth` 时，你无法判断「闭包到此为止」还是「到达上限被砍」。`counts.affected_files` 也没有带「（未完整展开）」标记。**要看穿它，只能再跑一次 `--depth <更大的值>` 比较 `counts.affected_files` 是否变化。**

> **文档说法与实测不符的一处**：`scripts/refs-query.cjs:886` 的 `reasons[]` 第 4 条原文写 `未做 informational 与截断标注`。**「截断标注」这半句与实测不符**：`who-references` 的符号级边列表**是有**截断标注的（上表第一行）。真正没做的是**闭包截断的标注**。照字面读这条 reason 会低估现状。

### 7.4 `meta.omitted[]` 是**活字段**（§2.9 已逐条列表）

`ledger/references.json` 的 `meta.omitted` 有 8 条，其中第 **6**（传递闭包查询）/ **7**（查询接口）/ **8**（变更影响门禁）**与现状不符**——三者都已落地。

**性质**：`omitted` 记录的是**写产物那一刻**的批次边界。后续批次落地后，生成器**不会**回头去改这三条字符串（要改就得改生成器源码里的字面量）。所以它是**活字段**：**每逢新批次落地，都要回来检查它是否还成立。**

**读法**：`omitted` 说的是「**产物里没有** X」，不是「**本仓没有** X」。第 6/7/8 条按前者读**永远为真**（查询接口与门禁本就不该进图产物）——这是**范畴错误**，比单纯过期更隐蔽。

**同类问题在改动记录里**：两条 `ledger/change-log/*.json` 的 `omitted` 字段同样写着 `"查询接口（增量 5）"`，而它们是那时候写的记录。**记录是只增不改的事实记录，它们的 `omitted` 不得被「修正」**——但**读的时候必须按写作时点读**。

### 7.5 `.github/workflows/ci.yml` 的台账快照**已过期**（**这是本仓刚踩过的坑的复发**）

`.github/workflows/ci.yml:201-206` 的注释块写着「快照（2026-10-06，接入 `check:impact` 时按实测重写；旧值 1,412 / 482 / 76 已过期）」：

| 注释里的值 | 现值（`node scripts/generate-reference-graph.cjs --check`） | 差 |
| --- | --- | --- |
| 节点 **1,414**（全 `indexed`） | 节点 **1416** | +2 |
| 边 **491** | 边 **498** | +7 |
| 扫描面 **78** 个文件 | 扫描面 **80** 个文件 | +2 |
| 产物 **1,487,949 B** | **未复核**（该值随内容变；用 `git cat-file -s :ledger/references.json` 可测） | —— |
| `import` **315** | `import` **320** | +5 |
| `package-field` **49** | `package-field` **51** | +2 |
| 其余 kind（`require` 52 / `export-from` 19 / `dynamic-import` 1 / `markdown-link` 35 / `ci-target` 17 / `anchor` 3） | 与实测**逐项相同** | 0 |
| `声明 402 / 符号边 1,347（已解析 989 / 无符号 358）` | 声明 **402** / 符号边 **1347**；`resolved` **989**，`external` 134 + `unresolved` 224 = **358** | **一致** ✓ |
| `跨文件 756` / `无静默 null 0 条` / `Program 28 个源文件（仓库外 0 个）` | 与实测**逐项相同** | 0 ✓ |

**结论**：过期的是**文件级**那半张表（节点 / 边 / 扫描面 / `import` / `package-field`），**符号级**那半张仍然准确。

**同一段注释里另一句也已过期**：注释自称「旧值 1,412 / 482 / 76 已过期」——而它自己记的 1,414 / 491 / 78 **现在也已过期**。〔旁证：设计稿 `docs/DESIGN-code-graph.zh-CN.md:60` 记的 1,412 是那一批的实测快照，文档里已明确标注为「本批实测」，属**合规的历史快照**，不是过期现值。〕

**这是一个「复发」的坑**：本仓刚在 ≤ 2026-10-06 因为台账快照写过期数字而返工过一次，**改完的那份快照又过期了**。

**三个时点的实测对照**（把「谁带来的漂移」拆开，不笼统归因）：

| 时点 | 节点 | 边 | 扫描面 | 取数命令 |
| --- | --- | --- | --- | --- |
| `ci.yml` 快照写下的那一刻（注释自述） | 1,414 | 491 | 78 | ——（**转述，未复核**：注释里的值，本次没在那个提交上重测） |
| 本批开工前（`HEAD = 790e626`） | 1415 | 498 | 79 | `node scripts/generate-reference-graph.cjs --check` |
| 本批收口后（含本文档） | 1416 | 498 | 80 | `node scripts/generate-reference-graph.cjs --check` |

⇒ **更早几次提交**带来 `+1` 节点 / `+7` 边 / `+1` 扫描面（`1,414→1,415` / `491→498` / `78→79`）；**本文档**带来 `+1` 节点 / `+0` 边 / `+1` 扫描面（`1,415→1,416` / `498→498` / `79→80`）——本文档刻意不含 Markdown 链接，因此产边为 0（实测本文档节点 `edge_out: 0, edge_in: 0`）。

**根因**：`ci.yml` 的快照是**手写注释**，而图是**机器产物**——两者之间**没有**任何机制保持同步。**改法见 §8.3。** 本次任务范围**不含**改 `ci.yml`，因此**故意留原样**并在此记账。

### 7.6 `completeness` 恒为 `partial`，`complete` 分支是死代码

见 §3.4（实测）。**这不是「图不完整」的意思**——它是当前实现写死的值。**灰在哪**：一个真正的 `complete`（图完整且新鲜）在当前接口下**无法被表达**，因此使用者永远拿不到「这次可以放心读成『没人引用』」的信号。

### 7.7 `who-references` 的 `gaps[]` 混入了 `impact` 的描述

见 §3.4 末段（实测）。`who-references` 的 `gaps[3]` 里含 `impact 尚未做 informational 与截断标注` 这类**只属于 `impact` 的文字**。**灰在哪**：`gaps` 不是按查询裁剪的，逐条读会误导。

### 7.8 其它三条已知边界（口径本身如此，不是缺陷，但必须知道）

1. **`lines: null` ≠ 0 行**（§2.3 第 2 条）：1,337 / 1,416 个节点没有 `lines` 值，因为它们在扫描面外、**没被解析过**。
2. **`declarations` 只有顶层声明**：`scope` 恒为 `null`，函数内局部变量与参数**不在图里**（`meta.omitted[0]`）。想知道单文件的形参/局部变量，只能走 `refs-query locals`——它**不进图产物**，因此**没有传递性**（无法回答「谁引用了这个局部变量」）。
3. **`who-references` 的 `direct_referrers` 与 `symbol_referrers` 不可相加**（§3.1）：前者只数文件级边，后者含文件内边。

### 7.9 `check:refs` 的 `deleted-reference` warning 按 **basename** 命中（会被「正常的路径引用」大量触发）

**实测**：`node scripts/check-references.cjs --json` 的 `violations[]` 共 700 条，**全部**是同一个 type（`{"deleted-file-basename-mention": 700}`），全部来自第 4 类检查（`deleted-reference`）。

**机制**：该检查用 `git log --diff-filter=D --name-only` 取历史删除清单（`summary.deletedPaths` 实测 = **37** 条），然后**在仓库文本里搜这些路径的 basename**。历史删除清单里有一条**曾经位于 `vendor/` 下、如今整个目录都已删除**的 `types.ts`（本条刻意不写完整路径——见下），于是**任何**文本里出现的 `types.ts` 都命中一次：

```text
文档里提到 src/engine/types.ts  →  warning：提到了已删除文件的文件名 types.ts
                                 （该名字另有一条完整路径也已在历史里被删）——次级线索
```

> **写这一节时踩到的坑（值得单记）**：第一版这里把那条已删除文件的**完整路径**照抄了出来，`node scripts/check-references.cjs` 当场从 `0 error / 696 warning` 变成 **`2 error / 699 warning`**、**exit 1**（实测两条 `deleted-file-reference`，`severity: "error"`，`file` 指向本文档）。
> **区别是硬的**：提到删除文件的 **basename** 只是 `warning`（次级线索），提到 **完整路径** 是 `error`。⇒ **在文档里复述历史删除清单时，不要写出完整路径**——把错误复述进文档，等于把「残留提及」亲手造出来。这与本仓「残留零容忍」是同一条纪律。

**本文档自己就贡献了 51 条**（实测：`docs/HANDOFF-code-graph.zh-CN.md` 贡献 51 条，全部是这个 type）——因为 §3 的三条查询示例都以 `src/engine/types.ts` 为目标，正文里反复出现。**这 51 条不代表本文档写错了路径。**

**灰在哪**：
- 这类 warning 的数量与「**某个常用 basename 在你文中出现的次数**」成正比，**与真实残留无关**。`types.ts` 是本仓最常见的文件名之一（`files[]` 里 `lang=ts` 的就有 58 个），因此这是一条**高噪声**的次级线索。
- 门禁**只拦 error**，所以它不影响绿灯；但**拿 warning 数当"健康度指标"会得出错误结论**——本文档加入前后是 649 → 700（`node scripts/check-references.cjs`），差别全部来自这一条规则。
- 精确的「引用已删除文件」判定不靠它：**图里由 `status=dangling` + `to.state=deleted` 表达**，比 basename 次级线索精确得多（`ledger/references.json` 的 `ledger/exempt.gitignore` 豁免理由里也写着同一句话）。
- 该脚本另有 `allowlisted` 机制（`summary.allowlisted` 实测 = **1865** 条被豁免）：`ledger/references.json` 因为「内容按构造就是仓库里所有被引用的路径」整文件豁免了这类 warning，**本文档不在豁免名单里**。

### 7.10 本次核对**未验证**的事项（写明怎么验证）

| 未验证 | 为什么 | 怎么验证 |
| --- | --- | --- |
| 第 1 / 2 / 3 / 4 / 7 / 8 / 9 环的**实际通过状态** | 本次没跑（§4.6） | `npm run check` |
| `ci.yml` 注释里「产物 1,487,949 B」 | 没测该时点的产物大小 | 无意义——那是快照；现值用 `git cat-file -s :ledger/references.json` |
| `ci.yml` 注释里「单次全量重算 ≈1.5–2.1 s（本轮实测 3 次：1,474 / 1,820 / 2,128 ms）」（**转述，未复核**） | 那是别人在那台机器上跑的 3 次计时，本次只跑到 1 次（生成器自报 `耗时 1413 ms`，同一次运行的 `--json` 里另有 `createProgram 121 ms / 符号遍历 159 ms`） | 多跑几次 `node scripts/generate-reference-graph.cjs --json` 读 `timings` |
| 设计稿里所有标「实测」的设计期数字（如 §2.6 的单条字节数、§9.7 的耗时表） | 本次没复测，且它们是**设计期快照** | 按设计稿 §9.7 每项自带的「测量方法」一列复测 |
| 「符号级层落地后产物 1,482,686 B」等设计稿数字（**转述，未复核**） | 见上 | 同上 |

---

## 8. 想改动时怎么做

四条常见改动，各自的检查清单。**共通前提**：本套东西的判定基准是 **git 索引**，所以每一步都别忘了 `git add`（§6.1 / §6.4）。

### 8.1 加一种边 kind

**改动面（至少 4 处，缺一必红）**：

1. `scripts/reference-graph-core.cjs`——加解析逻辑、把新 kind 放进产边位置。**这是共享内核**：`check-references.cjs` 与生成器**同时** require 它，因此改它会**同时**影响门禁与图。
2. `scripts/generate-reference-graph.cjs`——确保新 kind 能落进 `edges[]`（或符号层）；`meta.edge_kinds` 是**算出来的**，新增 kind 会自动出现。
3. `.github/workflows/ci.yml` 第 189-190 行附近——注释里逐条列了覆盖的 kind 清单，**注释自称「新增边 kind … 时必须同步改本注释与 `CONTRIBUTING.md`」**。
4. `CONTRIBUTING.md:83` 附近——同样的 kind 清单。

**检查清单**：
- [ ] `node scripts/generate-reference-graph.cjs` → `git add ledger/references.json` → `node scripts/generate-reference-graph.cjs --check` **exit 0**
- [ ] `node scripts/check-references.cjs` **exit 0**（新 kind 在 `check:refs` 里若也有对应检查项，error 数不得上升）
- [ ] 新 kind 若属**代码级引用**（对方编译或运行会坏），必须加进 `refs-query.cjs` 的「必须改」判据，否则 `impact` 的分档会漏；若属配置/文档级，加进「需复核」。判据在 `scripts/refs-query.cjs` 的 `impact` 段与 `buckets` 构造处
- [ ] **`edges[].type_only` 的语义是否适用**：纯类型语句产出的边才算 `type_only=true`（§2.8 第一套口径）
- [ ] 边 id 冲突：同一位置多条边要追加 `:<field|specifier>` 消歧，**仍冲突即生成失败**（`meta.edge_id_rule`）——新 kind 在一行里产多条边时最容易撞
- [ ] `git add` 所有改动的脚本（§6.5），否则 CI 用旧门禁
- [ ] 加 e2e 断言：`tests/reference-graph-e2e.mjs`

### 8.2 改扫描面

**扫描面定义**：`meta.scope` = 「产边的文件 = 已跟踪 + 文本后缀 + 不在 `excluded_prefixes` 内；**节点表仍是全量已跟踪文件**」。现值：`text_extensions` = `['.cjs','.json','.md','.mjs','.toml','.ts','.yaml','.yml']`，`excluded_prefixes` = `['examples/','lib/']`，`scanned_total` = 80。

**改动面**：
1. 生成器里的 `text_extensions` / `excluded_prefixes` 常量。
2. **符号级层的 Program 范围**是**另一套**：`meta.symbol_graph.scope` 原文——`只对扫描面内 lang=ts 的文件建 Program（本仓 = src/**/*.ts）`；`.mjs` / `.cjs` / `.js` / `.jsx` **按设计稿 §3.4 退化为文件级，不产符号边**。**扩大文件扫描面 ≠ 扩大符号面**，两者要分别改。
3. `ci.yml` 注释（`扫描面 78 个文件` 那行）与 `CONTRIBUTING.md`。

**检查清单**：
- [ ] **想清楚 `lines` 的影响**：扫描面内的文件才有 `lines` 值（§2.3）。扩大扫描面会让更多节点从 `lines: null` 变成有值 ⇒ **图会大改**。
- [ ] **想清楚性能**：`createProgram` 是全仓级的，扩进 `examples/`（机器产物）或 `lib/`（编译产物）会让 Program 规模爆炸。设计稿 §2.8 明写「全仓级不在符号面内」是**结构性保证**，扩之前先读那一节的成本实测。
- [ ] `node scripts/generate-reference-graph.cjs` → `git add ledger/references.json` → `--check` **exit 0**
- [ ] `node scripts/check-file-ledger.cjs` **exit 0**：**扩扫描面不会**改变台账宇宙（台账看的是 `git ls-files` 全量），但**新增已跟踪文件会**——新增文件必须在 `ledger/exempt.gitignore` 里拿到一条带 reason 的模式，或走 `owned`
- [ ] `node scripts/check-references.cjs` **exit 0**：扫描面扩大后新解析出的引用会**首次**暴露原先看不见的悬空 ⇒ error 数会上升
- [ ] 更新 `meta.scope.description`（若口径话术也变了）
- [ ] 加 e2e 断言：`tests/reference-graph-e2e.mjs`

### 8.3 加一道门禁

**三处同步是硬要求**（`CONTRIBUTING.md` 与设计稿 §10 增量 1 偏差记录第 1 条都写成约束）：

1. `package.json`——加 `check:<name>` script，**并把它追加进 `check` 链**（顺序即执行顺序，`&&` 串联）。注意：**链上位置有语义**——`check:graph` 在 `check:changes` 之前、`check:impact` 在最后，理由见 §4.7（`check:impact` 假定手上这份图是新鲜且完整的，**新鲜度由 `check:graph` 保证**，且它在链上先于 `check:impact`）。
2. `.github/workflows/ci.yml`——**独立 step**（不是塞进别的 step），红了能一眼看出是哪道。
3. `CONTRIBUTING.md:75` 的清单 + 该环的口径段落。

**检查清单**：
- [ ] 新门禁**必须自带 `--help`**（本仓所有门禁都有，且口径以 `--help` 自述为准）
- [ ] **fail-closed**：拿不到判据时**不判绿**（§4.2）。「读不到就当通过」是本仓明确拒绝的形状
- [ ] **`--root` 语义与既有门禁一致**：必须是 git 仓库根（realpath 相等），否则退出码 1 拒绝，**绝不静默回退**（`check-impact.cjs --help` 有完整表述）
- [ ] **退出码约定**：0 通过 / 1 判定不通过或 fail-closed / 2 用法错误（本仓统一）
- [ ] 若新门禁读图产物：**用图自己的词表**，不另造一套（`check-impact` 的 `--help` 明写这条）
- [ ] 若新门禁是**棘轮**：说清「存量容忍、新增报红」+ 基线取哪一对（`basis` 字段自证）+ 为什么不提供豁免（本仓立场：没有白名单）
- [ ] 加回归用例到 `npm test` 链 + `package.json` 的 `test:<name>`（可选但本仓惯例如此）
- [ ] 改完 `git add` 全部三项（§6.5）
- [ ] 更新 `ci.yml` 的快照行——**并且记住 §7.5 的教训：手写快照必然会过期**

### 8.4 加查询子命令

**入口**：`scripts/refs-query.cjs`。三条现有子命令的公共骨架：`parseArgs` → 读图（索引优先，回退工作区）→ 构建报告对象 → `--json` 或人类可读渲染。

**检查清单**：
- [ ] **同步改 `--help`**：本仓的 `--help` 是**口径的自述**，不是装饰。`check-impact.cjs --help` 的原文就是「口径以 `--help` 自述为准」。新子命令的选项、退出码、缺口都要写进 `--help`
- [ ] **元字段对齐**：读图产物的子命令应带 `basis` / `completeness` / `reasons` / `gaps` / `empty_referrers_reading`（实测这三个是 `who-references` / `impact` 的共同字段）。**`locals` 是刻意的例外**（不读图产物 ⇒ 无 `basis` / `completeness`）——若新子命令也不读图，照 `locals` 的形状办，并在 `--help` 里写明
- [ ] **`completeness` 的既有毛病别复制**（§7.6）：当前是 `diverged ? 'stale' : 'partial'` 写死。新子命令若真能判 `complete`，是**改进**；若不能，就照实说，并让 `empty_referrers_reading` 用 `emptyReading(completeness)` 生成
- [ ] **`gaps` 要按本子命令裁剪**，不要照抄 `impact` 的（§7.7 就是抄出的事故）
- [ ] **退出码复用既有语义**：`2` 参数 / `3` 读不到图 / `4` 输入不受支持 / `5` 目标不在图里
- [ ] **不新增 MCP 工具**（`CONTRIBUTING.md:93` 与设计稿 §9.3：查询是给人用的接口，不暴露给模型）
- [ ] **不进门禁链**：查询是只读接口，**不在 `npm run check` 里**——查询结果再可疑也不拦提交
- [ ] **确定性**：`--json` 不得含绝对路径、时间戳、耗时（本仓的确定性要求，见 `--help` 的 `--json` 说明）；同一输入连跑两次应逐字节相同
- [ ] 若新子命令能做**可达性判定**（像 `impact` 的 `type_only`）：**必须用全深度闭包**，不能拿 `--depth` 截断后的集合做 BFS（否则会把「路径长于上限」判成「没有路径」，`scripts/refs-query.cjs:801` 与 `:831` 是这条的原始记录）
- [ ] 排序一律 **UTF-8 字节序**，**不用** `localeCompare`（`src/engine/manifest.ts:11` 用 `localeCompare` 是本仓一处已知跨平台风险，新代码不得沿用）
- [ ] 若新子命令改变了 `refs-query.cjs` 的字节数：`node scripts/generate-reference-graph.cjs` → `git add ledger/references.json` → `--check` **exit 0**（`refs-query.cjs` 在扫描面内，它自己的 `lines` / `bytes` 会变）

### 8.5 收口模板（任何一条改动都适用）

```powershell
# ① 改文件
git add <你改的每个文件>                              # 明确列出，禁 -a / -A
# ② 图（若改动落在扫描面内）
node scripts/generate-reference-graph.cjs
git add ledger/references.json
node scripts/generate-reference-graph.cjs --check      # 必须 exit 0
# ③ 台账（若新增/删除/改名了已跟踪文件）
npm run ledger:gen
git add ledger/file-ledger.json                        # 若动了豁免清单，另加 ledger/exempt.gitignore
node scripts/check-file-ledger.cjs                     # 必须 exit 0
# ④ 逐环自检
node scripts/check-references.cjs                      # 必须 exit 0
node scripts/check-doc-snippets.cjs                    # 必须 exit 0（改了 docs/ 下的 .md 必跑）
node scripts/check-impact.cjs                          # 必须 exit 0
# ⑤ 全链（本批没跑，见 §4.6）
npm run check
# ⑥ 提交（禁 -a / -A / --amend）
git write-tree                                         # 记下
git commit -F <消息文件>
git rev-parse "HEAD^{tree}"                            # 必须等于 ⑤ 上一行的输出
git status --porcelain                                 # 必须为空（§6.2）
```

---

## 附录：本文档引用到的实测命令索引

| 数字/结论 | 命令 |
| --- | --- |
| 节点 1416 · 边 498 · 扫描面 80 · 声明 402 · 符号边 1347 | `node scripts/generate-reference-graph.cjs --check`（或 §0.2 那条） |
| 8 种边 kind 逐项条数 | `node -e "console.log(require('./ledger/references.json').meta.edge_kinds)"` |
| `lines` 为 `null` 的节点数 | `node -e "const j=require('./ledger/references.json');console.log(j.files.filter(f=>f.lines===null).length,j.files.length)"` |
| 产物无 `degradation` 字段 | `node -e "console.log(JSON.stringify(require('./ledger/references.json')).includes('degradation'))"` |
| `meta.omitted` 8 条逐条 | `node -e "console.log(require('./ledger/references.json').meta.omitted)"` |
| 台账四态 | `node scripts/check-file-ledger.cjs` |
| `0 error / 700 warning` | `node scripts/check-references.cjs` |
| `2 条记录全部通过` | `node scripts/generate-change-log.cjs --check` |
| `tree` 冻结值核对 | `git rev-parse "ed404e5^{tree}"` 等（§5.3 四条） |
| `who-references` / `impact` / `locals` 的元字段 | `node scripts/refs-query.cjs <子命令> <路径> --json` |
| `path_hops` / `via` / 闭包 24 文件 | `node scripts/refs-query.cjs impact src/engine/types.ts --json` |
| `--depth` 截断对照 | `node scripts/refs-query.cjs impact src/engine/types.ts --depth 1` 对比 `--depth 3` |
| 四个退出码 | `who-references docs/NOPE.md`（5）/ 符号 id（4）/ `locals README.md`（4）/ `bogus x`（2） |
| `ci.yml` 快照过期 | 对比 `.github/workflows/ci.yml:201-206` 与上表第一行的现值 |
