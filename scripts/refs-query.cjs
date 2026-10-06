#!/usr/bin/env node
'use strict';
/**
 * refs-query.cjs —— 引用图产物 `ledger/references.json` 的**只读查询层**。
 *
 * 实现两条查询：who-references <仓库相对路径>（「谁直接引用我这个文件」）与
 * impact <仓库相对路径>（「谁（间接）引用我」：反向闭包按深度分组，每个受影响文件附一条最短引用链 path[]，
 * 另附闭包子图内的环 cycles[]/self_loops[]、派生产物与 gate: 义务项）。
 * 数据源只有图产物：本脚本**不重新分析源码、不建 TypeScript Program**。
 * 读取基准：优先 git 索引版（git show :ledger/references.json）；索引里取不到才回退
 * 工作区文件，并把实际用的那一份写进输出的 basis 字段。
 *
 * 退出码：0 成功；2 参数/根不合法；3 读不到图；4 输入不受支持（符号 id）；5 目标不在图里。
 * 输出确定性：所有排序按 UTF-8 字节序（Buffer.compare），禁用 localeCompare；
 * JSON 里不含绝对路径、时间戳、耗时。
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REL = 'ledger/references.json';
const EXIT = { ok: 0, usage: 2, unreadable: 3, unsupported: 4, notfound: 5 };
const DEFAULT_SYMBOL_ROWS = 40; // 仅人类可读输出的显示上限；--json 与计数始终是全量
const DEFAULT_IMPACT_DEPTH = 8; // impact 的反向 BFS 深度上限（含多少层引用方）

function byteCompare(a, b) {
  return Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/** 确定性排序：先按 UTF-8 字节序比较 key，再按原始下标稳定化。 */
function sortRows(rows, keyOf) {
  return rows
    .map((row, i) => [row, i])
    .sort((x, y) => byteCompare(keyOf(x[0]), keyOf(y[0])) || x[1] - y[1])
    .map((p) => p[0]);
}

function usage() {
  return [
    '用法：node scripts/refs-query.cjs who-references <仓库相对路径> [选项]',
    '      node scripts/refs-query.cjs impact <仓库相对路径> [选项]',
    '',
    '查询：',
    '  who-references <路径>   谁直接引用这个文件（读 ledger/references.json）',
    '  impact <路径>           谁（间接）引用这个文件：反向闭包按深度分组，每个受影响文件给出最短引用链',
    '                          path[]（BFS 最短，形如 A ⇐ B ⇐ 目标），另列闭包子图内的环 cycles[]/自环、派生产物与 gate: 义务项，',
    '                          并把闭包文件分成三档 buckets[]（先按边分档，文件取它 via 中那些边（指向上一层；不是入边）的最高档，一个文件只进一个档）：',
    '                            必须改 must_change —— 边悬空（status=dangling），或 kind ∈ import/export-from/require/',
    '                                                   dynamic-import/type-reference（代码级引用，对方编译或运行会坏）',
    '                            需复核 needs_review —— kind ∈ ci-target/package-field/anchor/markdown-link（要人看一眼）',
    '                            记录   record       —— 其余边，只登记',
    '                          三档在人类可读与 --json 里恒存在，空档也照列（0 条），「没有」与「没做」不混。',
    '                          档内另有正交标注 type_only（**不是第四档**），只看 via 中符号级层的那些边（via = 把该文件',
    '                          牵进闭包的那组边，即它指向上一层的**出边**，见下面每行的「出边 N 条」；产物里文件级',
    '                          edges[] 的 type_only 恒为 false）：这些边全为 type_only=true ⇒ 给出**有边界**的「仅类型级',
    '                          影响」标注——只声明本次统计到的这些边均为类型级，**不排除**其它运行时代码经未统计路径',
    '                          间接触及目标，并明写「不要据此跳过测试」；via 中没有符号级边（或目标不是 .ts/.tsx）⇒',
    '                          「不可判」；存在运行时符号级边则不标——「不标」不等于「没有类型级影响」。',
    '',
    '选项：',
    '  --json          以 JSON 输出（含全部符号级边；确定性、无绝对路径/耗时）',
    '  --root <目录>   仓库根，默认当前目录；不是 git 仓库根则非零退出',
    '  --limit <n>     人类可读输出里最多显示多少条符号级边（默认 40，0 = 全部）',
    '  --depth <n>     impact 的反向闭包深度上限（默认 8）',
    '  --help          显示本帮助',
    '',
    '不支持：符号 id 输入（如 src/tools.ts#Name@1:2）——会以 unsupported 拒绝。',
    '退出码：0 成功 / 2 参数或根不合法 / 3 读不到图 / 4 输入不受支持 / 5 目标不在图里。',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { root: process.cwd(), json: false, help: false, limit: DEFAULT_SYMBOL_ROWS, depth: DEFAULT_IMPACT_DEPTH, positional: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--root' || arg === '--limit' || arg === '--depth') {
      i += 1;
      if (i >= argv.length) throw new UsageError(`缺少 ${arg} 的值`);
      if (arg === '--root') opts.root = argv[i];
      else if (arg === '--depth') {
        const n = Number(argv[i]);
        if (!Number.isInteger(n) || n < 1) throw new UsageError(`--depth 需要正整数，收到：${argv[i]}`);
        opts.depth = n;
      } else {
        const n = Number(argv[i]);
        if (!Number.isInteger(n) || n < 0) throw new UsageError(`--limit 需要非负整数，收到：${argv[i]}`);
        opts.limit = n;
      }
    } else if (arg.startsWith('--')) throw new UsageError(`未知选项：${arg}`);
    else opts.positional.push(arg);
  }
  return opts;
}

class UsageError extends Error {}

/** 失败出口：--json 时把结构化结果写到 stdout，否则写 stderr；两者都以非零码退出。 */
function die(opts, code, message, payload) {
  if (payload) assertCompletenessInvariant(payload.completeness, Array.isArray(payload.gaps) ? payload.gaps : []);
  if (opts && opts.json && payload) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else process.stderr.write(`${message}\n`);
  process.exit(code);
}

