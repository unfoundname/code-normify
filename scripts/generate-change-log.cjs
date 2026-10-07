#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/generate-change-log.cjs
 * 改动记录生成器（增量 2 的「改动记录骨架」）——产物 `ledger/change-log/*.json`，schema_version 1
 * ---------------------------------------------------------------------------
 * 一条改动记录 = **引用图两份快照之差** + 受影响的引用方 + 处理状态。差有三栏，缺一栏就会漏掉最核心的那种形状：
 *   ① 节点 id 差（新增 / 消失）；② **节点状态差**（`indexed` → `deleted`：文件被删了但仍有人引用它，
 *   于是它还是节点）；③ 边差（新增 / 消失 / **解析状态差**：`resolved` → `dangling`）。只比 id 的话，
 *   「删了某个东西之后谁还在引用它」会得到一张空表——本仓 `ed404e5`（删掉一个仍被 README 链接的文件）
 *   就是这种形状（真事，非假设）。
 * 四件事必须先说清：
 *
 * ① 观测点 = **每次提交**（设计稿 §4.1，用户拍板）。「每次保存」**不在范围内**：它需要常驻文件监听
 *    （`fs.watch` / 编辑器钩子 / 常驻守护进程），会引入「同一秒内多次半写状态」的竞态与跨平台差异
 *    （`fs.watch` 在 Windows 与 Linux 的行为不同）。一个改动 = 一次提交，不是一次按键。这条边界是
 *    用户拍板确认的：任何把观测点下沉到保存级的提案都必须重开这个决定。
 *
 * ② 快照**复用同一份建图实现**（`scripts/generate-reference-graph.cjs` 的 `buildGraph`，不造第二套）。
 *    提交侧快照用「临时索引 + 空工作树」物化：`GIT_INDEX_FILE` 指向 `git read-tree <rev>` 建出来的
 *    临时索引、`GIT_WORK_TREE` 指向一个空目录，再把历史基准钉到该提交（`options.historyRev`）。
 *    因此「某个提交当时的图」与**今天**的历史无关（否则日后新增的删除会把旧的 `missing` 悄悄改判成
 *    `deleted`，记录就不可复核了），且**不碰工作区、不向对象库写任何东西**（`git ls-files -s` 只读）。
 *    索引侧快照 = 当前仓库（判定基准 = git 索引，与其余门禁同一条约定）。
 *
 * ③ **降级契约（不得把「不知道」读成「没有引用」）**：`degradation.status` ∈ `complete` / `partial` /
 *    `unknown` / `stale`，逐条语义见 `ledger/change-log/schema.json` 与同目录 `README.md`。铁律：
 *    `files` / `edges` 的数组为空**只在 `status = "complete"` 时才等于「没有差异」**；`unknown` /
 *    `stale` 的记录里数组同样可能是空的，但那是「不可判定」，不是「没有」。
 *
 * ④ 本批**不做**（写进产物自己的 `omitted` 字段自证，不靠读者猜）：符号级声明差（增量 3，要
 *    `ts.createProgram`）、`type-reference` 边、传递闭包（`affected_referrers` 只到直接引用方）、
 *    查询接口（增量 5）、`cas-write` 观测点（设计稿 §4.1 的第二个观测点——引擎的 CAS 写入不落在本仓库的
 *    数据面里；schema 用 `cas_digest: {"const": null}` 把「不支持」钉死，不假装支持）。
 *
 * 确定性：快照来自内容寻址的提交树 ⇒ 同一对基准**在同一工作区状态、同一进程 git 配置下**连跑两次，
 *   记录**除 `created_at` 外逐字节相同**。`--check` 就是拿它当判据：重算后与落盘记录**逐字段**比对；
 *   `created_at`（记录写入时刻）与 `handling`（人工/追加式的处理状态）是两个人类字段，**不参与复核**。
 *   `created_at` 本身刻意保留：记录是「当时发生了什么」的日志，不是幂等产物。
 *   ★ 条件不能省：`needs_change` 从**目标状态**推出来，而目标状态读的是**今天的工作区现状**
 *     （`fs.statSync` 判存在、`git check-ignore` 判忽略）与**进程级 git 配置**（如 `core.excludesFile`）——
 *     同一对基准在不同工作区状态或不同进程配置下可能得到不同的 `needs_change`（树的哈希部分不受影响，
 *     仍可逐字复核）。**旧文案（已作废，逐字留痕）**：「快照来自内容寻址的提交树 ⇒ 同一对基准连跑两次，
 *     记录**除 `created_at` 外逐字节相同**」——那是无条件承诺，不成立；实测见 `ledger/change-log/README.md`
 *     的「已知局限」一节。
 *
 * 判定 / 读取基准 = **git 索引与提交树**（仓库既定约定，与 check-lib-sync / check-file-ledger /
 *   check-references / 图生成器同构）：一个字节都不读工作区。
 *
 * 退出码：0 成功 / `--check` 全部通过；1 生成失败 / `--check` 有记录不通过（含 `unknown`、`stale`）；
 *         2 命令行用法错误。
 * 用法：node scripts/generate-change-log.cjs [--commit <rev>] [--from <rev> --to <rev|INDEX>]
 *                                          [--change-id <id>] [--check] [--json] [--root <dir>] [--help]
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** 建图实现（唯一事实来源）：与 `ledger/references.json` 用的是同一份 `buildGraph`。 */
const graphGen = require('./generate-reference-graph.cjs');
/** 只借通用的 git / 路径 / 排序工具（`execGit` / `byCodePoint`），不借它的任何判定。 */
const shared = require('./file-ledger-core.cjs');

const TOOL = 'generate-change-log';
const TOOL_VERSION = '1.0.0';

/**
 * 记录目录（相对仓库根，posix）。**不叫 `changes/`**：那是**目标工程**的数据目录（本仓库不存在它，
 * 实测 `git ls-files` 无任何 `changes/` 条目），两者同名会让「记录里的 `change_id` 指向目标工程的
 * `changes/<id>.json`」与「本仓库自己的记录目录」读成同一个东西。
 */
const LOG_DIR_REL = 'ledger/change-log';
/** 记录 Schema（draft 2020-12，**机器判据**：`--check` 用它校验每一条记录，不是文档里的描述）。 */
const SCHEMA_REL = 'ledger/change-log/schema.json';
/** 记录 schema 版本：结构变了必须显式升版，不做静默兼容（与台账 / 图同一条纪律）。 */
const RECORD_SCHEMA_VERSION = 1;
/** 图 schema 版本：记录里如实登记快照来自哪一版图（图升版后复核才有意义）。 */
const GRAPH_SCHEMA_VERSION = graphGen.GRAPH_SCHEMA_VERSION;
/**
 * **图编码 epoch**（`generate-reference-graph.cjs` 的运行时自证摘要）：记录里存的边 id / 字段名都是
 * **编码产物**，编码实现一变，老记录就再也重算不出来——但它一个字节都没错。
 * 记录携带**写它时**的 epoch；复核只在 epoch **相同**时把重算不一致判红（跨编码另立分类，逐条计数回显）。
 */
const GRAPH_ENCODING_EPOCH = graphGen.graphEncodingEpoch();
/** git 的空树（根提交的 from 侧基准）；空集的宇宙摘要由 `universeHashOf([])` 算出。 */
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
/** 记录里数组的上限：超出则**截断数组但保留真实计数**（`counts.*`），绝不静默丢信息。 */
const MAX_LIST = 4096;
/** `summary` 里引用的提交主题截断长度（完整主题在 git 里，记录只给一行人类可读摘要）。 */
const SUMMARY_SUBJECT_MAX = 100;

/** UTF-8 字节序比较（设计稿 §3.6 的 0 容忍项：不用 localeCompare）。 */
const byUtf8 = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));

/**
 * `degradation.status` 的自证说明（**确定性映射**：同一个 status 永远同一句话，因此可参与复核）。
 * 这四句话是降级契约的正文，逐字抄进了 `ledger/change-log/schema.json` 的 description 与同目录 README。
 */
