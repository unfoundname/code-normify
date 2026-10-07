# 交接：符号级引用图 + 逐次改动记录（`code-normify`）

本文档面向**接手这套东西的下一批执行者**。它只讲一件事：本仓的「引用图 + 改动记录 + 查询接口 + 门禁链」这一整套机器事实是怎么落的、字段口径是什么、哪里还是灰的、想改该怎么改。

设计动机与验收标准在 `docs/DESIGN-code-graph.zh-CN.md`——**该文档的行数不在此复述**（它每改一次就变）；**现值取数**：`node -e "console.log(require('./ledger/references.json').files.find(f=>f.id==='docs/DESIGN-code-graph.zh-CN.md').lines)"`。**留痕（只作留痕，不是现值）**：本行原写「1,332 行」，独立复核者第四轮实测 **1338**，本批开工实测 **1353**，本批改引后重测 **1361**（本批给本文档与 DESIGN 都增补了正文，行数随之变——这正是本行「不在此复述」的理由）。**留痕（旧写法，已作废）**：本行历史上还写「或 `node scripts/generate-reference-graph.cjs --check` 输出的 `lines` 字段」——那条取不到数：`--check` 的人类报告只有「一致 / 降级状态 / 节点·边·扫描面·universe / 符号级」四行，**没有 `lines` 字段**（实测该字段为 `undefined`）。本文档不重复设计论证，只写**落地后的现状与口径**。

---

## 0. 本文档的取证基准（先读这一节，否则后面的数字不可信）

### 0.0 引用约定

> **引用约定**：本文档引用代码位置时，**不写行号**，而写「文件路径 + 可 `grep` 的引文片段」。行号会随每次改动漂移，引文不会。若你确实需要行号，请自己 `grep` 该引文；本文档**故意不承诺行号**。

**所有数字都附出处**，写法是「数值（命令）」。凡是**我没有亲自跑过**、从别处抄来的数字，一律标 `（转述，未复核）`。

**快照时点**：2026-10-06，仓库根 `<repo-root>`。**本批实测值**：`HEAD = 5e78029`（`git log --oneline -4` = `5e78029` / `e166e94` / `7511540` / `7c6d06f`；**旧值 `9adf069` 已过期**），`git status --porcelain` 输出为空。
**留痕**：本文档初次落地（提交 `b4fddb3`）时的 `HEAD` 是 `790e626`——下文凡标「本批」的历史记账都指那一次；凡标「本版同步」的是 `9adf069` 那次重测的记账，**其中的行号部分已在本批（`5e78029`）整体作废**（全文改为 §0.0 的引文锚）；凡标「本批改引」的是本次的实测值。

**本批做了什么（为什么不是「再同步一次行号」）**：本文档曾经通篇用 `文件:行号` 指路，而**每一次碰到那些文件的提交都会让它过期**——`56ea956` 刚同步过一遍，随后的 `7511540` / `e166e94` / `5e78029` 三个提交又把它推漂。所以本批的目标**不是再同步一次**，而是**消灭这一类衰减**：把全文的行号引用改成**引文锚**（可 `grep` 的原文片段），行号会漂、引文不会。代价是残留风险从「行号漂移」换成「**引文本身被改写**」——两者都只能靠 `grep` 复核，见 §7.11。

