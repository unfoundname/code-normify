#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/generate-file-ledger.cjs
 * 全仓文件台账生成器（file-ledger generator）——增量 1 的写入侧
 * ---------------------------------------------------------------------------
 * 职责：重算 ledger/file-ledger.json 的**机器可算部分**，并保留**人写的部分**。
 *   · 人写：meta.generated_at / meta.known_divergences / exempt_patterns（pattern + reason + since +
 *     broad_confirmed）—— 豁免必须由人写明理由，生成器**绝不**自动新增豁免条目；
 *   · 机器算：meta.tracked_total / meta.universe_hash / grandfathered（原清单里仍然未归属且未豁免的存量路径）。
 *
 * 棘轮（只减不增）的落点：grandfathered **只保留原本就在清单里、且仍然满足条件的路径**——
 *   · 本次新出现的未归属路径**绝不进清单**（它会被门禁报成 unowned/error，这正是棘轮的牙齿）；
 *   · 已经 bound（被模块 source.path 精确声明且真实存在）的路径不再进清单；
 *   · 已经命中豁免模式的路径不再进清单；
 *   · 已经从 git 索引消失的路径不再进清单（自动剔除腐烂条目）；
 *   · 因此「往清单里手加一条」无法靠生成器洗白：加进来的条目下次生成会被剔除。
 *
 * **棘轮基线 = HEAD 版台账**（`git show HEAD:ledger/file-ledger.json`，本增量新增）：
 *   原先把「原本就在清单里」理解成「在工作区那份台账里」，于是人只要把一条**已在 git 索引里**、
 *   又未被模块声明、也不命中豁免的路径手工写进 grandfathered 再 `git add`，keep-only 规则就会
 *   认为它「原本就在清单里」而保留——生成器与门禁双双报绿（实测过的洗白后门）。现在基线取
 *   **提交后不可被工作区改动影响**的 HEAD 版台账：工作区多出来的条目一律被重算剔除，
 *   于是 `--check` 在链上直接红（门禁侧另有一条 grandfathered-growth 与之同口径）。
 *   · 只允许集合缩小：`next.grandfathered ⊆ HEAD 版 grandfathered`。
 *   · **首次引入的一次性初始化语义**：HEAD 里没有该文件（或仓库尚无提交）时，基线退回索引 blob、
 *     再退回工作区那份，`--check` **exit 0**（不许红）——`git commit` 之后 HEAD 就有了基线，
 *     此后任何新增都会被拦。
 *   · HEAD 里有该文件却读不出 / 不是合法 JSON / 缺 grandfathered 数组 → **抛错**（fail-closed）：
 *     写坏或删掉 HEAD 版台账绝不能变成新的洗白路径。
 *
 *   写入侧不变量：输出仍然满足门禁（门禁以**索引 blob** 为判定基准）。因此人写部分（meta 其余字段、
 *   exempt_patterns）也取自同一份基线（HEAD 优先）；代价是工作区里**尚未提交**的新豁免条目不会被
 *   生成器保留——它必须先 `git add` / 提交。这正是有意的：豁免必须走人写 + 提交，机器不代按确认键。
 *
 *   历史缺口（增量 1 实测，已在 2026-10-05 修复）：本生成器原先把 grandfathered **全量重算**为
 *   「所有既未 bound 也未豁免的已跟踪文件」，于是「新增一个无归属文件 → 跑一次生成器」会把这个
 *   新路径自动写进 grandfathered，门禁随之由红转绿——与「只减不增」的文档**逐字矛盾**。
 *   现在改为「只保留基线清单里的条目」，上述洗白路径不复存在。
 *   第二个历史缺口（同日第二批修复）：基线原本是**工作区那份被改过的台账**，于是「手工加一条在
 *   索引里的路径 + git add」这条洗白路径仍然成立；现在基线是 HEAD 版台账（见上）。
 *
 * 台账宇宙：git 索引（`git ls-files`）。生成器只写台账文件本身，不碰其它任何文件。
 *
 * 与 scripts/check-file-ledger.cjs 的关系：生成器是写入侧，门禁是只读校验侧；
 *   两者共用同一套模式语义（** / * / ?）与同一套四态判定。门禁照抄本脚本的产物，
 *   不做任何「自动修复」——CI 里只跑门禁，绝不自动改台账。
 *
 * 行尾口径（＝ scripts/check-file-ledger.cjs 的 ledger-index-drift 口径，2026-10-05 修复）：
 *   本脚本原先用裸字符串 `!==` 比较「重新生成结果」与台账文件原文，于是 Windows 上
 *   core.autocrlf=true 把工作区台账检出成 CRLF 时，`--check` 会对一个内容一字不差的台账报红
 *   （Linux CI 上索引与工作区全为 LF 却绿）——而链尾的 check:ledger 明确「只差行尾不算漂移」，
 *   两道门禁口径不一致，代价是新克隆在 Windows 上第 9 环必红。现在比较前两侧统一归一到 LF：
 *   行尾是检出配置（core.autocrlf / .gitattributes）的产物，不是台账内容。
 *   代价与边界：`--check` 因此**不再**能发现「工作区台账被写成 CRLF」这件事本身；这是有意容忍——
 *   写入侧恒输出 LF，索引 blob 也恒为 LF（门禁以索引 blob 为判定基准），
 *   所以这一容忍只放过行尾，不放过任何内容差异（缩进 / 键序 / 空白 / 数字仍然逐字符比较）。
 *
 * `--check` 的比较基准（同日第二批修复）：**git 索引 blob**（`git show :<台账>`），索引里没有
 *   该台账时才退回工作区文件。判据两条——
 *     ① 棘轮：索引版 grandfathered ⊆ HEAD 版 grandfathered（**任何新增 → exit 1**；集合缩小合法，不报红）；
 *     ② 陈旧：索引版台账（grandfathered 之外的部分）必须等于重新生成的结果。
 *   原先进比的是工作区那份，于是「手工把条目加进**索引版**台账 + git add 而工作区不动」会让本步报绿
 *   ——2026-10-05 实测确认（索引 29 条 vs 重算 29 条：条数相同、内容不同，旧实现看不出差别）。
 *   写盘路径同样加了这道闸：输出恒为「基线清单 ∩ 索引版清单 ∩ 当前条件」，手工新增条目在第一次重算
 *   就被剔除并点名（否则「写盘 → git add」会把洗白固化下来）。
 *
 * 退出码：
 *   0  生成成功（内容有变化才写盘；内容一致时不动文件，只报告一致）
 *   1  生成失败（git 不可用 / 台账不可解析 / yaml 不可用 / 模块文件读不到）
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

