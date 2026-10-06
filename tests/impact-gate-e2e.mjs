#!/usr/bin/env node
/**
 * tests/impact-gate-e2e.mjs
 * 变更影响门禁（scripts/check-impact.cjs）端到端回归：棘轮判据的**退出码**与 fail-closed 四条诊断码。
 * ---------------------------------------------------------------------------
 * 为什么要有它：check-impact 的 --help 把判据写得很清楚，但「帮助文本说了」不等于「门禁真的这么判」。
 * 本用例把每条判据钉在**退出码 + 点名内容 + JSON 字段**上，逐条覆盖 8 个场景：
 *   1. 删**被引用**文件（在索引里删掉、重生成图、提交）→ exit 1，逐条点名新引入的悬空边 id；
 *   2. 删**导出符号**（文件还在，标识符同长度改名）→ exit 1（「新增未解析」那一半）；
 *   3. 反例：删**无人引用**的文件 → exit 0；
 *   4. 反例：只改文件内容、不动任何引用 → exit 0（并证明图确实变了，绿灯不是因为「没变化」）；
 *   5. 反例（最关键）：C1 引入悬空 → 再叠一个无关改动 C2 ⇒ 在 C2 上跑 → exit 0（棘轮不追溯历史存量）；
 *   6. 反例：新增 `status: 'external'` / `to.state: 'outside'` 的符号边（node:fs）**不得**算「新增未解析」→ exit 0；
 *   7. `--staged`：改图后只 `git add` 不提交 ⇒ 不带开关 exit 0、带 `--staged` exit 1（basis: "HEAD..index"）；
 *   8. fail-closed 四条各一：根提交 / 当前图缺失 / schema_version 不一致 / 图结构不合规（顶层非对象、edges 非数组）。
 * 另有第 9 组「测试的测试」：把门禁的基线口径改回「基线**全量**边」（复现修复前那个漏报 bug）后，
 *   同一条用例 1 的场景必须由 exit 1 变成 exit 0 —— 不真改坏一次，就无法证明这条用例抓得住那个 bug。
 *   （真仓库的 scripts/check-impact.cjs 一个字都不改；改坏只发生在夹具目录里的副本上。）
 *
 * 夹具：`git checkout-index -a --prefix=<tmp>/` 把本仓库索引里的全部已跟踪文件物化到系统 temp（q11- 前缀），
 * 在夹具里 `git init` + 一次提交（真产物 ledger/references.json 随之进入 HEAD），再补一个**空提交**，
 * 使默认模式 HEAD^..HEAD 恒有基线可用。每个用例跑完 `git reset --hard <基线>` 复原。
 * 图一律用**真生成器**重算（`scripts/generate-reference-graph.cjs --root <夹具>`），不做手写图——
 * 这样「真产物里长出来的悬空 / 未解析边会不会被门禁抓到」才是被验证的事实。
 * 实测要点（写死在夹具流程里）：生成器的宇宙是 **git 索引**，所以「删文件」必须先 `git rm`（进索引）
 * 再重生成图；否则被删的文件在索引里还在，图里那条边仍是 resolved（门禁正确判绿，用例会假失败）。
 * **绝不在真仓库里造测试文件**，跑完删掉整个 temp 目录。
 *
 * 用法：node tests/impact-gate-e2e.mjs
 *   环境变量 Q11_IMPACT_GATE=<path>：改跑另一份 check-impact.cjs 副本（第 9 组「测试的测试」用的钩子；
 *   不设时跑真仓库的 scripts/check-impact.cjs）。
 * 退出码：0 全部通过 / 1 有用例失败（打印每条断言的实际值与期望值）/ 2 夹具准备失败
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GEN = path.join(REPO, 'scripts', 'generate-reference-graph.cjs');
/** 被检查的门禁：默认真仓库那份；Q11_IMPACT_GATE 只给「测试的测试」用（跑夹具目录里的改坏副本）。 */
const GATE = process.env.Q11_IMPACT_GATE
  ? path.resolve(process.env.Q11_IMPACT_GATE)
  : path.join(REPO, 'scripts', 'check-impact.cjs');
const REL = 'ledger/references.json';

const ROOT = path.join(os.tmpdir(), `q11-impact-gate-${process.pid}`);
const FIX = path.join(ROOT, 'fixture');
const ROOTCOMMIT = path.join(ROOT, 'rootcommit');
const graphAbs = path.join(FIX, REL);
/** 夹具第一次提交（物化基线）的 sha。 */
let ROOT_SHA = null;
/** 默认模式用的基线提交：ROOT_SHA 之上再补一个空提交，保证 HEAD^ 存在。 */
let BASE_SHA = null;
/** 用例 1 造的「引入悬空」提交 C1：用例 5 / 第 9 组都要回到它。 */
let C1_SHA = null;

