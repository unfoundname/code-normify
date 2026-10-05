#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/check-file-ledger.cjs
 * 全仓文件台账门禁（file-ledger guard）——增量 1（文件级，不做行级）
 * ---------------------------------------------------------------------------
 * 目的：让「这个文件有没有人管」变成可断言的机器事实。
 *
 * 为什么需要它（历史缺口，实测）：把一个已跟踪、且没有任何模块声明的文件放进仓库，
 * `validateProject` 对它**零提及**——引擎只回答「哪个模块漂移了」，从不回答
 * 「哪些文件没人管」。唯一近似的 normify_sync「新文件建议」只看**未跟踪**文件，
 * 还用 IGNORE_DIR 主动排除 lib/（src/tools.ts:988-993），而 lib/ 有 84 个**已跟踪**文件，
 * 不是 gitignore 覆盖物：按「构建产物」把它排除掉会丢掉全仓相当一部分已跟踪文件。
 *
 * 四态归属（每个已跟踪文件必须落到且只落到一类，四类计数之和必须等于 git ls-files 条数）：
 *   bound          被某个模块的 source.path **精确声明**，且该路径是仓库里真实存在的普通文件；
 *   exempt-pattern 命中台账 exempt_patterns 里的某条豁免模式（每条必带 reason）；
 *   grandfathered  在台账 grandfathered 清单里的存量未归属文件（**只减不增**，基线与判据见下一段）；
 *   unowned        不在上面三类里的已跟踪文件 → **error**（新增文件必须归属或显式豁免）。
 *
 * 绿灯依据只有一条：**台账里有条目**（owned / exempt / accounted 三条来路）。
 *   「在 HEAD 里」**不是**绿灯理由（文件旧 ≠ 已记账）；祖父清单**不是欠账**，那 29 条是
 *   2026-10-05 会话审计 + 十环门禁全绿时已清点记账的**正账**，只是这条清单不再增长。
 *
 * planned 与 bound 分离（本门禁最容易被做成假绿的地方）：
 *   `source.path` 的声明分两种事实——「声明写在那里」与「目标真的存在」。当前仓库
 *   1924 条声明全部指向**不存在的目标路径**（计划态），因此 bound 必须是 0，
 *   覆盖率必须报 0.00%。把 planned 算成已覆盖会让覆盖率从 0% 假跳到 100%，
 *   所以报告里 planned/bound/existing/untracked 四个数分开回显，绝不合并。
 *
 * 棘轮语义：grandfathered **只减不增**。清单里已经变成 bound/exempt 的路径、
 * 以及已经从索引消失的路径，都必须从清单里删掉；本门禁对这类腐烂条目报 warning，
 * 并在报告里回显「祖父清单还可再减 N 条」这种可操作信息（而不是只给一个总数）。
 *   「只减不增」的判据是**与 HEAD 版台账比对**（`git show HEAD:<台账>`，见 readHeadLedger）：
 *   旧版比的是「同一份被改过的台账」，于是人可以把一条**已在 git 索引里**、又未被模块声明、
 *   也不命中豁免的路径手工写进 grandfathered 再 `git add`，门禁与 `--check` 双双报绿（洗白后门）。
 *   现在相对 HEAD 的**任何新增 → grandfathered-growth（error）**；允许缩小。
 *   三态：HEAD 里有台账 → 正常比对；HEAD 里没有该文件（首次引入）/ 仓库尚无提交 → 本项跳过且
 *   **不许红**（一次性初始化：基线由本次提交建立）；HEAD 里有却读不出/结构非法 → error（fail-closed）。
 *
 * 豁免模式过宽（R1，防止一条模式把整个门禁静默关掉）：豁免**先于**祖父判定，
 * 所以一条过宽模式会立刻让全宇宙变成 exempt-pattern 并报 green（实测：pattern = `**`
 * 时四态显示 exempt-pattern 4 / unowned 0、退出码 0）。三条判据（前两条不可豁免）：
 *   1. 归一化（去掉 `*` `?` 与 `/`）后没有任何字面量字符 → error（`**`、`*`、`**` 后接 `/*`、`?`）；
 *   2. 通配字符（`*` `?`）占比 > PATTERN_MAX_WILDCARD_RATIO（默认 50%）→ error；
 *   3. 单条模式命中率 > PATTERN_MAX_HIT_RATIO（默认 50% 宇宙）→ error，除非该条目显式写了
 *      `"broad_confirmed": true`（人工确认这条模式确实要覆盖过半已跟踪文件）。
 *   被判过宽的模式**不参与匹配**（宁可红不假绿）：它本该吞掉的文件会落回 unowned/error。
 *
 * 判定基准：**git 索引**（`git ls-files -z`），不是工作区磁盘列举。
 *   台账宇宙 = 已跟踪文件；被忽略文件（node_modules/ 等）不在宇宙内，台账不假装覆盖它们
 *   （理由写在 ledger/file-ledger.json 的 meta.known_divergences 里）。
 *   路径「是否存在」同时看两件事：git 索引里有该条目（tracked）与磁盘上 lstat 到普通文件
 *   （regularFile）——目录不算普通文件，声明目录不会被当成「已绑定」。
 *   台账**内容**同样以索引 blob 为准（`git show :<台账>`，与 scripts/check-lib-sync.cjs 同构）：
 *   工作区台账与索引不一致 → ledger-index-drift（error）；台账不在索引里（没 git add）→ 同样 error。
 *   这一条正是为了掐掉「本地绿依赖一个未提交改动」：CI/新克隆只看得到索引内容。
 *
 * `**` 语义与标准 glob 的差异（R8，必须写明）：本门禁的 `**` 是 `.*`（**至少匹配一层**），
 *   因此 `**` 后接 `/*.md` 的写法 **不** 匹配根级 `c.md`，只匹配带目录段的路径；`*` 与 `?` 都不跨 `/`。
 *   要同时覆盖根级与任意层，请分别写 `*.md` 与 `**` 后接 `/*.md` 两条。
 *
 * 失败关闭（宁可红也不要假绿）：
 *   · 台账文件缺失 / 不可解析 / 结构非法（缺 reason、pattern 非法、清单非字符串数组）→ error；
 *   · git 不可用 / 不是 git 仓库 / 拿不到跟踪清单 → error；
 *   · yaml 不可用（解析模块 frontmatter 必需）→ error；
 *   · 模块文件读不到 / frontmatter 解析失败 → error（绝不静默跳过该模块的声明）；
 *   · HEAD 版台账读不出 / 不可解析 / 缺 grandfathered 数组 → error（基线不可用也不许静默跳过）。
 *
 * 退出码：
 *   0  通过（或只有 warning）
 *   1  存在 error 级违规，或工具链不可用
 *   2  命令行用法错误（未知参数等）
 *
 * 用法：node scripts/check-file-ledger.cjs [--json] [--root <dir>] [--help]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const TOOL = 'check-file-ledger';
const TOOL_VERSION = '1.2.0';

/** 台账数据文件（相对仓库根，posix）。唯一的新增可写数据文件。 */
const LEDGER_REL = 'ledger/file-ledger.json';

/** 台账 schema 版本；不匹配即 error（结构变了必须显式升级，不做静默兼容）。 */
const LEDGER_SCHEMA_VERSION = 1;

/** 数据目录名前缀（与 src/engine/store.ts:14 的 PROJECT_PREFIX 一致）。 */
const PROJECT_PREFIX = 'normify-';

/**
 * 被排除在「项目数据目录」之外的路径前缀。
 * `skills/normify-gen/` 目录名同样以 normify- 开头，但它是技能说明目录，不是工程数据目录
 * （下没有 modules/），若不排除会在报告里多出一条无意义的「0 声明」项目。
 */
const PROJECT_DIR_EXCLUDES = ['skills/'];

/** 单条违规里证据数组最多回显的元素个数（避免超大清单淹没报告）。 */
const EVIDENCE_LIMIT = 8;

/**
 * 豁免模式「过宽」判据的阈值（R1）。改这里必须同步改三处文字：
 * 本文件的 --help、CONTRIBUTING.md 的检查项清单、.github/workflows/ci.yml 的 File ledger 注释。
 */
/** 通配字符占比上限：`*` `?` 的个数 / pattern 长度 超过它即视为几乎没有限定作用。 */
const PATTERN_MAX_WILDCARD_RATIO = 0.5;
/** 单条模式命中率上限：命中文件数 / 台账宇宙 超过它即视为吞门禁（可用 broad_confirmed 人工确认）。 */
const PATTERN_MAX_HIT_RATIO = 0.5;
/** 命中率超阈值时的人工确认字段名（值必须是布尔 true；缺失即 error）。 */
const PATTERN_BROAD_CONFIRM_FIELD = 'broad_confirmed';

/**
 * 检查项 id → 人类可读标题。
 * **顺序即 printHelp 的编号顺序，也是本表 Object.keys() 的顺序**（--json 的 summary.checks 直接取它）。
 * 唯一事实来源：printHelp 不再自带一份编号列表，而是从本表生成。
 */
const CHECK_TITLES = {
  'unowned-file': '已跟踪但无归属、无豁免、不在祖父清单的文件（新增必须归属或显式豁免）',
  'grandfathered-removable': '祖父清单腐烂：条目已经 bound/exempt/消失，应当从清单里删掉（清单只减不增）',
  'grandfathered-growth': '祖父清单新增条目（与 HEAD 版台账比对：grandfathered 只减不增，任何新增即手工洗白）',
  'exempt-unused': '豁免模式未命中任何已跟踪文件（可能是过期规则或拼写错误）',
  'exempt-invalid': '豁免模式条目非法（缺 reason / 缺 pattern / pattern 写法不受支持）',
  'exempt-too-broad': '豁免模式过宽（无字面量 / 通配占比过高 / 命中率超阈值未人工确认）——会静默吞掉整个门禁',
  'ledger-missing': '台账数据文件缺失、不可解析或顶层结构非法',
  'ledger-index-drift': '台账内容与 git 索引不一致（工作区改动未 git add，或台账根本不在索引里）',
  'tracked-mismatch': '台账元信息与 git 索引不一致（universe_hash 对不上或 tracked_total 漂移）',
  'declared-untracked': '模块 source.path 声明的目标在磁盘上存在、却不在 git 索引里（本该 git add）',
  'guard-unavailable': '门禁自身不可用（git / yaml / 模块文件读不到）',
};

