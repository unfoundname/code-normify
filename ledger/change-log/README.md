# 改动记录（`ledger/change-log/`）

本目录是**改动记录的落点**（设计稿 `docs/DESIGN-code-graph.zh-CN.md` 第 4 节与 §10「增量 2」）。
一条记录 = **引用图两份快照之差** + 受影响的引用方 + 处理状态。

**为什么叫 `change-log/` 而不是 `changes/`**：`changes/` 是**目标工程**的数据目录名（`src/engine/types.ts`
的 `ChangeData`，本仓库不存在它——`git ls-files` 里没有任何 `changes/` 条目）。记录里的 `change_id`
是一个指回**目标工程的** `changes/<id>.json` 的**可选外键**；若本仓库自己的记录目录也叫 `changes/`，
同一份文档里 `changes/` 会有两个所指。同域原则不变：它仍落在 `ledger/` 下（命中既有豁免模式 `ledger/**`）。

## 观测点 = 每次提交（**不是**每次保存）

- **一条记录 = 一个提交的观测点**：`from` = 该提交的父提交（根提交 → 空树），`to` = 该提交。基准是**内容寻址的树**，
  因此记录**不可变、可复核**（同一对基准重算必然得到同一份差）。
- **记录只能记录【它之前的】提交**：一条记录若记录它自己所在的提交，就会改变那棵树的哈希 —— 自指不可能成立。
  所以**稳态是「HEAD 之前的每个提交都有一条记录」，永远差 HEAD 这一位**；这不是缺口。
- **记录由生成器按需写**（`--commit <rev>`，幂等、只增不改）：**门禁绿灯只代表「已存在的记录都通过校验」，
  不代表覆盖完整** ✗ —— 覆盖率要自己算（见下文“怎么复核”）。
- **「每次保存」不在范围内**：它需要常驻文件监听（`fs.watch` / 编辑器钩子 / 常驻守护进程），会引入
  「同一秒内多次半写状态」的竞态与跨平台差异（`fs.watch` 在 Windows 与 Linux 的行为不同）。
  一个改动 = 一次提交，不是一次按键。**这条边界是用户拍板确认的**，下沉到保存级必须重开这个决定。
- 另外有一个**未落定**的观测点：`--index`（当前暂存态）。它写出的记录 `kind: "index"`，一旦索引再变
  就是 `stale`——那是给「提交前先看差」用的，不是正式记录。
- 设计稿 §4.1 的第二个观测点 **cas-write 本批不实现**（引擎的 CAS 写入不落在本仓库的数据面里）：
  Schema 用 `cas_digest: {"const": null}` 把它钉死，不假装支持。

## 怎么产记录 / 怎么复核

```bash
node scripts/generate-change-log.cjs --commit HEAD   # 为 HEAD 写记录（= npm run changelog:gen）
node scripts/generate-change-log.cjs --commit 10766d1
node scripts/generate-change-log.cjs --index         # 暂存态记录（未落定，会 stale）
npm run check:changes                                # = 生成器 --check：结构校验 + 重算逐字段复核
```

- **幂等**：同一基准已经有记录就不再写第二条（记录**只增不改**），重复执行 exit 0 并说明原因。
- **`--check` 的判据**（`npm run check:changes`，接在 `npm run check` 链上）：每一条记录（1）按
  `schema.json` 校验结构；（2）用同一批基准**重算**，与落盘记录**逐字段**比对。`created_at`（记录写入
  时刻）与 `handling`（人工/追加式处理状态）是**人类字段**，不参与复核。
- **复核不通过一律 exit 1**，并且 `unknown`（基准不可用）**不判绿**：未证伪也未证实 ≠ 通过。

### 覆盖率怎么算（门禁不查这一项）

`check:changes` 只校验**已存在**的记录 ✗ —— 它**对覆盖率零信息量**。覆盖率要自己算：

```powershell
$recorded = Get-ChildItem ledger/change-log/*.json | ForEach-Object {
  (Get-Content $_ -Raw | ConvertFrom-Json).to_snapshot.rev
}
$all = git rev-list HEAD
"应有(除 HEAD 自身) $(($all | Select-Object -Skip 1).Count) / 实有 $(($all | Select-Object -Skip 1 | Where-Object { $recorded -contains $_ }).Count)"
```

**稳态口径**：**「HEAD 之前的每个提交都有一条记录」，永远差 HEAD 这一位** ——
一条记录若记录它自己所在的提交，就会改变那棵树的哈希，自指不可能成立。

## 记录里有什么（本批 = **文件层**）

| 栏 | 内容 |
| --- | --- |
| `from_snapshot` / `to_snapshot` | 快照身份：`basis`（commit / index / empty-tree）、`rev`、`tree`、`universe_hash`、`tracked_total`、节点/边条数、解析模式 |
| `files` | `added` / `removed` / **`state_changed`**（`indexed` → `deleted` 等） |
| `edges` | `added` / `removed` / **`status_changed`**（`resolved` → `dangling` 等） |
| `affected_referrers` | 受影响的引用方：`dangling-target`（目标在本次改动里变得不可用 → `needs_change: true`，这就是「删了某个东西之后谁还在引用它」）/ `edge-removed` / `edge-added` |
| `counts` | 真实计数（截断前）。**判据是 counts，不是数组长度**——数组短了不等于差小了 |
| `handling` | 处理状态，**粒度 = 整条记录**（`pending` / `handled` / `waived`；`waived` 必须写理由）。逐条引用方勾选需要第二份可写源，本批不做 |
| `change_id` | **可选外键**，指向目标工程的 `changes/<id>.json`。本仓库没有该目录 ⇒ 恒为 `null`；生成器的 `--change-id` 只在文件真的存在时才写（fail-closed） |
| `omitted` | 本批明示不做的东西：符号级声明差（增量 3）、`type-reference` 边、传递闭包、查询接口（增量 5）、cas-write |