const TOOL = 'generate-file-ledger';
const TOOL_VERSION = '1.2.0';

/** 台账数据文件（相对仓库根，posix）。 */
const LEDGER_REL = 'ledger/file-ledger.json';

const LEDGER_SCHEMA_VERSION = 1;
const PROJECT_PREFIX = 'normify-';
const PROJECT_DIR_EXCLUDES = ['skills/'];

/**
 * 豁免模式「命中率超阈值」的人工确认字段（与 scripts/check-file-ledger.cjs 的
 * PATTERN_BROAD_CONFIRM_FIELD 同名同义）。生成器只**保留**它，绝不自动生成：
 * 这个字段的语义就是「人按下了确认键」，机器代按等于取消确认。
 */
const BROAD_CONFIRM_FIELD = 'broad_confirmed';

const relPosix = (p) => p.split(path.sep).join('/');
const absOf = (root, rel) => path.join(root, ...rel.split('/'));
const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const foldCase = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);

/**
 * 行尾归一化（只用于「台账原文 vs 重新生成结果」比对）：
 * 索引 blob 恒为 LF，而 Windows 上 core.autocrlf=true（本仓库无 .gitattributes）检出的是 CRLF——
 * 只差行尾不算不一致，否则新克隆一跑 `--check` 就假红（Linux CI 却绿，等于制造平台差异）。
 * 与 scripts/check-file-ledger.cjs 的 normalizeEol 同名同义（其 ledger-index-drift 检查同口径）。
 */
const normalizeEol = (s) => s.replace(/\r\n/g, '\n');

function execGit(root, args) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** 取某个 git 对象里的台账原文（`HEAD:<rel>` / `:<rel>`）。失败返回 null，不抛：调用方要分「不存在」与「读不到」。 */
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
 *   · 'worktree'   索引里也没有 → 退回工作区文件（首次引入且还没 git add，与旧行为一致）；
 *   · 'unreadable' HEAD 里有该文件却读不出 / 不是合法 JSON → **fail-closed**（调用方抛错，不静默回退）；
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

