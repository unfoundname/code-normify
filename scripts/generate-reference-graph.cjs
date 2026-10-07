#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/generate-reference-graph.cjs
 * 引用图生成器 —— 产物 `ledger/references.json`，schema_version 2
 *   · 文件级层（增量 2）：节点 = 文件；边 = 「哪个文件的哪一行引用了哪个目标」；
 *   · 符号级层（增量 3）：节点 = 声明（顶层）；边 = 「谁引用了哪个声明」。
 * ---------------------------------------------------------------------------
 * 职责：把「哪个文件的哪一行引用了哪个目标」与「哪个名字指向哪个声明」变成**可逐字节比对**的机器事实。
 *   · `files`  —— 节点表（状态：indexed / ignored / untracked / deleted，四态与设计稿 §2.1 的 L0 一致）；
 *   · `edges`  —— 文件级边（kind ∈ import / export-from / require / dynamic-import / markdown-link /
 *                 package-field / ci-target / anchor）+ 位置 `文件:行:列` + 目标状态 + 解析结果；
 *   · `declarations` —— 声明节点表（顶层声明；`id` = `<file>#<name>@<line>:<col>`，见设计稿 §2.2）；
 *   · `symbol_edges` —— 符号级边（kind ∈ import / export-from / type-reference），
 *                 每条回答「谁引用了哪个声明」：`from{file,line,column,sym}` → `to{sym,file,line,column,state}`。
 *
 * **为什么文件级与符号级分成两组数组（与设计稿 §2.3「一条边表」的差异，如实记账）**：
 *   ① 文件级 `files` / `edges` 因此可以**逐字节保持增量 2 的形态**——`scripts/generate-change-log.cjs`
 *      的记录是「两份图快照之差」，它比的是 `edges[].id` 与 `status`；把符号级边混进同一张表会让
 *      **已落盘的历史记录**在重算时凭空多出一批新边（复核立刻红），而那不是历史事实变了，是本批扩了表；
 *   ② 两层的判定口径本来就不同（文件级 = 说明符解析，符号级 = 类型检查器），分开落盘才不会互相冒充。
 *   代价是同一个 import 语句在两处各有一条边（一条到文件、一条到声明），这是**刻意的冗余**：
 *   文件级边保证与 `check-references.cjs` 同源，符号级边保证回答「指向哪个声明」。
 *
 * **符号级层只用类型检查器能给出的答案**（设计稿 §3.1；具体 API 与理由见 `scripts/reference-graph-core.cjs`
 * 的「符号级解析」段落）：`checker.getSymbolAtLocation` + `checker.getAliasedSymbol`（别名穿透，
 * `export *` 再导出链靠它）、`checker.getExportsOfModule`（把 `export *` 展开成**逐个真实声明**）、
 * `checker.getSymbolAtLocation(TypeReferenceNode.typeName)`（类型引用归属）。
 * 单文件语法树做不到这三件事——这不是实现口味问题，是信息不在树里。
 *
 * **无静默 null（本批最重要的一条，fail-closed）**：每条符号级边的 `to.sym` 要么指向 `declarations`
 * 里真实存在的节点 id，要么带一个非空的 `reason`（闭集见 `scripts/reference-graph-core.cjs` 的
 * `SYMBOL_REASONS`）。两条不变量在 `buildGraph` 里是**抛错级**检查（违反 ⇒ 生成失败、不写盘），
 * 测试里另有对产物的全局断言。
 *
 * **本批新增：`lib-global-not-in-program` 与 `as const` 假阳性（两条都是「如实记账」，不是放宽）**：
 *   · Program 刻意 `noLib: true`（不把 `node_modules` 拉进来），于是给函数加一句标准类型标注
 *     （`function f(): Promise<void>`）就会多一条「未解析」的 `type-reference`。本批不去给 Program
 *     接 lib（实测：`unresolved` 恒 224、一条没降，却让 Program 28 → 95 个源文件、+约 200ms、
 *     产物 +13.9KB，且 `cross_file` 被 lib 路径污染），而是由**生成器**在**运行时**读已装 typescript
 *     自带 `lib.*.d.ts` 的顶层全局名，给**同时满足**「kind=type-reference ∧ from 在扫描面内 ∧
 *     名字命中名表」的边打这个新原因码；`scripts/check-impact.cjs` **只**排除这一个原因码
 *     （`declaration-out-of-scope` 等一律继续算红）。
 *   · TS 把 `as const` 解析成名为 `const` 的 `TypeReferenceNode`（保留字，永远解析不到）⇒ 本批在
 *     **生成器侧**跳过它（不是门禁侧放行 —— 它根本不该是一条引用边），跳过数落进产物自证。
 *   · 名表 `status ≠ loaded` ⇒ 一条边也不归入新原因码（= 旧行为，**不判绿**），且降级写进产物与报告。
 *   规模数字一律不回显成文档常数：取数看生成器报告里那两行「lib 全局名表 / 按设计排除」，
 *   语义与假阴性面见 docs/HANDOFF-code-graph.zh-CN.md §7.14。
 *
 * **本批不做**（设计稿 §10 的分期）：不做函数内局部变量与参数（增量 4）、不做文件内边的按需展开
 * （增量 4）、不做传递闭包与查询接口（增量 5）、不做变更影响门禁（增量 6）。这几条写进 `meta.omitted` 自证。
 *
 * 解析器**只有一份**：全部来自 `scripts/reference-graph-core.cjs`（与 `scripts/check-references.cjs`
 * 共用同一批函数）。因此「门禁说悬空、图说没事」这种双真相在结构上不可能出现——两者读的是同一份解析结果。
 *
 * 判定 / 读取基准 = **git 索引**（仓库既定约定，与 check-lib-sync / check-file-ledger / check-references 同构）：
 *   · 文件内容与字节数取自索引 blob（`git ls-files -s` + `git cat-file --batch[-check]`），
 *     不取工作区——工作区可能是 CRLF 检出或未 `git add` 的半成品，两者都会让「同一提交、不同机器」算出不同的图；
 *   · 目标存在性用 `git ls-files` 派生的索引集合判定，磁盘只用于区分 untracked / ignored；
 *   · 位置口径 = 索引 blob 的 **LF 归一化文本**上的 1 基行列（字节偏移会随 CRLF 变，行列不会）。
 *
 * **幂等**：产物里**不写生成时刻**、不写绝对路径、不写机器相关信息（例如降级原因里的临时目录路径）。
 * 同一份索引连跑两次 → 逐字节相同（`--check` 就是拿它当判据）。这是刻意的取舍：
 * 台账允许 `meta.generated_at`（那是**人写**字段，生成器只保留），图是**纯机器产物**，没有可写的人字段。
 *
 * 确定性排序：节点按 id、边按 (from.file, from.line, from.column, kind, id)，一律 **UTF-8 字节序**
 * （`Buffer.compare`），**不用** `localeCompare`（`src/engine/manifest.ts` 里 `snapshot.files` 的 `a.localeCompare(b)` 排序是本仓的已知反例）。
 *
 * 扫描面（产边的文件）：已跟踪 + 文本扩展名 + 不在 `EXCLUDED_PREFIXES` 内。
 *   · 排除 `examples/`：目标工程示例产物，占工作区行数的绝大部分且几乎不改（设计稿 P9 的取舍）；
 *   · 排除 `lib/`：`src/` 的编译产物，它里面的 import 是派生出来的，不是新事实（可再生成性由 check:libsync 保证）。
 *   节点表仍然是**全量**的（`git ls-files` 的每一条都在，不在此写死条数——它随每次提交变化；
 *   现值取数：`git ls-files | Measure-Object -Line` 或读产物的 `meta.tracked_total`），
 *   只是被排除的目录不产边、也没有行数。
 *
 * `--check` 的三条红线（第二条与第三条与 `scripts/check-file-ledger.cjs` 的 `ledger-index-drift` **对称**）：
 *   ① 索引 blob 与重算结果不一致 → `--check` exit 1（既有行为）；
 *   ② **索引里的图与工作区里的图不是同一份事实**（工作区那份被写坏 / 不可解析 / 被删掉，或两边都能读
 *      但内容不同）→ 诊断码 `graph-index-drift`（error，逐条带 `type` 点名）。判定基准是索引 blob，
 *      但「本地看到的」与「索引里的」不是同一份文件时不得给绿：否则「把工作区那份图写坏」在本地
 *      `npm run check` 里完全看不见（索引里那份是对的，旧实现照旧 exit 0）；
 *   ③ 索引里没有图文件、判定退回工作区副本 → 诊断码 `graph-index-drift` / `type: graph-not-in-index`，
 *      降级词 = `unknown`（基准不可用 ⇒ 不判绿）。两边都没有 → 诊断码 `graph-missing`。
 *
 * 降级词汇与设计稿 §5.5 的 `completeness` / §4.6 的 `degradation.status` **同词同义**（`complete` /
 * `partial` / `unknown` / `stale`）：本生成器只用得到 `complete`（判定基准 = 索引 blob 且判定完成）与
 * `unknown`（索引里没有图，判定无法在索引基准上完成）；`partial` / `stale` 用不到（图的观测点就是
 * 「当前索引」，没有历史维度）。**`unknown` 不判绿**——与 §4.6「`unknown` 与 `stale` 都不判绿（exit 1）」
 * 是同一条铁律，不是另立一套。
 *
 * **历史删除清单拿不到 ⇒ 生成失败（本批订正，fail-closed）**：`git log --diff-filter=D --name-only`
 * 失败时**抛错、退出 1**，不返回空集合——「拿不到」与「没有删除历史」是两件事，返回空集合会把每个
 * `deleted` 目标静默改判成 `missing`，产物还照写「当前 0 条历史删除路径」且 `degraded` 仍为 `false`
 * （实测假绿：`--check` 会拿这份伪造的图判 complete / exit 0）。口径与 `scripts/check-references.cjs`
 * 对同一条命令失败的处理一致（error，退出码 1）。
 *
 * 退出码：
 *   0  生成成功（内容一致时不动文件）/ `--check` 一致且降级状态 = complete
 *   1  生成失败（git 不可用 / 索引读不到 / 历史删除清单取不到 / 边 id 冲突）/ `--check` 不一致 / 索引-工作区漂移 / 降级状态 = unknown
 *   2  命令行用法错误
 *
 * 用法：node scripts/generate-reference-graph.cjs [--root <dir>] [--check] [--json] [--help]
 *
 * 作为**模块**复用（增量 2 的改动记录生成器 `scripts/generate-change-log.cjs` 用它重建任意提交的快照）：
 * 本文件导出 `buildGraph(root[, options])` / `serialize(graph)`（以及若干常量）。两条纪律：
 *   · `options.historyRev` 把「历史删除清单」的基准**钉到那个提交**（`git log --diff-filter=D … <rev>`），
 *     于是「某个提交当时的图」与**今天**的历史无关、可逐字节复核（不钉的话，日后新增的删除会把旧的
 *     `missing` 悄悄改判成 `deleted`，快照就不可复现了）。不传时行为与从前的 CLI 完全一致（默认 HEAD）；
 *   · `main` 只在**直接执行**时跑（`require.main === module`）：被 require 不产生任何副作用（不写盘、不退出）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