**一个必须理解的前提**：本文档自身是**被图扫描的文件**。加入本文档前，图的值是「节点 1,415 · 边 498 · 扫描面 79」（`node scripts/generate-reference-graph.cjs --check`）；加入后是「节点 1,416 · 边 498 · 扫描面 80」（`node scripts/generate-reference-graph.cjs`，同一条命令加 `--check` 复检）。**本文档正文里的规模数字都是各批次的留痕，不是现值**（含上面「加入前 / 加入后」这两个时点在内）；要现值，跑 §0.2 那条取数命令，或各自断言旁边就地写着的那条。

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
node scripts/check-references.cjs --json
node scripts/generate-file-ledger.cjs --check
Select-String -Path docs/HANDOFF-code-graph.zh-CN.md -Pattern "\.(cjs|json|ts|md|yml|mjs)\:[0-9]+"
```

**注（本批改引）**：上面这份清单是初次落地时跑的；本批新增用到的取数命令都**就地写在各自断言的旁边**（不另列一份——两份清单必然互相同步不上，那正是本文档要消灭的那类衰减）。

**没有跑过** `npm test`、`npm run check`、`tests/impact-gate-e2e.mjs`（见 §4.6：这三条我明确没跑，跑法与代价写在那里）。

### 0.2 取图产物现值的**一条命令**

本节以及全文所有「节点 / 边 / 声明 / 符号边」的计数，都来自这一条：

```powershell
node -e "const j=require('./ledger/references.json');console.log(JSON.stringify({schema_version:j.schema_version,files:j.files.length,edges:j.edges.length,declarations:j.declarations.length,symbol_edges:j.symbol_edges.length,edge_kinds:j.meta.edge_kinds,scanned:j.meta.scope.scanned_total,tracked:j.meta.tracked_total},null,2))"
```

那时的输出（**只作留痕，不是现值**；加入本文档后、本批提交时）：

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

**一段话**：`code-normify` 把「谁引用了谁」做成了一份**可机器复核的图数据**——`ledger/references.json` 由生成器从 **git 索引**（不是工作区）重算，节点 = 全量已跟踪文件，边 = 8 类文件级引用 + 3 类符号级引用；在其上是三层消费者：**只读查询层** `scripts/refs-query.cjs`（给人回答「谁引用我 / 删了我会炸谁 / 这文件声明了什么」）、**逐次改动记录** `ledger/change-log/*.json`（每次提交的**观测点**产一条记录（`from` = 父提交 / 根提交 = 空树，`to` = 该提交）；记录只能记录**它之前的**提交，
因此**稳态是「HEAD 之前的每个提交都有一条记录」，永远差 HEAD 这一位**。记录由生成器**按需**写（幂等、只增不改），
**`check:changes` 绿灯只代表「已存在的记录都通过校验」，不代表覆盖完整**；覆盖率要自己算（见 `ledger/change-log/README.md`）。）、**门禁链**（`npm run check` 的 13 环，其中 4 环直接管这套数据）。三者共用同一个判定基准（git 索引 / 提交树），因此不会出现「门禁说悬空、查询说没事」的双真相。

### 1.1 产物 ↔ 用途

| 产物 | 谁写 | 谁读 | 回答什么问题 | 判定基准 |
| --- | --- | --- | --- | --- |
| `ledger/references.json`（`schema_version: 2`） | `scripts/generate-reference-graph.cjs` | `scripts/refs-query.cjs`、`scripts/check-impact.cjs`、`generate-change-log.cjs` | 谁引用了谁（文件级 + 符号级） | git 索引 blob |
| `ledger/file-ledger.json`（`schema_version: 2`） | `scripts/generate-file-ledger.cjs` | `scripts/check-file-ledger.cjs` | 这个文件有没有人管（四态归属） | git 索引 blob |
| `ledger/exempt.gitignore` | 人（必须逐条写 reason） | `scripts/check-file-ledger.cjs` | 哪些文件按什么理由豁免归属 | git 索引 blob |
| `ledger/change-log/*.json`（`schema_version: 1`） | `scripts/generate-change-log.cjs` | `node scripts/generate-change-log.cjs --check` | 这次改动动了哪些边与文件、影响了谁、处理了没有 | 由生成器写的**事实记录**，不参与判定 |
| `ledger/change-log/schema.json` | 人 | `--check`（ajv，draft 2020-12） | 记录的机器判据 | —— |
| `scripts/refs-query.cjs` | 人 | 人（**不在门禁链上**） | `who-references` / `impact` / `locals` | 读图产物（索引优先，回退工作区） |

上表「判定基准」一列逐条来自：`ledger/references.json` 的 `meta.read_basis`（实测值 = `文件内容一律取自索引 blob（git cat-file --batch），不读工作区`）、`ledger/file-ledger.json` 的 `meta.byte_basis`、`ledger/change-log/README.md` 里那张表头为 `| 数据 | 回答什么 | 判定基准 |` 的关系表。

### 1.2 与「文件台账」的分工

`ledger/file-ledger.json` 管**归属**（这个文件有没有人管），`ledger/references.json` 管**引用**（谁引用谁），`ledger/change-log/` 管**一次改动的影响面**。三者同域（都在 `ledger/` 下）但**不共用判定**。

那时的台账输出（**只作留痕，不是现值**；`node scripts/check-file-ledger.cjs`，加入本文档之后、本批提交时）：

```text
台账宇宙: git ls-files 1416 条 · universe_hash fe49d5b7fec69b4d…
四态归属: owned 0 · exempt 1387 · accounted 29 · unowned 0
✔ 0 error / 0 warning —— 门禁通过
```

**加入本文档之前**的同一条命令给出的是 `git ls-files 1415 条` / `exempt 1386` / `unowned 0`——多出来的 1 个 `exempt` 就是本文档自己（`docs/**` 已在 `ledger/exempt.gitignore` 里有一条带 reason 的模式：`docs/** ## reason=工具自身文档`）。

**这一步踩到的坑（值得单独记）**：新增一个已跟踪文件会让 `git ls-files` 条数变 ⇒ 台账的 `meta.tracked_total` 与 `meta.universe_hash` 立刻漂移，`node scripts/check-file-ledger.cjs` 报 **2 个 error**（`ledger-tracked-total-drift` + `ledger-universe-hash-drift`），**exit 1**。**修法只有一条，而且是本仓明文规定的必做步骤**（`CONTRIBUTING.md` 里写着「**改完仓库后必须重跑 `npm run ledger:gen`**」的那一处）：

```powershell
node scripts/generate-file-ledger.cjs        # = npm run ledger:gen
git add ledger/file-ledger.json
```

生成器**只重算机器可算的部分**（`tracked_total` / `universe_hash`），实测它这次只动了这两处：`accounted` 仍 29 条（**棘轮只减不增**；这条回显里的**提交号随 HEAD 前移，不要写死**——实测 `790e626` → `9adf069` → `5e78029` 三次都报「共 29 条」，并回显 `剔除的**非基线**条目 0 条`），`exempt` 由 1386 变为 1387（**因为本文档命中了已有的 `docs/**` 模式，不是新增了豁免**——生成器绝不自动新增豁免）。

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
- `declarations`（声明节点表）与 `symbol_edges`（符号级边）是 v2 新增的两个顶层数组。**两者的条数都是活值、不在此复述**——现值取数 `node -e "const j=require('./ledger/references.json');console.log(j.declarations.length,j.symbol_edges.length)"`（等价写法见 §0.2 那条）。**留痕（只作留痕，不是现值）**：本行原写「声明节点表，402 条」「符号级边，1,347 条」，那是本文档初次落地那个时点的数，**两个都已过期**（现值见上面的取数命令）。

| 数组 | 条数（**本批留痕，不是现值**） | 取数命令 |
| --- | --- | --- |
| `files` | 1416 | §0.2 那条 |
| `edges` | 498 | §0.2 那条 |
| `declarations` | 402 | §0.2 那条 |
| `symbol_edges` | 1347 | §0.2 那条 |

### 2.2 `files[]` 字段契约

键名集合实测（`node -e "..."`，取自产物本身；括号里原本写着「1629 行脚本无关」——**本批改引实测**：本仓没有任何文件是 1,629 行，写出该产物的 `scripts/generate-reference-graph.cjs` 的**行数是活值、不在此复述**（现值取数命令 `node -e "console.log(require('./ledger/references.json').files.find(f=>f.id==='scripts/generate-reference-graph.cjs').lines)"`；**注意这条命令每次改这个脚本都会给出新值**），这句话的意思应是「与脚本行数无关」，故照实改正。**留痕（只作留痕，不是现值）**：本行先后写过「**1,238 行**」（当时写的是「旧值 1,229 已过期」）——**1,238 本身今天也已过期**，两个数都只作留痕）：

```text
id, lang, state, bytes, lines, edge_out, edge_in
```

样本（**留痕样本：只作留痕，不是现值**——它取自某个时点的 `files[]`，**样本自身会过期**：`bytes` / `lines` 随该文件每次改动变化，`edge_*` 随引用它/被它引用的文件增减变化。**不要把这个样本里的任何数当现值**；要现值就跑就地给出的取数命令：`bytes` = `node -e "console.log(require('./ledger/references.json').files.find(f=>f.id==='.github/workflows/ci.yml').bytes)"`、`lines` = 同一条把 `.bytes` 换成 `.lines`、`edge_out` / `edge_in` 同理。样本的**字段形状**才是本节要立的东西，字段口径见下表）：

```json
{"id":".github/workflows/ci.yml","lang":"yaml","state":"indexed","bytes":31699,"lines":293,"edge_out":17,"edge_in":0}
```

**留痕（只作留痕，不是现值）**：上面这个样本里的 `bytes` / `lines` 先后写过「**31810**」与「**31699 / 293**」两代值；**两代今天都已过期**——本行早先只给更旧的 31810 标了「已过期」，却没标**样本自身会过期**，读起来像 31699 / 293 是现值（**旧写法留痕**：原句为「**旧值 `bytes` 31810 已过期**」，只覆盖了第一代）。

| 字段 | 口径 |
| --- | --- |
| `id` | 仓库相对 posix 路径。**节点身份就是它**，没有单独的 `path` 键 |
| `lang` | `js` / `json` / `md` / `other` / `ts` / `yaml` 六值（实测全集） |
| `state` | 四态 `indexed` / `ignored` / `untracked` / `deleted`。**节点四态计数是活值、不在此复述**（现值取数：`node -e "console.log(require('./ledger/references.json').meta.node_states)"`，或 §0.2 那条；**留痕：本批改引实测 `{"indexed":1416}`，只作留痕，不是现值**），另三态只登记**被引用到**的索引外目标，不枚举全部被忽略文件 |
| `bytes` | git 索引 blob 的字节数（`git cat-file --batch-check`）。**非索引节点为 `null`** |
| `lines` | **见下方专条** |
| `edge_out` / `edge_in` | 出边 / 入边条数。与 §1.2 的台账台账口径无关 |

### 2.3 `lines` 的三条口径（**最容易读错的一栏**）

1. **算式**：`lines = text.split('\n').length`，源码位置 = `scripts/generate-reference-graph.cjs` 里的 `lines: self || text === undefined ? null : text.split('\n').length,` 一行（**本批改引实测**：该引文仍是原文，未漂移）。⇒ **末尾带换行的文件会比可见行数多 1**。实测：字符串 `"a\nb\n"` 的 `split('\n').length` = 3（可见 2 行）；`"a\nb"` = 2（可见 2 行）。本文档自身也适用，但**这三个数都是活值、不在此复述**（本文档每改一次、DESIGN 每改一次，它们就变）。现值取数：`lines`（split 口径）= `node -e "console.log(require('./ledger/references.json').files.find(f=>f.id==='docs/DESIGN-code-graph.zh-CN.md').lines)"`；可见行数 = `(Get-Content docs/DESIGN-code-graph.zh-CN.md).Count`；非空行数 = `Get-Content docs/DESIGN-code-graph.zh-CN.md | Measure-Object -Line`。**算式自洽性（有边界条件，不是「永远成立」）**：**当且仅当文本以换行结尾时** `lines`（split 口径）= **可见行数 + 1**；**文本不以换行结尾时 `lines` = 可见行数**（本批实测：`"a\nb\n"` 可见 2 行、以换行结尾 ⇒ `split('\n').length` = 3 = 2 + 1；`"a\nb"` 可见 2 行、不以换行结尾 ⇒ = 2，**不是** 3；空文本是退化情形——`''.split('\n').length` = 1，而 `(Get-Content 空文件).Count` = 0，形式上也是 +1，但空文本没有「可见行」可数）。**留痕（旧说法，已作废）**：原文把这条等式写成「与具体数值无关，永远成立」——**不以换行结尾的文本就是它的反例**（照它读会以为 2 行的文件必然得 3）。在同一条件下，而 **`Measure-Object -Line` 数的是非空行**、不是可见行数 ⇒ 恒有 `非空行 = 可见行数 − 空行数 = lines − 1 − 空行数`。**留痕（只作留痕，不是现值）**：本行原写 DESIGN「`lines` = **1332**、可见 **1331**、`Measure-Object -Line` 报 **1046**、空行 **285**」（与上面的算式自洽：1331 − 285 = 1046）；**独立复核者第四轮实测 1338 / 1337 / 1051 / 286**（同样自洽：1337 − 286 = 1051），本批复核时实测与之逐字相同——**这四个数同样是活值、不是不变量**（DESIGN 每改一次这组数就变，本文档每改一次本文档那组数就变），现值一律按本段开头那三条取数命令现取，**不要抄这里的任何一组数**。旧版此处还写过「报 1331」，那是**把 `Measure-Object -Line` 当成了行数计数器**，本版照实改正；要数可见行用 `(Get-Content <文件>).Count`）。

2. **`lines` 只对「扫描面内」的文件有值**。⇒ `lines !== null` 的条数 = 扫描面文件数减 1（自指的 `ledger/references.json`），其余为 `null`；`bytes` 为 `null` 的节点 = **非索引节点**（`untracked` / `ignored` / `deleted`）**加上自指的 `ledger/references.json` 这一条**（§2.3 第 3 条的豁免）。**今天恰为 1 条**只是因为「非索引节点」当前一个都没有——全仓节点都是 `indexed`（`meta.node_states` 可自证），**不是不变量** —— 本行历史上写作"恒为 1 条"，与本文档"非索引节点为 null"的契约冲突（`ignored` / `untracked` / `deleted` 节点同样写 `null`）。**（本批按实测补精确，不改上面这句的结论）** 上面这条等式**只管 `bytes`**：`lines` 还有一个 null 成因——**不在扫描面内的索引节点也不解析**（本节第 2 条前半句），今天 `lines === null` 是 **1,337 条** = 自指产物 1 条 + 扫描面外的索引节点 1,336 条，**远不止 1 条**；这也是「今天恰为 1 条」只能挂在 `bytes` 上的原因。两栏取数：`node -e "const f=require('./ledger/references.json').files;console.log('bytes',f.filter(x=>x.bytes===null).length,'lines',f.filter(x=>x.lines===null).length)"`。**留痕（只作留痕，不是现值）**：本批改引实测 `lines !== null` 计 **79**（= 扫描面 80 个文件 − 自指 1），其余 **1337** 条为 `null`；现值取数 `node -e "console.log(require('./ledger/references.json').files.filter(f=>f.lines===null).length)"`（附录命令索引里也有这条）。
   ⇒ **`lines: null` 的含义是「这个文件没被解析过」，不是「0 行」，也不是「未知内容」。** 想知道扫描面外文件的行数，`git cat-file blob :<path>` 自己数，或把它加进扫描面（§8.2）。

3. **自指例外**：自指条目（本产物自身的 `bytes`/`lines`）在产物里**固定写 `null`** —— 这是**处置选择**，不是"没有不动点"：实测把这两个量迭代写回，**第 3 次就收敛**（不动点存在）。本行历史上写的"必然得到不同的值"是错的。（本批复算的收敛链：产物 1,506,027 B ⇒ 把自身 `bytes` 写回后重排得 1,506,031 B〔变了〕⇒ 再写回 1,506,031 得 1,506,031 B〔`stable=true`〕；把"首次写出、自身记 `null`"算作第 1 次写出，则收敛发生在**第 3 次写出**，等价于写回循环第 2 轮。收敛的**前提**是产物里除这两个量之外的一切都不依赖自身大小 —— 这一点成立；**但本批实测订正：它不足以推出"不动点唯一"**（**旧说法留痕**：本行原写"这一点成立，所以不动点唯一"）。**注意（本批已收口，旧注留痕）**：`meta.self_reference` 的字符串与 `scripts/generate-reference-graph.cjs` 里那段同源说明**原先写着"记了就没有不动点、幂等当场失效"的旧理由**——上一批只改文档、未动生成器与产物（本条当时记的就是这个待改项）；**本批已把两处一起改成上面的实测结论，并重算了产物**。**处置一个字没动**：产物里自指条目**仍固定写 `null`**，改的只是理由。本批复核的收敛链（**只写不变量、不写死绝对字节** —— 本条写入本身就会改变产物大小，写死必然过期；本批实测：批内新增 1 个已跟踪文件后产物就从 1,507,059 B 再变了一次）：产物 **N B** ⇒ 把自指条目的 `bytes`/`lines` 迭代写回，**第 3 次即收敛**（不动点存在）。**增量 ≈ +4 不是普适常数** ——
它取决于十进制位宽（实测 `N=1,508,079` 时 +4、`N=3,156,969` 时 +5）；
本行历史上把它写成"`N ⇒ N+4`"，并据"固定其余字段"推出"不动点唯一"，两处都过强。
⇒ 写回链：产物 **N B** ⇒ 写回后重排得 **N + Δ B**（**Δ 由十进制位宽决定，不是常数**）〔变了〕⇒ 再写回 ⇒ **第 3 次写回起逐字节相同（`stable=true`）** —— **收敛所需写回轮数 = 3，与上一批一致**，变的只是 N（**留痕：本批第一次重算后曾记「1,506,846 ⇒ 1,507,059」，那是中间态产物的链；提交态实测 N = 1,507,263 B、N+4 = 1,507,267 B，时点 = 8d3af9b，只作留痕、不是现值**）。**计数口径（免得"第几次"各说各话）**：上面数的是**写回轮数**；若改按"写出次数"数（把"首次写出、自身记 `null`"算第 1 次），逐字节相同出现在**第 4 次写出** —— 上一批记的"第 3 次写出"把「写回后总大小已定、但条目里的值还是上一次的」那一轮并掉了，**链的形状完全相同**。**结论不变**：不动点存在（**本批订正：不再声称"唯一"** —— "固定其余字段"不足以推出唯一，理由与实测见上），产物越长 N 越大，所以"不动点存在"可复现、"不动点是哪个数"不可写死。**本批复现留痕（只作留痕，不是现值）**：当前产物 `N = 1,508,283`（`lines` = 59,927，5 位宽）⇒ Δ = **+4**；把同一份图按同构放大到 `N = 2,728,995`（`lines` = 108,695，6 位宽）⇒ Δ = **+5** —— 同一条链，只有十进制位宽不同，增量就不同。）**为什么仍然固定写 `null`**：不动点要靠**迭代写回**才拿得到，而生成器是"从索引一次算出、再写盘"的单遍实现 —— 要让产物描述自己，就得先知道自己的最终大小，等于把写盘变成迭代；本批按"幂等 = 一次算、一次写、连跑两次逐字节相同"的口径，选择继续写 `null`。**只豁免这两个派生量**；`id` / `lang` / `state` / `edge_*` 一律照记。

### 2.4 降级四态，**以及产物里没有 `degradation` 字段**

降级词汇四态 `complete` / `partial` / `unknown` / `stale`，与设计稿 §5.5 的 `completeness` / §4.6 的 `degradation.status` 同词同义。

**必须写清的一条**：`ledger/references.json` **里不存 `degradation` 字段**。实测：`Object.prototype.hasOwnProperty.call(j,'degradation')` → `false`；`JSON.stringify(j).includes('degradation')` → `false`。

降级状态只活在**生成器的运行期输出**里：
- `node scripts/generate-reference-graph.cjs --check` 的人类可读输出第二行：`降级状态 = complete（基准 = git 索引 blob，且与工作区是同一份事实）`；
- `--check --json` 的 `degradation.status`（生成器自述，写在其 `--help` 的 `降级词汇（与设计稿 §5.5 / §4.6 同词同义` 那一行）。

**本生成器只用两态**：`complete` 与 `unknown`——图的观测点就是「当前索引」，没有历史维度，所以 `partial` / `stale` 不会出现（`.github/workflows/ci.yml` 里写着 `complete 与 unknown（图的观测点就是「当前索引」，没有历史维度）` 的那一行原文照此声明）。`unknown` **不判绿**：`--check` 的通过条件是 `scripts/generate-reference-graph.cjs` 里的 `const checkOk = consistent && diagnostics.length === 0 && degradation.status === DEGRADATION_COMPLETE;` 一行。

**四态在别处**：完整四态出现在 `ledger/change-log/*.json` 的 `degradation.status`（§5.4）。跨产物引用降级词时不要张冠李戴。

### 2.5 `edges[]`（文件级；**条数是活值、不在此复述**——现值取数 `node -e "console.log(require('./ledger/references.json').edges.length)"`；**留痕：原标题写「498 条」，只作留痕，不是现值**）

键名集合实测：

```text
id, kind, from, to, cross_file, specifier, resolved, fragment, field, status, type_only
```

样本（**本批改引实测**，第一条）。**`id` 一栏按下面的 id 规则写成占位符**——它的字面量形如 `路径:行:列:kind`，正是 §0.0 拒绝的那种会漂移的写法，故这里只示范**格式**；具体位置仍在 `from` / `to` 的结构化字段里如实给出：

```json
{"id":"<from.file>:<line>:<column>:<kind>[:<field|specifier>]","kind":"ci-target","from":{"file":".github/workflows/ci.yml","line":25,"column":9},"to":{"file":"package.json","line":null,"column":null,"state":"indexed"},"cross_file":true,"specifier":"build","resolved":"package.json","fragment":null,"field":"scripts[\"build\"]","status":"resolved","type_only":false}
```

**8 种边 kind**（`meta.edge_kinds`；**下表条数只作留痕，不是现值**——现值取数 `node -e "console.log(require('./ledger/references.json').meta.edge_kinds)"`）：

| kind | 条数（**留痕，不是现值**） | 从哪来 |
| --- | --- | --- |
| `import` | 320 | 静态 `import … from` |
| `require` | 52 | `require(...)` |
| `package-field` | 51 | `package.json` 的 `main` / `types` / `exports` / `bin` / `files` 等字段 |
| `markdown-link` | 35 | Markdown 相对链接、图片、引用式定义 |
| `export-from` | 19 | `export … from` |
| `ci-target` | 17 | `.github/workflows/*.yml` 的 `run:` 里的 `node <路径>` / `npm run <script>` |
| `anchor` | 3 | 指向仓库内文件某个锚点 |
| `dynamic-import` | 1 | 动态 `import(...)` |

合计 320+52+51+35+19+17+3+1 = **498** ✓（**留痕：这行自洽算式算的是上表那组留痕值，不是现值**；本行的 `import` 那一栏今天已变，所以「合计 = `edges` 条数」这个**关系**仍成立、但**这个算式今天反证不了任何现值**——要比现值就把上表整表按取数命令重取再相加，或以 `edges.length` 为准）。

**边 id 规则**（`meta.edge_id_rule`）：`<from.file>:<line>:<column>:<kind>`，同一位置多条边时追加 `:<field|specifier>` 消歧，仍冲突即**生成失败**。**id 里不含解析结果**——目标被删 / 改名时 id 不变，`check-impact` 的棘轮正是靠「同一个引用还是同一个引用」把历史存量放过的（§4.7）。**注（本批）**：门禁的判定**不再用 `id`**（`id` 里含行号 ⇒ 纯平移会整片误报），改用不含位置的内容键，见 §4.7；`id` 仍是边在产物里的唯一标识与点名用的那个串。

`status` 分布是活值、不在此复述——现值取数 `node -e "console.log(require('./ledger/references.json').meta.edge_status)"`。**留痕（只作留痕，不是现值）**：本行原写 `{"resolved":311,"external":187}`，其中 `external` 一栏今天已变。**当前产物里没有 `dangling`**（`node scripts/generate-reference-graph.cjs --check` 未报任何悬空；`node scripts/check-impact.cjs` 报「新增悬空 0」）。

**坐标口径**（`meta.positions_basis`）：1 基行列，算在 **git 索引 blob 的 LF 归一化文本**上——**不用字节偏移**，因为 CRLF 检出会让偏移漂移。

### 2.6 `declarations[]`（**条数是活值、不在此复述**——现值取数 `node -e "console.log(require('./ledger/references.json').declarations.length)"`；**留痕：原标题写「402 条」，只作留痕，不是现值**）

键名集合实测：

```text
id, file, name, decl_kind, exported, scope, line, column, origin
```

样本（实测，第一条）：`{"id":"src/adapters/mcp.ts#NormifyMcpAdapter@6:11","file":"src/adapters/mcp.ts","name":"NormifyMcpAdapter","decl_kind":"interface","exported":false,"scope":null,"line":6,"column":11,"origin":"source"}`

- `id` 形如 `<file>#<name>@<line>:<col>`。
- `decl_kind` 分布（`meta.symbol_graph.declaration_kinds`）是活值、不在此复述——现值取数 `node -e "console.log(require('./ledger/references.json').meta.symbol_graph.declaration_kinds)"`。**留痕（只作留痕，不是现值）**：本行原写 `{"class":2,"function":206,"interface":114,"type":18,"variable":62}` = 402 ✓ —— **这个自洽算式今天反证它自己**：`function` 与 `variable` 两栏都已变，把它当现值会得到一个与 `declarations.length` 不符的和。
- **`scope` 恒为 `null`**：函数内声明（带作用域）属设计稿增量 4，**本产物不产**（`meta.omitted[0]`）。因此 `decl_kind` 里**没有 `parameter`**。
- `origin` 当前恒为 `source`。

### 2.7 `symbol_edges[]`（**条数是活值、不在此复述**——现值取数 `node -e "console.log(require('./ledger/references.json').symbol_edges.length)"`；**留痕：原标题写「1347 条」，只作留痕，不是现值**）

键名集合实测：

```text
id, kind, from, to, cross_file, specifier, resolved, status, reason, type_only
```

样本（**本批改引实测**，第一条，一条**仓库外**边的完整形状；`id` 同样按规则写成占位符，理由同上）：

```json
{"id":"<from.file>:<line>:<column>:<kind>","kind":"import","from":{"file":"src/adapters/mcp.ts","line":1,"column":10,"sym":null},"to":{"sym":null,"file":null,"line":null,"column":null,"state":"outside"},"cross_file":false,"specifier":"@modelcontextprotocol/sdk/server/index.js","resolved":null,"status":"external","reason":"bare-module-specifier","type_only":false}
```

**符号层比文件层多一种 kind**：`type-reference`。3 种（`meta.symbol_graph.edge_kinds`）；**下表条数只作留痕，不是现值**——现值取数 `node -e "console.log(require('./ledger/references.json').meta.symbol_graph.edge_kinds)"`：

| kind | 条数（**留痕，不是现值**） |
| --- | --- |
| `type-reference` | 805 |
| `import` | 472 |
| `export-from` | 70 |

合计 805+472+70 = **1347** ✓（**留痕：算的是上表那组留痕值**；`type-reference` 与 `import` 两栏今天都已变，这个算式今天反证不了现值——要比现值就整表重取再相加，或以 `symbol_edges.length` 为准）。

`status` 与 `reason` 分布都是活值、不在此复述——现值取数 `node -e "const g=require('./ledger/references.json').meta.symbol_graph;console.log(g.edge_status,g.unresolved_reasons)"`。**留痕（只作留痕，不是现值）**：本行原写 `status` = `{"external":134,"resolved":989,"unresolved":224}`、`reason` = `{"bare-module-specifier":126,"declaration-out-of-scope":9,"external-module-symbol":8,"symbol-not-found-in-program":215}` —— 两组里都有栏位今天已变。

**抛错级不变量**（违反 ⇒ 生成失败、不写盘；`.github/workflows/ci.yml` 里写着 `① 每条 `to.sym` 要么命中声明表、要么带非空 `reason`` 的那一段与本仓同款）：
1. 每条 `to.sym` 要么命中 `declarations` 里的真实节点 id、要么带**非空** `reason`——**无静默 null**（实测 `meta.symbol_graph.silent_null_edges` = 0）；
2. `declarations` / `symbol_edges` 按 **UTF-8 字节序**排序，不用 `localeCompare`；
3. Program 里只有扫描面内的 `.ts`（本仓 = `src/**/*.ts`）；`node_modules` / `examples/` / `lib/` 一律不进。**两个自证数都是活值、不在此复述**——现值取数 `node -e "const s=require('./ledger/references.json').meta.symbol_graph;console.log(s.program_source_files,s.program_outside_repo_files)"`；**留痕：本行原写 `program_source_files` = 28、`program_outside_repo_files` = 0**（**后者是结构性保证，恒为 0**；前者随 `src/**/*.ts` 的增删变化，**不是不变量**）。

其余实测：`cross_file` 是活值、不在此复述（现值取数 `node -e "console.log(require('./ledger/references.json').meta.symbol_graph.cross_file_edges)"`；**留痕：本行原写 756 条，已过期**）；Program 刻意 `noLib: true` + `types: []`，编译器选项见 `meta.symbol_graph.compiler_options`。

### 2.8 `type_only` 的判定口径（**两套，别混用**）

仓里有**两套互不相同**的 `type_only`，读产物时务必分清：

| 出现位置 | 判据 | 依据 |
| --- | --- | --- |
| `edges[].type_only` 与 `symbol_edges[].type_only`（**产物字段**） | **语法级**：该边所在语句**是不是纯类型语句**（`import type` / `export type … from`）。`require()` / `import()` 与「拿不到 TypeScript 时的正则回退」一律按运行时 | `node scripts/refs-query.cjs who-references <路径> --json` 的 `gaps[2]`，原文含 `该边所在语句是否为纯类型语句`（**本批改引实测**：改用引文锚，不再指行号） |
| `refs-query impact` 的 `buckets[].files[].type_only`（**查询期标注**） | **可达性**：在「目标 ∪ 全量无界反向闭包」内，只沿**运行时边**走，从这个文件**能否到达目标**；到不了 ⇒ 标「仅类型级影响」 | `scripts/refs-query.cjs --help` 的 `impact` 段与 `reasons[]` 第 3 条 |

**可达性口径的精确表述**（`refs-query.cjs --help` 原文照抄）：运行时边 = `import` / `export-from` / `require` / `dynamic-import` / `package-field` / `ci-target`，**以及符号级边**；`type_only=true` 的纯类型语句与 `markdown-link` / `anchor` 这类纯文字引用**不算**。走得到 ⇒ 不标；走不到 ⇒ 标注；**目标不是 `.ts` / `.tsx` ⇒ 「不可判」**——「不标」不等于「没有类型级影响」。

**闭包展开深度**：标注用的闭包**按图产物全深度展开，不受 `--depth` 截断影响**（`node scripts/refs-query.cjs impact <路径> --json` 的 `gaps[2]`，原文含 `标注用的闭包**按图产物全深度展开、不受 --depth 截断影响**`；**本批改引实测**：改用引文锚，不再指行号）。理由是硬的：展示用的闭包有深度上限，在截断集合里做可达性 BFS，会把「路径长于上限」的文件判成「没有运行时路径」——那是假话。

> **口径的内部张力（诚实记账）**：同一个词 `type_only` 在产物里是「这条边是不是纯类型语句」，在 `impact` 标注里是「这个文件到目标有没有运行时路径」。两者**不是同一个量**，一个文件可以同时在 `edges[]` 里带若干 `type_only=true` 的边、又被标为「非纯类型影响」。`impact` 的 `gaps[2]` 自己点破了这一点（**本批改引实测**原文开头：`type_only 是档内**正交标注**，不是第四档：判据是**可达性**`）。
> **引文留痕**：本节旧版引用的是 `who-references` 早先那份 `gaps[2]`（当时它抄的是 `impact` 的清单），原文末句为 `impact 的 type_only 档内标注不吃这一套`。提交 `9adf069` 把 `who-references` 的 `gaps[]` 改成只讲它自己（不再夹带 `impact` 的文字），**该句已不存在**；同义表述现由 `impact` 自己那份 `gaps[2]` 承担（即上面引的那一段），故改引它。

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

**入口**：`scripts/refs-query.cjs`（当时写作时该脚本 1,720 行；**行数不复述**，现值取数：`(Get-Content scripts/refs-query.cjs).Count`。**本批改引实测（留痕）**：另一条口径 = `files[].lines`（即索引 blob 的 `text.split('\n').length`），取数命令 `node -e "console.log(require('./ledger/references.json').files.find(f=>f.id==='scripts/refs-query.cjs').lines)"`；**旧值 1,384 已过期**，那是 `56ea956` 时的值，`e166e94`（1,384 → 1,687）与 `5e78029`（1,687 → 1,720）两批改动把它推到 1,720。字节数见 `files[].bytes`，可用 `git cat-file -s :scripts/refs-query.cjs` 复测）。**不在门禁链上**——查询结果再可疑也不拦提交（`CONTRIBUTING.md` 里写着「**不在 `npm run check` 链里**」的那一处）。

**三条子命令**（以 `node scripts/refs-query.cjs --help` 实测为准）：`who-references` / `impact` / `locals`。

**共同选项**：`--json`（机器可读）、`--root <目录>`（仓库根，默认当前目录；不是 git 仓库根则非零退出）、`--limit <n>`（人类可读输出里最多显示多少条**符号级**边，默认 40，0 = 全部）、`--depth <n>`（仅 `impact`：反向闭包深度上限，默认 8）、`--help`。

**退出码**（**本批改引实测**，逐条照 `node scripts/refs-query.cjs --help` 末尾原文）：`0` 成功 / `1` 口径守卫（`--self-check`）断言失败 / `2` 参数或根不合法 / `3` 读不到图（`locals` 另含：读不到目标文件 / 拿不到 typescript）/ `4` 输入不受支持（符号 id；`locals` 的非源码扩展名）/ `5` 目标不在图里。
**旧版此处漏了 `1`**——`--self-check` 是 `e166e94` 新加的子命令，它的失败码就是 `1`（与「判定不通过」同码）。实测：`node scripts/refs-query.cjs --self-check` → exit 0，末行 `✓ 口径一致：0 项失败`。

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

**本版同步实测**：上面是**计数部分的逐字摘要**（各行与本版实测逐字相同，**只作留痕，不是现值**；现值跑本节给出的取数命令）。实际输出在 `basis=` 行与「直接引用方：」之间**还有一段 `原因/缺口 reasons：` 清单**（= `--json` 的 `reasons[]` / `gaps[]`，共 4 条，内容见 §3.4）——摘要里略去了它，逐字全文请自己跑一遍。

**元字段**（`--json`，实测）：

```json
{"query":"who-references","kind":"file","target":"src/engine/types.ts","unsupported":false,"basis":"index","completeness":"partial",
 "counts":{"file_edges":25,"referrer_files":18,"symbol_edges":431,"runtime_refs":41,"type_refs":390}}