let failed = 0;
let checked = 0;
const pass = (name, detail) => console.log(`  ✔ ${name}${detail ? ` —— ${detail}` : ''}`);
const fail = (name, detail) => {
  failed += 1;
  console.error(`  ✖ ${name} —— ${detail}`);
};
function expect(name, actual, expected, extra) {
  checked += 1;
  if (actual === expected) pass(name, extra || `实际 = ${JSON.stringify(actual)}`);
  else fail(name, `期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}${extra ? `（${extra}）` : ''}`);
}
function expectContains(name, text, needle) {
  checked += 1;
  if (text.includes(needle)) pass(name, `命中「${needle}」`);
  else fail(name, `输出里找不到「${needle}」`);
}
function expectNotContains(name, text, needle) {
  checked += 1;
  if (!text.includes(needle)) pass(name, `确认不含「${needle}」`);
  else fail(name, `输出里不应出现「${needle}」`);
}
function expectSetEqual(name, actual, expected, extra) {
  checked += 1;
  const a = [...actual].sort();
  const b = [...expected].sort();
  if (a.join('\n') === b.join('\n')) pass(name, extra || JSON.stringify(a));
  else fail(name, `期望 ${JSON.stringify(b)}，实际 ${JSON.stringify(a)}`);
}
const caseHeader = (n, scenario) => console.log(`\n—— 用例 ${n}：${scenario} ——`);
/** 断言失败时回显的关键输出片段：优先「结论：」行，否则最后一行非空文本。 */
function snippet(out) {
  const lines = out.trim().split('\n').map((s) => s.trim()).filter(Boolean);
  return lines.find((l) => l.startsWith('结论：')) || lines[lines.length - 1] || '';
}