/** 共享解析内核（唯一事实来源）：与 scripts/check-references.cjs 用的是同一批函数。 */
const core = require('./reference-graph-core.cjs');
/** 只借台账内核的通用 git / 路径 / 排序工具（`execGit` / `relPosix` / `byCodePoint` / `normalizeEol`）——
 *  不借它的任何判定：图的四态与台账的四态是两件事（设计稿 §6.3 的分工）。 */
const shared = require('./file-ledger-core.cjs');

const TOOL = 'generate-reference-graph';
const TOOL_VERSION = '1.1.0';

/** 图数据文件（相对仓库根，posix）。 */
const GRAPH_REL = 'ledger/references.json';
/**
 * 图 schema 版本：结构变了必须显式升版，不做静默兼容（与台账同一条纪律）。
 * 1 → 2（增量 3）：新增 `declarations`（声明节点表）与 `symbol_edges`（符号级边表），
 * 并在 `meta.symbol_graph` 里自证 Program 的范围与原因码统计——`files` / `edges` 的**结构与内容
 * 口径都没变**（这是刻意的：改动记录的复核要能继续通过，见文件头「为什么分成两组数组」）。
 *
 * **2 保持不升（本批判定，理由写在这里而不是只写在提交信息里）**：本批加的是
 *   ① `SYMBOL_REASONS` 里**新增一个取值** `lib-global-not-in-program`（闭集加一项，`reason` 字段的
 *      含义与位置都没动）；② `meta.symbol_graph` 里新增三个**自证键**（`lib_globals` /
 *      `const_assertion_skips` / `lib_global_shadowed_edges`）；③ 16 条 `as const` 假阳性边消失。
 *   四条记录数组（`files` / `edges` / `declarations` / `symbol_edges`）的**字段集合与字段语义
 *   一个都没动** ⇒ 按本仓对 `schema_version` 的用法（保护消费者别误读**结构**），这是**加值**而不是
 *   结构变更，**不升版**。
 *   另一条同样是硬的：升版会让**引入它的那一次提交自己**在 `check:impact` 上 fail-closed
 *   （`impact-schema-version-mismatch`：基线 HEAD^ 还是 v2、当前是 v3），要它变绿就得放宽那条
 *   fail-closed 判据——用「放宽 fail-closed 换自己绿」正是本仓最忌讳的形状。若将来要把新原因码
 *   变成跨产物的硬契约（例如让别的消费者按版本分支），那就升到 3，并**同一次提交**改
 *   `scripts/check-impact.cjs` 的两边比对逻辑与本文件末尾的 `--help`；本批不做。
 */
const GRAPH_SCHEMA_VERSION = 2;

/** 产边的文件后缀（与 scripts/check-references.cjs 的 TEXT_EXTENSIONS 同源：同一批文本才谈得上同一批边）。 */
const TEXT_EXTENSIONS = new Set(['.md', '.json', '.cjs', '.mjs', '.ts', '.yml', '.yaml', '.toml']);
/** 不产边的目录前缀（理由见文件头「扫描面」）。 */
const EXCLUDED_PREFIXES = ['examples/', 'lib/'];
/** CI 工作流目录（相对仓库根，posix）。 */
const WORKFLOW_DIR = '.github/workflows';

const relPosix = shared.relPosix;
const byCodePoint = shared.byCodePoint;
const normalizeEol = shared.normalizeEol;
const execGit = shared.execGit;

/** UTF-8 字节序比较（设计稿 §3.6 的 0 容忍项：不用 localeCompare）。 */
const byUtf8 = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));

/** 语言分类（设计稿 §2.2 的 lang 枚举：ts / js / md / json / yaml / other）。 */
function langOf(rel) {
  const ext = path.posix.extname(rel).toLowerCase();
  if (ext === '.ts' || ext === '.tsx' || ext === '.mts' || ext === '.cts') return 'ts';
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') return 'js';
  if (ext === '.md') return 'md';
  if (ext === '.json') return 'json';
  if (ext === '.yml' || ext === '.yaml') return 'yaml';
  return 'other';
}

const isTextFile = (rel) => TEXT_EXTENSIONS.has(path.posix.extname(rel).toLowerCase());
const isExcluded = (rel) => EXCLUDED_PREFIXES.some((prefix) => rel.startsWith(prefix));
const isWorkflow = (rel) => path.posix.dirname(rel) === WORKFLOW_DIR && /\.ya?ml$/i.test(rel);

/**
 * 目标是否落在被忽略范围内。
 * `git ls-files --others --ignored --exclude-standard --directory` 会把整棵被忽略的目录**折叠成一条**
 * （例如 `ignored-dir/`，上万条 node_modules 因此不会把输出撑爆），所以判定必须逐级向上看祖先目录：
 * 只看 `ignoredSet.has(rel)` 会让「目录被折叠时，目录里的文件」全部漏判。
 */
function isIgnoredTarget(rel, ignoredSet) {
  if (ignoredSet.has(rel)) return true;
  let dir = path.posix.dirname(rel);
  while (dir !== '.' && dir !== '/') {
    if (ignoredSet.has(dir)) return true;
    dir = path.posix.dirname(dir);
  }
  return false;
}

// ---------------------------------------------------------------------------
// 索引读取（判定 / 读取基准 = git 索引）
// ---------------------------------------------------------------------------

/** `git ls-files -s -z` → [{ rel, sha, mode }]（stage 非 0 的冲突条目直接失败：判定基准必须唯一）。 */
function listIndexEntries(root) {
  const raw = execGit(root, ['ls-files', '-s', '-z']);
  const out = [];
  for (const line of raw.split('\0').filter(Boolean)) {
    const m = /^(\d+) ([0-9a-f]+) (\d+)\t(.*)$/.exec(line);
    if (!m) throw new Error(`无法解析 git ls-files -s 的输出行：${JSON.stringify(line)}`);
    if (m[3] !== '0') throw new Error(`索引里有未合并（stage=${m[3]}）的条目：${m[4]}——请先解决冲突再生成图`);
    out.push({ mode: m[1], sha: m[2], rel: relPosix(m[4]) });
  }
  return out.sort((a, b) => byCodePoint(a.rel, b.rel));
}

/**
 * `git cat-file --batch-check` → Map<sha, { type, size }>（只问体积，不读内容）。
 *
 * **请求了却拿不到的 sha ⇒ 抛错**（fail-closed）。这些 sha 全部来自 `git ls-files -s` 的索引条目，
 * 「索引里点名的对象」读不出来只有一种解释：对象库损坏 / 被裁掉 / 中途换了仓库——不是「这个文件没有内容」。
 * 按 null 处理会让**索引节点**拿到 `bytes: null`：那与 §2.3 立的口径直接冲突（`bytes` 为 null 的含义是
 * 「非索引节点（untracked / ignored / deleted）」），读产物的人会把它读成「这个文件不在跟踪里」。
 * 与 `readDeletedPaths`（同一条红线）同口径。
 * **留痕（旧写法，已否掉）**：这里原是 `if (!m) continue; // `<sha> missing` 等：不猜，交给调用方按 null 处理`
 * ——「不猜」是对的，但「交给调用方」没人接：调用方只看 Map 里有没有这一条，missing 与 never-requested
 * 在返回值上无法区分，于是没有任何一处能看出「拿不到」。
 */
function readBlobSizes(root, shas) {
  const sizes = new Map();
  if (shas.length === 0) return sizes;
  const res = spawnSync('git', ['-c', 'core.quotePath=false', 'cat-file', '--batch-check'], {
    cwd: root,
    input: `${shas.join('\n')}\n`,
    maxBuffer: 512 * 1024 * 1024,
  });
  if (res.status !== 0) throw new Error(`git cat-file --batch-check 失败：${(res.stderr || '').toString('utf8')}`);
  for (const line of res.stdout.toString('utf8').split('\n')) {
    const m = /^([0-9a-f]+) (\w+) (\d+)$/.exec(line.trim());
    if (!m) continue; // `<sha> missing` 等：这一行没有体积可读，下面统一按「请求了却没拿到」报错
    sizes.set(m[1], { type: m[2], size: Number(m[3]) });
  }
  assertAllBlobsReadable('cat-file --batch-check（问体积）', shas, sizes);
  return sizes;
}

/** `git cat-file --batch` → Map<sha, Buffer>（一次进程读全部需要的块，避免 1000+ 次 spawn）。 */
function readBlobs(root, shas) {
  const out = new Map();
  if (shas.length === 0) return out;
  const res = spawnSync('git', ['-c', 'core.quotePath=false', 'cat-file', '--batch'], {
    cwd: root,
    input: `${shas.join('\n')}\n`,
    maxBuffer: 512 * 1024 * 1024,
  });
  if (res.status !== 0) throw new Error(`git cat-file --batch 失败：${(res.stderr || '').toString('utf8')}`);
  const buf = res.stdout;
  let offset = 0;
  while (offset < buf.length) {
    const nl = buf.indexOf(0x0a, offset);
    if (nl === -1) break;
    const header = buf.slice(offset, nl).toString('utf8');
    offset = nl + 1;
    const m = /^([0-9a-f]+) (\w+) (\d+)$/.exec(header);
    if (!m) continue; // `<sha> missing`：没有内容段，下面统一按「请求了却没拿到」报错
    const size = Number(m[3]);
    const content = buf.slice(offset, offset + size);
    offset += size;
    if (buf[offset] === 0x0a) offset += 1;
    out.set(m[1], content);
  }
  assertAllBlobsReadable('cat-file --batch（读内容）', shas, out);
  return out;
}