```

`--json` 顶层键实测 13 个：`query, kind, target, unsupported, basis, completeness, reasons, gaps, empty_referrers_reading, truncated, counts, direct_referrers, symbol_referrers`（**本版同步实测**：第 10 个 `truncated` 是 `06f4bca` 新加的；`who-references` 是单层查询、不吃 `--depth`，故它**恒为 `false`**）。

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

**本版同步实测（只作留痕，不是现值）**：上面各行数字与本版实测**逐项相同**（闭包 24 / 502 / 43 / 459，各深度 18 / 5 / 1，三档 24 / 0 / 0，环 1 个、自环 0、派生产物 3、门禁义务 1）；现值跑上面那条命令。同样地，实际输出在 `depth<=8…` 行之后**先有一段 `原因/缺口 reasons：` 清单**（7 条，= `--json` 的 `gaps[]`，§7.3 引了其中两条），摘要里略去了它。

**元字段**（`--json`，实测）：

```json
{"query":"impact","kind":"file","target":"src/engine/types.ts","unsupported":false,"basis":"index","completeness":"partial",
 "max_depth":8,"actual_depth":3,
 "counts":{"affected_files":24,"affected_edges":502,"file_layer_edges":43,"symbol_layer_edges":459,
           "derived_artifacts":3,"gate_obligations":1,"cycles":1,"cycle_files":3,"self_loops":0,
           "must_change_files":24,"needs_review_files":0,"record_files":0}}
```

`--json` 顶层键实测 **21** 个：`query, kind, target, unsupported, basis, completeness, reasons, gaps, empty_referrers_reading, max_depth, actual_depth, truncated, counts, by_depth, buckets, closure, paths, derived_artifacts, gate_obligations, cycles, self_loops`。**本版同步改正**：旧版写「19 个」、实际列了 20 个键；`06f4bca` 又加了 `truncated`（恒在）与 `truncated_reason`（**只在被截断时出现**）——故被截断时是 22 个键（实测 `impact src/engine/types.ts --depth 1 --json` → 22 个，多出 `truncated_reason="depth-limit"`）

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

### 3.4 `completeness` 只有 `partial` / `stale` 两态（**实测结论，不是异常**）

`who-references` 与 `impact` 的 `completeness` **实测只取 `partial` / `stale` 两值**（`--json` 的 `completeness` 字段；`diverged` 时为 `stale`；错误路径为 `unknown`）。⇒ **`complete` 取不到；`stale` 可达**（`e166e94` 起 `--self-check` 之外没有别的出口，判据见 §7.6）。

源码依据：`scripts/refs-query.cjs` 里**两处**都是 `const completeness = diverged ? 'stale' : 'partial';`——**没有第三条分支**（**本批改引实测**：该引文在全文出现 2 次，两处都长这样）。⇒
- `'complete'` 这两个查询**取不到**；`emptyReading` 里那句 `空引用方列表 = 没人引用它（completeness=complete，可以这样读）。`（`scripts/refs-query.cjs`；**本批改引实测**）是**死分支**；
- 「`completeness === 'complete'` 与 `gaps.length > 0` 不得同时成立」这条抛错级不变量（`scripts/refs-query.cjs` 里写着 `抛错级不变量：completeness === 'complete' 与 gaps.length > 0 不得同时成立` 的那一处；**本批改引实测**）对这两条查询**永不触发**；
- 因此 `empty_referrers_reading` 恒为「空引用方列表 ≠ 没人引用它：…」。**空结果永远不能读成「没人引用」**，这不是措辞保守，是当前实现的确定行为。

**历史瑕疵（已修，`9adf069`）**：`who-references` 的 `gaps[]` 曾经是**照抄 `impact` 的缺口清单**——旧版 `gaps[3]` 里含 `impact 尚未做 informational 与截断标注` 这类**只属于 `impact` 的描述**，读 `who-references` 的人会被带偏。**本批改引实测现状**：`who-references` 的 `gaps[]` 现为 4 条（实测命令 `node scripts/refs-query.cjs who-references src/engine/types.ts --json` → `gaps.length` = 4），逐条只讲它自己（文件级/符号级计数口径、单层不推进、未实现的其它查询），`impact` 的口径留在 `impact` 自己的 `gaps[]`（同一条命令把子命令换成 `impact` → `gaps.length` = 7）与 `--help` 里。

### 3.5 错误路径（实测退出码）

| 命令 | 退出码 | stderr 原文 |
| --- | --- | --- |
| `node scripts/refs-query.cjs who-references docs/NOPE.md` | `5` | `目标不在图里：docs/NOPE.md（不在 files[] 的 1416 个节点中）` |
| `node scripts/refs-query.cjs who-references "src/engine/types.ts#Module@140:18"` | `4` | `本版未实现符号 id 输入：…（只支持文件路径；符号级信息只在输出里的 symbol_edges[] 出现）` |
| `node scripts/refs-query.cjs locals README.md` | `4` | `locals 只支持源码扩展名（.ts .tsx .mts .cts .js .jsx .mjs .cjs）：README.md` |
| `node scripts/refs-query.cjs bogus x` | `2` | `未实现的查询：bogus（本版只有 who-references、impact、locals）` |
| 读不到图产物（不存在 / 不是合法 JSON / 读不动 / 路径是目录 等） | `3` | `读不到图产物 <rel>：既不在 git 索引，也不在工作区（<绝对路径>）` / `图产物不是合法 JSON（git 索引版 <rel>）：…` / `图产物存在但读不出来（工作区 <绝对路径>，EISDIR）：…` |

**退出码 `3` 那一行（本批补）的左栏是「情形」而不是某一条命令** —— 「读不到图产物」是一族（不存在 / 不是合法 JSON / 读不动 / 路径是目录），三种失败步骤**共用同一个出口**（`node scripts/refs-query.cjs --help` 末行自述：`3 读不到图`），所以没有一条「在干净仓库里随手可跑」的命令能复现它。**本批实测**（`%TEMP%` 自建夹具仓库，三条各自 **exit 3**）：索引里存在但被截断的 JSON、索引与工作区都没有该产物、同名目录顶住 —— stderr 原文即上表第三栏那三种形状。

**注意第一行的节点数是「活数字」，不是常量**：本文档**加入之前**节点数是 1415（§1.2 有记账），本版同步实测时是 1416（上表第一行那条消息里的 1416 就是那时的值，**只作留痕，不是现值**），所以**旧输出里看到的数字未必是现值**。这类「嵌在人类可读消息里的活数字」随仓库增长自动更新（它不是写死的常量，`files[]` 少一个/多一个它就跟著变）——报错消息里的数字要按当下重测（现值取数：`node scripts/refs-query.cjs who-references docs/NOPE.md`）。**本版同步实测**：四条命令的退出码依次为 `5` / `4` / `4` / `2`，与上表逐条一致；只有第一行的节点数由 1415 变成 1416，故照实改写。（**本批补记**：上表新增了退出码 `3` 那一行，那句「四条命令」指的是其余四行；新增行的实测见上一段。）

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

用 `&&` 串联 ⇒ **任一环非 0，其后所有环都不执行**。这个顺序与 `CONTRIBUTING.md` 里以 `npm run check` 按顺序跑：` 开头、逐个 `→` 串到 `npm run check:impact` 的那一行**逐字一致**（**本批改引实测**核对通过）。

