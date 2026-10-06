#!/usr/bin/env node
/**
 * check-impact v1.0.0 — 变更影响门禁（棘轮式：只拦本次改动「新引入」的破坏）
 *
 * 判据（两项，任一非空 ⇒ 退出码 1）：
 *   新增悬空   = { 当前 status === 'dangling' 的边 } − { 基线中同为 dangling 的边 }   ← 文件被删 / 改名
 *   新增未解析 = { 当前 to.sym === null 的符号级边 } − { 基线中同样未解析的符号级边 }   ← 符号被删（文件还在）
 *   边的身份用 `id`（形如 README.md:309:110:markdown-link:./docs/SPEC.zh-CN.md），按集合差比较。
 *
 * 棘轮本质：更早提交引入的悬空在基线与当前里都存在 ⇒ 不构成「新增」，不报（历史存量不追溯）。
 *
 * 判定基准（两种模式，输出里必须写明本次比的是哪一对）：
 *   默认（无开关）  基线 = git show HEAD^:ledger/references.json   当前 = git show HEAD:ledger/references.json
 *   --staged        基线 = git show HEAD:ledger/references.json    当前 = git show :ledger/references.json
 *   CI 里提交已存在 ⇒ HEAD^ 与 HEAD 分属前后两次提交，默认模式在 CI 下**仍然能判红**（这是本门禁的要点）；
 *   若比 HEAD vs 索引，CI 检出后索引 == HEAD，会恒绿，所以默认模式刻意不那样比。
 *
 * v1 不提供任何豁免机制（本仓「残留零容忍」：正确做法永远是改掉引用，不是放行）。
 * 不重复 `check:graph` 的职责：图的「新鲜度 / 完整性」由 `node scripts/generate-reference-graph.cjs --check`
 * 判定，且它在门禁链上先于本步；本门禁只做「新增破坏」的棘轮判定。
 *
 * 用法：node scripts/check-impact.cjs [--json] [--staged] [--root <dir>] [--help]
 *
 * 退出码：
 *   0  通过（本次改动没有新引入悬空 / 未解析；历史存量不报）
 *   1  判定不通过，或任一 fail-closed 诊断（拿不到基线 / 图就不判绿），或 --root 指向非 git 仓库
 *   2  命令行用法错误（未知开关、--root 缺参数）
 *
 * fail-closed 诊断码（--json 的顶层 `diagnostic`）：
 *   impact-baseline-unavailable       基线不可得（含 HEAD^ 不存在，即根提交；或基线无图产物 / 读不出 / JSON 非法）
 *   impact-current-graph-unavailable  当前图不可得（默认模式 HEAD 版；--staged 模式索引版）
 *   impact-schema-version-mismatch    两边 schema_version 不一致
 *   impact-graph-malformed            结构不合规（edges / symbol_edges 不是数组等）
 *   注：图产物里**没有** degradation 字段（刻意不落盘），本门禁不读它，也不去找它。
 *
 * --root 语义与本仓既有门禁一致：必须是 git 仓库根（realpath 相等），
 * 否则退出码 1 拒绝，绝不静默回退；不传 --root 时默认取当前工作目录（CWD），
 * 因此门禁的是 CWD 所在的 git 仓库（可能是另一个仓库），而不是脚本自身所在的仓库。
 */
'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const VERSION = '1.0.0';
const REL = 'ledger/references.json';

/** 退出码：0 通过 / 1 判定不通过（含全部 fail-closed）/ 2 用法错误。 */
const EXIT = { ok: 0, fail: 1, usage: 2 };

/** fail-closed 诊断码。 */
const DIAG = {
  baseline: 'impact-baseline-unavailable',
  current: 'impact-current-graph-unavailable',
  schema: 'impact-schema-version-mismatch',
  malformed: 'impact-graph-malformed',
};