/**
 * 请求过的 sha 必须全部拿到内容，否则抛错（本文件对**索引 blob** 的统一收口）。
 *
 * 为什么这是红线而不是「尽力而为」：拿不到内容的那条路径**不会有边**，产物里却仍照写它的节点、
 * `universe_hash` 与 `tracked_total`，「缺边」与「真的没有引用」在产物上完全同形——`--check` 拿这份
 * 残图当基准会判绿，`generate-change-log` 会照写 `degradation.status = "complete"`。
 * `scripts/check-references.cjs` 的 guard-unavailable 只在**它自己那条链路**上补得住，补不住依赖本函数
 * 的其它调用方（改动记录就在其中）。**留痕（旧写法，已否掉）**：两处调用点原写
 * `if (!buf) continue; // 索引里读不到：不猜，该文件不会有边（由 check-references 的 guard-unavailable
 * 负责报红）`——那个「负责」不成立：guard-unavailable 查的是它自己请求的那批 blob。
 */
function assertAllBlobsReadable(what, requested, got) {
  const missing = requested.filter((sha) => !got.has(sha));
  if (missing.length === 0) return;
  const shown = missing.slice(0, 10).join(' ');
  throw new Error(
    `索引里点名的 ${missing.length} 个对象读不出来（git ${what} 对它们回了 missing；共请求 ${requested.length} 个）：${shown}` +
      `${missing.length > 10 ? ' …' : ''}\n` +
      '  这与「拿不到判据」同一条红线：**不得静默丢边**——索引条目对应的 blob 读不到时，' +
      '该文件的边会凭空消失，而产物里它仍是一个 indexed 节点。\n' +
      '  先修对象库（git fsck / 重新 fetch / 确认没在错的仓库里生成）再来生成图。',
  );
}

/**
 * git 历史里被删除过的路径集合（`git log --diff-filter=D --name-only [<rev>]`），用于 deleted 状态。
 * `rev` 非空时把历史基准钉到该提交（改动记录要重建「某个提交当时的图」，见文件头）；不传 = `git log`
 * 默认的 HEAD，与从前的 CLI 行为逐字节一致。
 * **命令失败 ⇒ 抛错**（不返回空集合）：理由与留痕见函数体内的注释；正常路径（命令成功）的行为一字未变。
 */
function readDeletedPaths(root, rev) {
  const args = ['log', '--diff-filter=D', '--name-only', '--pretty=format:'];
  if (rev) args.push(String(rev));
  let raw = '';
  try {
    raw = execGit(root, args);
  } catch (err) {
    // **拿不到 ⇒ 抛错（fail-closed），绝不返回空集合**：空集合的含义是「没有任何删除历史」，
    // 而「拿不到」与「没有」是两件事——返回空集合会把每个本该 `deleted` 的目标静默改判成 `missing`，
    // 产物里还会照写「当前 0 条历史删除路径」且 `meta.analysis.degraded` 仍为 `false`，没有任何一处
    // 能看出「拿不到」（实测假绿：`--check` 拿这份伪造的图当基准时判 complete / exit 0）。
    // 与 scripts/check-references.cjs 对**同一条 git 命令**失败的处理同口径：那条命令失败就报 error
    // （guard-unavailable，退出码 1），不是「0 条」。本文件内的同类先例：解析不了的 package.json 抛错
    // （collectPackageEdges）、读不到 blob 抛错（readBlobs / readBlobSizes）、符号级边的不变量抛错。
    // 留痕（旧写法，已否掉）：这里原是 `catch { return new Set(); }`，注释写着「拿不到就不冒充
    // 「没有删除」，由 meta.history_basis 如实说明」——注释说的是一回事，代码做的是相反的一回事：
    // 没有任何降级标记，`history_basis` 照写「当前 0 条历史删除路径」。
    throw new Error(
      `无法获取历史删除清单（git ${args.join(' ')} 失败）：${err.message}\n` +
        '  ⇒ fail-closed：删除历史拿不到时不再继续生成——否则本该 deleted 的目标会被静默判成 missing，' +
        '并把它写成「当前 0 条历史删除路径」（拿不到 ≠ 没有）。\n' +
        '  修法：确认这是完整克隆（浅克隆用 `git fetch --unshallow` 补全历史），或用 `git fsck` 修复缺失的对象后重跑。',
    );
  }
  return new Set(raw.split('\n').map((s) => s.trim()).filter(Boolean));
}