| # | 环 | 实际命令 | 职责 | 失败意味着什么 |
| --- | --- | --- | --- | --- |
| 1 | `typecheck` | `tsc -p tsconfig.json --noEmit` | 类型检查 | `src/**/*.ts` 有类型错误 |
| 2 | `build` | `tsc -p tsconfig.json` | 产出 `lib/` | 编译失败；**这一步会改工作区 `lib/`** |
| 3 | `test` | 14 个 e2e 脚本串联 | 端到端回归 | 有行为回归（含本套东西的 4 个 e2e：`reference-graph` / `impact-gate` / `change-log` / `file-ledger-ratchet`） |
| 4 | `ci-contract-check.cjs` | `node ci-contract-check.cjs` | 工具目录契约：名字 provider-safe、无重名、`parameters.type === 'object'`、有 `execute`、必填工具齐全 | 工具表结构或必填工具缺了 |
| 5 | `check:refs` | `node scripts/check-references.cjs` | 引用完整性（9 类检查，§4.3） | 悬空路径 / import 指向不存在的文件 / 引用了未纳入索引的路径（或读不到索引内文件 ⇒ 直接红） |
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
| 11 `check:graph` | 降级状态 `unknown`（基准不可用）**不判绿**；`graph-index-drift`（索引里的图与工作区里的图不是同一份事实）直接红；写盘前另有一道：工作区那份图若是未知 / 更高版本，**拒绝覆盖**（旧生成器不得静默降级新结构） | `scripts/generate-reference-graph.cjs` 的三处：`const checkOk = consistent && diagnostics.length === 0 && degradation.status === DEGRADATION_COMPLETE;`、注释 `写盘前的 fail-closed：工作区那份图若是**未知 / 更高**版本，拒绝覆盖`、`--help` 里的 `降级词汇（与设计稿 §5.5 / §4.6 同词同义`（**本批改引实测**） |
| 12 `check:changes` | `unknown`（基准不可用 / 结构不合规 / 重算不一致）**不判绿**，直接红 | `node scripts/generate-change-log.cjs --help` |
| 13 `check:impact` | 两个诊断码一律红线：`impact-baseline-unavailable`（基线不可得）、`impact-current-graph-unavailable`（当前图不可得）；另有 `impact-schema-version-mismatch`、`impact-graph-malformed`。**拿不到基线 / 图就不判绿** | `node scripts/check-impact.cjs --help` |
| 6 `check:docs` | 「挑到了要编译的块却跑不了 tsc」⇒ 退出码 1（宁可红也不要假绿）；取不到运行时工具数量 ⇒ **error**（原为 warning；已升级） | `node scripts/check-doc-snippets.cjs --help` |

**注意第 2 环 `build` 是链条上唯一的写操作**：它改工作区 `lib/`。因此「本地 `npm run check` 全绿」与「工作区干净」是两件事。

### 4.3 `check:refs` 的 9 类检查（**本批改引实测**：旧版写「4 类」已过期，实为 `--help` 与 `--json` 的 `summary.checks[]` 里的 9 项）

1. **悬空路径引用**——Markdown 链接/图片/引用式定义、`package.json` 的 `main`/`types`/`exports`/`bin`/`files`、`package.json` 各 script 里的 `node <路径>`、CI `run:` 里的 `node <路径>` 与 `npm run <script>`；**大小写不一致的路径按 error**（Windows 能过、Linux CI 会挂）。
2. **相对 import/export 说明符指向根本不存在的文件**——优先用仓库自带 typescript 的编译器 API 解析；拿不到 typescript 时降级为正则**并在报告里标注**。
3. **引用了未纳入 git 索引的路径**（磁盘上有、索引里没有）——以 `git ls-files` 为权威，**不是磁盘存在性**。被 `.gitignore` 覆盖的目标跳过不报，但**逐条列出**（文件:行 → 目标 → 命中的忽略规则）。
4. **指向 git 历史中已删除的文件**——用 `git log --diff-filter=D --name-only` 取清单（图的 `meta.history_basis` 实测 = 37 条历史删除路径），在工作区文本里搜完整路径（**error**）与 basename（**warning** 次级线索，机制与噪声见 §7.9）。
5. **版本字面量漂移**——`package.json > version` 必须等于「需要同步的字面量清单」里的每个值（MCP server version、`package-lock.json` 两处、`tests/mcp-e2e.mjs` 的断言、README / README_EN 首段、`docs/SPEC.zh-CN.md`「当前实现」）。另有 `SCRIPT_VERSION_CITATIONS`：文档 / CI 注释里写的**脚本自身版本**（`scripts/x.cjs v1.2.3`）必须等于该脚本内的 `TOOL_VERSION`（比较基准**不是** `package.json`）。注释行整体排除。
6. **本地安装包文件名**——文档里的 `promptmanager-code-normify-<版本>.tgz` 必须等于本次 `npm pack` 的产物名（error）。`CHANGELOG.md` 与 `docs/RELEASE-*.md` 属历史文体，不做断言。
7. **测试脚本清单一致性**——script 里 `node tests/xxx.mjs` 必须真实存在（error）；`tests/` 下存在却没有任何 script 引用的测试文件报 warning（通常是漏挂）。
8. **锚点未命中目标文件的真实标题**（Markdown 相对链接的 `#fragment`）——标题 id 按 GitHub 规则算（小写、去标点与 emoji、空格转 `-`、保留 CJK 与 `_`，同名标题按出现顺序追加 `-1`/`-2`；代码围栏内的 `#` 行不算标题），显式 HTML 锚点 `<a id="x">` / `<a name="x">` 同样算命中；无法判定或确属历史文体的走 `DEAD_ANCHOR_ALLOWLIST` 显式豁免，未命中任何锚点的条目报 warning。
9. **门禁自身不可用**——git 索引内的文本文件读失败（`EISDIR` / `EPERM` / `ENOENT` / 其它 IO 错）→ error；编码不可信（UTF-16 BOM、高比例 NUL、非法 UTF-8）→ error，**绝不按 utf8 静默硬解码**；拿不到 git 跟踪清单 / 历史删除清单（浅克隆除外，那种是 warning）→ error。

**这 9 项的名称与顺序以 `node scripts/check-references.cjs --json` 的 `summary.checks[]` 为准**（**本批改引实测**：`["dangling-reference","dangling-module-specifier","untracked-reference","deleted-reference","version-drift","tarball-version-drift","test-inventory","dead-anchor","guard-unavailable"]`，恰好 9 项）。

**现值取数**：`node scripts/check-references.cjs` ⇒ `✔ 0 error —— 门禁通过`（**本批改引实测**，退出码 0）。**warning 总数刻意不写死**：它包含本文档自身的贡献，而本文档每写一次它就会变（§7.9 讲的机制）；**旧值 700 / 714 都已过期**，留痕如下——差额全部来自两处、**都不是真实残留**：`9adf069` 给 `scripts/refs-query.cjs` 加的两行注释（提到 `src/index.ts`、`src/engine/types.ts`，命中同一条 basename 规则）先带来 `700 → 702`；**`56ea956`**（`9adf069` 的下一个提交）给本文档补写「已修 / 留痕」与 §7.11 时，本文档自身由 51 条涨到 **63** 条，合计 `702 → 714`（**旧说此处为「同一批」，已订正**：那条文档补写不在 `9adf069` 里）。**门禁只拦 error。**

**全部 warning 是同一个 type**（`--json` 的 `violations[]` 实测：`deleted-file-basename-mention` 是唯一取值，`summary.errors` = 0；**本批改引实测**）。其中**本文档贡献了一部分**（`56ea956` 那批实测是 63 条；**旧标 `9adf069` 已订正**）——原因见 §7.9，不是本文档写错了路径。

### 4.4 `check:docs` 的扫描面与两条「新增文档会被拦」的规则

**扫描面**（`node scripts/check-doc-snippets.cjs` 实测回显）：`README.md` · `README_EN.md` · `docs/**` 下**所有 `.md`** · `skills/**` · `docs/RELEASE-*.md`。

**本文件 `docs/HANDOFF-code-graph.zh-CN.md` 自动进入这道门禁的扫描面**（它是 `docs/` 下的 `.md`）。**围栏块数与参与编译数不在此复述**（它们随扫描面内容变）——现值取数 `node scripts/check-doc-snippets.cjs`（回显 `围栏代码块: N · 参与编译: M …`）。**留痕（只作留痕，不是现值）**：本批改引实测为 `围栏代码块: 80 · 参与编译: 3 … ✔ 0 error / 0 warning`（**旧值 78 / 2 已过期**——`7c6d06f` 的提交信息「check-doc-snippets：把 CONTRIBUTING.md 纳入扫描面（围栏 78→80 · 参与编译 2→3）」正是那次变动；更早的旧版还写过 46，那之后本仓新增了 `docs/SPEC.zh-CN.md` 等文档。该数**不是本文档自己的块数**，是整条扫描面的合计）。

两条会拦住新文档的规则（源码依据 `scripts/check-doc-snippets.cjs` 里的 `const CODE_LANGS = new Set(['js', 'javascript', 'mjs', 'cjs', 'ts', 'typescript', 'tsx', 'jsx']);` 与 `const HISTORICAL_DOC = /^docs\/RELEASE-[^/]*\.md$/;` 两行；**本批改引实测**）：
- `CODE_LANGS = {js, javascript, mjs, cjs, ts, typescript, tsx, jsx}`——**这类语言标记的块里出现包 `import`/`require` 却没被编译 ⇒ error**。因此新文档里的示例**不要**用 `ts` / `js` 标记去写包导入（用 `powershell` / `text` / `json` 之类标记即可，它们不是 code lang，直接跳过）。
- 工具数量断言：`(\d+)\s*个工具` / `(\d+)\s*tools` 之类必须等于运行时数量。`docs/RELEASE-*.md` 是**历史文体**，豁免数字断言（`HISTORICAL_DOC` 正则）——**本文件不匹配该正则**，因此本文档里**没有**写任何「N 个工具」形式的断言。

### 4.5 我这次逐环跑到的退出码（**实测**）

> **下表是那次运行的记录（只作留痕，不是现值）**：表里出现的节点 / 边 / 扫描面 / 台账宇宙 / 记录条数等规模数字，都会随每次重算与每次落盘变化；现值按各行给出的命令现取（本文档其余各节同理——凡标「本批 / 本版 / 本批改引」的都是那一批的实测值，不是现值断言）。

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| `node scripts/generate-reference-graph.cjs --check` | `0` | `与重新生成的结果一致（比较基准 = git 索引 blob）` / `降级状态 = complete` / `节点 1416 · 边 498 · 扫描面 80 个文件 · universe 1416 条` / `符号级 = 声明 402 · 符号边 1347（schema_version 2）` |
| `node scripts/check-file-ledger.cjs` | `0` | `✔ 0 error / 0 warning —— 门禁通过`；`台账宇宙: git ls-files 1416 条`；`四态归属: owned 0 · exempt 1387 · accounted 29 · unowned 0`；`accounted 棘轮: 基线 = HEAD 版台账（<当前 HEAD 短哈希> 共 29 条）· 相对基线新增 0 条`（**本批改引实测**：四态计数与旧版逐项相同；棘轮基线里的**提交号随 HEAD 前移**，实测 `790e626` → `9adf069` → `5e78029` 三处，条数恒为 29——故此处写成占位符，不写死） |
| `node scripts/generate-file-ledger.cjs --check` | `1` → 修后 `0` | 修前：`台账 tracked_total=1415 · 重算 tracked_total=1416`（见 §1.2）；跑 `node scripts/generate-file-ledger.cjs` + `git add` 后转绿 |
| `node scripts/check-impact.cjs` | `0` | `basis: "HEAD^..HEAD"`；`结论：通过（新增悬空 0，新增未解析 0）` |
| `node scripts/check-references.cjs` | `0` | `✔ 0 error —— 门禁通过`（**本批改引实测**；**旧值 700 / 714 都已过期**）——warning 总数随本文档内容变，机制与取数命令见 §7.9 |
| `node scripts/check-doc-snippets.cjs` | `0` | `✔ 0 error / 0 warning —— 门禁通过` |
| `node scripts/generate-change-log.cjs --check` | `0` | `2 条记录全部通过（Schema 校验 + 重算逐字段复核）`；`降级状态分布 = {"complete":2}`（**那次运行的当时值，只作留痕**；条数刻意不写死，现值取数见 §5.1） |