/** --root fail-closed：必须是 git 仓库根（realpath 相等），否则拒绝。 */
function resolveRoot(dir) {
  let top;
  try {
    top = execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    throw new UsageError(`--root 不是 git 仓库（或不可读）：${dir}；git rev-parse --show-toplevel 失败`);
  }
  let realDir;
  try {
    realDir = fs.realpathSync(dir);
  } catch {
    throw new UsageError(`--root 不存在或不可读：${dir}`);
  }
  const realTop = fs.realpathSync(top);
  if (path.resolve(realDir) !== path.resolve(realTop)) {
    throw new UsageError(`--root 必须是仓库根：给的是 ${realDir}，而仓库根是 ${realTop}`);
  }
  return realTop;
}

/** 读图产物：索引优先，回退工作区。返回 {artifact, basis, indexBytes, worktreeBytes}。 */
function loadArtifact(root) {
  const abs = path.join(root, REL);
  let indexBuf = null;
  try {
    indexBuf = execFileSync('git', ['-C', root, 'show', `:${REL}`], {
      maxBuffer: 1 << 30,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    indexBuf = null;
  }
  const workBuf = fs.existsSync(abs) ? fs.readFileSync(abs) : null;
  if (indexBuf) {
    return {
      artifact: parseJson(indexBuf, 'git 索引版 ' + REL),
      basis: 'index',
      indexBytes: indexBuf.length,
      worktreeBytes: workBuf ? workBuf.length : null,
    };
  }
  if (workBuf) {
    return { artifact: parseJson(workBuf, '工作区 ' + abs), basis: 'worktree', indexBytes: null, worktreeBytes: workBuf.length };
  }
  return { artifact: null, basis: 'none', indexBytes: null, worktreeBytes: null };
}

function parseJson(buf, what) {
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new UsageError(`图产物不是合法 JSON（${what}）：${err.message}`);
  }
}

function normalizeTarget(target) {
  return target.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
}

/** 一条人话结论：空引用方列表到底能不能读作「没人引用」。 */
function emptyReading(completeness) {
  if (completeness === 'complete') {
    return '空引用方列表 = 没人引用它（completeness=complete，可以这样读）。';
  }
  return `空引用方列表 ≠ 没人引用它：completeness=${completeness}，图不完整或已过期，空只代表「本查询没看到引用」。`;
}

/**
 * 抛错级不变量：completeness === 'complete' 与 gaps.length > 0 不得同时成立。
 * 本版 `complete` 不可达（取值只会是 stale/partial/unknown）；此断言是给未来新增 complete 分支的护栏，不要删。
 * 违反即抛未捕获异常：进程非零退出（exit 1），不降级、不静默继续，也不写出一份自相矛盾的报告。
 */
function assertCompletenessInvariant(completeness, gaps) {
  if (completeness === 'complete' && gaps.length > 0) {
    throw new Error(
      `不变量被破坏：completeness='complete' 与 gaps.length=${gaps.length} 同时成立；` +
        `'complete' 必须意味着没有任何缺口。首个缺口：${gaps[0]}`,
    );
  }
}

function buildReport(opts, target, loaded) {
  const artifact = loaded.artifact;
  const files = new Set((artifact.files || []).map((f) => f.id));
  const edgeRows = sortRows(
    (artifact.edges || [])
      .filter((e) => e.to && e.to.file === target)
      .map((e) => ({
        from_file: e.from.file,
        line: e.from.line,
        column: e.from.column,
        kind: e.kind,
        cross_file: e.cross_file === true,
        status: e.status,
        target_state: e.to.state,
        type_only: e.type_only === true,
        specifier: e.specifier,
        edge_id: e.id,
      })),
    (r) => `${r.from_file}:${String(r.line).padStart(12, '0')}:${String(r.column).padStart(12, '0')}:${r.kind}:${r.edge_id}`,
  );
  const symbolRows = sortRows(
    (artifact.symbol_edges || [])
      .filter((e) => (e.to && e.to.file === target) || (e.to && typeof e.to.sym === 'string' && e.to.sym.startsWith(`${target}#`)))
      .map((e) => ({
        from_file: e.from.file,
        line: e.from.line,
        column: e.from.column,
        from_sym: e.from.sym,
        kind: e.kind,
        to_sym: e.to.sym,
        to_file: e.to.file,
        target_state: e.to.state,
        cross_file: e.cross_file === true,
        status: e.status,
        reason: e.reason === undefined ? null : e.reason,
        type_only: e.type_only === true,
        specifier: e.specifier,
        edge_id: e.id,
      })),
    (r) => `${r.from_file}:${String(r.line).padStart(12, '0')}:${String(r.column).padStart(12, '0')}:${r.kind}:${r.edge_id}`,
  );

  const reasons = [];
  if (loaded.basis === 'worktree') {
    reasons.push(`索引里没有 ${REL}（git show :${REL} 失败），已回退工作区文件：结果可能与索引版不一致。`);
  } else if (loaded.worktreeBytes !== null && loaded.worktreeBytes !== loaded.indexBytes) {
    reasons.push(
      `索引版与工作区版 ${REL} 字节不一致（索引 ${loaded.indexBytes} 字节 / 工作区 ${loaded.worktreeBytes} 字节）：结果以索引版为准，可能与工作区现状不符。`,
    );
  }
  const diverged = reasons.length > 0;
  const gaps = [
    '直接引用方只数文件级边（edges[]）；符号级边另列在 symbol_referrers[]，其中包含文件内边（同一文件内部的引用/依赖，cross_file=false）——这些边在产物里存在、照列，只是不计入直接引用方计数。',
    '未实现符号 id 输入：目标只能是文件路径；符号 id 会以 unsupported 拒绝。',
    '文件级 edges[] 的 type_only 恒为 false（产物口径），故运行时/类型拆分只对 symbol_edges[] 有效；impact 的 type_only 档内标注同样只依据 via（把该文件牵进闭包的那组边，即它指向上一层的出边）中符号级层的那些边，且只覆盖本次统计到的这些边，不排除其它运行时代码间接触及目标。',
    '未实现 what-references、change-impact 等其它查询；本版只有 who-references 与 impact 两条查询（impact = 反向闭包 + 按深度打印 + 每个受影响文件的最短引用链 path[] + 闭包子图内的环 cycles[]/self_loops[] + 三档分类 buckets[] 与其中的 type_only 标注 + 派生产物分区 + gate: 义务项；impact 尚未做 informational 与截断标注）。',
  ];
  if (diverged) reasons.push(...gaps);
  const completeness = diverged ? 'stale' : 'partial';
  assertCompletenessInvariant(completeness, gaps);
  const runtimeRefs = symbolRows.filter((r) => !r.type_only).length;
  const typeRefs = symbolRows.filter((r) => r.type_only).length;

  return {
    query: 'who-references',
    kind: 'file',
    target,
    unsupported: false,
    basis: loaded.basis,
    completeness,
    reasons: diverged ? reasons : gaps,
    gaps,
    empty_referrers_reading: emptyReading(completeness),
    counts: {
      file_edges: edgeRows.length,
      referrer_files: new Set(edgeRows.map((r) => r.from_file)).size,
      symbol_edges: symbolRows.length,
      runtime_refs: runtimeRefs,
      type_refs: typeRefs,
    },
    direct_referrers: edgeRows,
    symbol_referrers: symbolRows,
  };
}

function renderHuman(report, opts, symbolRowsForDisplay) {
  const c = report.counts;
  const lines = [
    `谁直接引用 ${report.target}（文件级边 edges[]）`,
    `basis=${report.basis}  completeness=${report.completeness}  unsupported=false`,
    `原因/缺口 reasons：`,
    ...report.reasons.map((r) => `  - ${r}`),
    `直接引用方：${c.file_edges} 条边，来自 ${c.referrer_files} 个文件`,
  ];
  if (report.direct_referrers.length === 0) lines.push('  （无）');
  for (const r of report.direct_referrers) {
    lines.push(
      `  ${r.from_file}:${r.line}:${r.column}  kind=${r.kind}  cross_file=${r.cross_file}  目标状态=${r.target_state}  status=${r.status}  type_only=${r.type_only}  specifier=${r.specifier === null ? '-' : r.specifier}`,
    );
  }
  lines.push(`符号级边 symbol_edges[]（to.sym 指向本文件）：${c.symbol_edges} 条`);
  lines.push(`  运行时引用数 runtime_refs=${c.runtime_refs}`);
  lines.push(`  类型引用数 type_refs=${c.type_refs}`);
  if (c.symbol_edges === 0) lines.push('  （无）');
  for (const r of symbolRowsForDisplay) {
    const mark = r.type_only ? 'type' : 'runtime';
    lines.push(`  ${r.from_file}:${r.line}:${r.column} -> ${r.to_sym}  kind=${r.kind}  ${mark}  cross_file=${r.cross_file}  目标状态=${r.target_state}`);
  }
  if (symbolRowsForDisplay.length < c.symbol_edges) {
    lines.push(`  …（人类可读输出只显示前 ${symbolRowsForDisplay.length} 条；--json 或 --limit 0 可看全部 ${c.symbol_edges} 条）`);
  }
  lines.push(``, `空列表怎么读：${report.empty_referrers_reading}`);
  return lines.join('\n');
}

/** 读图基准与工作区/索引是否一致：返回原因数组（空 = 一致）。口径与 buildReport 内联版本相同。 */
function basisReasons(loaded) {
  const reasons = [];
  if (loaded.basis === 'worktree') {
    reasons.push(`索引里没有 ${REL}（git show :${REL} 失败），已回退工作区文件：结果可能与索引版不一致。`);
  } else if (loaded.worktreeBytes !== null && loaded.worktreeBytes !== loaded.indexBytes) {
    reasons.push(
      `索引版与工作区版 ${REL} 字节不一致（索引 ${loaded.indexBytes} 字节 / 工作区 ${loaded.worktreeBytes} 字节）：结果以索引版为准，可能与工作区现状不符。`,
    );
  }
  return reasons;
}

/** 反向邻接表：to.file -> 引用它的边（文件级 edges[] 与符号级 symbol_edges[] 合流）。 */
function buildReverseIndex(artifact) {
  const map = new Map();
  const add = (layer, e) => {
    const toFile = e && e.to && e.to.file;
    const fromFile = e && e.from && e.from.file;
    if (typeof toFile !== 'string' || typeof fromFile !== 'string') return;
    if (!map.has(toFile)) map.set(toFile, []);
    map.get(toFile).push({
      layer,
      from_file: fromFile,
      line: e.from.line,
      column: e.from.column,
      kind: e.kind,
      edge_id: e.id,
      // 只增两个**只读事实**字段（悬空状态、类型级标记），供 impact 的三档分档与 type_only 标注使用。
      // 不参与任何推进/计数：闭包用 seen/via 的键、计数用 rows.length 与 row.layer，
      // 环与 path_edges 都在别处**重新构造**对象（不 spread 本行），因此这些字段不会渗进既有输出。
      status: e.status,
      type_only: e.type_only === true,
    });
  };
  for (const e of artifact.edges || []) add('file', e);
  for (const e of artifact.symbol_edges || []) add('symbol', e);
  return map;
}

/**
 * 反向闭包：从 target 出发沿「谁引用了它」逐层传递，文件级与符号级两层同时走。
 * 一个文件只记它第一次出现的深度（最浅深度），深度与文件顺序都确定性排序。
 * 同时记父指针 parent：file -> { from, edge }，其中 from 是「链上更靠近 target 的那一端」（file 引用了 from）。
 * 父指针与最浅深度同源：只在**首次入队**时定型，同一层内的先后由 frontier/via 的确定性顺序决定，
 * 后续更深的路径一律不覆盖。BFS 逐层推进保证首次入队即最短，故沿 parent 回溯得到的就是最短引用链。
 */
function reverseClosure(artifact, target, maxDepth) {
  const rev = buildReverseIndex(artifact);
  const seen = new Set([target]);
  const parent = new Map();
  const levels = [];
  let frontier = [target];
  for (let depth = 1; depth <= maxDepth && frontier.length > 0; depth += 1) {
    const via = new Map();
    for (const cur of frontier) {
      for (const row of rev.get(cur) || []) {
        if (seen.has(row.from_file)) continue;
        if (!via.has(row.from_file)) via.set(row.from_file, []);
        via.get(row.from_file).push(row);
        if (!parent.has(row.from_file)) parent.set(row.from_file, { from: cur, edge: row });
      }
    }
    if (via.size === 0) break;
    const files = sortRows(
      [...via.keys()].map((file) => ({
        file,
        via: sortRows(
          via.get(file),
          (r) => `${r.layer}:${r.from_file}:${String(r.line).padStart(12, '0')}:${String(r.column).padStart(12, '0')}:${r.kind}:${r.edge_id}`,
        ),
      })),
      (r) => r.file,
    );
    for (const f of files) seen.add(f.file);
    levels.push({ depth, files });
    frontier = files.map((f) => f.file);
  }
  const closure = [...seen].filter((f) => f !== target).sort(byteCompare);
  return { levels, closure, parent };
}

/**
 * 沿父指针回溯出「受影响文件 ⇐ … ⇐ 目标」的最短引用链。
 * 回溯天然从受影响文件走到 target，方向就是展示方向，无需反转：
 * chain[0] 是最外层的受影响文件，chain[chain.length-1] 是 target；跳数 = chain.length - 1。
 * 第 i 跳用的边 = parent[chain[i]].edge（from_file = chain[i]），kind/layer 即取自这条边。
 * 闭包里的非 target 文件必然有父指针（它们都是 via 的 key），取不到即为内部不变量被破坏，直接抛错。
 */
function shortestPath(parent, target, file) {
  const chain = [file];
  const hops = [];
  let cur = file;
  while (cur !== target) {
    const p = parent.get(cur);
    if (!p) throw new Error(`内部不变量被破坏：闭包文件 ${file} 回溯到 ${cur} 时没有父指针（target=${target}）`);
    hops.push({
      from_file: cur,
      to_file: p.from,
      layer: p.edge.layer,
      kind: p.edge.kind,
      line: p.edge.line,
      column: p.edge.column,
      edge_id: p.edge.edge_id,
    });
    chain.push(p.from);
    cur = p.from;
  }
  return { chain, hops };
}

/** 人类可读的链：`A ⇐ B ⇐ 目标`（⇐ 读作「被…引用」）。 */
function renderChain(chain) {
  return chain.join(' ⇐ ');
}

/** 链上每跳用的边 kind 摘要（layer:kind），0 跳返回空串；不改动 existing via 的结构。 */
function renderHopKinds(hops) {
  if (hops.length === 0) return '';
  return `  跳边：${hops.map((h) => `${h.layer}:${h.kind}`).join(' → ')}`;
}

/** 边的确定性排序键：两端 + 行:列 + 层 + kind + edge_id。 */
function cycleEdgeKey(e) {
  return `${e.from}|${e.to}|${String(e.line).padStart(12, '0')}:${String(e.column).padStart(12, '0')}|${e.layer}|${e.kind}|${e.edge_id}`;
}

/**
 * 环检测的输入子图：节点 = target ∪ 闭包文件，边 = 两端都落在该节点集内的**反向边**
 * （方向沿用 buildReverseIndex 的「谁引用了它」口径：from 引用 to，即 from -> to 表示 from 依赖 to）。
 * 这是独立的一步，只读反向索引与已经算好的 closure，不参与 BFS 推进，因此闭包的层数/文件数/边数一个都不变。
 * 必须收「两端都在闭包内」的全部反向边，而不是只收推进时用到的那些边：BFS 对已见文件会 continue，
 * 闭环的那条边往往正是被 continue 掉的一条（例：target=src/service.ts 时，service.ts 引用 promptmanager.ts
 * 的那条边不是推进边），只收推进边就检测不出环。
 * 自环只认**文件级**边（edges[]，layer === 'file'）里 from.file === to.file 的情形，单独返回，不混进 size > 1 的分量。
 * 同文件内部的符号边（layer === 'symbol' 且 from.file === to.file）**不算自环**：删掉该文件时这条边两端一起消失，
 * 与「删除影响」无关，列出来是噪音，还会被误读成「这个文件引用自己、需要处理」；
 * 它也进不了 edges（两端同文件，形不成 size > 1 的分量），因此既不进 self_loops 也不进 cycles。
 */
function closureSubgraph(rev, target, closure) {
  const nodes = sortRows([target, ...closure], (n) => n);
  const nodeSet = new Set(nodes);
  const edges = [];
  const selfLoops = [];
  for (const to of nodes) {
    for (const row of rev.get(to) || []) {
      if (!nodeSet.has(row.from_file)) continue;
      const edge = {
        from: row.from_file,
        to,
        layer: row.layer,
        kind: row.kind,
        line: row.line,
        column: row.column,
        edge_id: row.edge_id,
      };
      // 自环只算文件级的（layer === 'file'，即来自 edges[]）；同文件内部的符号边（layer === 'symbol'）不算自环，
      // 也不进 edges——两端同文件，既形不成 size > 1 的分量，也与「删掉该文件的影响」无关。
      if (row.from_file === to) {
        if (row.layer === 'file') selfLoops.push(edge);
        continue;
      }
      edges.push(edge);
    }
  }
  return { nodes, edges: sortRows(edges, cycleEdgeKey), selfLoops: sortRows(selfLoops, cycleEdgeKey) };
}

/**
 * 强连通分量（Tarjan），只返回 size > 1 的分量，即环；size === 1 的孤立/单点分量不算环（自环由调用方单列）。
 * 选**迭代版（显式栈）**而不是递归版：递归深度等于 DFS 路径长度，闭包规模随仓库增长，深链上会先撞
 * RangeError（Maximum call stack size exceeded），那会让整个 impact 崩掉；显式栈把帧放在堆上，深度不再是风险，
 * 且与递归版逐行等价（子帧出栈时把 low 回传给父帧；出栈瞬间用 low === index 判定分量根）。
 * 每步只做可达性推进，天然在含环图上终止（入栈节点不再重入 DFS），闭包 BFS 本身也有 visited 集，两处都不靠环检测防死循环。
 * 分量内按 UTF-8 字节序排序、分量之间按首元素排序，输出与遍历顺序无关，逐字节确定。
 */
function findCycles(nodes, edges) {
  const adj = new Map(nodes.map((n) => [n, []]));
  for (const e of edges) if (adj.has(e.from) && adj.has(e.to)) adj.get(e.from).push(e.to);
  for (const [v, list] of adj) {
    list.sort(byteCompare);
    adj.set(v, list.filter((w, i) => i === 0 || w !== list[i - 1])); // 平行边去重：SCC 只看可达性
  }
  const index = new Map();
  const low = new Map();
  const onStack = new Set();
  const stack = [];
  const components = [];
  let counter = 0;
  for (const root of nodes) {
    if (index.has(root)) continue;
    index.set(root, counter);
    low.set(root, counter);
    counter += 1;
    stack.push(root);
    onStack.add(root);
    const frames = [{ v: root, next: 0 }];
    while (frames.length > 0) {
      const frame = frames[frames.length - 1];
      const neighbors = adj.get(frame.v) || [];
      if (frame.next < neighbors.length) {
        const w = neighbors[frame.next];
        frame.next += 1;
        if (!index.has(w)) {
          index.set(w, counter);
          low.set(w, counter);
          counter += 1;
          stack.push(w);
          onStack.add(w);
          frames.push({ v: w, next: 0 });
        } else if (onStack.has(w)) {
          low.set(frame.v, Math.min(low.get(frame.v), index.get(w)));
        }
      } else {
        frames.pop();
        if (low.get(frame.v) === index.get(frame.v)) {
          const comp = [];
          let w;
          do {
            w = stack.pop();
            onStack.delete(w);
            comp.push(w);
          } while (w !== frame.v);
          if (comp.length > 1) components.push(comp.sort(byteCompare));
        }
        if (frames.length > 0) {
          const parent = frames[frames.length - 1].v;
          low.set(parent, Math.min(low.get(parent), low.get(frame.v)));
        }
      }
    }
  }
  return sortRows(components, (c) => c[0]);
}

/**
 * 派生产物推导规则：`src/<rel>.ts` -> `lib/<rel>.js`、`lib/<rel>.js.map`、`lib/types/<rel>.d.ts`。
 * 候选路径一律用图的 files[] 逐个校验，图里不存在的绝不列出（不凭想象造路径）；
 * 非 src/ 下的目标或不是 .ts 的目标（文档、脚本、CI 自身等，如 docs/*.md、scripts/*.cjs）直接判为空，不产任何派生产物。
 * 产物形态以图为准：本仓库 28 个 src 下的 .ts 的这三条候选全部命中（已逐条核对），无例外形态。
 */
const DERIVED_ARTIFACT_RULES = [
  (rel) => `lib/${rel}.js`,
  (rel) => `lib/${rel}.js.map`,
  (rel) => `lib/types/${rel}.d.ts`,
];

/** 由 src/ 路径推导派生产物，只保留图 files[] 中真实存在者（来源统一标 build-artifact）。 */
function derivedArtifacts(target, fileIndex) {
  if (!target.startsWith('src/') || !target.endsWith('.ts')) return [];
  const rel = target.slice('src/'.length, -'.ts'.length);
  if (rel === '') return [];
  return DERIVED_ARTIFACT_RULES.map((rule) => rule(rel))
    .filter((p) => fileIndex.has(p))
    .map((p) => ({ path: p, source: 'build-artifact', state: fileIndex.get(p).state }));
}

/** 每条 gate: 义务项的「为什么要做」：说清该环节到底会因为产物缺失怎么红。 */
function gateWhy(edge, layer) {
  const at = `${edge.from.file}:${edge.from.line}`;
  switch (edge.kind) {
    case 'ci-target':
      return `CI 工作流 ${at} 点名了这个派生产物（这条边本来就在图里）；产物不在或改名，则该 CI 步骤直接红。`;
    case 'package-field':
      return `package.json 字段（${at}）点名了这个派生产物；产物不在或改名，则发布入口/类型入口失效。`;
    case 'import':
    case 'require':
    case 'dynamic-import':
      return `${at} 以 ${edge.kind} 加载这个派生产物；产物不在或改名，则该处运行时直接失败。`;
    case 'markdown-link':
    case 'anchor':
      return `文档 ${at} 以 ${edge.kind} 指向这个派生产物；产物不在或改名，则该链接失效。`;
    default:
      return `${at} 有一条 ${layer} 层 ${edge.kind} 边点名了这个派生产物；产物不在或改名，则对应环节失败。`;
  }
}

/**
 * 门禁义务项：**全部由图里的既有事实推导，不写死任何清单**。
 * 1) 只要派生产物含 lib/ 前缀，就必须跑 check:libsync —— 该门禁要求索引里的 lib/ 与全新编译逐字节一致；
 * 2) 图里指向这些派生产物的既有边（edges[] 与 symbol_edges[]）逐条列出，尤其是 ci-target。
 * 义务项不进闭包：它们不是引用方，也不冒充引用边。
 */
function gateObligations(derived, artifact) {
  const rows = [];
  const paths = new Set(derived.map((d) => d.path));
  if (derived.some((d) => d.path.startsWith('lib/'))) {
    rows.push({
      source: 'gate:',
      kind: 'script',
      command: 'npm run check:libsync',
      why: 'check:libsync 门禁要求索引里的 lib/ 与全新编译产物逐字节一致；动过 src/ 后 lib/ 会漂移，必须重新编译并同步。',
    });
  }
  const add = (layer, e) => {
    const to = e && e.to && e.to.file;
    if (typeof to !== 'string' || !paths.has(to)) return;
    rows.push({
      source: 'gate:',
      kind: 'edge',
      layer,
      edge_kind: e.kind,
      edge_id: e.id,
      from_file: e.from.file,
      line: e.from.line,
      column: e.from.column,
      specifier: e.specifier === undefined ? null : e.specifier,
      to_file: to,
      why: gateWhy(e, layer),
    });
  };
  for (const e of artifact.edges || []) add('file', e);
  for (const e of artifact.symbol_edges || []) add('symbol', e);
  return sortRows(
    rows,
    (r) => `${r.kind === 'script' ? '0' : '1'}|${r.command || ''}|${r.layer || ''}|${r.edge_kind || ''}|${r.edge_id || ''}`,
  );
}

/**
 * 三档分类的档定义。**先按边分档，再把文件归入它 via 中那些边的最高档**（via = 把该文件牵进闭包的那组边，即它指向上一层的出边）——一个文件只出现在一个档里。
 * 定档只看这条边自身的两个事实：① 目标是否已悬空（status === 'dangling'）；② 边的 kind。
 * 优先级 必须改 > 需复核 > 记录：一个文件由 via 中多条边带入闭包时取最高档。
 * kind 是封闭枚举（产物里实际出现：file 层 import / export-from / require / dynamic-import / type-reference /
 * ci-target / package-field / anchor / markdown-link，symbol 层 import / export-from / type-reference）；
 * 未列出的 kind 一律落到「记录」，不猜、不擅自升级。三档在人类可读输出与 --json 里都恒存在，空档也照列（0 条）。
 */
const IMPACT_BUCKETS = [
  {
    key: 'must_change',
    label: '必须改',
    why: '边已悬空（status=dangling），或是代码级引用边（import/export-from/require/dynamic-import/type-reference）：目标删改后对方编译或运行会真的坏，必须动手。',
  },
  {
    key: 'needs_review',
    label: '需复核',
    why: '边是配置/文档级指向（ci-target/package-field/anchor/markdown-link）：不一定会坏，但必须人工看一眼才能定。',
  },
  {
    key: 'record',
    label: '记录',
    why: '其余边：只登记，不构成动作。',
  },
];
/** type-reference 属于「必须改」：别的文件用类型引用你，删掉你它 tsc 会红——必须动手，只是验证强度低（见 type_only 标注）。 */
const MUST_CHANGE_KINDS = new Set(['import', 'export-from', 'require', 'dynamic-import', 'type-reference']);
const NEEDS_REVIEW_KINDS = new Set(['ci-target', 'package-field', 'anchor', 'markdown-link']);
/** 档序即优先级：取下标最小者。 */
const BUCKET_RANK = new Map(IMPACT_BUCKETS.map((b, i) => [b.key, i]));

/** 单条边的档。只看这条边自己，不看邻居。 */
function bucketOfEdge(row) {
  if (row.status === 'dangling') return 'must_change';
  if (MUST_CHANGE_KINDS.has(row.kind)) return 'must_change';
  if (NEEDS_REVIEW_KINDS.has(row.kind)) return 'needs_review';
  return 'record';
}

const ANNOTATION_TYPE_ONLY =
  '仅类型级影响（只限本次统计到的这些边）：这些边均为类型级引用，删改后至少需过 tsc；但不排除其它运行时代码经未统计路径间接触及目标——不要据此跳过测试';
const ANNOTATION_UNDETERMINABLE = '不可判';
/** 目标以 .ts/.tsx 结尾才谈得上「类型级 / 运行时」之分。 */
const TS_TARGET = /\.tsx?$/;

/**
 * 正交标注 type_only——**不是第四档，是档内标注**。只看 via（把该文件牵进闭包的那组边，
 * 即它指向上一层、链上更靠近目标的那一层的**出边**）中符号级层的那些边：
 * 产物口径里文件级 edges[] 的 type_only 恒为 false（写 `import type { X } from '..'` 也判成 false，
 * 见 generate-reference-graph.cjs:323），若把文件级边也算进来，「全部 via 边都是类型级」将永远不成立，
 * 标注会退化成永不出现的死代码。
 * 三态：
 *   - via 中有符号级边且全部 type_only === true ⇒ 给出**有边界**的 ANNOTATION_TYPE_ONLY：只声明这些边是
 *     类型级，不排除其它运行时代码经未统计路径间接触及目标，并明写「不要据此跳过测试」
 *     （这些边之外仍可能有运行时路径，删掉目标不等于可以跳过验证）；
 *   - via 中有符号级边且存在 type_only === false ⇒ 有运行时影响，**不标**；
 *   - via 中没有任何符号级边 ⇒ 不可判（符号层给不出依据，别把「不标」读成「没有类型级影响」）；
 *   - 目标本身不是 .ts/.tsx ⇒ 不可判（文档/JSON/CI 没有类型/运行时之分）。
 */
function typeOnlyAnnotation(target, viaRows) {
  if (!TS_TARGET.test(target)) {
    return { state: 'undeterminable', reason: 'target-not-typescript', text: ANNOTATION_UNDETERMINABLE };
  }
  const symbolRows = viaRows.filter((v) => v.layer === 'symbol');
  if (symbolRows.length === 0) {
    return { state: 'undeterminable', reason: 'no-symbol-layer-edge', text: ANNOTATION_UNDETERMINABLE };
  }
  const typeRefs = symbolRows.filter((v) => v.type_only === true).length;
  if (typeRefs === symbolRows.length) {
    return { state: 'type_only', reason: 'all-symbol-layer-edges-type-only', text: ANNOTATION_TYPE_ONLY };
  }
  return { state: 'runtime', reason: 'has-runtime-symbol-layer-edge', text: null };
}

/** impact 报告：反向闭包 + 按深度分组的受影响文件（每个文件一条最短引用链 path[]）+ 派生产物分区（build-artifact）+ 门禁义务项分区（gate:）。 */
function buildImpactReport(opts, target, loaded) {
  const { levels, closure, parent } = reverseClosure(loaded.artifact, target, opts.depth);
  const fileIndex = new Map((loaded.artifact.files || []).map((f) => [f.id, f]));
  const derived = derivedArtifacts(target, fileIndex);
  const gates = gateObligations(derived, loaded.artifact);
  const layerEdges = (layer) =>
    levels.reduce((n, l) => n + l.files.reduce((m, f) => m + f.via.filter((v) => v.layer === layer).length, 0), 0);
  const affectedEdges = levels.reduce((n, l) => n + l.files.reduce((m, f) => m + f.via.length, 0), 0);
  // 最短引用链：纯读父指针，不参与闭包推进，因此不影响 closure 与任何计数。
  const paths = new Map(closure.map((file) => [file, shortestPath(parent, target, file)]));
  // 环检测：同样只读，独立于 BFS 推进（反向索引是纯函数，这里重新构建一份，不动 reverseClosure 的返回值）。
  const sub = closureSubgraph(buildReverseIndex(loaded.artifact), target, closure);
  const cycles = findCycles(sub.nodes, sub.edges).map((files) => {
    const member = new Set(files);
    return { size: files.length, files, edges: sub.edges.filter((e) => member.has(e.from) && member.has(e.to)) };
  });

  // 三档分类：只读 levels 里已经算好的 via（BFS 推进时用的边），不新增遍历、不改 closure/环/任何计数。
  const bucketFiles = new Map(IMPACT_BUCKETS.map((b) => [b.key, []]));
  for (const level of levels) {
    for (const f of level.files) {
      let best = null;
      for (const v of f.via) {
        const key = bucketOfEdge(v);
        if (best === null || BUCKET_RANK.get(key) < BUCKET_RANK.get(best)) best = key;
      }
      if (best === null) best = 'record';
      bucketFiles.get(best).push({
        file: f.file,
        depth: level.depth,
        via_edges: f.via.length,
        kinds: [...new Set(f.via.map((v) => v.kind))].sort(byteCompare),
        type_only: typeOnlyAnnotation(target, f.via),
      });
    }
  }
  const buckets = IMPACT_BUCKETS.map((b) => ({
    key: b.key,
    label: b.label,
    why: b.why,
    count: bucketFiles.get(b.key).length,
    files: sortRows(bucketFiles.get(b.key), (r) => r.file),
  }));
  const bucketCount = (key) => buckets.find((b) => b.key === key).count;

  const reasons = basisReasons(loaded);
  const gaps = [
    '反向闭包只沿 to.file 走文件级 edges[] 与符号级 symbol_edges[]；文件内边（同一文件内部的引用/依赖）不推进遍历——两端是同一个文件，它已在已见集里，带不来新文件（自环推进不了闭包），也不计入闭包边数——但这些边在产物里存在（symbol_edges[] 中 cross_file=false 的那些）。',
    '三档分类 buckets[]：先按边分档（边悬空，或 kind ∈ 代码级引用 ⇒ 必须改；kind ∈ ci-target/package-field/anchor/markdown-link ⇒ 需复核；其余 ⇒ 记录），再把文件归入它 via 中那些边的最高档（via = 把该文件牵进闭包的那组边，即它指向上一层的出边），因此一个文件只出现在一个档里；三档恒存在，空档照列（0 条），「没有」与「没做」不混。',
    'type_only 是档内**正交标注**，不是第四档，且只看 via（把该文件牵进闭包的那组边，即它指向上一层的出边）中符号级层的那些边：产物口径里文件级 edges[] 的 type_only 恒为 false（写 `import type` 也判成 false），把它算进来标注会永不出现；via 中没有符号级边（或目标不是 .ts/.tsx）一律标「不可判」——「不标」只代表存在运行时符号级影响，不代表没有类型级影响。标注本身**有边界**：只声明本次统计到的这些边是类型级，不排除其它运行时代码经未统计路径间接触及目标——不要据此跳过测试。',
    '未做 informational 与截断标注（三档分类与 type_only 标注已做，见 buckets[]）。',
    'cycles[] 只在闭包子图（target ∪ 闭包文件）内求强连通分量，不是全图 SCC：闭包之外的环不报（换个 target 才看得到）；环用的也是文件级/符号级反向边，文件内边（两端同文件）带不来新节点、进不了 size>1 的分量；自环单列在 self_loops[]（只含文件级自环，即 edges[] 里 from.file === to.file 的边；同文件内部的符号边不算），不混进 size>1 的分量。',
    'path[] 只给一条最短链（BFS 首达即定型）：同一文件存在多条等价最短链时只列首达的那条；链上每跳用的边（layer/kind/行:列）在 path_edges[] 里。',
    `闭包深度上限 --depth ${opts.depth}：更深的层未展开，closure 可能不完整。`,
  ];
  const diverged = reasons.length > 0;
  if (diverged) reasons.push(...gaps);
  const completeness = diverged ? 'stale' : 'partial';
  assertCompletenessInvariant(completeness, gaps);

  return {
    query: 'impact',
    kind: 'file',
    target,
    unsupported: false,
    basis: loaded.basis,
    completeness,
    reasons: diverged ? reasons : gaps,
    gaps,
    empty_referrers_reading: emptyReading(completeness),
    max_depth: opts.depth,
    actual_depth: levels.length,
    counts: {
      affected_files: closure.length,
      affected_edges: affectedEdges,
      file_layer_edges: layerEdges('file'),
      symbol_layer_edges: layerEdges('symbol'),
      derived_artifacts: derived.length,
      gate_obligations: gates.length,
      cycles: cycles.length,
      cycle_files: cycles.reduce((n, c) => n + c.size, 0),
      self_loops: sub.selfLoops.length,
      must_change_files: bucketCount('must_change'),
      needs_review_files: bucketCount('needs_review'),
      record_files: bucketCount('record'),
    },
    by_depth: levels.map((l) => ({
      depth: l.depth,
      files: l.files.map((f) => ({
        file: f.file,
        via: f.via.map((v) => `${v.from_file}:${v.line}:${v.column}`),
        path: paths.get(f.file).chain,
        path_hops: paths.get(f.file).chain.length - 1,
        path_edges: paths.get(f.file).hops,
      })),
    })),
    buckets,
    closure,
    paths: closure.map((file) => ({
      file,
      path: paths.get(file).chain,
      path_hops: paths.get(file).chain.length - 1,
      path_edges: paths.get(file).hops,
    })),
    derived_artifacts: derived,
    gate_obligations: gates,
    cycles,
    self_loops: sub.selfLoops,
  };
}

function renderImpactHuman(report) {
  const c = report.counts;
  const lines = [
    `谁（间接）引用 ${report.target}：按深度分组的受影响文件（反向闭包）`,
    `basis=${report.basis}  completeness=${report.completeness}  unsupported=false  depth<=${report.max_depth}（实际 ${report.actual_depth} 层）`,
    `原因/缺口 reasons：`,
    ...report.reasons.map((r) => `  - ${r}`),
    `闭包合计：${c.affected_files} 个文件，${c.affected_edges} 条边（文件级 ${c.file_layer_edges} / 符号级 ${c.symbol_layer_edges}）`,
  ];
  if (report.by_depth.length === 0) lines.push('  （无：图里没有任何文件引用它）');
  for (const level of report.by_depth) {
    lines.push(`深度 ${level.depth}：${level.files.length} 个文件`);
    for (const f of level.files) {
      lines.push(`  ${f.file}  <- ${f.via.length ? f.via.join('  ') : '（无）'}`);
      lines.push(`    path: ${renderChain(f.path)}（${f.path_hops} 跳）${renderHopKinds(f.path_edges)}`);
    }
  }
  lines.push(
    ``,
    `三档分类（先按边分档，文件归入它 via 中那些边（指向上一层；不是入边）的最高档；优先级 必须改 > 需复核 > 记录，每个文件只出现在一个档里；空档照列，恒为 0 条）：`,
  );
  for (const b of report.buckets) {
    lines.push(`  ${b.label}（${b.count} 条）：${b.why}`);
    if (b.count === 0) lines.push('    （无）');
    for (const f of b.files) {
      const annot = f.type_only.text === null ? '' : `  【${f.type_only.text}】`;
      lines.push(`    ${f.file}  深度 ${f.depth}  出边 ${f.via_edges} 条（指向上一层；不是入边数）（kind: ${f.kinds.join(', ')}）${annot}`);
    }
  }
  lines.push(``, `环（闭包子图内 size>1 的强连通分量 SCC；自环另列）：${c.cycles} 个`);
  if (report.cycles.length === 0) lines.push('  （无：闭包子图里没有互相引用的文件组）');
  report.cycles.forEach((cyc, i) => {
    lines.push(`  环 ${i + 1}：${cyc.size} 个文件（UTF-8 字节序）  ${cyc.files.join('  |  ')}`);
    for (const e of cyc.edges) lines.push(`    边 ${e.from}:${e.line}:${e.column}  ${e.layer}:${e.kind}  ->  ${e.to}`);
  });
  lines.push(
    `自环（只含文件级自环：edges[] 里 from.file === to.file，即某文件引用自己；同文件内部的符号边不算，两者都不计入上面的环）：${c.self_loops} 个`,
  );
  if (report.self_loops.length === 0) lines.push('  （无）');
  for (const e of report.self_loops) lines.push(`  ${e.from}:${e.line}:${e.column}  ${e.layer}:${e.kind}  ->  ${e.to}`);
  lines.push(``, `派生产物（由 src/ 路径推导，仅列图 files[] 中真实存在者；来源 build-artifact）：${report.derived_artifacts.length} 个`);
  if (report.derived_artifacts.length === 0) lines.push('  （无：该目标没有图里存在的派生产物，不凭空构造路径）');
  for (const d of report.derived_artifacts) {
    lines.push(`  ${d.path}  source=${d.source}  state=${d.state}`);
  }
  lines.push(``, `门禁义务项（来源 gate:，由图里既有事实推导）：${report.gate_obligations.length} 条`);
  if (report.gate_obligations.length === 0) lines.push('  （无：没有派生产物，也没有指向它们的既有边）');
  for (const g of report.gate_obligations) {
    if (g.kind === 'script') lines.push(`  执行 ${g.command}  —— 为什么要做：${g.why}`);
    else {
      lines.push(
        `  ${g.edge_kind} 边 ${g.from_file}:${g.line}:${g.column} -> ${g.to_file}（specifier=${g.specifier === null ? '-' : g.specifier}）  —— 为什么要做：${g.why}`,
      );
    }
  }
  lines.push(``, `空列表怎么读：${report.empty_referrers_reading}`);
  return lines.join('\n');
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err.message}\n\n${usage()}\n`);
    process.exit(EXIT.usage);
  }
  if (opts.help) {
    process.stdout.write(`${usage()}\n`);
    process.exit(EXIT.ok);
  }
  if (opts.positional.length === 0) {
    process.stderr.write(`缺少查询与目标\n\n${usage()}\n`);
    process.exit(EXIT.usage);
  }
  const [query, target] = opts.positional;
  if (query !== 'who-references' && query !== 'impact') {
    process.stderr.write(`未实现的查询：${query}（本版只有 who-references、impact）\n`);
    process.exit(EXIT.usage);
  }
  if (!target) {
    process.stderr.write(`查询 ${query} 缺少目标路径\n`);
    process.exit(EXIT.usage);
  }

  let root;
  try {
    root = resolveRoot(opts.root);
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exit(EXIT.usage);
  }

  const loaded = loadArtifact(root);

  if (!loaded.artifact) {
    const payload = {
      query,
      kind: 'file',
      target: normalizeTarget(target),
      unsupported: false,
      basis: 'none',
      completeness: 'unknown',
      reasons: [`读不到图产物 ${REL}：既不在 git 索引，也不在工作区（${path.join(root, REL)}）。`],
      gaps: [],
      empty_referrers_reading: emptyReading('unknown'),
      counts: { file_edges: 0, referrer_files: 0, symbol_edges: 0, runtime_refs: 0, type_refs: 0 },
      direct_referrers: [],
      symbol_referrers: [],
    };
    die(opts, EXIT.unreadable, `读不到图产物 ${REL}：既不在 git 索引，也不在工作区（${path.join(root, REL)}）`, payload);
  }

  const norm = normalizeTarget(target);
  const known = new Set((loaded.artifact.files || []).map((f) => f.id));
  if (norm.includes('#')) {
    die(
      opts,
      EXIT.unsupported,
      `本版未实现符号 id 输入：${target}（只支持文件路径；符号级信息只在输出里的 symbol_edges[] 出现）`,
      {
        query,
        kind: 'symbol',
        target: norm,
        unsupported: true,
        basis: loaded.basis,
        completeness: 'unknown',
        reasons: ['本版未实现符号 id 输入：请改用文件路径查询；符号级边只在文件查询结果的 symbol_referrers[] 中呈现。'],
        gaps: ['符号 id 解析与反查未实现。'],
        empty_referrers_reading: emptyReading('unknown'),
        counts: { file_edges: 0, referrer_files: 0, symbol_edges: 0, runtime_refs: 0, type_refs: 0 },
        direct_referrers: [],
        symbol_referrers: [],
      },
    );
  }
  if (!known.has(norm)) {
    const near = [...known].filter((f) => f.endsWith(norm)).sort(byteCompare).slice(0, 5);
    die(
      opts,
      EXIT.notfound,
      `目标不在图里：${norm}（不在 files[] 的 ${known.size} 个节点中）${near.length ? `；近似：${near.join(', ')}` : ''}`,
      {
        query,
        kind: 'file',
        target: norm,
        unsupported: false,
        basis: loaded.basis,
        completeness: 'unknown',
        reasons: [`目标不在图产物节点表 files[] 里：${norm}`],
        gaps: [],
        empty_referrers_reading: emptyReading('unknown'),
        counts: { file_edges: 0, referrer_files: 0, symbol_edges: 0, runtime_refs: 0, type_refs: 0 },
        direct_referrers: [],
        symbol_referrers: [],
      },
    );
  }

  if (query === 'impact') {
    const report = buildImpactReport(opts, norm, loaded);
    if (opts.json) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    else process.stdout.write(`${renderImpactHuman(report)}\n`);
    process.exit(EXIT.ok);
  }

  const report = buildReport(opts, norm, loaded);
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    const shown = opts.limit === 0 ? report.symbol_referrers : report.symbol_referrers.slice(0, opts.limit);
    process.stdout.write(`${renderHuman(report, opts, shown)}\n`);
  }
  process.exit(EXIT.ok);
}

main();
