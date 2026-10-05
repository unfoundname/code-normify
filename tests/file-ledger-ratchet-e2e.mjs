#!/usr/bin/env node
/**
 * tests/file-ledger-ratchet-e2e.mjs
 * 全仓文件台账「grandfathered 棘轮」端到端验证（与 HEAD 版台账比对的那条判据）：exit code 断言。
 * ---------------------------------------------------------------------------
 * 为什么要有它：棘轮的判据从「与上一份台账比」改成「与 **HEAD 版**台账比」之后，唯一能证明
 * 「手工洗白后门已被堵住」的东西就是**退出码**——文档与 --help 只能描述意图，不能证明它成立。
 * 本用例逐条钉住四件事（每条都断言退出码 + 关键文案，不看「大概绿」）：
 *   1. 干净态：门禁 exit 0（基线 = HEAD 版台账）；
 *   2. 负例(i)：手工把一条**在索引里**的路径写进 grandfathered + `git add` → 门禁 **exit 1**
 *      （报 grandfathered-added-vs-head），且 `generate-file-ledger.cjs --check` 也 **exit 1**；
 *   3. 正向例(ii)：合法**删掉**一条已经可移除（已命中豁免）的 grandfathered 条目 + `git add` → **exit 0**
 *      （只允许集合缩小；门禁回显「已减 1 条」）；
 *   4. 首次引入：HEAD 里没有该台账（索引里有）→ **exit 0**，报告回显「一次性初始化：基线由本次提交建立」。
 *
 * 夹具：把本仓库索引里的全部已跟踪文件用 `git checkout-index -a --prefix=<tmp>/` 物化到系统 temp，
 * 在夹具里 `git init` + 一次提交（台账随第一次提交进入 HEAD，基线由此建立）。夹具台账的
 * meta.tracked_total / meta.universe_hash 由本脚本按夹具自己的索引清单现算（夹具宇宙 == 本仓库宇宙，
 * 因为物化的是同一份清单）；台账条目只写最小必需字段，避免测试依赖台账里那 19 条真实豁免。
 * **绝不在真仓库里造测试文件**，跑完删掉整个 temp 目录。
 *
 * 用法：node tests/file-ledger-ratchet-e2e.mjs
 * 退出码：0 全部通过 / 1 有用例失败（打印每条断言的实际值与期望值）/ 2 夹具准备失败
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GATE = path.join(REPO, 'scripts', 'check-file-ledger.cjs');
const GEN = path.join(REPO, 'scripts', 'generate-file-ledger.cjs');
const LEDGER_REL = 'ledger/file-ledger.json';
/**
 * 手工洗白用的路径：必须在**索引里**、且**不在夹具基线的 grandfathered 里**
 * （否则加进去只是重复条目，测不到「相对 HEAD 新增」这条判据）。
 * 选示例目录下的模块文件：它命中 examples/** 豁免、又不在基线清单里。
 */
const LAUNDERED = 'examples/bilibili-trial/normify-data/modules/main.md';
/** 合法缩小用的路径：先给它一条豁免（使条目「可移除」），再把它从 grandfathered 里删掉。 */
const SHRINKABLE = 'src/workspace.ts';

const ROOT = path.join(os.tmpdir(), `code-normify-ledger-ratchet-${process.pid}`);
const FIX = path.join(ROOT, 'fixture');
const ledgerAbs = path.join(FIX, LEDGER_REL);

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