const USAGE = `check-impact v${VERSION} — 变更影响门禁（棘轮式：只拦本次改动新引入的悬空 / 未解析）

用法：
  node scripts/check-impact.cjs [选项]

选项：
  --json          只向 stdout 输出机器可读 JSON（含 basis、newly_dangling[]、newly_unresolved[]
                  与两者计数；无时间戳等易变字段，同一输入连跑两次逐字节相同）
  --staged        基准改为「HEAD .. git 索引」：基线 = git show HEAD:${REL}
                  当前 = git show :${REL}（未提交、只 git add 的改动）
  默认（无开关）  基准为「HEAD^ .. HEAD」：基线 = git show HEAD^:${REL}
                  当前 = git show HEAD:${REL}
  --root <dir>    指定被检查的仓库根（默认：当前工作目录所在的 git 顶层目录）
                  默认跟随 CWD：从另一个仓库的工作目录运行时，门禁的是那个仓库——
                  输出里的 root: 行会告诉你门禁的是哪一个；
                  从子目录运行会被拒绝（不是仓库根 ⇒ 退出码 1），不会静默回退到脚本自身所在的仓库；
                  非仓库根（不存在 / 不是 git 根）一律拒绝（退出码 1，与既有门禁实测一致）
  -h, --help      打印本帮助（不读图、不判定，退出码 0）

读 / 写：
  读：git 对象里的图产物 —— 基线 \`git show HEAD^:${REL}\`（--staged 时 \`git show HEAD:${REL}\`）、
      当前 \`git show HEAD:${REL}\`（--staged 时索引 blob \`git show :${REL}\`）；
      **不读工作区磁盘上的那份图**（图的「新鲜度 / 完整性」由上一环 check:graph 判定，见下）。
  写：不写任何文件（结论只走 stdout / stderr；--json 也只写 stdout）。

check 链位置（npm 脚本 \`check\` 的实际顺序，环名照抄）：
  第 13 环 \`npm run check:impact\`（= 本脚本）——前一环是第 12 环 \`npm run check:changes\`，本环是链尾。

判据（棘轮：只拦本次改动**新引入**的）：
  新增悬空   = { 当前 status === 'dangling' 的边 } − { 基线中同为 dangling 的边 }   ← 文件被删 / 改名
  新增未解析 = { 当前 to.sym === null 的符号级边 } − { 基线中同样未解析的符号级边 }   ← 符号被删（文件还在）
  边的身份用 \`id\`（形如 README.md:309:110:markdown-link:./docs/SPEC.zh-CN.md），按集合差比较；
  · 边的 id **不含解析结果**（文件级边尾部是 specifier；符号级边只到 from 的行:列 + kind），
    目标被删 / 改名 / 符号被删时 id 不变 ⇒ 基线取的是「基线中**同样命中**」的边（同为 dangling /
    同为未解析），不是基线全量边；否则 resolved→dangling 的同 id 边会被误判成「基线里已存在」而漏报。
  任一非空 ⇒ 退出码 1，逐条点名（边 id + from 的行:列 + kind + 目标）。
  · 「未解析」的精确口径（用图自己的词表，不另造）：to.sym === null 的符号级边，**但排除
    status === 'external' / to.state === 'outside'** —— 仓库外的裸模块说明符（node:fs、ajv…）
    与库类型（Program 刻意 noLib + types:[]）本来就是「仓库外、无仓库内符号」，属于**已按设计处置**，
    不是破坏；算进来会让本门禁在健康仓库上恒红。保留 status === 'unresolved'
    （symbol-not-found-in-program 引用目标不存在 / declaration-out-of-scope 声明不在作用域）——这才是该报的。
  · 「悬空」同样只认文件级边的 status === 'dangling'（目标文件不在索引里）。

棘轮本质：更早提交引入的悬空在 HEAD^ 与 HEAD 里都存在 ⇒ 不构成「新增」，不报（历史存量不追溯）。

两种基准模式（输出里的 basis 字段写明本次比的是哪一对）：
  默认（无开关）  basis = "HEAD^..HEAD"   基线 = HEAD^:${REL}    当前 = HEAD:${REL}
  --staged        basis = "HEAD..index"   基线 = HEAD:${REL}     当前 = :${REL}（索引 blob）
  · CI（提交已存在）下默认模式**仍然能判红**：HEAD^ 与 HEAD 分属前后两次提交，本次提交引入的
    悬空 / 未解析会出现在 HEAD 而不在 HEAD^，于是构成「新增」。刻意不比 HEAD vs 索引：
    新克隆或 CI 检出后索引 == HEAD，那样比会**恒绿**。

为什么不提供豁免（v1 有意）
  本仓「残留零容忍」：正确做法永远是改掉引用（删掉引用、或补回目标），不是给门禁开白名单。
  因此没有 --allow-* / 基线冻结 / 注释抑制之类机制；历史存量由上面的棘轮自动放过。

与 check:graph 的分工（前提，不在本门禁重复）
  图的「新鲜度 / 完整性」由 \`node scripts/generate-reference-graph.cjs --check\` 判定
  （索引 blob 与重算结果是否一致、索引-工作区是否漂移、降级状态是否 unknown），
  且它在门禁链上**先于**本步。本门禁假定手上这份图是新鲜且完整的，只做「新增破坏」的棘轮判定；
  图陈旧或降级导致的问题由 check:graph 报，不由这里兜底。
  另注：图产物里**没有** degradation 字段（刻意不落盘），本门禁不读它，也不去找它。

退出码：
  0  通过（本次改动没有新引入悬空 / 未解析）
  1  判定不通过，或任一 fail-closed 诊断（**拿不到基线 / 图就不判绿**），或 --root 指向非 git 仓库
  2  命令行用法错误（未知开关、--root 缺参数）

fail-closed 诊断码（--json 顶层 diagnostic；人类可读输出为 [诊断码] 开头的行）：
  ${DIAG.baseline}       基线不可得：HEAD^ 不存在（根提交）/ 基线无图产物 / 读不出 / JSON 非法
  ${DIAG.current}  当前图不可得：HEAD 版（默认）或索引版（--staged）缺失 / 读不出 / JSON 非法
  ${DIAG.schema}    两边 schema_version 不一致（图与门禁必须同一次提交一起改）
  ${DIAG.malformed}           结构不合规：顶层非对象 / edges 或 symbol_edges 不是数组

--root 语义与本仓既有门禁一致：必须是 git 仓库根（realpath 相等），否则退出码 1 拒绝，
  绝不静默回退；不传 --root 时默认取当前工作目录（CWD），门禁的是 CWD 所在的 git 仓库；
  临时夹具仓库请先 git add 图产物再跑本门禁。
`;