function sh(cmd, args, cwd, opts = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 1 << 30, ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} 失败（status=${r.status}，cwd=${cwd}）\n${r.stdout || ''}\n${r.stderr || ''}`);
  }
  return r;
}
const git = (args, opts) => sh('git', args, FIX, opts);

/** 跑门禁：脚本来自真仓库/夹具副本，被检查的仓库根用 --root 指定。返回 { status, out, json }。 */
function runGateAt(root, args = []) {
  const r = spawnSync(process.execPath, [GATE, '--root', root, ...args], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 1 << 30,
  });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  let json = null;
  if (args.includes('--json')) {
    try {
      json = JSON.parse(r.stdout);
    } catch {
      json = null;
    }
  }
  return { status: r.status, out, json };
}
const runGate = (args = []) => runGateAt(FIX, args);

/** 用真生成器重算夹具里的图（夹具的宇宙 = 夹具自己的 git 索引）。 */
function regen() {
  const r = spawnSync(process.execPath, [GEN, '--root', FIX], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 30 });
  if (r.status !== 0) throw new Error(`重生成图失败（status=${r.status}）\n${r.stdout || ''}\n${r.stderr || ''}`);
}
/** 把改动 stage 进索引。
 *  实测要点：生成器的**符号级层把仓库内文件读写指向 git 索引**（见 generate-reference-graph --help），
 *  文件级层的「目标是否存在」也看索引 ⇒ 想让一次改动进入重算结果，必须先 `git add`，再 regen。
 *  只改工作区就 regen，会得到一个「没看见这次改动」的旧图，用例会假失败。 */
const stage = () => git(['add', '-A']);

const readGraph = () => JSON.parse(fs.readFileSync(graphAbs, 'utf8'));
const writeGraph = (j) => fs.writeFileSync(graphAbs, `${JSON.stringify(j, null, 2)}\n`, 'utf8');
const fixPath = (rel) => path.join(FIX, rel);
const writeFileInFix = (rel, text) => {
  fs.mkdirSync(path.dirname(fixPath(rel)), { recursive: true });
  fs.writeFileSync(fixPath(rel), text, 'utf8');
};
const appendFileInFix = (rel, text) => fs.appendFileSync(fixPath(rel), text, 'utf8');
const readFileInFix = (rel) => fs.readFileSync(fixPath(rel), 'utf8');

/** 把夹具恢复到基线提交的干净态（后续用例里的提交只是临时扰动）。 */
function resetFixture() {
  git(['reset', '-q', '--hard', BASE_SHA]);
  git(['clean', '-fdq']);
}
/** 提交当前全部已跟踪改动（含删除）：-a 覆盖删除与修改，不碰未跟踪文件。 */
function commitAll(msg) {
  git(['commit', '-q', '-a', '-m', msg]);
}
const trackedFiles = () => git(['ls-files']).stdout.split('\n').filter(Boolean);
/** 基线图里每条边的 id → 边（文件级 / 符号级各一份）。 */
const indexEdges = (edges) => new Map(edges.map((e) => [e.id, e]));

// ---------------------------------------------------------------------------
// 探针选择：全部从**基线图 + 夹具索引清单**里现算，避免写死路径随仓库演进而失效。
// ---------------------------------------------------------------------------

/** 用例 1 的探针：被引用（≥1 条 resolved 文件级入边）、且**不在符号层里**（非 .ts、无符号级入边）的文件。
 *  删它只该产生「新增悬空」，不该产生任何「新增未解析」——这条同时是第 9 组「测试的测试」的前提：
 *  只有悬空这一半是信号时，把基线口径改成「全量边」才会让用例 1 由红转绿。 */
function pickFileProbe(base) {
  const tracked = new Set(trackedFiles());
  const symInbound = new Set(base.symbol_edges.filter((e) => e.to && typeof e.to.file === 'string').map((e) => e.to.file));
  const inbound = new Map();
  for (const e of base.edges) {
    if (e.status !== 'resolved' || !e.to || typeof e.to.file !== 'string') continue;
    if (!tracked.has(e.to.file)) continue;
    if (!inbound.has(e.to.file)) inbound.set(e.to.file, []);
    inbound.get(e.to.file).push(e);
  }
  const cands = [...inbound.entries()]
    .filter(([target]) => !target.endsWith('.ts') && !symInbound.has(target))
    .map(([target, edges]) => ({ target, inbound: [...edges].sort((a, b) => (a.id < b.id ? -1 : 1)) }))
    .sort((a, b) => a.inbound.length - b.inbound.length || (a.target < b.target ? -1 : 1));
  if (!cands.length) throw new Error('基线图里找不到「被引用且在符号层之外」的已跟踪文件，夹具无法继续');
  return cands[0];
}

/** 用例 2 的探针：一个**只被引用一次**的导出符号（跨文件、基线里 resolved）。改名后那条边必然变成未解析。 */
function pickSymbolProbe(base) {
  const refCount = new Map();
  for (const e of base.symbol_edges) {
    if (e.to && typeof e.to.sym === 'string') refCount.set(e.to.sym, (refCount.get(e.to.sym) || 0) + 1);
  }
  const cands = base.symbol_edges
    .filter(
      (e) =>
        e.kind === 'import' &&
        e.cross_file === true &&
        e.status === 'resolved' &&
        e.to &&
        typeof e.to.sym === 'string' &&
        typeof e.to.file === 'string' &&
        e.to.file.endsWith('.ts') &&
        e.from.file.endsWith('.ts') &&
        e.from.file !== e.to.file &&
        refCount.get(e.to.sym) === 1,
    )
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  if (!cands.length) throw new Error('基线图里找不到「只被引用一次的跨文件导出符号」，夹具无法继续');
  const edge = cands[0];
  const sym = edge.to.sym;
  return { edge, sym, name: sym.slice(sym.indexOf('#') + 1, sym.lastIndexOf('@')), file: edge.to.file, line: edge.to.line, column: edge.to.column };
}

/** 用例 3 的探针：基线图里**没有任何入边**（文件级 + 符号级都算）的已跟踪文件。 */
function pickUnreferencedFile(base) {
  const referenced = new Set();
  for (const e of base.edges) if (e.to && typeof e.to.file === 'string') referenced.add(e.to.file);
  for (const e of base.symbol_edges) if (e.to && typeof e.to.file === 'string') referenced.add(e.to.file);
  const banned = /^(ledger\/|package(-lock)?\.json$|tsconfig\.json$|scripts\/|\.github\/|src\/|lib\/)/;
  const cands = trackedFiles()
    .filter((f) => !referenced.has(f) && !banned.test(f) && !f.endsWith('.ts'))
    .sort();
  const md = cands.find((f) => f.endsWith('.md'));
  if (!md && !cands.length) throw new Error('夹具里找不到「无人引用的文件」，用例 3 无法继续');
  return md || cands[0];
}

/** 用例 4 / 6 的探针：`src/**\/*.ts`（符号层的源文件，末尾追加内容不会移动任何既有行列）。 */
function pickTsProbe(base) {
  const cands = base.files
    .filter((f) => f.state === 'indexed' && /^src\/.*\.ts$/.test(f.id))
    .map((f) => f.id)
    .sort();
  if (!cands.length) throw new Error('基线图里没有 src/**/*.ts，夹具无法继续');
  return cands[0];
}

/** 用例 5 的「无关改动」探针：一个普通 Markdown 文档（追加纯文本不产生任何边）。 */
function pickDocProbe() {
  const tracked = trackedFiles();
  for (const c of ['SECURITY.md', 'CHANGELOG.md', 'AGENTS.md', 'CONTRIBUTING.md']) {
    if (tracked.includes(c)) return c;
  }
  const md = tracked.filter((f) => f.endsWith('.md') && !f.startsWith('examples/')).sort();
  if (!md.length) throw new Error('夹具里找不到可用作文案改动的 .md，用例 5 无法继续');
  return md[0];
}