### 4.6 没跑的三条（写清跑法与预期代价）

| 没跑的 | 怎么跑 | 为什么这次没跑 |
| --- | --- | --- |
| `npm run check` | 见 §4.1 那行 | 全链含 `npm test` 与 `check:examples`，后者单条示例实测 5–17 秒，整链是分钟量级 |
| `npm test` | `node tests/engine-e2e.mjs && … && node tests/change-log-e2e.mjs`（14 个，逐字见 `package.json`） | 同上 |
| `tests/impact-gate-e2e.mjs` | `node tests/impact-gate-e2e.mjs` 或 `npm run test:impact` | 同上。它是 `check:impact` 的回归用例（609 行，`files[].lines` 口径） |

**结论**：本文档对链上第 5 / 6 / 9 / 10 / 11 / 12 / 13 环的结论是**实测**（第 9 环 = `npm run check:ledger:gen`，即 `node scripts/generate-file-ledger.cjs --check`，§4.5 实测：修前 `1` → 修后 `0`）；对第 1 / 2 / 3 / 4 / 7 / 8 环的结论是**从其 `--help` 与 `package.json` 读来的口径**，**未在本次运行中执行过** ⇒ 冒烟状态**未验证**。

### 4.7 棘轮语义（存量容忍、新增报红）

**`check:impact` 是纯棘轮**：只拦本次改动**新引入**的破坏，历史存量一律不追溯。

```text
新增悬空   = { 当前 status === 'dangling' 的边 } − { 基线中同为 dangling 的边 }      ← 文件被删 / 改名
新增未解析 = { 当前 to.sym === null 的符号级边 } − { 基线中同样未解析的符号级边 }   ← 符号被删（文件还在）
```

**边的身份 = 内容键，不是 `id`（本批修订）**：`from.file` + `kind` + `specifier` + `field` + `fragment`（= 「这处引用是什么」，**不含行号 / 列号、也不含包含它的那个声明**）；同一内容键内先按 `id` 精确配对，再按「当前独有 − 基线独有」的**条数差**判新增。⇒ ① 插几行导致的**行号平移不算新增**；② 声明**改名**也不算新增；③ 真新引入一处（同键条数 +1）照报。**旧口径留痕**：v1.0.0 用边 `id` 当身份，而 `id` 里含行号 ⇒ 纯平移整片误报（实测 `src/service.ts` 7 条未解析边整体平移被判成 7 条新增；全历史扫描 84 个提交里只有这一个提交的判定因此改变，其余 65 个逐字节相同、0 个报得更多）。**不得为了消掉平移而放宽判定**：真新增一处仍然报（同键条数 +1），这条由 `tests/impact-gate-e2e.mjs` 钉住。内容键同样**不含解析结果**，因此基线取的是「基线中**同样命中**」的边（同为 `dangling` / 同为未解析），不是基线全量边——否则 `resolved → dangling` 的同键边会被误判成「基线里已存在」而**漏报**。**已知边界**：同键内**同时**「修好一处 + 坏掉另一处」净差为 0 ⇒ 不报；同键多出 N 条时点名只保证**条数正确**（给出同键内按行列序靠后的 N 条）——未解析边不记录被引用的名字（`to.sym` 为 `null`），无位置身份下这两件事在产物里不可区分。

**「未解析」的精确口径**（用图自己的词表，不另造）：`to.sym === null` 的符号级边，**但排除** `status === 'external'` 与 `to.state === 'outside'`——仓库外的裸模块说明符（`node:fs`、`ajv`…）与库类型（Program 刻意 `noLib` + `types: []`）本来就「仓库外、无仓库内符号」，属**已按设计处置**；算进来会让门禁在健康仓库上**恒红**。**保留** `status === 'unresolved'`（`symbol-not-found-in-program` / `declaration-out-of-scope`）——那才是该报的。

**两种基准**（`--json` 的 `basis` 字段自证）：

| 模式 | `basis` | 基线 | 当前 |
| --- | --- | --- | --- |
| 默认（无开关） | `HEAD^..HEAD` | `git show HEAD^:ledger/references.json` | `git show HEAD:ledger/references.json` |
| `--staged` | `HEAD..index` | `git show HEAD:ledger/references.json` | `git show :ledger/references.json`（索引 blob） |

**刻意不比 HEAD vs 索引**：新克隆或 CI 检出后索引 == HEAD，那样比会**恒绿**，恰好放过它唯一要抓的那种提交。

**不提供豁免（v1 有意）**：没有 `--allow-*` / 基线冻结 / 注释抑制。本仓「残留零容忍」——正确做法永远是改掉引用（删掉引用、或补回目标），不是给门禁开白名单。

**同一条棘轮也在台账侧**：`check:ledger` 的 `accounted` 清单**只减不增**（实测输出 `accounted 棘轮: 基线 = HEAD 版台账（<当前 HEAD 短哈希> 共 29 条）· 相对基线新增 0 条 · 已减 0 条——只允许集合缩小`；**本批改引实测**：基线提交号随 HEAD 前移 `790e626` → `9adf069` → `5e78029`，条数与「新增 0 / 已减 0」始终不变，故写成占位符）。

---

## 5. 改动记录（`ledger/change-log/*.json`）

**一条记录 = 引用图两份快照之差**（文件/边的新增与消失 + 受影响的引用方 + 处理状态）。**观测点 = 每次提交，不是每次保存**——「每次保存」需要常驻文件监听，明确不在范围内（用户拍板，`ledger/change-log/README.md` 里标题为 `## 观测点 = 每次提交（**不是**每次保存）` 的那一节）。

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

**条数不在此复述**（记录**只增不改**，写死必然过期）——现值取数：`node scripts/generate-change-log.cjs --check`（回显「N 条记录全部通过」），或**按 `kind -eq 'commit'` 过滤后**数一遍 `ledger/change-log/*.json`：`Get-ChildItem ledger/change-log/*.json | ForEach-Object { Get-Content -LiteralPath $_.FullName -Raw | ConvertFrom-Json } | Where-Object { $_.kind -eq 'commit' } | Measure-Object | Select-Object -ExpandProperty Count`（**不能不过滤直接数目录**：`ledger/change-log/schema.json` 也躺在同一目录里、也会被 `*.json` 命中，直接数会**多算 1 条**）。**留痕（时点 = 本批开工 `df70cb3`，只作留痕、不是现值）**：`--check` 回显 **78 条**、过滤计数 **78**、不过滤 **79**（差的那条正是没有 `kind` 字段的 `schema.json`）；本批补录 `df70cb3` 自己那一条之后，三个数分别变成 **79 / 79 / 80**。**留痕（旧写法，已作废）**：本行历史上写「或直接数一遍 `ledger/change-log/*.json`」——该法把 `schema.json` 算成记录，比真记录数多 1，与 `CONTRIBUTING.md`、`ledger/change-log/README.md` 里「不能不过滤直接数目录」的明文警告冲突。**留痕（只作留痕，不是现值）**：本文档写作时（增量 2 落地）已落盘 **2 条**记录。

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
| `stale` | 记录描述的**那个状态已不存在**（**判据见右栏：只比路径清单摘要与 HEAD**；旧写法概括成"HEAD 移动 / 索引变化 / 提交被重写"，比判据宽 —— **同 HEAD、同路径、只改文件内容不判 `stale`**，见 §7.12） | `--check` 对 `kind: "index"` 的记录比对当前索引的 `universe_hash`（= 排序后的已跟踪**路径清单**摘要，**不含内容身份**）与 HEAD | 「记录有错」——**`stale ≠ 记录有错`**，它只是描述不了今天 |

> `kind: "commit"` 的记录**结构上永远不会 `stale`**：提交是内容寻址的不可变基准。`stale` 属于 `kind: "index"` 以及将来的 `cas-write`。
> **`unknown` 与 `stale` 都不判绿**，`--check` 直接红。

### 5.6 已落盘的两条记录（实测内容）

| 记录 | 描述的一次提交 | 实测 `counts` |
| --- | --- | --- |
| `20261005T183940Z-ed404e5.json` | 一次**真实的删除提交**（删掉一个仍被 README 链接的文件） | `{"files_added":0,"files_removed":0,"files_state_changed":1,"edges_added":0,"edges_removed":0,"edges_status_changed":1,"affected_referrers":1,"needs_change":1}` |
| `20261005T183954Z-10766d1.json` | 台账语义校准 v1→v2 | `{"files_added":2,"files_removed":0,"files_state_changed":0,"edges_added":24,"edges_removed":20,"edges_status_changed":0,"affected_referrers":44,"needs_change":0}`；`files.added` 实测 = `["ledger/exempt.gitignore","scripts/file-ledger-core.cjs"]` |

两条记录的 `degradation` 实测均为 `{"status":"complete","reasons":[]}`（`--check` 回显 `降级状态分布 = {"complete":2}`）。两条是**真实历史**的记录（`--commit <rev>` 现算），不是手写的示例。

**关于这两条记录的三个时点事实**（均实测）：
1. 它们描述的提交（`ed404e5`、`10766d1`）**不在当前 `HEAD` 的 4 条最近提交里**（`git log --oneline -4` 实测为 `9adf069` / `06f4bca` / `b91fe50` / `b4fddb3`——**本版同步实测**；旧版此处记的是当时的 `790e626` / `8c30684` / `d32f5fc` / `f31b1a9`，两个列表里都没有那两条记录描述的提交，结论不变）。这是正常的：记录**只增不改**，历史记录留在目录里。
2. 两条记录的**规模各不相同，且都远小于今天**：`ed404e5` 的 `from_snapshot` = `{files:127, edges:227}` / `to_snapshot` = `{files:127, edges:227}`；`10766d1` 的 `from_snapshot` = `{files:1400, edges:440, tracked_total:1400}` / `to_snapshot` = `{files:1402, edges:444, tracked_total:1402}`（`node -e` 读两条记录实测）。本批改引时图的值是 **1416 / 498**（**只作留痕，不是现值**；现值跑 §0.2 那条取数命令）。**不要拿记录里的规模当现值**。
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

### 7.2 `via` 未去重（**已修，`9adf069`**）

> **状态**：本条**已修**。修法见 `scripts/refs-query.cjs` 里那段以 `因此这里按字符串去重（保序，BFS 的确定性顺序不变）。**只去重展示**：edges 计数` 为结尾的注释（**本批改引实测**）；**边数**改由 `buckets[].files[].via_edges`（数值）与 `kinds[]` 承担，`by_depth[].files[].via[]` 只留去重后的位置串。底下保留「历史上曾如此」的实测痕迹。

`via[]` 的元素是字符串 `"<file>:<line>:<column>"`（去重前）**不含 kind / layer**——这正是当初必须去重的原因。

**历史实测（旧版，未去重时）**：`impact src/engine/types.ts` 的 `src/index.ts` 那条，`via.length = 29`，按字符串去重后**只剩 1 个**——那 29 条边全部落在同一位置串上（即 `src/index.ts` 里 `export * from './engine/types.js';` 那句的 `4:15`）。人类可读输出里那一行就是**同一个 token 重复 29 次**：

```text
src/index.ts  <- <位置串>  <位置串>  <位置串> …（共 29 次；三处 token 逐字相同）
```

（**本批改引**：位置串的字面量形如 `<file>:<line>:<column>`，正是 §0.0 拒绝的那种会漂移的写法，故此处用占位符；要看现值自己跑一次。）

**为什么**：`src/index.ts` 里 `export * from './engine/types.js';` 这一句（**本批改引实测**：该引文可在 `src/index.ts` 中 `grep` 到）一次性把这些名字全部再导出，于是那些边的 `from` 位置**完全相同**。`via` 丢掉了 kind/layer，它们就变得**不可区分**。

**本批改引实测（修后，本批实测——**只作留痕，不是现值**）**：`node scripts/refs-query.cjs impact src/engine/types.ts --json` 里 `src/index.ts` 的 `by_depth[].files[].via` **长度为 1**（已去重）、`buckets[].files[].via_edges` = **29**、`kinds` = `["export-from"]`；**`via.length > 去重后长度` 的文件数 = 0**（24 个闭包文件全查过）。

**边的成分要更正（旧值「29 条符号级边」已过期）**：这 29 条实为 **1 条文件级边 + 28 条符号级边**（取数：`node -e` 直读产物，按 `from.file==='src/index.ts' && to.file==='src/engine/types.ts'` 过滤 ⇒ `edges[]` 命中 **1**、`symbol_edges[]` 命中 **28**，两者 `kind` 都是 `export-from`）。文件级那条正是 `export *` 语句本身，符号级那 28 条是它一次带出的名字。⇒ 展示侧不再有噪音，**边数仍是 29 这个事实**（`via_edges`），两者不再混为一谈。

**灰在哪（修后仍要读对）**：`via_edges` 看着像「有多少个不同的引用点把我牵进来」，但在再导出场景下它**统计的是边**、不是不同位置——`src/index.ts` 就是 1 个位置 / 29 条边（1 文件级 + 28 符号级）。要「不同引用点」的个数，数去重后的 `via[]`。

### 7.3 结果截断：**标注了哪些、没标注哪些**（一条已修，`06f4bca`）

| 位置 | 是否截断 | 是否标注 |
| --- | --- | --- |
| `who-references` 的**符号级边**人类可读列表 | 是（`--limit`，默认 40） | **标注了**：`…（人类可读输出只显示前 40 条；--json 或 --limit 0 可看全部 431 条）`（`scripts/refs-query.cjs` 里拼这句的模板串 —— ``  …（人类可读输出只显示前 ${symbolRowsForDisplay.length} 条；--json 或 --limit 0 可看全部 ${c.symbol_edges} 条） ``；**本批改引实测**） |
| `who-references` 的**文件级**引用方列表 | 否（25 条全列） | —— |
| `impact` 的人类可读输出 | **`renderImpactHuman` 里没有 `.slice()`**；全脚本的显示切片只有两处——`symbol_referrers` 的 `--limit`（`const shown = opts.limit === 0 ? report.symbol_referrers : report.symbol_referrers.slice(0, opts.limit);`）与「你是不是想找」的近邻提示取前 5 条（`const near = [...known].filter((f) => f.endsWith(norm)).sort(byteCompare).slice(0, 5);`）（**本批改引实测**：`grep -n "\.slice(" scripts/refs-query.cjs` 逐条看过，显示切片确实只有这两处） | —— |
| `impact` 的**闭包**（`--depth` 截断） | 是 | **已修（`06f4bca`）：顶层 `truncated` + `truncated_reason="depth-limit"`，人类可读输出另打一行 `⚠`**（见下） |