/** 每一项检查在 --help 里的补充说明（可选）。编号由 printHelp 按 CHECK_TITLES 的顺序生成。 */
const CHECK_HELP_DETAILS = {
  'unowned-file': [
    '· 判据：已跟踪 − bound − exempt-pattern − grandfathered ≠ ∅ → 逐条 error（不是计数）。',
    '· 修法二选一：让某个模块用 source.path 精确声明它；或在 ledger/file-ledger.json 里',
    '  加一条带 reason 的 exempt_patterns（模式豁免）——**不允许**往 grandfathered 里加（只减不增）。',
  ],
  'grandfathered-removable': [
    '· 清单里的路径若已经 bound、已经命中豁免、或已经从 git 索引消失 → warning 提示删除该条。',
    '· 报告回显「祖父清单还可再减 N 条」（可操作信息），清单腐烂不会被静默容忍。',
  ],
  'grandfathered-growth': [
    '· 判据：`git show HEAD:ledger/file-ledger.json` 的 grandfathered 集合 ⊇ 本次台账的 grandfathered 集合。',
    '  台账内容取**索引 blob**（与 ledger-index-drift 同基准），基线取 **HEAD 版台账**（提交后不可篡改）；',
    '  两者都与工作区磁盘无关，所以「改了索引没改工作区」同样成立。',
    '· **任何新增（含把一条曾删掉的条目重新加回）→ error**；允许集合缩小（删条目不是违规）。',
    '· 「路径在 HEAD 里」**不是**绿灯理由：旧 ≠ 已记账。手工把一条在索引里的路径写进台账 grandfathered',
    '  再 git add —— 正是本项要拦的事（旧版 keep-only 比的是同一份被改过的台账，因此会漏）。',
    '· 合法修法两条：① 让某个模块用 source.path 精确声明它；② 在 exempt_patterns 里加一条**带 reason**',
    '  的模式豁免。祖父清单**不是欠账**：里面 29 条是 2026-10-05 已清点记账的正账，只是不再增长。',
    '· 三态：HEAD 里有台账 → 正常比对；HEAD 里没有该文件（首次引入 / 仓库尚无提交）→ **本项跳过、退出码 0**，',
    '  报告明确回显「基线由本次提交建立」（一次性初始化语义，基线在 `git commit` 之后生效）；',
    '  HEAD 里有该文件却读不出 / 不是合法 JSON / 顶层结构非法 → **error**（fail-closed：删掉或写坏 HEAD 版台账',
    '  绝不能变成洗白路径）。',
  ],
  'exempt-unused': [
    '· 一条豁免模式本次没有任何已跟踪文件命中 → warning（可能是过期规则或拼写错误）。',
    '· 未被命中的豁免等于永久空白特权：它会无声地放过未来任何匹配该模式的路径。',
  ],
  'exempt-invalid': [
    '· 缺 reason / reason 非字符串 / 缺 pattern → error（豁免必须写明理由，否则等于静默放宽门禁）。',
    '· 只支持 `**`、`*`、`?` 三种通配（不支持字符类与花括号），出现其它元字符按 error 报出不猜。',
    '· 写法合法但「过宽」的模式不属于本项，见下一项 exempt-too-broad（两类分开报，修法不同）。',
  ],
  'exempt-too-broad': [
    `· 判据 1（不可豁免）：归一化（去掉 \`*\` \`?\` 与 \`/\`）后没有任何字面量字符 → error。`,
    '  例：`**`、`*`、`**/*`、`?`——豁免先于祖父判定，这类模式会把整个宇宙变成 exempt-pattern（实测假绿）。',
    `· 判据 2（不可豁免）：通配字符占比 > ${PATTERN_MAX_WILDCARD_RATIO * 100}% → error。例：\`**/*\`（4/4）。`,
    `· 判据 3（可人工确认）：单条模式命中率 > ${PATTERN_MAX_HIT_RATIO * 100}% 台账宇宙 → error，`,
    `  除非该条目显式写了 \`"${PATTERN_BROAD_CONFIRM_FIELD}": true\`（人工确认它确实要覆盖过半已跟踪文件）。`,
    '· 被判过宽的模式**不参与匹配**：它本该吞掉的文件会落回 unowned/error，绝不静默放过。',
  ],
  'ledger-missing': [
    '· 文件不存在 / 不是合法 JSON / 顶层缺字段 / 类型不符 → error，退出码 1。',
    '· 台账是门禁的唯一事实来源，读不到就无从判定，绝不降级为「跳过检查」。',
    '· 注意与 guard-unavailable 的分工：台账自身的问题报本项，git / yaml / 模块文件不可用报后者。',
  ],
  'ledger-index-drift': [
    '· 台账**内容**以 git 索引 blob 为准（`git show :ledger/file-ledger.json`，与 check-lib-sync.cjs 同构）：',
    '  工作区台账与索引版不一致（改了没 git add / 索引里有而工作区没有）→ error，判定仍按索引版进行。',
    '· 索引里根本没有这个条目（新台账没 git add）→ 同样 error：否则「本地绿」会依赖一个未提交改动，',
    '  CI 与新克隆拿到的索引内容与本地不是同一份事实。临时夹具仓库请先 `git add` 台账再跑门禁。',
    '· 另外：索引里没有、但 HEAD 里有该台账时同样报本项（type=ledger-missing-in-index）——判定基准名义上',
    '  退化为工作区副本，此时「与 HEAD 版台账比对」的棘轮基线不再取自索引；先 `git add` 回来。',
  ],
  'tracked-mismatch': [
    '· meta.universe_hash 必须等于 sha256(排序后的 git ls-files 清单)，否则台账已过期 → error。',
    '· meta.tracked_total 必须等于本次 git ls-files 的条数 → error（漂移说明宇宙变了）。',
  ],
  'declared-untracked': [
    '· 模块声明的目标在磁盘上是普通文件、却不在 git 索引里 → warning（本该 git add）。',
    '· 为什么是 warning 而不是 error：声明本身不在本仓库落地（当前全为 planned），',
    '  这条是给「将来声明落地到本仓库」准备的提醒；把它做成 error 会让既有数据无端变红。',
  ],
  'guard-unavailable': [
    '· git 不可用 / 不是 git 仓库 / `git ls-files` 失败 → error。',
    '· 解析不到 yaml（模块 frontmatter 解析必需，package.json 的生产依赖）→ error。',
    '· 模块文件读不到 / frontmatter 不是合法 YAML / source 不是数组 → error，不静默跳过。',
    '· 四态计数之和 ≠ 台账宇宙（本门禁自身的归属判定漏了或重了文件）→ error（内部不变量断言）。',
  ],
};

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

const relPosix = (p) => p.split(path.sep).join('/');

/** 把仓库相对 posix 路径落到当前操作系统的绝对路径（path.join 负责分隔符转换）。 */
const absOf = (root, rel) => path.join(root, ...rel.split('/'));

/** 执行 git（直接 exec，无 shell；`-c core.quotePath=false` + `-z` 读，跨平台一致）。 */
function execGit(root, args) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * 台账模式 → 正则。只支持 `**`（跨 `/` 任意层，**至少一层**）、`*`（不跨 `/` 任意字符）、`?`（单个非 `/` 字符）。
 * 其余元字符不猜：命中 `[`、`]`、`{`、`}` 时返回 { error }，由 exempt-invalid 报出（宁可红不假绿）。
 * 注意本语义与标准 glob 有分歧：`**` 编译成 `.*`（可空但两侧原文决定了至少一层），
 * 所以 `**` 后接 `/*.md` 的写法不匹配根级 `c.md`（见 --help 的「与标准 glob 的差异」）。
 */
function compilePattern(pattern) {
  if (typeof pattern !== 'string' || pattern.length === 0) return { error: 'pattern 必须是非空字符串' };
  if (/[[\]{}]/.test(pattern)) {
    return { error: `pattern 含不支持的元字符（只支持 ** / * / ?）：${pattern}` };
  }
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const source = escaped
    .split('**')
    .map((chunk) => chunk.split('*').join('[^/]*').split('?').join('[^/]'))
    .join('.*');
  try {
    return { re: new RegExp(`^${source}$`) };
  } catch (err) {
    return { error: `pattern 编译失败：${pattern}（${err.message}）` };
  }
}

/**
 * 「过宽模式」静态判据（R1）。返回 null 表示没命中静态判据（仍可能被命中率判据拦下）。
 * 只做两件不需要宇宙信息的事，**不接受人工确认**：这类模式没有可确认的信息量——
 * 它们一旦被接受，四态判定会立刻假绿（实测 pattern=`**` → exempt-pattern 4 / unowned 0 / exit 0）。
 *   · no-literal：去掉 `*` `?` 与 `/` 后没有剩余字符（`**`、`*`、`**` 后接 `/*`、`?`）；
 *   · wildcard-ratio：通配字符个数 / pattern 长度 > PATTERN_MAX_WILDCARD_RATIO。
 */
function patternBreadthError(pattern) {
  const wildcards = (pattern.match(/[*?]/g) || []).length;
  const literals = pattern.replace(/[*?/]/g, '').length;
  if (literals === 0) {
    return {
      kind: 'no-literal',
      message:
        `pattern 归一化后不含任何字面量字符（只有通配符与 /）：${pattern}` +
        '——豁免先于祖父判定，这种模式会把整个宇宙变成 exempt-pattern 并静默报绿',
    };
  }
  const ratio = wildcards / pattern.length;
  if (ratio > PATTERN_MAX_WILDCARD_RATIO) {
    return {
      kind: 'wildcard-ratio',
      message:
        `pattern 的通配字符占比 ${(ratio * 100).toFixed(0)}% 超过上限 ` +
        `${PATTERN_MAX_WILDCARD_RATIO * 100}%（几乎没有限定作用）：${pattern}`,
    };
  }
  return null;
}

/** Windows 下路径比对折叠大小写（跨平台约定：posix 存路径，win32 折叠大小写）。 */
const foldCase = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);

/** 码点升序（不用 localeCompare：ICU 差异会让同一份仓库在不同平台排出不同顺序）。 */
const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n运行 \`node scripts/check-file-ledger.cjs --help\` 查看用法。\n`);
    process.exitCode = 2;
    return;
  }

  if (opts.help) {
    printHelp();
    process.exitCode = 0;
    return;
  }

  const ctx = createContext(opts);
  if (ctx.bootstrapError) {
    reportGuardUnavailable(ctx, ctx.bootstrapError);
  } else {
    runLedgerChecks(ctx);
  }

  if (opts.json) printJson(ctx);
  else printHuman(ctx);

  process.exitCode = ctx.violations.some((v) => v.severity === 'error') ? 1 : 0;
}

