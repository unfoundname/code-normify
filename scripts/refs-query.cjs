#!/usr/bin/env node
'use strict';
/**
 * refs-query.cjs —— 引用图产物 `ledger/references.json` 的**只读查询层**。
 *
 * 只实现一条查询：who-references <仓库相对路径>，即「谁直接引用我这个文件」。
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
    '',
    '查询：',
    '  who-references <路径>   谁直接引用这个文件（读 ledger/references.json）',
    '',
    '选项：',
    '  --json          以 JSON 输出（含全部符号级边；确定性、无绝对路径/耗时）',
    '  --root <目录>   仓库根，默认当前目录；不是 git 仓库根则非零退出',
    '  --limit <n>     人类可读输出里最多显示多少条符号级边（默认 40，0 = 全部）',
    '  --help          显示本帮助',
    '',
    '不支持：符号 id 输入（如 src/tools.ts#Name@1:2）——会以 unsupported 拒绝。',
    '退出码：0 成功 / 2 参数或根不合法 / 3 读不到图 / 4 输入不受支持 / 5 目标不在图里。',
  ].join('\n');
}

function parseArgs(argv) {
  const opts = { root: process.cwd(), json: false, help: false, limit: DEFAULT_SYMBOL_ROWS, positional: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--root' || arg === '--limit') {
      i += 1;
      if (i >= argv.length) throw new UsageError(`缺少 ${arg} 的值`);
      if (arg === '--root') opts.root = argv[i];
      else {
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
    '只覆盖文件级边（edges[]）：文件内边（同一文件内部的引用/依赖）未展开。',
    '未实现符号 id 输入：目标只能是文件路径；符号 id 会以 unsupported 拒绝。',
    '文件级 edges[] 的 type_only 恒为 false（产物口径），故运行时/类型拆分只对 symbol_edges[] 有效。',
    '未实现 what-references、impact 等其它查询；本版只有 who-references。',
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
  if (query !== 'who-references') {
    process.stderr.write(`未实现的查询：${query}（本版只有 who-references）\n`);
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