**历史上曾如此（已修）**：`--depth` 截断闭包时，输出里一度**只有** `depth<=N（实际 M 层）` 与 `counts.affected_files` 两个量：

- `impact ... --depth 1` → `depth<=1（实际 1 层）`，`counts.affected_files = 18`（**被截断**）
- `impact ... --depth 3` → `depth<=3（实际 3 层）`，`counts.affected_files = 24`（**自然结束**）

这两种情况**当时在输出形式上不可区分**——`actual_depth === max_depth` 时无法判断「闭包到此为止」还是「到达上限被砍」。**修法（`06f4bca`）**：判据照口径取「处理完最大深度层之后**仍有未被收进结果集的引用者**」，而**不是** `actual_depth === max_depth`（后者分不清「恰好走到第 N 层且再无引用者」与「被砍掉了」——`impact scripts/refs-query.cjs --depth 2` 实测 `actual_depth = max_depth = 2` 但 `truncated=false` 就是这条判据的活样本）。

**本版同步实测（修后，本批实测——**只作留痕，不是现值**）**：

| 命令 | `actual_depth` / `max_depth` | `truncated` | `truncated_reason` | 人类可读 |
| --- | --- | --- | --- | --- |
| `impact src/engine/types.ts`（默认 `--depth 8`） | 3 / 8 | `false` | 字段不存在 | `闭包深度上限 --depth 8：本次**没有截断**…` |
| `impact src/engine/types.ts --depth 3` | 3 / 3 | `false` | 字段不存在 | 同上（两态各自的说法写进 `gaps[]`） |
| `impact src/engine/types.ts --depth 1` | 1 / 1 | **`true`** | `"depth-limit"` | `⚠ 结果被 --depth 1 截断，仍有未访问的引用者（truncated=true，truncated_reason=depth-limit）：下面的 closure / counts / buckets 都不完整…`（`scripts/refs-query.cjs` 里那句以 `⚠ 结果被 --depth ${report.max_depth} 截断，仍有未访问的引用者` 开头的模板串；**本批改引实测**） |

⇒ **现在不需要「再跑一次更大 `--depth` 比较 `counts.affected_files`」**：读 `truncated`（`--json`）或那一行 `⚠`（人类可读）即可。`--help` 也写明了这两个字段与判据（`node scripts/refs-query.cjs --help` 里以 `闭包受 --depth 限制：被截断时顶层 truncated=true 且带 truncated_reason="depth-limit"` 开头的那一段）。

> **旧版此处记的「文档说法与实测不符的一处」也已修（`06f4bca`）**：当时 `impact` 的 `reasons[]` 第 4 条原文写 `未做 informational 与截断标注`，其中「截断标注」半句与当时的实测不符（`who-references` 的符号级边列表本来就有截断标注）。**本批改引实测**该条现为 `impact` 的 `gaps[3]`：`未做 informational（三档分类、type_only 标注与截断标注已做，见 buckets[] 与顶层 truncated / truncated_reason）。`——两处截断标注都已如实记账。

### 7.4 `meta.omitted[]` 是**活字段**（§2.9 已逐条列表）

`ledger/references.json` 的 `meta.omitted` 有 8 条，其中第 **6**（传递闭包查询）/ **7**（查询接口）/ **8**（变更影响门禁）**与现状不符**——三者都已落地。

**性质**：`omitted` 记录的是**写产物那一刻**的批次边界。后续批次落地后，生成器**不会**回头去改这三条字符串（要改就得改生成器源码里的字面量）。所以它是**活字段**：**每逢新批次落地，都要回来检查它是否还成立。**

**读法**：`omitted` 说的是「**产物里没有** X」，不是「**本仓没有** X」。第 6/7/8 条按前者读**永远为真**（查询接口与门禁本就不该进图产物）——这是**范畴错误**，比单纯过期更隐蔽。

**同类问题在改动记录里**：两条 `ledger/change-log/*.json` 的 `omitted` 字段同样写着 `"查询接口（增量 5）"`，而它们是那时候写的记录。**记录是只增不改的事实记录，它们的 `omitted` 不得被「修正」**——但**读的时候必须按写作时点读**。

### 7.5 `.github/workflows/ci.yml` 的台账快照**曾经过期，已按实测重写（`b91fe50`）**，但**产物字节数那一栏本批实测又差了 1**

> **状态**：本条**已修过一次**。提交 `b91fe50`（「ci：graph 门禁快照按实测重写（1,416 / 498 / 80，旧值留痕）」）把 `.github/workflows/ci.yml` 里那段以 `快照（2026-10-06，locals / ci.yml / 设计稿 / 交接文档批次并入后按实测重写；` 开头的「快照」注释改成当时的实测值，**旧值以「旧值 1,414 / 491 已过期」的形式留在注释里**（本仓惯例：过期数字记账不删）。底下保留「历史上曾如此」的痕迹与教训。**该「快照」块已由本批整块替换为「取数命令 + 口径」**（不再复述任何规模数字）；旧引文 `快照（2026-10-06，locals / ci.yml / 设计稿 / 交接文档批次并入后按实测重写；` 因此在 `ci.yml` 里**已 0 命中**——按 §7.11 的引文锚惯例在此记账：**旧引文是什么**（见本行前文）、**被谁移除**（本批把该块整块换成「取数命令 + 口径」）。

**本批改引实测（逐项复核）**：`b91fe50` 写下的那段注释，正文各值与当下产物**除一处外逐项一致**：

| 注释里的值（现版） | **当时取值**（`node scripts/generate-reference-graph.cjs --check` + `node -e` 直读产物） | 当时一致？ |
| --- | --- | --- |
| 节点 **1,416**（全 `indexed`） | 节点 **1416**（`meta.node_states` = `{"indexed":1416}`） | ✓ |
| 边 **498** | 边 **498** | ✓ |
| 扫描面 **80** 个文件 | 扫描面 **80** 个文件 | ✓ |
| 产物 **1,492,077 B**（LF 归一化后） | 以 `git cat-file -s ":ledger/references.json"` 为准（**本文档刻意不复述这个现值**，理由见右栏） | **✗ 注释已过期**：注释里的 1,492,077 是 `b91fe50` 那一刻的值，本批改引写作时实测已是 **1,492,078**，而**每改一次本文档它还会再变**（本文档自己也在扫描面内，它的 `bytes` / `lines` 会进产物——本批重算后就又变了一次）。⇒ 「差几字节」这种说法**本身也是活的**，**只记「注释已过期」**，别引用具体差值。本批照实记账，**不代改 `ci.yml`**（不在本批改动范围内） |
| 单次全量重算 **≈1.6 s** | **未复核**（**转述**：那是 `b91fe50` 在它那台机器上的端到端计时；要现值就现跑计时） | —— |
| kind 逐项（`import` 320 / `require` 52 / `export-from` 19 / `dynamic-import` 1 / `markdown-link` 35 / `package-field` 51 / `ci-target` 17 / `anchor` 3） | `meta.edge_kinds` 与实测**逐项相同** | ✓ |
| `声明 402 / 符号边 1,347（已解析 989 / 无符号 358）` | 声明 **402** / 符号边 **1347**；`resolved` **989**，`external` 134 + `unresolved` 224 = **358** | ✓ |
| `跨文件 756` / `Program 28 个源文件` | `cross_file` **756** / `program_source_files` **28**（`program_outside_repo_files` 0） | ✓ |

> **本表只记「当时取值」，不是现值** —— 规模类数字随每次重算变化（新增文件即新增节点）。要现值请跑
> `node scripts/generate-reference-graph.cjs --check`（规模与一致性）与 `git cat-file -s :ledger/references.json`（产物字节数）。

**历史上曾如此（旧版本条记的过期表）**：重写前那版注释记的是「快照（2026-10-06，接入 `check:impact` 时按实测重写；旧值 1,412 / 482 / 76 已过期）」，其正文与当时的现值差 —— 节点 **1,414** 对 **1416**（+2）、边 **491** 对 **498**（+7）、扫描面 **78** 对 **80**（+2）、`import` **315** 对 **320**（+5）、`package-field` **49** 对 **51**（+2）、产物 **1,487,949 B**（未复核）；而符号级那半张（声明 402 / 符号边 1,347 / 跨文件 756 / 无静默 null 0 / Program 28）**当时就已准确**。⇒ **过期的是文件级那半张**。

**三个时点的实测对照**（把「谁带来的漂移」拆开，不笼统归因；三行都是历史记账，**当时取值见上表**）：

| 时点 | 节点 | 边 | 扫描面 | 取数命令 |
| --- | --- | --- | --- | --- |
| `ci.yml` 更早那版快照写下的那一刻（注释自述） | 1,414 | 491 | 78 | ——（**转述，未复核**：注释里的值，本次没在那个提交上重测） |
| 本文档初次落地前（`HEAD = 790e626`） | 1415 | 498 | 79 | `node scripts/generate-reference-graph.cjs --check` |
| 本文档初次落地后（含本文档） | 1416 | 498 | 80 | `node scripts/generate-reference-graph.cjs --check` |
| **本批改引（`HEAD = 5e78029`）** | **1416** | **498** | **80** | 同上（**本批改引实测**） |

⇒ **更早几次提交**带来 `+1` 节点 / `+7` 边 / `+1` 扫描面（`1,414→1,415` / `491→498` / `78→79`）；**本文档**带来 `+1` 节点 / `+0` 边 / `+1` 扫描面（`1,415→1,416` / `498→498` / `79→80`）——本文档刻意不含 Markdown 链接，因此产边为 0（实测本文档节点 `edge_out: 0, edge_in: 0`）。

**根因与教训（仍然成立）**：`ci.yml` 的快照是**手写注释**，而图是**机器产物**——两者之间**没有**任何机制保持同步，所以它**必然还会再过期**。**改法见 §8.3**，其中最后一条**已由本批改写**（`ci.yml` 那块不再是「快照行」，而是「取数命令 + 口径」；今后改口径时**别再写回规模数字**）——**并且记住本节：手写快照必然会过期**。**本批改引未改 `ci.yml`**（不在本次改动范围内），复核结果是**除产物字节数差 1 外逐项一致**（见上表）——**这正是「手写快照必然过期」的又一次实证**：`b91fe50` 写它时是对的，之后图长大了 1 字节，注释当场就旧了。

〔旁证：设计稿里那行以 `| **L0 文件层** | 节点 `kind: "file"` |` 开头、记着 **1,412** 的快照（`docs/DESIGN-code-graph.zh-CN.md`），已明确标注为「本批实测；原稿记的 1,399、增量 2 首批记的 1,402 都是各自批次的快照」，属**合规的历史快照**，不是过期现值——**本批改引实测**该引文仍在、措辞未变。〕

### 7.6 `complete` 不可达，但 `stale` **可达**（**本批改引改判**：旧标题「`completeness` 恒为 `partial`」是错的）

见 §3.4（实测）。**旧说法「恒为 `partial`」不准确**：`completeness` 由 `diverged ? 'stale' : 'partial'` 决定，**`partial` 与 `stale` 都是活的分支**，取不到的只有 `complete`。

- **`complete` 不可达**（这一点旧说法对得上）：一个真正的 `complete`（图完整且新鲜）在当前接口下**无法被表达**，因此使用者拿不到「这次可以放心读成『没人引用』」的信号。
- **`stale` 可达**：当检测到**索引版与工作区版的图产物不一致**（漂移）时，两条查询的 `completeness` 就是 `stale`，并附一句 `索引版与工作区版 ledger/references.json …：结果以索引版为准`。
- **漂移检测曾经只比字节长度 ⇒ 等长异内容会漏检**：工作区里把版本号从 `1.1.0` 改成 `1.1.1` 这类改动**字节数一模一样**，只比长度的判据会答「未漂移」，于是索引版被当成工作区现状、该报的 `stale` 被**误报成 `partial`**——把「结果可能不符工作区现状」这个警告整个吞掉了。**已于 `5e78029` 修复**：现在先比长度（不同即判漂移），**长度相同则继续逐字节比内容**（`Buffer.equals`）；源码里那段注释写着 `★ 为什么必须比内容、不能只比字节长度：**长度相同不代表内容相同**`。
  **历史留痕**：修复前 `artifactDrifted()` 只有第一级长度比较、没有第二级内容比较；`5e78029` 的提交信息是「漂移判定改为比内容，堵住「等长但内容不同」的漏检」，本条的旧标题（「恒为 `partial`，`complete` 分支是死代码」）也随之改判。

### 7.7 `who-references` 的 `gaps[]` 混入了 `impact` 的描述（**已修，`9adf069`**）

> **状态**：本条**已修**。历史上 `who-references` 的 `gaps[]` 是**照抄 `impact` 的缺口清单**：`gaps[2]` 尾部与整个 `gaps[3]` 在讲 `impact` 的反向闭包、`buckets`、`cycles`、`path`、截断标注，其中最刺眼的一条是 `gaps[3]` 里的 `impact 尚未做 informational 与截断标注`——**只属于 `impact` 的文字出现在 `who-references` 的输出里**，逐条读会把人带偏。

**本批改引实测（修后，本批实测——**只作留痕，不是现值**）**：`who-references` 的 `gaps[]` 现为 **4 条**（实测 `node scripts/refs-query.cjs who-references src/engine/types.ts --json` → `gaps.length` = 4），逐条只讲它自己的边界（文件级/符号级计数口径、单层不推进、未实现的其它查询）；`impact` 的口径留在 `impact` 自己的 `gaps[]`（同一条命令换子命令 → `gaps.length` = 7）与 `--help` 里，**不复述**。人工复核方式见 §7.11：`node scripts/refs-query.cjs who-references src/engine/types.ts --json`，逐个读 `gaps[]` 是否提到别的子命令的字段。

**教训（仍成立）**：`gaps` 必须**按子命令裁剪**；抄一份清单最省事，代价是输出在撒谎。§8.4 的检查清单里保留了这一条。

### 7.8 其它三条已知边界（口径本身如此，不是缺陷，但必须知道）