const DEGRADATION_NOTE = {
  complete:
    '两侧快照都完整重建：本次差在**文件层**是完整的（节点 = 全量已跟踪文件，边 = 扫描面产出的全部边）。' +
    '数组为空 = 真的没有差异。',
  partial:
    '差已算出，但存在**已知缺口**（见 reasons 逐条）：缺口范围内的引用可能没有计入本记录——' +
    '不得把本记录读成「没有引用」，也不要把它当完整清单。',
  unknown:
    '差额**不可判定**（基准不可用）：files / edges 的数组为空**不代表**没有差异——判据只能是本字段。' +
    '先修好基准（缺的提交 / 索引 / git 可用性）再重算。',
  stale:
    '本记录描述的**那个状态已经不存在了**（它依赖的基准被改写过：HEAD 移动、索引变化、或提交被重写）：' +
    '记录本身没被证伪，但它已经描述不了今天——不得拿它回答今天的引用面问题。',
};

// ---------------------------------------------------------------------------
// git 小工具（fail-closed：拿不到就返回 null，由调用方按「不可判定」处理，绝不猜）
// ---------------------------------------------------------------------------

function gitTry(root, args) {
  try {
    return { ok: true, out: shared.execGit(root, args) };
  } catch (err) {
    return { ok: false, out: '', err: String((err && (err.stderr || err.message)) || err) };
  }
}

const gitTrim = (root, args) => {
  const r = gitTry(root, args);
  return r.ok ? r.out.trim() : null;
};

/** 一个 rev 是否解析成提交（拿不到 → null，绝不回退到别的提交）。 */
const resolveCommit = (root, rev) => gitTrim(root, ['rev-parse', '--verify', `${rev}^{commit}`]);
/** 提交 → 树对象 id（内容寻址：记录里的「快照身份」就是它）。 */
const treeOfCommit = (root, commit) => gitTrim(root, ['rev-parse', '--verify', `${commit}^{tree}`]);
/** 提交主题（人类可读一行用；拿不到就空串，不编）。 */
const subjectOfCommit = (root, commit) => gitTrim(root, ['log', '-1', '--format=%s', commit]) || '';

/** 浅克隆：历史删除清单拿不全 → `deleted` 态不可判（记录会标 partial，不冒充完整）。 */
function isShallowRepo(root) {
  return gitTrim(root, ['rev-parse', '--is-shallow-repository']) === 'true';
}

/**
 * 一个提交的父提交清单。**fail-closed：拿不到判据就抛错，绝不返回空数组冒充「根提交」。**
 *
 * 为什么不能拿 `git rev-parse --verify <commit>^` 的 null 当「根提交」：那条命令失败的**原因不止一种**
 * ——浅克隆的浅边界、对象库读不出的父提交、git 执行失败，都让它非零退出。把「拿不到」读成「没有父提交」
 * 等于凭空宣布「这个提交之前什么都没有」：记录会照写 `from_snapshot.basis = "empty-tree"`（schema 里这个
 * 取值的意思是「根提交的 from 侧」）与 `degradation.status = "complete"` / `reasons: []`，而 `--check` 会
 * 拿这份伪造的基准重算，逐字段一致 ⇒ **判绿**。这与本仓红线「拿不到判据就不判绿」直接冲突，也与
 * `scripts/generate-reference-graph.cjs` 的 `readDeletedPaths`（同一条 git 命令失败 ⇒ 抛错，不返回空集合）
 * 同口径。
 *
 * 判别用两条**语义不同**的 git 输出，两者一致才认「根提交」：
 *   · `git rev-list --parents -n 1 <commit>` = **遍历视图**（尊重浅克隆的 graft）：成功且只回显该提交本身
 *     ⇒ 视图里没有父提交；**非零退出 ⇒ 拿不到判据（抛错）**。
 *   · `git cat-file -p <commit>` = **对象视图**（提交对象自己写了几个 `parent` 头）：不尊重 graft，因此
 *     「遍历视图说没有父提交、对象说有」这种分歧（浅边界）抓得住——那时同样拿不到真正的父提交判据。
 */
function readParentCommits(root, commit) {
  const walked = gitTry(root, ['rev-list', '--parents', '-n', '1', commit]);
  if (!walked.ok) {
    throw new Error(
      `无法获取提交 ${commit} 的父提交清单（git rev-list --parents -n 1 失败）：${walked.err}\n` +
        '  「拿不到父提交判据」与「这是根提交」是两件事——不得按空树处理（浅克隆请先 git fetch --unshallow）。',
    );
  }
  const fields = walked.out.trim().split(/\s+/).filter(Boolean);
  if (fields.length === 0) {
    throw new Error(`git rev-list --parents -n 1 ${commit} 成功但没有任何回显：拿不到父提交判据，不得按空树处理。`);
  }
  const traversed = fields.slice(1);

  const object = gitTry(root, ['cat-file', '-p', commit]);
  if (!object.ok) {
    throw new Error(`无法读取提交对象 ${commit}（git cat-file -p 失败）：${object.err}\n  拿不到父提交判据，不得按空树处理。`);
  }
  const declared = [];
  for (const line of object.out.split('\n')) {
    if (line === '') break; // 头段结束（此后是提交信息，正文里可能出现任意以 parent 开头的行）
    if (line.startsWith('parent ')) declared.push(line.slice('parent '.length).trim());
  }

  if (traversed.length === 0 && declared.length > 0) {
    throw new Error(
      `提交 ${commit} 的遍历视图里没有父提交，但它的提交对象写着 ${declared.length} 个 parent：` +
        '这是被 graft 过的历史（典型是浅克隆的浅边界或 replace 引用），**不是根提交**——' +
        '拿不到真正的父提交判据，不得按空树处理（浅克隆请先 git fetch --unshallow）。',
    );
  }
  return traversed;
}

// ---------------------------------------------------------------------------
// 快照：提交侧（临时索引 + 空工作树）与索引侧
// ---------------------------------------------------------------------------

/**
 * 在 `env` 生效期间执行 `fn`（`GIT_INDEX_FILE` / `GIT_WORK_TREE` 必须由子进程继承，
 * 而 `execGit` 与建图内核内部的 `spawnSync('git', …)` 都是继承 `process.env` 的）。
 * 无论成败都还原：绝不把临时基准漏给同一进程里的后续调用。
 */
function withGitEnv(env, fn) {
  const saved = new Map();
  for (const [key, value] of Object.entries(env)) {
    saved.set(key, Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined);
    process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

/** 快照对象里除图之外的「身份信息」（记录的 from_snapshot / to_snapshot 就是它）。 */
function snapshotMeta(graph, extra) {
  return {
    basis: extra.basis,
    rev: extra.rev === undefined ? null : extra.rev,
    tree: extra.tree === undefined ? null : extra.tree,
    universe_hash: graph.meta.universe_hash,
    tracked_total: graph.meta.tracked_total,
    files: graph.files.length,
    edges: graph.edges.length,
    analysis_mode: graph.meta.analysis.mode,
  };
}

/**
 * 提交侧快照：把该提交的树物化成一个**临时索引**，工作树指向一个**空目录**，历史基准钉到该提交。
 * 为什么要有空工作树：`git ls-files --others`（untracked / ignored 两个集合）是相对工作树算的，
 * 不换工作树就会把「今天的磁盘」当成「那个提交当时的磁盘」，快照立刻失真。
 * 副作用：只在系统 temp 下建一个目录，跑完删掉（不碰仓库工作区、不写对象库）。
 */
function buildCommitSnapshot(root, commit) {
  const tree = treeOfCommit(root, commit);
  if (!tree) return { error: `提交不可用（拿不到它的树）：${commit}` };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'code-normify-changelog-'));
  const workTree = path.join(tmp, 'wt');
  fs.mkdirSync(workTree);
  try {
    const built = withGitEnv({ GIT_INDEX_FILE: path.join(tmp, 'index'), GIT_WORK_TREE: workTree }, () => {
      const read = gitTry(root, ['read-tree', tree]);
      if (!read.ok) throw new Error(`git read-tree ${tree} 失败：${read.err}`);
      return graphGen.buildGraph(root, { historyRev: commit });
    });
    return { graph: built.graph, snapshot: snapshotMeta(built.graph, { basis: 'commit', rev: commit, tree }) };
  } catch (err) {
    return { error: `提交快照构建失败：${commit} —— ${err.message}` };
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* 删不掉不影响结论（temp 目录由系统回收） */
    }
  }
}