/** 「测试的测试」：把基线口径改成**基线全量边**（复现修复前那个漏报 bug）的门禁副本。 */
function writeBrokenGateCopy() {
  const src = fs.readFileSync(path.join(REPO, 'scripts', 'check-impact.cjs'), 'utf8');
  const muts = [
    {
      from: `const danglingBase = new Map([...baseEdges].filter(([, e]) => e.status === 'dangling'));`,
      to: `const danglingBase = new Map([...baseEdges]); // Q11-MUTATION：基线口径改成「基线全量边」`,
    },
    {
      from: `const unresolvedBase = new Map([...baseSyms].filter(([, e]) => isUnresolvedSymbolEdge(e)));`,
      to: `const unresolvedBase = new Map([...baseSyms]); // Q11-MUTATION：基线口径改成「基线全量边」`,
    },
  ];
  let out = src;
  for (const m of muts) {
    const hits = out.split(m.from).length - 1;
    if (hits !== 1) throw new Error(`改坏副本失败：待替换文本在 check-impact.cjs 里命中 ${hits} 次（期望 1 次）\n${m.from}`);
    out = out.replace(m.from, m.to);
  }
  if (!out.includes('Q11-MUTATION')) throw new Error('改坏副本失败：替换标记没写进去');
  const dest = path.join(ROOT, 'check-impact-broken.cjs');
  fs.writeFileSync(dest, out, 'utf8');
  return dest;
}

function prepareFixture() {
  fs.rmSync(ROOT, { recursive: true, force: true });
  fs.mkdirSync(FIX, { recursive: true });
  const co = spawnSync('git', ['checkout-index', '-a', `--prefix=${FIX}/`], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 1 << 30,
  });
  if (co.status !== 0) throw new Error(`git checkout-index 失败：${co.stdout}\n${co.stderr}`);
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.email', 'impact-e2e@example.invalid']);
  git(['config', 'user.name', 'impact-e2e']);
  git(['config', 'core.autocrlf', 'false']);
  git(['add', '-A']);
  git(['commit', '-q', '-m', 'fixture baseline: 物化本仓库索引（真 ledger/references.json 随之进入 HEAD）']);
  ROOT_SHA = git(['rev-parse', 'HEAD']).stdout.trim();
  // 空提交：默认模式比 HEAD^..HEAD，必须让 HEAD 有父提交，否则每个用例都会撞上 impact-baseline-unavailable。
  git(['commit', '-q', '--allow-empty', '-m', 'fixture: 空提交，为默认模式提供 HEAD^']);
  BASE_SHA = git(['rev-parse', 'HEAD']).stdout.trim();
}

/** 用例 8(a) 的夹具：只有一个根提交的极小仓库（没有 HEAD^ ⇒ 基线不可得）。 */
function prepareRootCommitRepo() {
  fs.mkdirSync(ROOTCOMMIT, { recursive: true });
  const g = (args) => sh('git', args, ROOTCOMMIT);
  g(['init', '-q', '-b', 'main']);
  g(['config', 'user.email', 'impact-e2e@example.invalid']);
  g(['config', 'user.name', 'impact-e2e']);
  fs.mkdirSync(path.join(ROOTCOMMIT, 'ledger'), { recursive: true });
  fs.writeFileSync(
    path.join(ROOTCOMMIT, REL),
    `${JSON.stringify({ schema_version: 2, meta: {}, files: [], edges: [], declarations: [], symbol_edges: [] }, null, 2)}\n`,
    'utf8',
  );
  g(['add', '-A']);
  g(['commit', '-q', '-m', 'fixture: 只有根提交（没有 HEAD^）']);
}

