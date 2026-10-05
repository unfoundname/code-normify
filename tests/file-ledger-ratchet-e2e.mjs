#!/usr/bin/env node
/**
 * tests/file-ledger-ratchet-e2e.mjs
 * 全仓文件台账端到端验证（schema_version 2）：四态词汇、独立豁免清单、accounted 依据、棘轮、
 * 以及「豁免清单 × 真 .gitignore 交叉校验」的退出码断言。
 * ---------------------------------------------------------------------------
 * 为什么要有它：文档与 --help 只能描述意图，**退出码**才能证明门禁真的拦得住。本用例逐条钉住：
 *   1. 干净态：门禁 exit 0（基线 = HEAD 版台账）、生成器 --check exit 0、写盘模式幂等（未改动文件）；
 *   1b. 版本不匹配：台账退回 `schema_version: 1` → 门禁与生成器 `--check` 都 **exit 1**（有意的：
 *      台账数据、门禁、生成器、豁免清单必须**同一次提交**一起改，不许只升一半版本）；
 *   2. 负例(i)：accounted 条目**缺 basis** → 门禁 **exit 1**（报 accounted-entry-invalid）；
 *   3. 负例(ii)：新增一个**无归属且未豁免的已提交文件** → 门禁 **exit 1**（报 unowned-file），
 *      且生成器**不**把它写进 accounted（棘轮的牙齿：跑一次 ledger:gen 洗不白）；
 *   4. 负例(iii)：豁免清单里写一条 `**` → 门禁 **exit 1**（报 exempt-too-broad-no-literal，回归）；
 *   5. 负例(iv)：手工把一条**在索引里**的路径写进 accounted + `git add` → 门禁 **exit 1**
 *      （报 accounted-added-vs-head），生成器 --check 也 **exit 1**；
 *   6. 真实事故复现：`.gitignore` 里的 `*review*.md`（本仓 examples/bilibili-pi-full/.gitignore:18 真实规则）
 *      在 core.ignoreCase=true 下命中 preview 系文件 → 门禁 **exit 1**，同时报出
 *      ① 交集（豁免清单放行的路径被真 .gitignore 覆盖）与 ② 大小写折叠误伤；
 *   7. 正向例：合法**删掉**一条已可移除（已命中豁免）的 accounted 条目 + `git add` → **exit 0**（只减不增）；
 *   8. 首次引入：HEAD 里没有该台账（索引里有）→ **exit 0** 并回显「基线由本次提交建立」；
 *   9. 新增已跟踪文件的**两条合法路 vs 走不通的路**（诚实性修复的负例）：把它加进 accounted（旧指引）
 *      → 门禁 **exit 1**（accounted-added-vs-head）、生成器 `--check` **exit 1**、生成器**写盘模式**
 *      **exit 1 + 点名 + 拒绝写盘**（修复前是「静默剔除 + exit 0」）；标签「索引版 ∪ 工作区版」都拦；
 *      改成豁免清单里一条带 reason 的模式（新指引）→ 门禁与生成器都 **exit 0**。
 *
 * 夹具：把本仓库索引里的全部已跟踪文件用 `git checkout-index -a --prefix=<tmp>/` 物化到系统 temp，
 * 在夹具里 `git init` + 一次提交（台账与豁免清单随第一次提交进入 HEAD，基线由此建立）。
 * 夹具的 meta.tracked_total / meta.universe_hash 由本脚本按夹具自己的索引清单现算（夹具宇宙 == 本仓库宇宙，
 * 因为物化的是同一份清单）；夹具台账只写最小必需字段，避免测试依赖台账里那 19 条真实豁免。
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
const EXEMPT_REL = 'ledger/exempt.gitignore';

/** 负例(ii) 用的路径：不在任何豁免模式里（src/ 不在夹具豁免清单内），提交后必须被报成 unowned。 */
const UNOWNED_PROBE = 'src/ledger-e2e-unowned.ts';
/** 手工洗白用的路径：必须在**索引里**、且**不在夹具基线的 accounted 里**。 */
const LAUNDERED = 'examples/bilibili-trial/normify-data/modules/main.md';
/** 合法缩小用的路径：先给它一条精确豁免（使条目「可移除」），再把它从 accounted 里删掉。 */
const SHRINKABLE = 'src/workspace.ts';
/** 真实事故复现：`*review*.md` 命中 preview 系文件。
 *  两个探针放在**仓库根**（模式 `*review*.md` 按本清单语义不跨 `/`，根级才命中；`.gitignore` 里
 *  无斜杠的规则则是「任意层级按 basename 匹配」，真实事故现场就是这样一条规则）。
 *  取名必须让两个探针是**不同路径**：Windows 文件系统大小写不敏感，`preview.md` 与 `PREVIEW.md`
 *  同目录下是同一个文件（core.ignoreCase=true 下 git 也视作同一路径），测不出「只有折叠才命中」。 */
