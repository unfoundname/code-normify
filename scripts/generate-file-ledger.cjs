#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/generate-file-ledger.cjs
 * 全仓文件台账生成器（file-ledger generator）——增量 1 的写入侧；schema_version 2
 * ---------------------------------------------------------------------------
 * 职责：重算 ledger/file-ledger.json 的**机器可算部分**，并保留**人写的部分**。
 *   · 人写：meta.*（除 tracked_total / universe_hash）/ accounted 清单里每条的 accounted_at 与 basis；
 *   · 机器算：meta.tracked_total / meta.universe_hash / accounted 的**集合**（哪些路径仍然留在清单里）。
 *   · 豁免清单是**另一份独立文件**（ledger/exempt.gitignore，gitignore 语法 + 每条必填理由），
 *     由人写、由门禁与生成器共同读取，本生成器**只读不写**（豁免必须人写 + 提交，机器不代按确认键）。
 *
 * 四态词汇（v2，与 scripts/check-file-ledger.cjs / scripts/file-ledger-core.cjs 同源）：
 *   owned      被某个模块的 source.path 精确声明，且该路径是真实存在的已跟踪普通文件；
 *   exempt     命中独立豁免清单 ledger/exempt.gitignore 的某条模式；
 *   accounted  ledger/file-ledger.json 的 accounted 清单（每条 { path, accounted_at, basis }）；
 *   unowned    三类之外 → 门禁报 error（已跟踪但无条目即 error，包括刚提交的文件）。
 *   判定由 core.classifyTracked 统一实现——门禁与生成器共用同一份，保证两道门禁不互相矛盾。
 *
 * 棘轮（只减不增）的落点：accounted **只保留原本就在清单里、且仍然满足条件的路径**——
 *   · 本次新出现的无条目路径**绝不进清单**（它会被门禁报成 unowned/error，这正是棘轮的牙齿）；
 *   · 已经 owned（被模块 source.path 精确声明且真实存在）的路径不再进清单；
 *   · 已经命中豁免模式的路径不再进清单；
 *   · 已经从 git 索引消失的路径不再进清单（自动剔除腐烂条目）；
 *   · 因此「往清单里手加一条」无法靠生成器洗白：加进来的条目不会被保留——写盘模式下点名 + 拒绝写盘 + exit 1。
 *
 * **棘轮基线 = HEAD 版台账**（`git show HEAD:ledger/file-ledger.json`）：
 *   原先把「原本就在清单里」理解成「在工作区那份台账里」，于是人只要把一条**已在 git 索引里**、
 *   又未被模块声明、也不命中豁免的路径手工写进清单再 `git add`，keep-only 规则就会
 *   认为它「原本就在清单里」而保留——生成器与门禁双双报绿（实测过的洗白后门）。现在基线取
 *   **提交后不可被工作区改动影响**的 HEAD 版台账：工作区多出来的条目一律被重算剔除，
 *   于是 `--check` 在链上直接红（门禁侧另有一条 accounted-growth 与之同口径）。
 *   · 只允许集合缩小：`next.accounted ⊆ HEAD 版 accounted`。
 *   · **首次引入的一次性初始化语义**：HEAD 里没有该文件（或仓库尚无提交）时，基线退回索引 blob、
 *     再退回工作区那份，`--check` **exit 0**（不许红）——`git commit` 之后 HEAD 就有了基线，
 *     此后任何新增都会被拦。
 *   · HEAD 里有该文件却读不出 / 不是合法 JSON / **schema_version 不匹配** / 缺 accounted 数组 → **抛错**
 *     （fail-closed）：写坏、删掉或只升一半版本的 HEAD 版台账绝不能变成新的洗白路径。
 *     「版本不匹配直接 error」是有意的：台账数据、门禁、生成器、豁免清单必须**同一次提交**一起改。
 *
 *   写入侧不变量：输出仍然满足门禁（门禁以**索引 blob** 为判定基准）。因此人写部分（meta 其余字段、
 *   accounted 的日期与依据）也取自同一份基线（HEAD 优先）；代价是工作区里**尚未提交**的新豁免条目
 *   不会被生成器保留——它必须先 `git add` / 提交。这正是有意的：豁免必须走人写 + 提交。
 *
 *   历史缺口（增量 1 实测，已在 2026-10-05 修复）：本生成器原先把 grandfathered **全量重算**为
 *   「所有既未 owned 也未豁免的已跟踪文件」，于是「新增一个无条目文件 → 跑一次生成器」会把这个
 *   新路径自动写进清单，门禁随之由红转绿——与「只减不增」的文档**逐字矛盾**。
 *   现在改为「只保留基线清单里的条目」，上述洗白路径不复存在。
 *   第二个历史缺口（同日第二批修复）：基线原本是**工作区那份被改过的台账**，于是「手工加一条在
 *   索引里的路径 + git add」这条洗白路径仍然成立；现在基线是 HEAD 版台账（见上）。
 *   第三个历史缺口（本批修复，写盘模式的静默自愈）：写盘模式原本把「索引版/工作区台账里有、而 HEAD
 *   基线里没有」的 accounted 条目**静默剔除**——报告还写着「剔除的**非基线**条目 0 条」（那个计数只覆盖
 *   反方向：重算结果有、索引版没有），退出码 0。危害窗口是「手工加条目 → 跑生成器（自愈）→ git add
 *   台账 → 不跑 check:ledger:gen 就提交」，事后全链绿，洗白被固化。现在写盘模式一旦检出这类
 *   **相对 HEAD 基线的非法新增**，就**逐条点名 + 拒绝写盘 + exit 1**：本仓的既定哲学是 fail-closed、
 *   宁可红不假绿——生成器的职责是重算机器可算的部分，但它绝不能替一条非法条目做静默自愈；
 *   拒绝写盘还能保证「跳过 --check 直接提交」拿不到被洗干净的台账，必须由人先处理。
 *
 * 台账宇宙：git 索引（`git ls-files`）。生成器只写台账文件本身，不碰其它任何文件
 *   （豁免清单、门禁脚本都不由它写）。
 *
 * 与 scripts/check-file-ledger.cjs 的关系：生成器是写入侧，门禁是只读校验侧；
 *   两者共用 scripts/file-ledger-core.cjs 的同一套模式语义（** / * / ?，gitignore 的 `!` 反选）
 *   与同一套四态判定。门禁照抄本脚本的产物，不做任何「自动修复」——CI 里只跑门禁，绝不自动改台账。
 *
 * 行尾口径（＝ scripts/check-file-ledger.cjs 的 ledger-index-drift 口径）：
 *   两侧比较前统一归一到 LF：行尾是检出配置（core.autocrlf / .gitattributes）的产物，不是台账内容。
 *   Windows 上 core.autocrlf=true 会把工作区台账检出成 CRLF，不归一的话新克隆在第 9 环必然假红，
 *   而 Linux CI 全绿。代价：`--check` 不发现「工作区台账被写成 CRLF」这件事本身（写入侧恒输出 LF，
 *   索引 blob 也恒为 LF）。
 *
 * `--check` 的比较是**索引 blob 解析后的字段比较**（实测：把索引版台账整体重排缩进后 `--check` 仍 exit 0）：
 *   缩进 / 空白 / 行尾的差异不报红；键序（JSON.parse 保留文件里的键序、重算时原样带出）与任何一个
 *   字段值的差异仍会报红。写盘模式另有一条**原文比较**（工作区那份 vs 重算序列化结果，只归一行尾），
 *   缩进不同在那条路径上会让它写盘。
 *
 * `--check` 的比较基准：**git 索引 blob**（`git show :<台账>`），索引里没有该台账时才退回工作区文件。
 *   判据两条——
 *     ① 棘轮：索引版 accounted 的**路径集合** ⊆ HEAD 版 accounted 的路径集合（**任何新增 → exit 1**；
 *        集合缩小合法，不报红）；
 *     ② 陈旧：索引版台账（accounted 之外的部分）必须等于重新生成的结果。
 *
 * 退出码：
 *   0  生成成功（内容有变化才写盘；内容一致时不动文件，只报告一致）
 *   1  生成失败（git 不可用 / 台账或豁免清单不可解析 / 结构与版本不符 / yaml 不可用 / 模块文件读不到），
 *      以及**写盘模式检出「相对 HEAD 基线的非法新增 accounted 条目」→ 点名 + 拒绝写盘**（见上）
 *   2  命令行用法错误
 *
 * 用法：node scripts/generate-file-ledger.cjs [--root <dir>] [--check] [--help]
 *   --check  只比较不写盘：台账与「重新生成的结果」一致 → 0，否则 1（CI 可用它防手改）。
 *            比较前两侧行尾归一到 LF：只差行尾（Windows 检出）不算不一致。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

