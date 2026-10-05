#!/usr/bin/env node
/**
 * tests/change-log-e2e.mjs
 * 改动记录端到端验证（增量 2 的「改动记录骨架」）：生成器 / 复核器 / 降级契约的**退出码级**断言。
 * ---------------------------------------------------------------------------
 * 为什么要有它：改动记录的价值全在三件事上——① 它真的是「两份快照之差」（不是手写的说明）；
 * ② 删掉一个仍被引用的文件时，它**指得出谁还在引用**（不能给一张空表）；③ 基准不可用时它说
 * 「不可判定」而不是「没有引用」。文档只能描述意图，断言才能钉住行为：
 *   1. 生成：`--commit <B>`（from = B 的父提交）→ 记录字段齐全；快照身份（tree / universe_hash /
 *      tracked_total）与**独立算出的**夹具值一致（不是拿生成器的输出去验生成器）；
 *   2. 记录内容：删掉「仍被引用」的目标后，`affected_referrers` 必须指得出谁还在引用（needs_change = true）。
 *      两种真实形状都覆盖：① 模块说明符（解析候选退化成 `target.js`，被删文件连节点都不剩 →
 *      `files.removed`）；② 精确路径引用（Markdown 链接，被删文件仍是节点 → `files.state_changed`
 *      indexed → deleted + `edges.status_changed` resolved → dangling）。本仓 `ed404e5` 是第 ② 种；
 *   3. 复核：`--check` 重算后 exit 0；幂等（同一基准不写第二条记录）；
 *   4. 负例(i) 篡改 `edges.status_changed` 的状态 → `--check` exit 1 且**点名到字段**；
 *   5. 负例(ii) 删光 `affected_referrers` → `--check` exit 1（数组长度与 counts 对不上）；
 *   6. 负例(iii) 基准不可用（记录指向一个不存在的提交）→ `--check` exit 1 且明确「未证伪也未证实」；
 *   7. 降级契约 `stale`：暂存态记录（`--index`）在索引变了之后 → `--check` exit 1 且报 `[stale]`；
 *   8. 可选外键 fail-closed：`--change-id x` 在**没有** `changes/` 的仓库里 → exit 2（外键不得凭空写）；
 *   9. 用法 / `--root` fail-closed：`--from` 缺 `--to` → exit 2；非 git 目录 → exit 1，绝不回退；
 *  10. 真仓库自证：`--check` 在真仓库 exit 0（已落盘的记录与重算一致）。
 *
 * 夹具：把本仓库索引里的全部已跟踪文件用 `git checkout-index -a --prefix=<tmp>/` 物化到系统 temp，
 * 在夹具里 `git init` + 基线提交，再造「删除一个仍被引用的文件」的提交。
 * 物化会**连真仓库的记录一起带进来**——它们的基准提交在夹具里不存在，正好用来断言
 * 「基准不可用 ⇒ unknown ⇒ 不判绿」（第 1 组），随后清掉它们，让夹具从零开始。
 * **绝不在真仓库里造测试文件**，跑完删掉整个 temp 目录。
 *
 * 前置：本批新增的 `ledger/change-log/schema.json` 必须已经 `git add`（夹具物化的是**索引**）。
 *
 * 用法：node tests/change-log-e2e.mjs
 * 退出码：0 全部通过 / 1 有用例失败 / 2 夹具准备失败
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOOL = path.join(REPO, 'scripts', 'generate-change-log.cjs');
const LOG_DIR = 'ledger/change-log';
const SCHEMA_REL = `${LOG_DIR}/schema.json`;

const ROOT = path.join(os.tmpdir(), `code-normify-changelog-${process.pid}`);
const FIX = path.join(ROOT, 'fixture');
const TARGET = 'src/changelog-probe-target.ts';
const USER = 'src/changelog-probe-user.ts';
const DOC = 'docs/changelog-probe-doc.md';
const LINKS = 'docs/changelog-probe-links.md';

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
function expectContains(name, haystack, needle) {
  checked += 1;
  if (String(haystack).includes(needle)) pass(name, `命中「${needle}」`);
  else fail(name, `未命中「${needle}」；实际输出：\n${String(haystack).slice(0, 1200)}`);
}
function expectNotContains(name, haystack, needle) {
  checked += 1;
  if (!String(haystack).includes(needle)) pass(name, `确认不含「${needle}」`);
  else fail(name, `不应出现「${needle}」；实际输出：\n${String(haystack).slice(0, 1200)}`);
}

function sh(cmd, args, cwd, opts = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} 失败（status=${r.status}，cwd=${cwd}）\n${r.stdout || ''}\n${r.stderr || ''}`);
  }
  return r;
}
const git = (args, opts) => sh('git', args, FIX, opts);
/** 跑生成器（脚本来自真仓库，被检查的仓库根用 --root 指向夹具）。 */
function runTool(args) {
  const r = spawnSync(process.execPath, [TOOL, ...args], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}
const writeInFix = (rel, text) => {
  const abs = path.join(FIX, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, 'utf8');
};
const logDirAbs = path.join(FIX, ...LOG_DIR.split('/'));
const recordNames = () =>
  fs
    .readdirSync(logDirAbs)
    .filter((n) => n.endsWith('.json') && n !== 'schema.json')
    .sort();
const readRecord = (name) => JSON.parse(fs.readFileSync(path.join(logDirAbs, name), 'utf8'));
const writeRecord = (name, obj) => fs.writeFileSync(path.join(logDirAbs, name), `${JSON.stringify(obj, null, 2)}\n`, 'utf8');

/** 某个提交的宇宙摘要，**独立算**（生成器同一算法：sha256(sort(路径, 码点升序).join('\n') + '\n')）。 */
function universeHashOfRev(rev) {
  const paths = git(['ls-tree', '-r', '--name-only', rev])
    .stdout.split('\n')
    .filter(Boolean)
    .sort();
  return crypto.createHash('sha256').update(`${paths.join('\n')}\n`, 'utf8').digest('hex');
}
const trackedOfRev = (rev) => git(['ls-tree', '-r', '--name-only', rev]).stdout.split('\n').filter(Boolean).length;

function prepareFixture() {
  fs.rmSync(ROOT, { recursive: true, force: true });
  fs.mkdirSync(FIX, { recursive: true });
  const co = spawnSync('git', ['checkout-index', '-a', `--prefix=${FIX}/`], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (co.status !== 0) throw new Error(`git checkout-index 失败：${co.stdout}\n${co.stderr}`);
  if (!fs.existsSync(path.join(FIX, ...SCHEMA_REL.split('/')))) {
    throw new Error(`夹具里没有 ${SCHEMA_REL}（夹具物化的是**索引**：本批新增文件必须先 git add 再跑本测试）`);
  }
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.email', 'changelog-e2e@example.invalid']);
  git(['config', 'user.name', 'changelog-e2e']);
  git(['config', 'core.autocrlf', 'false']);
  return git(['ls-files']).stdout.split('\n').filter(Boolean).length;
}

const trackedInFixture = () => git(['ls-files']).stdout.split('\n').filter(Boolean).length;

/**
 * 造两个提交：A 新增两组「引用方 → 目标」，B **删掉两组目标**（引用方都不动）。两种形状覆盖两种真实情形：
 *   · 模块说明符 `import './target.js'` 指向被删的 `target.ts`：解析候选在 A 是 `target.ts`（存在）、
 *     在 B 退化成说明符字面量的 `target.js`——**这是共享解析内核的既有语义**（与 check-references 同源，
 *     记录只如实转述，不改判定），于是被删文件在 B 里连节点都不剩 → 进 `files.removed`；
 *   · Markdown 链接 `[目标](./doc.md)` 指向被删的 `doc.md`：路径是精确的，被删文件在 B 里**仍是节点**
 *     （state: indexed → deleted）→ 进 `files.state_changed`。本仓 `ed404e5` 就是这一种形状。
 * 两组都必须在 `affected_referrers` 里指出「谁还在引用它」——只比 id 的差在这里会给出一张空表。
 */
function writeProbes() {
  writeInFix(TARGET, 'export const changelogProbeTarget = 1;\n');
  writeInFix(USER, "import { changelogProbeTarget } from './changelog-probe-target.js';\n\nexport const changelogProbeUser = changelogProbeTarget;\n");
  writeInFix(DOC, '# changelog 探针目标\n\n供「删掉仍被引用的文件」用例使用。\n');
  writeInFix(LINKS, '# changelog 探针链接\n\n[目标](./changelog-probe-doc.md)\n');
  git(['add', '-A']);
  git(['commit', '-q', '-m', 'fixture: add the probe pairs (referrers reference targets)']);
  const a = git(['rev-parse', 'HEAD']).stdout.trim();
  git(['rm', '-q', TARGET, DOC]);
  git(['commit', '-q', '-m', 'fixture: delete the referenced probe targets']);
  const b = git(['rev-parse', 'HEAD']).stdout.trim();
  return { a, b };
}

function main() {
  console.log('change-log-e2e：改动记录（生成 / 复核 / 降级契约）');
  try {
    prepareFixture();
  } catch (err) {
    console.error(`夹具准备失败：${err.message}`);
    process.exitCode = 2;
    return;
  }

  // ---- 1. 基准不可用 ⇒ unknown ⇒ 不判绿（用物化进来的真仓库记录做真实证据） ----
  const inherited = recordNames();
  expect('1 前置：夹具里带着真仓库的记录（夹具物化的是索引）', inherited.length >= 1, true, inherited.join('、'));
  let r = runTool(['--root', FIX, '--check']);
  expect('1 基准不可用：--check exit 1（不得判绿）', r.status, 1, r.out.trim().split('\n')[0]);
  expectContains('1 基准不可用：报 [unknown]', r.out, '[unknown]');
  expectContains('1 基准不可用：说明无法复核', r.out, '基准不可用，无法复核');
  expectContains('1 基准不可用：明确未证伪也未证实', r.out, '未证伪也未证实');
  for (const n of recordNames()) fs.rmSync(path.join(logDirAbs, n)); // 清掉继承来的记录，夹具从零开始
  git(['add', '-A']);
  git(['commit', '-q', '-m', 'fixture baseline']);
  expect('1 清理后：夹具里没有记录', recordNames().length, 0);
  const trackedCount = trackedInFixture();

  const { a, b } = writeProbes();
  console.log(`夹具：${FIX}（基线 ${trackedCount} 个已跟踪文件；A=${a.slice(0, 7)} 加探针，B=${b.slice(0, 7)} 删目标）`);

  // ---- 2. 生成 ----
  r = runTool(['--root', FIX, '--commit', b, '--json']);
  expect('2 生成：exit 0', r.status, 0, r.out.trim().slice(0, 200));
  const names = recordNames();
  expect('2 生成：写出恰好一条记录', names.length, 1, names.join('、'));
  const name = names[0] || '';
  expect('2 生成：文件名 = <UTC 紧凑时刻>-<短哈希>.json', /^\d{8}T\d{6}Z-[0-9a-f]{7}\.json$/.test(name), true, name);

  const rec = readRecord(name);
  expect('2 记录：schema_version = 1', rec.schema_version, 1);
  expect('2 记录：kind = commit', rec.kind, 'commit');
  expect('2 记录：commit = B', rec.commit, b);
  expect('2 记录：commit_parent = A', rec.commit_parent, a);
  expect('2 记录：cas_digest = null（cas-write 观测点未实现）', rec.cas_digest, null);
  expect('2 记录：change_id = null（本仓库没有 changes/ 目录）', rec.change_id, null);
  expect('2 记录：created_at 是 UTC ISO-8601 秒级', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(rec.created_at), true, rec.created_at);
  expect('2 快照：from_snapshot.rev = A', rec.from_snapshot.rev, a);
  expect('2 快照：from_snapshot.tree = A 的树（独立算）', rec.from_snapshot.tree, git(['rev-parse', `${a}^{tree}`]).stdout.trim());
  expect('2 快照：to_snapshot.tree = B 的树（独立算）', rec.to_snapshot.tree, git(['rev-parse', `${b}^{tree}`]).stdout.trim());
  expect('2 快照：from_snapshot.universe_hash 与独立算法一致', rec.from_snapshot.universe_hash, universeHashOfRev(a));
  expect('2 快照：to_snapshot.universe_hash 与独立算法一致', rec.to_snapshot.universe_hash, universeHashOfRev(b));
  expect('2 快照：from_snapshot.tracked_total = A 的已跟踪条数', rec.from_snapshot.tracked_total, trackedOfRev(a));
  expect('2 快照：to_snapshot.tracked_total = B 的已跟踪条数', rec.to_snapshot.tracked_total, trackedOfRev(b));
  expect('2 记录：handling 初值 = pending', rec.handling.status, 'pending');
  expect('2 记录：degradation.status = complete', rec.degradation.status, 'complete');
  expect('2 记录：complete 的 reasons 为空', rec.degradation.reasons.length, 0);
  expect('2 记录：omitted 自证本批不做的范围', Array.isArray(rec.omitted) && rec.omitted.length >= 4, true, JSON.stringify(rec.omitted));

  // ---- 3. 「删了目标之后谁还在引用」必须被表达出来：形状(a) 模块说明符 ----
  expect('3a 文件差：added 为空（本次没加文件）', rec.files.added.length, 0);
  expect('3a 文件差：removed 点名被删的 .ts（解析候选退化成 target.js，节点不再存在）', JSON.stringify(rec.files.removed), JSON.stringify([TARGET]));
  expect('3a 边差：added / removed 全空（边 id 没变）', rec.edges.added.length + rec.edges.removed.length, 0);
  const scImport = rec.edges.status_changed.find((x) => String(x.edge).startsWith(`${USER}:1:`)) || {};
  expect('3a 边差：import 边 status_changed 存在', scImport.edge !== undefined, true);
  expect('3a 边差：import 边 from_status = resolved', scImport.from_status, 'resolved');
  expect('3a 边差：import 边 to_status = dangling', scImport.to_status, 'dangling');
  expect('3a 边差：import 边 id 带说明符', String(scImport.edge).endsWith(':import:./changelog-probe-target.js'), true, scImport.edge);
  const refImport = rec.affected_referrers.find((x) => x.file === USER) || {};
  expect('3a 引用方：点名到引用方文件', refImport.file, USER);
  expect('3a 引用方：点名到行（第 1 行）', refImport.line, 1);
  expect('3a 引用方：classification = dangling-target', refImport.classification, 'dangling-target');
  expect('3a 引用方：needs_change = true（必须改它）', refImport.needs_change, true);
  expect('3a 引用方：给出边的解析状态 dangling', refImport.edge_status, 'dangling');
  expect('3a 引用方：目标状态如实为 missing（target.js 从来不存在）', refImport.target_state, 'missing', refImport.target);

  // ---- 3b. 形状(b)：精确路径的引用（Markdown 链接）→ 被删文件仍是节点，状态差必须出现 ----
  expect(
    '3b 文件差：state_changed 记录了 indexed → deleted',
    JSON.stringify(rec.files.state_changed),
    JSON.stringify([{ file: DOC, from: 'indexed', to: 'deleted' }]),
  );
  const scLink = rec.edges.status_changed.find((x) => String(x.edge).startsWith(`${LINKS}:`)) || {};
  expect('3b 边差：markdown 边 status_changed 存在', scLink.edge !== undefined, true);
  expect('3b 边差：markdown 边 from_status = resolved', scLink.from_status, 'resolved');
  expect('3b 边差：markdown 边 to_status = dangling', scLink.to_status, 'dangling');
  expect('3b 边差：markdown 边 from_target_state = indexed', scLink.from_target_state, 'indexed');
  expect('3b 边差：markdown 边 to_target_state = deleted', scLink.to_target_state, 'deleted');
  const refLink = rec.affected_referrers.find((x) => x.file === LINKS) || {};
  expect('3b 引用方：点名的目标就是被删文件', refLink.target, DOC);
  expect('3b 引用方：classification = dangling-target', refLink.classification, 'dangling-target');
  expect('3b 引用方：needs_change = true', refLink.needs_change, true);

  // ---- 3c. 计数与摘要 ----
  expect('3c 计数：files_removed = 1', rec.counts.files_removed, 1);
  expect('3c 计数：files_state_changed = 1', rec.counts.files_state_changed, 1);
  expect('3c 计数：edges_status_changed = 2', rec.counts.edges_status_changed, 2);
  expect('3c 计数：affected_referrers = 2', rec.counts.affected_referrers, 2);
  expect('3c 计数：needs_change = 2', rec.counts.needs_change, 2);
  expect('3c 摘要：一行里给出状态变化与需改条数', rec.summary.includes('±1') && rec.summary.includes('需改 2 条'), true, rec.summary);

  // 留一份原始字节：后面几组要故意改坏它，验完再恢复。
  const pristineBytes = fs.readFileSync(path.join(logDirAbs, name));

  // ---- 4. 复核 + 幂等 ----
  r = runTool(['--root', FIX, '--check']);
  expect('4 复核：exit 0', r.status, 0, r.out.trim().split('\n')[0]);
  expectContains('4 复核：说明比对口径（重算逐字段）', r.out, '重算逐字段复核');
  expectContains('4 复核：说明人类字段不参与', r.out, 'created_at 与 handling 不参与复核');
  r = runTool(['--root', FIX, '--commit', b]);
  expect('4 幂等：同一基准再跑 exit 0', r.status, 0);
  expectContains('4 幂等：说明记录只增不改', r.out, '只增不改');
  expect('4 幂等：没有写第二条记录', recordNames().length, 1);

  // ---- 5. 负例(i)：篡改边的状态 → 复核必须点名到字段 ----
  const tampered = readRecord(name);
  tampered.edges.status_changed[0].to_status = 'resolved'; // 谎称「链接还能解析」
  writeRecord(name, tampered);
  r = runTool(['--root', FIX, '--check']);
  expect('5 篡改边状态：--check exit 1', r.status, 1);
  expectContains('5 篡改边状态：点名到字段', r.out, 'edges.status_changed[0].to_status');

  // ---- 5b. 负例(ii-b)：结构不合规（枚举越界）→ 复核必须报 schema 而不是去重算 ----
  const tamperedShape = JSON.parse(pristineBytes.toString('utf8'));
  tamperedShape.degradation.status = 'maybe'; // 四态之外的取值：schema 必须拦住
  writeRecord(name, tamperedShape);
  r = runTool(['--root', FIX, '--check']);
  expect('5b 结构不合规：--check exit 1', r.status, 1);
  expectContains('5b 结构不合规：点名 schema 与路径', r.out, `不符合 ${SCHEMA_REL}`);
  expectContains('5b 结构不合规：指出越界的字段', r.out, '/degradation/status');

  // ---- 6. 负例(ii)：删光 affected_referrers → 复核必须发现 ----
  fs.writeFileSync(path.join(logDirAbs, name), pristineBytes); // 从干净记录重新改，避免叠加上一组的越界枚举
  const tampered2 = readRecord(name);
  tampered2.affected_referrers = [];
  writeRecord(name, tampered2);
  r = runTool(['--root', FIX, '--check']);
  expect('6 清空引用方：--check exit 1', r.status, 1);
  expectContains('6 清空引用方：点名字段', r.out, 'affected_referrers');
  expectContains('6 清空引用方：不得静默放行', r.out, '重算结果与记录不一致');

  // ---- 7. 负例(iii)：基准不可用（记录指向不存在的提交）→ unknown ----
  fs.writeFileSync(path.join(logDirAbs, name), pristineBytes); // 先恢复
  const ghost = readRecord(name);
  ghost.commit = '0'.repeat(40);
  ghost.from_snapshot.rev = '1'.repeat(40);
  ghost.from_snapshot.tree = '2'.repeat(40);
  ghost.to_snapshot.rev = '0'.repeat(40);
  ghost.to_snapshot.tree = '3'.repeat(40);
  writeRecord('99990101T000000Z-0000000.json', ghost);
  r = runTool(['--root', FIX, '--check']);
  expect('7 基准不可用：--check exit 1（unknown 不判绿）', r.status, 1);
  expectContains('7 基准不可用：说明无法复核', r.out, '基准不可用，无法复核');
  expectContains('7 基准不可用：明确未证伪也未证实', r.out, '未证伪也未证实');
  fs.rmSync(path.join(logDirAbs, '99990101T000000Z-0000000.json'));
  r = runTool(['--root', FIX, '--check']);
  expect('7 清理后：--check 恢复 exit 0', r.status, 0, r.out.trim().split('\n')[0]);

  // ---- 8. 降级契约 stale：暂存态记录（--index）在索引变了之后失效 ----
  writeInFix('src/changelog-staged.ts', 'export const changelogStaged = 1;\n');
  git(['add', 'src/changelog-staged.ts']);
  r = runTool(['--root', FIX, '--index', '--json']);
  expect('8 暂存态：--index exit 0', r.status, 0, r.out.trim().slice(0, 160));
  const indexName = recordNames().find((n) => readRecord(n).kind === 'index');
  expect('8 暂存态：写出 kind = index 的记录', indexName !== undefined, true, indexName || '（无）');
  const indexRec = indexName ? readRecord(indexName) : {};
  expect('8 暂存态：to_snapshot.basis = index', indexRec.to_snapshot && indexRec.to_snapshot.basis, 'index');
  expect('8 暂存态：索引侧不写树对象（tree = null）', indexRec.to_snapshot && indexRec.to_snapshot.tree, null);
  expect('8 暂存态：记下被暂存的新文件', JSON.stringify(indexRec.files && indexRec.files.added), JSON.stringify(['src/changelog-staged.ts']));
  r = runTool(['--root', FIX, '--check']);
  expect('8 暂存态：索引未变时 --check exit 0', r.status, 0, r.out.trim().split('\n')[0]);
  writeInFix('src/changelog-staged2.ts', 'export const changelogStaged2 = 1;\n');
  git(['add', 'src/changelog-staged2.ts']); // 让索引真的变一次
  r = runTool(['--root', FIX, '--check']);
  expect('8 降级 stale：索引变了 → --check exit 1', r.status, 1);
  expectContains('8 降级 stale：报 [stale]', r.out, '[stale]');
  expectContains('8 降级 stale：说明它描述的状态已不存在', r.out, '记录描述的暂存态已经不存在');
  expectContains('8 降级 stale：明确 stale ≠ 记录有错', r.out, 'stale ≠ 记录有错');

  // ---- 9. 可选外键 fail-closed ----
  r = runTool(['--root', FIX, '--commit', b, '--change-id', 'no-such-change']);
  expect('9 外键：指向不存在的 changes/<id>.json → exit 2', r.status, 2);
  expectContains('9 外键：说明不得凭空写', r.out, '外键**不得凭空写**');
  expectContains('9 外键：说明本仓库没有 changes/ 目录', r.out, '没有 changes/ 目录');

  // ---- 10. 用法与 --root fail-closed ----
  r = runTool(['--root', FIX, '--from', a]);
  expect('10 用法：--from 缺 --to → exit 2', r.status, 2);
  expectContains('10 用法：说明必须成对', r.out, '--from 与 --to 必须成对');
  r = runTool(['--root', FIX, '--check', '--commit', b]);
  expect('10 用法：--check 与生成参数互斥 → exit 2', r.status, 2);
  const notRepo = path.join(ROOT, 'not-a-repo');
  fs.mkdirSync(notRepo, { recursive: true });
  r = runTool(['--root', notRepo, '--check']);
  expect('10 fail-closed：非 git 目录 → exit 1', r.status, 1);
  expectContains('10 fail-closed：不回退到本仓库', r.out, '不是 git 仓库');
  r = runTool(['--root', path.join(ROOT, 'does-not-exist'), '--check']);
  expect('10 fail-closed：不存在的目录 → exit 1', r.status, 1);

  // ---- 11. 真仓库自证 ----
  r = runTool(['--root', REPO, '--check']);
  expect('11 真仓库：check:changes exit 0（已落盘记录与重算一致）', r.status, 0, r.out.trim().split('\n')[0]);
  expectNotContains('11 真仓库：没有记录处于 unknown', r.out, '[unknown]');
  expectNotContains('11 真仓库：没有记录处于 stale', r.out, '[stale]');

  // ---- 12. 降级契约 partial：浅克隆（历史删除清单拿不全）→ history-unavailable ----
  // 为什么单独测：`partial` 是「差已算出，但有**已知缺口**」——缺口的语义必须是「不得当完整清单」，
  // 而不是让读的人以为拿到了全部。本机与 CI 都不是浅克隆（typescript 也在），所以这条路径只能自己造：
  // `--depth 2` 的克隆里 HEAD 与父提交都在（两份快照都建得出来），但更早的历史被截断 ⇒ 只能标 partial。
  const shallowDir = path.join(ROOT, 'shallow');
  sh('git', ['clone', '-q', '--depth', '2', pathToFileURL(FIX).href, shallowDir], ROOT);
  expect(
    '12 浅克隆：夹具确实是浅仓库',
    spawnSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: shallowDir, encoding: 'utf8' }).stdout.trim(),
    'true',
  );
  r = runTool(['--root', shallowDir, '--commit', 'HEAD', '--json']);
  expect('12 浅克隆：生成 exit 0', r.status, 0, r.out.trim().slice(0, 160));
  const shallowLogDir = path.join(shallowDir, ...LOG_DIR.split('/'));
  const shallowName = fs.readdirSync(shallowLogDir).filter((n) => n.endsWith('.json') && n !== 'schema.json')[0];
  const shallowRec = JSON.parse(fs.readFileSync(path.join(shallowLogDir, shallowName), 'utf8'));
  expect('12 浅克隆：degradation.status = partial', shallowRec.degradation.status, 'partial');
  expect('12 浅克隆：reasons 点名 history-unavailable', JSON.stringify(shallowRec.degradation.reasons), JSON.stringify(['history-unavailable']));
  expectContains('12 浅克隆：note 说明缺口已知、不得当完整清单', shallowRec.degradation.note, '已知缺口');
  expectNotContains('12 浅克隆：note 不得写成「真的没有差异」', shallowRec.degradation.note, '数组为空 = 真的没有差异');
  r = runTool(['--root', shallowDir, '--check']);
  expect('12 浅克隆：--check exit 0（partial 是可复核的降级，不是红）', r.status, 0, r.out.trim().split('\n')[0]);
  expectContains('12 浅克隆：复核后的状态分布是 partial', r.out, '{"partial":1}');

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