const ACCIDENT_LOWER = 'preview.md';
const ACCIDENT_UPPER = 'PREVIEW-artifact.md';
const ACCIDENT_PATTERN = '*review*.md';

const ROOT = path.join(os.tmpdir(), `code-normify-ledger-v2-${process.pid}`);
const FIX = path.join(ROOT, 'fixture');
const ledgerAbs = path.join(FIX, LEDGER_REL);
const exemptAbs = path.join(FIX, EXEMPT_REL);
/** 夹具基线提交的 sha：每个用例结束后都回到它，避免上一用例的临时提交污染下一用例。 */
let BASELINE_SHA = null;

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
const readExempt = () => fs.readFileSync(exemptAbs, 'utf8');
const writeExempt = (text) => fs.writeFileSync(exemptAbs, text, 'utf8');
const mutateLedger = (fn) => {
  const j = readLedger();
  fn(j);
  writeLedger(j);
};
const mutateExempt = (fn) => writeExempt(fn(readExempt()));
const writeFileInFix = (rel, text) => {
  const abs = path.join(FIX, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, 'utf8');
};

/** 夹具豁免清单（最小必需：一条 examples/** 模式；命中率过半 → 必须 broad_confirmed=true）。 */
function fixtureExemptText() {
  return [
    '# e2e 夹具豁免清单（tests/file-ledger-ratchet-e2e.mjs 生成）',
    '# 语法：<pattern> ## reason=<非空理由> [ ## since=YYYY-MM-DD ] [ ## broad_confirmed=true|false ]',
    'examples/** ## reason=夹具：示例目录整体豁免（与真台账同一条模式；命中率 89% 过半，故人工确认） ## since=2026-10-05 ## broad_confirmed=true',
    '',
  ].join('\n');
}