/** --root fail-closed：必须是 git 仓库根（realpath 相等），否则拒绝。 */
function resolveRoot(dir) {
  let top;
  try {
    top = execFileSync('git', ['-C', dir, 'rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    throw new RootError(`--root 不是 git 仓库（或不可读）：${dir}；git rev-parse --show-toplevel 失败`);
  }
  let realDir;
  try {
    realDir = fs.realpathSync(dir);
  } catch {
    throw new RootError(`--root 不存在或不可读：${dir}`);
  }
  const realTop = fs.realpathSync(top);
  if (path.resolve(realDir) !== path.resolve(realTop)) {
    throw new RootError(`--root 必须是仓库根：给的是 ${realDir}，而仓库根是 ${realTop}`);
  }
  return realTop;
}

class UsageError extends Error {}
/** --root fail-closed（不是用法错误）：与 check-file-ledger / check-references / generate-reference-graph 一致地 exit 1。 */
class RootError extends Error {}

function runGit(root, args) {
  return execFileSync('git', ['-C', root, ...args], {
    maxBuffer: 1 << 30,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/**
 * 读某个 rev 下的图产物。返回值三态（fail-closed 的判据就在这里，绝不返回「空图」冒充成功）：
 *   { ok: true, graph, bytes }             读到了且是合法 JSON
 *   { ok: false, why: '描述' }             读不到 / 不是合法 JSON
 * 读的是 git 对象（HEAD^ / HEAD / 索引 blob），与工作区磁盘无关。
 */
function readGraphAt(root, rev, label) {
  let buf;
  try {
    buf = runGit(root, ['show', `${rev}:${REL}`]);
  } catch {
    return { ok: false, why: `${label}：git show ${rev}:${REL} 取不到（该版本里没有这份图产物）` };
  }
  let text = buf.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  try {
    return { ok: true, graph: JSON.parse(text), bytes: buf.length };
  } catch (err) {
    return { ok: false, why: `${label}：${rev}:${REL} 不是合法 JSON（${err.message}）` };
  }
}

/** 结构合规性：顶层必须是对象，edges / symbol_edges 必须是数组。 */
function checkShape(graph, label) {
  if (!graph || typeof graph !== 'object' || Array.isArray(graph)) {
    return `${label}：顶层不是对象`;
  }
  if (!Array.isArray(graph.edges)) {
    return `${label}：edges 不是数组（${graph.edges === undefined ? '字段缺失' : typeof graph.edges}）`;
  }
  if (!Array.isArray(graph.symbol_edges)) {
    return `${label}：symbol_edges 不是数组（${graph.symbol_edges === undefined ? '字段缺失' : typeof graph.symbol_edges}）`;
  }
  return null;
}

const symOf = (edge, side) => (edge && edge[side] && typeof edge[side] === 'object' ? edge[side].sym : undefined);

/**
 * 「未解析」的精确口径（图自己的词表，见生成器 meta.symbol_graph.edge_status）：
 *   命中 = 符号级边且 to.sym === null（该引用没有解析到任何仓库内符号）
 *   排除 = status === 'external' / to.state === 'outside' —— 仓库外的裸模块说明符（node:fs、
 *          ajv…）与库类型（Program 刻意 noLib + types:[]）本来就是「仓库外、无仓库内符号」，
 *          它们是**已按设计处置**的边，不是破坏；把它们算进来会让本门禁在健康仓库上恒红。
 *   保留 = status === 'unresolved'（symbol-not-found-in-program / declaration-out-of-scope 两种原因）
 *          —— 这才是「符号被删（文件还在）」该报的破坏。
 */
function isUnresolvedSymbolEdge(edge) {
  if (symOf(edge, 'to') !== null) return false;
  if (edge.status === 'external') return false;
  const to = edge.to && typeof edge.to === 'object' ? edge.to : {};
  if (to.state === 'outside') return false;
  return true;
}

/** 边 id → 边对象。缺 id / id 非字符串的边单独收集，绝不静默丢弃。 */
function indexById(edges, label, anomalies) {
  const map = new Map();
  for (const edge of edges) {
    if (!edge || typeof edge !== 'object' || typeof edge.id !== 'string' || edge.id === '') {
      anomalies.push(`${label}：存在没有合法 id 的边（${JSON.stringify(edge)?.slice(0, 120) ?? String(edge)}）`);
      continue;
    }
    if (!map.has(edge.id)) map.set(edge.id, edge);
  }
  return map;
}

/** 目标的人话描述：文件级 / 符号级 / 说明符。 */
function describeTarget(edge) {
  const to = edge && typeof edge.to === 'object' && edge.to ? edge.to : {};
  const parts = [];
  if (typeof to.file === 'string' && to.file) parts.push(to.file);
  if (typeof to.sym === 'string' && to.sym) parts.push(`sym=${to.sym}`);
  if (to.sym === null && !to.file) parts.push('符号未解析');
  if (typeof to.state === 'string' && to.state) parts.push(`state=${to.state}`);
  if (typeof edge.specifier === 'string' && edge.specifier) parts.push(`specifier=${edge.specifier}`);
  if (typeof edge.reason === 'string' && edge.reason) parts.push(`reason=${edge.reason}`);
  return parts.length ? parts.join(' | ') : '（无目标信息）';
}

/** 逐条点名用的一行。 */
function describeEdge(edge, side) {
  const from = edge && typeof edge.from === 'object' && edge.from ? edge.from : {};
  const loc = `${typeof from.file === 'string' ? from.file : '?'}:${from.line ?? '?'}:${from.column ?? '?'}`;
  const kind = typeof edge.kind === 'string' ? edge.kind : '?';
  const extra = side === 'symbol' && typeof from.sym === 'string' && from.sym ? ` from.sym=${from.sym}` : '';
  return `- ${edge.id}\n    ${side === 'symbol' ? '符号级' : '文件级'} | ${kind} | from ${loc}${extra} | 目标：${describeTarget(edge)}`;
}

/**
 * 集合差：当前**命中**集合 − 基线**命中**集合（**边的身份 = id**，按集合差比较）。
 * 两个参数必须都是「按同一命中口径筛过」的集合（当前 dangling vs 基线 dangling；当前未解析 vs 基线未解析）：
 * 棘轮只拦本次改动**新引入**的破坏，历史存量（基线与当前都命中）一律不报。
 * 若基线传未筛过的全量边，则同 id 边永远算「基线里已存在」，
 * 目标被删导致的 resolved→dangling（id 不变）会被永久漏报 —— 这正是本门禁要拦的头号场景。
 * 返回按 id 升序，保证输出确定性。
 */
function diffByIds(hit, baselineById) {
  const out = [];
  for (const id of [...hit.keys()].sort()) {
    if (!baselineById.has(id)) out.push(hit.get(id));
  }
  return out;
}

function parseArgs(argv) {
  const opts = { json: false, staged: false, root: null, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--staged') opts.staged = true;
    else if (arg === '--root') {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) throw new UsageError('--root 需要一个目录参数');
      opts.root = next;
      i += 1;
    } else if (arg === '-h' || arg === '--help') opts.help = true;
    else throw new UsageError(`未知参数：${arg}`);
  }
  return opts;
}

/** 输出 + 退出。--json 时只向 stdout 写 JSON；否则写人类可读文本（fail-closed 也写 stdout，退出码才是判据）。 */
function emit(opts, exitCode, payload, humanLines) {
  if (opts.json) process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  else process.stdout.write(`${humanLines.join('\n')}\n`);
  process.exit(exitCode);
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`check-impact：${err.message}\n用法：node scripts/check-impact.cjs [--json] [--staged] [--root <dir>] [--help]\n`);
    process.exit(EXIT.usage);
  }
  if (opts.help) {
    process.stdout.write(USAGE);
    process.exit(EXIT.ok);
  }

  let root;
  try {
    root = resolveRoot(opts.root || process.cwd());
  } catch (err) {
    if (err instanceof RootError) {
      // --root 指向非 git 目录：fail-closed 拒绝，绝不回退到当前工作目录（CWD）所在的仓库。
      // 退出码 1（与 check-file-ledger / check-references / generate-reference-graph 实测一致；它们 --help 里写的
      // 「退出码 2」与实际行为不符，本门禁跟实际行为对齐，并在此写明）。
      process.stderr.write(`check-impact：${err.message}\n`);
      process.exit(EXIT.fail);
    }
    throw err;
  }

  const basis = opts.staged ? 'HEAD..index' : 'HEAD^..HEAD';
  const baselineRev = opts.staged ? 'HEAD' : 'HEAD^';
  const currentRev = opts.staged ? ':0' : 'HEAD';

  /** fail-closed 出口：拿不到基线 / 图就不判绿。 */
  const failClosed = (diagnostic, reason) => {
    const payload = { ok: false, basis, diagnostic, reason };
    emit(opts, EXIT.fail, payload, [
      `check-impact v${VERSION} — fail-closed`,
      `root: ${root}`,
      `basis: "${basis}"`,
      `[${diagnostic}] ${reason}`,
      '结论：拿不到基线或图，**不判绿**（退出码 1）。',
    ]);
  };

  const baseline = readGraphAt(root, baselineRev, '基线');
  if (!baseline.ok) {
    const hint = opts.staged ? '' : `（若本仓库只有根提交、没有 HEAD^，本门禁同样 fail-closed，不降级）`;
    failClosed(DIAG.baseline, `${baseline.why}${hint}`);
  }
  const current = readGraphAt(root, currentRev, opts.staged ? '当前（索引版）' : '当前');
  if (!current.ok) failClosed(DIAG.current, current.why);

  const baselineShape = checkShape(baseline.graph, `基线（${baselineRev}:${REL}）`);
  if (baselineShape) failClosed(DIAG.malformed, baselineShape);
  const currentShape = checkShape(current.graph, `当前（${currentRev}:${REL}）`);
  if (currentShape) failClosed(DIAG.malformed, currentShape);

  const baseSchema = baseline.graph.schema_version;
  const currSchema = current.graph.schema_version;
  if (baseSchema !== currSchema) {
    failClosed(DIAG.schema, `基线 schema_version=${JSON.stringify(baseSchema)}，当前 schema_version=${JSON.stringify(currSchema)}`);
  }

  const anomalies = [];
  const baseEdges = indexById(baseline.graph.edges, `基线（${baselineRev}）文件级边`, anomalies);
  const baseSyms = indexById(baseline.graph.symbol_edges, `基线（${baselineRev}）符号级边`, anomalies);
  const currEdges = indexById(current.graph.edges, `当前（${currentRev}）文件级边`, anomalies);
  const currSyms = indexById(current.graph.symbol_edges, `当前（${currentRev}）符号级边`, anomalies);
  if (anomalies.length) failClosed(DIAG.malformed, anomalies[0]);

  // 新增悬空 = { 当前 status === 'dangling' 的边 } − { 基线中 status === 'dangling' 的边 }
  const danglingNow = new Map([...currEdges].filter(([, e]) => e.status === 'dangling'));
  const danglingBase = new Map([...baseEdges].filter(([, e]) => e.status === 'dangling'));
  const newlyDangling = diffByIds(danglingNow, danglingBase);
  // 新增未解析 = { 当前未解析的符号级边 } − { 基线中未解析的符号级边 }（同一口径 isUnresolvedSymbolEdge）
  const unresolvedNow = new Map([...currSyms].filter(([, e]) => isUnresolvedSymbolEdge(e)));
  const unresolvedBase = new Map([...baseSyms].filter(([, e]) => isUnresolvedSymbolEdge(e)));
  const newlyUnresolved = diffByIds(unresolvedNow, unresolvedBase);

  const ok = newlyDangling.length === 0 && newlyUnresolved.length === 0;
  const payload = {
    ok,
    basis,
    basis_detail: {
      baseline: `${baselineRev}:${REL}`,
      current: opts.staged ? `:${REL}（git 索引 blob）` : `${currentRev}:${REL}`,
    },
    schema_version: currSchema,
    counts: {
      baseline_edges: baseline.graph.edges.length,
      baseline_symbol_edges: baseline.graph.symbol_edges.length,
      current_edges: current.graph.edges.length,
      current_symbol_edges: current.graph.symbol_edges.length,
      newly_dangling: newlyDangling.length,
      newly_unresolved: newlyUnresolved.length,
    },
    newly_dangling: newlyDangling.map((e) => ({
      id: e.id,
      kind: e.kind ?? null,
      from: { file: e.from?.file ?? null, line: e.from?.line ?? null, column: e.from?.column ?? null },
      target: { file: e.to?.file ?? null, sym: e.to?.sym ?? null, state: e.to?.state ?? null, specifier: e.specifier ?? null },
      status: e.status ?? null,
      reason: e.reason ?? null,
    })),
    newly_unresolved: newlyUnresolved.map((e) => ({
      id: e.id,
      kind: e.kind ?? null,
      from: { file: e.from?.file ?? null, line: e.from?.line ?? null, column: e.from?.column ?? null, sym: e.from?.sym ?? null },
      target: { file: e.to?.file ?? null, sym: e.to?.sym ?? null, state: e.to?.state ?? null, specifier: e.specifier ?? null },
      status: e.status ?? null,
      reason: e.reason ?? null,
    })),
  };

  const human = [
    `check-impact v${VERSION} — 变更影响门禁（棘轮式）`,
    `root: ${root}`,
    `basis: "${basis}"  （基线 ${baselineRev}:${REL} → 当前 ${opts.staged ? '索引 :' + REL : currentRev + ':' + REL}）`,
    `schema_version: ${JSON.stringify(currSchema)}（两边一致）`,
    `边数：基线 edges=${payload.counts.baseline_edges} symbol_edges=${payload.counts.baseline_symbol_edges}；` +
      `当前 edges=${payload.counts.current_edges} symbol_edges=${payload.counts.current_symbol_edges}`,
    '',
  ];
  if (newlyDangling.length) {
    human.push(`新增悬空（本次改动新引入，${newlyDangling.length} 条）——文件被删 / 改名：`);
    for (const e of newlyDangling) human.push(describeEdge(e, 'file'));
    human.push('');
  }
  if (newlyUnresolved.length) {
    human.push(`新增未解析（本次改动新引入，${newlyUnresolved.length} 条）——符号被删（文件还在）：`);
    for (const e of newlyUnresolved) human.push(describeEdge(e, 'symbol'));
    human.push('');
  }
  human.push(
    ok
      ? `结论：通过（新增悬空 0，新增未解析 0）。历史存量不在本门禁的判定范围内（棘轮只拦新增）。`
      : `结论：不通过（新增悬空 ${newlyDangling.length}，新增未解析 ${newlyUnresolved.length}）。` +
        `正确修法：改掉这些引用（补回目标或删掉引用）；v1 无豁免机制。`,
  );
  emit(opts, ok ? EXIT.ok : EXIT.fail, payload, human);
}

main();