/** 索引侧快照：当前仓库（判定 / 读取基准 = git 索引，与其余门禁同一条约定）。 */
function buildIndexSnapshot(root) {
  const built = graphGen.buildGraph(root, {});
  // 刻意**不写**树对象：算索引的树要 `git write-tree`，那会往对象库写东西（记录生成不该有写副作用）。
  // 索引侧的身份由 universe_hash（= 已跟踪文件清单的摘要）承担，`stale` 的判据也是它。
  return { graph: built.graph, snapshot: snapshotMeta(built.graph, { basis: 'index', rev: null, tree: null }) };
}

/**
 * 根提交的 from 侧：空树。空集的图就是「零节点零边」，身份 = 空清单的宇宙摘要。
 * `analysis_mode` 写 `typescript`：空集没有可解析的边，模式对它没有意义（真正决定降级的是另一侧）。
 */
function emptySnapshot() {
  const graph = { meta: { universe_hash: graphGen.universeHashOf([]), tracked_total: 0, analysis: { mode: 'typescript' } }, files: [], edges: [] };
  return { graph, snapshot: snapshotMeta(graph, { basis: 'empty-tree', rev: null, tree: EMPTY_TREE }) };
}

// ---------------------------------------------------------------------------
// 差：文件 / 边 / 受影响的引用方
// ---------------------------------------------------------------------------

/**
 * 两份快照之差。**文件层**：节点 id 差 **+ 状态差**；**边层**：边 id 差 **+ 解析状态差**。
 *
 * 为什么必须有「状态差」这一栏（不是可选装饰）：一个被删除、但**仍然被人引用**的文件，在 to 快照里
 * 仍然是一个节点（`state: "deleted"`，图的四态之一），它的边也仍然在（id 里不含状态）——
 * 只比 id 的话，**「删了某个东西之后谁还在引用它」这条最核心的问句会得到一张空表**。
 * 这不是假设：本仓 `ed404e5`（一次真实的删除提交：删掉一个仍被 README.md 链接的文件）就是这种形状。
 *
 * 注意边 id 里含 `文件:行:列`：同一个引用只是行号挪了，会表现为一条 removed + 一条 added——
 * 这是 id 级判定的**已知 churn**，如实落盘（要更稳的身份得等符号级图，增量 3）。
 */
function computeDiff(fromGraph, toGraph) {
  const fromFiles = new Map(fromGraph.files.map((f) => [f.id, f]));
  const toFiles = new Map(toGraph.files.map((f) => [f.id, f]));
  const fromEdges = new Map(fromGraph.edges.map((e) => [e.id, e]));
  const toEdges = new Map(toGraph.edges.map((e) => [e.id, e]));

  const filesAdded = [...toFiles.keys()].filter((id) => !fromFiles.has(id)).sort(byUtf8);
  const filesRemoved = [...fromFiles.keys()].filter((id) => !toFiles.has(id)).sort(byUtf8);
  /** 两侧都在、状态变了（典型：`indexed` → `deleted`：文件被删了，但仍有人引用，所以它还是节点）。 */
  const filesStateChanged = [...toFiles.keys()]
    .filter((id) => fromFiles.has(id) && fromFiles.get(id).state !== toFiles.get(id).state)
    .sort(byUtf8)
    .map((id) => ({ file: id, from: fromFiles.get(id).state, to: toFiles.get(id).state }));

  const edgesAdded = [...toEdges.keys()].filter((id) => !fromEdges.has(id)).sort(byUtf8);
  const edgesRemoved = [...fromEdges.keys()].filter((id) => !toEdges.has(id)).sort(byUtf8);
  /** 两侧都在、解析状态或目标状态变了（典型：`resolved` → `dangling`：目标被删了）。 */
  const edgesStatusChanged = [...toEdges.keys()]
    .filter(
      (id) =>
        fromEdges.has(id) &&
        (fromEdges.get(id).status !== toEdges.get(id).status || fromEdges.get(id).to.state !== toEdges.get(id).to.state),
    )
    .sort(byUtf8)
    .map((id) => ({
      edge: id,
      from_status: fromEdges.get(id).status,
      to_status: toEdges.get(id).status,
      from_target_state: fromEdges.get(id).to.state === undefined ? null : fromEdges.get(id).to.state,
      to_target_state: toEdges.get(id).to.state === undefined ? null : toEdges.get(id).to.state,
    }));

  /** 目标「不可用」= 目标真的不在那里（`missing` / `deleted`）。外部目标（`outside`）不算：那不是断链。 */
  const unusable = (edge) => Boolean(edge) && edge.to.state !== undefined && (edge.to.state === 'deleted' || edge.to.state === 'missing');

  const referrer = (edge, classification, needsChange, edgeStatus) => ({
    edge: edge.id,
    file: edge.from.file,
    line: edge.from.line,
    column: edge.from.column,
    kind: edge.kind,
    target: edge.to.file === undefined ? null : edge.to.file,
    target_state: edge.to.state === undefined ? null : edge.to.state,
    edge_status: edgeStatus,
    classification,
    needs_change: needsChange,
  });

  /**
   * ① 悬空目标：TO 里这条边还在、可它的目标在 TO 里不可用，而本次改动**之前它是可用的**
   *   （边是新增的，或同 id 的边当时不悬空/目标当时还在）→ **必须改**（needs_change = true）。
   *   两种形状都在这里：目标文件被整个删掉（节点消失），或目标被删但仍有人引用（节点变 deleted）。
   *   历史遗留的悬空边（两侧都悬空、与本次改动无关）不算「受本次改动影响」，故排除。
   */
  const danglingTarget = toGraph.edges
    .filter((e) => unusable(e) && !unusable(fromEdges.get(e.id)))
    .map((e) => referrer(e, 'dangling-target', true, e.status));
  const danglingIds = new Set(danglingTarget.map((r) => r.edge));

  /** ② 消失的边：FROM 里有、TO 里没有 → 引用方自己被改写（或引用方被删）→ 不需改，但要有人看。 */
  const removedRefs = edgesRemoved.map((id) => referrer(fromEdges.get(id), 'edge-removed', false, null));

  /** ③ 新增的边：TO 里有、FROM 里没有 → 引用面新增（① 已列过的不重复）。 */
  const addedRefs = edgesAdded
    .filter((id) => !danglingIds.has(id))
    .map((id) => referrer(toEdges.get(id), 'edge-added', false, toEdges.get(id).status));

  const all = [...danglingTarget, ...removedRefs, ...addedRefs].sort((a, b) => {
    const f = byUtf8(a.file, b.file);
    if (f !== 0) return f;
    if (a.line !== b.line) return a.line - b.line;
    if (a.column !== b.column) return a.column - b.column;
    const k = byUtf8(a.kind, b.kind);
    if (k !== 0) return k;
    const t = byUtf8(a.target || '', b.target || '');
    if (t !== 0) return t;
    return byUtf8(a.classification, b.classification);
  });

  return {
    filesAdded,
    filesRemoved,
    filesStateChanged,
    edgesAdded,
    edgesRemoved,
    edgesStatusChanged,
    referrers: all,
    counts: {
      files_added: filesAdded.length,
      files_removed: filesRemoved.length,
      files_state_changed: filesStateChanged.length,
      edges_added: edgesAdded.length,
      edges_removed: edgesRemoved.length,
      edges_status_changed: edgesStatusChanged.length,
      affected_referrers: all.length,
      needs_change: all.filter((r) => r.needs_change).length,
    },
  };
}

// ---------------------------------------------------------------------------
// 记录：组装 / 序列化 / 命名
// ---------------------------------------------------------------------------

/**
 * 降级判定。四条判据都是**机器可判**的，不猜：
 *   · `specifier-analysis-regex-fallback` —— 任一侧快照的解析模式不是 typescript（说明符边可能不全）→ partial；
 *   · `history-unavailable` —— 浅克隆：历史删除清单拿不全，`deleted` 态不可判 → partial；
 *   · `index-basis-moved` —— `kind: index` 的记录，它描述的暂存态已被后续的 `git add` / 提交改掉 → stale；
 *   · 其余 → complete。
 * `unknown` **不在生成时产生**：生成时基准不可用就直接 exit 1（绝不写一条假装有内容的记录）；
 * 它由 `--check` 在「基准已不可用」时给出（见 verifyRecord）。
 */