/** 台账口径的宇宙摘要（与 ledger/file-ledger.json 的算法逐字一致：同一份索引应得同一个值）。 */
function universeHashOf(tracked) {
  return crypto.createHash('sha256').update(`${tracked.join('\n')}\n`, 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// 上下文（读 / 判定）——契约见 scripts/reference-graph-core.cjs 文件头
// ---------------------------------------------------------------------------

/**
 * 建图生成器用的 ctx：**内容全部来自索引 blob**。
 * 做法：把索引 blob 预填进 ctx.cache，于是共享内核的 readText / forEachMarkdownLink /
 * extractHeadingAnchors 全部读索引内容，一个字节都不碰工作区。
 */
function createIndexContext(root, tracked, untracked, ignored, deletedPaths) {
  const ctx = core.createReaderContext({ root, untracked, ignored });
  ctx.setTracked(tracked);
  ctx.deletedPaths = deletedPaths;
  /** 预填索引内容（key = 仓库相对路径，value = 归一化后的文本）。 */
  ctx.preload = (rel, text) => {
    ctx.cache.set(rel, { value: text });
  };
  return ctx;
}

// ---------------------------------------------------------------------------
// 边与节点的构造
// ---------------------------------------------------------------------------

/**
 * `indexPathState` → 边的 status（设计稿 §2.3 的 status 枚举 + 本批据实补的三个状态值，见 docs 字段表）。
 * **实现只有一份**：直接取共享内核的表，文件级边与符号级边因此不可能对同一个目标给出两个结论。
 */
const STATUS_OF_INDEX_STATE = core.STATUS_OF_INDEX_STATE;

/** 目标路径 → 节点状态（设计稿 §2.1 的 L0 四态 + missing / outside 两个「不是节点」的取值）。 */
function targetStateOf(indexState, resolvedTarget, deletedPaths) {
  if (indexState === 'tracked') return 'indexed';
  if (indexState === 'untracked') return 'untracked';
  if (indexState === 'ignored') return 'ignored';
  if (indexState === 'case-mismatch') return 'indexed'; // 真实文件在索引里，只是写法大小写不一致
  if (indexState === 'outside') return 'outside';
  return deletedPaths.has(resolvedTarget) ? 'deleted' : 'missing';
}

/** 位置的紧凑写法（用于人类报告与 --json 的样例，不落盘进图数据）。 */
const posText = (p) => `${p.file}:${p.line}:${p.column}`;

function makeEdgeCollector(fromFile) {
  const edges = [];
  return {
    edges,
    /**
     * 记一条边。id 规则 = `<from.file>:<line>:<column>:<kind>`，**同一位置有多条边时**追加
     * `:<field|specifier>` 消歧（package.json 的 `exports` 条件分支就是这种形状：
     * `"."` 的 import/require 两行落在同一个键位置）。消歧后仍冲突即**失败**——
     * 那是解析器重复产出，静默去重会掩盖它。
     */
    push(edge) {
      const from = edge.from;
      const discriminator = [edge.field, edge.specifier].filter(Boolean).join('→') || null;
      const id = `${from.file}:${from.line}:${from.column}:${edge.kind}${discriminator ? `:${discriminator}` : ''}`;
      if (edges.some((e) => e.id === id)) {
        throw new Error(`边 id 冲突（同位置同 kind 同目标产出两次）：${id}（引用方 ${fromFile}）`);
      }
      edges.push({
        id,
        kind: edge.kind,
        from,
        to: {
          file: edge.to.file === undefined ? null : edge.to.file,
          line: edge.to.line === undefined ? null : edge.to.line,
          column: edge.to.column === undefined ? null : edge.to.column,
          state: edge.to.state === undefined ? null : edge.to.state,
        },
        cross_file: Boolean(edge.to.file) && edge.to.file !== from.file,
        specifier: edge.specifier === undefined ? null : edge.specifier,
        resolved: edge.resolved === undefined ? null : edge.resolved,
        fragment: edge.fragment === undefined ? null : edge.fragment,
        field: edge.field === undefined ? null : edge.field,
        status: edge.status,
        // 文件级边的 type_only 由说明符自带：`import type …` / `export type … from` 为 true，
        // 其余（含 `import { type X }` 行内修饰、`require(…)`、`import(…)`）为 false。
        // 非模块说明符类边（markdown-link / package-field / ci-target / anchor）不传该字段 ⇒ false。
        type_only: edge.type_only === true,
      });
    },
  };
}

/** 模块说明符 → 边（source 文件：.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs）。 */
function collectModuleEdges(ctx, ts, rel, text, collector) {
  for (const { spec, index, kind, typeOnly } of core.collectModuleSpecifiersKinds(ctx, ts, rel)) {
    const from = { file: rel, ...core.positionAt(ctx, rel, text, index) };
    if (!spec.startsWith('.')) {
      // 裸模块名 / node: 内置 / URL / 绝对路径：不是仓库内的文件引用（与门禁同一条边界）。
      collector.push({
        kind,
        from,
        to: { file: null, state: 'outside' },
        specifier: spec,
        resolved: null,
        status: 'external',
        // 外部目标同样如实记：`import type { X } from 'ajv'` 也是纯类型语句。
        type_only: typeOnly,
      });
      continue;
    }
    const resolution = core.resolveRelativeSpecifier(ctx, rel, spec);
    const indexState = resolution.kind === 'tracked' ? 'tracked' : resolution.kind;
    collector.push({
      kind,
      from,
      to: { file: resolution.candidate, state: targetStateOf(indexState, resolution.candidate, ctx.deletedPaths) },
      specifier: spec,
      resolved: resolution.candidate,
      status: STATUS_OF_INDEX_STATE[indexState] || 'ambiguous',
      type_only: typeOnly,
    });
  }
}

/** Markdown 链接 / 图片 → 边（同文件纯锚点只产 anchor 边）。 */
function collectMarkdownEdges(ctx, rel, collector, pendingAnchors) {
  const links = [];
  core.forEachMarkdownLink(ctx, rel, (link) => links.push(link), {
    countSkips: false,
    includeSameFileAnchors: true,
  });
  for (const link of links) {
    const from = { file: rel, line: link.line, column: link.column };
    const indexState = core.indexPathState(ctx, link.resolved);
    const status = STATUS_OF_INDEX_STATE[indexState] || 'ambiguous';
    const toFile = link.sameFile ? rel : link.resolved;
    if (!link.sameFile) {
      collector.push({
        kind: 'markdown-link',
        from,
        to: { file: toFile, state: targetStateOf(indexState, toFile, ctx.deletedPaths) },
        specifier: link.target,
        resolved: link.resolved,
        fragment: link.fragment || null,
        status,
      });
    }
    if (link.fragment) {
      pendingAnchors.push({ from, toFile, fragment: link.fragment, targetState: targetStateOf(indexState, toFile, ctx.deletedPaths) });
    }
  }
}

/** package.json 字段与 scripts 里的 `node <路径>` → 边。 */
function collectPackageEdges(ctx, rel, text, collector) {
  let pkg;
  try {
    pkg = JSON.parse(text);
  } catch (err) {
    // 解析不了就是红：宁可红也不给一张看起来完整的空图（与门禁的 fail-closed 同口径）。
    throw new Error(`${rel} 不是合法 JSON（图生成必须能解析它）：${err.message}`);
  }

  const pushTarget = (field, target, useGlob, positionKey) => {
    if (typeof target !== 'string' || !target) return;
    const normalized = path.posix.normalize(target.replace(/^\.\//, ''));
    if (normalized === '.' || normalized.startsWith('..')) return; // 仓库外目标：与门禁一致，不产边
    const pos = core.positionOfJsonKey(ctx, text, rel, positionKey || field.split(/[.[]/)[0]) || { line: 1, column: 1 };
    const resolved = useGlob ? core.globIndexState(ctx, normalized) : { state: core.indexPathState(ctx, normalized), path: normalized };
    const indexState = resolved.state === 'outside' ? 'outside' : resolved.state;
    collector.push({
      kind: 'package-field',
      from: { file: rel, ...pos },
      to: { file: resolved.path, state: targetStateOf(indexState, resolved.path, ctx.deletedPaths) },
      specifier: target,
      resolved: resolved.path,
      field,
      status: STATUS_OF_INDEX_STATE[indexState] || 'ambiguous',
    });
  };

  for (const { field, target } of core.collectPackageFieldTargets(pkg)) pushTarget(field, target, true);

  const scripts = pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {};
  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== 'string') continue;
    for (const target of core.extractNodeTargets(command)) {
      const normalized = path.posix.normalize(target.replace(/^\.\//, ''));
      if (normalized.startsWith('..') || path.posix.isAbsolute(normalized)) continue;
      // 位置优先落在 script 名上，退回落 `scripts` 键（与门禁的位置口径一致）。
      pushTarget(`scripts["${name}"]`, target, false, name);
    }
  }
}

/** CI workflow 的 `run:` → 边（node <路径> 指文件；npm run <script> 指 package.json 的 script 名）。 */
function collectWorkflowEdges(ctx, rel, text, scriptNames, collector) {
  for (const { line, text: body } of core.collectWorkflowRunLines(text)) {
    if (!body) continue;
    for (const target of core.extractNodeTargets(body)) {
      const normalized = path.posix.normalize(target.replace(/^\.\//, ''));
      if (normalized.startsWith('..')) continue;
      const indexState = core.indexPathState(ctx, normalized);
      collector.push({
        kind: 'ci-target',
        from: { file: rel, line, column: body.indexOf(target) + 1 },
        to: { file: normalized, state: targetStateOf(indexState, normalized, ctx.deletedPaths) },
        specifier: target,
        resolved: normalized,
        status: STATUS_OF_INDEX_STATE[indexState] || 'ambiguous',
      });
    }
    for (const scriptName of core.extractNpmScriptRefs(body)) {
      const exists = scriptNames.has(scriptName);
      collector.push({
        kind: 'ci-target',
        from: { file: rel, line, column: body.indexOf(scriptName) + 1 },
        to: { file: exists ? 'package.json' : null, state: exists ? 'indexed' : 'missing' },
        specifier: scriptName,
        resolved: exists ? 'package.json' : null,
        field: `scripts["${scriptName}"]`,
        status: exists ? 'resolved' : 'dangling',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

function buildGraph(root, options = {}) {
  const startedAt = Date.now();
  /** 历史基准钉到某个提交（改动记录用；null = `git log` 默认的 HEAD，即从前的 CLI 行为）。 */
  const historyRev = options.historyRev ? String(options.historyRev) : null;
  const entries = listIndexEntries(root);
  const tracked = entries.map((e) => e.rel);
  const trackedSet = new Set(tracked);

  // 未跟踪 / 被忽略集合（磁盘 vs 索引的差集；与门禁同一条命令，理由同源）。
  const untrackedSet = new Set(
    execGit(root, ['ls-files', '-z', '--others', '--exclude-standard'])
      .split('\0')
      .filter(Boolean)
      .map(relPosix),
  );
  const ignoredSet = new Set(
    execGit(root, ['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--directory'])
      .split('\0')
      .filter(Boolean)
      .map(relPosix)
      .map((rel) => (rel.endsWith('/') ? rel.slice(0, -1) : rel)),
  );

  const deletedPaths = readDeletedPaths(root, historyRev);
  const sizes = readBlobSizes(root, [...new Set(entries.map((e) => e.sha))]);

  const scanned = tracked.filter((rel) => isTextFile(rel) && !isExcluded(rel));
  const scannedSet = new Set(scanned);
  const scannedShas = entries.filter((e) => scannedSet.has(e.rel)).map((e) => e.sha);
  const blobs = readBlobs(root, [...new Set(scannedShas)]);

  const ctx = createIndexContext(root, tracked, untrackedSet, ignoredSet, deletedPaths);
  const textOf = new Map();
  for (const entry of entries) {
    if (!scannedSet.has(entry.rel)) continue;
    const buf = blobs.get(entry.sha);
    // `readBlobs` 已经保证「请求过的 sha 全部拿到」（拿不到就抛错）：这里再拿到 undefined 只可能是
    // 索引条目与请求清单对不上（代码 bug）。**绝不 `continue`**——静默丢边正是 B3 那条红线。
    if (!buf) throw new Error(`内部不一致：索引条目 ${entry.rel}（${entry.sha}）不在已读到的 blob 集合里`);
    const text = normalizeEol(buf.toString('utf8'));
    textOf.set(entry.rel, text);
    ctx.preload(entry.rel, text);
  }

  // 模块说明符：一次加载 typescript（拿不到就降级为正则，模式落进 meta.analysis）。
  core.initSpecifierAnalysis();
  const ts = core.loadTypeScript();

  // ---- 符号级（增量 3）：只对**扫描面内**的 .ts 建 Program ----
  // rootNames = 扫描面 ∩ lang=ts（本仓 = src/**/*.ts）。`node_modules`（含 typescript 自带 lib）
  // 与 `examples/`、`lib/` 一律不进 Program：前者由内核的 compilerOptions（noLib + types: []）挡住，
  // 后者由扫描面挡住；两者都有自证字段（meta.symbol_graph.program_source_files / program_outside_repo_files）。
  const symbolRootNames = scanned.filter((rel) => langOf(rel) === 'ts');
  const symbol = core.buildSymbolGraph({
    ts,
    ctx,
    textOf,
    rootNames: symbolRootNames,
    // 与文件级边**同一张状态表**（单一事实来源）：同一个目标在两处不可能有两个结论。
    stateOfTarget: (indexState, file) => targetStateOf(indexState, file, deletedPaths),
  });

  const edges = [];
  const pendingAnchors = [];
  const packageJsonText = textOf.get('package.json') || null;
  let scriptNames = new Set();
  if (packageJsonText) {
    try {
      const parsed = JSON.parse(packageJsonText);
      if (parsed && parsed.scripts && typeof parsed.scripts === 'object') scriptNames = new Set(Object.keys(parsed.scripts));
    } catch {
      /* 交给 collectPackageEdges 报错（那里是唯一的解析点） */
    }
  }

  for (const rel of scanned) {
    const text = textOf.get(rel);
    if (text === undefined) continue;
    const collector = makeEdgeCollector(rel);
    const lang = langOf(rel);
    if (lang === 'ts' || lang === 'js') collectModuleEdges(ctx, ts, rel, text, collector);
    else if (lang === 'md') collectMarkdownEdges(ctx, rel, collector, pendingAnchors);
    else if (lang === 'json' && rel === 'package.json') collectPackageEdges(ctx, rel, text, collector);
    else if (lang === 'yaml' && isWorkflow(rel)) collectWorkflowEdges(ctx, rel, text, scriptNames, collector);
    edges.push(...collector.edges);
  }

  // ---- 锚点：需要目标文件的标题集合；目标若是本次没预读的 Markdown，先按索引补齐 ----
  const anchorTargets = [...new Set(pendingAnchors.map((a) => a.toFile))].filter(
    (rel) => langOf(rel) === 'md' && trackedSet.has(rel) && !textOf.has(rel),
  );
  if (anchorTargets.length > 0) {
    const shaByRel = new Map(entries.map((e) => [e.rel, e.sha]));
    const extra = readBlobs(root, [...new Set(anchorTargets.map((rel) => shaByRel.get(rel)).filter(Boolean))]);
    for (const rel of anchorTargets) {
      const buf = extra.get(shaByRel.get(rel));
      // 同上面那条：`readBlobs` 拿不到就抛错，这里再拿到 undefined 只可能是代码 bug ⇒ 不静默跳过，
      // 否则该锚点会被判成 `unresolved`（「读不到」被读成「指向的文档没有这个标题」）。
      if (!buf) throw new Error(`内部不一致：锚点目标 ${rel}（${shaByRel.get(rel)}）不在已读到的 blob 集合里`);
      const text = normalizeEol(buf.toString('utf8'));
      textOf.set(rel, text);
      ctx.preload(rel, text);
    }
  }
  for (const a of pendingAnchors) {    const readable = langOf(a.toFile) === 'md' && trackedSet.has(a.toFile) && textOf.has(a.toFile);
    const status = !readable
      ? 'unresolved'
      : core.anchorMatches(core.extractHeadingAnchors(ctx, a.toFile), a.fragment)
        ? 'resolved'
        : 'dangling';
    edges.push({
      id: `${a.from.file}:${a.from.line}:${a.from.column}:anchor:#${a.fragment}`,
      kind: 'anchor',
      from: a.from,
      to: { file: a.toFile, line: null, column: null, state: readable ? 'indexed' : a.targetState },
      cross_file: a.toFile !== a.from.file,
      specifier: `#${a.fragment}`,
      resolved: a.toFile,
      fragment: a.fragment,
      field: null,
      status,
      type_only: false,
    });
  }

  // ---- 节点表 ----
  const edgeOut = new Map();
  const edgeIn = new Map();
  for (const edge of edges) {
    edgeOut.set(edge.from.file, (edgeOut.get(edge.from.file) || 0) + 1);
    if (edge.to.file) edgeIn.set(edge.to.file, (edgeIn.get(edge.to.file) || 0) + 1);
  }
  const nodes = new Map();
  for (const entry of entries) {
    const text = textOf.get(entry.rel);
    const size = sizes.get(entry.sha);
    // **自指例外**：图数据文件自己那一行的 bytes / lines 记 null。
    // 自指条目（本产物自身的 `bytes`/`lines`）固定写 `null` —— 这是【处置选择】，不是"没有不动点"：
    // 实测把这两个量迭代写回，第 3 次即收敛（不动点存在）。因此这里写 null 是为了让产物写入幂等、
    // 而不是因为"自指在数学上不可能稳定"。
    // 本行历史上写的"记了它就没有不动点、幂等当场失效"是错的（旧说否掉，理由换成上面这条实测）。
    // 只豁免这两个派生量；id / lang / state / edge_* 一律照记，不做整行豁免。
    const self = entry.rel === GRAPH_REL;
    nodes.set(entry.rel, {
      id: entry.rel,
      lang: langOf(entry.rel),
      state: 'indexed',
      bytes: self || !size || size.type !== 'blob' ? null : size.size,
      lines: self || text === undefined ? null : text.split('\n').length,
      edge_out: edgeOut.get(entry.rel) || 0,
      edge_in: edgeIn.get(entry.rel) || 0,
    });
  }
  for (const [rel, count] of edgeIn) {
    if (nodes.has(rel) || !rel) continue;
    const state = untrackedSet.has(rel)
      ? 'untracked'
      : isIgnoredTarget(rel, ignoredSet)
        ? 'ignored'
        : deletedPaths.has(rel)
          ? 'deleted'
          : null;
    if (!state) continue; // missing / outside / 目录：不是节点（设计稿 L0 只有这四态）
    nodes.set(rel, {
      id: rel,
      lang: langOf(rel),
      state,
      bytes: null, // 不在索引里 → 没有索引字节数（磁盘字节数会随检出变，不落盘）
      lines: null,
      edge_out: edgeOut.get(rel) || 0,
      edge_in: count,
    });
  }

  // ---- 排序（UTF-8 字节序；边按 from 位置再按 kind，稳定且与平台无关）----
  const sortedFiles = [...nodes.values()].sort((a, b) => byUtf8(a.id, b.id));
  const sortedEdges = edges.sort((a, b) => {
    const f = byUtf8(a.from.file, b.from.file);
    if (f !== 0) return f;
    if (a.from.line !== b.from.line) return a.from.line - b.from.line;
    if (a.from.column !== b.from.column) return a.from.column - b.from.column;
    const k = byUtf8(a.kind, b.kind);
    if (k !== 0) return k;
    return byUtf8(a.id, b.id);
  });

  // ---- 符号级层：同一套排序口径（UTF-8 字节序；边按 from 位置再按 kind）----
  const sortedDeclarations = [...symbol.declarations].sort((a, b) => byUtf8(a.id, b.id));
  const sortedSymbolEdges = [...symbol.edges].sort((a, b) => {
    const f = byUtf8(a.from.file, b.from.file);
    if (f !== 0) return f;
    if (a.from.line !== b.from.line) return a.from.line - b.from.line;
    if (a.from.column !== b.from.column) return a.from.column - b.from.column;
    const k = byUtf8(a.kind, b.kind);
    if (k !== 0) return k;
    return byUtf8(a.id, b.id);
  });
  // **无静默 null**：`to.sym` 要么是声明表里真实存在的 id，要么必须带非空 reason。
  // 这里是 fail-closed（抛错 ⇒ 生成失败、不写盘）：宁可红，也不给一张「看起来完整」的图。
  const symbolDeclarationIds = new Set(sortedDeclarations.map((d) => d.id));
  for (const edge of sortedSymbolEdges) {
    if (edge.to.sym !== null && !symbolDeclarationIds.has(edge.to.sym)) {
      throw new Error(`符号级边的 to.sym 不是声明表里的节点 id：${edge.id} → ${edge.to.sym}`);
    }
    if (edge.to.sym === null && !edge.reason) {
      throw new Error(`符号级边既没有 to.sym 也没有 reason（静默 null）：${edge.id}`);
    }
  }

  const countsBy = (list, pick) => {
    const out = {};
    for (const item of list) {
      const key = pick(item);
      out[key] = (out[key] || 0) + 1;
    }
    return Object.fromEntries(Object.entries(out).sort((a, b) => byUtf8(a[0], b[0])));
  };

  /**
   * 被归入 `lib-global-not-in-program` 的符号级边条数（= 名表命中数）。
   * **必须回显**（生成器报告 / `--json` / `check-impact` 三处）：「有多少条被按设计排除」是判定的一部分，
   * 静默豁免与假绿在本仓同罪。
   */
  const libGlobalReason = core.SYMBOL_REASONS.LIB_GLOBAL_NOT_IN_PROGRAM;
  const libGlobalEdges = sortedSymbolEdges.filter((e) => e.reason === libGlobalReason).length;

  const degraded = core.SPECIFIER_ANALYSIS.mode !== 'typescript';
  const graph = {
    schema_version: GRAPH_SCHEMA_VERSION,
    meta: {
      generator: 'scripts/generate-reference-graph.cjs',
      generator_version: TOOL_VERSION,
      // 刻意不写生成时刻：图是纯机器产物，写时间戳就做不到「连跑两次逐字节相同」（幂等是 --check 的判据）。
      universe: 'git 索引（git ls-files）——节点 = 已跟踪文件（含被引用到的索引外目标），边 = 引用关系。',
      universe_hash: universeHashOf(tracked),
      universe_hash_algorithm: "sha256( sort(git ls-files, 码点升序, posix 相对路径).join('\\n') + '\\n' )",
      tracked_total: tracked.length,
      positions_basis: 'git 索引 blob 的 LF 归一化文本上的 1 基行列（不用字节偏移：CRLF 检出会让偏移漂移）',
      byte_basis: 'git 索引 blob 的字节数（git cat-file --batch-check；非索引节点为 null）',
      read_basis: '文件内容一律取自索引 blob（git cat-file --batch），不读工作区',
      history_basis:
        `git log --diff-filter=D --name-only${historyRev ? ` ${historyRev}` : ''}` +
        `（当前 ${deletedPaths.size} 条历史删除路径，用于 deleted 状态）`,
      scope: {
        description: '产边的文件 = 已跟踪 + 文本后缀 + 不在 excluded_prefixes 内；节点表仍是全量已跟踪文件',
        text_extensions: [...TEXT_EXTENSIONS].sort(byUtf8),
        excluded_prefixes: [...EXCLUDED_PREFIXES],
        scanned_total: scanned.length,
      },
      analysis: {
        mode: core.SPECIFIER_ANALYSIS.mode,
        typescript_version: core.SPECIFIER_ANALYSIS.version || null,
        // 降级原因里含机器相关的绝对路径，不落盘（幂等要求）；需要原因时看 check-references --json。
        degraded,
      },
      /**
       * 符号级层（增量 3）的自证块。**不落任何计时**（计时会破坏「连跑两次逐字节相同」）：
       * 耗时只走 stdout 的人类报告与 `--json`，产物里一个数字都不留。
       */
      symbol_graph: {
        description:
          '符号级层（增量 3）：把 import / export-from / type-reference 提升到「谁引用了哪个声明」；' +
          '文件级 files / edges 的结构与口径一个字节都没动（理由见生成器文件头）。',
        mode: symbol.mode,
        reasons: symbol.reasons,
        scope:
          '只对扫描面内 lang=ts 的文件建 Program（本仓 = src/**/*.ts）；' +
          '.mjs / .cjs / .js / .jsx 按设计稿 §3.4 退化为文件级，不产符号边。',
        root_names_total: symbol.stats.root_names,
        // 两条自证：Program 里只有 rootNames，没有 node_modules / lib / examples。
        program_source_files: symbol.stats.program_source_files,
        program_outside_repo_files: symbol.stats.program_outside_repo_files,
        compiler_options: symbol.compiler_options,
        node_modules_types: false,
        host_basis:
          '自建 ts.CompilerHost：仓库内路径的 fileExists / readFile / getSourceFile / directoryExists / ' +
          'getDirectories 全部只认 git 索引（不读工作区）；仓库外路径由 noLib + types:[] 挡住',
        positions_basis:
          '声明与引用位置由 ts.SourceFile.getLineAndCharacterOfPosition 在索引 blob 的 LF 归一化文本上算出（1 基）',
        declaration_kinds: countsBy(sortedDeclarations, (d) => d.decl_kind),
        edge_kinds: countsBy(sortedSymbolEdges, (e) => e.kind),
        edge_status: countsBy(sortedSymbolEdges, (e) => e.status),
        unresolved_reasons: countsBy(
          sortedSymbolEdges.filter((e) => e.reason),
          (e) => e.reason,
        ),
        /**
         * **lib 全局名表（本批新增）的自证块**：`status` / `reason` / 版本 / 规模 / 名字表摘要都在这里，
         * 「有多少条边被归入 `lib-global-not-in-program`」由上面的 `unresolved_reasons` 给出（**不回显就
         * 等于静默豁免**，所以生成器的人类报告与 `--json` 两处都再点一次名）。
         * `status ≠ loaded` ⇒ 一条边也不会归入那个原因码（保持旧行为 = 那些边继续算红，**不判绿**）。
         */
        lib_globals: core.libGlobalsSummary(),
        /** `as const` 假阳性被跳过的节点数（生成器侧修，不是门禁侧放行；跳过不许静默）。 */
        const_assertion_skips: symbol.stats.skipped_const_assertions,
        /** 假阴性面（仓库符号遮蔽 lib 全局名）的条数，只回显、不参与判定，见 HANDOFF §7.14。 */
        lib_global_shadowed_edges: symbol.stats.lib_global_shadowed_edges,
        cross_file_edges: sortedSymbolEdges.filter((e) => e.cross_file).length,
        // 恒为 0：`to.sym === null && !reason` 在 buildGraph 里直接抛错（fail-closed），不是统计出来的。
        silent_null_edges: 0,
        degraded_extensions: { '.mjs': 'file-level', '.cjs': 'file-level', '.js': 'file-level', '.jsx': 'file-level' },
      },
      edge_id_rule:
        '<from.file>:<line>:<column>:<kind>，同一位置多条边时追加 `:<field|specifier>` 消歧（仍冲突即生成失败）',
      self_reference:
        `自指条目（本产物自身的 bytes / lines）固定写 null —— 这是【处置选择】，不是"没有不动点"：` +
        '实测把这两个量迭代写回，第 3 次即收敛（不动点存在）。因此这里写 null 是为了让产物写入幂等、' +
        '而不是因为"自指在数学上不可能稳定"。' +
        `（本条 = 图数据文件自己（${GRAPH_REL}）那一行；只豁免这两个派生量，其余字段照常登记。）`,
      node_states: countsBy(sortedFiles, (n) => n.state),
      edge_kinds: countsBy(sortedEdges, (e) => e.kind),
      edge_status: countsBy(sortedEdges, (e) => e.status),
      // 本批的范围边界，写进产物自证（免得被读成「全量符号图」）。
      omitted: [
        '函数内局部变量与参数（设计稿 §10 增量 4）',
        '文件内边按需展开（设计稿 §2.5 ④ / 增量 4）：本批的符号级边全部落盘',
        'import-binding 节点（本批把 import 绑定表达成符号级边的源端，不单独节点化）',
        '非 TS 后缀（.mjs / .cjs / .js / .jsx）的符号级解析（按设计稿 §3.4 退化为文件级）',
        '库类型与 @types（Program 刻意 noLib + types:[]：库类型=自带 lib 的全局名记 lib-global-not-in-program，其余记 symbol-not-found-in-program）',
        '传递闭包查询的结果不落盘（能力已由 scripts/refs-query.cjs 的 impact / who-references 提供，属按需查询）',
        '查询接口的产物不落盘（能力已由 scripts/refs-query.cjs 提供）',
        '变更影响判定不落盘（能力已由 scripts/check-impact.cjs 提供，它是 check 链第 13 环）',
      ],
    },
    files: sortedFiles,
    edges: sortedEdges,
    declarations: sortedDeclarations,
    symbol_edges: sortedSymbolEdges,
  };
  return {
    graph,
    scanned: scanned.length,
    elapsedMs: Date.now() - startedAt,
    degraded,
    /** 被归入 `lib-global-not-in-program` 的符号级边条数（回显用；判定在 check-impact 侧）。 */
    libGlobalEdges,
    symbol: {
      mode: symbol.mode,
      reasons: symbol.reasons,
      stats: symbol.stats,
      compilerOptions: symbol.compiler_options,
      libGlobals: core.libGlobalsSummary(),
    },
  };
}

// ---------------------------------------------------------------------------
// 写入 / 比较
// ---------------------------------------------------------------------------

function serialize(graph) {
  return `${JSON.stringify(graph, null, 2)}\n`;
}

/** 读「索引版」的图数据（`git show :<rel>`）：没有就返回 { text: null }，由调用方决定回退。 */
function readIndexEntry(root, rel) {
  try {
    return { text: execGit(root, ['show', `:${rel}`]) };
  } catch {
    return { text: null };
  }
}

/**
 * `--check` 的降级状态词（与设计稿 §5.5 的 `completeness` / §4.6 的 `degradation.status` **同词同义**）：
 *   · `complete` —— 判定基准 = git 索引 blob，且索引与工作区是同一份事实；
 *   · `unknown`  —— 索引里没有图文件，判定只能退回工作区副本：基准不可用 ⇒ **不判绿**。
 * `partial` / `stale` 在本生成器里**用不到**（图的观测点就是「当前索引」，没有历史维度）；
 * 若将来出现历史基准，按 §5.5 的定义补词，不要在这里另造同义词。
 */
const DEGRADATION_COMPLETE = 'complete';
const DEGRADATION_UNKNOWN = 'unknown';

/**
 * 允许被**覆盖升级**的旧图版本。
 * 写盘模式遇到「工作区那份图是别的版本」时：旧版本（1）允许升级写入并回显；未知/更高版本
 * 一律**拒绝写盘并 exit 1**——旧生成器覆盖新产物是比「不写」更坏的失败（会静默降级结构）。
 */
const PREVIOUS_SCHEMA_VERSIONS = [1];

/** 从一份图文本里取 `schema_version`（读不出 → null；不是合法 JSON → 'unparsable'）。 */
function schemaVersionOf(text) {
  if (text === null) return null;
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed.schema_version : null;
  } catch {
    return 'unparsable';
  }
}

/** 读工作区里的图：返回 `{ text, error }`；`text === null` 表示取不到，`error` 记原因（用于点名）。 */
function readWorktreeGraph(root) {
  const abs = path.join(root, ...GRAPH_REL.split('/'));
  try {
    return { text: fs.readFileSync(abs, 'utf8'), error: null };
  } catch (err) {
    return { text: null, error: err.message };
  }
}

/** 工作区那份图能不能解析成 JSON：返回 `null` = 可解析，否则返回解析错误信息。 */
function graphParseError(text) {
  if (text === null) return null;
  try {
    JSON.parse(text);
    return null;
  } catch (err) {
    return err.message;
  }
}

/**
 * `--check` 的索引-工作区漂移诊断（与 `scripts/check-file-ledger.cjs` 的 `ledger-index-drift` 对称）。
 *
 * 为什么必须有它：判定基准是**索引 blob**，于是「工作区那份图被写坏」在旧实现里完全不可见——
 * 索引里那份是对的，`--check` 就 exit 0（实测：把工作区图写成 `{` 仍然绿），
 * 「本地绿」于是不再等于「被提交的那份事实是好的」。这正是本仓最忌讳的假绿。
 *
 * `indexSchemaVersion` 参数回答的是同一族的另一个问题：**索引里的图是不是本版结构**。
 * 结构变了必须显式升版（不做静默兼容），所以「索引里还是旧版图」必须点名报出、而不是只报一句
 * 「重算结果不一致」——后者会让人以为是内容漂移，而事实是基准版本落后。
 */
function collectGraphDiagnostics({ indexText, indexSchemaVersion, worktreeText, worktreeError, worktreeParseError }) {
  const diags = [];
  const drift = (type, message, hint) =>
    diags.push({ check: 'graph-index-drift', type, severity: 'error', file: GRAPH_REL, message, hint });
  if (indexText !== null && indexSchemaVersion !== GRAPH_SCHEMA_VERSION) {
    drift(
      'graph-index-schema-version',
      `索引里的图 schema_version = ${JSON.stringify(indexSchemaVersion)}，本生成器要求 ${GRAPH_SCHEMA_VERSION}：` +
        '结构变了必须显式升版，不匹配的版本**不做静默兼容**（与台账同一条纪律）。',
      `重跑 node scripts/generate-reference-graph.cjs 并 git add ${GRAPH_REL}（v${PREVIOUS_SCHEMA_VERSIONS.join('/v')} → v${GRAPH_SCHEMA_VERSION} 是允许的升级路径）。`,
    );
  }
  if (worktreeParseError !== null) {
    drift(
      'graph-worktree-unparsable',
      `工作区里的图 ${GRAPH_REL} 不是合法 JSON（${worktreeParseError}）：它已经不可用，本次判定按**索引版**进行。`,
      `重算一份覆盖它：node scripts/generate-reference-graph.cjs（然后 git add ${GRAPH_REL}）。`,
    );
  }
  if (indexText !== null) {
    if (worktreeText === null) {
      drift(
        'graph-worktree-missing',
        `工作区里的图与 git 索引不一致：索引里有 ${GRAPH_REL}，工作区里取不到（${worktreeError}）。`,
        `git checkout -- ${GRAPH_REL} 可以恢复工作区副本（或确认这是有意的删除并 git add）。`,
      );
    } else if (worktreeParseError === null && normalizeEol(worktreeText) !== normalizeEol(indexText)) {
      drift(
        'graph-worktree-vs-index',
        `工作区里的图与 git 索引 blob 不一致（索引版 ${Buffer.byteLength(indexText, 'utf8')} B / ` +
          `工作区版 ${Buffer.byteLength(worktreeText, 'utf8')} B）：本次判定按**索引版**进行。`,
        `本地绿不能依赖未提交改动：要么 git add ${GRAPH_REL} 把改动纳入索引，` +
          `要么用 git checkout -- ${GRAPH_REL} 丢弃工作区改动。`,
      );
    }
  } else if (worktreeText !== null) {
    drift(
      'graph-not-in-index',
      `图不在 git 索引里（git show :${GRAPH_REL} 失败）：判定基准退回工作区副本，` +
        `降级状态 = ${DEGRADATION_UNKNOWN}（基准不可用 ⇒ 不判绿）。`,
      `先 git add ${GRAPH_REL}：否则 CI / 新克隆看到的不是这份图，「本地绿」是未提交改动撑起来的。`,
    );
  } else {
    diags.push({
      check: 'graph-missing',
      type: 'graph-missing',
      severity: 'error',
      file: GRAPH_REL,
      message: `图数据文件不存在：${GRAPH_REL}（索引里没有该条目，工作区也取不到：${worktreeError}）。`,
      hint: `用 node scripts/generate-reference-graph.cjs 生成，或从 git 索引恢复（git show :${GRAPH_REL}）。`,
    });
  }
  return diags;
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n运行 \`node scripts/generate-reference-graph.cjs --help\` 查看用法。\n`);
    process.exitCode = 2;
    return;
  }
  if (opts.help) {
    printHelp();
    process.exitCode = 0;
    return;
  }

  let root;
  try {
    root = resolveRoot(opts.root);
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  let built;
  try {
    built = buildGraph(root);
  } catch (err) {
    process.stderr.write(`${TOOL}: 生成失败：${err.message}\n`);
    process.exitCode = 1;
    return;
  }

  const { graph, elapsedMs, degraded, symbol, libGlobalEdges } = built;
  const serialized = serialize(graph);
  const graphAbs = path.join(root, ...GRAPH_REL.split('/'));
  // 两种模式的比较基准刻意不同（与 generate-file-ledger.cjs 同构）：
  //   · 写盘模式比**工作区那份**（写入目标）：内容一致就不动文件（幂等，不产生无谓 mtime 抖动）；
  //   · --check 比**索引 blob**（`git show :ledger/references.json`，与其它门禁同基准）：
  //     「图是不是已经被 git add 进当前判定基准」也是它要回答的问题。
  const worktreeGraph = readWorktreeGraph(root);
  const worktreeText = worktreeGraph.text;
  const worktreeParseError = graphParseError(worktreeText);
  const worktreeMatches = worktreeText !== null && normalizeEol(worktreeText) === normalizeEol(serialized);
  const indexVersion = readIndexEntry(root, GRAPH_REL);
  const worktreeSchemaVersion = schemaVersionOf(worktreeParseError === null ? worktreeText : null);
  const indexSchemaVersion = schemaVersionOf(indexVersion.text);
  const comparedWith = opts.check ? (indexVersion.text !== null ? 'index' : 'worktree') : 'worktree';
  const consistent = opts.check
    ? indexVersion.text !== null
      ? normalizeEol(indexVersion.text) === normalizeEol(serialized)
      : worktreeMatches
    : worktreeMatches;
  // 判定基准是不是索引：不是 ⇒ 降级状态 = `unknown`（§5.5 的「分片缺失 ⇒ 无法判定」），**不判绿**。
  const indexBaseline = indexVersion.text !== null;
  const diagnostics = opts.check
    ? collectGraphDiagnostics({
        indexText: indexVersion.text,
        indexSchemaVersion,
        worktreeText,
        worktreeError: worktreeGraph.error,
        worktreeParseError,
      })
    : [];
  const degradation = {
    status: opts.check && !indexBaseline ? DEGRADATION_UNKNOWN : DEGRADATION_COMPLETE,
    reasons: opts.check && !indexBaseline ? ['index-entry-missing'] : [],
    note:
      opts.check && !indexBaseline
        ? `索引里没有 ${GRAPH_REL}：判定基准退回工作区副本，基准不可用 ⇒ 不得把这次结果读成「图与索引一致」。`
        : `判定基准 = git 索引 blob，且索引与工作区是同一份事实。`,
  };
  const checkOk = consistent && diagnostics.length === 0 && degradation.status === DEGRADATION_COMPLETE;
  // 写盘前的 fail-closed：工作区那份图若是**未知 / 更高**版本，拒绝覆盖（旧生成器不得静默降级新结构）。
  const unknownNewerVersion =
    !opts.check &&
    !worktreeMatches &&
    worktreeSchemaVersion !== null &&
    worktreeSchemaVersion !== GRAPH_SCHEMA_VERSION &&
    !PREVIOUS_SCHEMA_VERSIONS.includes(worktreeSchemaVersion);
  if (unknownNewerVersion) {
    process.stderr.write(
      `${TOOL}: 拒绝写盘——工作区里的 ${GRAPH_REL} 是 schema_version = ${JSON.stringify(worktreeSchemaVersion)}，` +
        `本生成器只认 ${GRAPH_SCHEMA_VERSION}（可从 v${PREVIOUS_SCHEMA_VERSIONS.join(' / v')} 升级）。\n` +
        '  结构变了必须显式升版，不做静默兼容：先用对应版本的生成器处理，或确认这份图可以丢弃后手动删除再重跑。\n',
    );
    process.exitCode = 1;
    return;
  }
  const upgradedFrom = !opts.check && !worktreeMatches && PREVIOUS_SCHEMA_VERSIONS.includes(worktreeSchemaVersion) ? worktreeSchemaVersion : null;
  let changed = false;
  if (!opts.check && !worktreeMatches) {
    fs.mkdirSync(path.dirname(graphAbs), { recursive: true });
    fs.writeFileSync(graphAbs, serialized, 'utf8');
    changed = true;
  }

  if (opts.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          tool: TOOL,
          toolVersion: TOOL_VERSION,
          root,
          ok: opts.check ? checkOk : true,
          check: Boolean(opts.check),
          changed,
          consistent,
          comparedWith,
          baseline: comparedWith,
          degradation,
          diagnostics,
          schemaVersion: graph.schema_version,
          trackedTotal: graph.meta.tracked_total,
          scannedTotal: graph.meta.scope.scanned_total,
          universeHash: graph.meta.universe_hash,
          files: graph.files.length,
          edges: graph.edges.length,
          nodeStates: graph.meta.node_states,
          edgeKinds: graph.meta.edge_kinds,
          edgeStatus: graph.meta.edge_status,
          analysisMode: graph.meta.analysis.mode,
          declarations: graph.declarations.length,
          symbolEdges: graph.symbol_edges.length,
          // 符号级层的自证 + **计时**：计时只出现在这里与人类报告，绝不落进产物（幂等要求）。
          symbolGraph: {
            mode: graph.meta.symbol_graph.mode,
            reasons: graph.meta.symbol_graph.reasons,
            rootNames: graph.meta.symbol_graph.root_names_total,
            programSourceFiles: graph.meta.symbol_graph.program_source_files,
            programOutsideRepoFiles: graph.meta.symbol_graph.program_outside_repo_files,
            compilerOptions: graph.meta.symbol_graph.compiler_options,
            declarationKinds: graph.meta.symbol_graph.declaration_kinds,
            edgeKinds: graph.meta.symbol_graph.edge_kinds,
            edgeStatus: graph.meta.symbol_graph.edge_status,
            unresolvedReasons: graph.meta.symbol_graph.unresolved_reasons,
            crossFileEdges: graph.meta.symbol_graph.cross_file_edges,
            silentNullEdges: graph.meta.symbol_graph.silent_null_edges,
            // 本批新增：lib 全局名表自证块 + 三个必须回显的计数（命中数 / 跳过数 / 遮蔽条数）。
            libGlobals: graph.meta.symbol_graph.lib_globals,
            libGlobalEdges,
            constAssertionSkips: graph.meta.symbol_graph.const_assertion_skips,
            libGlobalShadowedEdges: graph.meta.symbol_graph.lib_global_shadowed_edges,
          },
          timings: { totalMs: elapsedMs, programMs: symbol.stats.program_ms, collectMs: symbol.stats.collect_ms },
        },
        null,
        2,
      )}\n`,
    );
  } else if (opts.check) {
    const basis = comparedWith === 'index' ? 'git 索引 blob' : '工作区文件';
    if (checkOk) {
      process.stdout.write(
        `${TOOL}: ${GRAPH_REL} 与重新生成的结果一致（比较基准 = ${basis}）。\n` +
          `  降级状态 = ${degradation.status}（基准 = git 索引 blob，且与工作区是同一份事实）\n` +
          `  节点 ${graph.files.length} · 边 ${graph.edges.length} · 扫描面 ${graph.meta.scope.scanned_total} 个文件 · universe ${graph.meta.tracked_total} 条\n` +
          `  符号级 = 声明 ${graph.declarations.length} · 符号边 ${graph.symbol_edges.length}（schema_version ${graph.schema_version}）\n` +
          `${libGlobalsReportLines(graph, libGlobalEdges).join('\n')}\n`,
      );
    } else {
      const lines = [
        `${TOOL}: ${GRAPH_REL} 判定未通过（比较基准 = ${basis}，降级状态 = ${degradation.status}）。`,
      ];
      if (!consistent) {
        lines.push(
          `  重算：节点 ${graph.files.length} · 边 ${graph.edges.length} · 声明 ${graph.declarations.length} · ` +
            `符号边 ${graph.symbol_edges.length} · universe_hash ${graph.meta.universe_hash.slice(0, 16)}…`,
        );
      }
      lines.push(...libGlobalsReportLines(graph, libGlobalEdges));
      for (const d of diagnostics) {
        lines.push(`  [${degradation.status}] ${d.check}/${d.type} ${d.file}：${d.message}`);
        if (d.hint) lines.push(`       修法：${d.hint}`);
      }
      lines.push(`  修法：node scripts/generate-reference-graph.cjs（然后 git add ${GRAPH_REL}）`);
      process.stderr.write(`${lines.join('\n')}\n`);
    }
  } else {
    process.stdout.write(
      `${TOOL}: ${changed ? `已写出 ${GRAPH_REL}` : `${GRAPH_REL} 与重新生成的结果一致，未改动文件`}\n` +
        `  宇宙 = git ls-files ${graph.meta.tracked_total} 条（universe_hash ${graph.meta.universe_hash.slice(0, 16)}…）\n` +
        `  扫描面 = ${graph.meta.scope.scanned_total} 个文件（排除 ${EXCLUDED_PREFIXES.join(' / ')}；节点表仍是全量）\n` +
        `  节点 ${graph.files.length} 条 ${JSON.stringify(graph.meta.node_states)}\n` +
        `  边 ${graph.edges.length} 条 ${JSON.stringify(graph.meta.edge_kinds)}\n` +
        `  符号级 = 声明 ${graph.declarations.length} 条 ${JSON.stringify(graph.meta.symbol_graph.declaration_kinds)} · ` +
        `符号边 ${graph.symbol_edges.length} 条 ${JSON.stringify(graph.meta.symbol_graph.edge_kinds)}\n` +
        `    符号级边状态 ${JSON.stringify(graph.meta.symbol_graph.edge_status)} · 跨文件 ${graph.meta.symbol_graph.cross_file_edges} 条 · ` +
        `未解析原因 ${JSON.stringify(graph.meta.symbol_graph.unresolved_reasons)}\n` +
        `    Program ${graph.meta.symbol_graph.program_source_files} 个源文件（仓库外 ${graph.meta.symbol_graph.program_outside_repo_files} 个）· ` +
        `编译器选项 ${JSON.stringify(graph.meta.symbol_graph.compiler_options)}\n` +
        `${libGlobalsReportLines(graph, libGlobalEdges).join('\n')}\n` +
        (upgradedFrom !== null ? `  结构升级：${GRAPH_REL} v${upgradedFrom} → v${graph.schema_version}\n` : '') +
        `  解析模式 = ${graph.meta.analysis.mode}${degraded ? '（**降级**：拿不到 typescript，说明符只按正则解析）' : ''} · ` +
        `耗时 ${elapsedMs} ms（其中 createProgram ${symbol.stats.program_ms} ms / 符号遍历 ${symbol.stats.collect_ms} ms）\n`,
    );
  }  if (opts.check && !checkOk) process.exitCode = 1;
}

/**
 * 人类报告里那两行「按设计排除了多少条」——**必须出现**（生成器人类报告 / `--json` /
 * `scripts/check-impact.cjs` 三处都要能看到「有多少条被归入 lib-global-not-in-program」）。
 * 静默豁免与假绿在本仓同罪：判绿的那部分判定，必须自己把规模说出来。
 */
function libGlobalsReportLines(graph, libGlobalEdges) {
  const lg = graph.meta.symbol_graph.lib_globals;
  const reason = core.SYMBOL_REASONS.LIB_GLOBAL_NOT_IN_PROGRAM;
  return [
    lg.status === 'loaded'
      ? `    lib 全局名表 = loaded（typescript ${lg.typescript_version} · ${lg.lib_files_total} 个 lib.*.d.ts · ` +
        `顶层全局名 ${lg.globals_total} 个 · 名字表摘要 ${String(lg.names_digest).slice(0, 23)}…）`
      : `    lib 全局名表 = **unavailable**（原因码 ${lg.reason}）：本次**没有任何边**被归入 ${reason} —— ` +
        `那些边继续按 symbol-not-found-in-program 计（保持旧行为，**不判绿**）`,
    `    按设计排除 = ${libGlobalEdges} 条 ${reason}（仅 kind=type-reference 且名字命中名表）· ` +
      `as const 假阳性跳过 ${graph.meta.symbol_graph.const_assertion_skips} 条 · ` +
      `遮蔽风险（同名仓库顶层声明）${graph.meta.symbol_graph.lib_global_shadowed_edges} 条`,
  ];
}

function parseArgs(argv) {
  const opts = { root: null, check: false, json: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') opts.check = true;
    else if (arg === '--json') opts.json = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--root') {
      opts.root = argv[i + 1];
      i += 1;
      if (!opts.root) throw new Error('--root 需要一个目录参数');
    } else if (arg.startsWith('--root=')) opts.root = arg.slice('--root='.length);
    else throw new Error(`未知参数：${arg}`);
  }
  return opts;
}

/** --root 的 fail-closed 约定（与 check-references / check-file-ledger 同构）：显式给了就绝不回退。 */
function resolveRoot(explicit) {
  const cwd = process.cwd();
  if (explicit) {
    const abs = path.resolve(cwd, explicit);
    if (!fs.existsSync(abs)) throw new Error(`--root 指向的目录不存在：${abs}（已 fail-closed：绝不回退到本脚本所在仓库）`);
    if (!fs.statSync(abs).isDirectory()) throw new Error(`--root 必须是一个目录：${abs}`);
    let top = null;
    try {
      top = execGit(abs, ['rev-parse', '--show-toplevel']).trim();
    } catch (err) {
      throw new Error(`--root 不是 git 仓库：${abs}（${err.message}）`);
    }
    if (path.resolve(top) !== abs) throw new Error(`--root 必须是仓库根（git 顶层目录 = ${top}）：${abs}`);
    return abs;
  }
  try {
    return execGit(cwd, ['rev-parse', '--show-toplevel']).trim();
  } catch {
    return path.resolve(__dirname, '..');
  }
}

function printHelp() {
  const lines = [
    `${TOOL} v${TOOL_VERSION} — 引用图生成器（文件级 + 符号级；schema_version ${GRAPH_SCHEMA_VERSION}）`,
    '',
    '用法：',
    '  node scripts/generate-reference-graph.cjs [选项]',
    '',
    '选项：',
    '  --root <dir>    指定仓库根（默认：git 顶层目录）；非 git 根目录 → 报错退出 1（绝不回退）',
    '  --check         只比较不写盘：判定通过 → 0，否则 1；',
    '                  比较基准 = **git 索引 blob**（`git show :ledger/references.json`）。四条红线：',
    '                    ① 索引 blob 与重算结果不一致；',
    '                    ② `graph-index-drift`：索引里的图与工作区里的图不是同一份事实',
    '                       （type ∈ graph-worktree-unparsable | graph-worktree-missing | graph-worktree-vs-index，全部 error）；',
    '                    ③ `graph-index-drift` / type `graph-not-in-index`：索引里没有图文件、判定退回工作区副本',
    '                       （两边都没有 → `graph-missing`）；',
    `                    ④ \`graph-index-schema-version\`：索引里的图 schema_version ≠ ${GRAPH_SCHEMA_VERSION}`,
    '                       （结构变了必须显式升版，不做静默兼容）。',
    '  --json          打印机器可读摘要（节点/边/声明/符号边计数、universe_hash、解析模式、',
    '                  symbolGraph 自证、timings、degradation、diagnostics）',
    '  -h, --help      打印本帮助',
    '',
    '降级词汇（与设计稿 §5.5 / §4.6 同词同义；`--json` 的 `degradation.status`）：',
    '  · complete —— 判定基准 = git 索引 blob，且索引与工作区是同一份事实；',
    '  · unknown  —— 索引里没有图文件（基准不可用，`reasons: ["index-entry-missing"]`）→ **不判绿**（exit 1）；',
    '                `partial` / `stale` 用不到：图的观测点就是「当前索引」，没有历史维度。',
    '',
    '退出码：0 成功 / 1 生成失败（含 --check 不一致、索引-工作区漂移、版本不匹配、降级状态 = unknown）/ 2 用法错误',
    '',
    '历史基准（fail-closed）：`deleted` 状态来自 `git log --diff-filter=D --name-only`；该命令**失败即生成失败**',
    '  （退出码 1，报告点名是哪一步失败）——「拿不到删除历史」不得写成「0 条历史删除路径」：那会把本该',
    '  `deleted` 的目标静默判成 `missing`，而 `--check` 会拿这份伪造的图判 complete / exit 0。',
    '  浅克隆（`git clone --depth 1`）里该命令**实测 exit 0**（只是历史被截断）⇒ 不走本条，行为与从前一致。',
    '',
    '读 / 写：',
    '  读：git 索引（`git ls-files`）里的文本文件、仓库自带 typescript（符号级 Program 用）、',
    '      工作区那份 ledger/references.json（仅用于 --check 的漂移比对与「拒绝覆盖未知 / 更高版本」判定）；',
    '  写：默认写 ledger/references.json（--check 只比较不写盘；内容幂等，同一输入连跑两次逐字节相同）。',
    '',
    'check 链位置（npm 脚本 `check` 的实际顺序，环名照抄）：',
    '  第 11 环 `npm run check:graph`（= 本脚本，链上以 `--check` 调用）——前一环是第 10 环 `npm run check:ledger`，',
    '  后一环是第 12 环 `npm run check:changes`。',
    '',
    '产物结构（ledger/references.json，schema_version ' + GRAPH_SCHEMA_VERSION + '）：',
    '  · meta  —— 宇宙（git 索引）、universe_hash、判定/读取基准、扫描面、解析模式、四态与 kind/status 计数、',
    '             symbol_graph（符号级层的范围与原因码统计）；**不写生成时刻与耗时**（幂等要求：连跑两次逐字节相同）；',
    '  · files —— 文件节点表（全量已跟踪文件 + 被引用到的索引外目标）：id / lang / state / bytes / lines / edge_out / edge_in，',
    '             state ∈ indexed | ignored | untracked | deleted；',
    '  · edges —— **文件级**边表：id / kind / from{file,line,column} / to{file,line,column,state} / cross_file / specifier /',
    '             resolved / fragment / field / status / type_only，',
    '             kind ∈ import | export-from | require | dynamic-import | markdown-link | package-field | ci-target | anchor，',
    '             status ∈ resolved | dangling | untracked | ignored | case-mismatch | ambiguous | external | unresolved；',
    '  · declarations —— **声明**节点表（顶层声明）：id(= <file>#<name>@<line>:<column>) / file / name / decl_kind /',
    '             exported / scope(本批恒 null) / line / column / origin，',
    '             decl_kind ∈ function | class | interface | type | enum | variable；',
    '  · symbol_edges —— **符号级**边表：id / kind / from{file,line,column,sym} / to{sym,file,line,column,state} / cross_file /',
    '             specifier / resolved / status / reason / type_only，',
    '             kind ∈ import | export-from | type-reference；',
    '             **无静默 null**：to.sym 为空时 reason 必填（闭集见共享内核的 SYMBOL_REASONS），违反即生成失败。',
    '             **lib-global-not-in-program**（本批新增）：被引用的名字是**已装 typescript 自带 lib 的顶层全局名**',
    '             （Promise / Record / Map …），而 Program 刻意 noLib ⇒ 它不是断链。名表**运行时读**（不写死清单），',
    '             版本 / 文件数 / 名字总数 / 名字表 sha256 摘要落进 meta.symbol_graph.lib_globals；名表读不到时',
    '             status ≠ loaded、一条边也不归入该原因码（保持旧行为 = 那些边继续算未解析，**不判绿**）。',
    '             命中的条数在人类报告与 --json（symbolGraph.libGlobalEdges）里回显；`as const` 假阳性在生成器侧跳过',
    '             （meta.symbol_graph.const_assertion_skips）。',
    '             **只对 kind=type-reference 且 from 在扫描面内的边成立**：declaration-out-of-scope（仓库内越界）、',
    '             imported-symbol-not-loaded / external-module-symbol 与拼错的名字一律**不归**本条（继续算红）。',
    '',
    '解析器与 scripts/check-references.cjs 共用 scripts/reference-graph-core.cjs（同一份实现，不造第二套）：',
    '  门禁回答「引用完整性」，图回答「谁指向谁」；文件级边与符号级边都出自这一份内核。',
    '  符号级层用 ts.createProgram + getTypeChecker 建 Program：只放扫描面内的 .ts（本仓 = src/**/*.ts），',
    '  compilerOptions 显式 noLib + types:[]（不把 node_modules 拉进来），宿主把仓库内文件读写全部指向 git 索引。',
    '',
    '本批**不做**（设计稿分期）：函数内局部变量与参数（增量 4）、文件内边按需展开（增量 4）、',
    '  传递闭包与查询接口（增量 5）、变更影响门禁（增量 6）——逐条写在产物的 meta.omitted 里自证。',
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

/**
 * 模块导出（`scripts/generate-change-log.cjs` 复用同一份建图实现，**不造第二套**）：
 *   · `buildGraph(root[, options])` → `{ graph, scanned, elapsedMs, degraded, symbol }`；
 *     `options.historyRev` 见文件头；`symbol` 是符号级层的过程信息（mode / reasons / stats / compilerOptions），
 *     **只在报告与 --json 里用**，不进产物（计时进产物会破坏幂等）。
 *   · `serialize(graph)` → 落盘用的字符串（`JSON.stringify(…, null, 2)` + 尾随换行），改动记录复用同一口径。
 * 被 require 时**不执行** `main`、不写盘、不改 `process.exitCode`。
 */
module.exports = {
  TOOL,
  TOOL_VERSION,
  GRAPH_REL,
  GRAPH_SCHEMA_VERSION,
  PREVIOUS_SCHEMA_VERSIONS,
  TEXT_EXTENSIONS,
  EXCLUDED_PREFIXES,
  buildGraph,
  serialize,
  universeHashOf,
};

if (require.main === module) main(process.argv.slice(2));