**为什么必须有 `state_changed` / `status_changed` 两栏**（不是装饰）：一个被删除、但**仍被人引用**的文件，
在 `to` 快照里仍然是一个节点（`state: "deleted"`），它的边 id 也不变（id 里不含状态）——只比 id 的话，
「删了某个东西之后谁还在引用它」会得到一张**空表**。本仓 `ed404e5`（Delete docs/VIDEO-SCRIPT.zh-CN.md，
README.md 仍链接它）就是这种形状，本目录里的那条记录就是它。

## 降级契约（**不得把「不知道」读成「没有引用」**）

`degradation.status` 四态；`files` / `edges` 的数组为空**只在 `complete` 时才等于「没有差异」**：

| status | 含义 | 判据（机器可判） | 不得读成 |
| --- | --- | --- | --- |
| `complete` | 两侧快照完整重建，差在文件层完整 | 默认 | ——（数组为空 = 真的没有差异） |
| `partial` | 差已算出，但有**已知缺口** | `reasons`：`specifier-analysis-regex-fallback`（拿不到 typescript，说明符边可能不全）/ `history-unavailable`（浅克隆，`deleted` 态不可判） | 「没有引用」或「完整清单」 |
| `unknown` | 差额**不可判定**（基准不可用 / 结构不合规 / 重算不一致） | `--check` 在记录指向的提交缺失、浅克隆、结构不合规、重算不一致时给出 | 「没有引用」——判据**只能是本字段**，不是数组长度 |
| `stale` | 记录描述的**那个状态已不存在**（HEAD 移动 / 索引变化 / 提交被重写） | `--check` 对 `kind: "index"` 的记录比对当前索引的 `universe_hash` 与 HEAD | 「记录有错」——`stale ≠ 记录有错`，它只是描述不了今天 |

> `kind: "commit"` 的记录**结构上不可能 `stale`**：提交是内容寻址的不可变基准。`stale` 属于 `kind: "index"`
> 以及将来的 `cas-write`。

## 命名与纪律

1. 命名 `<utc-iso8601 紧凑式>-<短哈希>.json`，例如 `20261005T183940Z-ed404e5.json`（**去掉冒号**：
   Windows 文件名不允许 `:`）。时间序天然可排序，短哈希避免同一秒内两次写入撞名。
2. **只增不改**：已落盘的记录不修改；处理状态就地更新 `handling` 即可（它不参与复核），但**不要改差**——
   差与重算不一致会被 `npm run check:changes` 点名到字段。
3. **写入者只有生成器**：CI 只读校验，绝不自动改记录（与台账「生成器写、门禁只读」同一条纪律）。
4. 单文件一条记录；格式 = 确定性序列化（键序固定、缩进固定、UTF-8 无 BOM、LF）。

## 已落盘的记录

记录**只增不改**、文件名形如 `<UTC 时间戳>-<短 rev>.json`。**本小节不再逐个列举**（会随每次补录而过期）——
要现值，直接看目录：

```powershell
Get-ChildItem ledger/change-log/*.json | Measure-Object | Select-Object -ExpandProperty Count   # 条数
Get-ChildItem ledger/change-log/*.json | ForEach-Object { (Get-Content $_ -Raw | ConvertFrom-Json).to_snapshot.rev }  # 覆盖到哪些提交
```

历史上最早的两条是 `20261005T183940Z-ed404e5.json` 与 `20261005T183954Z-10766d1.json`（**只作留痕**）；
`e56dcff` 之后的提交由「每次提交型批次补齐所有尚无记录、且不是本批自己那个提交的提交」这条规则续记。

那两条留痕记录记下的差（**只作留痕，不是全量清单**；全量按上面的命令现取）：

| 记录 | 描述的一次提交 | 差（摘要） |
| --- | --- | --- |
| `20261005T183940Z-ed404e5.json` | `ed404e5` Delete docs/VIDEO-SCRIPT.zh-CN.md | 文件 ±1（`indexed` → `deleted`）· 边 ±1（`resolved` → `dangling`）· 受影响引用方 1 条（**需改 1 条**：`README.md:486` 仍在链接已删除的 `docs/VIDEO-SCRIPT.zh-CN.md`） |
| `20261005T183954Z-10766d1.json` | `10766d1` v0.8.2 台账语义校准 v1→v2 | 文件 +2（`ledger/exempt.gitignore`、`scripts/file-ledger-core.cjs`）· 边 +24/−20 · 受影响引用方 44 条（需改 0 条，均为 id 级 churn 与新增 require） |

这两条是**真实历史**的记录（`--commit <rev>` 现算），不是手写的示例；`npm run check:changes` 每次都重算复核。

## 与本仓库其它数据的关系

| 数据 | 回答什么 | 判定基准 |
| --- | --- | --- |
| `ledger/file-ledger.json` + `ledger/exempt.gitignore` | 这个文件有没有人管（四态归属） | git 索引 |
| `ledger/references.json` | 谁引用了谁（文件级引用图） | git 索引（内容取索引 blob） |
| `ledger/change-log/*.json`（本目录） | 这次改动动了哪些边与文件、影响了谁、处理了没有 | 由生成器写的**事实记录**，不参与判定 |

三者同域但**不共用判定**：台账管归属、图管引用、改动记录管「一次改动的影响面」。