/** 夹具的台账：最小合法 v2 结构，meta 由夹具自己的索引清单现算（门禁的 tracked-mismatch 必须绿）。 */
function writeFixtureLedger(tracked) {
  const universeHash = crypto.createHash('sha256').update(`${tracked.join('\n')}\n`, 'utf8').digest('hex');
  const exempt = (rel) => rel === 'examples' || rel.startsWith('examples/');
  // 其余已跟踪文件全部进 accounted —— 夹具的「干净态」必须真的 0 error，否则断言没有意义。
  writeLedger({
    schema_version: 2,
    meta: {
      generated_at: '2026-10-05',
      generator: 'scripts/generate-file-ledger.cjs',
      gate: 'scripts/check-file-ledger.cjs',
      exempt_file: EXEMPT_REL,
      // 门禁的结构校验要求这几个字段必填（generated_at / universe / tracked_total / universe_hash / coverage_basis）。
      universe: 'git ls-files（夹具宇宙 = 物化出来的本仓库已跟踪清单）；绿灯依据 = 台账里有条目。',
      tracked_total: tracked.length,
      universe_hash: universeHash,
      coverage_basis: '夹具：owned 只算被模块 source.path 精确声明且真实存在的已跟踪普通文件；planned 不计入。',
      accounted_basis: '夹具：accounted 每条带 accounted_at + basis，只减不增（与 HEAD 版台账比集合包含）。',
      known_divergences: ['夹具：本文件由 tests/file-ledger-ratchet-e2e.mjs 生成，只为验证四态与棘轮判据的退出码。'],
    },
    accounted: tracked
      .filter((rel) => !exempt(rel))
      .map((rel) => ({
        path: rel,
        accounted_at: '2026-10-05',
        basis: '夹具：本会话之前的既有文件，尚未分配归属（e2e 夹具记账，不代表真实仓库）',
      })),
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
  // 大小写折叠语义必须显式（本仓库真实设置就是 true）：真实事故正是在这个前提下发生的。
  git(['config', 'core.ignoreCase', 'true']);
  // 先 git add，再问 ls-files：夹具宇宙必须等于物化出来的文件清单（否则台账 tracked_total 对不上）。
  git(['add', '-A']);
  const tracked = git(['ls-files']).stdout.split('\n').filter(Boolean).sort();
  writeFixtureLedger(tracked);
  writeExempt(fixtureExemptText());
  git(['add', LEDGER_REL, EXEMPT_REL]);
  git(['commit', '-q', '-m', 'fixture baseline: ledger v2 + exempt list committed (ratchet baseline established)']);
  BASELINE_SHA = git(['rev-parse', 'HEAD']).stdout.trim();
  return tracked;
}

/** 把夹具恢复到**基线提交**的干净态（后续用例里的提交不算数：它们只是临时扰动）。 */
function resetFixture() {
  git(['reset', '-q', '--hard', BASELINE_SHA]);
  git(['clean', '-fdq']);
}

function main() {
  console.log('file-ledger-ratchet-e2e：schema_version 2（四态 / 独立豁免清单 / accounted 依据 / 棘轮 / .gitignore 交叉校验）');
  let tracked;
  try {
    tracked = prepareFixture();
  } catch (err) {
    console.error(`夹具准备失败：${err.message}`);
    process.exitCode = 2;
    return;
  }
  console.log(`夹具：${FIX}（${tracked.length} 个已跟踪文件 · HEAD 含台账与豁免清单）`);

  // ---- 1. 干净态 + 幂等 ----
  let r = runTool(GATE, ['--root', FIX]);
  expect('1 干净态：门禁 exit 0', r.status, 0, r.out.trim().split('\n').slice(-1)[0]);
  expectContains('1 干净态：回显绿灯依据', r.out, '绿灯依据 = 台账里有条目');
  expectContains('1 干净态：明确否掉「在 HEAD 里即绿」', r.out, '「在 HEAD 里」不是绿灯理由');
  expectContains('1 干净态：基线 = HEAD 版台账', r.out, 'accounted 棘轮: 基线 = HEAD 版台账');
  expectContains('1 干净态：交叉校验全 0', r.out, '与真 .gitignore 交集 0 · 大小写折叠误伤 0 · 放行了本该 git add 的普通文件 0');
  expectContains('1 干净态：大小写语义显式回显', r.out, '大小写语义 core.ignoreCase=true');
  let gen = runTool(GEN, ['--root', FIX, '--check']);
  expect('1 干净态：生成器 --check exit 0', gen.status, 0, gen.out.trim().split('\n').slice(-1)[0]);
  gen = runTool(GEN, ['--root', FIX]);
  expect('1 干净态：写盘模式幂等（未改动文件）', gen.status, 0);
  expectContains('1 干净态：写盘模式报告未改动', gen.out, '未改动文件');
  expect('1 干净态：幂等后工作区干净', git(['status', '--porcelain']).stdout.trim(), '');

  // ---- 1b. 版本不匹配 → 门禁与生成器都直接 error（有意的：数据/门禁/生成器/豁免清单必须同一次提交一起改） ----
  mutateLedger((j) => {
    j.schema_version = 1; // 模拟「只升一半版本」：数据文件退回 v1，而门禁与生成器都要求 v2
  });
  git(['add', LEDGER_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('1b 版本不匹配：门禁 exit 1', r.status, 1);
  expectContains('1b 版本不匹配：报 schema_version 必须是 2', r.out, 'schema_version 必须是 2');
  gen = runTool(GEN, ['--root', FIX, '--check']);
  expect('1b 版本不匹配：生成器 --check 也 exit 1（比较基准不可信）', gen.status, 1);
  resetFixture();

  // ---- 2. 负例(i)：accounted 条目缺 basis → exit 1 ----
  mutateLedger((j) => {
    delete j.accounted[0].basis;
  });
  git(['add', LEDGER_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('2 负例(i)：accounted 缺 basis → 门禁 exit 1', r.status, 1);
  expectContains('2 负例(i)：报 accounted-entry-invalid', r.out, '[accounted-entry-invalid]');
  expectContains('2 负例(i)：点名缺的字段', r.out, 'accounted[0].basis 必填且必须是非空字符串');
  gen = runTool(GEN, ['--root', FIX, '--check']);
  expect('2 负例(i)：生成器同样 fail-closed（exit 1）', gen.status, 1);
  expectContains('2 负例(i)：生成器说明缺依据不是记账', gen.out, '没有依据的条目不是记账，是洗白');
  resetFixture();

  // ---- 3. 负例(ii)：新增无归属且未豁免的已提交文件 → exit 1，且生成器不追认 ----
  writeFileInFix(UNOWNED_PROBE, '// e2e 负例(ii)：无归属、未豁免的已提交文件（临时夹具，跑完随夹具删除）\n');
  git(['add', UNOWNED_PROBE]);
  git(['commit', '-q', '-m', 'fixture: add an unowned, unexempted file']);
  gen = runTool(GEN, ['--root', FIX]);
  expect('3 负例(ii)：生成器重算成功（exit 0）', gen.status, 0, gen.out.trim().split('\n').slice(-1)[0]);
  expect(
    '3 负例(ii)：生成器**没有**把新文件写进 accounted（棘轮的牙齿）',
    readLedger().accounted.some((e) => e.path === UNOWNED_PROBE),
    false,
  );
  git(['add', LEDGER_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('3 负例(ii)：已提交但无条目 → 门禁 exit 1', r.status, 1);
  expectContains('3 负例(ii)：报 unowned-file', r.out, '[unowned-file]');
  expectContains('3 负例(ii)：逐条点名该文件', r.out, `已跟踪文件在台账里查不到条目（既无模块归属、也不命中豁免、也不在 accounted 清单）：${UNOWNED_PROBE}`);
  expectContains('3 负例(ii)：指出「在 HEAD 里」不是条目', r.out, '「它已经在 HEAD / 已在 git 索引里」不是条目');
  resetFixture();

  // ---- 4. 负例(iii)：豁免清单里写一条 `**` → exit 1（回归：一条模式就能关掉整个门禁） ----
  mutateExempt((text) => `${text}** ## reason=e2e 负例(iii)：一条过宽模式\n`);
  git(['add', EXEMPT_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('4 负例(iii)：`**` 豁免 → 门禁 exit 1', r.status, 1);
  expectContains('4 负例(iii)：报 exempt-too-broad-no-literal', r.out, '[exempt-too-broad-no-literal]');
  expectContains('4 负例(iii)：说明该模式不参与匹配', r.out, '被判过宽的模式不参与匹配');
  resetFixture();

  // ---- 4b. 豁免条目缺 reason → exit 1（豁免必须写明理由，缺理由等于静默放宽门禁） ----
  mutateExempt((text) => `${text}**/ledger-e2e-nomatch.md\n`);
  git(['add', EXEMPT_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('4b 缺 reason：门禁 exit 1', r.status, 1);
  expectContains('4b 缺 reason：报 exempt-entry-invalid', r.out, '[exempt-entry-invalid]');
  expectContains('4b 缺 reason：点明必须写明理由', r.out, '每条豁免必须写明理由');
  gen = runTool(GEN, ['--root', FIX, '--check']);
  expect('4b 缺 reason：生成器也 fail-closed（exit 1）', gen.status, 1);
  resetFixture();

  // ---- 5. 负例(iv)：手工洗白（把一条在索引里的路径写进 accounted + git add）→ exit 1 ----
  mutateLedger((j) =>
    j.accounted.push({
      path: LAUNDERED,
      accounted_at: '2026-10-05',
      basis: 'e2e 负例(iv)：手工洗白——这条路径在索引里，但 HEAD 版台账里没有它',
    }),
  );
  git(['add', LEDGER_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('5 负例(iv)：门禁 exit 1', r.status, 1);
  expectContains('5 负例(iv)：报 accounted-added-vs-head', r.out, '[accounted-added-vs-head]');
  expectContains('5 负例(iv)：点名被加进来的路径', r.out, `accounted 新增条目（HEAD 版台账里没有它）：${LAUNDERED}`);
  expectContains('5 负例(iv)：明确否掉「在 HEAD 里即绿」', r.out, '不是绿灯理由');
  gen = runTool(GEN, ['--root', FIX, '--check']);
  expect('5 负例(iv)：生成器 --check 也 exit 1', gen.status, 1);
  expectContains('5 负例(iv)：生成器点名新增条目', gen.out, `+ ${LAUNDERED}`);
  expectContains('5 负例(iv)：比较基准是索引 blob', gen.out, '比较基准 = git 索引 blob');
  // 条数不变但集合不相等（手工 +1 与合法 -1 抵消）→ 仍须 exit 1（判据是集合包含，不是条数）
  mutateLedger((j) => j.accounted.splice(j.accounted.findIndex((e) => e.path === SHRINKABLE), 1));
  git(['add', LEDGER_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('5b 条数不变（+1/-1 抵消）→ 门禁仍 exit 1', r.status, 1);
  expectContains('5b 报的是集合差异而非条数', r.out, '相对基线新增 1 条');
  resetFixture();

  // ---- 6. 真实事故复现：`*review*.md` 在 core.ignoreCase=true 下命中 preview 系文件 ----
  // 现场（本仓 examples/bilibili-pi-full/.gitignore:18）就是这样一条规则，误伤了 modules/ 下的 preview 文件。
  // 这里只 `git add` 不提交：探针进了索引就算「已跟踪」，.gitignore 规则读的是工作区那份（check-ignore 语义），
  // 用例跑完 resetFixture() 即可完全复原，不把扰动留给后面的用例。
  writeFileInFix(ACCIDENT_LOWER, '# e2e 事故复现：preview 含子串 review，被 *review*.md 命中\n');
  writeFileInFix(ACCIDENT_UPPER, '# e2e 事故复现：只有大小写折叠才命中（PREVIEW vs review）\n');
  git(['add', '-f', ACCIDENT_LOWER, ACCIDENT_UPPER]); // 先入库，规则后加（真实事故现场就是这个顺序）
  mutateExempt((text) => `${text}${ACCIDENT_PATTERN} ## reason=e2e 事故复现：本想忽略审阅稿，却命中了 preview 系文件\n`);
  fs.appendFileSync(path.join(FIX, '.gitignore'), `\n# e2e 事故复现：这条规则在 core.ignoreCase=true 下命中 preview 系文件\n${ACCIDENT_PATTERN}\n`, 'utf8');
  git(['add', EXEMPT_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('6 事故复现：门禁 exit 1', r.status, 1);
  expectContains('6 事故复现：报交集（豁免放行的路径被真 .gitignore 覆盖）', r.out, '[exempt-gitignore-intersection]');
  expectContains('6 事故复现：点名被忽略规则覆盖的路径', r.out, `豁免清单放行的路径同时被真 .gitignore 覆盖：${ACCIDENT_LOWER}`);
  expectContains('6 事故复现：报大小写折叠误伤', r.out, '[exempt-case-fold-overmatch]');
  expectContains('6 事故复现：点名只有折叠才命中的路径', r.out, `豁免模式只靠大小写折叠才命中：${ACCIDENT_PATTERN}`);
  expectContains('6 事故复现：报告回显折叠语义来自 core.ignoreCase', r.out, 'core.ignoreCase=true，大小写敏感时它并不命中');
  expectContains('6 事故复现：报告把三类不一致分开计数', r.out, '大小写折叠误伤 1 · 放行了本该 git add 的普通文件 0');
  // 精确计数用 --json（人读报告里的交集数还包含夹具里其它被同一条规则命中的真实文件）：
  const accidentJson = JSON.parse(runTool(GATE, ['--root', FIX, '--json']).out);
  const cross = accidentJson.summary.exempt.gitignoreCrossCheck;
  expectContains('6 事故复现：JSON 里也有该类违规', JSON.stringify(accidentJson), '"exempt-gitignore-cross-check"');
  expect(
    '6 事故复现：交集至少含两个探针（子串误伤 + 折叠误伤）',
    [ACCIDENT_LOWER, ACCIDENT_UPPER].every((p) => cross.gitignoreCovered.some((x) => x.path === p)),
    true,
    `实际交集 = ${JSON.stringify(cross.gitignoreCovered.map((x) => x.path))}`,
  );
  expect(
    '6 事故复现：折叠误伤只报 PREVIEW-artifact.md（大小写敏感时并不命中）',
    cross.caseFoldOnly.map((x) => x.path).join(','),
    ACCIDENT_UPPER,
  );
  expect('6 事故复现：折叠语义显式取自 core.ignoreCase', cross.ignoreCase, 'true');
  resetFixture();

  // ---- 7. 正向例：合法缩小（先让条目可移除，再删掉它）+ git add → exit 0 ----
  mutateExempt((text) => `${text}${SHRINKABLE} ## reason=e2e：让这条 accounted 条目变成「可移除」，使合法缩小可测\n`);
  git(['add', EXEMPT_REL]);
  git(['commit', '-q', '-m', 'fixture: exempt the shrinkable path (makes its accounted entry removable)']);
  r = runTool(GATE, ['--root', FIX]);
  expect('7 前置：豁免生效后门禁仍 exit 0', r.status, 0, r.out.trim().split('\n').slice(-1)[0]);
  expectContains('7 前置：回显该条目已可移除', r.out, '还可再减 1 条');
  mutateLedger((j) => j.accounted.splice(j.accounted.findIndex((e) => e.path === SHRINKABLE), 1));
  git(['add', LEDGER_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('7 正向例：合法删条目 → 门禁 exit 0', r.status, 0, r.out.trim().split('\n').slice(-1)[0]);
  expectContains('7 正向例：报告回显「已减 1 条」', r.out, '已减 1 条');
  gen = runTool(GEN, ['--root', FIX, '--check']);
  expect('7 正向例：生成器 --check 也 exit 0（只允许缩小）', gen.status, 0);
  expectNotContains('7 正向例：没有 error 级违规', r.out, '✖');

  // ---- 8. 首次引入：HEAD 里没有该台账（索引里有）→ exit 0 + 一次性初始化语义 ----
  resetFixture();
  git(['rm', '-q', '--cached', LEDGER_REL]);
  git(['commit', '-q', '-m', 'fixture: HEAD without the ledger (first-introduction state)']);
  git(['add', LEDGER_REL]); // 索引里有、HEAD 里没有、工作区也有
  r = runTool(GATE, ['--root', FIX]);
  expect('8 首次引入：门禁 exit 0（不许红）', r.status, 0, r.out.trim().split('\n').slice(-1)[0]);
  expectContains('8 首次引入：回显一次性初始化语义', r.out, '首次引入');
  expectContains('8 首次引入：说明基线由本次提交建立', r.out, '基线由本次提交建立');
  gen = runTool(GEN, ['--root', FIX, '--check']);
  expect('8 首次引入：生成器 --check exit 0', gen.status, 0);
  expectContains('8 首次引入：生成器回显基线来源', gen.out, '棘轮基线 = 索引版台账');

  // ---- 9. 新增已跟踪文件的两条合法路 vs 「加进 accounted」这条走不通的路（诚实性修复的负例） ----
  // 旧指引（把新文件加进 accounted 转绿）必须红，且要红在**三处**：门禁 accounted-added-vs-head、
  // 生成器 --check、生成器**写盘模式**（拒绝写盘 + 点名，不再静默自愈）；新指引（豁免清单加一条带 reason
  // 的模式 / 模块 source.path 声明）必须绿。两个方向都断言，缺一个就证明不了「指引是对的」。
  writeFileInFix(UNOWNED_PROBE, '// e2e 第 9 组：新增的已跟踪文件（两条合法路 vs 走不通的路）\n');
  git(['add', UNOWNED_PROBE]);
  git(['commit', '-q', '-m', 'fixture: add a tracked file for the guidance assertions']);
  gen = runTool(GEN, ['--root', FIX]); // 先刷新 meta（生成器不会把这条路径写进 accounted）
  expect('9 前置：生成器重算 exit 0', gen.status, 0, gen.out.trim().split('\n')[0]);
  git(['add', LEDGER_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('9 前置：新文件无条目 → 门禁 exit 1', r.status, 1);
  expectContains('9 前置：报 unowned-file 并点名', r.out, `已跟踪文件在台账里查不到条目（既无模块归属、也不命中豁免、也不在 accounted 清单）：${UNOWNED_PROBE}`);
  expectContains('9 指引：门禁 hint 写明新增文件只有两条路', r.out, '新增文件只有这两条路');
  expectContains('9 指引：门禁 hint 否掉「加进 accounted」', r.out, 'accounted 是存量正账');

  // 9a 旧指引：手工把它加进 accounted（并且 git add）→ 门禁红、--check 红、写盘模式**拒绝写盘**
  mutateLedger((j) =>
    j.accounted.push({
      path: UNOWNED_PROBE,
      accounted_at: '2026-10-05',
      basis: 'e2e 第 9 组：旧指引（把新增文件加进 accounted）——这条路走不通，必须被拦',
    }),
  );
  git(['add', LEDGER_REL]);
  const ledgerBeforeRefusal = fs.readFileSync(ledgerAbs, 'utf8');
  r = runTool(GATE, ['--root', FIX]);
  expect('9a 旧指引：门禁 exit 1', r.status, 1);
  expectContains('9a 旧指引：报 accounted-added-vs-head', r.out, '[accounted-added-vs-head]');
  expectContains('9a 旧指引：逐条点名被加进来的路径', r.out, `accounted 新增条目（HEAD 版台账里没有它）：${UNOWNED_PROBE}`);
  gen = runTool(GEN, ['--root', FIX, '--check']);
  expect('9a 旧指引：生成器 --check exit 1', gen.status, 1);
  gen = runTool(GEN, ['--root', FIX]); // 写盘模式：修复前是「静默剔除 + exit 0」，必须变成点名 + exit 1
  expect('9a 旧指引：生成器**写盘模式** exit 1（不再静默自愈）', gen.status, 1);
  expectContains('9a 旧指引：写盘模式点名该条目', gen.out, `+ ${UNOWNED_PROBE}`);
  expectContains('9a 旧指引：写盘模式说明拒绝写盘', gen.out, '**拒绝写盘**');
  expectContains('9a 旧指引：写盘模式说明危害（静默自愈会把洗白固化）', gen.out, '静默自愈会把洗白固化');
  expectContains('9a 旧指引：给出两条合法修法', gen.out, '合法修法只有两条');
  expect(
    '9a 旧指引：台账文件**未被改写**（拒绝写盘，条目还在）',
    fs.readFileSync(ledgerAbs, 'utf8') === ledgerBeforeRefusal,
    true,
  );

  // 9a-2 只改工作区（不 git add）同样要拦：判定用「索引版 ∪ 工作区版」的并集，只看一份会漏
  git(['reset', '-q', LEDGER_REL]);
  gen = runTool(GEN, ['--root', FIX]);
  expect('9a-2 仅工作区：生成器写盘模式仍 exit 1', gen.status, 1);
  expectContains('9a-2 仅工作区：仍然点名该条目', gen.out, `+ ${UNOWNED_PROBE}`);
  expect(
    '9a-2 仅工作区：台账文件仍未改写',
    fs.readFileSync(ledgerAbs, 'utf8') === ledgerBeforeRefusal,
    true,
  );

  // 9b 新指引：把条目删掉，改成在独立豁免清单里加一条**带 reason** 的模式 → 门禁与生成器都绿
  mutateLedger((j) => {
    j.accounted = j.accounted.filter((e) => e.path !== UNOWNED_PROBE);
  });
  mutateExempt((text) => `${text}${UNOWNED_PROBE} ## reason=e2e 第 9 组：新增已跟踪文件的合法通道（owned 或 exempt）\n`);
  git(['add', LEDGER_REL, EXEMPT_REL]);
  r = runTool(GATE, ['--root', FIX]);
  expect('9b 新指引：豁免一条带 reason 的模式 → 门禁 exit 0', r.status, 0, r.out.trim().split('\n').slice(-1)[0]);
  expectNotContains('9b 新指引：不再有 error 级违规', r.out, '✖');
  gen = runTool(GEN, ['--root', FIX, '--check']);
  expect('9b 新指引：生成器 --check exit 0', gen.status, 0);
  gen = runTool(GEN, ['--root', FIX]);
  expect('9b 新指引：生成器写盘模式 exit 0（不需要自愈）', gen.status, 0);
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