/** 共享内核（唯一事实来源）：与 scripts/check-file-ledger.cjs 用的是同一份实现。 */
const core = require('./file-ledger-core.cjs');

const TOOL = 'generate-file-ledger';
const TOOL_VERSION = '1.3.0';

/** 台账数据文件（相对仓库根，posix）。 */
const LEDGER_REL = core.LEDGER_REL;
/** 独立豁免清单（相对仓库根，posix）：只读输入，本脚本不写它。 */
const EXEMPT_REL = core.EXEMPT_REL;

const LEDGER_SCHEMA_VERSION = core.LEDGER_SCHEMA_VERSION;
const PROJECT_PREFIX = 'normify-';
const PROJECT_DIR_EXCLUDES = ['skills/'];

const relPosix = core.relPosix;
const absOf = core.absOf;
const byCodePoint = core.byCodePoint;
const normalizeEol = core.normalizeEol;
const execGit = core.execGit;

/** 取某个 git 对象里的文件原文（`HEAD:<rel>` / `:<rel>`）。失败返回 { ok:false }，不抛：调用方要分「不存在」与「读不到」。 */
function readGitBlob(root, revColonRel) {
  try {
    const buf = execFileSync('git', ['-c', 'core.quotePath=false', 'show', revColonRel], {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { ok: true, text: buf.toString('utf8') };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

/**
 * 取棘轮基线台账（**HEAD 版优先**，与 scripts/check-file-ledger.cjs 的 readHeadLedger 同口径）：
 *   · 'head'       HEAD 里有该文件 → 正常基线（返回 { shortSha }，用于回显）；
 *   · 'index'      HEAD 里没有该文件（首次引入的一次性初始化）→ 退回索引 blob；
 *   · 'worktree'   索引里也没有 → 退回工作区文件（首次引入且还没 git add）；
 *   · 'unreadable' HEAD 里有该文件却读不出 → **fail-closed**（调用方抛错，不静默回退）；
 *   · 'no-head'    仓库尚无提交（哈希不存在）→ 与 'index' 同档（一次性初始化）。
 * 「HEAD 里没有这个条目」用 `git cat-file -e HEAD:<rel>` 单独问一次，不猜 git show 的失败原因。
 */
function readBaselineLedger(root) {
  let headSha = null;
  try {
    headSha = execGit(root, ['rev-parse', '--verify', '--short', 'HEAD^{commit}']).trim();
  } catch {
    headSha = null;
  }
  if (headSha === null) return readFromIndexOrWorktree(root, 'no-head');

  const headBlob = readGitBlob(root, `HEAD:${LEDGER_REL}`);
  if (!headBlob.ok) {
    let inHead;
    try {
      execGit(root, ['cat-file', '-e', `HEAD:${LEDGER_REL}`]);
      inHead = true;
    } catch {
      inHead = false;
    }
    if (inHead) return { source: 'unreadable', message: `git show HEAD:${LEDGER_REL} 失败：${headBlob.message}` };
    return readFromIndexOrWorktree(root, headSha);
  }
  return { source: 'head', text: headBlob.text, shortSha: headSha };
}

/** HEAD 里没有台账时的回退链（索引 blob → 工作区文件）：这是一次性初始化，不是洗白路径。 */
function readFromIndexOrWorktree(root, shortSha) {
  const indexBlob = readGitBlob(root, `:${LEDGER_REL}`);
  if (indexBlob.ok) return { source: 'index', text: indexBlob.text, shortSha };
  if (shortSha === 'no-head') return { source: 'no-head', text: null, shortSha: null };
  try {
    return { source: 'worktree', text: fs.readFileSync(absOf(root, LEDGER_REL), 'utf8'), shortSha };
  } catch (err) {
    return { source: 'file-missing', message: err.message, shortSha };
  }
}

/**
 * 解析基线台账文本 → JSON 对象；失败抛错（结构非法、版本不符同样抛，绝不按「空清单」放过）。
 * 版本检查放在这里（而不是只在门禁里）：让「只升一半版本」的提交在写入侧就直接失败。
 */
function parseBaseline(text, source) {
  let parsed;
  try {
    parsed = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch (err) {
    throw new Error(`台账数据文件不可解析（来源 ${source}）：${LEDGER_REL}（${err.message}）`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`台账结构非法（顶层必须是对象，来源 ${source}）：${LEDGER_REL}`);
  }
  if (parsed.schema_version !== LEDGER_SCHEMA_VERSION) {
    throw new Error(
      `台账 schema_version=${JSON.stringify(parsed.schema_version)}，本生成器要求 ${LEDGER_SCHEMA_VERSION}` +
        `（来源 ${source}）：结构变了必须显式升级，不做静默兼容——台账数据、门禁、生成器、豁免清单` +
        '必须**同一次提交**一起改。',
    );
  }
  if (!Array.isArray(parsed.accounted)) {
    throw new Error(`台账结构非法（缺 accounted 数组，来源 ${source}）：${LEDGER_REL}`);
  }
  if (!parsed.meta || typeof parsed.meta !== 'object' || parsed.meta.exempt_file !== EXEMPT_REL) {
    throw new Error(
      `台账 meta.exempt_file 必须是 ${EXEMPT_REL}（来源 ${source}，实际 ${JSON.stringify(
        parsed.meta ? parsed.meta.exempt_file : undefined,
      )}）：豁免清单的位置不许悄悄换。`,
    );
  }
  return parsed;
}

/** 宽松解析（用于「索引/工作区那份台账」的比对）：解析不了就返回 null，由调用方决定如何报错。 */
function parseMaybeLedger(text) {
  if (typeof text !== 'string') return null;
  try {
    const parsed = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * 读独立豁免清单：**索引 blob 优先**（与门禁的判定基准同源），索引里没有时才退回工作区文件。
 * 为什么索引优先而不是 HEAD 优先：豁免清单不是本生成器的产物，它是**输入**；门禁按索引版判定，
 * 生成器必须按同一份判定，否则「门禁绿而 --check 红」这类互相矛盾会在链上出现。
 * 语法问题（缺 reason / 未知字段 / 值非法）一律抛错：豁免是放宽门禁，必须留痕，绝不猜。
 */
function readExemptList(root) {
  const indexBlob = readGitBlob(root, `:${EXEMPT_REL}`);
  let text = null;
  let source = null;
  if (indexBlob.ok) {
    text = indexBlob.text;
    source = 'index';
  } else {
    const abs = absOf(root, EXEMPT_REL);
    try {
      text = fs.readFileSync(abs, 'utf8');
      source = 'worktree';
    } catch (err) {
      throw new Error(
        `豁免清单不可用：${EXEMPT_REL}（git show :${EXEMPT_REL} 失败：${indexBlob.message}；` +
          `工作区读取也失败：${err.message}）——豁免清单是判定依据之一，读不到就不生成（fail-closed）。`,
      );
    }
  }
  const parsed = core.parseExemptFile(text, EXEMPT_REL);
  if (parsed.problems.length > 0) {
    const lines = parsed.problems.slice(0, 8).map((p) => `    - 第 ${p.line} 行：${p.message}`);
    if (parsed.problems.length > 8) lines.push(`    - …还有 ${parsed.problems.length - 8} 处`);
    throw new Error(
      `豁免清单 ${EXEMPT_REL} 有 ${parsed.problems.length} 处语法问题（来源 ${source}）：\n${lines.join('\n')}\n` +
        '  每条豁免必须写成 `<pattern> ## reason=<非空理由> [ ## since=YYYY-MM-DD ] [ ## broad_confirmed=true|false ]`。',
    );
  }
  return { entries: parsed.entries, source };
}

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n运行 \`node scripts/generate-file-ledger.cjs --help\` 查看用法。\n`);
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

  try {
    const result = regenerate(root, opts);
    const baselineLine =
      result.baseline.source === 'head'
        ? `棘轮基线 = HEAD 版台账（${result.baseline.shortSha} 共 ${result.baseline.accounted} 条）：只允许集合缩小，新增即红\n`
        : `棘轮基线 = ${baselineSourceLabel(result.baseline.source)}（共 ${result.baseline.accounted} 条）` +
          '——**首次引入的一次性初始化**：基线由本次提交建立，提交之后任何新增都会被拦\n';
    if (opts.check) {
      if (result.changed) {
        const detail = [];
        if (result.additions.length > 0) {
          detail.push(`  索引版台账相对 HEAD 基线**新增** accounted ${result.additions.length} 条（只减不增：这就是手工洗白）：`);
          for (const rel of result.additions.slice(0, 8)) detail.push(`    + ${rel}`);
          if (result.additions.length > 8) detail.push(`    + …还有 ${result.additions.length - 8} 条`);
          detail.push(
            `    合法修法只有两条：让某个模块用 source.path 精确声明它；或在 ${EXEMPT_REL} 里加一条带 reason 的`,
            '    模式豁免。不适用就把这些条目从台账里删掉（清单不是欠账，只是不再增长）。',
          );
        }
        if (result.stale) {
          detail.push('  索引版台账（accounted 之外的部分）与重新生成的结果不一致：索引清单变了、豁免清单变了，或台账陈旧。');
        }
        process.stderr.write(
          `${TOOL}: 台账与重新生成的结果不一致（${LEDGER_REL}；比较基准 = ` +
            `${result.comparedWith === 'index' ? 'git 索引 blob' : '工作区文件（索引里没有台账）'}）。\n` +
            `  ${baselineLine}` +
            `  台账 tracked_total=${result.before.total} · 重算 tracked_total=${result.after.total}\n` +
            `  台账 accounted=${result.before.accounted} 条 · 重算 ${result.after.accounted} 条\n` +
            detail.join('\n') +
            '\n  修法：node scripts/generate-file-ledger.cjs（然后 git add ledger/file-ledger.json）\n',
        );
        process.exitCode = 1;
        return;
      }
      process.stdout.write(
        `${TOOL}: 台账与重新生成的结果一致（${LEDGER_REL}；比较基准 = ` +
          `${result.comparedWith === 'index' ? 'git 索引 blob' : '工作区文件（索引里没有台账）'}）。\n  ${baselineLine}`,
      );
      process.exitCode = 0;
      return;
    }
    if (result.refused) {
      // 写盘模式的 fail-closed：检出非法新增 → 点名 + 拒绝写盘 + exit 1。
      const list = result.nonBaselineAdditions;
      const lines = list.slice(0, 8).map((rel) => `    + ${rel}`);
      if (list.length > 8) lines.push(`    + …还有 ${list.length - 8} 条`);
      process.stderr.write(
        `${TOOL}: **拒绝写盘**：索引版 / 工作区版台账里有 ${list.length} 条 accounted 条目不在 HEAD 基线里` +
          `（只减不增：新增即手工洗白），本次**没有改写** ${LEDGER_REL}。\n` +
          `  ${baselineLine}` +
          `${lines.join('\n')}\n` +
          '  为什么直接红：静默自愈会把洗白固化——「手工加条目 → 跑生成器 → git add → 不跑 check:ledger:gen 就提交」\n' +
          '  事后全链绿，谁也不会发现。写盘模式宁可红也不替一条非法条目做自愈（本仓既定哲学：fail-closed）。\n' +
          '  合法修法只有两条：① 让某个模块用 source.path 精确声明该路径（→ owned）；' +
          `② 在 ${EXEMPT_REL} 里加一条带 reason 的模式豁免（→ exempt）。\n` +
          `  两条都不适用：把新增条目从 ${LEDGER_REL} > accounted 里删掉` +
          `（或 git checkout -- ${LEDGER_REL} 取回索引/提交版），再重跑本脚本。\n`,
      );
      process.exitCode = 1;
      return;
    }
    process.stdout.write(
      `${TOOL}: ${result.changed ? `已写出 ${LEDGER_REL}` : `${LEDGER_REL} 与重新生成的结果一致，未改动文件`}\n` +
        `  ${baselineLine}` +
        `  宇宙 = git ls-files ${result.after.total} 条 · universe_hash ${result.after.hash.slice(0, 16)}…\n` +
        `  豁免清单 = ${EXEMPT_REL}（来源 ${result.exemptSource} · 大小写语义 core.ignoreCase=${result.ignoreCase}· ${result.after.exemptPatterns} 条模式）\n` +
        `  owned ${result.after.owned} · exempt ${result.after.exempt} · accounted ${result.after.accounted}\n` +
        `  自动剔除的腐烂条目 ${result.removed.length} 条` +
        (result.removed.length > 0 ? `：\n${result.removed.map((r) => `    - ${r.path}（${r.why}）`).join('\n')}` : '') +
        '\n' +
        `  剔除的**非基线**条目 ${result.unbaselined.length} 条` +
        (result.unbaselined.length > 0
          ? `（HEAD 基线里没有它 → 生成器不追认；门禁与本脚本的 --check 都会红）：\n` +
            `${result.unbaselined.map((r) => `    - ${r.rel}（${r.why}）`).join('\n')}\n`
          : '\n'),
    );
    process.exitCode = 0;
  } catch (err) {
    process.stderr.write(`${TOOL}: 生成失败：${err.message}\n`);
    process.exitCode = 1;
  }
}

/** 基线来源的中文标签（--check 与写盘两条路径共用，避免两处措辞漂移）。 */
function baselineSourceLabel(source) {
  if (source === 'index') return '索引版台账（HEAD 里没有该文件）';
  if (source === 'worktree') return '工作区台账（HEAD 与索引里都没有该文件）';
  if (source === 'no-head') return '索引/工作区台账（仓库尚无提交）';
  return source;
}

function parseArgs(argv) {
  const opts = { root: null, check: false, help: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check') opts.check = true;
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

function printHelp() {
  const lines = [
    `${TOOL} v${TOOL_VERSION} — 全仓文件台账生成器（增量 1 写入侧；schema_version ${LEDGER_SCHEMA_VERSION}）`,
    '',
    '用法：',
    '  node scripts/generate-file-ledger.cjs [选项]',
    '',
    '选项：',
    '  --root <dir>    指定仓库根（默认：本脚本所在仓库的 git 顶层目录）；非 git 根 → 报错退出 1',
    '  --check         只比较不写盘：台账与重新生成的结果一致 → 0，否则 1',
    '                  比较基准 = **git 索引 blob**（`git show :ledger/file-ledger.json`，与门禁同基准）；',
    '                  索引里没有该台账时才退回工作区文件。两侧行尾先归一到 LF（只差行尾不算不一致）。',
    '                  红线两条：① 索引版 accounted 的路径集合相对 HEAD 基线**有新增**（手工洗白）；',
    '                  ② 索引版台账其余部分与重新生成的结果不一致（陈旧 / 手改）。集合缩小是合法的。',
    '  -h, --help      打印本帮助',
    '',
    '退出码：0 成功 / 1 生成失败（含 --check 不一致、写盘模式拒绝写盘）/ 2 用法错误',
    '',
    '生成器只重算「机器可算」的部分：',
    `  · meta.tracked_total / meta.universe_hash —— 台账宇宙 = git ls-files（${LEDGER_REL}）`,
    '  · accounted —— 只保留**棘轮基线**里「仍然既未被模块 source.path 精确声明、也未命中豁免模式、',
    '    且仍在 git 索引里」的条目（只减不增）；本次新出现的无条目路径**不会**被写进清单。',
    '人写的部分取自同一份基线并保留（生成器绝不自动新增豁免）：',
    '  · meta.generated_at / meta.known_divergences / meta.byte_basis / meta.coverage_basis / meta.accounted_basis',
    `  · accounted 每条的 accounted_at（清点日期）与 basis（清点依据）——缺依据的条目不是记账，直接失败`,
    `  · 豁免清单是**独立文件** ${EXEMPT_REL}（gitignore 语法 + 每条必填 reason；本脚本只读不写）`,
    '',
    '四态（判定由 scripts/file-ledger-core.cjs 统一实现，与门禁逐字一致）：',
    '  owned / exempt / accounted 是绿灯的三条来路；unowned（已跟踪但无条目）→ 门禁 error。',
    '',
    '棘轮：accounted 只减不增——',
    '  · 棘轮基线 = **HEAD 版台账**（`git show HEAD:ledger/file-ledger.json`，提交后不可被工作区改动影响）。',
    '    判据 = `next.accounted ⊆ HEAD 版 accounted`：允许集合缩小（删条目不是违规），',
    '    **任何新增都会让 `--check` exit 1**（手工洗白的拦截点），并逐条点名新增了哪些路径。',
    '  · 已 owned / 已豁免 / 已从索引消失的条目会被自动剔除（腐烂条目不进新台账）；',
    '    新增无条目文件不会进清单，而是被 scripts/check-file-ledger.cjs 报成 unowned/error。',
    '  · **写盘模式也拦非法新增**：索引版 / 工作区版台账里若有「不在 HEAD 基线里」的 accounted 条目，',
    '    本脚本**逐条点名 + 拒绝写盘 + exit 1**（不静默自愈：否则「加条目 → 跑生成器 → git add →',
    '    不跑 --check 就提交」会把洗白固化）。合法修法只有两条：模块 source.path 声明（owned）、',
    `    或 ${EXEMPT_REL} 加一条带 reason 的豁免（exempt）。`,
    '  · **首次引入的一次性初始化语义**：HEAD 里没有该文件（`git show HEAD:...` 找不到）或仓库尚无提交时，',
    '    基线退回索引 blob、再退回工作区那份，`--check` **exit 0**（不许红）；`git commit` 之后 HEAD 就有了',
    '    基线，此后任何新增都会被拦。HEAD 里有该文件却读不出 / 不是合法 JSON / schema_version 不匹配 /',
    '    缺 accounted 数组 → 生成失败（exit 1，fail-closed）：写坏或只升一半版本的台账不能变成洗白路径。',
    '  · 与门禁的分工：本脚本（`--check`）查「台账还是不是机器可算出来的那一份」（比较基准 = 索引 blob，',
    '    与门禁同基准）；scripts/check-file-ledger.cjs 的 accounted-growth 同口径查「相对 HEAD 有没有',
    '    新增」（error）。两道门禁都不放过「手工往 accounted 加条目」这条洗白路径。',
    '',
    `豁免清单（${EXEMPT_REL}，只读输入）：`,
    '  <pattern> ## reason=<非空理由> [ ## since=YYYY-MM-DD ] [ ## broad_confirmed=true|false ]',
    '  · gitignore 语法：`**` / `*` / `?`，`!` 反选（顺序敏感，最后命中的条目说了算），`#` 整行注释；',
    '  · 缺 reason / 未知字段 / 值非法 → 生成失败（exit 1）：豁免必须人写理由，机器不代按确认键；',
    '  · 本脚本按**索引版**读取它（与门禁的判定基准同源），索引里没有时才退回工作区文件。',
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

function resolveRoot(explicit) {
  if (explicit !== null && explicit !== undefined) {
    const abs = path.resolve(process.cwd(), explicit);
    if (!fs.existsSync(abs)) throw new Error(`--root 指向的目录不存在：${abs}（已 fail-closed，不回退）`);
    return abs;
  }
  try {
    const out = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (out) return path.resolve(out);
  } catch {
    /* 落到下面报错 */
  }
  throw new Error(`无法定位仓库根目录（cwd=${process.cwd()}，git rev-parse --show-toplevel 失败）`);
}

function loadYaml(root) {
  const tried = [];
  for (const base of [root, path.resolve(__dirname, '..'), __dirname]) {
    try {
      const resolved = require.resolve('yaml', { paths: [base] });
      const mod = require(resolved);
      if (mod && typeof mod.parse === 'function') return mod;
      tried.push(`${base}: 模块存在但没有 parse`);
    } catch (err) {
      tried.push(`${base}: ${(err && err.code) || '解析失败'}`);
    }
  }
  throw new Error(`解析不到 yaml（模块 frontmatter 解析必需；试过：${tried.join('；')}）`);
}

function extractFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== '---') return null;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') return lines.slice(1, i).join('\n');
  }
  return null;
}

/** accounted 条目的规范形态（字段顺序固定 = 逐字节稳定的前提）；未知字段原样保留在后面。 */
function canonicalAccountedEntry(entry) {
  const out = { path: entry.path, accounted_at: entry.accounted_at, basis: entry.basis };
  for (const [key, value] of Object.entries(entry)) {
    if (key in out) continue;
    out[key] = value;
  }
  return out;
}

function regenerate(root, opts) {
  const ledgerAbs = absOf(root, LEDGER_REL);

  // ---- 0. 基线台账：HEAD 版优先（棘轮基线不可篡改），HEAD 无该文件时才退回索引/工作区 ----
  const baseline = readBaselineLedger(root);
  if (baseline.source === 'unreadable') {
    throw new Error(
      `HEAD 版台账不可用作棘轮基线：${baseline.message}\n` +
        `  （fail-closed：写坏或删掉 HEAD 版 ${LEDGER_REL} 不能变成洗白路径；` +
        '先修好它，或按「首次引入」重新提交一份干净台账）',
    );
  }
  if (baseline.source === 'file-missing' || baseline.text === null) {
    throw new Error(`台账数据文件不存在：${LEDGER_REL}（期望 ${ledgerAbs}）；生成器不会凭空创建它（人写部分无法推导）`);
  }
  const previous = parseBaseline(baseline.text, baseline.source);

  // accounted 的字段级校验：缺 accounted_at / basis 的条目不是记账 —— 生成器同样 fail-closed。
  const accountedProblems = core.validateAccountedEntries(previous.accounted);
  if (accountedProblems.length > 0) {
    const lines = accountedProblems.slice(0, 8).map((p) => `    - ${p.message}`);
    if (accountedProblems.length > 8) lines.push(`    - …还有 ${accountedProblems.length - 8} 条`);
    throw new Error(
      `台账 accounted 有 ${accountedProblems.length} 条非法条目（来源 ${baseline.source}）：\n${lines.join('\n')}\n` +
        '  每条必须是 `{ path, accounted_at: "YYYY-MM-DD", basis: "清点依据" }`：没有依据的条目不是记账，是洗白。',
    );
  }

  // ---- 0b. 独立豁免清单（索引优先；只读输入，本脚本不写它） ----
  const exempt = readExemptList(root);
  const ignoreCase = core.readIgnoreCase(root);
  const matchers = core.buildExemptMatchers(exempt.entries, { ignoreCase: ignoreCase === 'true' });

  // ---- 1. 宇宙：git 索引 ----
  let tracked;
  try {
    tracked = execGit(root, ['ls-files', '-z'])
      .split('\0')
      .filter(Boolean)
      .map(relPosix)
      .sort(byCodePoint);
  } catch (err) {
    throw new Error(`git ls-files 执行失败：${err.message}`);
  }
  const trackedSet = new Set(tracked);
  const lowerTrackedMap = new Map();
  for (const rel of tracked) if (!lowerTrackedMap.has(foldCaseLocal(rel))) lowerTrackedMap.set(foldCaseLocal(rel), rel);
  const universeHash = crypto.createHash('sha256').update(`${tracked.join('\n')}\n`, 'utf8').digest('hex');

  // ---- 2. 模块声明 → owned 集合 ----
  const yaml = loadYaml(root);
  const projectDirs = new Set();
  for (const rel of tracked) {
    const segments = rel.split('/');
    for (let i = 0; i < segments.length - 1; i += 1) {
      if (!segments[i].startsWith(PROJECT_PREFIX)) continue;
      const dirRel = segments.slice(0, i + 1).join('/');
      if (PROJECT_DIR_EXCLUDES.some((prefix) => dirRel.startsWith(prefix))) continue;
      projectDirs.add(dirRel);
    }
  }
  const projectDirList = [...projectDirs].sort(byCodePoint);

  const ownedFiles = new Set();
  for (const rel of tracked) {
    const dir = path.posix.dirname(rel);
    if (!dir.endsWith('/modules') && !dir.includes('/modules/')) continue;
    if (path.posix.extname(rel).toLowerCase() !== '.md') continue;
    if (!projectDirList.some((projectDir) => rel.startsWith(`${projectDir}/`))) continue;

    let text;
    try {
      text = fs.readFileSync(absOf(root, rel), 'utf8');
    } catch (err) {
      throw new Error(`模块文件读不到：${rel}（${err.message}）`);
    }
    const frontmatter = extractFrontmatter(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
    if (frontmatter === null) throw new Error(`模块文件没有 frontmatter（首行不是 ---）：${rel}`);
    let data;
    try {
      data = yaml.parse(frontmatter);
    } catch (err) {
      throw new Error(`模块 frontmatter 不是合法 YAML：${rel}（${err.message}）`);
    }
    const source = data ? data.source : undefined;
    if (source === undefined || source === null) continue;
    if (!Array.isArray(source)) throw new Error(`模块的 source 不是数组：${rel}`);
    for (const entry of source) {
      const declared = entry && typeof entry === 'object' ? entry.path : undefined;
      if (typeof declared !== 'string' || declared === '') continue;
      if (path.posix.isAbsolute(declared) || /[\\:\x00-\x1f]/.test(declared)) continue;
      if (declared.split('/').some((part) => part === '' || part === '.' || part === '..')) continue;
      const trackedRel = trackedSet.has(declared) ? declared : lowerTrackedMap.get(foldCaseLocal(declared)) || null;
      if (!trackedRel) continue;
      let isFile = false;
      try {
        isFile = fs.lstatSync(absOf(root, trackedRel)).isFile();
      } catch {
        isFile = false;
      }
      if (isFile) ownedFiles.add(trackedRel);
    }
  }

  // ---- 3. accounted 重算（只减不增：只保留**基线（HEAD 版）**清单里的条目，绝不吸收本次新出现的无条目路径） ----
  // 关键不变量：next ⊆ 基线清单。新出现的无条目文件不会因为「跑了一次生成器」就被追认为存量，
  // 它必须继续被门禁报成 unowned/error（棘轮的牙齿）。手工加进台账的条目同样不属于基线，
  // 因此会被这里剔除 → `--check` 在链上直接红（门禁侧的 accounted-growth 与之同口径）。
  // 要合法化只有两条路：让模块声明它，或往豁免清单里加一条带 reason 的模式（都需要人写东西）。
  // 判定本身与门禁**共用** core.classifyTracked：同一份输入必须给出逐字相同的四态。
  const classified = core.classifyTracked({
    tracked,
    ownedSet: ownedFiles,
    accountedEntries: previous.accounted,
    matchers,
  });
  const previousByPath = new Map(previous.accounted.map((entry) => [entry.path, entry]));
  const accounted = classified.states.accounted.map((rel) => canonicalAccountedEntry(previousByPath.get(rel)));

  // 被自动剔除的旧条目（可操作信息）：腐烂判据与门禁共用 core.accountedRot。
  const removed = core.accountedRot({
    trackedSet,
    ownedSet: ownedFiles,
    matchers,
    accountedEntries: previous.accounted,
  });

  // ---- 4. 保留人写部分，写出 ----
  // 人写部分取自**同一份基线**（HEAD 优先），理由：输出必须仍然满足门禁（门禁以索引 blob 为判定基准）。
  // 代价：工作区台账里尚未提交的新豁免条目不会被保留——它要先 git add / 提交（豁免必须人写 + 提交）。
  const meta = { ...previous.meta };
  meta.tracked_total = tracked.length;
  meta.universe_hash = universeHash;

  // ---- 5. 写出目标：**索引版台账里相对基线新增的 accounted 条目一律剔除** ----
  // 为什么改写盘内容也要看索引：只看 HEAD 基线时，手工条目若已 `git add`，
  // 生成器会把它当基线内的存量保留，于是「写盘 → git add → --check」这条链反而把洗白固化了。
  // 现在输出恒为「基线清单 ∩ 索引版清单 ∩ 当前条件」，手工新增条目在**首次重算**就被剔除并点名；
  // 写盘模式下这还会**拒绝写盘 + exit 1**（见下面的 5a 与 main 的 refused 分支）——不给静默自愈留口子。
  const indexBlobForGuard = readGitBlob(root, `:${LEDGER_REL}`);
  const indexLedger = parseMaybeLedger(indexBlobForGuard.ok ? indexBlobForGuard.text : null);
  // 比较基准本身也要可信：索引版台账里的 accounted 条目缺 accounted_at / basis 时，`--check` 的
  // 「一致」会变成给一条没有依据的条目背书。生成器不会替它补依据（那等于代写依据），直接失败。
  if (indexLedger && Array.isArray(indexLedger.accounted)) {
    const indexProblems = core.validateAccountedEntries(indexLedger.accounted);
    if (indexProblems.length > 0) {
      const lines = indexProblems.slice(0, 8).map((p) => `    - ${p.message}`);
      if (indexProblems.length > 8) lines.push(`    - …还有 ${indexProblems.length - 8} 条`);
      throw new Error(
        `索引版台账（比较基准）的 accounted 有 ${indexProblems.length} 条非法条目：\n${lines.join('\n')}\n` +
          '  每条必须是 `{ path, accounted_at: "YYYY-MM-DD", basis: "清点依据" }`：没有依据的条目不是记账，是洗白。\n' +
          `  修法：把 accounted 条目补全（生成器不会代写依据），或用 git checkout -- ${LEDGER_REL} 恢复索引版台账后重跑。`,
      );
    }
  }
  const indexAccountedPaths =
    indexLedger && Array.isArray(indexLedger.accounted)
      ? indexLedger.accounted
          .map((entry) => (entry && typeof entry === 'object' && typeof entry.path === 'string' ? entry.path : null))
          .filter(Boolean)
      : null;
  const previousPaths = new Set(previous.accounted.map((entry) => entry.path));

  // ---- 5a. 「相对 HEAD 基线的非法新增」检出（写盘模式也必须拦，不能静默自愈） ----
  // 判定对象 = **索引版 ∪ 工作区版**台账的 accounted 路径：两份都可能被人先改过
  // （改工作区那份还没 git add 的、以及已经 git add 的），只查一份都会漏。
  // 只要有一条不在 HEAD 基线里 → 它就是手工加进来的（合法路径只有「模块声明 owned」与「豁免 exempt」，
  // 两条都不经过 accounted）。检出后写盘模式**拒绝写盘**并 exit 1，由 main 点名报出。
  const worktreeLedgerText = (() => {
    try {
      return fs.readFileSync(ledgerAbs, 'utf8');
    } catch {
      return null;
    }
  })();
  const worktreeLedger = parseMaybeLedger(worktreeLedgerText);
  const worktreeAccountedPaths =
    worktreeLedger && Array.isArray(worktreeLedger.accounted)
      ? worktreeLedger.accounted
          .map((entry) => (entry && typeof entry === 'object' && typeof entry.path === 'string' ? entry.path : null))
          .filter(Boolean)
      : [];
  const nonBaselineAdditions = [...new Set([...(indexAccountedPaths || []), ...worktreeAccountedPaths])]
    .filter((rel) => !previousPaths.has(rel))
    .sort((a, b) => byCodePoint(a, b));
  // 索引版台账与工作区版不一致（改了没 git add）由门禁的 ledger-index-drift 负责；这里只用两份的**并集**
  // 做「有没有非法新增」的判定，不改变任何既有判定基准（--check 的唯一基准仍是索引 blob）。

  const unbaselined = [];
  let effectiveAccounted = accounted;
  if (indexAccountedPaths !== null) {
    const indexSet = new Set(indexAccountedPaths);
    const dropped = accounted.filter((entry) => !indexSet.has(entry.path));
    if (dropped.length > 0) {
      const droppedSet = new Set(dropped.map((entry) => entry.path));
      effectiveAccounted = accounted.filter((entry) => !droppedSet.has(entry.path));
      for (const entry of dropped) {
        unbaselined.push({
          rel: entry.path,
          why: previousPaths.has(entry.path)
            ? '索引版台账的 accounted 里没有它（合法缩小后未同步 / 手工改写）'
            : 'HEAD 基线里没有它（手工洗白：索引版台账新增了这条）',
        });
      }
    }
  }

  const next = {
    schema_version: LEDGER_SCHEMA_VERSION,
    meta,
    accounted: [...effectiveAccounted].sort((a, b) => byCodePoint(a.path, b.path)),
  };

  const serialized = `${JSON.stringify(next, null, 2)}\n`;
  // 比较基准（与门禁「判定基准 = git 索引」对齐）：
  //   · --check：比**索引 blob**；索引里没有该台账时才退回工作区文件。判据有两条——
  //     ① 棘轮：索引版 accounted 路径集合 ⊆ HEAD 版 accounted 路径集合（**任何新增 → 不一致 → exit 1**；
  //        集合缩小是合法的，不会因此报红）；
  //     ② 陈旧：索引版台账（accounted 之外的部分）必须等于重新生成的结果。
  //   · 写盘：比**工作区**那份（写入目标），决定是否写文件。
  // 两侧行尾先归一到 LF（与 check-file-ledger.cjs 的 ledger-index-drift 同口径）。
  const worktreeText = fs.readFileSync(ledgerAbs, 'utf8');
  const worktreeMatches = normalizeEol(serialized) === normalizeEol(worktreeText);
  const cap = (ledger) => `${JSON.stringify({ ...ledger, accounted: [] }, null, 2)}\n`;
  const worktreeCapMatches =
    parseMaybeLedger(worktreeText) !== null &&
    normalizeEol(cap(parseMaybeLedger(worktreeText))) === normalizeEol(cap(next));
  const indexCapMatches = indexLedger !== null && normalizeEol(cap(indexLedger)) === normalizeEol(cap(next));

  let additions = [];
  let stale = false;
  if (opts.check) {
    if (indexLedger !== null) {
      if (indexAccountedPaths !== null) {
        additions = indexAccountedPaths.filter((rel) => !previousPaths.has(rel));
      }
      stale = !indexCapMatches;
    } else {
      additions = [];
      stale = !worktreeCapMatches;
    }
  }
  const changed = opts.check ? additions.length > 0 || stale : !worktreeMatches;
  // 写盘模式的两条闸门：
  //   ① 检出「相对 HEAD 基线的非法新增」→ **拒绝写盘**（refused）：静默自愈会把洗白固化
  //      （手工加条目 → 跑生成器 → git add → 不跑 --check 就提交，事后全链绿）；
  //   ② 其余情况按需写盘（内容一致时不动文件）。
  const refused = !opts.check && nonBaselineAdditions.length > 0;
  if (!opts.check && !worktreeMatches && !refused) fs.writeFileSync(ledgerAbs, serialized, 'utf8');

  return {
    changed,
    removed,
    unbaselined,
    /** 写盘模式是否**拒绝写盘**（检出相对 HEAD 基线的非法新增条目）：main 据此报 error + exit 1。 */
    refused,
    /** 相对 HEAD 基线、却出现在索引版/工作区版台账里的非法新增路径（写盘模式同样点名）。 */
    nonBaselineAdditions,
    /** --check 的比较基准：'index'（索引里有台账，门禁的判定基准）/ 'worktree'（索引里没有，退回工作区）。 */
    comparedWith: opts.check && indexLedger !== null ? 'index' : 'worktree',
    /** 相对 HEAD 基线的新增条目（`--check` 的红线就是它非空）。 */
    additions,
    /** `--check` 另一条红线：台账（accounted 之外的部分）与重新生成的结果不一致（陈旧/手改）。 */
    stale,
    /** 豁免清单的读取来源（回显用）：'index' 正常 / 'worktree' 索引里没有该文件。 */
    exemptSource: exempt.source,
    ignoreCase,
    // 棘轮基线的来源（回显用）：'head' 正常基线 / 'index'、'worktree'、'no-head' = 首次引入的一次性初始化。
    baseline: {
      source: baseline.source,
      shortSha: baseline.shortSha || null,
      accounted: previous.accounted.length,
    },
    before: { total: previous.meta ? previous.meta.tracked_total : null, accounted: previous.accounted.length },
    after: {
      total: tracked.length,
      hash: universeHash,
      owned: classified.states.owned.length,
      exempt: classified.states.exempt.length,
      accounted: accounted.length,
      exemptPatterns: matchers.length,
    },
  };
}

/**
 * 生成器侧的路径折叠（与 core.foldCase 同义）。core 未导出 foldCase 时保持本地实现，
 * 保证「大小写不一致的声明仍能找到索引里的真实条目」这条既有行为不变。
 */
function foldCaseLocal(p) {
  return process.platform === 'win32' ? p.toLowerCase() : p;
}

main(process.argv.slice(2));
