#!/usr/bin/env node
/**
 * tests/reference-graph-e2e.mjs
 * 引用图端到端验证（增量 2 文件级 + 增量 3 符号级）：生成器的**幂等 / 确定性 / 索引基准 / 目标四态 /
 * 悬空边 / 符号级跨文件解析 / 版本 fail-closed** 退出码级断言。
 * ---------------------------------------------------------------------------
 * 为什么要有它：`ledger/references.json` 的可信度全在「它是不是当前索引算出来的那一份」与
 * 「它有没有如实标出悬空 / 未跟踪 / 被忽略 / 历史删除 / 解析不出来的符号」这几件事上。
 * 文档只能描述意图，断言才能钉住行为：
 *   1. 干净态：生成器 exit 0；`--check` exit 0；连跑两次产物**逐字节相同**（幂等）；
 *   2. 确定性：files 按 id 的 **UTF-8 字节序**升序、edges 按 (from.file,from.line,from.column,kind) 升序；
 *   3. 负例(i) 悬空模块说明符：`import './refgraph-missing.js'` → 边 status=dangling、to.state=missing **且不报绿**；
 *   4. 负例(ii) 未跟踪目标：目标在磁盘上、不在索引里 → status=untracked，目标登记为 untracked 节点（bytes=null）；
 *   5. 负例(iii) 被忽略目标：目标被 .gitignore 覆盖 → status=ignored，目标登记为 ignored 节点；
 *   6. 负例(iv) 历史删除目标：目标已在 git 历史里删除 → to.state=deleted；
 *   7. 负例(v) 死锚点：`#fragment` 落不到目标文件的真实标题 → anchor 边 status=dangling；活锚点 status=resolved；
 *   8. **读取基准 = git 索引**：只在工作区改一个被扫描文件（不 `git add`）→ 产物**逐字节不变**、`--check` 仍 exit 0；
 *   9. 索引清单变了而图没重跑 → `--check` **exit 1**（本批唯一新增的红线）；
 *  10. `--root` 的 fail-closed：指向非 git 目录 → exit 1，绝不回退到本仓库；
 *  11. 真仓库自证：`check:graph` exit 0，且图的 `universe_hash` / `tracked_total` 与台账一致（同一份索引，两种产物）；
 *  12. `graph-index-drift`（与 `check-file-ledger.cjs` 的 `ledger-index-drift` **对称**）：工作区那份图被写坏（不可解析）、
 *      合法但与索引不一致、索引里根本没有图文件 → 逐条点名 + **exit 1**；恢复一致 → exit 0 且降级状态 = `complete`。
 *      为什么必须有：判定基准是索引 blob，于是「工作区那份被写坏」在旧实现里完全看不见（索引对 ⇒ 照旧 exit 0）。
 *  13. **符号级（增量 3）**：`declarations` / `symbol_edges` 的 `export *` 穿透（三层再导出链必须落到最里层的真实声明）、
 *      同名声明**不合并**（夹具在两个文件里各造一个 `load`，并断言两条 import 边分别指向各自那个节点）、
 *      **无静默 null**（全局：`to.sym` 要么命中声明表、要么带原因码）、原因码与 `meta` 统计一致、
 *      Program 自证（仓库外文件 0、noLib + types 空 ⇒ 不拉 node_modules 类型）、排序确定性。
 *  14. **版本 fail-closed**：索引里的图 `schema_version` 与生成器不一致 → `--check` exit 1 且点名
 *      `graph-index-schema-version`；工作区那份是未知 / 更高版本 → 写盘模式**拒绝覆盖**（exit 1）。
 *  15. **根级仓库**（`--root` 指向的仓库把 `.ts` 直接放在仓库根）：符号级层必须同样**全 resolved**、
 *      未解析 = 0，且 `export *` 同样**穿透**到真实声明；同一套内容放在 `src/` 下的那一份是**对照**
 *      （证明红/绿只由「根分支」这一个变量决定）。为什么必须有这组：本仓 28 个符号面文件**全在
 *      `src/` 下**，第 13 组的探针也建在 `src/` 下，于是「仓库根自身」这条分支**从来没有门禁覆盖**——
 *      根级仓库里 `directoryExists(root)` 恒 false、`getDirectories(root)` 恒 []，符号级层整体退化成
 *      「全部 unresolved」，而**退出码仍是 0、零诊断**（静默降级），既有门禁全绿也照样漏。
 *
 * 夹具：把本仓库索引里的全部已跟踪文件用 `git checkout-index -a --prefix=<tmp>/` 物化到系统 temp，
 * 在夹具里 `git init` + 一次基线提交，再按用例造探针文件。**绝不在真仓库里造测试文件**，跑完删掉整个 temp 目录。
 * 符号级用例的探针都是**真源码**（能被 `ts.createProgram` 解析），不是文本假件：三层再导出链、
 * 两处同名 `load`、跨文件类型引用——它们验证的正是「单文件语法树做不到、必须靠类型检查器」的那几件事。
 *
 * 用法：node tests/reference-graph-e2e.mjs
 * 退出码：0 全部通过 / 1 有用例失败 / 2 夹具准备失败
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GEN = path.join(REPO, 'scripts', 'generate-reference-graph.cjs');
const GRAPH_REL = 'ledger/references.json';

const ROOT = path.join(os.tmpdir(), `code-normify-refgraph-${process.pid}`);
const FIX = path.join(ROOT, 'fixture');
const graphAbs = path.join(FIX, GRAPH_REL);

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

function sh(cmd, args, cwd, opts = {}) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
  if (r.status !== 0 && !opts.allowFail) {
    throw new Error(`${cmd} ${args.join(' ')} 失败（status=${r.status}，cwd=${cwd}）\n${r.stdout || ''}\n${r.stderr || ''}`);
  }
  return r;
}
const git = (args, opts) => sh('git', args, FIX, opts);
/** 跑生成器（脚本来自真仓库，被检查的仓库根用 --root 指向夹具）。 */
function runGen(args) {
  const r = spawnSync(process.execPath, [GEN, ...args], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
}
const writeInFix = (rel, text) => {
  const abs = path.join(FIX, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, text, 'utf8');
};
const readGraph = () => JSON.parse(fs.readFileSync(graphAbs, 'utf8'));
const sha256File = (abs) => crypto.createHash('sha256').update(fs.readFileSync(abs)).digest('hex');
const edgesOf = (graph, file) => graph.edges.filter((e) => e.from.file === file);
const findEdge = (graph, file, kind, specifier) =>
  graph.edges.find((e) => e.from.file === file && e.kind === kind && (!specifier || e.specifier === specifier));
const nodeOf = (graph, id) => graph.files.find((f) => f.id === id);

/** UTF-8 字节序（与生成器同一口径：不用 localeCompare）。 */
const utf8 = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));