function main() {
  console.log('impact-gate-e2e：变更影响门禁（棘轮 / --staged / fail-closed 四条 / 测试的测试）');
  console.log(`被检查的门禁：${GATE}`);
  try {
    prepareFixture();
  } catch (err) {
    console.error(`夹具准备失败：${err.message}`);
    process.exitCode = 2;
    return;
  }
  const base = readGraph();
  console.log(`夹具：${FIX}（物化基线 ${ROOT_SHA.slice(0, 8)} · 默认模式基线 HEAD=${BASE_SHA.slice(0, 8)}）`);
  console.log(`基线图：schema_version=${base.schema_version} edges=${base.edges.length} symbol_edges=${base.symbol_edges.length}`);

  // =========================================================================
  // 用例 1：删被引用文件（进索引）→ 重生成图 → 提交 ⇒ exit 1，逐条点名新引入的悬空边 id
  // =========================================================================
  caseHeader(1, '删被引用文件 + 重生成图 + 提交 ⇒ exit 1 并点名边 id');
  const probe = pickFileProbe(base);
  console.log(`  探针：${probe.target}（基线里被 ${probe.inbound.length} 条文件级边指向：${probe.inbound.map((e) => e.id).join(', ')}）`);
  const expectedDangling1 = probe.inbound.map((e) => e.id);
  git(['rm', '-q', probe.target]); // 必须先 index 化删除：图的宇宙是 git 索引
  regen();
  commitAll(`fixture: 删掉被引用的 ${probe.target}`);
  C1_SHA = git(['rev-parse', 'HEAD']).stdout.trim();
  let r = runGate(['--json']);
  console.log(`  门禁退出码 = ${r.status}`);
  expect('1 exit 1（本次改动新引入悬空）', r.status, 1, snippet(r.out));
  expect('1 --json 可解析', r.json !== null, true);
  if (r.json) {
    expectSetEqual('1 新增悬空 = 基线里指向它的那些文件级边', r.json.newly_dangling.map((e) => e.id), expectedDangling1);
    expect('1 新增未解析 = 0（删的是符号层之外的文件）', r.json.newly_unresolved.length, 0);
    expect('1 basis 是 HEAD^..HEAD', r.json.basis, 'HEAD^..HEAD');
  }
  r = runGate();
  console.log(`  人类可读输出退出码 = ${r.status}`);
  expect('1 人类可读输出 exit 1', r.status, 1);
  for (const id of expectedDangling1) expectContains('1 逐条点名边 id', r.out, id);
  expectContains('1 输出写明「新增悬空」', r.out, '新增悬空');
  expectContains('1 结论行写明不通过', r.out, '结论：不通过');
  expect('1 被删文件确实不在夹具索引里', git(['ls-files', '--', probe.target]).stdout.trim(), '');

  // =========================================================================
  // 用例 2：删导出符号（文件还在，标识符同长度改名）⇒ exit 1（新增未解析那一半）
  // =========================================================================
  caseHeader(2, '删导出符号 + 重生成（文件还在）⇒ exit 1（新增未解析）');
  resetFixture();
  const symProbe = pickSymbolProbe(base);
  console.log(`  探针：${symProbe.file}:${symProbe.line}:${symProbe.column} 的 ${symProbe.name}（被 ${symProbe.edge.from.file}:${symProbe.edge.from.line} 引用一次）`);
  const symText = readFileInFix(symProbe.file);
  const lines = symText.split('\n');
  const at = symProbe.column - 1;
  if (lines[symProbe.line - 1].slice(at, at + symProbe.name.length) !== symProbe.name) {
    throw new Error(`用例 2 探针位置对不上：${symProbe.file}:${symProbe.line}:${symProbe.column} 不是 ${symProbe.name}`);
  }
  const renamed = ['q', 'x', 'z', 'y', 'w', 'v'].map((c) => c + symProbe.name.slice(1)).find((c) => !symText.includes(c));
  if (!renamed || renamed.length !== symProbe.name.length) throw new Error('用例 2 找不到同长度的新名字（必须同长度，否则会移动后续行列）');
  lines[symProbe.line - 1] = lines[symProbe.line - 1].slice(0, at) + renamed + lines[symProbe.line - 1].slice(at + symProbe.name.length);
  writeFileInFix(symProbe.file, lines.join('\n'));
  stage(); // 符号级层读索引：不 stage 就重算，图里那条边不会变
  regen();
  commitAll(`fixture: 把导出符号 ${symProbe.name} 改名（文件还在，引用没改）`);
  const curr2 = readGraph();
  const brokeEdge2 = curr2.symbol_edges.find((e) => e.id === symProbe.edge.id);
  expect('2 前置：目标文件仍在索引里', git(['ls-files', '--', symProbe.file]).stdout.trim() !== '', true);
  expect('2 前置：那条符号边真的变成未解析（to.sym === null）', brokeEdge2 ? brokeEdge2.to.sym : '边不见了', null);
  r = runGate(['--json']);
  console.log(`  门禁退出码 = ${r.status}`);
  expect('2 exit 1（符号被删，文件还在）', r.status, 1, snippet(r.out));
  if (r.json) {
    expectSetEqual('2 新增未解析 = 基线里指向该符号的那条边', r.json.newly_unresolved.map((e) => e.id), [symProbe.edge.id]);
    expect('2 新增悬空 = 0（文件没删）', r.json.newly_dangling.length, 0);
    expect('2 JSON 里该边的 target.sym 为 null', r.json.newly_unresolved[0]?.target?.sym, null);
  }
  r = runGate();
  expectContains('2 输出写明「新增未解析」', r.out, '新增未解析');
  expectContains('2 输出点名符号级边 id', r.out, symProbe.edge.id);

  // =========================================================================
  // 用例 3：反例——删无人引用的文件 ⇒ exit 0
  // =========================================================================
  caseHeader(3, '反例：删无人引用的文件 ⇒ exit 0');
  resetFixture();
  const unref = pickUnreferencedFile(base);
  console.log(`  探针：${unref}（基线图里零入边）`);
  git(['rm', '-q', unref]);
  regen();
  commitAll(`fixture: 删掉无人引用的 ${unref}`);
  r = runGate(['--json']);
  console.log(`  门禁退出码 = ${r.status}`);
  expect('3 exit 0（删无人引用的文件不算破坏）', r.status, 0, snippet(r.out));
  if (r.json) {
    expect('3 新增悬空 = 0', r.json.newly_dangling.length, 0);
    expect('3 新增未解析 = 0', r.json.newly_unresolved.length, 0);
    expect('3 当前图里确实少了那个文件节点', readGraph().files.some((f) => f.id === unref), false);
  }
  expectContains('3 输出写明通过', runGate().out, '结论：通过');

  // =========================================================================
  // 用例 4：反例——只改文件内容、不动引用 ⇒ exit 0（且图确实变了）
  // =========================================================================
  caseHeader(4, '反例：只改文件内容、不动引用 ⇒ exit 0');
  resetFixture();
  const tsProbe = pickTsProbe(base);
  const baseBytes = base.files.find((f) => f.id === tsProbe)?.bytes ?? null;
  console.log(`  探针：${tsProbe}（末尾追加一行注释，不移动任何既有行列）`);
  appendFileInFix(tsProbe, '\n// e2e 用例 4：只改内容，不新增 / 不删除任何说明符或符号\n');
  stage();
  regen();
  commitAll(`fixture: 只改 ${tsProbe} 的内容`);
  const curr4 = readGraph();
  const currBytes = curr4.files.find((f) => f.id === tsProbe)?.bytes ?? null;
  expect('4 前置：图确实变了（bytes 变大 ⇒ 绿灯不是因为「没变化」）', currBytes > baseBytes, true, `基线 ${baseBytes} → 当前 ${currBytes}`);
  r = runGate(['--json']);
  console.log(`  门禁退出码 = ${r.status}`);
  expect('4 exit 0（只改内容不算破坏）', r.status, 0, snippet(r.out));
  if (r.json) {
    expect('4 新增悬空 = 0', r.json.newly_dangling.length, 0);
    expect('4 新增未解析 = 0', r.json.newly_unresolved.length, 0);
  }

  // =========================================================================
  // 用例 5：反例（最关键）——C1 引入悬空 → C2 无关改动 ⇒ 在 C2 上跑 exit 0（棘轮不追溯）
  // =========================================================================
  caseHeader(5, '反例（最关键）：C1 引入悬空 → C2 无关改动 ⇒ 在 C2 上跑 exit 0');
  resetFixture();
  git(['reset', '-q', '--hard', C1_SHA]); // 回到用例 1 那个「已引入悬空」的提交
  const docProbe = pickDocProbe();
  console.log(`  C1 = ${C1_SHA.slice(0, 8)}（删 ${probe.target} 引入悬空）· C2 = 只改 ${docProbe}`);
  const stillDangling = readGraph().edges.filter((e) => e.id === expectedDangling1[0] && e.status === 'dangling');
  expect('5 前置：HEAD（C1）里那条悬空边确实还在', stillDangling.length, 1);
  appendFileInFix(docProbe, `\n<!-- e2e 用例 5：与引用无关的文案改动（C2） -->\n`);
  stage();
  regen();
  commitAll(`fixture: C2 无关改动（${docProbe}）`);
  expect('5 前置：HEAD^ 就是 C1', git(['rev-parse', 'HEAD^']).stdout.trim(), C1_SHA);
  r = runGate(['--json']);
  console.log(`  门禁在 C2 上的退出码 = ${r.status}`);
  expect('5 exit 0（棘轮只拦本次新引入的）', r.status, 0, snippet(r.out));
  if (r.json) {
    expect('5 新增悬空 = 0（历史存量不追溯）', r.json.newly_dangling.length, 0);
    expect('5 新增未解析 = 0', r.json.newly_unresolved.length, 0);
  }
  const stillDangling2 = readGraph().edges.filter((e) => e.id === expectedDangling1[0] && e.status === 'dangling');
  expect('5 但当前图里那条悬空边依然存在（绿灯是棘轮给的，不是破坏消失了）', stillDangling2.length, 1);
  const human5 = runGate();
  console.log(`  人类可读输出退出码 = ${human5.status}`);
  expect('5 人类可读输出 exit 0', human5.status, 0);
  expectContains('5 原始输出里有门禁自己那句「历史存量不在本门禁的判定范围内」', human5.out, '历史存量不在本门禁的判定范围内');

  // =========================================================================
  // 用例 6：反例——新增 external / outside 的符号边（node:fs）不算「新增未解析」⇒ exit 0
  // =========================================================================
  caseHeader(6, "反例：新增 status='external' / to.state='outside' 的符号边 ⇒ exit 0");
  resetFixture();
  const extProbe = pickTsProbe(base);
  console.log(`  探针：${extProbe}（末尾追加一行 import ... from 'node:fs'）`);
  appendFileInFix(extProbe, `\nimport fs from 'node:fs';\n`);
  stage(); // 符号级层读索引：不 stage 就重算，新的 external 边根本不会出现在图里
  regen();
  commitAll(`fixture: 给 ${extProbe} 加一条仓库外 import（node:fs）`);
  const curr6 = readGraph();
  const baseIds6 = indexEdges(base.symbol_edges);
  const newExt = curr6.symbol_edges.filter((e) => e.from.file === extProbe && e.specifier === 'node:fs' && !baseIds6.has(e.id));
  expect('6 前置：真生成器确实产出了新的 node:fs 符号边', newExt.length > 0, true, `${newExt.length} 条`);
  expect(
    "6 前置：这些边就是 external / outside（to.sym === null）",
    newExt.length > 0 && newExt.every((e) => e.status === 'external' && e.to.state === 'outside' && e.to.sym === null),
    true,
    JSON.stringify(newExt.map((e) => `${e.id} status=${e.status} state=${e.to.state} sym=${e.to.sym}`)),
  );
  r = runGate(['--json']);
  console.log(`  门禁退出码 = ${r.status}`);
  expect('6 exit 0（仓库外说明符是已按设计处置，不是破坏）', r.status, 0, snippet(r.out));
  if (r.json) {
    expect('6 新增未解析 = 0', r.json.newly_unresolved.length, 0);
    expect('6 新增悬空 = 0', r.json.newly_dangling.length, 0);
    expectSetEqual('6 新边没有一条被算成新增未解析', r.json.newly_unresolved.map((e) => e.id).filter((id) => newExt.some((e) => e.id === id)), []);
  }

  // =========================================================================
  // 用例 7：--staged —— 改图后只 git add 不提交：不带开关 exit 0、带 --staged exit 1
  // =========================================================================
  caseHeader(7, '--staged：改图后只 git add 不提交 ⇒ 不带开关 0 / 带 --staged 1（basis: HEAD..index）');
  resetFixture();
  git(['rm', '-q', probe.target]);
  regen();
  git(['add', '-A']); // 只进索引，不提交
  expect('7 前置：改动只在索引里，没有新提交', git(['rev-parse', 'HEAD']).stdout.trim(), BASE_SHA);
  expect('7 前置：索引里确有未提交改动', git(['status', '--porcelain']).stdout.trim() !== '', true);
  const plain7 = runGate(['--json']);
  console.log(`  不带开关退出码 = ${plain7.status}`);
  expect('7 不带开关 exit 0（它比的是 HEAD^..HEAD，索引里的改动看不见）', plain7.status, 0, snippet(plain7.out));
  if (plain7.json) {
    expect('7 不带开关 basis 是 HEAD^..HEAD', plain7.json.basis, 'HEAD^..HEAD');
    expect('7 不带开关新增悬空 = 0', plain7.json.newly_dangling.length, 0);
  }
  const staged7 = runGate(['--staged', '--json']);
  console.log(`  带 --staged 退出码 = ${staged7.status}`);
  expect('7 带 --staged exit 1（它比的是 HEAD..索引）', staged7.status, 1, snippet(staged7.out));
  if (staged7.json) {
    expect('7 带 --staged basis 是 HEAD..index', staged7.json.basis, 'HEAD..index');
    expectSetEqual('7 带 --staged 新增悬空 = 索引里新引入的那些边', staged7.json.newly_dangling.map((e) => e.id), expectedDangling1);
    expect('7 带 --staged 的当前基准是索引 blob', staged7.json.basis_detail.current.includes('索引 blob'), true, staged7.json.basis_detail.current);
  }
  const stagedHuman7 = runGate(['--staged']);
  expectContains('7 人类可读输出里 basis 行写明 HEAD..index', stagedHuman7.out, 'basis: "HEAD..index"');

  // =========================================================================
  // 用例 8：fail-closed 四条各一
  // =========================================================================
  caseHeader(8, 'fail-closed 四条：根提交 / 当前图缺失 / schema_version 不一致 / 图结构不合规');
  // 8(a) 根提交：没有 HEAD^
  prepareRootCommitRepo();
  r = runGateAt(ROOTCOMMIT, ['--json']);
  console.log(`  8a 根提交退出码 = ${r.status}，diagnostic = ${r.json?.diagnostic}`);
  expect('8a 根提交 exit 1', r.status, 1);
  expect('8a 报 impact-baseline-unavailable', r.json?.diagnostic, 'impact-baseline-unavailable');
  expectContains('8a 人类可读输出带诊断码前缀', runGateAt(ROOTCOMMIT).out, '[impact-baseline-unavailable]');
  // 8b 当前图缺失：HEAD 里没有图产物
  resetFixture();
  git(['rm', '-q', REL]);
  commitAll('fixture: HEAD 里删掉图产物');
  r = runGate(['--json']);
  console.log(`  8b 当前图缺失退出码 = ${r.status}，diagnostic = ${r.json?.diagnostic}`);
  expect('8b 当前图缺失 exit 1', r.status, 1);
  expect('8b 报 impact-current-graph-unavailable', r.json?.diagnostic, 'impact-current-graph-unavailable');
  expectContains('8b 人类可读输出带诊断码前缀', runGate().out, '[impact-current-graph-unavailable]');
  // 8c schema_version 不一致：基线 2 / 当前 3
  resetFixture();
  const schemaGraph = readGraph();
  schemaGraph.schema_version = base.schema_version === 3 ? 4 : 3;
  writeGraph(schemaGraph);
  git(['add', REL]);
  commitAll('fixture: 当前图的 schema_version 与基线不一致');
  r = runGate(['--json']);
  console.log(`  8c 版本不一致退出码 = ${r.status}，diagnostic = ${r.json?.diagnostic}`);
  expect('8c schema_version 不一致 exit 1', r.status, 1);
  expect('8c 报 impact-schema-version-mismatch', r.json?.diagnostic, 'impact-schema-version-mismatch');
  expectContains('8c 人类可读输出带诊断码前缀', runGate().out, '[impact-schema-version-mismatch]');
  expectContains('8c 诊断信息点名两边版本', r.json?.reason || '', 'schema_version');
  // 8d 结构不合规之一：顶层不是对象
  resetFixture();
  writeGraph([]);
  git(['add', REL]);
  commitAll('fixture: 图产物顶层写成数组');
  r = runGate(['--json']);
  console.log(`  8d 顶层非对象退出码 = ${r.status}，diagnostic = ${r.json?.diagnostic}`);
  expect('8d 顶层非对象 exit 1', r.status, 1);
  expect('8d 报 impact-graph-malformed', r.json?.diagnostic, 'impact-graph-malformed');
  expectContains('8d 说明顶层不是对象', r.json?.reason || '', '顶层不是对象');
  // 8e 结构不合规之二：edges 不是数组
  resetFixture();
  writeGraph({ schema_version: base.schema_version, edges: {}, symbol_edges: [] });
  git(['add', REL]);
  commitAll('fixture: 图产物的 edges 写成对象');
  r = runGate(['--json']);
  console.log(`  8e edges 非数组退出码 = ${r.status}，diagnostic = ${r.json?.diagnostic}`);
  expect('8e edges 非数组 exit 1', r.status, 1);
  expect('8e 报 impact-graph-malformed', r.json?.diagnostic, 'impact-graph-malformed');
  expectContains('8e 说明 edges 不是数组', r.json?.reason || '', 'edges 不是数组');
  expectContains('8e 人类可读输出带诊断码前缀', runGate().out, '[impact-graph-malformed]');

  // =========================================================================
  // 第 9 组：测试的测试——把基线口径改回「基线全量边」，用例 1 的场景必须由红转绿
  // =========================================================================
  caseHeader(9, '测试的测试：基线口径改成「基线全量边」⇒ 用例 1 的场景失去信号（exit 1 → exit 0）');
  resetFixture();
  git(['reset', '-q', '--hard', C1_SHA]);
  const brokenGate = writeBrokenGateCopy();
  console.log(`  改坏副本：${brokenGate}`);
  const goodAtC1 = runGate(['--json']);
  const badRun = spawnSync(process.execPath, [brokenGate, '--root', FIX, '--json'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 30 });
  const badJson = JSON.parse(badRun.stdout);
  console.log(`  同一夹具状态：真门禁 exit=${goodAtC1.status} newly_dangling=${goodAtC1.json?.newly_dangling.length}；` +
    `改坏副本 exit=${badRun.status} newly_dangling=${badJson.newly_dangling.length}`);
  expect('9 前置：夹具停在用例 1 的 C1（悬空边在 HEAD 里）', git(['rev-parse', 'HEAD']).stdout.trim(), C1_SHA);
  expect('9 真门禁在 C1 上 exit 1（用例 1 的断言成立）', goodAtC1.status, 1);
  expectSetEqual('9 真门禁点名那条悬空边', goodAtC1.json?.newly_dangling.map((e) => e.id) || [], expectedDangling1);
  expect('9 改坏副本在同一状态上 exit 0（漏报 bug 复现 ⇒ 用例 1 会 FAIL）', badRun.status, 0, `改坏副本输出 ok=${badJson.ok}`);
  expect('9 改坏副本新增悬空 = 0（那条边被「基线全量边」吞掉了）', badJson.newly_dangling.length, 0);
  expect('9 改坏副本 basis 未被动过', badJson.basis, 'HEAD^..HEAD');
  // 真仓库的实现文件必须原样（改坏只发生在夹具目录的副本里）
  expectContains('9 真仓库的 check-impact.cjs 未被改动（无 Q11-MUTATION 标记）', fs.readFileSync(path.join(REPO, 'scripts', 'check-impact.cjs'), 'utf8'), 'const danglingBase = new Map([...baseEdges].filter');

  resetFixture();
  console.log(`\n${failed === 0 ? '✔' : '✖'} ${checked - failed}/${checked} 条断言通过`);
  process.exitCode = failed === 0 ? 0 : 1;
}

try {
  main();
} finally {
  // 无论成败都删夹具：测试不得在系统 temp 留垃圾。
  try {
    fs.rmSync(ROOT, { recursive: true, force: true });
  } catch {
    /* 删不掉不影响结论 */
  }
}