function sh(cmd, args, cwd, opts = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} 失败（status=${r.status}，cwd=${cwd}）\n${r.stdout || ''}\n${r.stderr || ''}`);
  }
  return r;
}
const git = (args, opts) => sh('git', args, FIX, opts);
/** 跑门禁 / 生成器（脚本来自真仓库，被检查的仓库根用 --root 指向夹具）。 */
function runTool(script, args, cwd = REPO) {
  const r = spawnSync(process.execPath, [script, ...args], { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}
const readLedger = () => JSON.parse(fs.readFileSync(ledgerAbs, 'utf8'));
const writeLedger = (j) => fs.writeFileSync(ledgerAbs, `${JSON.stringify(j, null, 2)}\n`, 'utf8');
const mutate = (fn) => {
  const j = readLedger();
  fn(j);
  writeLedger(j);
};

/** 夹具的台账：最小合法结构，meta 由夹具自己的索引清单现算（门禁的 tracked-mismatch 必须绿）。 */
function writeFixtureLedger(tracked) {
  const universeHash = crypto.createHash('sha256').update(`${tracked.join('\n')}\n`, 'utf8').digest('hex');
  // 豁免只覆盖 examples/**（与真台账同一条模式，命中 1249/1399，过宽判据不会触发）：
  // 其余已跟踪文件全部进 grandfathered —— 夹具的「干净态」必须真的 0 error，否则断言没有意义。
  const exempt = (rel) => rel === 'examples' || rel.startsWith('examples/');
  writeLedger({
    schema_version: 1,
    meta: {
      generated_at: '2026-10-05',
      generator: 'scripts/generate-file-ledger.cjs',
      gate: 'scripts/check-file-ledger.cjs',
      // 门禁的结构校验要求这几个字段必填（generated_at / universe / tracked_total / universe_hash / coverage_basis）。
      universe: 'git ls-files（夹具宇宙 = 物化出来的本仓库已跟踪清单）',
      tracked_total: tracked.length,
      universe_hash: universeHash,
      coverage_basis: '夹具：bound 只算被模块 source.path 精确声明且真实存在的已跟踪普通文件；planned 不计入。',
      known_divergences: ['夹具：本文件由 tests/file-ledger-ratchet-e2e.mjs 生成，只为验证棘轮判据的退出码。'],
    },
    exempt_patterns: [
      {
        pattern: 'examples/**',
        reason: '夹具：示例目录整体豁免（与真台账同一条模式；命中率 89.3% 过半，故必须带 broad_confirmed 人工确认）',
        since: '2026-10-05',
        broad_confirmed: true,
      },
    ],
    grandfathered: tracked.filter((rel) => !exempt(rel)),
  });
}

function prepareFixture() {
  fs.rmSync(ROOT, { recursive: true, force: true });
  fs.mkdirSync(FIX, { recursive: true });
  const co = spawnSync('git', ['checkout-index', '-a', `--prefix=${FIX}/`], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (co.status !== 0) throw new Error(`git checkout-index 失败：${co.stdout}\n${co.stderr}`);
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.email', 'ratchet-e2e@example.invalid']);
  git(['config', 'user.name', 'ratchet-e2e']);
  git(['config', 'core.autocrlf', 'false']);
  // 先 git add，再问 ls-files：夹具宇宙必须等于物化出来的文件清单（否则台账 tracked_total 对不上）。
  git(['add', '-A']);
  const tracked = git(['ls-files']).stdout.split('\n').filter(Boolean).sort();
  writeFixtureLedger(tracked);
  git(['add', LEDGER_REL]);
  git(['commit', '-q', '-m', 'fixture baseline: ledger committed (ratchet baseline established)']);
  return tracked;
}

function main() {
  console.log('file-ledger-ratchet-e2e：grandfathered 棘轮（与 HEAD 版台账比对）');
  let tracked;
  try {
    tracked = prepareFixture();
  } catch (err) {
    console.error(`夹具准备失败：${err.message}`);
    process.exitCode = 2;
    return;
  }
  console.log(`夹具：${FIX}（${tracked.length} 个已跟踪文件 · HEAD 含台账）`);

  // ---- 1. 干净态 ----
  let r = runTool(GATE, ['--root', FIX]);
  expect('1 干净态：门禁 exit 0', r.status, 0, r.out.trim().split('\n').slice(-1)[0]);
  expectContains('1 干净态：基线 = HEAD 版台账', r.out, '祖父清单棘轮: 基线 = HEAD 版台账');

  // ---- 2. 负例(i)：手工加一条**在索引里**的路径 + git add → 门禁 exit 1 ----
  mutate((j) => j.grandfathered.push(LAUNDERED));
  git(['add', LEDGER_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('2 负例(i)：门禁 exit 1', r.status, 1);
  expectContains('2 负例(i)：报 grandfathered-added-vs-head', r.out, '[grandfathered-added-vs-head]');
  expectContains('2 负例(i)：点名被加进来的路径', r.out, `grandfathered 新增条目（HEAD 版台账里没有它）：${LAUNDERED}`);
  expectContains('2 负例(i)：给出合法修法指引', r.out, '合法修法两条');
  expectContains('2 负例(i)：明确否掉「在 HEAD 里即绿」', r.out, '不是绿灯理由');

  // ---- 2b. 同一夹具：生成器 --check 也必须 exit 1（两道门禁不留缝隙） ----
  r = runTool(GEN, ['--root', FIX, '--check']);
  expect('2b 负例(i)：生成器 --check exit 1', r.status, 1);
  expectContains('2b 负例(i)：生成器点名新增条目', r.out, `+ ${LAUNDERED}`);
  expectContains('2b 负例(i)：比较基准是索引 blob', r.out, '比较基准 = git 索引 blob');

  // ---- 3. 正向例(ii)：合法缩小（先让条目可移除，再删掉它）+ git add → exit 0 ----
  git(['reset', '-q', '--hard', 'HEAD']);
  // 追加一条精确豁免（**保留** examples/**，否则 1249 个示例文件会一起落回 unowned）。
  mutate((j) => {
    j.exempt_patterns.push({ pattern: SHRINKABLE, reason: 'e2e：让这条祖父条目变成「可移除」，使合法缩小可测', since: '2026-10-05' });
  });
  git(['add', LEDGER_REL]);
  git(['commit', '-q', '-m', 'fixture: exempt the shrinkable path (makes its grandfathered entry removable)']);
  r = runTool(GATE, ['--root', FIX]);
  expect('3 前置：豁免生效后门禁仍 exit 0', r.status, 0, r.out.trim().split('\n').slice(-1)[0]);

  mutate((j) => j.grandfathered.splice(j.grandfathered.indexOf(SHRINKABLE), 1));
  git(['add', LEDGER_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('3 正向例(ii)：合法删条目 → 门禁 exit 0', r.status, 0, r.out.trim().split('\n').slice(-1)[0]);
  expectContains('3 正向例(ii)：报告回显「已减 1 条」', r.out, '已减 1 条');
  const gen = runTool(GEN, ['--root', FIX, '--check']);
  expect('3 正向例(ii)：生成器 --check 也 exit 0（只允许缩小）', gen.status, 0);

  // ---- 3b. 条数不变但集合不相等（+1 手工、-1 合法）→ 仍须 exit 1 ----
  mutate((j) => j.grandfathered.push(LAUNDERED));
  git(['add', LEDGER_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('3b 条数不变（+1/-1 抵消）→ 门禁仍 exit 1', r.status, 1);
  expectContains('3b 报的是集合差异而非条数', r.out, `相对基线新增 1 条`);

  // ---- 4. 首次引入：HEAD 里没有该台账（索引里有）→ exit 0 + 一次性初始化语义 ----
  git(['reset', '-q', '--hard', 'HEAD']);
  git(['rm', '-q', '--cached', LEDGER_REL]);
  git(['commit', '-q', '-m', 'fixture: HEAD without the ledger (first-introduction state)']);
  git(['add', LEDGER_REL]); // 索引里有、HEAD 里没有、工作区也有
  r = runTool(GATE, ['--root', FIX]);
  expect('4 首次引入：门禁 exit 0（不许红）', r.status, 0, r.out.trim().split('\n').slice(-1)[0]);
  expectContains('4 首次引入：回显一次性初始化语义', r.out, '首次引入');
  expectContains('4 首次引入：说明基线由本次提交建立', r.out, '基线由本次提交建立');
  const genFirst = runTool(GEN, ['--root', FIX, '--check']);
  expect('4 首次引入：生成器 --check exit 0', genFirst.status, 0);
  expectContains('4 首次引入：生成器回显基线来源', genFirst.out, '棘轮基线 = 索引版台账');

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