function prepareFixture() {
  fs.rmSync(ROOT, { recursive: true, force: true });
  fs.mkdirSync(FIX, { recursive: true });
  const co = spawnSync('git', ['checkout-index', '-a', `--prefix=${FIX}/`], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (co.status !== 0) throw new Error(`git checkout-index 失败：${co.stdout}\n${co.stderr}`);
  git(['init', '-q', '-b', 'main']);
  git(['config', 'user.email', 'refgraph-e2e@example.invalid']);
  git(['config', 'user.name', 'refgraph-e2e']);
  git(['config', 'core.autocrlf', 'false']);
  // 基线提交：先给「历史删除」用例准备一条已删除路径（add → commit → rm → commit）。
  writeInFix('docs/refgraph-deleted.md', '# refgraph 已删除目标\n\n历史删除用例的目标文件。\n');
  git(['add', '-A']);
  git(['commit', '-q', '-m', 'fixture baseline']);
  git(['rm', '-q', 'docs/refgraph-deleted.md']);
  git(['commit', '-q', '-m', 'fixture: delete the refgraph target (history-deleted path)']);
  return git(['ls-files']).stdout.split('\n').filter(Boolean).length;
}

function writeProbes() {
  // (i) 悬空模块说明符：目标哪里都没有
  writeInFix('src/refgraph-probe.ts', "import { missing } from './refgraph-missing.js';\n\nexport const probe = missing;\n");
  // (ii) 未跟踪目标：磁盘上有、索引里没有
  writeInFix('src/refgraph-untracked-user.ts', "import './refgraph-untracked.js';\n");
  writeInFix('src/refgraph-untracked.js', '// 探针：在磁盘上但**不** git add（未跟踪目标）\n');
  // (iii) 被忽略目标：磁盘上有、被 .gitignore 覆盖
  writeInFix('ignored-dir/refgraph-ignored.md', '# 探针：被忽略的 Markdown\n');
  fs.appendFileSync(path.join(FIX, '.gitignore'), '\n# refgraph e2e：被忽略目标用例\nignored-dir/\n', 'utf8');
  // 链接 / 锚点探针
  writeInFix('docs/refgraph-target.md', '# refgraph 活锚点目标\n\n供活锚点用例使用的目标文件。\n');
  writeInFix(
    'docs/refgraph-links.md',
    [
      '# refgraph 链接探针',
      '',
      '存在且已跟踪的目标（活链接）：[spec](../README.md)',
      '',
      '同一个已跟踪目标的活锚点：[活锚点](./refgraph-target.md#refgraph-活锚点目标)',
      '',
      '死锚点：[死锚点](./refgraph-target.md#refgraph-绝对不存在的标题)',
      '',
      '未跟踪目标：[未跟踪](./refgraph-untracked-target.md)',
      '',
      '被忽略目标：[被忽略](../ignored-dir/refgraph-ignored.md)',
      '',
      '历史删除目标：[已删除](./refgraph-deleted.md)',
      '',
      '仓库外目标：[外部](https://example.invalid/x)',
      '',
    ].join('\n'),
  );
  writeInFix('docs/refgraph-untracked-target.md', '# 探针：在磁盘上但**不** git add（未跟踪目标）\n');
  // 符号级（增量 3）探针：三层 `export *` 再导出链 + 两个文件里的同名声明 + 各自的引用方。
  // 目的见文件头第 13 组：这两件事**单文件语法树做不到**，必须靠类型检查器。
  writeInFix('src/refgraph-barrel-c.ts', 'export const refgraphDeepSymbol = 1;\n\nexport interface RefgraphDeepType {\n  value: number;\n}\n');
  writeInFix('src/refgraph-barrel-b.ts', "export * from './refgraph-barrel-c.js';\n");
  writeInFix('src/refgraph-barrel-a.ts', "export * from './refgraph-barrel-b.js';\n");
  writeInFix(
    'src/refgraph-barrel-consumer.ts',
    "import { refgraphDeepSymbol } from './refgraph-barrel-a.js';\nimport type { RefgraphDeepType } from './refgraph-barrel-a.js';\n\nexport const refgraphConsumerValue: RefgraphDeepType = { value: refgraphDeepSymbol };\n",
  );
  // 同名声明不合并：给 store.ts / edit.ts **各追加一个** load（追加在文件末尾，不影响既有声明的位置）。
  fs.appendFileSync(path.join(FIX, 'src', 'engine', 'store.ts'), '\nexport function load(): number {\n  return 1;\n}\n', 'utf8');
  fs.appendFileSync(path.join(FIX, 'src', 'engine', 'edit.ts'), '\nexport function load(): number {\n  return 2;\n}\n', 'utf8');
  writeInFix(
    'src/refgraph-samename-consumer.ts',
    "import { load } from './engine/store.js';\nimport { load as loadEdit } from './engine/edit.js';\n\nexport const refgraphSameNameSum = load() + loadEdit();\n",
  );
  git([
    'add',
    'src/refgraph-probe.ts',
    'src/refgraph-untracked-user.ts',
    'docs/refgraph-links.md',
    'docs/refgraph-target.md',
    'src/refgraph-barrel-a.ts',
    'src/refgraph-barrel-b.ts',
    'src/refgraph-barrel-c.ts',
    'src/refgraph-barrel-consumer.ts',
    'src/refgraph-samename-consumer.ts',
    'src/engine/store.ts',
    'src/engine/edit.ts',
  ]);
  git(['add', '.gitignore']);
  // 两个「未跟踪」探针**刻意不 add**；ignored-dir/ 被 .gitignore 覆盖，也进不了索引。
}

function main() {
  console.log('reference-graph-e2e：文件级引用图（幂等 / 索引基准 / 四态 / 悬空边）');
  let trackedCount;
  try {
    trackedCount = prepareFixture();
  } catch (err) {
    console.error(`夹具准备失败：${err.message}`);
    process.exitCode = 2;
    return;
  }
  writeProbes();
  console.log(`夹具：${FIX}（基线已跟踪 ${trackedCount} 个文件 + 探针）`);

  // ---- 1. 生成 + 幂等 ----
  let r = runGen(['--root', FIX]);
  expect('1 生成：exit 0', r.status, 0, r.out.trim().split('\n')[0]);
  const firstSha = sha256File(graphAbs);
  r = runGen(['--root', FIX]);
  expect('1 幂等：连跑两次 exit 0', r.status, 0);
  expect('1 幂等：产物逐字节相同', sha256File(graphAbs), firstSha);
  expect('1 幂等：第二次报告「未改动文件」', r.out.includes('未改动文件'), true);
  // --check 比的是**索引 blob**：夹具物化进来的那一份图来自真仓库，与重算结果必然不同 → exit 1。
  r = runGen(['--root', FIX, '--check']);
  expect('1 --check：索引版图与重算不一致 → exit 1', r.status, 1);
  expect('1 --check：说明比较基准 = git 索引 blob', r.out.includes('比较基准 = git 索引 blob'), true);
  git(['add', GRAPH_REL]);
  r = runGen(['--root', FIX, '--check']);
  expect('1 --check：git add 后 exit 0', r.status, 0, r.out.trim().split('\n')[0]);

  const graph = readGraph();
  expect('1 产物：schema_version = 2（增量 3：新增 declarations / symbol_edges）', graph.schema_version, 2);
  expect('1 产物：universe = 夹具索引条数', graph.meta.tracked_total, git(['ls-files']).stdout.split('\n').filter(Boolean).length);
  expect('1 产物：产物里没有时间戳字段（幂等要求）', Object.prototype.hasOwnProperty.call(graph.meta, 'generated_at'), false);
  expect('1 产物：节点表覆盖全量已跟踪文件', nodeOf(graph, 'package.json') !== undefined && nodeOf(graph, 'src/index.ts') !== undefined, true);

  // ---- 2. 确定性排序 ----
  const ids = graph.files.map((f) => f.id);
  const sortedIds = [...ids].sort(utf8);
  expect('2 确定性：files 按 id 的 UTF-8 字节序升序', ids.join('\u0000') === sortedIds.join('\u0000'), true);
  const edgeKeys = graph.edges.map((e) => [e.from.file, e.from.line, e.from.column, e.kind]);
  const sortedEdges = [...graph.edges].sort((a, b) => {
    const f = utf8(a.from.file, b.from.file);
    if (f !== 0) return f;
    if (a.from.line !== b.from.line) return a.from.line - b.from.line;
    if (a.from.column !== b.from.column) return a.from.column - b.from.column;
    return utf8(a.kind, b.kind);
  });
  expect(
    '2 确定性：edges 按 (from.file,line,column,kind) 升序',
    graph.edges.map((e) => e.id).join('\u0000') === sortedEdges.map((e) => e.id).join('\u0000'),
    true,
    `前 3 条 = ${JSON.stringify(edgeKeys.slice(0, 3))}`,
  );

  // ---- 3. 悬空模块说明符 ----
  const dangling = findEdge(graph, 'src/refgraph-probe.ts', 'import', './refgraph-missing.js');
  expect('3 悬空说明符：边存在', dangling !== undefined, true);
  expect('3 悬空说明符：status = dangling', dangling && dangling.status, 'dangling');
  expect('3 悬空说明符：to.state = missing', dangling && dangling.to.state, 'missing');
  expect('3 悬空说明符：to.file 记下试过的候选', dangling && dangling.to.file, 'src/refgraph-missing.js');

  // ---- 4. 未跟踪目标 ----
  const untracked = findEdge(graph, 'src/refgraph-untracked-user.ts', 'import', './refgraph-untracked.js');
  expect('4 未跟踪：status = untracked', untracked && untracked.status, 'untracked');
  expect('4 未跟踪：目标登记为节点', nodeOf(graph, 'src/refgraph-untracked.js') !== undefined, true);
  expect('4 未跟踪：节点 state = untracked', nodeOf(graph, 'src/refgraph-untracked.js').state, 'untracked');
  expect('4 未跟踪：非索引节点 bytes = null', nodeOf(graph, 'src/refgraph-untracked.js').bytes, null);

  // ---- 5. 被忽略目标 ----
  const ignored = findEdge(graph, 'docs/refgraph-links.md', 'markdown-link', '../ignored-dir/refgraph-ignored.md');
  expect('5 被忽略：status = ignored', ignored && ignored.status, 'ignored');
  expect('5 被忽略：节点 state = ignored', nodeOf(graph, 'ignored-dir/refgraph-ignored.md').state, 'ignored');

  // ---- 6. 历史删除目标 ----
  const deleted = findEdge(graph, 'docs/refgraph-links.md', 'markdown-link', './refgraph-deleted.md');
  expect('6 历史删除：status = dangling', deleted && deleted.status, 'dangling');
  expect('6 历史删除：to.state = deleted', deleted && deleted.to.state, 'deleted');
  expect('6 历史删除：节点 state = deleted', nodeOf(graph, 'docs/refgraph-deleted.md').state, 'deleted');

  // ---- 7. 锚点 ----
  const deadAnchor = graph.edges.find((e) => e.kind === 'anchor' && e.from.file === 'docs/refgraph-links.md' && e.status === 'dangling');
  expect('7 死锚点：anchor 边 status = dangling', deadAnchor !== undefined, true, deadAnchor ? `fragment=${deadAnchor.fragment}` : '');
  const liveAnchor = graph.edges.find((e) => e.kind === 'anchor' && e.from.file === 'docs/refgraph-links.md' && e.status === 'resolved');
  expect('7 活锚点：anchor 边 status = resolved', liveAnchor !== undefined, true, liveAnchor ? `fragment=${liveAnchor.fragment}` : '');
  const untrackedLink = findEdge(graph, 'docs/refgraph-links.md', 'markdown-link', './refgraph-untracked-target.md');
  expect('7 未跟踪链接：status = untracked（链接与锚点分开记）', untrackedLink && untrackedLink.status, 'untracked');

  // ---- 8. 读取基准 = git 索引：只改工作区（不 git add）→ 产物不变 ----
  const probeAbs = path.join(FIX, 'src', 'refgraph-probe.ts');
  fs.writeFileSync(probeAbs, "import { missing } from './refgraph-other-missing.js';\n\nexport const probe = missing;\n", 'utf8');
  r = runGen(['--root', FIX, '--check']);
  expect('8 索引基准：只改工作区不改索引 → --check 仍 exit 0', r.status, 0);
  expect('8 索引基准：产物逐字节未变', sha256File(graphAbs), firstSha);
  const stillMissing = findEdge(readGraph(), 'src/refgraph-probe.ts', 'import', './refgraph-missing.js');
  expect('8 索引基准：图里仍是索引版内容（旧说明符）', stillMissing !== undefined, true);
  git(['add', 'src/refgraph-probe.ts']);

  // ---- 9. 索引清单变了而图没重跑 → --check exit 1 ----
  writeInFix('src/refgraph-new-file.ts', 'export const refgraphNewFile = 1;\n');
  git(['add', 'src/refgraph-new-file.ts']);
  r = runGen(['--root', FIX, '--check']);
  expect('9 索引漂移：--check exit 1', r.status, 1);
  expect('9 索引漂移：报告给出修法', r.out.includes('node scripts/generate-reference-graph.cjs'), true);
  const before = readGraph().meta.tracked_total;
  r = runGen(['--root', FIX]);
  expect('9 索引漂移：重跑后 exit 0', r.status, 0);
  expect('9 索引漂移：tracked_total 跟进', readGraph().meta.tracked_total, before + 1);
  git(['add', GRAPH_REL]);
  r = runGen(['--root', FIX, '--check']);
  expect('9 索引漂移：重跑 + git add 后 --check exit 0', r.status, 0);

  // ---- 10. --root fail-closed ----
  const notRepo = path.join(ROOT, 'not-a-repo');
  fs.mkdirSync(notRepo, { recursive: true });
  r = runGen(['--root', notRepo]);
  expect('10 fail-closed：非 git 目录 → exit 1', r.status, 1);
  expect('10 fail-closed：不回退到本仓库', r.out.includes('fail-closed') || r.out.includes('不是 git 仓库'), true, r.out.trim().split('\n')[0]);
  r = runGen(['--root', path.join(ROOT, 'does-not-exist')]);
  expect('10 fail-closed：不存在的目录 → exit 1', r.status, 1);

  // ---- 11. 真仓库自证：图的 universe_hash 与台账的一致（同一份索引，两种产物） ----
  const real = spawnSync(process.execPath, [GEN, '--root', REPO, '--check'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  expect('11 真仓库：check:graph exit 0（产物与索引一致）', real.status, 0, `${real.stdout || ''}${real.stderr || ''}`.trim().split('\n')[0]);
  const ledger = JSON.parse(fs.readFileSync(path.join(REPO, 'ledger', 'file-ledger.json'), 'utf8'));
  const realGraph = JSON.parse(fs.readFileSync(path.join(REPO, GRAPH_REL), 'utf8'));
  expect('11 真仓库：图的 universe_hash == 台账的 universe_hash', realGraph.meta.universe_hash, ledger.meta.universe_hash);
  expect('11 真仓库：图的 tracked_total == 台账的 tracked_total', realGraph.meta.tracked_total, ledger.meta.tracked_total);

  // ---- 12. graph-index-drift：索引里的图与工作区里的图必须是同一份事实 ----
  // 前置：第 9 组末尾已 git add，索引版 == 工作区版 == 重算结果（--check exit 0）。
  const goodGraph = fs.readFileSync(graphAbs, 'utf8');
  // (a) 工作区那份被**写坏**（不是合法 JSON）：索引里那份仍是对的 —— 旧实现在这里 exit 0（假绿）。
  fs.writeFileSync(graphAbs, '{ 这不是合法 JSON\n', 'utf8');
  r = runGen(['--root', FIX, '--check']);
  expect('12a 漂移：工作区图不可解析 → --check exit 1', r.status, 1, r.out.trim().split('\n')[0]);
  expect('12a 漂移：点名 graph-worktree-unparsable', r.out.includes('graph-worktree-unparsable'), true);
  expect('12a 漂移：红在漂移、不在索引（输出里没有「重算」行）', r.out.includes('重算：'), false);
  // (b) 坏图进索引 → 依旧 exit 1（两条红线都亮，不得因为「两边一样坏」而互相抵消）
  git(['add', GRAPH_REL]);
  r = runGen(['--root', FIX, '--check']);
  expect('12b 漂移：坏图 git add 后 → --check exit 1', r.status, 1);
  // (c) 工作区那份是**合法 JSON 但内容不同**：最能说明问题的负例（旧实现 exit 0）
  fs.writeFileSync(graphAbs, goodGraph, 'utf8');
  git(['add', GRAPH_REL]);
  fs.writeFileSync(graphAbs, `${JSON.stringify({ ...JSON.parse(goodGraph), drift_probe: 'worktree-only' }, null, 2)}\n`, 'utf8');
  r = runGen(['--root', FIX, '--check']);
  expect('12c 漂移：工作区图合法但与索引不一致 → --check exit 1', r.status, 1);
  expect('12c 漂移：点名 graph-worktree-vs-index', r.out.includes('graph-worktree-vs-index'), true);
  expect('12c 漂移：红在漂移、不在索引（输出里没有「重算」行）', r.out.includes('重算：'), false);
  // (d) 恢复一致 → 绿，且降级状态是 complete
  fs.writeFileSync(graphAbs, goodGraph, 'utf8');
  r = runGen(['--root', FIX, '--check']);
  expect('12d 漂移：恢复一致 → --check exit 0', r.status, 0, r.out.trim().split('\n')[0]);
  expect('12d 漂移：降级状态 = complete', r.out.includes('降级状态 = complete'), true);
  // (e) 索引里没有图文件、判定退回工作区副本 → 降级状态 = unknown，**不判绿**（exit 1）
  git(['rm', '--cached', '-q', GRAPH_REL]);
  r = runGen(['--root', FIX]); // 先按「索引里没有图」的新宇宙重算工作区那份，隔离出「基准」这一个变量
  expect('12e 降级：索引里没有图时写盘模式 exit 0', r.status, 0);
  r = runGen(['--root', FIX, '--check']);
  expect('12e 降级：索引里没有图 → --check exit 1（基准不可用不判绿）', r.status, 1);
  expect('12e 降级：点名 graph-not-in-index', r.out.includes('graph-not-in-index'), true);
  expect('12e 降级：降级状态 = unknown', r.out.includes('降级状态 = unknown'), true);
  git(['add', GRAPH_REL]);
  runGen(['--root', FIX]); // 宇宙回到含图的那一份，再重算一次
  git(['add', GRAPH_REL]);
  r = runGen(['--root', FIX, '--check']);
  expect('12e 降级：图放回索引后 → --check exit 0', r.status, 0);

  // ---- 13. 符号级层（增量 3）：export * 穿透 / 同名不合并 / 无静默 null / Program 自证 / 排序 ----
  const decls = graph.declarations;
  const symEdges = graph.symbol_edges;
  const meta13 = graph.meta.symbol_graph;
  expect('13 符号级：declarations 是非空数组', Array.isArray(decls) && decls.length > 0, true, `${decls.length} 条声明`);
  expect('13 符号级：symbol_edges 是非空数组', Array.isArray(symEdges) && symEdges.length > 0, true, `${symEdges.length} 条符号边`);
  expect(
    '13 符号级：边 kind 闭集（import / export-from / type-reference）',
    symEdges.every((e) => ['import', 'export-from', 'type-reference'].includes(e.kind)),
    true,
  );
  // 无静默 null：**本批最重要的一条**——每条边的 to.sym 要么命中声明表，要么带非空 reason。
  expect('13 无静默 null：没有「to.sym 为 null 且没有 reason」的边', symEdges.filter((e) => e.to.sym === null && !e.reason).length, 0);
  const declIdSet = new Set(decls.map((d) => d.id));
  expect('13 引用完整性：每条 to.sym 都能在 declarations 里查到', symEdges.filter((e) => e.to.sym !== null && !declIdSet.has(e.to.sym)).length, 0);
  expect('13 无静默 null：meta 自证 silent_null_edges = 0', meta13.silent_null_edges, 0);
  expect('13 原因码：边用到的 reason 与 meta.unresolved_reasons 完全一致', (() => {
    const inMeta = new Set(Object.keys(meta13.unresolved_reasons));
    const inEdges = new Set(symEdges.filter((e) => e.reason).map((e) => e.reason));
    return [...inEdges].every((reason) => inMeta.has(reason)) && [...inMeta].every((reason) => inEdges.has(reason));
  })(), true);
  expect('13 原因码：解析出来的边 reason 恒为 null', symEdges.filter((e) => e.to.sym !== null && e.reason !== null).length, 0);
  // Program 自证：只有扫描面里的 .ts，没把 node_modules / lib / examples 拉进来。
  expect('13 Program 自证：仓库外源文件数 = 0', meta13.program_outside_repo_files, 0);
  expect('13 Program 自证：Program 源文件数 = rootNames 数', meta13.program_source_files, meta13.root_names_total);
  expect(
    '13 Program 自证：noLib + types 空（不拉 node_modules 类型）',
    meta13.compiler_options.noLib === true && Array.isArray(meta13.compiler_options.types) && meta13.compiler_options.types.length === 0,
    true,
  );
  expect('13 Program 自证：node_modules_types = false', meta13.node_modules_types, false);
  expect('13 Program 自证：mode = typescript（不是降级）', meta13.mode, 'typescript');
  // (1) `export *` 穿透：三层再导出链必须落到**最里层**的真实声明，而不是停在链条入口。
  const deepImport = symEdges.find((e) => e.from.file === 'src/refgraph-barrel-consumer.ts' && e.kind === 'import');
  expect('13 export* 穿透：consumer 的 import 符号边存在', deepImport !== undefined, true);
  expect('13 export* 穿透：to.file = 真实声明所在的 barrel-c', deepImport && deepImport.to.file, 'src/refgraph-barrel-c.ts');
  expect('13 export* 穿透：to.sym 指向 barrel-c 的声明节点 id', deepImport && deepImport.to.sym, 'src/refgraph-barrel-c.ts#refgraphDeepSymbol@1:14');
  expect('13 export* 穿透：**没有**停在 barrel-a（链的入口）', deepImport && deepImport.to.file !== 'src/refgraph-barrel-a.ts', true);
  const deepType = symEdges.find((e) => e.from.file === 'src/refgraph-barrel-consumer.ts' && e.kind === 'type-reference');
  expect('13 export* 穿透（类型引用）：to.sym 指向 barrel-c 的接口', deepType && deepType.to.sym, 'src/refgraph-barrel-c.ts#RefgraphDeepType@3:18');
  expect('13 type-reference：type_only = true', deepType && deepType.type_only, true);
  expect('13 type-reference：跨文件标记 = true', deepType && deepType.cross_file, true);
  // 再导出链本身也要有边（`export *` 展开成逐个名字，不是一条「模块级」的糊弄边）。
  const starEdges = symEdges.filter((e) => e.from.file === 'src/refgraph-barrel-a.ts' && e.kind === 'export-from');
  expect('13 export* 展开：barrel-a 上按名字逐条产边', starEdges.length >= 2, true, `${starEdges.length} 条`);
  expect(
    '13 export* 展开：每条都穿透到 barrel-c 的声明',
    starEdges.length > 0 && starEdges.every((e) => e.to.file === 'src/refgraph-barrel-c.ts' && e.to.sym !== null),
    true,
  );
  // (2) 同名声明不合并：两个 load 必须是两个节点，且引用各自落到各自那个。
  const loadDecls = decls.filter((d) => d.name === 'load');
  expect('13 同名不合并：夹具里恰好两个 load 声明', loadDecls.length, 2, loadDecls.map((d) => d.id).join(' / '));
  expect('13 同名不合并：两个节点 id 不同', new Set(loadDecls.map((d) => d.id)).size, 2);
  expect('13 同名不合并：分别落在 store.ts 与 edit.ts', loadDecls.map((d) => d.file).sort().join(','), 'src/engine/edit.ts,src/engine/store.ts');
  const loadFromStore = symEdges.find((e) => e.from.file === 'src/refgraph-samename-consumer.ts' && e.specifier === './engine/store.js');
  const loadFromEdit = symEdges.find((e) => e.from.file === 'src/refgraph-samename-consumer.ts' && e.specifier === './engine/edit.js');
  expect('13 同名不合并：`./engine/store.js` 的 load → store.ts 那个节点', loadFromStore && loadFromStore.to.sym, loadDecls.find((d) => d.file === 'src/engine/store.ts').id);
  expect('13 同名不合并：`./engine/edit.js` 的 load → edit.ts 那个节点', loadFromEdit && loadFromEdit.to.sym, loadDecls.find((d) => d.file === 'src/engine/edit.ts').id);
  expect('13 同名不合并：两条边的目标不是同一个节点', loadFromStore && loadFromEdit && loadFromStore.to.sym !== loadFromEdit.to.sym, true);
  // 声明表自身的字段口径
  expect('13 声明节点：id 形如 <file>#<name>@<line>:<col>', decls.every((d) => d.id === `${d.file}#${d.name}@${d.line}:${d.column}`), true);
  expect('13 声明节点：scope 本批恒为 null（函数内声明属增量 4）', decls.every((d) => d.scope === null), true);
  expect('13 声明节点：origin 恒为 source', decls.every((d) => d.origin === 'source'), true);
  // 外部依赖必须**说清为什么**，不能只写个空 sym。
  const externalSym = symEdges.find((e) => e.status === 'external');
  expect('13 外部依赖：status = external 且 reason 非空', Boolean(externalSym && externalSym.reason), true, externalSym ? `${externalSym.specifier} → ${externalSym.reason}` : '');
  // (5) 确定性排序：与文件级同一口径（UTF-8 字节序，不用 localeCompare）。
  const declIds = decls.map((d) => d.id);
  expect('13 确定性：declarations 按 id 的 UTF-8 字节序升序', declIds.join('\u0000') === [...declIds].sort(utf8).join('\u0000'), true);
  const sortedSym = [...symEdges].sort((a, b) => {
    const f = utf8(a.from.file, b.from.file);
    if (f !== 0) return f;
    if (a.from.line !== b.from.line) return a.from.line - b.from.line;
    if (a.from.column !== b.from.column) return a.from.column - b.from.column;
    return utf8(a.kind, b.kind);
  });
  expect(
    '13 确定性：symbol_edges 按 (from.file,line,column,kind) 升序',
    symEdges.map((e) => e.id).join('\u0000') === sortedSym.map((e) => e.id).join('\u0000'),
    true,
  );
  // ---- 14. 版本 fail-closed：结构变了必须显式升版，不做静默兼容 ----
  const v2Text = fs.readFileSync(graphAbs, 'utf8');
  const v1Text = v2Text.replace('"schema_version": 2,', '"schema_version": 1,');
  expect('14 版本：能构造出一份 v1 标签的图（探针有效）', v1Text !== v2Text, true);
  fs.writeFileSync(graphAbs, v1Text, 'utf8');
  git(['add', GRAPH_REL]);
  r = runGen(['--root', FIX, '--check']);
  expect('14a 版本不匹配：索引版 schema_version = 1 → --check exit 1', r.status, 1, r.out.trim().split('\n')[0]);
  expect('14a 版本不匹配：点名 graph-index-schema-version', r.out.includes('graph-index-schema-version'), true);
  const v99Text = v2Text.replace('"schema_version": 2,', '"schema_version": 99,');
  fs.writeFileSync(graphAbs, v99Text, 'utf8');
  r = runGen(['--root', FIX]);
  expect('14b 未知版本：写盘模式拒绝覆盖 → exit 1', r.status, 1, r.out.trim().split('\n')[0]);
  expect('14b 未知版本：给出「拒绝写盘」的原因', r.out.includes('拒绝写盘'), true);
  fs.writeFileSync(graphAbs, v2Text, 'utf8');
  git(['add', GRAPH_REL]);
  r = runGen(['--root', FIX, '--check']);
  expect('14c 恢复 v2：--check exit 0', r.status, 0, r.out.trim().split('\n')[0]);

  // ---- 15. 根级仓库（`--root` 指向的仓库把 .ts 直接放在仓库根）：符号级层的静默降级红线 ----
  // 为什么单列一组：本仓 28 个符号面文件**全在 `src/` 下**，第 13 组的探针也建在 `src/` 下，于是
  // 「仓库根自身」这条分支从来没有门禁覆盖——根级仓库里 `directoryExists(root)` 恒 false、
  // `getDirectories(root)` 恒 []，符号级层整体退化成「全部 unresolved」，而**退出码仍是 0、零诊断**
  // （静默降级：门禁看不见，只能靠人肉比对）。本组把**同一套探针同时**建在两个夹具上：
  // `rootfix-root/`（.ts 直接在仓库根）与 `rootfix-src/`（.ts 在 src/ 下）——后者是**对照**，
  // 证明这批断言的红/绿只由「根分支」这一个变量决定，而不是夹具内容差异。
  const rootFixDir = path.join(ROOT, 'rootfix-root');
  const srcFixDir = path.join(ROOT, 'rootfix-src');
  const buildRootLevelFixture = (dir, underSrc) => {
    fs.rmSync(dir, { recursive: true, force: true });
    const at = (rel, text) => {
      const abs = path.join(dir, underSrc ? path.join('src', rel) : rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, text, 'utf8');
    };
    // 与最小复现同构：`export *` 再导出链 + 类型引用，三条符号边都必须落到 a.ts 的 `Alpha`。
    at('package.json', '{"name":"f","type":"module"}\n');
    at('a.ts', 'export interface Alpha { x: number }\n');
    at('b.ts', "export * from './a.js';\n");
    at('c.ts', "import type { Alpha } from './b.js';\nexport type Beta = Alpha;\n");
    const g = (args) => sh('git', args, dir);
    g(['init', '-q', '-b', 'main']);
    g(['config', 'user.email', 'refgraph-e2e@example.invalid']);
    g(['config', 'user.name', 'refgraph-e2e']);
    g(['config', 'core.autocrlf', 'false']);
    g(['add', '-A']);
    g(['commit', '-q', '-m', 'root-level fixture baseline']);
  };
  const readGraphAt = (dir) => JSON.parse(fs.readFileSync(path.join(dir, GRAPH_REL), 'utf8'));
  buildRootLevelFixture(rootFixDir, false);
  buildRootLevelFixture(srcFixDir, true);
  expect(
    '15 夹具自证：.ts 确实在夹具仓库根（不在 src/ 下）',
    fs.existsSync(path.join(rootFixDir, 'a.ts')) && !fs.existsSync(path.join(rootFixDir, 'src', 'a.ts')),
    true,
  );
  const rootRun = runGen(['--root', rootFixDir]);
  expect('15 根级：生成 exit 0', rootRun.status, 0, rootRun.out.trim().split('\n')[0]);
  const rootGraph = readGraphAt(rootFixDir);
  const rootSym = rootGraph.symbol_edges;
  expect('15 根级：符号边条数 = 3', rootSym.length, 3, rootSym.map((e) => e.id).join(' / '));
  // **本组的核心断言**：exit 0 + 零诊断**不等于**解析成功——静默降级必须在门禁里变红。
  expect(
    '15 静默降级护栏：未解析符号边 = 0（exit 0 且零诊断时同样不许有未解析）',
    rootSym.filter((e) => e.status === 'unresolved').length,
    0,
    `未解析原因 = ${JSON.stringify(rootGraph.meta.symbol_graph.unresolved_reasons)}`,
  );
  expect(
    '15 静默降级护栏：meta.edge_status 里没有 unresolved 计数',
    'unresolved' in rootGraph.meta.symbol_graph.edge_status,
    false,
    JSON.stringify(rootGraph.meta.symbol_graph.edge_status),
  );
  expect('15 静默降级护栏：未解析原因码表为空', Object.keys(rootGraph.meta.symbol_graph.unresolved_reasons).length, 0);
  const rootStar = rootSym.find((e) => e.from.file === 'b.ts' && e.kind === 'export-from');
  expect('15 根级 export* 穿透：to.file = a.ts（不许停在 b.ts）', rootStar && rootStar.to.file, 'a.ts');
  expect('15 根级 export* 穿透：to.sym = a.ts#Alpha@1:18', rootStar && rootStar.to.sym, 'a.ts#Alpha@1:18');
  const rootTypeRef = rootSym.find((e) => e.from.file === 'c.ts' && e.kind === 'type-reference');
  expect('15 根级：c.ts 的类型引用落到 a.ts 的真实声明', rootTypeRef && rootTypeRef.to.sym, 'a.ts#Alpha@1:18');
  const rootImport = rootSym.find((e) => e.from.file === 'c.ts' && e.kind === 'import');
  expect('15 根级：c.ts 的 import 边穿透 export* 落到 a.ts', rootImport && rootImport.to.sym, 'a.ts#Alpha@1:18');
  expect(
    '15 根级：Program 自证（3 个源文件 / 仓库外 0 个）',
    rootGraph.meta.symbol_graph.program_source_files === 3 && rootGraph.meta.symbol_graph.program_outside_repo_files === 0,
    true,
  );
  // 对照：同一套内容放在 `src/` 下。既要自证 resolved，也要与根级那份**逐条等价**（剥掉 `src/` 前缀后）。
  const srcRun = runGen(['--root', srcFixDir]);
  expect('15 对照（src/ 下）：生成 exit 0', srcRun.status, 0, srcRun.out.trim().split('\n')[0]);
  const srcSym = readGraphAt(srcFixDir).symbol_edges;
  expect('15 对照（src/ 下）：未解析符号边 = 0', srcSym.filter((e) => e.status === 'unresolved').length, 0);
  const normalizeSymEdge = (e) =>
    [
      e.from.file.replace(/^src\//, ''),
      e.kind,
      (e.to.file || '').replace(/^src\//, ''),
      e.to.sym === null ? '（空）' : e.to.sym.replace(/^src\//, ''),
    ].join('|');
  expect(
    '15 对照：根级与 src/ 级的符号边（剥掉 src/ 前缀后）逐条相同',
    rootSym.map(normalizeSymEdge).sort(utf8).join('\n'),
    srcSym.map(normalizeSymEdge).sort(utf8).join('\n'),
  );

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