function parseArgs(argv) {
  const opts = { json: false, help: false, root: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
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
  // 编号列表从 CHECK_TITLES 生成（唯一事实来源，避免两处顺序漂移）。
  const checkList = Object.entries(CHECK_TITLES).flatMap(([id, title], index) => [
    `  ${index + 1}. ${title}`,
    ...(CHECK_HELP_DETAILS[id] || []).map((line) => `       ${line}`),
  ]);

  const lines = [
    `${TOOL} v${TOOL_VERSION} — 全仓文件台账门禁（file-ledger guard，增量 1：文件级，不做行级）`,
    '',
    '用法：',
    '  node scripts/check-file-ledger.cjs [选项]',
    '',
    '选项：',
    '  --json          只向 stdout 输出机器可读 JSON（含 file/line/column/target/type）',
    '                  顶层 root 字段：正常时是解析后的仓库根；--root 指向非法目录时回显请求路径',
    '                  （绝不静默回退到别的仓库）；两者都取不到时为 null。',
    '  --root <dir>    指定被检查的仓库根（默认：本脚本所在仓库的 git 顶层目录）',
    '                  非仓库根（不存在 / 不是 git 根）一律 error，绝不回退到别的仓库',
    '  -h, --help      打印本帮助（不扫描任何文件，退出码 0）',
    '',
    '退出码：',
    '  0  无 error（可能有 warning）',
    '  1  存在 error 级违规，或工具链不可用（git / yaml / 台账缺失）',
    '  2  命令行用法错误',
    '',
    '四态归属（计数之和 == git ls-files 条数）：',
    `  bound            被模块 source.path 精确声明，且目标是真实存在的普通文件`,
    `  exempt-pattern   命中 ${LEDGER_REL} > exempt_patterns 的某条模式（每条必带 reason）`,
    '  grandfathered    台账 grandfathered 清单里的存量未归属文件（**只减不增**：新增 = 相对 HEAD 版台账的新增 → error）',
    '  unowned          三类之外 → error（新增文件必须归属或显式豁免）',
    '',
    'planned 与 bound 必须分开（否则覆盖率假绿）：',
    '  声明存在（planned）≠ 已覆盖（bound）。当前仓库的声明全部指向不存在的目标路径，',
    '  所以 bound 必须是 0、覆盖率必须报 0.00%；报告里 planned / bound / existing / untracked',
    '  四个数分开回显，绝不合并成一个「覆盖率」。',
    '',
    `台账数据文件：${LEDGER_REL}（豁免模式清单 + 祖父清单 + 元信息；跨平台 posix 路径）。`,
    '重新生成：node scripts/generate-file-ledger.cjs（改完仓库后必须重跑，否则 tracked-mismatch 报错）。',
    '',
    '豁免模式「过宽」判据（豁免先于祖父判定，一条过宽模式就能把门禁静默关掉）：',
    '  1. 归一化（去掉 * ? 与 /）后没有任何字面量字符 → error（不可豁免）：`**`、`*`、`**/*`、`?`；',
    `  2. 通配字符（* ?）占比 > ${PATTERN_MAX_WILDCARD_RATIO * 100}% → error（不可豁免），例：\`**/*\`；`,
    `  3. 单条模式命中率 > ${PATTERN_MAX_HIT_RATIO * 100}% 台账宇宙 → error，除非该条目写了`,
    `     "${PATTERN_BROAD_CONFIRM_FIELD}": true（人工确认它确实要覆盖过半已跟踪文件）。`,
    '  被判过宽的模式不参与匹配，它本该吞掉的文件会落回 unowned/error（宁可红不假绿）。',
    '',
    '豁免模式语义（与标准 glob 的差异，必须知道）：',
    '  `**` 至少匹配一层（编译成 `.*`），所以 `**/*.md` **不**匹配根级 c.md，只匹配带目录段的路径；',
    '  `*` 与 `?` 都不跨 `/`。要同时覆盖根级与任意层，请分别写 `*.md` 与 `**/*.md`。',
    '',
    'grandfathered 棘轮的判据（与 HEAD 版台账比对，本增量新增）：',
    `  基线 = \`git show HEAD:${LEDGER_REL}\` 的 grandfathered 集合；判定对象 = **索引版**台账的 grandfathered；`,
    '  判据 = 基线集合 ⊇ 本次集合。允许集合缩小（删条目不是违规），**任何新增（含把一条曾删掉的条目',
    '  重新加回）→ grandfathered-growth（error）**：报告逐条列出新增路径，并给出可能的合法修法。',
    '  为什么基线必须是 HEAD：旧版 keep-only 比的是「同一份被改过的台账」，于是人可以把一条**已在 git 索引里**、',
    '  又未被模块声明、也不命中豁免的路径手工写进 grandfathered 再 `git add`，门禁与 --check 双双报绿；',
    '  HEAD 版台账在提交之后不可被工作区改动影响，比对才有意义。',
    '三态语义（含首次引入的一次性初始化）：',
    '  · HEAD 里有该台账 → 正常比对（新增即 error）。',
    '  · HEAD 里没有该文件（首次引入）/ 仓库尚无提交 → **本项跳过、退出码 0**，报告明确回显',
    '    「一次性初始化：基线由本次提交建立」；提交之后 HEAD 有了基线，任何新增都会被拦住。',
    '  · HEAD 里有该文件却读不出 / 不是合法 JSON / 顶层缺 grandfathered 数组 → **error（fail-closed）**：',
    '    删掉或写坏 HEAD 版台账绝不能变成新的洗白路径。',
    '  · 索引里没有台账、HEAD 里有 → ledger-index-drift（error，type=ledger-missing-in-index）：索引基线失效。',
    '「只减不增」的准确含义（两套旧说法在此明确否掉）：',
    '  ① 「在 HEAD 里即绿」**不成立**：文件旧 ≠ 已记账，绿灯依据是**台账里有条目**；',
    '  ② 祖父清单**不是欠账**：那 29 条是 2026-10-05 会话审计 + 十环门禁全绿时**已清点记账的正账**',
    '     （清点日期与依据见台账 meta / CONTRIBUTING.md），只是这条清单**不再增长**。',
    '  合法修法只有两条：让某个模块用 source.path 精确声明它；或在 exempt_patterns 里加一条**带 reason**',
    '  的模式豁免。两条都不适用时，删掉那条新增条目即可恢复绿（而不是给清单加条目）。',
    '',
    '检查项（编号顺序 = 报告分组顺序 = --json 的 summary.checks 顺序）：',
    ...checkList,
    '',
    '判定基准：git 索引（`git ls-files`），不是工作区磁盘列举；',
    '  被忽略文件不在台账宇宙内（理由见台账 meta.known_divergences）。',
    `  台账内容同样取索引 blob（\`git show :${LEDGER_REL}\`）：工作区与索引不一致、`,
    '  或台账不在索引里（没 git add）→ ledger-index-drift（error），判定仍按索引版进行。',
    '  临时夹具仓库请先 `git add` 台账再跑本门禁。',
    `  棘轮的基线另取 \`git show HEAD:${LEDGER_REL}\`（与之比对**只读**，不改本门禁的索引判定基准）：`,
    '  索引版台账与工作区是否一致都不影响基线比对，所以「索引改了而工作区没改」同样成立。',
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

function createContext(opts) {
  const cwd = process.cwd();
  const ctx = {
    root: null,
    ledgerRel: LEDGER_REL,
    ledger: null,
    ledgerError: null,
    tracked: [],
    trackedSet: new Set(),
    lowerTrackedMap: new Map(),
    universeHash: null,
    projectDirs: [],
    modules: [],
    declarationStats: {
      modulesScanned: 0,
      modulesWithSource: 0,
      declaredRefs: 0,
      distinctDeclaredPaths: 0,
      planned: 0,
      existingFile: 0,
      existingDir: 0,
      untrackedFile: 0,
      invalid: 0,
      boundTrackedFiles: 0,
    },
    projects: [],
    states: { bound: [], 'exempt-pattern': [], grandfathered: [], unowned: [] },
    grandfatheredRemovable: [],
    /**
     * grandfathered 棘轮（与 HEAD 版台账比对）的判定结果。
     * baseline 三态：'head'（HEAD 里有台账，正常比对）/ 'absent'（HEAD 里没有该文件 = 首次引入，本项跳过）/
     * 'unreadable'（HEAD 里有但读不出或结构非法 → error，fail-closed）。added 是相对 HEAD 的新增条目。
     */
    grandfatheredGrowth: {
      baseline: null,
      headTotal: null,
      added: [],
      headErr: null,
      headParsed: null,
      headRev: null,
    },
    unusedPatterns: [],
    invalidPatterns: [],
    broadPatterns: [],
    /** 台账内容的判定基准：'index'（git 索引 blob）/ 'worktree'（索引里没有，回退读磁盘）。 */
    ledgerBasis: null,
    /** --root 请求的绝对路径（root 解析失败时用于回显请求路径，不静默回退）。 */
    requestedRoot: null,
    declaredUntracked: [],
    yamlModule: null,
    violations: [],
    dedupe: new Set(),
    bootstrapError: null,
  };

  ctx.report = (v) => {
    const key = v.dedupeKey || `${v.file}:${v.line}:${v.type}:${v.target}`;
    if (ctx.dedupe.has(key)) return;
    ctx.dedupe.add(key);
    delete v.dedupeKey;
    ctx.violations.push(v);
  };

  // --root 请求路径单独留档：root 解析失败时 --json 的顶层 root 回显它，而不是 null。
  ctx.requestedRoot = opts.root === null || opts.root === undefined ? null : path.resolve(cwd, opts.root);
  ctx.root = resolveRoot(opts.root, cwd);
  if (ctx.root && typeof ctx.root === 'object' && ctx.root.error) {
    ctx.bootstrapError = ctx.root.error;
    ctx.root = null;
    return ctx;
  }
  if (!ctx.root) {
    ctx.bootstrapError = `无法定位仓库根目录（cwd=${cwd}，git rev-parse --show-toplevel 失败）`;
    return ctx;
  }

  // --root 必须 fail-closed：非 git 根一律 error，绝不静默回退到脚本自身仓库。
  try {
    assertGitRoot(ctx.root);
  } catch (err) {
    ctx.bootstrapError = err.message;
    ctx.root = null;
    return ctx;
  }

  try {
    const raw = execGit(ctx.root, ['ls-files', '-z']);
    ctx.tracked = raw
      .split('\0')
      .filter(Boolean)
      .map(relPosix)
      .sort(byCodePoint);
  } catch (err) {
    ctx.bootstrapError = `git ls-files 执行失败：${err.message}`;
    return ctx;
  }
  ctx.trackedSet = new Set(ctx.tracked);
  for (const rel of ctx.tracked) {
    const key = foldCase(rel);
    if (!ctx.lowerTrackedMap.has(key)) ctx.lowerTrackedMap.set(key, rel);
  }
  ctx.universeHash = crypto
    .createHash('sha256')
    .update(`${ctx.tracked.join('\n')}\n`, 'utf8')
    .digest('hex');

  return ctx;
}

/**
 * 解析 --root / 默认根。返回绝对路径字符串，或 { error } 标记对象。
 * 与 scripts/check-lib-sync.cjs 的 resolveRoot 同构：**传了就绝不回退**。
 * 历史教训：check-references.cjs 的 resolveRoot 在 --root 指向不存在目录时静默回退到
 * 脚本自身所在仓库，于是「--root 打错」会变成「扫了另一个仓库却报绿」；
 * 新门禁一律照本函数的 fail-closed 写法（详见本任务报告里的缺口 (b)）。
 */
function resolveRoot(explicit, cwd) {
  if (explicit !== null && explicit !== undefined) {
    const abs = path.resolve(cwd, explicit);
    if (!fs.existsSync(abs)) return { error: `--root 指向的目录不存在：${abs}（已 fail-closed，不回退到本脚本所在仓库）` };
    let stat;
    try {
      stat = fs.statSync(abs);
    } catch (err) {
      return { error: `--root 指向的路径无法访问：${abs}（${err.message}）` };
    }
    if (!stat.isDirectory()) return { error: `--root 必须是一个目录：${abs}` };
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
  return null;
}

/** 校验 root 确实是 git 仓库根（照 scripts/check-lib-sync.cjs 的 assertGitRoot）。 */
function assertGitRoot(root) {
  let top;
  try {
    top = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 8 * 1024 * 1024,
    }).trim();
  } catch (err) {
    throw new Error(`--root/默认根 ${root} 不是 git 仓库（git rev-parse --show-toplevel 失败）：${err.message}`);
  }
  if (!top) throw new Error(`--root/默认根 ${root} 不是 git 仓库（git 未报告顶层目录）。`);

  const normalize = (p) => {
    let real;
    try {
      real = fs.realpathSync.native(p);
    } catch {
      real = path.resolve(p);
    }
    return foldCase(real.replace(/[\\/]+$/, ''));
  };
  if (normalize(top) !== normalize(root)) {
    throw new Error(
      `--root ${root} 不是 git 仓库根：git 报告的顶层目录是 ${path.resolve(top)}。` +
        '（若传的是仓库内的子目录，git 会向上发现父仓库，判定基准会落到错误的仓库上。）',
    );
  }
}

function reportGuardUnavailable(ctx, message, extra) {
  ctx.report({
    check: 'guard-unavailable',
    severity: 'error',
    type: 'guard-unavailable',
    file: '.',
    line: 1,
    column: null,
    target: (extra && extra.target) || 'git',
    message,
    hint:
      (extra && extra.hint) ||
      '本门禁依赖 git ls-files 作为台账宇宙、依赖 yaml 解析模块 frontmatter、依赖 ' +
        `${LEDGER_REL} 作为唯一事实来源；三者任一不可用都宁可红也不要假绿。`,
  });
}

/**
 * 台账自身的违规（R6）：文件缺失 / 不可解析 / 结构非法都报 `ledger-missing`。
 * 历史上这三处报的是 `guard-unavailable`，于是 `CHECK_TITLES` / `--help` / `--json` / CONTRIBUTING
 * 四处登记的 `ledger-missing` 成了**没有任何 emission 点的死 id**，按 id 过滤的消费方会静默漏报。
 * 现在分工固定：台账自身的问题 → ledger-missing；git / yaml / 模块文件不可用 → guard-unavailable。
 */
function reportLedgerMissing(ctx, message, extra) {
  ctx.report({
    check: 'ledger-missing',
    severity: 'error',
    type: (extra && extra.type) || 'ledger-missing',
    file: ctx.ledgerRel,
    line: 1,
    column: null,
    target: (extra && extra.target) || ctx.ledgerRel,
    message,
    hint:
      (extra && extra.hint) ||
      `台账是门禁的唯一事实来源，读不到就不判定，绝不降级为「跳过检查」；用 node scripts/generate-file-ledger.cjs 生成。`,
  });
}

/**
 * 台账内容与索引不一致（R7）：工作区改动没 git add / 索引有而工作区没有 / 台账根本不在索引里。
 * 与 ledger-missing 分开报：台账本身可读、只是「本地看到的」与「索引里的」不是同一份事实。
 */
function reportLedgerIndexDrift(ctx, message, extra) {
  ctx.report({
    check: 'ledger-index-drift',
    severity: 'error',
    type: (extra && extra.type) || 'ledger-index-drift',
    file: ctx.ledgerRel,
    line: 1,
    column: null,
    target: (extra && extra.target) || ctx.ledgerRel,
    message,
    hint:
      (extra && extra.hint) ||
      `本地绿不能依赖未提交改动：要么 git add ${ctx.ledgerRel} 把改动纳入索引，要么用 git checkout -- ${ctx.ledgerRel} 丢弃工作区改动。`,
  });
}

// ---------------------------------------------------------------------------
// 台账读取与结构校验
// ---------------------------------------------------------------------------

/**
 * 取 git 索引里的台账原始字节（`git show :<rel>`，与 scripts/check-lib-sync.cjs:226-233 同构）。
 * 返回 { ok: true, text } 或 { ok: false, message }（不在索引里 / git 报错都归到 ok:false，不猜原因）。
 */
function readIndexBlob(root, rel) {
  try {
    const buf = execFileSync('git', ['-c', 'core.quotePath=false', 'show', `:${rel}`], {
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
 * 行尾归一化（只用于「工作区 vs 索引」比对）：
 * 索引 blob 恒为 LF，而 Windows 上 core.autocrlf=true（本仓库无 .gitattributes）检出的是 CRLF——
 * 只差行尾不算漂移，否则新克隆一跑门禁就假红（Linux CI 却绿，等于制造平台差异）。
 * 判定用的内容仍取索引 blob 原文（JSON 解析对行尾不敏感）。
 */
const normalizeEol = (s) => s.replace(/\r\n/g, '\n');

/**
 * 读 **HEAD 版**台账，作为 grandfathered「只减不增」的**不可篡改基线**（本增量新增）。
 * 为什么必须用 HEAD 而不是「上一份台账」：判定基准若与被判定的对象是同一份文件，
 * 人手工往 `grandfathered` 加一条（路径确实在索引里、又未被模块声明、也不命中豁免）再 `git add`，
 * keep-only 规则会认为它「原本就在清单里」而放行——门禁与 `--check` 双双报绿（实测过的洗白后门）。
 * HEAD 版台账在提交后不可被工作区改动影响（「在 HEAD 里」本身不是绿灯理由，它只是基线的载体）。
 *
 * 返回 { status, ... }：
 *   · 'no-head'         仓库还没有任何提交（连 HEAD 都不存在）——与「HEAD 里没有该文件」同档；
 *   · 'absent'          HEAD 里有仓库，但没有 ledger/<...> 这个条目 → **首次引入的一次性初始化语义**，
 *                       本项跳过且**不许红**（基线由本次提交建立，提交之后任何新增都会被拦住）；
 *   · 'unparsable'      HEAD 里有该文件却读不出 / 不是合法 JSON / 顶层结构非法 → fail-closed（调用方报 error）：
 *                       删掉或写坏 HEAD 版台账绝不能变成新的洗白路径；
 *   · 'ok'              拿到基线，返回 { ledger, rev }（rev 是短 sha，用于回显）。
 * 只读比对：本函数不改变门禁「判定基准 = git 索引」的既有口径。
 */
function readHeadLedger(root, rel) {
  let rev;
  try {
    rev = execGit(root, ['rev-parse', '--verify', '--short', 'HEAD^{commit}']).trim();
  } catch {
    return { status: 'no-head' };
  }
  let buf;
  try {
    buf = execFileSync('git', ['-c', 'core.quotePath=false', 'show', `HEAD:${rel}`], {
      cwd: root,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    // 不猜 git 的失败原因：HEAD 里到底有没有这个条目，用 ls-tree 单独问一次（首次引入与真正的读失败要分开）。
    let inHead;
    try {
      execGit(root, ['cat-file', '-e', `HEAD:${rel}`]);
      inHead = true;
    } catch {
      inHead = false;
    }
    if (inHead) return { status: 'unparsable', rev, message: `git show HEAD:${rel} 失败：${err.message}` };
    return { status: 'absent', rev };
  }

  const text = buf.toString('utf8');
  let parsed;
  try {
    parsed = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch (err) {
    return { status: 'unparsable', rev, message: `HEAD 版台账不是合法 JSON（${err.message}）` };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { status: 'unparsable', rev, message: 'HEAD 版台账顶层必须是对象' };
  }
  // 只需要 grandfathered 集合做包含性判定；它缺失/类型不符同样 fail-closed（不按「空清单」放过）。
  if (!Array.isArray(parsed.grandfathered)) {
    return {
      status: 'unparsable',
      rev,
      message: `HEAD 版台账缺 grandfathered 数组（实际 ${JSON.stringify(parsed.grandfathered)}）`,
    };
  }
  return { status: 'ok', rev, ledger: parsed };
}

/**
 * grandfathered 棘轮：**相对 HEAD 版台账只允许集合缩小**。
 * 判定用索引版台账（ctx.ledger）对 HEAD 版台账，两者都与工作区磁盘无关。
 * 三态语义与原因见 readHeadLedger 的注释；'absent'（首次引入）跳过且不红，由 --help 与 CONTRIBUTING 写明。
 */
function checkGrandfatheredGrowth(ctx) {
  const result = readHeadLedger(ctx.root, ctx.ledgerRel);
  // 对外统一口径：'head'（基线可用）/ 'absent'（HEAD 里没有该文件）/ 'no-head'（仓库尚无提交）/ 'unparsable'。
  ctx.grandfatheredGrowth.baseline = result.status === 'ok' ? 'head' : result.status;
  ctx.grandfatheredGrowth.headRev = result.rev || null;
  if (result.status === 'unparsable') {
    ctx.grandfatheredGrowth.headErr = result.message;
    return;
  }
  if (result.status !== 'ok') return; // 'absent' / 'no-head'：首次引入，本项跳过（不许红）

  const headSet = new Set(result.ledger.grandfathered);
  ctx.grandfatheredGrowth.headTotal = headSet.size;
  ctx.grandfatheredGrowth.headParsed = result.ledger;
  for (const rel of ctx.ledger.grandfathered) {
    if (headSet.has(rel)) continue;
    ctx.grandfatheredGrowth.added.push(rel);
  }
}

/**
 * 读台账：**内容以 git 索引 blob 为准**（R7，本仓既有约定「判定基准 = git 索引」）。
 *   · 索引里有：以索引版判定；工作区与索引不一致（改了没 add / 索引有而工作区无）→ ledger-index-drift（error）；
 *   · 索引里没有但磁盘上有：同样 ledger-index-drift（error）——否则「本地绿」依赖未提交改动，
 *     CI / 新克隆拿到的不是同一份事实；判定仍用磁盘版（夹具仓库请先 git add，见 --help）；
 *   · 两边都没有：ledger-missing（error）。
 */
function loadLedger(ctx) {
  const abs = absOf(ctx.root, ctx.ledgerRel);
  const indexBlob = readIndexBlob(ctx.root, ctx.ledgerRel);

  let worktreeText = null;
  let worktreeError = null;
  if (fs.existsSync(abs)) {
    try {
      worktreeText = fs.readFileSync(abs, 'utf8');
    } catch (err) {
      worktreeError = err.message;
    }
  } else {
    worktreeError = '文件不存在';
  }

  let text;
  if (indexBlob.ok) {
    ctx.ledgerBasis = 'index';
    if (worktreeText === null) {
      reportLedgerIndexDrift(ctx, `工作区里的台账与 git 索引不一致：索引里有 ${ctx.ledgerRel}，工作区里取不到（${worktreeError}）。`, {
        type: 'ledger-worktree-missing',
        target: `${ctx.ledgerRel}#worktree-missing`,
        hint:
          '判定按索引版进行，但「本地看到的」和「索引里的」不是同一份文件：' +
          `git checkout -- ${ctx.ledgerRel} 可以恢复工作区副本（或确认这是有意的删除并 git add）。`,
      });
    } else if (normalizeEol(worktreeText) !== normalizeEol(indexBlob.text)) {
      reportLedgerIndexDrift(
        ctx,
        `工作区台账与 git 索引 blob 不一致（索引版 ${Buffer.byteLength(indexBlob.text, 'utf8')} B / ` +
          `工作区版 ${Buffer.byteLength(worktreeText, 'utf8')} B）：本次判定按**索引版**进行。`,
        {
          type: 'ledger-worktree-vs-index',
          target: `${ctx.ledgerRel}#worktree-vs-index`,
        },
      );
    }
    text = indexBlob.text;
  } else if (worktreeText !== null) {
    ctx.ledgerBasis = 'worktree';
    reportLedgerIndexDrift(
      ctx,
      `台账不在 git 索引里（git show :${ctx.ledgerRel} 失败：${indexBlob.message}），只能退回工作区副本判定：${ctx.ledgerRel}。`,
      {
        type: 'ledger-not-in-index',
        target: `${ctx.ledgerRel}#not-in-index`,
        hint: `先 git add ${ctx.ledgerRel}：否则 CI / 新克隆看不到这份台账，「本地绿」是未提交改动撑起来的。`,
      },
    );
    // 索引里没有、HEAD 里却有该台账：判定基准退化为工作区副本，grandfathered 棘轮的索引基线也随之失效。
    // 不静默跳过本项比对，而是把「索引缺台账」这件事本身报成 error（HEAD 版仍可作基线，但基准已退化）。
    if (readHeadLedger(ctx.root, ctx.ledgerRel).status !== 'absent') {
      reportLedgerIndexDrift(ctx, `台账已从 git 索引消失（HEAD 里仍有 ${ctx.ledgerRel}）：棘轮的索引基线失效，本次按工作区副本判定。`, {
        type: 'ledger-missing-in-index',
        target: `${ctx.ledgerRel}#missing-in-index`,
        hint: `先 git add ${ctx.ledgerRel} 把台账放回索引：HEAD 版台账只能当基线，判定基准必须是索引 blob。`,
      });
    }
    text = worktreeText;
  } else {
    ctx.ledgerBasis = null;
    reportLedgerMissing(ctx, `台账数据文件不存在：${ctx.ledgerRel}（期望路径 ${abs}；索引里也没有该条目）`, {
      hint: `用 node scripts/generate-file-ledger.cjs 生成，或从 git 索引恢复该文件（git show :${ctx.ledgerRel}）。`,
    });
    return false;
  }

  let parsed;
  try {
    parsed = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch (err) {
    reportLedgerMissing(ctx, `台账数据文件不是合法 JSON：${ctx.ledgerRel}（${err.message}）`, { type: 'ledger-unparsable' });
    return false;
  }

  const problems = validateLedgerShape(parsed);
  if (problems.length > 0) {
    for (const problem of problems) {
      reportLedgerMissing(ctx, `台账结构非法：${problem.message}`, {
        type: 'ledger-invalid',
        target: problem.target,
        hint: '台账是门禁的唯一事实来源，结构非法时不猜、不降级：按 schema 修正后重跑。',
      });
    }
    return false;
  }

  ctx.ledger = parsed;
  return true;
}

/** 台账结构校验（返回问题清单；空数组 = 合法）。 */
function validateLedgerShape(ledger) {
  const problems = [];
  if (ledger === null || typeof ledger !== 'object' || Array.isArray(ledger)) {
    return [{ target: 'root', message: '顶层必须是对象' }];
  }
  if (ledger.schema_version !== LEDGER_SCHEMA_VERSION) {
    problems.push({
      target: 'schema_version',
      message: `schema_version 必须是 ${LEDGER_SCHEMA_VERSION}，实际是 ${JSON.stringify(ledger.schema_version)}`,
    });
  }
  if (ledger.meta === null || typeof ledger.meta !== 'object' || Array.isArray(ledger.meta)) {
    problems.push({ target: 'meta', message: 'meta 必须是对象' });
  } else {
    for (const key of ['generated_at', 'universe', 'tracked_total', 'universe_hash', 'coverage_basis']) {
      if (ledger.meta[key] === undefined || ledger.meta[key] === null || ledger.meta[key] === '') {
        problems.push({ target: `meta.${key}`, message: `meta.${key} 必填` });
      }
    }
    // R8：known_divergences 也是必填（删掉它门禁必须响）——它是「台账宇宙与引擎口径差异」的唯一说明，
    // 空数组等于没有任何说明，按缺失处理。
    if (!Array.isArray(ledger.meta.known_divergences) || ledger.meta.known_divergences.length === 0) {
      problems.push({
        target: 'meta.known_divergences',
        message: 'meta.known_divergences 必须是至少含 1 条说明的非空数组',
      });
    }
    if (ledger.meta.tracked_total !== undefined && !Number.isInteger(ledger.meta.tracked_total)) {
      problems.push({ target: 'meta.tracked_total', message: 'meta.tracked_total 必须是整数' });
    }
  }
  if (!Array.isArray(ledger.exempt_patterns)) {
    problems.push({ target: 'exempt_patterns', message: 'exempt_patterns 必须是数组' });
  } else {
    ledger.exempt_patterns.forEach((entry, index) => {
      if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
        problems.push({ target: `exempt_patterns[${index}]`, message: '每条豁免必须是对象' });
        return;
      }
      if (typeof entry.pattern !== 'string' || entry.pattern === '') {
        problems.push({ target: `exempt_patterns[${index}].pattern`, message: 'pattern 必填且必须是非空字符串' });
      }
      if (typeof entry.reason !== 'string' || entry.reason.trim() === '') {
        problems.push({ target: `exempt_patterns[${index}].reason`, message: `豁免缺 reason（pattern=${JSON.stringify(entry.pattern)}）` });
      }
      if (entry.since !== undefined && typeof entry.since !== 'string') {
        problems.push({ target: `exempt_patterns[${index}].since`, message: 'since 若存在必须是字符串' });
      }
      // 「命中率超阈值」的人工确认字段：只接受布尔 true，别的类型一律按结构非法（不猜、不降级）。
      if (entry[PATTERN_BROAD_CONFIRM_FIELD] !== undefined && typeof entry[PATTERN_BROAD_CONFIRM_FIELD] !== 'boolean') {
        problems.push({
          target: `exempt_patterns[${index}].${PATTERN_BROAD_CONFIRM_FIELD}`,
          message: `${PATTERN_BROAD_CONFIRM_FIELD} 若存在必须是布尔值`,
        });
      }
    });
  }
  if (!Array.isArray(ledger.grandfathered)) {
    problems.push({ target: 'grandfathered', message: 'grandfathered 必须是数组' });
  } else {
    ledger.grandfathered.forEach((entry, index) => {
      if (typeof entry !== 'string' || entry === '') {
        problems.push({ target: `grandfathered[${index}]`, message: 'grandfathered 只能是非空字符串（仓库相对 posix 路径）' });
      }
    });
  }
  return problems;
}

// ---------------------------------------------------------------------------
// 模块声明扫描（source.path 的部分）
// ---------------------------------------------------------------------------

function loadYaml(ctx) {
  if (ctx.yamlModule) return ctx.yamlModule;
  const candidates = [ctx.root, path.resolve(__dirname, '..'), __dirname];
  const tried = [];
  for (const base of candidates) {
    try {
      const resolved = require.resolve('yaml', { paths: [base] });
      const mod = require(resolved);
      if (mod && typeof mod.parse === 'function') {
        ctx.yamlModule = mod;
        ctx.yamlSource = resolved;
        return mod;
      }
      tried.push(`${base}: 模块存在但没有 parse`);
    } catch (err) {
      tried.push(`${base}: ${(err && err.code) || '解析失败'}`);
    }
  }
  reportGuardUnavailable(
    ctx,
    `解析不到 yaml（模块 frontmatter 解析必需；试过：${tried.join('；')}）。`,
    { target: 'yaml', hint: 'yaml 是 package.json 的生产依赖，请先 `npm ci` / `npm install`。' },
  );
  return null;
}

/** 项目数据目录 = 索引里以 `normify-` 开头的目录段（排除 skills/ 下的技能目录）。 */
function findProjectDirs(ctx) {
  const dirs = new Set();
  for (const rel of ctx.tracked) {
    const segments = rel.split('/');
    for (let i = 0; i < segments.length - 1; i += 1) {
      if (!segments[i].startsWith(PROJECT_PREFIX)) continue;
      const dirRel = segments.slice(0, i + 1).join('/');
      if (PROJECT_DIR_EXCLUDES.some((prefix) => dirRel.startsWith(prefix))) continue;
      dirs.add(dirRel);
    }
  }
  return [...dirs].sort(byCodePoint);
}

/** 抽取 frontmatter 文本（第一个 `---` 行到下一个 `---` 行之间）；没有则返回 null。 */
function extractFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length === 0 || lines[0].trim() !== '---') return null;
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '---') return lines.slice(1, i).join('\n');
  }
  return null;
}

/**
 * 扫描所有项目目录里的模块文件，抽取 source.path 声明。
 * 模块文件 = 索引里位于 `<projectDir>/modules/` 下、以 `.md` 结尾的文件
 * （与 src/engine/store.ts:84-96 的发现规则同构；差异见台账 meta.known_divergences）。
 */
function scanDeclarations(ctx, yaml) {
  const moduleRels = ctx.tracked.filter((rel) => {
    const dir = path.posix.dirname(rel);
    if (!dir.endsWith('/modules') && !dir.includes('/modules/')) return false;
    if (path.posix.extname(rel).toLowerCase() !== '.md') return false;
    const owner = ctx.projectDirs.find((projectDir) => rel.startsWith(`${projectDir}/`));
    return Boolean(owner);
  });

  const occurrences = new Map(); // 声明路径 → [{ module, file }]
  for (const rel of moduleRels) {
    const abs = absOf(ctx.root, rel);
    let text;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch (err) {
      reportGuardUnavailable(ctx, `模块文件读不到：${rel}（${err.message}）`, {
        target: rel,
        hint: '模块 frontmatter 是本门禁的输入；读不到就宁可红，绝不静默跳过该模块的声明。',
      });
      continue;
    }

    const frontmatter = extractFrontmatter(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
    if (frontmatter === null) {
      reportGuardUnavailable(ctx, `模块文件没有 frontmatter（首行不是 ---）：${rel}`, { target: rel });
      continue;
    }

    let data;
    try {
      data = yaml.parse(frontmatter);
    } catch (err) {
      reportGuardUnavailable(ctx, `模块 frontmatter 不是合法 YAML：${rel}（${err.message}）`, { target: rel });
      continue;
    }

    ctx.declarationStats.modulesScanned += 1;
    const moduleId = data && typeof data.id === 'string' ? data.id : rel;
    const owner = ctx.projectDirs.find((projectDir) => rel.startsWith(`${projectDir}/`));
    const source = data ? data.source : undefined;
    if (source === undefined || source === null) continue;
    if (!Array.isArray(source)) {
      reportGuardUnavailable(ctx, `模块的 source 不是数组：${rel}`, {
        target: rel,
        hint: 'source 必须是 [{path, line?, end_line?}] 数组（src/engine/types.ts:8-12）。',
      });
      continue;
    }
    if (source.length > 0) ctx.declarationStats.modulesWithSource += 1;

    for (const entry of source) {
      ctx.declarationStats.declaredRefs += 1;
      const declared = entry && typeof entry === 'object' ? entry.path : undefined;
      if (typeof declared !== 'string' || declared === '') {
        ctx.declarationStats.invalid += 1;
        continue;
      }
      const list = occurrences.get(declared) || [];
      list.push({ module: moduleId, file: rel, project: owner });
      occurrences.set(declared, list);
    }
  }

  return occurrences;
}

/**
 * 一个声明路径的落地状态（四态判定的核心）：
 *   syntax-ok      语法合法（无盘符/反斜杠/`..`/`.`/空段/末尾斜杠；与 src/workspace.ts:11-15 同构）
 *   onDisk         磁盘上 lstat 到的类型：'file' | 'dir' | 'other' | 'missing'
 *   tracked        该路径是否在 git 索引里（台账宇宙的「存在」基准）
 *   trackedRel     命中的索引条目（大小写不一致时给出真实条目，供报告回显）
 */
function declaredPathState(ctx, declared) {
  const syntaxOk =
    !path.posix.isAbsolute(declared) &&
    !/[\\:\x00-\x1f]/.test(declared) &&
    !declared.split('/').some((part) => part === '' || part === '.' || part === '..');

  let onDisk = 'missing';
  let isSymlink = false;
  if (syntaxOk) {
    const abs = absOf(ctx.root, declared);
    try {
      const lst = fs.lstatSync(abs);
      isSymlink = lst.isSymbolicLink();
      if (lst.isFile()) onDisk = 'file';
      else if (lst.isDirectory()) onDisk = 'dir';
      else onDisk = 'other';
    } catch {
      onDisk = 'missing';
    }
  }

  const trackedRel = ctx.trackedSet.has(declared) ? declared : ctx.lowerTrackedMap.get(foldCase(declared)) || null;
  return { syntaxOk, onDisk, isSymlink, tracked: Boolean(trackedRel), trackedRel };
}

// ---------------------------------------------------------------------------
// 检查主流程
// ---------------------------------------------------------------------------

function runLedgerChecks(ctx) {
  if (!loadLedger(ctx)) return;

  // ---- 0. grandfathered 棘轮的基线比对（与 HEAD 版台账比，先于四态判定；只读，不改判定基准） ----
  checkGrandfatheredGrowth(ctx);

  const yaml = loadYaml(ctx);
  if (!yaml) return;

  ctx.projectDirs = findProjectDirs(ctx);
  ctx.projects = ctx.projectDirs.map((dir) => ({ dir }));

  // ---- 1. 模块声明扫描 ----
  const occurrences = scanDeclarations(ctx, yaml);

  // ---- 2. 逐条声明的落地状态 + bound 集合 ----
  const boundFiles = new Set(); // 被精确声明且真实存在的**已跟踪普通文件**
  const declaredStates = [];
  for (const [declared, refs] of occurrences) {
    const state = declaredPathState(ctx, declared);
    if (!state.syntaxOk) ctx.declarationStats.invalid += 1;
    if (state.onDisk === 'file') ctx.declarationStats.existingFile += 1;
    else if (state.onDisk === 'dir') ctx.declarationStats.existingDir += 1;
    else if (state.onDisk === 'missing') ctx.declarationStats.planned += 1;
    if (state.onDisk === 'file' && !state.tracked) {
      ctx.declarationStats.untrackedFile += 1;
      ctx.declaredUntracked.push({ declared, refs });
    }
    if (state.tracked && state.onDisk === 'file') boundFiles.add(state.trackedRel);
    declaredStates.push({ declared, refs, state });
  }
  ctx.declarationStats.distinctDeclaredPaths = occurrences.size;
  ctx.declarationStats.boundTrackedFiles = boundFiles.size;

  // ---- 3. 四态归属 ----
  // 每条豁免先过三道闸：静态过宽（不可豁免）→ 写法合法 → 编译成正则。
  // 被判过宽/非法的模式 **re 置空、不参与匹配**：它本该吞掉的文件会落回 unowned/error，
  // 绝不出现「模式被拒但文件照样被放过」的中间态。
  const patterns = ctx.ledger.exempt_patterns.map((entry, index) => {
    const pattern = entry && typeof entry.pattern === 'string' ? entry.pattern : null;
    if (pattern === null) {
      ctx.invalidPatterns.push({ index, entry, error: 'pattern 非法（不是非空字符串）' });
      return { index, entry, re: null, hits: [] };
    }
    const breadth = patternBreadthError(pattern);
    if (breadth) {
      ctx.broadPatterns.push({ index, entry, breadth });
      return { index, entry, re: null, hits: [] };
    }
    const compiled = compilePattern(pattern);
    if (compiled.error) ctx.invalidPatterns.push({ index, entry, error: compiled.error });
    return { index, entry, re: compiled.re || null, hits: [] };
  });

  const grandfatheredSet = new Set(ctx.ledger.grandfathered);

  for (const rel of ctx.tracked) {
    if (boundFiles.has(rel)) {
      ctx.states.bound.push(rel);
      continue;
    }
    const hit = patterns.find((p) => p.re && p.re.test(rel));
    if (hit) {
      hit.hits.push(rel);
      ctx.states['exempt-pattern'].push(rel);
      continue;
    }
    if (grandfatheredSet.has(rel)) {
      ctx.states.grandfathered.push(rel);
      continue;
    }
    ctx.states.unowned.push(rel);
  }

  // ---- 3b. 命中率过宽（判据 3）：需要宇宙信息，只能在匹配之后算 ----
  for (const p of patterns) {
    if (!p.re || ctx.tracked.length === 0) continue;
    const ratio = p.hits.length / ctx.tracked.length;
    if (ratio <= PATTERN_MAX_HIT_RATIO) continue;
    if (p.entry && p.entry[PATTERN_BROAD_CONFIRM_FIELD] === true) continue; // 人工确认过，放行
    ctx.broadPatterns.push({
      index: p.index,
      entry: p.entry,
      breadth: {
        kind: 'hit-ratio',
        ratio,
        hits: p.hits.length,
        universe: ctx.tracked.length,
        message:
          `pattern 命中 ${p.hits.length}/${ctx.tracked.length} 个已跟踪文件` +
          `（${(ratio * 100).toFixed(1)}%，超过阈值 ${PATTERN_MAX_HIT_RATIO * 100}%）：${p.entry.pattern}`,
      },
    });
  }

  // ---- 3c. 内部不变量：四态计数之和必须等于台账宇宙（R8） ----
  // 四态判定是「每个已跟踪文件落到且只落到一类」，所以这个等式是门禁自身的正确性断言，
  // 不是报告上的一行字：一旦不成立，说明归属判定漏了或重了文件，必须红。
  const statesSum =
    ctx.states.bound.length +
    ctx.states['exempt-pattern'].length +
    ctx.states.grandfathered.length +
    ctx.states.unowned.length;
  if (statesSum !== ctx.tracked.length) {
    reportGuardUnavailable(
      ctx,
      `四态计数之和不等于台账宇宙：bound ${ctx.states.bound.length} + exempt-pattern ` +
        `${ctx.states['exempt-pattern'].length} + grandfathered ${ctx.states.grandfathered.length} + ` +
        `unowned ${ctx.states.unowned.length} = ${statesSum} ≠ git ls-files ${ctx.tracked.length}。` +
        '（本门禁自身的归属判定漏了或重了文件，属内部不变量被破坏，绝不当作 warning。）',
      {
        target: 'states-sum',
        hint: '这是门禁实现自身的 bug：每个已跟踪文件必须落到且只落到四态之一，请报告并修复本脚本。',
      },
    );
  }

  // ---- 4. 祖父清单腐烂检测（只减不增） ----
  for (const rel of ctx.ledger.grandfathered) {
    if (!ctx.trackedSet.has(rel)) {
      ctx.grandfatheredRemovable.push({ rel, why: '已从 git 索引消失（文件被删除或改名）' });
      continue;
    }
    if (boundFiles.has(rel)) {
      ctx.grandfatheredRemovable.push({ rel, why: '已经 bound（被模块 source.path 精确声明且存在）' });
      continue;
    }
    const hit = patterns.find((p) => p.re && p.re.test(rel));
    if (hit) ctx.grandfatheredRemovable.push({ rel, why: `已命中豁免模式 ${hit.entry.pattern}` });
  }
  // 清单内重复条目：同样属于腐烂（应删掉重复项）。
  const seenGrandfathered = new Set();
  for (const rel of ctx.ledger.grandfathered) {
    if (seenGrandfathered.has(rel)) ctx.grandfatheredRemovable.push({ rel, why: '清单内重复条目' });
    seenGrandfathered.add(rel);
  }

  // ---- 5. 未命中的豁免模式 ----
  for (const p of patterns) {
    if (!p.re) continue;
    if (p.hits.length === 0) ctx.unusedPatterns.push(p);
  }

  // ---- 6. 报违规 ----
  emitViolations(ctx, patterns);
}

function emitViolations(ctx, patterns) {
  const ledgerRel = ctx.ledgerRel;

  // unowned：新增且无归属（error，逐条报出，不是计数）
  for (const rel of ctx.states.unowned.slice(0, EVIDENCE_LIMIT)) {
    ctx.report({
      check: 'unowned-file',
      severity: 'error',
      type: 'unowned-file',
      file: rel,
      line: 1,
      column: null,
      target: rel,
      message: `已跟踪文件既无模块归属、也不命中任何豁免模式、也不在祖父清单里：${rel}`,
      hint:
        '修法二选一：① 让某个模块用 source.path 精确声明它（并在文件真实存在后刷新 fingerprint）；' +
        `② 在 ${ledgerRel} > exempt_patterns 里加一条带 reason 的模式豁免。` +
        '**不允许**往 grandfathered 里加：祖父清单只减不增（用新增无归属文件稀释覆盖率正是本项要拦的事）。',
    });
  }
  if (ctx.states.unowned.length > EVIDENCE_LIMIT) {
    const rest = ctx.states.unowned.length - EVIDENCE_LIMIT;
    ctx.report({
      check: 'unowned-file',
      severity: 'error',
      type: 'unowned-file',
      file: ledgerRel,
      line: 1,
      column: null,
      target: `${ledgerRel}#unowned-overflow`,
      message: `另有 ${rest} 个无归属文件未逐条列出（共 ${ctx.states.unowned.length} 个）。`,
      hint: '先修前几条，重跑后本提示会给出下一批。',
    });
  }

  // grandfathered-removable：清单腐烂（warning）
  for (const item of ctx.grandfatheredRemovable.slice(0, EVIDENCE_LIMIT)) {
    ctx.report({
      check: 'grandfathered-removable',
      severity: 'warning',
      type: 'grandfathered-removable',
      file: ledgerRel,
      line: 1,
      column: null,
      target: item.rel,
      message: `祖父清单条目应当删除：${item.rel}（${item.why}）`,
      hint: `祖父清单只减不增：把 ${item.rel} 从 ${ledgerRel} > grandfathered 里删掉（或重跑 node scripts/generate-file-ledger.cjs 自动剔除）。`,
    });
  }

  // grandfathered-growth：相对 HEAD 版台账的新增条目（error，逐条报出）
  const growth = ctx.grandfatheredGrowth;
  if (growth.baseline === 'unparsable') {
    ctx.report({
      check: 'grandfathered-growth',
      severity: 'error',
      type: 'grandfathered-head-baseline-unusable',
      file: ledgerRel,
      line: 1,
      column: null,
      target: `${ledgerRel}#head-baseline`,
      message: `HEAD 版台账不可用作棘轮基线：${growth.headErr}`,
      hint:
        `删除或写坏 HEAD 版台账绝不能变成洗白路径：用 git show HEAD:${ledgerRel} 确认基线内容并修好它` +
        `（基线必须能解析出 grandfathered 数组），再重跑本门禁。`,
    });
  }
  for (const rel of growth.added.slice(0, EVIDENCE_LIMIT)) {
    ctx.report({
      check: 'grandfathered-growth',
      severity: 'error',
      type: 'grandfathered-added-vs-head',
      file: ledgerRel,
      line: 1,
      column: null,
      target: rel,
      message:
        `grandfathered 新增条目（HEAD 版台账里没有它）：${rel}` +
        '——祖父清单只减不增，允许集合缩小，**任何新增即手工洗白**。',
      hint:
        `「路径在 HEAD 里」不是绿灯理由（旧 ≠ 已记账）。合法修法两条：① 让某个模块用 source.path 精确声明它；` +
        `② 在 ${ledgerRel} > exempt_patterns 里加一条带 reason 的模式豁免。` +
        `若这条路径确实不该有归属，也不要往 grandfathered 里加（清单是已记账的正账，不是欠账，且不再增长）；` +
        `把 ${rel} 从 grandfathered 里删掉即可恢复绿。`,
    });
  }
  if (growth.added.length > EVIDENCE_LIMIT) {
    const rest = growth.added.length - EVIDENCE_LIMIT;
    ctx.report({
      check: 'grandfathered-growth',
      severity: 'error',
      type: 'grandfathered-added-vs-head',
      file: ledgerRel,
      line: 1,
      column: null,
      target: `${ledgerRel}#grandfathered-growth-overflow`,
      message: `另有 ${rest} 条新增条目未逐条列出（共新增 ${growth.added.length} 条，基线 = HEAD 版台账）。`,
      hint: '先修前几条，重跑后本提示会给出下一批。',
    });
  }

  // exempt-invalid：缺 reason / pattern 非法（error）
  for (const p of ctx.invalidPatterns) {
    ctx.report({
      check: 'exempt-invalid',
      severity: 'error',
      type: 'exempt-pattern-invalid',
      file: ledgerRel,
      line: 1,
      column: null,
      target: (p.entry && p.entry.pattern) || `exempt_patterns[${p.index}]`,
      message: `豁免模式条目非法：${p.error}`,
      hint: '豁免必须写明 reason 且 pattern 只用 ** / * / ? 三种通配；缺理由的豁免等于静默放宽门禁。',
    });
  }

  // exempt-too-broad：过宽模式（error）——一条模式就能把整个门禁静默关掉，必须红。
  for (const p of ctx.broadPatterns) {
    const kind = (p.breadth && p.breadth.kind) || 'unknown';
    ctx.report({
      check: 'exempt-too-broad',
      severity: 'error',
      type: `exempt-pattern-too-broad-${kind}`,
      file: ledgerRel,
      line: 1,
      column: null,
      target: (p.entry && p.entry.pattern) || `exempt_patterns[${p.index}]`,
      message:
        `豁免模式过宽（${kind}）：${p.breadth.message}。` +
        '被判过宽的模式不参与匹配，本次判定按「该模式不存在」进行。',
      hint:
        kind === 'hit-ratio'
          ? `若这条模式确实需要覆盖过半已跟踪文件，请在该条目上显式写 "${PATTERN_BROAD_CONFIRM_FIELD}": true ` +
            '（人工确认；写上即视为已复核，但仍会被判据 1/2 拦截的写法不接受确认）。'
          : '把模式收窄到具体的目录或后缀（例：把 `**` 换成 `docs/**`）：豁免先于祖父判定，' +
            '过宽模式会让整个宇宙变成 exempt-pattern 而门禁仍然报绿。',
    });
  }

  // exempt-unused：未命中的豁免（warning，可操作）
  for (const p of ctx.unusedPatterns) {
    ctx.report({
      check: 'exempt-unused',
      severity: 'warning',
      type: 'exempt-pattern-unused',
      file: ledgerRel,
      line: 1,
      column: null,
      target: p.entry.pattern,
      message: `豁免模式本次未命中任何已跟踪文件（可能已过期或拼写错误）：${p.entry.pattern}`,
      hint: `确认不再需要就从 ${ledgerRel} > exempt_patterns 里删掉；未命中的豁免会永久放过未来任何匹配该模式的路径。`,
    });
  }

  // tracked-mismatch：元信息与索引不一致（error）
  const meta = ctx.ledger.meta;
  if (meta.tracked_total !== ctx.tracked.length) {
    ctx.report({
      check: 'tracked-mismatch',
      severity: 'error',
      type: 'ledger-tracked-total-drift',
      file: ledgerRel,
      line: 1,
      column: null,
      target: 'meta.tracked_total',
      message: `台账 meta.tracked_total=${meta.tracked_total} 与本次 git ls-files 条数 ${ctx.tracked.length} 不一致（宇宙变了，台账已过期）。`,
      hint: '重跑 node scripts/generate-file-ledger.cjs 重新生成台账。',
    });
  }
  if (meta.universe_hash !== ctx.universeHash) {
    ctx.report({
      check: 'tracked-mismatch',
      severity: 'error',
      type: 'ledger-universe-hash-drift',
      file: ledgerRel,
      line: 1,
      column: null,
      target: 'meta.universe_hash',
      message:
        `台账 meta.universe_hash=${meta.universe_hash} 与本次实测 ${ctx.universeHash} 不一致` +
        '（索引里的文件清单变了：有新增、删除或改名）。',
      hint: '重跑 node scripts/generate-file-ledger.cjs 重新生成台账（并复核新文件是否已归属）。',
    });
  }

  // declared-untracked：声明落地到本仓库却没 git add（warning）
  for (const item of ctx.declaredUntracked.slice(0, EVIDENCE_LIMIT)) {
    ctx.report({
      check: 'declared-untracked',
      severity: 'warning',
      type: 'declared-target-untracked',
      file: item.refs[0].file,
      line: 1,
      column: null,
      target: item.declared,
      message:
        `模块声明的目标在磁盘上存在、却不在 git 索引里：${item.declared}` +
        `（声明方：${item.refs.map((r) => r.module).join('、')}）`,
      hint:
        'clean checkout / CI 上这里会断链（本该 git add）；若它确实是计划态目标，' +
        '请确认磁盘上那份不是误落地的产物。',
    });
  }

  void patterns;
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------

function severityCounts(ctx) {
  const counts = { error: 0, warning: 0 };
  for (const v of ctx.violations) counts[v.severity] = (counts[v.severity] || 0) + 1;
  return counts;
}

function printHuman(ctx) {
  const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
  const paint = (code, s) => (useColor ? `\u001b[${code}m${s}\u001b[0m` : s);
  const out = [];

  out.push(paint('1', `${TOOL} v${TOOL_VERSION} — 全仓文件台账门禁（增量 1：文件级）`));
  out.push(`仓库根: ${ctx.root}`);
  if (ctx.bootstrapError) {
    out.push(paint('31', `引导失败: ${ctx.bootstrapError}`));
  } else {
    const s = ctx.states;
    const d = ctx.declarationStats;
    const total = ctx.tracked.length;
    out.push(`台账文件: ${ctx.ledgerRel}（schema_version ${ctx.ledger ? ctx.ledger.schema_version : '-'} · 判定基准 ` +
      `${ctx.ledgerBasis === 'index' ? 'git 索引 blob' : ctx.ledgerBasis === 'worktree' ? '工作区文件（索引里没有，见 ledger-index-drift）' : '不可用'}）`);
    out.push(`台账宇宙: git ls-files ${total} 条 · universe_hash ${ctx.universeHash.slice(0, 16)}…`);
    out.push(
      `四态归属: bound ${s.bound.length} · exempt-pattern ${s['exempt-pattern'].length} · ` +
        `grandfathered ${s.grandfathered.length} · unowned ${s.unowned.length}`,
    );
    out.push(
      paint(
        s.unowned.length > 0 ? '31' : '32',
        `归属对账: ${s.bound.length} + ${s['exempt-pattern'].length} + ${s.grandfathered.length} + ${s.unowned.length} = ` +
          `${s.bound.length + s['exempt-pattern'].length + s.grandfathered.length + s.unowned.length} / ${total}`,
      ),
    );
    out.push('');
    out.push('声明口径（planned 与 bound 必须分开，绝不合并成一个「覆盖率」）:');
    out.push(`  · 模块扫描: ${d.modulesScanned} 个（其中 ${d.modulesWithSource} 个有非空 source）`);
    out.push(`  · 声明条目: ${d.declaredRefs} 条 → 去重后 ${d.distinctDeclaredPaths} 个不同路径`);
    out.push(
      `  · planned（目标不存在）${d.planned} · existing-file（目标是真实文件）${d.existingFile} · ` +
        `existing-dir（目标是目录）${d.existingDir} · invalid（语法非法）${d.invalid}`,
    );
    out.push(
      `  · bound（= 被精确声明且真实存在**且已跟踪**的文件）${d.boundTrackedFiles} · ` +
        `declared-untracked（存在但没 git add）${d.untrackedFile}`,
    );
    const pct = total === 0 ? 0 : (d.boundTrackedFiles / total) * 100;
    out.push(
      paint(
        d.boundTrackedFiles === 0 ? '33' : '32',
        `  · 归属覆盖率 = bound / 已跟踪文件 = ${d.boundTrackedFiles} / ${total} = ${pct.toFixed(2)}%` +
          `（exempt-pattern 不是模块归属，不计入覆盖率；planned 更不算）`,
      ),
    );
    out.push('');
    out.push(
      `豁免模式: ${ctx.ledger ? ctx.ledger.exempt_patterns.length : 0} 条 · 本次命中 ${ctx.states['exempt-pattern'].length} 个文件 · ` +
        `未命中 ${ctx.unusedPatterns.length} 条`,
    );
    out.push(
      `祖父清单: ${ctx.ledger ? ctx.ledger.grandfathered.length : 0} 条 · ` +
        paint(
          ctx.grandfatheredRemovable.length > 0 ? '33' : '32',
          `还可再减 ${ctx.grandfatheredRemovable.length} 条（已 bound / 已豁免 / 已消失 / 重复）——清单只减不增`,
        ),
    );
    // 棘轮基线（本增量新增）：与 HEAD 版台账比对的结果必须回显，否则「只减不增」无从核对。
    const g = ctx.grandfatheredGrowth;
    if (g.baseline === 'head') {
      out.push(
        paint(
          g.added.length > 0 ? '31' : '32',
          `祖父清单棘轮: 基线 = HEAD 版台账（${g.headRev || 'HEAD'} 共 ${g.headTotal} 条）· ` +
            `相对基线新增 ${g.added.length} 条 · 已减 ${
              g.headTotal === null ? '-' : Math.max(0, g.headTotal - (ctx.ledger ? ctx.ledger.grandfathered.length : 0))
            } 条——只允许集合缩小`,
        ),
      );
    } else if (g.baseline === 'absent' || g.baseline === 'no-head') {
      out.push(
        paint('33', `祖父清单棘轮: HEAD 里没有该台账（${g.baseline === 'no-head' ? '仓库尚无提交' : '首次引入'}）→ 本项跳过，` +
          '一次性初始化：基线由本次提交建立，提交之后任何新增都会被拦成 error'),
      );
    } else if (g.baseline === 'unparsable') {
      out.push(paint('31', `祖父清单棘轮: HEAD 版台账不可用作基线（${g.headErr}）→ error（fail-closed）`));
    } else {
      out.push('祖父清单棘轮: 基线不可用（台账未成功加载，本项未判定）');
    }
    if (ctx.projects.length > 0) {
      out.push(`项目数据目录（${ctx.projects.length}）: ${ctx.projectDirs.join(' · ')}`);
    }
  }
  out.push('');

  if (ctx.violations.length === 0) {
    out.push(paint('32', '✔ 未发现台账问题。'));
  } else {
    const byCheck = new Map();
    for (const v of ctx.violations) {
      if (!byCheck.has(v.check)) byCheck.set(v.check, []);
      byCheck.get(v.check).push(v);
    }
    for (const [check, items] of byCheck) {
      out.push(paint('1', `${CHECK_TITLES[check] || check}  (${items.length})`));
      for (const v of items) {
        const tag = v.severity === 'error' ? paint('31', 'ERROR  ') : paint('33', 'WARNING');
        out.push(`  ${tag} ${v.file}:${v.line}  ->  ${v.target}`);
        out.push(`          [${v.type}] ${v.message}`);
        if (v.hint) out.push(`          ↳ ${v.hint}`);
      }
      out.push('');
    }
  }

  const counts = severityCounts(ctx);
  const summary = `${counts.error} error / ${counts.warning} warning`;
  out.push(counts.error > 0 ? paint('31', `✖ ${summary} —— 门禁未通过`) : paint('32', `✔ ${summary} —— 门禁通过`));

  process.stdout.write(`${out.join('\n')}\n`);
}

function printJson(ctx) {
  const counts = severityCounts(ctx);
  const d = ctx.declarationStats;
  const total = ctx.tracked.length;
  const payload = {
    tool: TOOL,
    toolVersion: TOOL_VERSION,
    // 顶层 root 固定有意义：root 解析失败时回显 --root 请求的路径（绝不静默回退到别的仓库）；
    // 两者都取不到（无 --root 且不在 git 仓库里）才是 null。
    root: ctx.root || ctx.requestedRoot || null,
    requestedRoot: ctx.requestedRoot,
    ledgerBasis: ctx.ledgerBasis,
    ok: counts.error === 0,
    summary: {
      errors: counts.error,
      warnings: counts.warning,
      checks: Object.keys(CHECK_TITLES),
      ledgerFile: ctx.ledgerRel,
      schemaVersion: ctx.ledger ? ctx.ledger.schema_version : null,
      trackedTotal: total,
      universeHash: ctx.universeHash,
      states: {
        bound: ctx.states.bound.length,
        'exempt-pattern': ctx.states['exempt-pattern'].length,
        grandfathered: ctx.states.grandfathered.length,
        unowned: ctx.states.unowned.length,
      },
      statesSum: ctx.states.bound.length + ctx.states['exempt-pattern'].length + ctx.states.grandfathered.length + ctx.states.unowned.length,
      moduleCoverage: {
        boundFiles: d.boundTrackedFiles,
        trackedTotal: total,
        percent: total === 0 ? 0 : Number(((d.boundTrackedFiles / total) * 100).toFixed(4)),
        note: 'bound 只算「被 source.path 精确声明且真实存在且已跟踪」的文件；exempt-pattern 与 planned 都不计入覆盖率。',
      },
      declarations: {
        modulesScanned: d.modulesScanned,
        modulesWithSource: d.modulesWithSource,
        declaredRefs: d.declaredRefs,
        distinctDeclaredPaths: d.distinctDeclaredPaths,
        planned: d.planned,
        existingFile: d.existingFile,
        existingDir: d.existingDir,
        invalid: d.invalid,
        declaredUntracked: d.untrackedFile,
      },
      exemptPatterns: {
        total: ctx.ledger ? ctx.ledger.exempt_patterns.length : 0,
        hitFiles: ctx.states['exempt-pattern'].length,
        unused: ctx.unusedPatterns.map((p) => p.entry.pattern),
        invalid: ctx.invalidPatterns.map((p) => (p.entry && p.entry.pattern) || `exempt_patterns[${p.index}]`),
        tooBroad: ctx.broadPatterns.map((p) => ({
          pattern: (p.entry && p.entry.pattern) || `exempt_patterns[${p.index}]`,
          kind: (p.breadth && p.breadth.kind) || 'unknown',
          ...(p.breadth && p.breadth.kind === 'hit-ratio'
            ? { hits: p.breadth.hits, universe: p.breadth.universe, ratio: Number(p.breadth.ratio.toFixed(4)) }
            : {}),
        })),
      },
      grandfathered: {
        total: ctx.ledger ? ctx.ledger.grandfathered.length : 0,
        removable: ctx.grandfatheredRemovable.length,
        removableDetail: ctx.grandfatheredRemovable.map((item) => ({ path: item.rel, why: item.why })),
        // 棘轮基线（与 HEAD 版台账比）：'head' 正常比对 / 'absent' 或 'no-head' 首次引入（本项跳过、
        // 退出码 0）/ 'unparsable' 基线不可用 → error（fail-closed）/ null 台账未加载，本项未判定。
        baseline: ctx.grandfatheredGrowth.baseline,
        baselineRev: ctx.grandfatheredGrowth.headRev,
        baselineError: ctx.grandfatheredGrowth.headErr,
        headTotal: ctx.grandfatheredGrowth.headTotal,
        growth: ctx.grandfatheredGrowth.added.length,
        growthDetail: ctx.grandfatheredGrowth.added.map((rel) => ({
          path: rel,
          note: 'HEAD 版台账的 grandfathered 里没有该条目（只减不增：新增即手工洗白）',
        })),
      },
      projectDirs: ctx.projectDirs,
    },
    bootstrapError: ctx.bootstrapError,
    violations: ctx.violations.map((v) => ({
      check: v.check,
      severity: v.severity,
      type: v.type,
      file: v.file,
      line: v.line,
      column: v.column || null,
      target: v.target,
      message: v.message,
      hint: v.hint || null,
    })),
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main(process.argv.slice(2));