1. **`lines: null` ≠ 0 行**（§2.3 第 2 条）：有一批节点没有 `lines` 值。**但那批里含自指的那一条**：`ledger/references.json` 自己也在扫描面内，它的 `lines` / `bytes` 属**自指例外**（§2.3 第 3 条），**不是因为「没被解析过」**。⇒ 扫描面外条数 = 节点总数 − 扫描面文件数（**不要减 1** —— 自指产物本身就在扫描面内，减 1 是重复扣除；本行历史上就写错过，旧写法是 `− 1`，实测公式给 1335 而实际是 1336）。**留痕（只作留痕，不是现值）**：本批改引实测 `lines === null` 计 **1337** / 节点 **1,416**（⇒ 1,336 = 1416 − 80）、`bytes === null` 计 **1**、扫描面 **80** 个文件；现值取数见 §2.3 与 §0.2 那两条命令。
2. **`declarations` 只有顶层声明**：`scope` 恒为 `null`，函数内局部变量与参数**不在图里**（`meta.omitted[0]`）。想知道单文件的形参/局部变量，只能走 `refs-query locals`——它**不进图产物**，因此**没有传递性**（无法回答「谁引用了这个局部变量」）。
3. **`who-references` 的 `direct_referrers` 与 `symbol_referrers` 不可相加**（§3.1）：前者只数文件级边，后者含文件内边。

### 7.9 `check:refs` 的 `deleted-reference` warning 按 **basename** 命中（会被「正常的路径引用」大量触发）

**实测**：`node scripts/check-references.cjs --json` 的 `violations[]` **全部**是同一个 type —— `deleted-file-basename-mention`（**本批改引实测**：`summary.errors` = 0，该 type 是 `violations[]` 的唯一取值），全部来自第 4 类检查（`deleted-reference`）；`summary.deletedPaths` 实测 = **37**（与旧版一致，未变）。**总条数刻意不写死**（**旧值 700 / 714 都已过期**）——它随本文档内容变，取数命令见本节末。

**机制**：该检查用 `git log --diff-filter=D --name-only` 取历史删除清单（`summary.deletedPaths` 实测 = **37** 条），然后**在仓库文本里搜这些路径的 basename**。历史删除清单里有一条**曾经位于 `vendor/` 下、如今整个目录都已删除**的 `types.ts`（本条刻意不写完整路径——见下），于是**任何**文本里出现的 `types.ts` 都命中一次：

```text
文档里提到 src/engine/types.ts  →  warning：提到了已删除文件的文件名 types.ts
                                 （该名字另有一条完整路径也已在历史里被删）——次级线索
```

**计数口径（旧说法「数的是 basename 出现次数」不准确）**：`check-references.cjs` 给每条违规算一个去重键 `${v.file}:${v.line}:${v.type}:${v.target}`，**同一个 (文件, 行, 违规 type, 目标 basename) 最多报一次**；再叠加「同一行已经报过该 basename 的完整路径就不再报 basename」这条。⇒ 一行里写 3 次 `types.ts` 也**只算 1 条**，报的是**首次命中的列号**。所以这个数**不是出现次数**，而是「**命中了这个 basename 的行数**」（按文件与 basename 分组）。

> **写这一节时踩到的坑（值得单记）**：第一版这里把那条已删除文件的**完整路径**照抄了出来，`node scripts/check-references.cjs` 当场从 `0 error / 696 warning` 变成 **`2 error / 699 warning`**、**exit 1**——两条 `deleted-file-reference`、`severity: "error"`、`file` 指向本文档。
> **⚠ 上面那三个数（`696` → `699`、两条 error）是「当时那次运行」的观测值，本轮核对未能独立复现**——复现它必须把那条完整路径**写回本文档**，那是写盘操作：写下去之后，你面对的就已经不是当前这份文档了。本轮独立复核者的结论同样是「无法独立复现，只有现值 warning 数这一条旁证」。
> **本批的旁证（取数命令，不写死值）**：`node scripts/check-references.cjs` ⇒ `✔ 0 error / <N> warning —— 门禁通过`、**exit 0**。**warning 数不是可复现量**——本文档每改一次它就变，所以这里只给取数命令、**不写死**（**本行历史上把这一句写成「本轮可复现的旁证」并钉了 `717`：那个数既复现不出来、也与「可复现」的措辞矛盾，本批按本仓口径改成取数命令**）。**留痕（只作留痕，不是现值）**：原写 **717**（该批落盘时点），独立复核者第四轮实测 **718**，本批开工实测同为 718。**稳定可复现的只有两件事**：`0 error` 与「门禁通过」本身。
> **想亲手复现那个失败态**：用 `git log --diff-filter=D --name-only` 取一条**已删除文件**的完整路径，写进任一被扫描的文本文件（例如本文档）再跑门禁——同一行命中完整路径即报 `deleted-file-reference`（error、`severity: "error"`）；**跑完记得把这次写入撤销**。
> **区别是硬的**：提到删除文件的 **basename** 只是 `warning`（次级线索），提到 **完整路径** 是 `error`。⇒ **在文档里复述历史删除清单时，不要写出完整路径**——把错误复述进文档，等于把「残留提及」亲手造出来。这与本仓「残留零容忍」是同一条纪律。

**本文档自己就贡献了一部分**（历史实测：初次落地 51 条，`56ea956` 那批补写「已修 / 留痕」与 §7.11 后涨到 63 条——**这正是本条要说明的机制：写文档就会涨**；**旧标 `9adf069` 已订正**：该提交没动过本文档，其文档 blob 与初次落地的 `b4fddb3` 逐字节相同（sha `089b0838…`），对本文档的贡献恒为 51 条）——因为 §3 的三条查询示例都以 `src/engine/types.ts` 为目标，正文里反复出现。**这些条不代表本文档写错了路径**。

**灰在哪**：
- 这类 warning 的数量与「**某个常用 basename 在你文中出现的次数**」成正比，**与真实残留无关**。`types.ts` 是本仓最常见的文件名之一（`files[]` 里 `lang=ts` 的就有 58 个），因此这是一条**高噪声**的次级线索。
- 门禁**只拦 error**，所以它不影响绿灯；但**拿 warning 数当"健康度指标"会得出错误结论**——本文档加入时是 **649 → 700**（`node scripts/check-references.cjs`），差别全部来自这一条规则。**旧值 714 已过期**，它的拆法是：去掉本文档 **651** + 本文档 **63**（初次 51 + `56ea956` 那批补写 12；**旧标 `9adf069` 已订正**）。**这条规则数的是「命中某个已删除 basename 的行数」，与仓库健康度无关。**
  **现值取数命令（刻意不写死）**：`node scripts/check-references.cjs --json` → 读 `summary.warnings`；本文档自身的贡献 = `violations[]` 里 `file === "docs/HANDOFF-code-graph.zh-CN.md"` 的条数。
- 精确的「引用已删除文件」判定不靠它：**图里由 `status=dangling` + `to.state=deleted` 表达**，比 basename 次级线索精确得多（`ledger/references.json` 的 `ledger/exempt.gitignore` 豁免理由里也写着同一句话）。
- 该脚本另有 `allowlisted` 机制（现值取数 `node scripts/check-references.cjs --json` → `summary.allowlisted`；**活值、不在此复述**——它随豁免清单与仓库内容变化。**留痕（只作留痕，不是现值）**：本行原写「实测 = **1865** 条被豁免」，独立复核者第四轮实测 **3593**，本批复核实测同为 3593——旧值已过期近一倍）：`ledger/references.json` 因为「内容按构造就是仓库里所有被引用的路径」整文件豁免了这类 warning，**本文档不在豁免名单里**。

### 7.10 本次核对**未验证**的事项（写明怎么验证）

| 未验证 | 为什么 | 怎么验证 |
| --- | --- | --- |
| 第 1 / 2 / 3 / 4 / 7 / 8 环的**实际通过状态**（第 9 环已在 §4.5 实测，故不列在此） | 本次没跑（§4.6） | `npm run check` |
| ~~`ci.yml` 注释里「产物 1,487,949 B」~~ **已结案** | `b91fe50` 已重写该注释块；该字面量现已不在 `ci.yml`（实测 0 命中） | 无需验证；现值取数 `git cat-file -s :ledger/references.json` |
| ~~`ci.yml` 注释里「1.5–2.1 s / 1,474·1,820·2,128 ms」~~ **已结案** | `b91fe50` 已重写为「≈1.6 s」，原字面量 0 命中；那组计时是**转述且未复核** | 只读复测：`node scripts/generate-reference-graph.cjs --check --json` 读 `timings`（**不要用不带 `--check` 的写法**——那是写盘式） |
| 设计稿里所有标「实测」的设计期数字（如 §2.6 的单条字节数、§9.7 的耗时表） | 本次没复测，且它们是**设计期快照** | 按设计稿 §9.7 每项自带的「测量方法」一列复测 |
| 「符号级层落地后产物 1,482,686 B」等设计稿数字（**转述，未复核**） | 见上 | 同上 |

> **结案不删事实**：被上面「`1.5–2.1 s / 1,474·1,820·2,128 ms`」那行结案带走的人工观测值按本仓惯例留账——那次运行生成器自报 `耗时 1413 ms`，同一次运行的 `--json` 里另有 `createProgram 121 ms / 符号遍历 159 ms`（**转述，未复核**；要现值就跑上面那行第三栏的只读命令）。

### 7.11 引用约定：**已改为引文锚**，不再依赖行号（**本批改引**）；残留风险 = **引文本身被改写**

> **状态：已修**。旧标题是「文档里的 `文件:行号` 引用**没有任何门禁在管**」——**那句仍然成立**（下面照留），但**前提变了**：本文档**已经不再用行号指路**，所以「没人管行号」不再是一个会持续流血的伤口。
> **本批改引的提交** = 本文档最后一次改动的提交，查法 `git log --oneline -1 -- docs/HANDOFF-code-graph.zh-CN.md`。**这里刻意不写死哈希**——哈希会随下一次改动立刻过期，正是本文档要消灭的那类字面量。
> **历史留痕**：改之前全文有 **47 处** `路径:行号` 形式的引用（`Select-String` 实测，跨 42 行）。

**当年为什么危险（历史描述，保留）**：`check-doc-snippets` 与 `check-references` **都不校验**文档正文里的 `文件:行号` 引用是否过期。

- `node scripts/check-doc-snippets.cjs` 只做两类事：把 `ts` / `typescript` 围栏块拿去做编译、核对工具数量与签名断言（§4.4）。正文里的 `<路径>:<行号>` 它**根本不看**。
- `node scripts/check-references.cjs` 查的是 9 类**引用**（悬空路径 / 模块说明符 / 未跟踪路径 / 已删除文件 / …，§4.3）。它确实会解析 Markdown 链接与 CI / `package.json` 里的路径，但**路径后面跟的行号**不在它的判据里——把某个脚本的某一行写成昨天成立、今天已漂移的值，**它一个字都不会报**。
- 后果曾经是硬的：**行号漂移可以一路飘过全链绿灯**。实测证据（全部由改 `scripts/refs-query.cjs` 造成，**没有任何一环报红**）：`56ea956` 刚把全文行号同步过一遍，紧接着的 `7511540` / `e166e94` / `5e78029` 三个提交就让它**再次整体漂掉**——`e166e94` 把 `refs-query.cjs` 从 1,384 行推到 **1,687** 行，`5e78029` 再推到 **1,720** 行。`9adf069` 的提交信息里也只能**手工记账**说「需后续批次更新该文档的行号与引文」——因为没工具能替它做。

**本批的修法与现状（这才是现在要读的那一段）**：

- 全文的 `路径:行号` 引用**已改成引文锚**（§0.0）：写「文件路径 + 可 `grep` 的引文片段」。**行号会随每次改动漂移，引文不会。**
- **残留 = 1 处（本批由 2 降到 1；旧值与构成留痕，一个不删）**：① **旧**：§1.2 里 `ledger/exempt.gitignore` 的那一处是**真引用**（坐标经复核准确，旧写作「该路径 + 行号 :43」——**刻意不连写成「路径:行号」，否则本行自己又会被 ① 命中**），本批按 §0.0 已改成引文锚（`docs/** ## reason=工具自身文档`），不再计入残留；② 下面那处显式标注的演示。**除这一处演示外，正文不再有位置引用**。（**本行历史上写错过**：旧版自检正则枚举扩展名时漏了 `.gitignore`，于是把残留数报成 0 —— 这是"取证口径比结论窄"的典型。）
- **残留风险 = 引文本身被改写**（不再是行号漂移）。⇒ 复核方式也随之变了：不是「看那一行还在不在」，而是「**`grep` 那句引文还在不在**」。

**人工核对方法（可原文照抄）**：

```powershell
# ① 行号残留：应为 1（只剩本节末那处显式标注的演示；旧值 2 = 它 + §1.2 那处真引用，本批已把那处改成引文锚）
#    路径段用 [\w./-]*（**零个或多个**，不是 `+`）：`+` 要求点号前至少有一个字符，
#    于是**根级点文件**（直接以 `.` 开头的那类路径）永远匹配不到 —— 自检口径比结论窄。
#    本批复核实测（探针 = 三个路径各补一个行号）：老的 `[\w./-]+` 版对 `ledger/exempt.gitignore`
#    给 True、对根级的 `.gitignore` 给 **False**、对 `./.gitignore` 给 True；换成 `[\w./-]*`
#    后三者都是 True，而本文档的残留数仍是 1。**本注释刻意不写出「路径:行号」的字面量**
#    ——写出来会让自己也命中，把残留数从 1 顶上去，自检就失去意义。
Select-String -LiteralPath docs/HANDOFF-code-graph.zh-CN.md -Pattern '[\w./-]*\.(cjs|mjs|js|ts|tsx|json|md|yml|yaml|gitignore):[0-9]+' -AllMatches |
  ForEach-Object { "{0}: {1}" -f $_.LineNumber, $_.Line.Trim() }

# ② 逐条核对引文锚：把文档里反引号引的片段拿去 grep，命中 0 次 ⇒ 引文已被改写，必须回改
#    （本文档写作时逐条 grep 过，全部命中 ≥ 1 次；命令形状：）
Select-String -LiteralPath scripts/refs-query.cjs -Pattern 'filter: isCountedSymbolEdge' -SimpleMatch
```

**判据**：② 里每一条引文**必须命中 ≥ 1 次**；命中 0 次 ⇒ 要么换成仍在的引文，要么改写成不依赖具体措辞的描述，**并留下「旧引文是什么、何时被谁移除」的痕迹**（本仓惯例）。**引文还被要求短且唯一**：若某句在文件里出现多次，补足上下文让它唯一，或用「第一次出现处」这类锚点。

**为什么不做成门禁（现阶段取舍，未变）**：这类引用是「人写给人的指路牌」，自动判定要从自然语言里认领「这句话是否还在那里」，误报率高于收益；本仓的选择是**记账 + 写明人工核对方法**，等引用语法稳定下来（例如统一写成机器可解析的形式）再上自动校验。**引文锚比行号更适合上自动校验**——它是字符串包含判定，不是位置判定；这是本批顺带改善的一点。

