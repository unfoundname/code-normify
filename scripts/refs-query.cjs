#!/usr/bin/env node
'use strict';
/**
 * refs-query.cjs —— 引用图产物 `ledger/references.json` 的**只读查询层**。
 *
 * 实现三条查询：
 *   · who-references <仓库相对路径>（「谁直接引用我这个文件」）与
 *     impact <仓库相对路径>（「谁（间接）引用我」：反向闭包按深度分组，每个受影响文件附一条最短引用链 path[]，
 *     另附闭包子图内的环 cycles[]/self_loops[]、派生产物与 gate: 义务项）——
 *     这两条的数据源只有图产物：不重新分析源码、不建 TypeScript Program、不读目标文件本身；
 *   · locals <仓库相对路径>（「这个文件里声明了哪些形参 / 箭头形参 / 局部变量」）——
 *     只把该文件解析成一棵 TypeScript 语法树（ts.createSourceFile，**不建 Program、不做类型检查**），
 *     **不读也不写图产物**，因此没有 basis 字段；三条局限见 LOCALS_LIMITATIONS（--help 与 --json 字字相同）。
 * typescript 是**惰性** require 的：只有 locals 需要语法树，另外两条查询不付这份启动成本。
 * 读取基准（who-references / impact）：优先 git 索引版（git show :ledger/references.json）；索引里取不到才回退
 * 工作区文件，并把实际用的那一份写进输出的 basis 字段。
 *
 * 符号边口径守卫（--self-check）：who-references 与 impact 对 symbol_edges[] 的**筛选口径只有一份**
 * （isCountedSymbolEdge / symbolEdgeTargetFile），两条查询各经一个命名入口取到**同一个函数引用**；
 * --self-check 把这件事变成可执行断言（同一引用 + 逐目标集合相等 + 产物不变量），任一失败即非零退出。
 *
 * 退出码：0 成功；1 口径守卫（--self-check）断言失败；2 参数/根不合法；3 读不到图（locals 另含：读不到目标文件 / 拿不到 typescript）；
 *         4 输入不受支持（符号 id；locals 的非源码扩展名）；5 目标不在图里。
 * 输出确定性：所有排序按 UTF-8 字节序（Buffer.compare），禁用 localeCompare；
 * JSON 里不含绝对路径、时间戳、耗时。
 */

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
let ts = null; // typescript 惰性加载：只有 locals 需要语法树（见 loadTypeScriptForLocals）