function degradationOf(kind, modes, shallow, basisMoved) {
  const reasons = [];
  if (kind === 'index' && basisMoved) reasons.push('index-basis-moved');
  for (const mode of modes) {
    if (mode !== 'typescript') {
      reasons.push('specifier-analysis-regex-fallback');
      break;
    }
  }
  if (shallow) reasons.push('history-unavailable');
  const status = reasons.includes('index-basis-moved') ? 'stale' : reasons.length > 0 ? 'partial' : 'complete';
  return { status, reasons, note: DEGRADATION_NOTE[status] };
}

const shortHash = (commit) => (commit ? commit.slice(0, 7) : 'unknown');

/**
 * 记录文件名：`<utc-iso8601 紧凑式>-<短哈希>[-index].json`（设计稿 §4.4；**去掉了冒号**，Windows 文件名不允许 `:`）。
 *
 * `-index` 只加在 `kind === 'index'` 上，理由是硬的：`--index` 的 commit 侧取的就是 **HEAD**，与
 * `--commit HEAD` 是**同一个短哈希**，而时间戳只到秒 ⇒ 同一秒内两者**同名**；幂等键是 (kind, commit)、
 * 两者 kind 不同 ⇒ 判不出重复；再碰上裸 `writeFileSync`（无 `wx`）就是**静默互相覆盖**——与
 * `ledger/change-log/README.md`「短哈希避免同一秒内两次写入撞名」那句明文承诺直接冲突。
 * kind 本来就是幂等键的一半，名称里就必须有它。（`--commit` 的记录名**一个字符都不变**：
 * 已落盘的记录全是 commit 记录，逐条可复核性、文件名、README 里的示例 `…-ed404e5.json` 都不动。
 * **条数是活值 —— 取数、不复述**：现值 = `node scripts/generate-change-log.cjs --check` 末行
 * `（N/M 条）` 的分母，或 `(git ls-files "ledger/change-log/*.json" | Measure-Object).Count`；
 * **留痕（时点 = 第五轮总审批开工版 `9e6a077`；只作留痕，不是现值 —— 旧值不删）**：原注释在此写死
 * 「已落盘的 **96** 条」，该时点实测实为 **97**。）
 */
function recordFileName(createdAt, commit, kind) {
  const suffix = kind === 'index' ? '-index' : '';
  return `${createdAt.replace(/[-:]/g, '')}-${shortHash(commit)}${suffix}.json`;
}

/**
 * 组装一条记录。`created_at` 在这里占位（`null`），写盘时由调用方补上真实时刻。
 * 组装与复核走**同一条代码路径**（`--check` 重算后再调用本函数），复核才可能真的发现漂移。
 */
function assembleRecord({ kind, commit, commitParent, from, to, changeId, subject, shallow, basisMoved }) {
  const diff = computeDiff(from.graph, to.graph);
  const degradation = degradationOf(kind, [from.snapshot.analysis_mode, to.snapshot.analysis_mode], shallow, basisMoved);

  const label = kind === 'commit' ? `提交 ${shortHash(commit)}` : `暂存态（基准 ${shortHash(commit)}）`;
  const head = subject ? `${label}（${subject.slice(0, SUMMARY_SUBJECT_MAX)}）` : label;
  const c = diff.counts;
  const summary =
    `${head}：文件 +${c.files_added}/−${c.files_removed}/±${c.files_state_changed} · ` +
    `边 +${c.edges_added}/−${c.edges_removed}/±${c.edges_status_changed} · ` +
    `受影响引用方 ${c.affected_referrers} 条（需改 ${c.needs_change} 条）`;

  return {
    schema_version: RECORD_SCHEMA_VERSION,
    kind,
    commit,
    commit_parent: commitParent === undefined ? null : commitParent,
    cas_digest: null, // cas-write 观测点本批未实现（schema 用 const null 钉住，不假装支持）
    change_id: changeId === undefined ? null : changeId,
    created_at: null, // 占位：写盘时填「记录写入时刻」；--check 不比对它（人类字段）
    generator: 'scripts/generate-change-log.cjs',
    generator_version: TOOL_VERSION,
    graph_schema_version: GRAPH_SCHEMA_VERSION,
    // 写这条记录时，图编码的 epoch（见 GRAPH_ENCODING_EPOCH）。**老记录没有这个字段** —— 那就是「旧编码」。
    graph_encoding: GRAPH_ENCODING_EPOCH,
    from_snapshot: from.snapshot,
    to_snapshot: to.snapshot,
    degradation,
    files: {
      added: diff.filesAdded.slice(0, MAX_LIST),
      removed: diff.filesRemoved.slice(0, MAX_LIST),
      state_changed: diff.filesStateChanged.slice(0, MAX_LIST),
    },
    edges: {
      added: diff.edgesAdded.slice(0, MAX_LIST),
      removed: diff.edgesRemoved.slice(0, MAX_LIST),
      status_changed: diff.edgesStatusChanged.slice(0, MAX_LIST),
    },
    affected_referrers: diff.referrers.slice(0, MAX_LIST),
    // 真实计数（截断时与数组长度不等——**判据是 counts，不是数组长度**；见 schema.json 的说明）。
    counts: diff.counts,
    // 处理状态的粒度 = **整条记录**（设计稿 §4.5）。逐条引用方勾选需要一个可写源，本批不做（见 omitted）。
    handling: { status: 'pending', by: null, at: null, note: null },
    summary,
    omitted: [
      'declarations（符号级节点差，增量 3）',
      'type-reference 边（增量 3）',
      '传递闭包（affected_referrers 只到直接引用方，depth 恒 1；增量 5）',
      '查询接口（增量 5）',
      'cas-write 观测点（设计稿 §4.1 的第二个观测点，本批不实现）',
    ],
  };
}

/** 与图同一口径的序列化（`JSON.stringify(…, null, 2)` + 尾随换行、UTF-8 无 BOM、LF）。 */
function serialize(record) {
  return `${JSON.stringify(record, null, 2)}\n`;
}

// ---------------------------------------------------------------------------
// 生成
// ---------------------------------------------------------------------------

/** 解析 git rev（fail-closed：不给「大概就是这个」的猜测）。 */
function resolveBasis(root, rev, what) {
  const commit = resolveCommit(root, rev);
  if (!commit) return { error: `${what}不可用：${rev}（git rev-parse --verify 失败；浅克隆请先 git fetch --unshallow）` };
  return { commit };
}

/** 记录目录下的记录文件（排除 schema.json），按文件名 UTF-8 字节序升序。 */
function listRecordFiles(root) {
  const dir = path.join(root, ...LOG_DIR_REL.split('/'));
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json') && e.name !== path.basename(SCHEMA_REL))
    .map((e) => e.name)
    .sort(byUtf8);
}

const readRecord = (root, name) => JSON.parse(fs.readFileSync(path.join(root, ...LOG_DIR_REL.split('/'), name), 'utf8'));

/** 同一条基准是否已经有记录（幂等：同 kind + 同 commit 不写第二条）。 */
function findExistingRecord(root, kind, commit) {
  for (const name of listRecordFiles(root)) {
    let rec;
    try {
      rec = readRecord(root, name);
    } catch {
      continue; // 坏文件交给 --check 报，这里不误伤
    }
    if (rec && rec.kind === kind && rec.commit === commit) return name;
  }
  return null;
}

/**
 * 生成一条记录。
 * `kind === 'index'` 时 to 侧 = 当前索引；否则两侧都是提交（from = 显式给的 rev 或 to 的父提交）。
 */