/** 解析基线台账文本 → JSON 对象；失败抛错（结构非法同样抛，绝不按「空清单」放过）。 */
function parseBaseline(text, source) {
  let parsed;
  try {
    parsed = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch (err) {
    throw new Error(`台账数据文件不可解析（来源 ${source}）：${LEDGER_REL}（${err.message}）`);
  }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.exempt_patterns) || !Array.isArray(parsed.grandfathered)) {
    throw new Error(`台账结构非法（缺 exempt_patterns / grandfathered 数组，来源 ${source}）：${LEDGER_REL}`);
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
        ? `棘轮基线 = HEAD 版台账（${result.baseline.shortSha} 共 ${result.baseline.grandfathered} 条）：只允许集合缩小，新增即红\n`
        : `棘轮基线 = ${baselineSourceLabel(result.baseline.source)}（共 ${result.baseline.grandfathered} 条）` +
          '——**首次引入的一次性初始化**：基线由本次提交建立，提交之后任何新增都会被拦\n';
    if (opts.check) {
      if (result.changed) {
        const detail = [];
        if (result.additions.length > 0) {
          detail.push(`  索引版台账相对 HEAD 基线**新增** grandfathered ${result.additions.length} 条（只减不增：这就是手工洗白）：`);
          for (const rel of result.additions.slice(0, 8)) detail.push(`    + ${rel}`);
          if (result.additions.length > 8) detail.push(`    + …还有 ${result.additions.length - 8} 条`);
          detail.push(
            '    合法修法只有两条：让某个模块用 source.path 精确声明它；或在 exempt_patterns 里加一条带 reason 的',
            '    模式豁免。不适用就把这些条目从台账里删掉（清单不是欠账，只是不再增长）。',
          );
        }
        if (result.stale) {
          detail.push('  索引版台账（grandfathered 之外的部分）与重新生成的结果不一致：索引清单变了或台账陈旧。');
        }
        process.stderr.write(
          `${TOOL}: 台账与重新生成的结果不一致（${LEDGER_REL}；比较基准 = ` +
            `${result.comparedWith === 'index' ? 'git 索引 blob' : '工作区文件（索引里没有台账）'}）。\n` +
            `  ${baselineLine}` +
            `  台账 tracked_total=${result.before.total} · 重算 tracked_total=${result.after.total}\n` +
            `  台账 grandfathered=${result.before.grandfathered} 条 · 重算 ${result.after.grandfathered} 条\n` +
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
    process.stdout.write(
      `${TOOL}: ${result.changed ? `已写出 ${LEDGER_REL}` : `${LEDGER_REL} 与重新生成的结果一致，未改动文件`}\n` +
        `  ${baselineLine}` +
        `  宇宙 = git ls-files ${result.after.total} 条 · universe_hash ${result.after.hash.slice(0, 16)}…\n` +
        `  bound ${result.after.bound} · exempt-pattern ${result.after.exempt} · grandfathered ${result.after.grandfathered}\n` +
        `  自动剔除的腐烂条目 ${result.removed.length} 条` +
        (result.removed.length > 0 ? `：\n${result.removed.map((r) => `    - ${r.rel}（${r.why}）`).join('\n')}` : '') +
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
    `${TOOL} v${TOOL_VERSION} — 全仓文件台账生成器（增量 1 写入侧）`,
    '',
    '用法：',
    '  node scripts/generate-file-ledger.cjs [选项]',
    '',
    '选项：',
    '  --root <dir>    指定仓库根（默认：本脚本所在仓库的 git 顶层目录）；非 git 根 → 报错退出 1',
    '  --check         只比较不写盘：台账与重新生成的结果一致 → 0，否则 1',
    '                  比较基准 = **git 索引 blob**（`git show :ledger/file-ledger.json`，与门禁同基准）；',
    '                  索引里没有该台账时才退回工作区文件。两侧行尾先归一到 LF（只差行尾不算不一致）。',
    '                  红线两条：① 索引版 grandfathered 相对 HEAD 基线**有新增**（手工洗白）；',
    '                  ② 索引版台账其余部分与重新生成的结果不一致（陈旧 / 手改）。集合缩小是合法的。',
    '  -h, --help      打印本帮助',
    '',
    '退出码：0 成功 / 1 生成失败（含 --check 不一致）/ 2 用法错误',
    '',
    '生成器只重算「机器可算」的部分：',
    `  · meta.tracked_total / meta.universe_hash —— 台账宇宙 = git ls-files（${LEDGER_REL}）`,
    '  · grandfathered —— 只保留**棘轮基线**里「仍然既未被模块 source.path 精确声明、也未命中豁免模式、',
    '    且仍在 git 索引里」的条目（只减不增）；本次新出现的未归属路径**不会**被写进清单。',
    '人写的部分取自同一份基线并保留（生成器绝不自动新增豁免）：',
    '  · meta.generated_at / meta.known_divergences / meta.byte_basis / meta.coverage_basis',
    `  · exempt_patterns（pattern + reason + since + ${BROAD_CONFIRM_FIELD}，reason 必填；先 git add / 提交）`,
    '',
    '棘轮：grandfathered 只减不增——',
    '  · 棘轮基线 = **HEAD 版台账**（`git show HEAD:ledger/file-ledger.json`，提交后不可被工作区改动影响）。',
    '    判据 = `next.grandfathered ⊆ HEAD 版 grandfathered`：允许集合缩小（删条目不是违规），',
    '    **任何新增都会让 `--check` exit 1**（手工洗白的拦截点），并逐条点名新增了哪些路径。',
    '  · 已 bound / 已豁免 / 已从索引消失的条目会被自动剔除（腐烂条目不进新台账）；',
    '    新增未归属文件不会进清单，而是被 scripts/check-file-ledger.cjs 报成 unowned/error。',
    '  · **首次引入的一次性初始化语义**：HEAD 里没有该文件（`git show HEAD:...` 找不到）或仓库尚无提交时，',
    '    基线退回索引 blob、再退回工作区那份，`--check` **exit 0**（不许红）；`git commit` 之后 HEAD 就有了',
    '    基线，此后任何新增都会被拦。HEAD 里有该文件却读不出 / 不是合法 JSON / 缺 grandfathered 数组 →',
    '    生成失败（exit 1，fail-closed）：写坏或删掉 HEAD 版台账不能变成洗白路径。',
    '  · 与门禁的分工：本脚本（`--check`）查「台账还是不是机器可算出来的那一份」（比较基准 = 索引 blob，',
    '    与门禁同基准）；scripts/check-file-ledger.cjs 的 grandfathered-growth 同口径查「相对 HEAD 有没有',
    '    新增」（error）。两道门禁都不放过「手工往 grandfathered 加条目」这条洗白路径。',
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

function compilePattern(pattern) {
  if (typeof pattern !== 'string' || pattern.length === 0) return null;
  if (/[[\]{}]/.test(pattern)) return null;
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const source = escaped
    .split('**')
    .map((chunk) => chunk.split('*').join('[^/]*').split('?').join('[^/]'))
    .join('.*');
  try {
    return new RegExp(`^${source}$`);
  } catch {
    return null;
  }
}

function extractFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== '---') return null;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') return lines.slice(1, i).join('\n');
  }
  return null;
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

  for (const [index, entry] of previous.exempt_patterns.entries()) {
    if (!entry || typeof entry.pattern !== 'string' || !entry.pattern) {
      throw new Error(`台账豁免条目缺 pattern：exempt_patterns[${index}]`);
    }
    if (typeof entry.reason !== 'string' || entry.reason.trim() === '') {
      throw new Error(`台账豁免条目缺 reason：exempt_patterns[${index}]（pattern=${entry.pattern}）`);
    }
    if (entry[BROAD_CONFIRM_FIELD] !== undefined && typeof entry[BROAD_CONFIRM_FIELD] !== 'boolean') {
      throw new Error(`台账豁免条目 ${BROAD_CONFIRM_FIELD} 必须是布尔值：exempt_patterns[${index}]（pattern=${entry.pattern}）`);
    }
  }

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
  for (const rel of tracked) if (!lowerTrackedMap.has(foldCase(rel))) lowerTrackedMap.set(foldCase(rel), rel);
  const universeHash = crypto.createHash('sha256').update(`${tracked.join('\n')}\n`, 'utf8').digest('hex');

  // ---- 2. 模块声明 → bound 集合 ----
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

  const boundFiles = new Set();
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
      const trackedRel = trackedSet.has(declared) ? declared : lowerTrackedMap.get(foldCase(declared)) || null;
      if (!trackedRel) continue;
      let isFile = false;
      try {
        isFile = fs.lstatSync(absOf(root, trackedRel)).isFile();
      } catch {
        isFile = false;
      }
      if (isFile) boundFiles.add(trackedRel);
    }
  }

  // ---- 3. grandfathered 重算（只减不增：只保留**基线（HEAD 版）**清单里的条目，绝不吸收本次新出现的未归属路径） ----
  // 关键不变量：next ⊆ 基线清单。新出现的未归属文件不会因为「跑了一次生成器」就被追认为存量，
  // 它必须继续被门禁报成 unowned/error（棘轮的牙齿）。手工加进台账的条目同样不属于基线，
  // 因此会被这里剔除 → `--check` 在链上直接红（门禁侧的 grandfathered-growth 与之同口径）。
  // 要合法化只有两条路：让模块声明它，或往 exempt_patterns 里加一条带 reason 的模式（都需要人写东西）。
  const previousGrandfathered = new Set(previous.grandfathered);
  const patterns = previous.exempt_patterns.map((entry) => ({ entry, re: compilePattern(entry.pattern) }));
  const grandfathered = [];
  let exemptCount = 0;
  for (const rel of tracked) {
    if (boundFiles.has(rel)) continue;
    const hit = patterns.find((p) => p.re && p.re.test(rel));
    if (hit) {
      exemptCount += 1;
      continue;
    }
    if (!previousGrandfathered.has(rel)) continue; // ← 本次新出现的未归属路径：绝不进清单
    grandfathered.push(rel);
  }

  // 被自动剔除的旧条目（可操作信息）
  const grandfatheredSet = new Set(grandfathered);
  const removed = [];
  for (const rel of previous.grandfathered) {
    if (grandfatheredSet.has(rel)) continue;
    let why;
    if (!trackedSet.has(rel)) why = '已从 git 索引消失';
    else if (boundFiles.has(rel)) why = '已经 bound';
    else if (patterns.some((p) => p.re && p.re.test(rel))) why = '已命中豁免模式';
    else why = '重复条目';
    removed.push({ rel, why });
  }

  // ---- 4. 保留人写部分，写出 ----
  // 人写部分取自**同一份基线**（HEAD 优先），理由：输出必须仍然满足门禁（门禁以索引 blob 为判定基准）。
  // 代价：工作区台账里尚未提交的新豁免条目不会被保留——它要先 git add / 提交（豁免必须人写 + 提交）。
  const meta = { ...(previous.meta || {}) };
  meta.tracked_total = tracked.length;
  meta.universe_hash = universeHash;

  // ---- 5. 写出目标：**索引版台账里相对基线新增的 grandfathered 条目一律剔除** ----
  // 为什么改写盘内容也要看索引（2026-10-05 实测缺口）：只看 HEAD 基线时，手工条目若已 `git add`，
  // 生成器会把它当基线内的存量保留，于是「写盘 → git add → --check」这条链反而把洗白固化了。
  // 现在输出恒为「基线清单 ∩ 索引版清单 ∩ 当前条件」，手工新增条目在**首次重算**就被剔除并点名。
  // 注意：绝不因此报 error —— 生成器的职责是重算，拦截由 `--check`（exit 1）与门禁（error）负责。
  const indexBlobForGuard = readGitBlob(root, `:${LEDGER_REL}`);
  const indexLedger = parseMaybeLedger(indexBlobForGuard.ok ? indexBlobForGuard.text : null);
  const indexGrandfathered = indexLedger && Array.isArray(indexLedger.grandfathered) ? indexLedger.grandfathered : null;
  const unbaselined = [];
  let effectiveGrandfathered = grandfathered;
  if (indexGrandfathered !== null) {
    const indexSet = new Set(indexGrandfathered);
    const dropped = grandfathered.filter((rel) => !indexSet.has(rel));
    if (dropped.length > 0) {
      const droppedSet = new Set(dropped);
      effectiveGrandfathered = grandfathered.filter((rel) => !droppedSet.has(rel));
      for (const rel of dropped) {
        unbaselined.push({
          rel,
          why: previousGrandfathered.has(rel)
            ? '索引版台账里没有它（手工删过又加回 / 未同步）'
            : 'HEAD 基线里没有它（手工洗白：索引版台账新增了这条）',
        });
      }
    }
  }

  const next = {
    schema_version: LEDGER_SCHEMA_VERSION,
    meta,
    exempt_patterns: previous.exempt_patterns.map((entry) => {
      const out = { pattern: entry.pattern, reason: entry.reason };
      if (entry.since !== undefined) out.since = entry.since;
      // 人工确认字段原样保留（true / false 都保留，避免「删掉确认」这种静默动作）。
      if (entry[BROAD_CONFIRM_FIELD] !== undefined) out[BROAD_CONFIRM_FIELD] = entry[BROAD_CONFIRM_FIELD];
      return out;
    }),
    grandfathered: [...effectiveGrandfathered].sort(byCodePoint),
  };

  const serialized = `${JSON.stringify(next, null, 2)}\n`;
  // 比较基准（本增量第二轮修复，与门禁「判定基准 = git 索引」对齐）：
  //   · --check：比**索引 blob**；索引里没有该台账时才退回工作区文件。判据有两条——
  //     ① 棘轮：索引版 grandfathered ⊆ HEAD 版 grandfathered（**任何新增 → 不一致 → exit 1**；
  //        集合缩小是合法的，不会因此报红）；
  //     ② 陈旧：索引版台账（grandfathered 之外的部分）必须等于重新生成的结果。
  //     历史缺口：原先进比的是**工作区**那份，于是「手工把条目加进索引版台账 + git add 而工作区不动」
  //     会让本步报绿——实测确认过（索引 29 条 vs 重算 29 条，条数相同、内容不同）。
  //   · 写盘：比**工作区**那份（写入目标），决定是否写文件。
  // 两侧行尾先归一到 LF（与 check-file-ledger.cjs 的 ledger-index-drift 同口径）：
  // Windows 上 core.autocrlf=true 会把工作区台账检出成 CRLF，裸比较会把「内容一字不差」判成 changed。
  const worktreeText = fs.readFileSync(ledgerAbs, 'utf8');
  const worktreeMatches = normalizeEol(serialized) === normalizeEol(worktreeText);
  const cap = (ledger) => `${JSON.stringify({ ...ledger, grandfathered: [] }, null, 2)}\n`;
  const worktreeCapMatches =
    parseMaybeLedger(worktreeText) !== null &&
    normalizeEol(cap(parseMaybeLedger(worktreeText))) === normalizeEol(cap(next));
  const indexCapMatches = indexLedger !== null && normalizeEol(cap(indexLedger)) === normalizeEol(cap(next));

  let additions = [];
  let stale = false;
  if (opts.check) {
    if (indexLedger !== null) {
      if (indexGrandfathered !== null) {
        const headSet = new Set(previous.grandfathered);
        additions = indexGrandfathered.filter((rel) => !headSet.has(rel));
      }
      stale = !indexCapMatches;
    } else {
      additions = [];
      stale = !worktreeCapMatches;
    }
  }
  const changed = opts.check ? additions.length > 0 || stale : !worktreeMatches;
  if (!opts.check && !worktreeMatches) fs.writeFileSync(ledgerAbs, serialized, 'utf8');

  return {
    changed,
    removed,
    unbaselined,
    /** --check 的比较基准：'index'（索引里有台账，门禁的判定基准）/ 'worktree'（索引里没有，退回工作区）。 */
    comparedWith: opts.check && indexLedger !== null ? 'index' : 'worktree',
    /** 相对 HEAD 基线的新增条目（`--check` 的红线就是它非空）。 */
    additions,
    /** `--check` 另一条红线：台账（grandfathered 之外的部分）与重新生成的结果不一致（陈旧/手改）。 */
    stale,
    // 棘轮基线的来源（回显用）：'head' 正常基线 / 'index'、'worktree'、'no-head' = 首次引入的一次性初始化。
    baseline: {
      source: baseline.source,
      shortSha: baseline.shortSha || null,
      grandfathered: previous.grandfathered.length,
    },
    before: { total: previous.meta ? previous.meta.tracked_total : null, grandfathered: previous.grandfathered.length },
    after: {
      total: tracked.length,
      hash: universeHash,
      bound: boundFiles.size,
      exempt: exemptCount,
      grandfathered: grandfathered.length,
    },
  };
}

main(process.argv.slice(2));