const REL = 'ledger/references.json';
const EXIT = { ok: 0, guard: 1, usage: 2, unreadable: 3, unsupported: 4, notfound: 5 };
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
    '      node scripts/refs-query.cjs locals <仓库相对路径> [选项]',
    '      node scripts/refs-query.cjs --self-check [--root <目录>] [--json]',
    '',
    '查询：',
    '  who-references <路径>   谁直接引用这个文件（读 ledger/references.json；单层查询、不沿引用链推进，',
    '                          不吃 --depth，顶层 truncated 恒为 false —— 目标的全部直接引用者都在结果里）',
    '  impact <路径>           谁（间接）引用这个文件：反向闭包按深度分组，每个受影响文件给出最短引用链',
    '                          path[]（BFS 最短，形如 A ⇐ B ⇐ 目标），另列闭包子图内的环 cycles[]/自环、派生产物与 gate: 义务项，',
    '                          并把闭包文件分成三档 buckets[]（先按边分档，文件取它 via 中那些边（指向上一层；不是入边）的最高档，一个文件只进一个档）：',
    '                            必须改 must_change —— 边悬空（status=dangling），或 kind ∈ import/export-from/require/',
    '                                                   dynamic-import/type-reference（代码级引用，对方编译或运行会坏）',
    '                            需复核 needs_review —— kind ∈ ci-target/package-field/anchor/markdown-link（要人看一眼）',
    '                            记录   record       —— 其余边，只登记',
    '                          三档在人类可读与 --json 里恒存在，空档也照列（0 条），「没有」与「没做」不混。',
    '                          闭包受 --depth 限制：被截断时顶层 truncated=true 且带 truncated_reason="depth-limit"',
    '                          （判据：处理完最大深度层之后仍有未被收进结果集的引用者；**不是** actual_depth === max_depth），',
    '                          人类可读输出在被截断时另打一行 ⚠ 提示；没截断 ⇒ truncated=false，此时 closure 按图产物已完整展开。',
    '                          档内另有正交标注 type_only（**不是第四档**），判据是**可达性**：在「目标 ∪ 闭包」内只沿',
    '                          **运行时边**（import / export-from / require / dynamic-import / package-field / ci-target，',
    '                          以及符号级边；type_only=true 的纯类型语句与 markdown-link / anchor 这类纯文字引用不算）走，',
    '                          从这个文件**能否到达目标**：到不了 ⇒ 给出**有边界**的「仅类型级影响」标注（闭包按图产物',
    '                          **全深度展开**，不受 --depth 截断影响，但产物之外 / 未统计到的路径仍可能触及目标，标注里',
    '                          明写「不要据此跳过测试」）；到得了 ⇒ 不标；目标不是 .ts/.tsx ⇒「不可判」——',
    '                          「不标」不等于「没有类型级影响」。',
    '  locals <路径>           这个文件里声明了什么（**只解析该文件自身的语法树**，不读图产物、不进图产物）：',
    '                          形参 params[] / 箭头形参 arrow_params[] / 局部变量 locals[]，每条 { name, line, column }',
    '                          （行、列都是 1-based，取标识符起点，与 params 同一套坐标，例：leadRef = 7:75）。',
    '                          局部变量 = 该文件里 const/let/var 声明语句（VariableStatement）的标识符，且其最近外层',
    '                          函数式节点正是某个函数（模块级变量不算），形参不算局部变量；**不按名字合并去重**——',
    '                          同名不同位置各出一条；解构写法按其中的标识符逐个出（各占自己的位置）。',
    '                          locals 只认源码扩展名（.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs），其它扩展名以',
    '                          unsupported 拒绝（退出码 4）——拿 Markdown 之类的文本当 TS 解析只会给出假清单。',
    '',
    'locals 的三条局限（必须连结果一起读；--json 里对应 limitations[]，字字相同）：',
    '  · 不做作用域分析：同名遮蔽无法判定',
    '  · 只覆盖该文件内部',
    '  · 语法级不支持 eval / 动态属性',
    '',
    '选项：',
    '  --self-check    口径守卫：断言 who-references 与 impact 对符号级边 symbol_edges[] 的筛选口径是**同一份**',
    '                  （同一函数引用 + 对 files[] 里每个目标集合相等 + 产物不变量），任一断言失败 ⇒ 退出码 1。',
    '                  不查任何目标、不吃位置参数；只读图产物，不写任何东西。',
    '  --json          以 JSON 输出（who-references/impact：含全部符号级边；locals：params/arrow_params/locals/',
    '                  limitations；确定性、无绝对路径/耗时）',
    '  --root <目录>   仓库根，默认当前目录；不是 git 仓库根则非零退出',
    '  --limit <n>     人类可读输出里最多显示多少条符号级边（默认 40，0 = 全部）',
    '  --depth <n>     impact 的反向闭包深度上限（默认 8）',
    '  --help          显示本帮助',
    '',
    '不支持：符号 id 输入（如 src/tools.ts#Name@1:2）——会以 unsupported 拒绝。',
    '退出码：0 成功 / 1 口径守卫（--self-check）断言失败 / 2 参数或根不合法 / 3 读不到图（locals 另含：读不到目标文件 / 拿不到 typescript）',
    '        / 4 输入不受支持（符号 id；locals 的非源码扩展名） / 5 目标不在图里。',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { root: process.cwd(), json: false, help: false, selfCheck: false, limit: DEFAULT_SYMBOL_ROWS, depth: DEFAULT_IMPACT_DEPTH, positional: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--self-check') opts.selfCheck = true;
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

// ───────────────── ★ 符号边筛选口径：全脚本唯一一份（--self-check 守卫它不被各查各的） ─────────────────
// who-references 与 impact 都从本节取 symbol_edges[] 的筛选结果；两条查询各有一个**命名入口**
// （whoReferencesSymbolSource / impactSymbolSource），--self-check 断言两个入口取到的是**同一个函数引用**。
// 规矩：任何对符号级边的筛选都必须经由本节的函数，不许在别处再写一份内联 filter / 内联 to.file 判断——
// 各自实现过一次（who-references 数「to.file 命中 OR to.sym 前缀命中」，impact 数「两端都是文件」），
// 那份重复口径就是漂移的入口，已收敛到这里。

/**
 * 口径①：这条符号级边指向**哪个文件**。to.file 优先（产物里它就是文件 id）；
 * to.file 缺失时才用 to.sym 的 `<file>#<name>@<line>:<col>` 前缀反推——产物里文件名不含 `#`，
 * 因此第一个 `#` 就是分隔符。两处答案会不会打架，由 --self-check 的 sym-prefix-matches-to-file 断言逐条盯着。
 * 返回 null = 这条边指不到任何文件（外部模块 / 未解析符号）。
 */
function symbolEdgeTargetFile(edge) {
  const toFile = edge && edge.to && edge.to.file;
  if (typeof toFile === 'string') return toFile;
  const sym = edge && edge.to && edge.to.sym;
  if (typeof sym === 'string') {
    const hash = sym.indexOf('#');
    if (hash > 0) return sym.slice(0, hash);
  }
  return null;
}

/**
 * 口径②：这条符号级边**进不进统计**。判据：两端都能落到图里的文件节点上——
 * from.file 是字符串，且目标文件可判定（见口径①）。端点悬空的边（外部模块 / 未解析符号，产物里表现为
 * to.file=null、to.state=outside/null）给不出「谁引用了谁」的事实，故不进。
 * **注意这不是 kind 判据**：未归类 kind 的 fail-closed 在 RUNTIME_EDGE_POLICY（isRuntimeEdge）里，不在这里。
 */
function isCountedSymbolEdge(edge) {
  return (
    !!edge &&
    typeof (edge.from && edge.from.file) === 'string' &&
    typeof symbolEdgeTargetFile(edge) === 'string'
  );
}

/**
 * 唯一入口的公共实现：一次筛选，两个答案（准入 + 目标文件）。
 * 两个答案都以**函数引用**的形式交出去，--self-check 据此断言两条查询用的是同一份口径。
 */
function symbolEdgeSource(artifact) {
  return {
    edges: (artifact.symbol_edges || []).filter(isCountedSymbolEdge),
    filter: isCountedSymbolEdge,
    targetFileOf: symbolEdgeTargetFile,
  };
}

/** who-references 的符号边来源：buildReport **只许**从这里取 symbol_edges[]。 */
function whoReferencesSymbolSource(artifact) {
  return symbolEdgeSource(artifact);
}

/** impact 的符号边来源：buildReverseIndex 与 gateObligations **只许**从这里取 symbol_edges[]。 */
function impactSymbolSource(artifact) {
  return symbolEdgeSource(artifact);
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
  // 符号级边：**只经共享口径入口**（★ 见本节上方的「符号边筛选口径」）——准入与「目标文件」两问都在那里，
  // 这里不再自带一份 to.file / to.sym 判断。impact 用的是同一个 source，口径漂移由 --self-check 拦下。
  const symbolSrc = whoReferencesSymbolSource(artifact);
  const symbolRows = sortRows(
    symbolSrc.edges
      .filter((e) => symbolSrc.targetFileOf(e) === target)
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
    '文件级 edges[] 的 type_only 如实表达「该边所在语句是否为纯类型语句」（import type / export type … from；require()/import() 与无 TypeScript 时的正则回退一律按运行时）；但本查询的运行时/类型拆分仍只数 symbol_edges[]——counts 里的 runtime_refs / type_refs 取自 symbol_referrers[] 的 type_only，文件级边不参与这两个计数。',
    '本查询只列**直接**引用方，不沿引用链继续推进：没有 by_depth / closure / buckets / cycles / path 之类间接结论，要看间接影响请用 impact；也未实现 what-references、change-impact 等其它查询——本版只有 who-references、impact、locals 三条（另两条的口径与局限写在它们各自输出的 gaps[] / reasons[] 与 --help 里，不在这里复述）。',
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
    // truncated：**恒为 false**，且这是实测判据的结果、不是图省事的占位——who-references 是**单层**查询：
    // 只列「直接」引用本文件的边，不沿引用链推进、不吃 --depth（--depth 只作用于 impact）。结果集 =
    // 目标文件的全部文件级直接引用边（direct_referrers[]）+ 全部指向本文件的符号级边（symbol_referrers[]），
    // 两者都是全量（--limit 只截人类可读输出的显示条数，且已有显式提示行；--json 与计数始终全量）。
    // 按 impact 的同一判据读：处理完「最大深度层」（这里 = 第 1 层，目标的全部直接引用者）之后，
    // 没有任何未被收进结果集的引用者 ⇒ 不存在被 --depth 截断的结果，字段照实写 false。
    truncated: false,
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
  // 两层的「键」都由调用方给出：文件级边用 to.file；符号级边的准入与目标文件都来自**共享口径入口**
  // （★ impactSymbolSource，与 who-references 同一个函数引用）——这里不再自带一份符号边判断。
  const add = (layer, e, toFile) => {
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
  for (const e of artifact.edges || []) add('file', e, e && e.to && e.to.file);
  const symbolSrc = impactSymbolSource(artifact);
  for (const e of symbolSrc.edges) add('symbol', e, symbolSrc.targetFileOf(e));
  return map;
}

/**
 * 反向闭包：从 target 出发沿「谁引用了它」逐层传递，文件级与符号级两层同时走。
 * 一个文件只记它第一次出现的深度（最浅深度），深度与文件顺序都确定性排序。
 * 同时记父指针 parent：file -> { from, edge }，其中 from 是「链上更靠近 target 的那一端」（file 引用了 from）。
 * 父指针与最浅深度同源：只在**首次入队**时定型，同一层内的先后由 frontier/via 的确定性顺序决定，
 * 后续更深的路径一律不覆盖。BFS 逐层推进保证首次入队即最短，故沿 parent 回溯得到的就是最短引用链。
 * 返回值另带 truncated：**结果是否被 maxDepth 截断**，判据见函数末尾（不是 actual_depth === max_depth）。
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
  // 截断判据（**照口径，不自创**）：**处理完最大深度层之后，仍有未被收进结果集的引用者** ⇒ 结果被 --depth 截断。
  // 刻意**不**用 `actual_depth === maxDepth`：那分不清「恰好走到第 maxDepth 层且再无引用者」与「被砍掉了」，
  // 前者不是截断，后者才是。循环结束时 frontier 正是「最后处理完的那一层」的推进前沿（一层都没处理时是 [target]，
  // 覆盖「第 maxDepth 层还有引用者」的情形）；逐一看它还有没有没见过的引用者即可。
  // 提前 break（via.size === 0，闭包已穷尽）时 frontier 是最后一层的文件，它们的引用者全在 seen 里 ⇒ 恒为 false。
  let truncated = false;
  for (const cur of frontier) {
    if ((rev.get(cur) || []).some((row) => !seen.has(row.from_file))) {
      truncated = true;
      break;
    }
  }
  const closure = [...seen].filter((f) => f !== target).sort(byteCompare);
  return { levels, closure, parent, truncated };
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
  // 符号级边走共享口径入口（★ impactSymbolSource）——与 who-references、impact 反向索引同一份准入。
  for (const e of impactSymbolSource(artifact).edges) add('symbol', e);
  return sortRows(
    rows,
    (r) => `${r.kind === 'script' ? '0' : '1'}|${r.command || ''}|${r.layer || ''}|${r.edge_kind || ''}|${r.edge_id || ''}`,
  );
}

/**
 * 三档分类的档定义。**先按边分档，再把文件归入它 via 中那些边的最高档**（via = 把该文件牵进闭包的那组边，即它指向上一层的出边）——一个文件只出现在一个档里。
 * 定档只看这条边自身的两个事实：① 目标是否已悬空（status === 'dangling'）；② 边的 kind。
 * 优先级 必须改 > 需复核 > 记录：一个文件由 via 中多条边带入闭包时取最高档。
 * kind 是封闭枚举（产物里实际出现：file 层 import / export-from / require / dynamic-import /
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
  '仅类型级影响：在「目标 ∪ 完整闭包」内只沿运行时边走，从这个文件到目标没有路径；删改后至少需过 tsc，但图产物之外的引用、未统计到的路径仍可能间接触及目标——不要据此跳过测试';
const ANNOTATION_UNDETERMINABLE = '不可判';
/** 目标以 .ts/.tsx 结尾才谈得上「类型级 / 运行时」之分。 */
const TS_TARGET = /\.tsx?$/;

/**
 * 「运行时边」判据——**会导致目标被「加载或执行」的边**。这是**封闭枚举**：产物里出现的每个 kind 都在此
 * 显式归类；遇到未归类的 kind 直接抛错（本仓「无静默 null」的同族要求：判据不许有静默默认值）。
 *
 * **被否掉的替代方案**：「凡 type_only !== true 的边都算运行时」。它对**文档**说假话——`markdown-link` /
 * `anchor` 的 type_only 是 false（它们确实不是「纯类型语句」），于是一份文档里指向源码文件的一句文字链接
 * 会被判成「存在运行时路径」。判据必须是「会不会加载 / 执行目标」，不是「这条语句是不是纯类型语句」。
 *
 * 三档归类（覆盖产物里实际出现的全部 9 个 kind——file 层 import / export-from / require / dynamic-import /
 * ci-target / package-field / anchor / markdown-link，symbol 层 import / export-from / type-reference）：
 *   code   代码级引用（含全部符号级边）：**只有当这条边本身不是纯类型语句时**才会加载 / 执行目标。
 *          `import type …` / `export type … from` 编译后整句消失；`type-reference` 来自 TypeReferenceNode
 *          （产物里恒为 type_only=true），删掉目标只会让 tsc 变红。故 type_only !== true 才算运行时。
 *   always npm / CI 会**真的执行**它：`package-field`（如 npm 包清单里的 bin 指向该文件）、`ci-target`
 *          （CI 步骤会跑它）——与「只是提到这个路径」有本质区别。
 *   never  **只是文字引用**：一份文档链接到某个源码文件（markdown-link）、或在文档内跳转（anchor），
 *          **不会加载、也不会执行它**。
 */
const RUNTIME_EDGE_POLICY = new Map([
  ['import', 'code'],
  ['export-from', 'code'],
  ['require', 'code'],
  ['dynamic-import', 'code'],
  ['type-reference', 'code'],
  ['package-field', 'always'],
  ['ci-target', 'always'],
  ['markdown-link', 'never'],
  ['anchor', 'never'],
]);

/**
 * 单条边是否为运行时边。**未归类的 kind 抛错**：判据是封闭枚举，新增 kind 必须在这里显式归类，
 * 不许静默默认——默认「是」会把文档链接说成运行时依赖，默认「否」更会把运行时依赖说成「不必跑测试」。
 */
function isRuntimeEdge(edge) {
  const policy = RUNTIME_EDGE_POLICY.get(edge.kind);
  if (policy === undefined) {
    const fromFile = edge && edge.from && edge.from.file;
    throw new Error(
      `未归类的边 kind：${JSON.stringify(edge && edge.kind)}（from=${typeof fromFile === 'string' ? fromFile : '?'}）——` +
        '运行时边判据是封闭枚举，新增 kind 必须在 RUNTIME_EDGE_POLICY 里显式归类，不许有静默默认值',
    );
  }
  if (policy === 'always') return true;
  if (policy === 'never') return false;
  return edge.type_only !== true;
}

/**
 * 运行时边邻接索引：from_file -> Set(to_file)。**只读**，不参与闭包推进 / 计数 / 环检测 / path 回溯。
 * 每次 impact 建一份（产物约 1.8k 条边），供闭包内每个文件做一次可达性 BFS。
 * 端点缺失的边（外部模块、未解析符号）不进索引——它们给不出「谁能加载谁」的事实；
 * 但 **kind 归类先于端点检查**：端点缺失不能成为放过一个未归类 kind 的理由。
 * ★ 因此这里刻意**不**预筛共享口径（symbolEdgeSource）：本函数必须遍历**全部** symbol_edges[]，
 *   才能在端点缺失之前先做 kind 归类（fail-closed）。「谁引用谁」的准入是 symbolEdgeSource 的事，不是这里的。
 */
function buildRuntimeAdjacency(artifact) {
  const adj = new Map();
  const add = (edge) => {
    const runtime = isRuntimeEdge(edge); // 先判 kind：未归类即抛错，不因为端点缺失而被跳过
    const fromFile = edge && edge.from && edge.from.file;
    const toFile = edge && edge.to && edge.to.file;
    if (typeof fromFile !== 'string' || typeof toFile !== 'string') return;
    if (!runtime) return;
    if (!adj.has(fromFile)) adj.set(fromFile, new Set());
    adj.get(fromFile).add(toFile);
  };
  for (const e of artifact.edges || []) add(e);
  for (const e of artifact.symbol_edges || []) add(e);
  return adj;
}

/**
 * 在 nodes 内、只沿运行时边，判断 from 能否到达 target（BFS）。只读邻接索引，不写任何闭包状态。
 * 把节点限制在 nodes（= target ∪ 闭包）**不会漏掉任何路径**：任何一条 from → … → target 的运行时路径，
 * 其中间节点都（传递地）引用 target，按定义都在反向闭包里——所以「在 target ∪ 闭包内可达」与
 * 「在整个图里可达」等价。**但这条等价性只在闭包完整时成立**：nodes 若被 --depth 截断，
 * 中间节点可能落在闭包外，于是产出一个假的「到不了」（见 buildImpactReport 里的完整闭包）。
 */
function reachesTargetWithin(from, target, adj, nodes) {
  if (from === target) return true;
  if (!nodes.has(from)) return false;
  const seen = new Set([from]);
  const queue = [from];
  for (let head = 0; head < queue.length; head += 1) {
    for (const next of adj.get(queue[head]) || []) {
      if (seen.has(next) || !nodes.has(next)) continue;
      if (next === target) return true;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}

/**
 * 正交标注 type_only——**不是第四档，是档内标注**。
 * 判据（本版改口径）：在「**target ∪ 完整闭包**」内、只沿**运行时边**（见 RUNTIME_EDGE_POLICY）走，
 * **从这个文件能否到达目标**——回答的就是「该文件到目标有没有运行时路径」这个问题本身。
 *
 * 为什么不再看 via：旧判据是「via（把该文件牵进闭包的那组边，即它指向上一层的出边）里的符号级行是否
 * 全部 type_only === true」，它答的是「这个文件**被牵进来的那一步**是不是类型级的」，
 * **答不出**「该文件到目标有没有运行时路径」——同一个文件可由多条边、多条路径牵入，
 * 只看其中一步会同时漏报（另一条路径就是运行时的）与误报。
 *
 * 为什么必须用完整闭包：展示用的闭包有深度上限 --depth（默认 8）。在截断集合里做 BFS，会把「路径长于
 * 上限」的文件判成「没有运行时路径」——那是假话，而且**默认配置下就会发生**。故标注另用无深度上限的那份闭包。
 *
 * 判据边界（照实说）：只看**图产物里的边**。产物之外的引用、生成器没统计到的路径，仍可能让该文件在
 * 运行时触及目标，所以标注文案明写「不要据此跳过测试」。
 *
 * 三态：
 *   - 到不了 target ⇒ type_only / no-runtime-path-in-closure + **有边界**的 ANNOTATION_TYPE_ONLY；
 *   - 到得了 target ⇒ runtime / runtime-path-exists，**不标**（真有运行时路径，删改会真的跑坏东西）；
 *   - 目标本身不是 .ts/.tsx ⇒ undeterminable / target-not-typescript（文档/JSON/CI 没有类型/运行时之分）。
 *
 * ★ 有意的行为变化：旧版「via 里没有任何符号级边 ⇒ undeterminable / no-symbol-layer-edge」这一支**取消**。
 *   新判据不依赖「有没有符号级边」：只被文件级 import 牵进来的文件照样能回答「能不能到达目标」，
 *   再标「不可判」是拿工具的输入形态当结论。取值集合因此变为
 *   {target-not-typescript, no-runtime-path-in-closure, runtime-path-exists}。
 */
function typeOnlyAnnotation(target, file, runtimeAdj, closureNodes) {
  if (!TS_TARGET.test(target)) {
    return { state: 'undeterminable', reason: 'target-not-typescript', text: ANNOTATION_UNDETERMINABLE };
  }
  if (reachesTargetWithin(file, target, runtimeAdj, closureNodes)) {
    return { state: 'runtime', reason: 'runtime-path-exists', text: null };
  }
  return { state: 'type_only', reason: 'no-runtime-path-in-closure', text: ANNOTATION_TYPE_ONLY };
}

/** impact 报告：反向闭包 + 按深度分组的受影响文件（每个文件一条最短引用链 path[]）+ 派生产物分区（build-artifact）+ 门禁义务项分区（gate:）。 */
function buildImpactReport(opts, target, loaded) {
  const { levels, closure, parent, truncated } = reverseClosure(loaded.artifact, target, opts.depth);
  // type_only 标注的判据是「该文件到目标有没有运行时路径」，它必须建立在**完整闭包**上：展示口径受 --depth
  // （默认 8）截断，在截断集合里做可达性 BFS 会把「路径长于上限」的文件判成「没有运行时路径」——那是假话，
  // 而且默认配置下就会发生。所以另算一份**无深度上限**的反向闭包，只喂给标注判据：
  //   · levels / by_depth / closure / counts / cycles / path **一律仍用 opts.depth 的那一份**，一个都不改；
  //   · 成本 = 反向 BFS 一遍全图（files[] 约 1415 个节点），可忽略。
  const annotationNodes = new Set([target, ...reverseClosure(loaded.artifact, target, Number.POSITIVE_INFINITY).closure]);
  const runtimeAdj = buildRuntimeAdjacency(loaded.artifact);
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
  // type_only 标注另算（可读性：它吃完整闭包与运行时边索引，与分档用的 via 无关）。
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
        type_only: typeOnlyAnnotation(target, f.file, runtimeAdj, annotationNodes),
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
    'type_only 是档内**正交标注**，不是第四档：判据是**可达性**——在「target ∪ 完整闭包」内只沿运行时边（import / export-from / require / dynamic-import / package-field / ci-target，以及符号级边；type_only=true 的纯类型语句与 markdown-link / anchor 这类纯文字引用不算）走，从这个文件能否到达目标；到不了 ⇒ 给出有边界的「仅类型级影响」标注，到得了 ⇒ 不标，目标不是 .ts/.tsx ⇒ 「不可判」——「不标」只代表存在到得了目标的运行时路径，不代表没有类型级影响。标注用的闭包**按图产物全深度展开、不受 --depth 截断影响**（展示用的 by_depth/closure 仍受 --depth 限制，见下一条），否则路径长于上限的文件会被说成「没有运行时路径」。标注自身**有边界**：只声明图产物里的边如此，不排除产物之外或未统计到的路径间接触及目标——不要据此跳过测试。',
    '未做 informational（三档分类、type_only 标注与截断标注已做，见 buckets[] 与顶层 truncated / truncated_reason）。',
    'cycles[] 只在闭包子图（target ∪ 闭包文件）内求强连通分量，不是全图 SCC：闭包之外的环不报（换个 target 才看得到）；环用的也是文件级/符号级反向边，文件内边（两端同文件）带不来新节点、进不了 size>1 的分量；自环单列在 self_loops[]（只含文件级自环，即 edges[] 里 from.file === to.file 的边；同文件内部的符号边不算），不混进 size>1 的分量。',
    'path[] 只给一条最短链（BFS 首达即定型）：同一文件存在多条等价最短链时只列首达的那条；链上每跳用的边（layer/kind/行:列）在 path_edges[] 里。',
    truncated
      ? `闭包深度上限 --depth ${opts.depth}：**结果被截断**——处理完第 ${opts.depth} 层后仍有未被收进结果集的引用者（顶层 truncated=true，truncated_reason=depth-limit），更深的层未展开，closure / counts / buckets 都不完整。`
      : `闭包深度上限 --depth ${opts.depth}：本次**没有截断**——处理完最深一层（第 ${levels.length} 层）后不再有未被收进结果集的引用者（顶层 truncated=false），按图产物 closure 已完整展开。`,
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
    truncated,
    ...(truncated ? { truncated_reason: 'depth-limit' } : {}),
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
        // via 展示的是「把该文件牵进闭包的那组边」的**位置路径**（from_file:line:column）。同一个位置上常常
        // 同时挂着一条文件级边和 N 条符号级边（一条 `export … from` / `import …` 带 N 个符号 ⇒ N 条符号边，
        // 它们与那条文件级边同行同列），原样打印会把**同一条路径重复 N 遍**——实测 src/index.ts:4:15 指向
        // src/engine/types.ts 的 29 条边（1 文件级 + 28 符号级）会渲染成 29 个一模一样的字符串。
        // 因此这里按字符串去重（保序，BFS 的确定性顺序不变）。**只去重展示**：edges 计数
        // （affected_edges / file_layer_edges / symbol_layer_edges）与三档的 via_edges 仍按**边**数统计，
        // 不在这里改口径——「29 条边」是事实，「29 条相同路径」是噪音。
        via: [...new Set(f.via.map((v) => `${v.from_file}:${v.line}:${v.column}`))],
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
  ];
  // 被 --depth 截断时必须在人类可读输出里也说出来：只写在 JSON 里等于没告诉直接看输出的人。
  if (report.truncated) {
    lines.push(
      `⚠ 结果被 --depth ${report.max_depth} 截断，仍有未访问的引用者（truncated=true，truncated_reason=${report.truncated_reason}）：下面的 closure / counts / buckets 都不完整，加 --depth 或别把它当完整结果读。`,
    );
  }
  lines.push(
    `原因/缺口 reasons：`,
    ...report.reasons.map((r) => `  - ${r}`),
    `闭包合计：${c.affected_files} 个文件，${c.affected_edges} 条边（文件级 ${c.file_layer_edges} / 符号级 ${c.symbol_layer_edges}）`,
  );
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

// ───────────────────── locals <文件>：按需展开单文件清单 ─────────────────────
// 只建语法树（ts.createSourceFile），不建 Program、不做类型检查、不读图产物；
// 结果只打印，绝不写回 ledger/references.json —— 图里没有的东西不塞进图。

function lcOf(sf, node) {
  const lc = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  return { line: lc.line + 1, column: lc.character + 1 };
}

// ───────────────────── locals <文件>：按需展开单文件清单 ─────────────────────
// 只建语法树（ts.createSourceFile），不建 Program、不做类型检查、不读图产物；
// 结果只打印，绝不写回 ledger/references.json —— 图里没有的东西不塞进图。
// typescript 惰性加载：who-references / impact 不付这份启动成本（约 200ms）。

/**
 * locals 的三条局限：**同一个字面量数组**同时喂 --help 与 --json 的 limitations[]（两处必须字字一致）。
 * 措辞是定稿，不要改写——它就是这条查询的诚实边界声明。
 */
const LOCALS_LIMITATIONS = [
  '不做作用域分析：同名遮蔽无法判定',
  '只覆盖该文件内部',
  '语法级不支持 eval / 动态属性',
];

/** locals 认的源码扩展名：拿 Markdown / JSON 之类的文本当 TS 解析，只会给出一份假清单，故一律拒绝。 */
const LOCALS_SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);

/**
 * 惰性加载仓库自带的 typescript（候选根与 reference-graph-core 的 TYPESCRIPT_CANDIDATE_ROOTS 对齐）。
 * 失败返回错误文案：locals 拿不到语法树就**什么都回答不了**，绝不用正则假装一份清单（那才是假绿）。
 */
function loadTypeScriptForLocals() {
  const tried = [];
  for (const base of [__dirname, path.resolve(__dirname, '..')]) {
    try {
      const mod = require(require.resolve('typescript', { paths: [base] }));
      if (mod && typeof mod.createSourceFile === 'function') {
        ts = mod;
        return null;
      }
      tried.push(`${base}: 模块里没有 createSourceFile`);
    } catch (err) {
      tried.push(`${base}: ${(err && err.code) || (err && err.message) || 'require 失败'}`);
    }
  }
  return `拿不到 typescript（locals 需要它做语法解析；试过：${tried.join('；')}）`;
}

/** 函数式节点：locals 的「最近外层函数」判据只认这些（骨架点名的四类 + 构造器/访问器）。惰性求值，故不缓存 kind 常量。 */
function isFunctionLikeNode(node) {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

/** 绑定名（可能是指识符，也可能是解构模式）→ 其中的全部标识符节点；不按名字合并，各留自己的位置。 */
function bindingIdentifiers(nameNode, out) {
  if (ts.isIdentifier(nameNode)) {
    out.push(nameNode);
    return out;
  }
  if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
    for (const el of nameNode.elements) {
      if (ts.isBindingElement(el)) bindingIdentifiers(el.name, out);
    }
  }
  return out;
}

function collectParamsMinimal(sf) {
  const params = [];
  const arrowParams = [];
  const sink = (nameNode, kind, into) => {
    if (!ts.isIdentifier(nameNode)) return;
    into.push({ name: nameNode.text, declaration_kind: kind, ...lcOf(sf, nameNode) });
  };
  const visit = (node) => {
    if (ts.isArrowFunction(node)) for (const p of node.parameters) sink(p.name, 'arrow_parameter', arrowParams);
    else if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) {
      for (const p of node.parameters) sink(p.name, 'parameter', params);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return { params, arrowParams };
}

/**
 * 局部变量：该文件里 VariableStatement（const/let/var 声明语句）的标识符，且其**最近外层函数式节点正是某个函数**
 * （模块级变量不算局部变量），且这些标识符**不是形参**。
 * 实现就是那条判据本身：每遇到一个函数式节点 fn，只走 fn 自己的 body，**不下潜进嵌套的函数式节点**
 * （那些变量属于嵌套函数，由外层的遍历在轮到它时收），再排除 fn 的形参名
 * （`function f(a) { var a = 1 }` 里的 a 是形参，不是局部变量）。
 * 不按名字合并去重：同名不同位置各出一条。结果按 (行, 列) 排序——函数嵌套时收集顺序会先外后内，必须显式排序才确定
 * （Node 的 Array#sort 稳定，同位置不可能重复，因此确定）。
 */
function collectLocalsMinimal(sf) {
  const locals = [];
  const inspect = (fn) => {
    const paramNames = new Set();
    for (const p of fn.parameters) for (const id of bindingIdentifiers(p.name, [])) paramNames.add(id.text);
    const walk = (node) => {
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          for (const id of bindingIdentifiers(decl.name, [])) {
            if (!paramNames.has(id.text)) locals.push({ name: id.text, ...lcOf(sf, id) });
          }
        }
      }
      ts.forEachChild(node, (child) => {
        if (!isFunctionLikeNode(child)) walk(child);
      });
    };
    if (fn.body) walk(fn.body);
  };
  const visit = (node) => {
    if (isFunctionLikeNode(node)) inspect(node);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  locals.sort((a, b) => a.line - b.line || a.column - b.column);
  return locals;
}

function renderLocalsHuman(report) {
  const section = (title, rows) => {
    const out = ['', `${title}：${rows.length} 条`];
    if (rows.length === 0) out.push('  （无）');
    for (const r of rows) out.push(`  ${r.line}:${r.column}  ${r.name}`);
    return out;
  };
  return [
    `locals：${report.target}（只读该文件本身：ts.createSourceFile 语法树；不建 Program、不做类型检查、不读图产物）`,
    ...section('形参（parameter）', report.params),
    ...section('箭头形参（arrow_parameter）', report.arrow_params),
    ...section('局部变量（local）', report.locals),
    '',
    '三条局限（连结果一起读）：',
    ...report.limitations.map((l) => `  · ${l}`),
  ].join('\n');
}

/**
 * locals 的唯一出口。失败一律非零退出，--json 时给结构化错误——
 * 「读不到 / 拿不到 / 不支持」都不许被伪装成「这个文件里什么都没有」。
 */
function runLocalsMinimal(opts, root, target, list) {
  const fail = (code, error, message) => {
    if (opts.json) {
      process.stdout.write(
        `${JSON.stringify(
          { query: 'locals', target: list, unsupported: code === EXIT.unsupported, error, message, limitations: LOCALS_LIMITATIONS },
          null,
          2,
        )}\n`,
      );
    } else {
      process.stderr.write(`${message}\n`);
    }
    process.exit(code);
  };

  if (list.includes('#')) {
    fail(EXIT.unsupported, 'symbol-id-unsupported', `本版未实现符号 id 输入：${target}（locals 只接受文件路径，例如 src/tools.ts）`);
  }
  const abs = path.resolve(root, list);
  const rel = path.relative(root, abs);
  if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
    fail(EXIT.usage, 'target-outside-root', `locals 只接受仓库内的相对路径：${target}`);
  }
  if (!LOCALS_SOURCE_EXTENSIONS.has(path.extname(abs).toLowerCase())) {
    fail(
      EXIT.unsupported,
      'unsupported-extension',
      `locals 只支持源码扩展名（${[...LOCALS_SOURCE_EXTENSIONS].join(' ')}）：${list}`,
    );
  }

  let buf;
  try {
    buf = fs.readFileSync(abs);
  } catch (err) {
    fail(EXIT.unreadable, 'unreadable-target', `读不到目标文件：${list}（${(err && err.code) || err.message}）`);
  }
  // 解码不可信就不解析：UTF-16 / NUL 会让语法树与「行:列」静默错位（本仓同族要求：读不到就必须红，不许假绿）。
  let text = buf.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(buf) || text.includes('\u0000')) {
    fail(EXIT.unreadable, 'undecodable-target', `目标文件不是可信的 UTF-8 文本（UTF-16 BOM 或 NUL 字节）：${list}`);
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM 会让第 1 行的列号整体 +1

  const tsError = loadTypeScriptForLocals();
  if (tsError) fail(EXIT.unreadable, 'typescript-unavailable', tsError);

  const sf = ts.createSourceFile(abs, text, ts.ScriptTarget.Latest, true);
  const { params, arrowParams } = collectParamsMinimal(sf);
  const payload = {
    query: 'locals',
    target: list,
    params,
    arrow_params: arrowParams,
    locals: collectLocalsMinimal(sf),
    limitations: LOCALS_LIMITATIONS,
  };
  process.stdout.write(opts.json ? `${JSON.stringify(payload, null, 2)}\n` : `${renderLocalsHuman(payload)}\n`);
  process.exit(EXIT.ok);
}

// ───────────────────── ★ 口径守卫：--self-check ─────────────────────

/** 守卫诊断里每个断言最多列几条证据（确定性截断，只为可读性；断言本身是全量的）。 */
const SELF_CHECK_EVIDENCE = 5;

/**
 * 口径守卫：把「who-references 与 impact 对符号级边的筛选口径是同一份」变成**可执行断言**——
 * 口径一旦各走各的，这里立刻红（退出码 1 + 明确诊断行），不靠人去读两份代码比。
 *
 * 断言（**全量**，不是抽样）：
 *   ① shared-filter-reference      两条查询各自的命名入口取到的是**同一个函数引用**（准入 + 目标文件两项）；
 *   ② per-target-set-equality      对 files[] 里**每一个**目标：who-references 真正列进 symbol_referrers[] 的边集合
 *                                  === impact 反向索引（buildReverseIndex；闭包 / path / cycles / self_loops 都吃它）
 *                                  在该目标下持有的符号边集合。实测成立的是**相等**（比「⊆」更强），故按相等断言；
 *                                  两侧都取**真实查询路径**的产物，谁在内部另写一份内联筛选都会被这条抓住。
 *   ③ no-silent-narrowing          产物里 to.file 是字符串的符号边**一条都不许被漏计**（口径只许解释，不许丢边）；
 *   ④ target-attributable          被计入的符号边，其目标文件必须在 files[] 里（不许收进无法归属的边）；
 *   ⑤ from-endpoint-typed          每条符号边的 from.file 都必须是字符串（两条查询的 from 侧判据同真）；
 *   ⑥ sym-prefix-matches-to-file   to.sym 是字符串时其 `#` 前缀必须等于 to.file——否则「这条边指向哪个文件」
 *                                  在两条查询里会有两个答案（口径①的 to.sym 回退分支正是靠这条才成立）；
 *   ⑦ runtime-type-split-complete  who-references 的 runtime_refs + type_refs === symbol_edges（type_only 二分完备）。
 *
 * 刻意**不**断言「筛选函数必须叫某个名字」：守卫要抓的是**分裂**，不是冻结实现——两处一起换成另一个共享实现
 * （口径仍是一份）不该报红；而任何一处单独改口径，②～⑦ 会立刻报出来。
 * 只读图产物，不写任何东西；输出无绝对路径、无时间戳、无耗时，逐字节确定。
 */
function runSelfCheck(opts, loaded) {
  const artifact = loaded.artifact;
  const files = [...new Set((artifact.files || []).map((f) => f.id))].sort(byteCompare);
  const fileSet = new Set(files);
  const symbolEdges = artifact.symbol_edges || [];
  const assertions = [];
  const failures = [];
  const record = (id, ok, detail) => {
    assertions.push({ id, ok, detail });
    if (!ok) failures.push({ id, detail });
    return ok;
  };

  // ① 同一函数引用：两条查询的命名入口必须交出同一个筛选函数。
  const whoSrc = whoReferencesSymbolSource(artifact);
  const impSrc = impactSymbolSource(artifact);
  const sameRefs = whoSrc.filter === impSrc.filter && whoSrc.targetFileOf === impSrc.targetFileOf;
  record(
    'shared-filter-reference',
    sameRefs,
    `准入函数 who-references=${whoSrc.filter.name} / impact=${impSrc.filter.name}；` +
      `目标函数 who-references=${whoSrc.targetFileOf.name} / impact=${impSrc.targetFileOf.name}：` +
      (sameRefs ? '两项都是同一引用（符号边口径只有一份）' : '**不是同一引用**——两条查询已在各用各的口径'),
  );

  // ② 逐目标集合相等：两侧都走真实查询路径（who-references 的 buildReport / impact 的 buildReverseIndex）。
  const rev = buildReverseIndex(artifact);
  const setEqEvidence = [];
  let setEqMismatch = 0;
  let whoRefsTotal = 0;
  let revSymbolTotal = 0;
  const splitEvidence = [];
  let splitMismatch = 0;
  for (const target of files) {
    const report = buildReport(opts, target, loaded);
    const who = new Set(report.symbol_referrers.map((r) => r.edge_id));
    whoRefsTotal += who.size;
    const imp = new Set((rev.get(target) || []).filter((r) => r.layer === 'symbol').map((r) => r.edge_id));
    revSymbolTotal += imp.size;
    let same = who.size === imp.size;
    if (same) for (const id of who) if (!imp.has(id)) { same = false; break; }
    if (!same) {
      setEqMismatch += 1;
      if (setEqEvidence.length < SELF_CHECK_EVIDENCE) {
        setEqEvidence.push(
          `${target}：who-references ${who.size} 条 / impact 反向索引 ${imp.size} 条` +
            `（只在 who-references 有 ${[...who].filter((x) => !imp.has(x)).length} 条，只在 impact 有 ${[...imp].filter((x) => !who.has(x)).length} 条）`,
        );
      }
    }
    const c = report.counts;
    if (c.runtime_refs + c.type_refs !== c.symbol_edges) {
      splitMismatch += 1;
      if (splitEvidence.length < SELF_CHECK_EVIDENCE) {
        splitEvidence.push(`${target}：runtime_refs ${c.runtime_refs} + type_refs ${c.type_refs} ≠ symbol_edges ${c.symbol_edges}`);
      }
    }
  }
  record(
    'per-target-set-equality',
    setEqMismatch === 0,
    `${files.length} 个目标逐一对账：who-references 计入合计 ${whoRefsTotal} 条符号边 / impact 反向索引合计 ${revSymbolTotal} 条，` +
      (setEqMismatch === 0 ? '集合逐目标相等' : `**有 ${setEqMismatch} 个目标不相等**：${setEqEvidence.join('；')}`),
  );

  // ③～⑥ 产物不变量：逐条读 symbol_edges[]，口径不许丢边、不许收进无法归属的边。
  const narrowEvidence = [];
  const unattributableEvidence = [];
  const fromEvidence = [];
  const symEvidence = [];
  let countedEdges = 0;
  let toFileTyped = 0;
  let narrowCount = 0;
  let unattributableCount = 0;
  let fromCount = 0;
  let symCount = 0;
  for (const e of symbolEdges) {
    const toFile = e && e.to && e.to.file;
    const sym = e && e.to && e.to.sym;
    const counted = isCountedSymbolEdge(e);
    if (typeof toFile === 'string') toFileTyped += 1;
    if (counted) countedEdges += 1;
    if (typeof toFile === 'string' && !counted) {
      narrowCount += 1;
      if (narrowEvidence.length < SELF_CHECK_EVIDENCE) narrowEvidence.push(e.id);
    }
    if (counted && !fileSet.has(symbolEdgeTargetFile(e))) {
      unattributableCount += 1;
      if (unattributableEvidence.length < SELF_CHECK_EVIDENCE) unattributableEvidence.push(`${e.id} -> ${symbolEdgeTargetFile(e)}`);
    }
    if (typeof (e.from && e.from.file) !== 'string') {
      fromCount += 1;
      if (fromEvidence.length < SELF_CHECK_EVIDENCE) fromEvidence.push(e.id);
    }
    if (typeof sym === 'string' && !(typeof toFile === 'string' && sym.startsWith(`${toFile}#`))) {
      symCount += 1;
      if (symEvidence.length < SELF_CHECK_EVIDENCE) {
        symEvidence.push(`${e.id}：to.sym=${sym} / to.file=${typeof toFile === 'string' ? toFile : String(toFile)}`);
      }
    }
  }
  record(
    'no-silent-narrowing',
    narrowCount === 0 && countedEdges === toFileTyped,
    `to.file 是字符串的符号边 ${toFileTyped} 条，其中被计入 ${toFileTyped - narrowCount} 条；计入总数 ${countedEdges} 条` +
      (narrowCount === 0
        ? (countedEdges === toFileTyped ? '' : `；**多计了 ${countedEdges - toFileTyped} 条无法用 to.file 归属的边**`)
        : `；**有 ${narrowCount} 条本该统计却没被计入**：${narrowEvidence.join('；')}`),
  );
  record(
    'target-attributable',
    unattributableCount === 0,
    unattributableCount === 0
      ? `计入的 ${countedEdges} 条符号边，目标文件全部在 files[]（${fileSet.size} 个节点）里`
      : `**有 ${unattributableCount} 条符号边的目标文件不在 files[] 里**：${unattributableEvidence.join('；')}`,
  );
  record(
    'from-endpoint-typed',
    fromCount === 0,
    fromCount === 0
      ? `${symbolEdges.length} 条符号边的 from.file 全是字符串（两条查询的 from 侧判据同真）`
      : `**有 ${fromCount} 条符号边的 from.file 不是字符串**：${fromEvidence.join('；')}——两条查询对这类边的取舍会分叉`,
  );
  record(
    'sym-prefix-matches-to-file',
    symCount === 0,
    symCount === 0
      ? 'to.sym 的 `#` 前缀与 to.file 处处一致（「这条边指向哪个文件」只有一个答案）'
      : `**有 ${symCount} 条边的 to.sym 前缀与 to.file 打架**：${symEvidence.join('；')}——口径①的回退分支需要人工重新确认`,
  );
  record(
    'runtime-type-split-complete',
    splitMismatch === 0,
    splitMismatch === 0
      ? `${files.length} 个目标的 runtime_refs + type_refs 都等于 symbol_edges（type_only 二分完备）`
      : `**有 ${splitMismatch} 个目标的 type_only 二分不完备**：${splitEvidence.join('；')}`,
  );

  const payload = {
    query: '--self-check',
    basis: loaded.basis,
    checked_targets: files.length,
    symbol_edges: symbolEdges.length,
    counted_symbol_edges: countedEdges,
    who_references_symbol_edges_total: whoRefsTotal,
    impact_symbol_edges_total: revSymbolTotal,
    assertions,
    failures,
    passed: failures.length === 0,
  };
  if (failures.length > 0) {
    if (opts.json) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    else {
      process.stderr.write(
        `口径守卫失败（--self-check）：${failures.length} 项断言不成立——who-references 与 impact 对符号级边的筛选口径已经不一致。\n` +
          failures.map((f) => `  ✗ ${f.id}：${f.detail}`).join('\n') +
          '\n',
      );
    }
    process.exit(EXIT.guard);
  }
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  } else {
    process.stdout.write(
      [
        '口径守卫（--self-check）：who-references 与 impact 对符号级边的筛选口径是同一份',
        `basis=${loaded.basis}  目标 ${files.length} 个  符号边 ${symbolEdges.length} 条（计入 ${countedEdges} 条）`,
        '断言（全量，非抽样）：',
        ...assertions.map((a) => `  ${a.ok ? '✓' : '✗'} ${a.id}  ${a.detail}`),
        '✓ 口径一致：0 项失败',
      ].join('\n') + '\n',
    );
  }
  process.exit(EXIT.ok);
}

/** --self-check 的入口：解析根 → 读图 → 跑守卫（守卫自己决定退出码；不吃位置参数）。 */
function runSelfCheckMain(opts) {
  if (opts.positional.length > 0) {
    process.stderr.write(`--self-check 不吃位置参数（它对 files[] 里全部目标逐一对账）：${opts.positional.join(' ')}\n`);
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
    process.stderr.write(`读不到图产物 ${REL}：既不在 git 索引，也不在工作区（${path.join(root, REL)}）。\n`);
    process.exit(EXIT.unreadable);
  }
  runSelfCheck(opts, loaded);
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
  // --self-check 不查任何目标，必须在「缺少查询与目标」之前分流（它自己解析根、自己定退出码）。
  if (opts.selfCheck) runSelfCheckMain(opts);
  if (opts.positional.length === 0) {
    process.stderr.write(`缺少查询与目标\n\n${usage()}\n`);
    process.exit(EXIT.usage);
  }
  const [query, target] = opts.positional;
  if (query !== 'who-references' && query !== 'impact' && query !== 'locals') {
    process.stderr.write(`未实现的查询：${query}（本版只有 who-references、impact、locals）\n`);
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

  // locals 只读该文件本身，不读图产物、不进图产物；必须在 loadArtifact 之前分派。
  if (query === 'locals') runLocalsMinimal(opts, root, target, normalizeTarget(target));

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