function generate(root, spec) {
  const shallow = isShallowRepo(root);
  let from;
  let to;
  let commit;
  let commitParent = null;

  if (spec.kind === 'index') {
    const base = resolveBasis(root, spec.fromRev, 'from 基准提交');
    if (base.error) return { error: base.error };
    commit = base.commit;
    const built = buildCommitSnapshot(root, commit);
    if (built.error) return { error: built.error };
    from = { graph: built.graph, snapshot: built.snapshot };
    let idx;
    try {
      idx = buildIndexSnapshot(root);
    } catch (err) {
      return { error: `索引快照构建失败：${err.message}` };
    }
    to = { graph: idx.graph, snapshot: idx.snapshot };
  } else {
    const toResolved = resolveBasis(root, spec.toRev, 'to 基准提交');
    if (toResolved.error) return { error: toResolved.error };
    commit = toResolved.commit;
    const builtTo = buildCommitSnapshot(root, commit);
    if (builtTo.error) return { error: builtTo.error };
    to = { graph: builtTo.graph, snapshot: builtTo.snapshot };

    if (spec.fromRev) {
      const fromResolved = resolveBasis(root, spec.fromRev, 'from 基准提交');
      if (fromResolved.error) return { error: fromResolved.error };
      commitParent = fromResolved.commit;
      const builtFrom = buildCommitSnapshot(root, commitParent);
      if (builtFrom.error) return { error: builtFrom.error };
      from = { graph: builtFrom.graph, snapshot: builtFrom.snapshot };
    } else {
      // 未显式给 from：用 to 的父提交；**根提交**才退到「空树」（basis = empty-tree，如实登记）。
      // 「拿不到父提交判据」**不**走这一支：readParentCommits 会抛错（见它的注释——把「拿不到」读成
      // 「根提交」会让记录照写 basis=empty-tree + degradation.status=complete，而 --check 会判绿）。
      let parents;
      try {
        parents = readParentCommits(root, commit);
      } catch (err) {
        return { error: err.message };
      }
      if (parents.length > 0) {
        commitParent = parents[0];
        const builtFrom = buildCommitSnapshot(root, commitParent);
        if (builtFrom.error) return { error: builtFrom.error };
        from = { graph: builtFrom.graph, snapshot: builtFrom.snapshot };
      } else {
        from = emptySnapshot();
      }
    }
  }

  const record = assembleRecord({
    kind: spec.kind,
    commit,
    commitParent,
    from,
    to,
    changeId: spec.changeId,
    subject: subjectOfCommit(root, commit),
    shallow,
    basisMoved: false,
  });
  return { record, commit, kind: spec.kind };
}

// ---------------------------------------------------------------------------
// 复核（--check）：结构校验 + 重算逐字段比对
// ---------------------------------------------------------------------------