**演示（此处行号仅作演示，不是引用）**：本文档旧版写过 `scripts/refs-query.cjs:277` 来指 `who-references` 的 `gaps[2]`；`9adf069` 之前同一个引用写作 `:273`，之后写作 `:277`——**同一条引文，两个行号**，而引文本身一次都没变过。这正是 §0.0 不写行号的理由。**上面的 ① 现在只命中一行：这一行（§1.2 里 `ledger/exempt.gitignore` 那处真引用已在本批改成引文锚，不再是位置引用；本句刻意不写行号——写出来就会多出一处命中）。**

### 7.12 改动记录的 `stale`：判据比"索引变了"窄（**本批订正**）

**索引 stale 的判据比"索引变了"窄**：`generate-change-log` 的 stale 只比较
`universe_hash`（= 排序后的**已跟踪路径清单**摘要）与 HEAD，**不比较文件内容身份**。
⇒ 同 HEAD、同路径、只改内容时**不会**判 stale。`--index` 观测点当前盘上 0 条记录，属潜在路径。

**复现（本批实测，两条命令 + 一次夹具对照）**：在**真仓库**上建一条暂存态记录（`node scripts/generate-change-log.cjs --index`），然后**只改内容、不改路径**——把 `scripts/refs-query.cjs` 的内容改掉并 `git add`（索引 blob 随之改变、`git ls-files` 条数与清单不变、HEAD 不变），再跑 `node scripts/generate-change-log.cjs --check --json`：该记录仍是 `ok: true` / `status: "complete"` / `problems: []`，**没有** `index-basis-moved`。对照夹具（`--root` 指向一个临时 git 仓库，同一条记录）：**只改内容**时 `ok: true`、`status: "complete"`；**新增一条已跟踪路径**（`b.txt` 且 `git add`）后同一份记录变 `ok: false`、`status: "stale"`、`problems: ["记录描述的暂存态已经不存在（index-basis-moved）…"]`。⇒ 两个判据确实只有"路径清单摘要"与 HEAD。

**这条边界的后果与兜底**：只改内容的提交由**别的机制**发现——提交侧记录 `kind: "commit"` 是内容寻址的（结构上不可能 `stale`）；本仓两份产物各有自己的判据（`ledger/references.json` 是**逐字节**、`ledger/file-ledger.json` 是**解析后结构化**），都不靠 `stale`。别把 `stale` 当成内容漂移的探测器。

### 7.13 提交快照的差不是「绝对可重放」的（`needs_change` 会读今天的工作区与进程配置）

**提交快照的差不是"绝对可重放"的**：`needs_change` 判定会读**今天的工作区现状**（文件是否存在/是否被忽略）
与**进程级 git 配置**（如 `core.excludesFile`）⇒ 同一对基准在**不同工作区状态或不同进程配置**下可能得到不同的 `needs_change`。
**树的哈希部分（`from/to_snapshot.tree`）不受影响**，仍可逐字复核；受影响的是"这条改动需不需要人工跟进"这一类判定。
**不要据此声称"同一对基准重算必然同差"** —— 本行历史上那样写过。

**留痕（旧说法，已作废，逐字照抄原处）**：`ledger/change-log/README.md` 曾写「记录**不可变、可复核**（同一对基准重算必然得到同一份差）」；`scripts/generate-change-log.cjs` 的文件头注释曾写「快照来自内容寻址的提交树 ⇒ 同一对基准连跑两次，记录**除 `created_at` 外逐字节相同**」。两处都按上一条口径改成了带条件的表述（条件：**同一工作区状态 + 同一进程 git 配置**）。

---

## 8. 想改动时怎么做

四条常见改动，各自的检查清单。**共通前提**：本套东西的判定基准是 **git 索引**，所以每一步都别忘了 `git add`（§6.1 / §6.4）。

### 8.1 加一种边 kind

**改动面（至少 4 处，缺一必红）**：

1. `scripts/reference-graph-core.cjs`——加解析逻辑、把新 kind 放进产边位置。**这是共享内核**：`check-references.cjs` 与生成器**同时** require 它，因此改它会**同时**影响门禁与图。
2. `scripts/generate-reference-graph.cjs`——确保新 kind 能落进 `edges[]`（或符号层）；`meta.edge_kinds` 是**算出来的**，新增 kind 会自动出现。
3. `.github/workflows/ci.yml`——注释里逐条列了覆盖的 kind 清单（以 `# 覆盖的边 kind：import / export-from / require / dynamic-import / markdown-link / package-field /` 起头的那两行），**注释自称「新增边 kind … 时必须同步改本注释与 `CONTRIBUTING.md`」**。
4. `CONTRIBUTING.md`——同样的 kind 清单（以 `覆盖的边 `kind`：` 开头、逐个列出 8 个 kind、紧跟着讲 `节点四态` 的那一行）。

**检查清单**：
- [ ] `node scripts/generate-reference-graph.cjs` → `git add ledger/references.json` → `node scripts/generate-reference-graph.cjs --check` **exit 0**
- [ ] `node scripts/check-references.cjs` **exit 0**（新 kind 在 `check:refs` 里若也有对应检查项，error 数不得上升）
- [ ] 新 kind 若属**代码级引用**（对方编译或运行会坏），必须加进 `refs-query.cjs` 的「必须改」判据，否则 `impact` 的分档会漏；若属配置/文档级，加进「需复核」。判据在 `scripts/refs-query.cjs` 的 `impact` 段与 `buckets` 构造处
- [ ] **`edges[].type_only` 的语义是否适用**：纯类型语句产出的边才算 `type_only=true`（§2.8 第一套口径）
- [ ] 边 id 冲突：同一位置多条边要追加 `:<field|specifier>` 消歧，**仍冲突即生成失败**（`meta.edge_id_rule`）——新 kind 在一行里产多条边时最容易撞
- [ ] `git add` 所有改动的脚本（§6.5），否则 CI 用旧门禁
- [ ] 加 e2e 断言：`tests/reference-graph-e2e.mjs`

### 8.2 改扫描面

**扫描面定义**：`meta.scope` = 「产边的文件 = 已跟踪 + 文本后缀 + 不在 `excluded_prefixes` 内；**节点表仍是全量已跟踪文件**」。口径：`text_extensions` = `['.cjs','.json','.md','.mjs','.toml','.ts','.yaml','.yml']`，`excluded_prefixes` = `['examples/','lib/']`（这两个是**契约常量**）；`scanned_total` 是**活值、不在此复述**——现值取数 `node -e "console.log(require('./ledger/references.json').meta.scope.scanned_total)"`（**留痕：本批改引实测 80，只作留痕，不是现值**）。

**改动面**：
1. 生成器里的 `text_extensions` / `excluded_prefixes` 常量。
2. **符号级层的 Program 范围**是**另一套**：`meta.symbol_graph.scope` 原文——`只对扫描面内 lang=ts 的文件建 Program（本仓 = src/**/*.ts）`；`.mjs` / `.cjs` / `.js` / `.jsx` **按设计稿 §3.4 退化为文件级，不产符号边**。**扩大文件扫描面 ≠ 扩大符号面**，两者要分别改。
3. `.github/workflows/ci.yml` 那段以 `规模与构成：【不在此复述活值】` 开头的注释的**口径部分**（**别再写回规模数字**）与 `CONTRIBUTING.md`。
   〔**引文锚留痕**：本条原写作「`ci.yml` 注释（`扫描面 78 个文件` 那行）与 `CONTRIBUTING.md`」。**旧引文是什么** = 那句 `扫描面 78 个文件`；**被谁移除** = 提交 `2009944` 把 `ci.yml` 那个「快照」块整块换成了「取数命令 + 口径」，该引文因此在全仓 **0 命中**（实测）。`2009944` 当时补记了 §8.3 与 §7.5 的连带，**漏了本条**——本批补记。〕

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
3. `CONTRIBUTING.md` 里以 `` `npm run check` 按顺序跑： `` 开头的那份 13 环清单 + 该环的口径段落。

**检查清单**：
- [ ] 新门禁**必须自带 `--help`**（本仓所有门禁都有，且口径以 `--help` 自述为准）
- [ ] **fail-closed**：拿不到判据时**不判绿**（§4.2）。「读不到就当通过」是本仓明确拒绝的形状
- [ ] **`--root` 语义与既有门禁一致**：必须是 git 仓库根（realpath 相等），否则退出码 1 拒绝，**绝不静默回退**（`check-impact.cjs --help` 有完整表述）
- [ ] **退出码约定**：0 通过 / 1 判定不通过或 fail-closed / 2 用法错误（本仓统一）
- [ ] 若新门禁读图产物：**用图自己的词表**，不另造一套（`check-impact` 的 `--help` 明写这条）
- [ ] 若新门禁是**棘轮**：说清「存量容忍、新增报红」+ 基线取哪一对（`basis` 字段自证）+ 为什么不提供豁免（本仓立场：没有白名单）
- [ ] 加回归用例到 `npm test` 链 + `package.json` 的 `test:<name>`（可选但本仓惯例如此）
- [ ] 改完 `git add` 全部三项（§6.5）
- [ ] 若改动影响图的口径（新增边 kind / 改扫描面或字段）：改 `ci.yml` 那段以 `规模与构成：【不在此复述活值】` 开头的注释的**口径部分**，**别再写回规模数字**（该块已是「取数命令 + 口径」）——**并且记住 §7.5 的教训：手写快照必然会过期**

### 8.4 加查询子命令

**入口**：`scripts/refs-query.cjs`。三条现有子命令的公共骨架：`parseArgs` → 读图（索引优先，回退工作区）→ 构建报告对象 → `--json` 或人类可读渲染。

**检查清单**：
- [ ] **同步改 `--help`**：本仓的 `--help` 是**口径的自述**，不是装饰。`check-impact.cjs --help` 的原文就是「口径以 `--help` 自述为准」。新子命令的选项、退出码、缺口都要写进 `--help`
- [ ] **元字段对齐**：读图产物的子命令应带 `basis` / `completeness` / `reasons` / `gaps` / `empty_referrers_reading`（实测这三个是 `who-references` / `impact` 的共同字段）。**`locals` 是刻意的例外**（不读图产物 ⇒ 无 `basis` / `completeness`）——若新子命令也不读图，照 `locals` 的形状办，并在 `--help` 里写明
- [ ] **`completeness` 的既有毛病别复制**（§7.6）：当前是 `diverged ? 'stale' : 'partial'` 写死。新子命令若真能判 `complete`，是**改进**；若不能，就照实说，并让 `empty_referrers_reading` 用 `emptyReading(completeness)` 生成
- [ ] **`gaps` 要按本子命令裁剪**，不要照抄 `impact` 的（§7.7 历史上就是抄出的事故：`who-references` 的 `gaps[]` 曾夹带 `impact` 的文字，已于 `9adf069` 修掉——别把它抄回来）
- [ ] **退出码复用既有语义**：`2` 参数 / `3` 读不到图 / `4` 输入不受支持 / `5` 目标不在图里
- [ ] **不新增 MCP 工具**（`CONTRIBUTING.md` 里写着「**不在 `npm run check` 链里**」的那一处与设计稿 §9.3：查询是给人用的接口，不暴露给模型）
- [ ] **不进门禁链**：查询是只读接口，**不在 `npm run check` 里**——查询结果再可疑也不拦提交
- [ ] **确定性**：`--json` 不得含绝对路径、时间戳、耗时（本仓的确定性要求，见 `--help` 的 `--json` 说明）；同一输入连跑两次应逐字节相同
- [ ] 若新子命令能做**可达性判定**（像 `impact` 的 `type_only`）：**必须用全深度闭包**，不能拿 `--depth` 截断后的集合做 BFS（否则会把「路径长于上限」判成「没有路径」）。这条的原始记录在 `scripts/refs-query.cjs` 里两处——注释 `**但这条等价性只在闭包完整时成立**：nodes 若被 --depth 截断，` 与 `type_only 标注的判据是「该文件到目标有没有运行时路径」，它必须建立在**完整闭包**上`（**本批改引实测**：改用引文锚，不再指行号）
- [ ] 排序一律 **UTF-8 字节序**，**不用** `localeCompare`（`src/engine/manifest.ts` 里写着 `sort(([a], [b]) => a.localeCompare(b))` 的那一处，是本仓一处已知跨平台风险，新代码不得沿用）
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
| 节点 / 边 / 扫描面 / 声明 / 符号边（规模与构成，**不在此复述活值**） | `node scripts/generate-reference-graph.cjs --check`（或 §0.2 那条） |
| 8 种边 kind 逐项条数 | `node -e "console.log(require('./ledger/references.json').meta.edge_kinds)"` |
| `lines` 为 `null` 的节点数 | `node -e "const j=require('./ledger/references.json');console.log(j.files.filter(f=>f.lines===null).length,j.files.length)"` |
| 产物无 `degradation` 字段 | `node -e "console.log(JSON.stringify(require('./ledger/references.json')).includes('degradation'))"` |
| `meta.omitted` 8 条逐条 | `node -e "console.log(require('./ledger/references.json').meta.omitted)"` |
| 台账四态 | `node scripts/check-file-ledger.cjs` |
| `0 error`（warning 总数**刻意不写死**——机制与取数命令见 §7.9） | `node scripts/check-references.cjs` |
| 改动记录全部通过（条数**刻意不写死**，记录只增不改） | `node scripts/generate-change-log.cjs --check` |
| `tree` 冻结值核对 | `git rev-parse "ed404e5^{tree}"` 等（§5.3 四条） |
| `who-references` / `impact` / `locals` 的元字段 | `node scripts/refs-query.cjs <子命令> <路径> --json` |
| `path_hops` / `via` / 闭包规模（条数**刻意不写死**） | `node scripts/refs-query.cjs impact src/engine/types.ts --json` |
| `--depth` 截断对照 | `node scripts/refs-query.cjs impact src/engine/types.ts --depth 1` 对比 `--depth 3` |
| 四个退出码 | `who-references docs/NOPE.md`（5）/ 符号 id（4）/ `locals README.md`（4）/ `bogus x`（2） |
| `ci.yml` 那个「快照」块的沿革与对照 | 该块**已整块替换为「取数命令 + 口径」**（现以 `规模与构成：【不在此复述活值】` 开头，不再复述任何规模数字）；旧引文 `快照（2026-10-06，locals / ci.yml / 设计稿 / 交接文档批次并入后按实测重写；` 在 `ci.yml` 里已 **0 命中**（**留痕**，旧引文与被谁移除见 §7.5）。替换前的逐项对照（注释值 vs §7.5 上表的**当时取值**）见 §7.5（**当时实测：除「产物字节数」那一栏的注释已过期外，逐项一致**） |