/** 结构化差异的第一个路径（复核报错要点名到字段，不能只说「不一致」）。 */
function firstDiff(a, b, at = '') {
  if (a === b) return null;
  const bothObjects = a && b && typeof a === 'object' && typeof b === 'object';
  if (!bothObjects) return `${at || '<root>'}（记录 ${JSON.stringify(a)} ≠ 重算 ${JSON.stringify(b)}）`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${at || '<root>'}（一边是数组一边不是）`;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return `${at}（长度 ${a.length} ≠ ${b.length}）`;
    for (let i = 0; i < a.length; i += 1) {
      const d = firstDiff(a[i], b[i], `${at}[${i}]`);
      if (d) return d;
    }
    return null;
  }
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].sort(byUtf8);
  for (const key of keys) {
    const d = firstDiff(a[key], b[key], at ? `${at}.${key}` : key);
    if (d) return d;
  }
  return null;
}

/** 复核时不参与比对的字段：`created_at`（记录写入时刻）与 `handling`（人工 / 追加式处理状态）。 */
function projectionOf(record) {
  // `graph_encoding` 与 `created_at` / `handling` 同类：它是**记录自身的元信息**（写它时用的是哪套编码），
  // 不是被判定的内容 —— 参与比对的话，每条跨编码记录都会「因为元信息不同」而必然不一致，等于没比。
  const { created_at, handling, graph_encoding, ...rest } = record;
  return rest;
}

const isSortedUnique = (list) => {
  for (let i = 1; i < list.length; i += 1) {
    if (byUtf8(list[i - 1], list[i]) >= 0) return false;
  }
  return true;
};

/** Schema 之外的结构不变量（ajv 表达不了的那几条）：有序、去重、截断规则、外键格式。 */
function structuralProblems(record) {
  const problems = [];
  const pairs = [
    ['files.added', record.files && record.files.added, 'files_added', (x) => x],
    ['files.removed', record.files && record.files.removed, 'files_removed', (x) => x],
    ['files.state_changed', record.files && record.files.state_changed, 'files_state_changed', (x) => x && x.file],
    ['edges.added', record.edges && record.edges.added, 'edges_added', (x) => x],
    ['edges.removed', record.edges && record.edges.removed, 'edges_removed', (x) => x],
    ['edges.status_changed', record.edges && record.edges.status_changed, 'edges_status_changed', (x) => x && x.edge],
  ];
  for (const [path_, list, countKey, keyOf] of pairs) {
    if (!Array.isArray(list)) continue;
    const keys = list.map(keyOf).filter((k) => typeof k === 'string');
    if (keys.length !== list.length) {
      problems.push(`${path_} 的每一条都必须带 id 字符串（生成器恒如此；手改会破坏可比性）`);
    } else if (!isSortedUnique(keys)) {
      problems.push(`${path_} 必须按 id 的 UTF-8 字节序升序且不重复（生成器恒如此；手改会破坏可比性）`);
    }
    if (typeof record.counts[countKey] === 'number' && list.length > record.counts[countKey]) {
      problems.push(`${path_} 长度 ${list.length} 超过 counts.${countKey} = ${record.counts[countKey]}（截断只能让数组变短）`);
    }
  }
  if (Array.isArray(record.affected_referrers) && record.counts && typeof record.counts.affected_referrers === 'number') {
    if (record.affected_referrers.length > record.counts.affected_referrers) {
      problems.push(`affected_referrers 长度超过 counts.affected_referrers`);
    }
    if (record.counts.needs_change > record.counts.affected_referrers) {
      problems.push('counts.needs_change 不能大于 counts.affected_referrers');
    }
  }
  if (record.change_id !== null && typeof record.change_id === 'string' && !/^[A-Za-z0-9._-]+$/.test(record.change_id)) {
    problems.push(`change_id ${JSON.stringify(record.change_id)} 不是合法文件名（外键指 changes/<id>.json）`);
  }
  return problems;
}

let cachedValidator = null;
function validatorFor(root) {
  if (cachedValidator && cachedValidator.root === root) return cachedValidator.validate;
  const schemaAbs = path.join(root, ...SCHEMA_REL.split('/'));
  if (!fs.existsSync(schemaAbs)) throw new Error(`记录 Schema 不存在：${SCHEMA_REL}（判据必须是机器可读的，不能只写在文档里）`);
  const Ajv2020 = require('ajv/dist/2020');
  const AjvCtor = Ajv2020.default || Ajv2020;
  const ajv = new AjvCtor({ strict: false, allErrors: true });
  const validate = ajv.compile(JSON.parse(fs.readFileSync(schemaAbs, 'utf8')));
  cachedValidator = { root, validate };
  return validate;
}

const validateShape = (validate, record) =>
  validate(record) ? null : validate.errors.map((e) => `${e.instancePath || '<root>'} ${e.message}`).join('；');

/**
 * 复核一条记录。四种结论（与 degradation 的四态同名，但这里是**复核结论**，不是记录里那个字段）：
 *   · 通过（complete / partial）—— 重算结果与记录逐字段相同（除 created_at / handling）；
 *   · `stale` —— 记录描述的基准已经变了（kind = index：HEAD 移动或索引变了）；
 *   · `unknown` —— 基准不可用 / 结构不合规 / 重算不一致：**未证伪也未证实**（或已证伪），一律不判绿。
 */
function verifyRecord(root, name, validate) {
  let record;
  try {
    record = readRecord(root, name);
  } catch (err) {
    return { name, ok: false, status: 'unknown', problems: [`不是合法 JSON：${err.message}`] };
  }
  const shape = validateShape(validate, record);
  const problems = shape ? [`不符合 ${SCHEMA_REL}：${shape}`] : structuralProblems(record);
  if (problems.length > 0) return { name, ok: false, status: 'unknown', problems, record };

  // 编码 epoch：`null` = 老记录（该字段是后加的）⇒ 一律按「旧编码」对待。
  const recordEncoding = typeof record.graph_encoding === 'string' && record.graph_encoding !== '' ? record.graph_encoding : null;
  const crossEncoding = recordEncoding !== GRAPH_ENCODING_EPOCH;

  for (const other of listRecordFiles(root)) {
    if (other === name) continue;
    let r;
    try {
      r = readRecord(root, other);
    } catch {
      continue;
    }
    if (r && r.kind === record.kind && r.commit === record.commit && (r.commit_parent || null) === (record.commit_parent || null)) {
      return {
        name,
        ok: false,
        status: 'unknown',
        problems: [`同一条基准（kind=${record.kind}，commit=${record.commit}）还有别的记录：${other}——一条基准只允许一条记录`],
        record,
      };
    }
  }

  let currentIndex = null;
  if (record.kind === 'index') {
    // 暂存态记录：基准一变就是 stale（记录没被证伪，但它描述的那个状态不存在了）。
    try {
      currentIndex = buildIndexSnapshot(root);
    } catch (err) {
      return { name, ok: false, status: 'unknown', problems: [`当前索引快照构建失败，无法复核：${err.message}`], record };
    }
    const currentHead = resolveCommit(root, 'HEAD');
    const reasons = [];
    if (currentIndex.snapshot.universe_hash !== record.to_snapshot.universe_hash) reasons.push('index-basis-moved');
    if (currentHead && currentHead !== record.commit) reasons.push('head-moved');
    if (reasons.length > 0) {
      return {
        name,
        ok: false,
        status: 'stale',
        problems: [
          `记录描述的暂存态已经不存在（${reasons.join('、')}）：记录 to_snapshot.universe_hash = ${String(
            record.to_snapshot.universe_hash,
          ).slice(0, 16)}…，当前索引 = ${currentIndex.snapshot.universe_hash.slice(0, 16)}…。` +
            '重算没有意义，故不比对（stale ≠ 记录有错；它只是描述不了今天）。',
        ],
        record,
      };
    }
  }

  let from;
  if (record.from_snapshot.basis === 'empty-tree') {
    from = emptySnapshot();
  } else {
    const fromRev = record.from_snapshot.rev || record.commit_parent;
    if (!fromRev) {
      return { name, ok: false, status: 'unknown', problems: ['记录没有可用的 from 基准（basis 既不是 empty-tree，也没有 rev / commit_parent）'], record };
    }
    const builtFrom = buildCommitSnapshot(root, fromRev);
    if (builtFrom.error) {
      return { name, ok: false, status: 'unknown', problems: [`基准不可用，无法复核：${builtFrom.error}（未证伪也未证实——不得当绿）`], record };
    }
    from = { graph: builtFrom.graph, snapshot: builtFrom.snapshot };
  }
  const builtTo =
    record.kind === 'index'
      ? // 暂存态记录的 to 侧 = **当前索引**（上面刚刚确认它还是记录描述的那一份，否则早就按 stale 返回了）。
        { graph: currentIndex.graph, snapshot: currentIndex.snapshot }
      : buildCommitSnapshot(root, record.commit);
  if (builtTo.error) {
    return { name, ok: false, status: 'unknown', problems: [`基准不可用，无法复核：${builtTo.error}（未证伪也未证实——不得当绿）`], record };
  }
  const to = { graph: builtTo.graph, snapshot: builtTo.snapshot };

  const expected = assembleRecord({
    kind: record.kind,
    commit: record.commit,
    commitParent: record.commit_parent,
    from,
    to,
    changeId: record.change_id,
    subject: subjectOfCommit(root, record.commit),
    shallow: isShallowRepo(root),
    basisMoved: false,
  });
  const mismatch = firstDiff(projectionOf(record), projectionOf(expected));
  if (mismatch) {
    // **跨编码**：记录是**另一套编码**写的（缺 `graph_encoding` 或与当前 epoch 不同），内容对不上是必然的，
    // 不是记录有错。归入 `cross-encoding`（**计数、逐条点名、在汇总里可见**），不放行也不判红。
    // **同 epoch 的不一致照旧判红**（下面这一支就是它）——只有「已证明是跨编码」才走上面那条。
    if (crossEncoding) {
      return {
        name,
        ok: true,
        status: 'cross-encoding',
        crossEncoding: true,
        recompute: 'mismatch',
        problems: [
          `记录由**另一套图编码**写成（记录 graph_encoding = ${recordEncoding === null ? '（缺失，早于该字段引入）' : JSON.stringify(recordEncoding)}，` +
            `当前 epoch = ${GRAPH_ENCODING_EPOCH}）：重算不一致的字段是 ${mismatch}。` +
            '这不是「记录有错」也不是「已复核通过」——它是**跨编码不可复核**：记录本身一个字节都没动，' +
            '只是重算它需要当年那套编码。**同 epoch 下的任何不一致仍照旧判红。**',
        ],
        record,
      };
    }
    return { name, ok: false, status: 'unknown', problems: [`重算结果与记录不一致：字段 ${mismatch}`], record };
  }
  // epoch 不同但重算逐字段相同：内容确实复核过了，不该冒充「不可复核」；但仍如实标出它来自旧编码
  // （不算新分类，只计数 + `--json` 明细；**只有重算对不上的那些**才进 `cross-encoding`）。
  if (crossEncoding) return { name, ok: true, status: record.degradation.status, crossEncoding: true, recompute: 'match', problems: [], record };
  return { name, ok: true, status: record.degradation.status, problems: [], record };
}

function checkAll(root) {
  const names = listRecordFiles(root);
  let validate;
  try {
    validate = validatorFor(root);
  } catch (err) {
    return { ok: false, names, results: [], errors: [err.message] };
  }
  const results = names.map((name) => verifyRecord(root, name, validate));
  return { ok: results.every((r) => r.ok), names, results, errors: [] };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { root: null, commit: null, from: null, to: null, index: false, changeId: null, check: false, json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') opts.check = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--index') opts.index = true;
    else if (arg === '--commit') opts.commit = argv[++i];
    else if (arg.startsWith('--commit=')) opts.commit = arg.slice('--commit='.length);
    else if (arg === '--from') opts.from = argv[++i];
    else if (arg.startsWith('--from=')) opts.from = arg.slice('--from='.length);
    else if (arg === '--to') opts.to = argv[++i];
    else if (arg.startsWith('--to=')) opts.to = arg.slice('--to='.length);
    else if (arg === '--change-id') opts.changeId = argv[++i];
    else if (arg.startsWith('--change-id=')) opts.changeId = arg.slice('--change-id='.length);
    else if (arg === '--root') {
      opts.root = argv[i + 1];
      i += 1;
      if (!opts.root) throw new Error('--root 需要一个目录参数');
    } else if (arg.startsWith('--root=')) opts.root = arg.slice('--root='.length);
    else throw new Error(`未知参数：${arg}`);
  }
  if (opts.commit !== null && !opts.commit) throw new Error('--commit 需要一个提交参数');
  if (opts.from !== null && !opts.from) throw new Error('--from 需要一个提交参数');
  if (opts.to !== null && !opts.to) throw new Error('--to 需要一个提交参数或 INDEX');
  if (opts.changeId !== null && !opts.changeId) throw new Error('--change-id 需要一个 id 参数');
  return opts;
}

/** 用法判定（模式互斥，宁可 exit 2 也不猜用户想干什么）。 */
function resolveSpec(opts) {
  const explicit = opts.from !== null || opts.to !== null || opts.index || opts.commit !== null;
  if (opts.check) {
    if (explicit) throw new Error('--check 只校验已有记录，不与 --commit / --from / --to / --index 同时使用');
    return null;
  }
  if (opts.index) {
    if (opts.commit !== null || opts.to !== null) throw new Error('--index 与 --commit / --to 互斥（--index = --from HEAD --to INDEX）');
    return { kind: 'index', fromRev: opts.from || 'HEAD' };
  }
  if (opts.from !== null || opts.to !== null) {
    if (opts.from === null || opts.to === null) throw new Error('--from 与 --to 必须成对出现（要记录一次提交就用 --commit <rev>）');
    if (opts.to === 'INDEX') return { kind: 'index', fromRev: opts.from };
    return { kind: 'commit', fromRev: opts.from, toRev: opts.to };
  }
  return { kind: 'commit', toRev: opts.commit || 'HEAD' };
}

/** `change_id` 是**可选外键**：只在它真的指得到一个文件时才写（本仓库没有 `changes/` → 这个参数会红）。 */
function requireChangeId(root, changeId) {
  if (changeId === null) return null;
  const rel = `changes/${changeId}.json`;
  if (!fs.existsSync(path.join(root, 'changes', `${changeId}.json`))) {
    throw new Error(
      `--change-id ${changeId} 指向 ${rel}，但该文件不存在。外键**不得凭空写**：本仓库没有 changes/ 目录` +
        '（changes 只是**目标工程**数据目录的源根名，见设计稿 §4.3），所以本仓库的记录 change_id 恒为 null；' +
        '要关联目标工程的变更，请在目标工程里生成记录。',
    );
  }
  return changeId;
}

/** --root 的 fail-closed 约定（与其它门禁同构）：显式给了就绝不回退。 */
function resolveRoot(explicit, cwd = process.cwd()) {
  if (explicit) {
    const abs = path.resolve(cwd, explicit);
    if (!fs.existsSync(abs)) throw new Error(`--root 指向的目录不存在：${abs}（已 fail-closed：绝不回退到本脚本所在仓库）`);
    if (!fs.statSync(abs).isDirectory()) throw new Error(`--root 必须是一个目录：${abs}`);
    let top = null;
    try {
      top = shared.execGit(abs, ['rev-parse', '--show-toplevel']).trim();
    } catch (err) {
      throw new Error(`--root 不是 git 仓库：${abs}（${err.message}）`);
    }
    if (path.resolve(top) !== abs) throw new Error(`--root 必须是仓库根（git 顶层 = ${top}）：${abs}`);
    return abs;
  }
  try {
    return shared.execGit(cwd, ['rev-parse', '--show-toplevel']).trim();
  } catch {
    return path.resolve(__dirname, '..');
  }
}

function printHelp() {
  const lines = [
    `${TOOL} v${TOOL_VERSION} — 改动记录生成器（增量 2 骨架；schema_version ${RECORD_SCHEMA_VERSION}）`,
    '',
    '一条记录 = 引用图两份快照之差（文件/边的新增与消失 + 受影响的引用方 + 处理状态）。',
    '观测点 = **每次提交**；「每次保存」需要常驻文件监听，明确不在范围内。',
    '',
    '用法：',
    '  node scripts/generate-change-log.cjs [选项]',
    '',
    '选项：',
    '  --commit <rev>    为一次提交写记录：from = <rev> 的父提交（**只有真的是根提交**才取空树），to = <rev>；默认 HEAD',
    '                    「拿不到父提交判据」不按空树处理：直接生成失败（exit 1），绝不给一份伪造的完整差',
    '  --from <rev>      显式指定 from（必须与 --to 成对）',
    '  --to <rev|INDEX>  显式指定 to；INDEX = 当前 git 索引（暂存态：未落定的观测点，kind = "index"）',
    '  --index           等价于 --from HEAD --to INDEX（暂存态记录；它描述的基准一变即为 stale）',
    '  --change-id <id>  可选外键：目标工程的 changes/<id>.json（**本仓库没有该目录**，故本参数会 fail-closed）',
    '  --check           只校验不写盘：记录逐条按 schema 校验 + **重算逐字段复核**',
    '  --root <dir>      指定仓库根（默认：git 顶层目录）；非 git 根 → 报错退出 1（绝不回退）',
    '  --json            打印机器可读摘要',
    '  -h, --help        打印本帮助',
    '',
    '退出码：0 成功（含 --check 全部通过）/ 1 生成失败或复核不通过 / 2 用法错误',
    '',
    `产物：${LOG_DIR_REL}/<utc-iso8601 紧凑式>-<短哈希>[-index].json（单文件一条记录，只增不改）`,
    `Schema：${SCHEMA_REL}（draft 2020-12；--check 的判据就是它，不是文档里的描述）`,
    '',
    '读 / 写：',
    '  读：git 对象（`--commit` / `--from` / `--to` 指定的 rev，或索引）——两侧快照都用与',
    '      ledger/references.json 同一份 buildGraph 重建，**不读工作区那份图**；另读上面的 Schema 与已有记录；',
    `  写：${LOG_DIR_REL}/<utc-iso8601 紧凑式>-<短哈希>[-index].json（--check 不写盘；同一基准已有记录时不重复写；` +
      '文件名被占用则失败，绝不覆盖）。',
    '',
    'check 链位置（npm 脚本 `check` 的实际顺序，环名照抄）：',
    '  第 12 环 `npm run check:changes`（= 本脚本，链上以 `--check` 调用）——前一环是第 11 环 `npm run check:graph`，',
    '  后一环是第 13 环 `npm run check:impact`。',
    '',
    '降级契约（degradation.status，**不得把「不知道」读成「没有引用」**）：',
    '  · complete —— 两侧快照完整重建，差在文件层完整；数组为空 = 真的没有差异；',
    '  · partial  —— 差已算出但有已知缺口（reasons 逐条）：缺口内的引用可能没计入，不得当完整清单；',
    '  · unknown  —— 差额不可判定（基准不可用）：数组为空**不代表**没有差异；--check 遇此**不判绿**；',
    '  · stale    —— 记录描述的那个状态已经不存在（HEAD 移动 / 索引变化 / 提交被重写）：未证伪，但已失效。',
    '',
    '本批**不做**（产物里 omitted 字段自证）：符号级声明差（增量 3）、type-reference 边、传递闭包、',
    '查询接口（增量 5）、cas-write 观测点。',
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n运行 \`node scripts/generate-change-log.cjs --help\` 查看用法。\n`);
    process.exitCode = 2;
    return;
  }
  if (opts.help) {
    printHelp();
    process.exitCode = 0;
    return;
  }

  let root;
  let spec;
  let changeId = null;
  try {
    root = resolveRoot(opts.root);
    spec = resolveSpec(opts);
    changeId = requireChangeId(root, opts.changeId);
  } catch (err) {
    const usage = !root;
    process.stderr.write(`${TOOL}: ${err.message}\n`);
    if (usage) process.stderr.write('运行 `node scripts/generate-change-log.cjs --help` 查看用法。\n');
    process.exitCode = usage ? 1 : 2;
    return;
  }
  if (spec) spec.changeId = changeId;

  if (opts.check) {
    const report = checkAll(root);
    if (opts.json) {
      process.stdout.write(
        `${JSON.stringify(
          {
            tool: TOOL,
            toolVersion: TOOL_VERSION,
            root,
            check: true,
            ok: report.ok,
            errors: report.errors,
            graphEncodingEpoch: GRAPH_ENCODING_EPOCH,
            counts: report.results.reduce((acc, r) => {
              acc.total += 1;
              if (r.status === 'cross-encoding') acc.cross_encoding_unverifiable += 1;
              else if (r.crossEncoding === true) acc.old_encoding_recompute_matched += 1;
              if (r.ok) acc.verified += 1;
              else acc.failed += 1;
              return acc;
            }, { total: 0, verified: 0, old_encoding_recompute_matched: 0, cross_encoding_unverifiable: 0, failed: 0 }),
            records: report.results.map((r) => ({
              name: r.name,
              ok: r.ok,
              status: r.status,
              problems: r.problems,
              graphEncoding: r.record ? (typeof r.record.graph_encoding === 'string' ? r.record.graph_encoding : null) : undefined,
              crossEncoding: r.crossEncoding === true,
              recompute: r.recompute === undefined ? undefined : r.recompute,
            })),
          },
          null,
          2,
        )}\n`,
      );
    } else if (report.errors.length > 0) {
      process.stderr.write(`${TOOL}: 无法复核：${report.errors.join('；')}\n`);
    } else if (report.names.length === 0) {
      process.stdout.write(
        `${TOOL}: ${LOG_DIR_REL}/ 下还没有任何记录（**这不等于「没有改动」**，只等于「还没有人写记录」）。\n` +
          '  产第一条：node scripts/generate-change-log.cjs --commit HEAD\n',
      );
    } else if (report.ok) {
      const statuses = {};
      for (const r of report.results) statuses[r.status] = (statuses[r.status] || 0) + 1;
      const crossUnverifiable = report.results.filter((r) => r.status === 'cross-encoding');
      const crossMatched = report.results.filter((r) => r.crossEncoding === true && r.status !== 'cross-encoding');
      const verified = report.results.length - crossUnverifiable.length - crossMatched.length;
      process.stdout.write(
        `${TOOL}: ${report.results.length} 条记录：${verified} 条逐字段复核通过 · ` +
          `${crossMatched.length} 条写于旧编码（重算后逐字段仍相同） · **${crossUnverifiable.length} 条跨编码不可复核**` +
          `（当前 epoch = ${GRAPH_ENCODING_EPOCH}）。\n` +
          `  降级状态分布 = ${JSON.stringify(statuses)}\n` +
          '  （复核口径 = Schema 校验 + 重算逐字段复核；created_at 与 handling 不参与复核）\n' +
          (crossUnverifiable.length > 0
            ? '  跨编码不可复核（逐条点名；记录**只增不改**，其字节一个都没动）：\n' +
              crossUnverifiable
                .map(
                  (r) =>
                    `    ✖ ${r.name}  记录 epoch = ` +
                    `${r.record && typeof r.record.graph_encoding === 'string' ? r.record.graph_encoding : '（缺失，早于该字段引入）'}` +
                    ` · 重算 = ${r.recompute}\n`,
                )
                .join('')
            : '') +
          '  **同 epoch 下的任何重算不一致仍照旧 exit 1**（跨编码只覆盖「已证明是另一套编码」这一种）；' +
          '旧编码且重算相同的那些逐条明细见 `--json` 的 `records[].graphEncoding` / `recompute`。\n',
      );
    } else {
      process.stderr.write(`${TOOL}: 复核未通过（${report.results.filter((r) => !r.ok).length}/${report.results.length} 条）。\n`);
      for (const r of report.results.filter((x) => !x.ok)) {
        process.stderr.write(`  ✖ ${r.name}${r.status ? ` [${r.status}]` : ''}\n`);
        for (const p of r.problems) process.stderr.write(`      ${p}\n`);
      }
      process.stderr.write(
        '  修法：基准还在就重跑生成器（node scripts/generate-change-log.cjs --commit <rev>）；基准已不可用' +
          '（缺提交 / 浅克隆）先 git fetch --unshallow。\n' +
          '  记录**只增不改**：不要手改记录去迎合重算——要么修基准，要么在报告里写明为什么这条记录不可复核。\n',
      );
    }
    if (!report.ok) process.exitCode = 1;
    return;
  }

  const existingCommit = spec.kind === 'index' ? resolveCommit(root, spec.fromRev) : resolveCommit(root, spec.toRev);
  const existing = existingCommit ? findExistingRecord(root, spec.kind, existingCommit) : null;
  if (existing) {
    process.stdout.write(
      `${TOOL}: 这条基准已经有记录了（${LOG_DIR_REL}/${existing}）——记录**只增不改**，本次不重复写。\n` +
        '  要看差：node scripts/generate-change-log.cjs --check\n',
    );
    process.exitCode = 0;
    return;
  }

  let result;
  try {
    result = generate(root, spec);
  } catch (err) {
    process.stderr.write(`${TOOL}: 生成失败：${err.message}\n`);
    process.exitCode = 1;
    return;
  }
  if (result.error) {
    process.stderr.write(`${TOOL}: 生成失败：${result.error}\n`);
    process.exitCode = 1;
    return;
  }

  const createdAt = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const record = result.record;
  record.created_at = createdAt;

  let validate;
  try {
    validate = validatorFor(root);
  } catch (err) {
    process.stderr.write(`${TOOL}: 生成失败：${err.message}\n`);
    process.exitCode = 1;
    return;
  }
  const shape = validateShape(validate, record);
  if (shape) {
    // 自己写出的记录不合 schema：宁可红也不落盘（否则 schema 就成了摆设）。
    process.stderr.write(`${TOOL}: 生成失败：组装出的记录不符合 ${SCHEMA_REL}：${shape}\n`);
    process.exitCode = 1;
    return;
  }

  const name = recordFileName(createdAt, result.commit, result.kind);
  const abs = path.join(root, ...LOG_DIR_REL.split('/'), name);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  // **`wx` = 文件已存在就失败，绝不覆盖**（记录「只增不改」，而裸 writeFileSync 是静默覆盖：
  // 文件名撞上时先落盘的那条会被后写的那条整份吃掉，`--check` 只会看到后一条、前一条连痕迹都没有）。
  // 正常路径不依赖它（上面按 (kind, commit) 判过重），它是**兜底**：任何残留的同名碰撞都必须响亮失败。
  // 撞名时的两种出路都不改已落盘的字节：同一条记录（逐字节相同）⇒ 幂等，exit 0；否则 ⇒ exit 1 报错。
  try {
    fs.writeFileSync(abs, serialize(record), { encoding: 'utf8', flag: 'wx' });
  } catch (err) {
    if (!err || err.code !== 'EEXIST') {
      process.stderr.write(`${TOOL}: 生成失败：写盘失败（${LOG_DIR_REL}/${name}）：${String(err)}\n`);
      process.exitCode = 1;
      return;
    }
    let same = false;
    try {
      same = fs.readFileSync(abs, 'utf8') === serialize(record);
    } catch {
      same = false;
    }
    if (same) {
      process.stdout.write(
        `${TOOL}: 这条基准已经有记录了（${LOG_DIR_REL}/${name}，逐字节相同）——记录**只增不改**，本次不重复写。\n`,
      );
      process.exitCode = 0;
      return;
    }
    process.stderr.write(
      `${TOOL}: 生成失败：目标文件名已被另一条记录占用，**不覆盖**：${LOG_DIR_REL}/${name}\n` +
        `  抢占者与本次不是同一条记录（幂等键 = (kind, commit)：本次 kind=${result.kind}、commit=${result.commit}）。\n` +
        '  文件名的秒级时间戳撞上了——这是「同一秒内写两条不同基准」的形状，不是数据损坏。\n' +
        `  修法：等 1 秒重跑（时间戳会变），或先看清 ${LOG_DIR_REL}/${name} 是哪一条。\n` +
        '  记录**只增不改**：绝不覆盖、也绝不改名已落盘的记录。\n',
    );
    process.exitCode = 1;
    return;
  }

  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          tool: TOOL,
          toolVersion: TOOL_VERSION,
          root,
          ok: true,
          check: false,
          record: `${LOG_DIR_REL}/${name}`,
          kind: result.kind,
          commit: result.commit,
          fromSnapshot: record.from_snapshot,
          toSnapshot: record.to_snapshot,
          degradation: record.degradation,
          counts: record.counts,
        },
        null,
        2,
      )}\n`,
    );
    return;
  }
  process.stdout.write(
    `${TOOL}: 已写出 ${LOG_DIR_REL}/${name}\n` +
      `  ${record.summary}\n` +
      `  基准：from = ${record.from_snapshot.basis}${record.from_snapshot.rev ? ` ${shortHash(record.from_snapshot.rev)}` : ''}` +
      ` → to = ${record.to_snapshot.basis}${record.to_snapshot.rev ? ` ${shortHash(record.to_snapshot.rev)}` : ''}` +
      `（to 侧 universe_hash ${record.to_snapshot.universe_hash.slice(0, 16)}…）\n` +
      `  降级状态 = ${record.degradation.status}${record.degradation.reasons.length > 0 ? `（${record.degradation.reasons.join('、')}）` : ''}` +
      `${record.degradation.status === 'complete' ? ' —— 数组为空 = 真的没有差异' : ' —— **不得读成「没有引用」**（见 schema.json）'}\n` +
      '  提示：改动记录不参与判定，但它是**只增不改**的事实记录；处理状态请追加（不要改数组）。\n',
  );
}

if (require.main === module) main(process.argv.slice(2));

module.exports = {
  TOOL,
  TOOL_VERSION,
  LOG_DIR_REL,
  SCHEMA_REL,
  RECORD_SCHEMA_VERSION,
  MAX_LIST,
  computeDiff,
  assembleRecord,
  serialize,
  recordFileName,
  listRecordFiles,
  firstDiff,
  projectionOf,
  checkAll,
  buildCommitSnapshot,
  buildIndexSnapshot,
  readParentCommits,
};
