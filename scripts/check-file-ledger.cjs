#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/check-file-ledger.cjs
 * 全仓文件台账门禁（file-ledger guard）——增量 1（文件级，不做行级）；schema_version 2
 * ---------------------------------------------------------------------------
 * 目的：让「这个文件有没有人管」变成可断言的机器事实。
 *
 * 为什么需要它（历史缺口，实测）：把一个已跟踪、且没有任何模块声明的文件放进仓库，
 * `validateProject` 对它**零提及**——引擎只回答「哪个模块漂移了」，从不回答
 * 「哪些文件没人管」。唯一近似的 normify_sync「新文件建议」只看**未跟踪**文件，
 * 还用 IGNORE_DIR 主动排除 lib/（src/tools.ts:988-993），而 lib/ 有 84 个**已跟踪**文件，
 * 不是 gitignore 覆盖物：按「构建产物」把它排除掉会丢掉全仓相当一部分已跟踪文件。
 *
 * 绿灯依据只有一条：**台账里有条目**（owned / exempt / accounted 三条来路）：
 *   owned      有模块归属：被某个模块的 source.path **精确声明**，且该路径是仓库里真实存在的普通文件；
 *   exempt     显式豁免：命中**独立豁免清单** ledger/exempt.gitignore 里的某条模式（每条必填 reason）；
 *   accounted  已清点记账：在 ledger/file-ledger.json 的 accounted 清单里，**每条必须带**
 *              accounted_at（清点日期）与 basis（清点依据）——缺依据不是条目，是洗白。
 *
 * 四态归属（每个已跟踪文件必须落到且只落到一类，四类计数之和必须等于 git ls-files 条数）：
 *   owned      同上；exempt 同上；accounted 同上；
 *   unowned    三类都不占 → **error**（已跟踪但无条目即 error，**包括刚提交的文件**）。
 *
 * 明确否掉的两套旧说法：
 *   ① 「在 HEAD 里即绿」**不成立**：文件旧 ≠ 已记账；git 索引只定义**待清点的全集**，不是绿灯；
 *   ② accounted **不是欠账**：它是**已清点记账的正账**（每条带日期与依据），只是这条清单
 *      **不再增长**——相对 HEAD 版台账的任何新增 → accounted-growth（error），
 *      挡住「手工把路径写进清单再 git add」这条洗白路径（判据是集合包含，不是条数）。
 *
 * planned 与 owned 分离（本门禁最容易被做成假绿的地方）：
 *   `source.path` 的声明分两种事实——「声明写在那里」与「目标真的存在」。声明条数不在此复述
 *   （取数：node scripts/check-file-ledger.cjs --json 读 declaredRefs）；当前仓库的声明全部指向
 *   **不存在的目标路径**（计划态），因此 owned 必须是 0，
 *   覆盖率必须报 0.00%。把 planned 算成已覆盖会让覆盖率从 0% 假跳到 100%，
 *   所以报告里 planned / owned / existing / untracked 四个数分开回显，绝不合并。
 *
 * 豁免清单是**独立文件**（v2 起；不再是台账 JSON 的内嵌数组）：ledger/exempt.gitignore。
 *   · 语法 = gitignore：`**`（跨 `/` 任意层，至少一层）/ `*`（不跨 `/`）/ `?`（单个非 `/` 字符）；
 *     `!` 前缀 = 反选（顺序敏感：**最后一条命中的条目说了算**）；`#` 整行注释；空行忽略；
 *   · 行尾字段约定：`<pattern> ## reason=<非空理由> [ ## since=YYYY-MM-DD ] [ ## broad_confirmed=true|false ]`，
 *     缺 reason / 未知字段 / 值非法 / 不支持的元字符 → exempt-invalid（error，不猜不降级）；
 *   · 它**不**复用真 .gitignore 的规则（已跟踪文件本来就不受 ignore 约束，把忽略规则当豁免依据
 *     是语义碰撞：本会话真实事故 `*review*.md` 在 core.ignoreCase=true 下命中 preview.md）；
 *   · 大小写语义必须显式：与 `core.ignoreCase` 一致（本仓 true），不用平台默认、不用 localeCompare；
 *     仅靠折叠才命中的路径单独报 error（exempt-case-fold-overmatch）——那正是上面那类事故；
 *   · 与真 .gitignore 交叉校验（exempt-gitignore-cross-check，error）：
 *     ① 本清单命中的已跟踪路径 ∩ 真 .gitignore 覆盖（`git check-ignore --no-index`，尊重 `!` 反选）≠ ∅；
 *     ② 仅靠 core.ignoreCase 折叠才命中；
 *     ③ 本清单命中的路径「未被忽略、也不在 git 索引里」（本该 git add 的普通文件被豁免静默放行）；
 *   · 「过宽」三条判据保留（前两条不可人工确认）：
 *     ① 归一化（去掉 `*` `?` 与 `/`）后没有任何字面量字符 → error（`**`、`*`、`**` 后接 `/*`、`?`）；
 *     ② 通配字符（`*` `?`）占比 > PATTERN_MAX_WILDCARD_RATIO（默认 50%）→ error；
 *     ③ 单条模式命中率 > PATTERN_MAX_HIT_RATIO（默认 50% 宇宙）→ error，除非该条目显式写了
 *        `broad_confirmed=true`（人工确认这条模式确实要覆盖过半已跟踪文件）。
 *     被判过宽的模式**不参与匹配**（宁可红不假绿）：它本该吞掉的文件会落回 accounted / unowned；
 *   · 未命中的条目 → warning（未命中的豁免等于**永久空白特权**：它会无声地放过未来匹配该模式的路径）。
 *
 * accounted 的判据（v2 起是对象数组，每条 { path, accounted_at, basis }）：
 *   · 缺 path / accounted_at / basis，或 accounted_at 不是 YYYY-MM-DD，或路径重复 → accounted-invalid（error）；
 *   · 条目已经 owned、已经命中豁免、已经从索引消失、或清单内重复 → accounted-removable（warning，可操作）；
 *   · 相对 HEAD 版台账的任何新增 → accounted-growth（error，逐条点名）。
 *
 * 判定基准：**git 索引**（`git ls-files -z`），不是工作区磁盘列举。
 *   台账宇宙 = 已跟踪文件；被忽略文件（node_modules/ 等）不在宇宙内，台账不假装覆盖它们
 *   （理由写在 ledger/file-ledger.json 的 meta.known_divergences 里）。
 *   路径「是否存在」同时看两件事：git 索引里有该条目（tracked）与磁盘上 lstat 到普通文件
 *   （regularFile）——目录不算普通文件，声明目录不会被当成「已拥有」。
 *   台账**与豁免清单**的内容同样以索引 blob 为准（`git show :<rel>`，与 scripts/check-lib-sync.cjs 同构）：
 *   工作区与索引不一致 → ledger-index-drift（error）；不在索引里（没 git add）→ 同样 error。
 *   这一条正是为了掐掉「本地绿依赖一个未提交改动」：CI/新克隆只看得到索引内容。
 *
 * `**` 语义与标准 glob 的差异（R8，必须写明）：本门禁的 `**` 是 `.*`（**至少匹配一层**），
 *   因此 `**` 后接 `/*.md` 的写法 **不** 匹配根级 `c.md`，只匹配带目录段的路径；`*` 与 `?` 都不跨 `/`。
 *   要同时覆盖根级与任意层，请分别写 `*.md` 与 `**` 后接 `/*.md` 两条。
 *
 * 失败关闭（宁可红也不要假绿）：
 *   · 台账或豁免清单缺失 / 不可解析 / 结构非法（缺 reason、pattern 非法、accounted 非对象数组）→ error；
 *   · git 不可用 / 不是 git 仓库 / 拿不到跟踪清单 → error；
 *   · yaml 不可用（解析模块 frontmatter 必需）→ error；
 *   · 模块文件读不到 / frontmatter 解析失败 → error（绝不静默跳过该模块的声明）；
 *   · HEAD 版台账读不出 / 不可解析 / schema_version 不匹配 / 缺 accounted 数组 → error（基线不可用不许静默跳过）；
 *   · `git check-ignore --no-index` 的输出结构不认识 → error（不猜格式，宁可红）。
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

/**
 * 共享内核（唯一事实来源）：模式编译 / 过宽静态判据 / 独立豁免清单解析 / 四态判定 / accounted 校验，
 * 与写入侧 scripts/generate-file-ledger.cjs 用的是**同一份**实现（否则两道门禁会互相矛盾）。
 */
const core = require('./file-ledger-core.cjs');

const TOOL = 'check-file-ledger';
const TOOL_VERSION = '1.3.0';

/** 台账数据文件（相对仓库根，posix）。 */
const LEDGER_REL = core.LEDGER_REL;
/** 独立豁免清单（相对仓库根，posix）：gitignore 语法 + 每条必填理由。 */
const EXEMPT_REL = core.EXEMPT_REL;
/** 台账 schema 版本；不匹配即 error（结构变了必须显式升级，不做静默兼容）。 */
const LEDGER_SCHEMA_VERSION = core.LEDGER_SCHEMA_VERSION;

const relPosix = core.relPosix;
const absOf = core.absOf;
const byCodePoint = core.byCodePoint;
const foldCase = core.foldCase;
const normalizeEol = core.normalizeEol;
const execGit = core.execGit;

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
 * 豁免模式「过宽」判据的阈值（与 scripts/file-ledger-core.cjs 同源）。改这里必须同步改三处文字：
 * 本文件的 --help、CONTRIBUTING.md 的检查项清单、.github/workflows/ci.yml 的 File ledger 注释。
 */
/** 通配字符占比上限：`*` `?` 的个数 / pattern 长度 超过它即视为几乎没有限定作用。 */
const PATTERN_MAX_WILDCARD_RATIO = core.PATTERN_MAX_WILDCARD_RATIO;
/** 单条模式命中率上限：命中文件数 / 台账宇宙 超过它即视为吞门禁（可用 broad_confirmed 人工确认）。 */
const PATTERN_MAX_HIT_RATIO = core.PATTERN_MAX_HIT_RATIO;
/** 命中率超阈值时的人工确认字段名（值必须是布尔 true；缺失即 error）。 */
const PATTERN_BROAD_CONFIRM_FIELD = core.EXEMPT_BROAD_CONFIRM_FIELD;

/**
 * 检查项 id → 人类可读标题。
 * **顺序即 printHelp 的编号顺序，也是本表 Object.keys() 的顺序**（--json 的 summary.checks 直接取它）。
 * 唯一事实来源：printHelp 不再自带一份编号列表，而是从本表生成。
 */
const CHECK_TITLES = {
  'unowned-file': '已跟踪但无条目（无模块归属、不命中豁免、也不在 accounted 清单）——已跟踪但无条目即 error',
  'accounted-removable': 'accounted 清单腐烂：条目已经 owned/豁免/消失/重复，应当从清单里删掉（清单只减不增）',
  'accounted-growth': 'accounted 清单新增条目（与 HEAD 版台账比对：只减不增，任何新增即手工洗白）',
  'accounted-invalid': 'accounted 条目非法（缺 accounted_at 或 basis、日期格式不对、路径重复）——没有依据的条目不是记账',
  'exempt-unused': '豁免条目未命中任何已跟踪文件（可能是过期规则或拼写错误）',
  'exempt-invalid': '豁免清单不可用或条目非法（文件缺失/不可解析、缺 reason、pattern 写法不受支持）',
  'exempt-too-broad': '豁免模式过宽（无字面量 / 通配占比过高 / 命中率超阈值未人工确认）——会静默吞掉整个门禁',
  'exempt-gitignore-cross-check': '豁免清单 × 真 .gitignore 交叉校验（交集 / 大小写折叠误伤 / 放行了本该 git add 的普通文件）',
  'ledger-missing': '台账数据文件缺失、不可解析或顶层结构非法',
  'ledger-index-drift': '台账或豁免清单的内容与 git 索引不一致（工作区改动未 git add，或根本不在索引里）',
  'tracked-mismatch': '台账元信息与 git 索引不一致（universe_hash 对不上或 tracked_total 漂移）',
  'declared-untracked': '模块 source.path 声明的目标在磁盘上存在、却不在 git 索引里（本该 git add）',
  'guard-unavailable': '门禁自身不可用（git / yaml / 模块文件 / git check-ignore 输出不可用）',
};

/** 每一项检查在 --help 里的补充说明（可选）。编号由 printHelp 按 CHECK_TITLES 的顺序生成。 */
const CHECK_HELP_DETAILS = {
  'unowned-file': [
    '· 判据：已跟踪 − owned − exempt − accounted ≠ ∅ → 逐条 error（不是计数）。',
    '· 「已跟踪但无条目即 error」没有例外：**刚提交的文件同样不豁免**（「它刚进 HEAD」不是条目）。',
    `· **新增一个已跟踪文件时只有两条路**：让某个模块用 source.path 精确声明它（→ owned）；或在 ${EXEMPT_REL} 里`,
    '  加一条**带 reason** 的模式豁免（→ exempt）。**「把新文件加进 accounted 转绿」这条路不存在**：',
    '  accounted 是**存量正账**，任何新增条目 → accounted-growth/error（生成器 --check 同样 exit 1，',
    '  写盘模式的生成器还会拒绝写盘并逐条点名）——判据是与 HEAD 版台账比集合包含，不是条数。',
  ],
  'accounted-removable': [
    '· 清单里的路径若已经 owned、已经命中豁免、或已经从 git 索引消失、或清单内重复 → warning 提示删除。',
    '· 报告回显「accounted 还可再减 N 条」（可操作信息），清单腐烂不会被静默容忍。',
  ],
  'accounted-growth': [
    `· 判据：\`git show HEAD:${LEDGER_REL}\` 的 accounted 路径集合 ⊇ 本次台账的 accounted 路径集合。`,
    '  台账内容取**索引 blob**（与 ledger-index-drift 同基准），基线取 **HEAD 版台账**（提交后不可篡改）；',
    '  两者都与工作区磁盘无关，所以「改了索引没改工作区」同样成立。',
    '· **任何新增（含把一条曾删掉的条目重新加回）→ error**；允许集合缩小（删条目不是违规）。',
    '· 「路径在 HEAD 里」**不是**绿灯理由：旧 ≠ 已记账。手工把一条在索引里的路径写进 accounted',
    '  再 git add —— 正是本项要拦的事（旧版 keep-only 比的是同一份被改过的台账，因此会漏）。',
    `· 合法修法两条：① 让某个模块用 source.path 精确声明它；② 在 ${EXEMPT_REL} 里加一条**带 reason**`,
    '  的模式豁免。accounted **不是欠账**：那 29 条是已清点记账的正账（带日期与依据），只是不再增长。',
    '· 三态：HEAD 里有台账且 schema_version 匹配 → 正常比对；HEAD 里没有该文件（首次引入 / 仓库尚无提交）',
    '  → **本项跳过、退出码 0**，报告明确回显「基线由本次提交建立」（一次性初始化语义，`git commit` 之后生效）；',
    '  HEAD 里有该文件却读不出 / 不是合法 JSON / schema_version 不匹配 / 缺 accounted 数组 → **error**',
    '  （fail-closed：删掉或写坏 HEAD 版台账绝不能变成洗白路径；版本不匹配时门禁直接 error 是有意的：',
    '  台账数据、门禁、生成器、豁免清单必须**同一次提交**一起改）。',
  ],
  'accounted-invalid': [
    '· 每条 accounted 必须是对象 `{ path, accounted_at, basis }`，三个字段都必填且必须是非空字符串。',
    '· `accounted_at` 必须是 `YYYY-MM-DD` 的清点日期；`basis` 是清点依据（例：「本会话之前的既有文件，',
    '  尚未分配归属（2026-10-05 清点记账）」）。**依据为空/缺失 → error**：没有依据的条目不是记账，是洗白。',
    '· 路径重复同样报本项（重复条目属于腐烂，accounted-removable 也会兜一层）。',
  ],
  'exempt-unused': [
    '· 一条豁免条目本次没有任何已跟踪文件命中 → warning（可能是过期规则或拼写错误）。',
    '· 未被命中的豁免等于永久空白特权：它会无声地放过未来任何匹配该模式的路径。',
  ],
  'exempt-invalid': [
    `· ${EXEMPT_REL} 缺失 / 读不到 / 不在索引里 → error（豁免清单是判定依据之一，读不到就不判定）。`,
    '· 条目缺 reason / reason 为空 / 出现未知行尾字段 / 值非法 → error（豁免必须写明理由，否则等于静默放宽门禁）。',
    '· 只支持 `**`、`*`、`?` 三种通配（不支持字符类、花括号与转义），出现其它元字符按 error 报出不猜。',
    '· 写法合法但「过宽」的模式不属于本项，见下一项 exempt-too-broad（两类分开报，修法不同）。',
  ],
  'exempt-too-broad': [
    `· 判据 1（不可豁免）：归一化（去掉 \`*\` \`?\` 与 \`/\`）后没有任何字面量字符 → error。`,
    '  例：`**`、`*`、`**/*`、`?`——豁免先于 accounted 判定，这类模式会把整个宇宙变成 exempt（实测假绿）。',
    `· 判据 2（不可豁免）：通配字符占比 > ${PATTERN_MAX_WILDCARD_RATIO * 100}% → error。例：\`a**\`（通配 2 / 长度 3 = 67%）——`,
    '  它含字面量 `a`，所以先过判据 1、确实走到本判据（另一例 `**/a*`：通配 3 / 长度 5 = 60%）。',
    '  **别拿 `**/*` 当本判据的例子**：它归一化后没有任何字面量，实测先被**判据 1** 拦下（kind=`no-literal`），根本走不到这里。',
    `· 判据 3（可人工确认）：单条模式命中率 > ${PATTERN_MAX_HIT_RATIO * 100}% 台账宇宙 → error，`,
    `  除非该条目显式写了 \`${PATTERN_BROAD_CONFIRM_FIELD}=true\`（人工确认它确实要覆盖过半已跟踪文件）。`,
    '· 被判过宽的模式**不参与匹配**：它本该吞掉的文件会落回 accounted/unowned，绝不静默放过。',
  ],
  'exempt-gitignore-cross-check': [
    '· 判据 1（交集）：本清单命中的**已跟踪**路径若同时被真 .gitignore 覆盖（`git check-ignore --no-index`，',
    '  尊重 `!` 反选）→ error。理由：**已跟踪文件本来就不受 ignore 约束** —— 命中忽略规则**不会**把它移出索引，',
    '  `git ls-files -- <路径>` 照样列出它（本批实测：把 `README.md` 写进 `.gitignore` 后 `git check-ignore --no-index -v`',
    '  命中该规则，而 `git ls-files -- README.md` 仍列出、`git ls-files` 总条数不变），所以它**仍然是台账宇宙的一员**；',
    '  为它写豁免等于**把忽略规则当成了豁免依据**，是语义碰撞。**旧文案写"它根本不在台账宇宙里"，与本项自己的前提',
    '  "本清单命中的**已跟踪**路径"自相矛盾（已跟踪 = 在 `git ls-files` 里 = 在台账宇宙里），已作废。**',
    '· 判据 2（折叠误伤）：只靠 `core.ignoreCase` 折叠才命中的路径 → error。本会话真实事故：',
    '  `*review*.md` 在 core.ignoreCase=true 下命中 `preview.md`（preview 含子串 review）。',
    '· 判据 3（放行了本该 git add 的普通文件）：本清单命中的路径若「未被忽略、也不在 git 索引里」→ error。',
    '· 为什么必须做：一条本想忽略审阅稿的规则，可能意外变成若干文件的永久豁免依据（上面的真实事故）。',
  ],
  'ledger-missing': [
    '· 文件不存在 / 不是合法 JSON / 顶层缺字段 / 类型不符 → error，退出码 1。',
    '· 台账是门禁的唯一事实来源，读不到就无从判定，绝不降级为「跳过检查」。',
    '· 注意与 guard-unavailable 的分工：台账自身的问题报本项，git / yaml / 模块文件不可用报后者。',
  ],
  'ledger-index-drift': [
    `· 台账**与豁免清单**的内容都以 git 索引 blob 为准（\`git show :<rel>\`，与 check-lib-sync.cjs 同构）：`,
    '  工作区副本与索引版不一致（改了没 git add / 索引里有而工作区没有）→ error，判定仍按索引版进行。',
    '· 索引里根本没有这个条目（新台账/新豁免清单没 git add）→ 同样 error：否则「本地绿」会依赖一个未提交改动，',
    '  CI 与新克隆拿到的索引内容与本地不是同一份事实。临时夹具仓库请先 `git add` 再跑门禁。',
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
    '· `git check-ignore --no-index` 的输出结构不认识 → error（交叉校验不猜格式；宁可红也不假绿）。',
  ],
};

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
    '  1  存在 error 级违规，或工具链不可用（git / yaml / 台账 / 豁免清单）',
    '  2  命令行用法错误',
    '',
    '读 / 写：',
    '  读：git 索引（`git ls-files`）、ledger/file-ledger.json 与 ledger/exempt.gitignore 的索引 blob、',
    '      棘轮基线 `git show HEAD:ledger/file-ledger.json`、模块 frontmatter（YAML）、真 .gitignore；',
    '  写：不写任何文件（结论只走 stdout / stderr；--json 也只写 stdout）。',
    '',
    'check 链位置（npm 脚本 `check` 的实际顺序，环名照抄）：',
    '  第 10 环 `npm run check:ledger`（= 本脚本）——前一环是第 9 环 `npm run check:ledger:gen`，',
    '  后一环是第 11 环 `npm run check:graph`。',
    '',
    '绿灯依据只有一条：**台账里有条目**（三条来路）——owned / exempt / accounted。',
    '  已跟踪但**没有任何条目** → error，**包括刚提交的文件**。',
    '  **新增一个已跟踪文件时只有两条路**：模块 source.path 精确声明（→ owned）、或豁免清单里加一条',
    '  带 reason 的模式（→ exempt）；**「把新文件加进 accounted 转绿」走不通**（新增条目即 accounted-growth/error，',
    '  生成器 --check 同样红、写盘模式还会拒绝写盘）。',
    '  ① 「在 HEAD 里即绿」**不成立**：git 索引只定义**待清点的全集**，文件旧 ≠ 已记账；',
    '  ② accounted **不是欠账**：那 29 条是**已清点记账的正账**（每条带 accounted_at 与 basis），',
    '     只是这条清单**不再增长**（相对 HEAD 的任何新增 → accounted-growth/error）。',
    '',
    '四态归属（计数之和 == git ls-files 条数）：',
    `  owned       被模块 source.path 精确声明，且目标是真实存在的普通文件`,
    `  exempt      命中独立豁免清单 ${EXEMPT_REL} 的某条模式（每条必带 reason）`,
    `  accounted   ${LEDGER_REL} > accounted 清单里的存量文件（每条带 accounted_at + basis；**只减不增**）`,
    '  unowned     三类之外 → error（已跟踪但无条目，必须归属或显式豁免）',
    '',
    'planned 与 owned 必须分开（否则覆盖率假绿）：',
    '  声明存在（planned）≠ 已拥有（owned）。当前仓库的声明全部指向不存在的目标路径，',
    '  所以 owned 必须是 0、覆盖率必须报 0.00%；报告里 planned / owned / existing / untracked',
    '  四个数分开回显，绝不合并成一个「覆盖率」。',
    '',
    `台账数据文件：${LEDGER_REL}（accounted 清单 + 元信息；跨平台 posix 路径）。`,
    `独立豁免清单：${EXEMPT_REL}（gitignore 语法 + 每条必填 reason + 与真 .gitignore 交叉校验）。`,
    '重新生成：node scripts/generate-file-ledger.cjs（改完仓库后必须重跑，否则 tracked-mismatch 报错）。',
    '',
    `豁免清单的写法（${EXEMPT_REL}）：`,
    `  <pattern> ## reason=<非空理由> [ ## since=YYYY-MM-DD ] [ ## broad_confirmed=true|false ]`,
    '  · 空行忽略；`#` 开头的整行是注释；',
    '  · `!` 前缀 = 反选（顺序敏感，**最后一条命中的条目说了算**，与 gitignore 一致）；',
    '  · 只有 `**` / `*` / `?` 三种通配；`[` `]` `{` `}` 与开头的 `\\` 一律 error（不猜）；',
    '  · 每条**必须**写 reason：缺理由 / 理由为空 / 未知行尾字段 → exempt-invalid（error）。',
    '',
    '豁免模式「过宽」判据（豁免先于 accounted 判定，一条过宽模式就能把门禁静默关掉）：',
    '  1. 归一化（去掉 * ? 与 /）后没有任何字面量字符 → error（不可豁免）：`**`、`*`、`**/*`、`?`；',
    `  2. 通配字符（* ?）占比 > ${PATTERN_MAX_WILDCARD_RATIO * 100}% → error（不可豁免），例：\`a**\`（通配 2 / 长度 3 = 67%；\`**/*\` 不属本判据——它没有字面量，先被判据 1 拦下）；`,
    `  3. 单条模式命中率 > ${PATTERN_MAX_HIT_RATIO * 100}% 台账宇宙 → error，除非该条目写了`,
    `     broad_confirmed=true（人工确认它确实要覆盖过半已跟踪文件）。`,
    '  被判过宽的模式不参与匹配，它本该吞掉的文件会落回 accounted/unowned（宁可红不假绿）。',
    '',
    '豁免模式语义（与标准 glob 的差异，必须知道）：',
    '  `**` 至少匹配一层（编译成 `.*`），所以 `**/*.md` **不**匹配根级 c.md，只匹配带目录段的路径；',
    '  `*` 与 `?` 都不跨 `/`。要同时覆盖根级与任意层，请分别写 `*.md` 与 `**/*.md`。',
    '',
    '大小写语义（必须显式，不依赖平台默认）：',
    '  模式匹配与 `core.ignoreCase` 一致（本仓 true）——git 在本仓也是折叠匹配；',
    '  仅靠折叠才命中的路径 → exempt-case-fold-overmatch（error）：',
    '  `*review*.md` 在 core.ignoreCase=true 下命中 `preview.md`（preview 含子串 review）是本会话真实事故。',
    '',
    '与真 .gitignore 的交叉校验（exempt-gitignore-cross-check，error）：',
    '  ① 本清单命中的已跟踪路径 ∩ 真 .gitignore 覆盖（`git check-ignore --no-index`，尊重 `!` 反选）≠ ∅；',
    '  ② 仅靠 core.ignoreCase 折叠才命中（上面的事故形态）；',
    '  ③ 本清单命中的路径「未被忽略、也不在 git 索引里」——本该 git add 的普通文件被豁免静默放行。',
    '  为什么必须做：已跟踪文件本来就不受 ignore 约束，把忽略规则当豁免依据是语义碰撞。',
    '',
    'accounted 棘轮的判据（与 HEAD 版台账比对）：',
    `  基线 = \`git show HEAD:${LEDGER_REL}\` 的 accounted 路径集合；判定对象 = **索引版**台账的 accounted；`,
    '  判据 = 基线集合 ⊇ 本次集合。允许集合缩小（删条目不是违规），**任何新增（含把一条曾删掉的条目',
    '  重新加回）→ accounted-growth（error）**：报告逐条列出新增路径，并给出可能的合法修法。',
    '  为什么基线必须是 HEAD：旧版 keep-only 比的是「同一份被改过的台账」，于是人可以把一条**已在 git 索引里**、',
    '  又未被模块声明、也不命中豁免的路径手工写进清单再 `git add`，门禁与 --check 双双报绿；',
    '  HEAD 版台账在提交之后不可被工作区改动影响，比对才有意义。',
    `三态语义（含首次引入的一次性初始化）：HEAD 里有且 schema_version=${LEDGER_SCHEMA_VERSION} → 正常比对；`,
    '  HEAD 里没有该文件（首次引入）/ 仓库尚无提交 → **本项跳过、退出码 0**，报告回显「基线由本次提交建立」；',
    '  HEAD 里有却读不出 / 不是合法 JSON / schema_version 不匹配 / 缺 accounted 数组 → **error（fail-closed）**：',
    '  删掉、写坏或只升一半版本的 HEAD 版台账绝不能变成新的洗白路径。',
    '  「版本不匹配直接 error」是有意的：台账数据、门禁、生成器、豁免清单必须同一次提交一起改。',
    '「只减不增」的准确含义（两套旧说法在此明确否掉）：',
    '  ① 「在 HEAD 里即绿」**不成立**：文件旧 ≠ 已记账，绿灯依据是**台账里有条目**；',
    '  ② accounted **不是欠账**：那些条目是**已清点记账的正账**（清点日期与依据逐条写在台账里），',
    '     只是这条清单**不再增长**。合法修法只有两条：让某个模块用 source.path 精确声明它；',
    `     或在 ${EXEMPT_REL} 里加一条**带 reason** 的模式豁免。两条都不适用时，删掉那条新增条目即可恢复绿`,
    '     （而不是给清单加条目）。',
    '',
    '检查项（编号顺序 = 报告分组顺序 = --json 的 summary.checks 顺序）：',
    ...checkList,
    '',
    '判定基准：git 索引（`git ls-files`），不是工作区磁盘列举；',
    '  被忽略文件不在台账宇宙内（理由见台账 meta.known_divergences）。',
    `  台账与豁免清单的内容同样取索引 blob（\`git show :<rel>\`）：工作区与索引不一致、`,
    '  或其中任何一份不在索引里（没 git add）→ ledger-index-drift（error），判定仍按索引版进行。',
    '  临时夹具仓库请先 `git add` 台账与豁免清单再跑本门禁。',
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
    exemptRel: EXEMPT_REL,
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
      ownedTrackedFiles: 0,
    },
    projects: [],
    states: { owned: [], exempt: [], accounted: [], unowned: [] },
    accountedRemovable: [],
    /**
     * accounted 棘轮（与 HEAD 版台账比对）的判定结果。
     * baseline 四态：'head'（HEAD 里有且版本匹配，正常比对）/ 'absent'（HEAD 里没有该文件 = 首次引入，
     * 本项跳过）/ 'no-head'（仓库尚无提交）/ 'unparsable'（HEAD 里有但读不出、结构非法或 schema_version
     * 不匹配 → error，fail-closed）。added 是相对 HEAD 的新增条目。
     */
    accountedGrowth: {
      baseline: null,
      headTotal: null,
      added: [],
      headErr: null,
      headParsed: null,
      headRev: null,
    },
    /** 独立豁免清单（ledger/exempt.gitignore）：条目、匹配器、语法问题、判定基准。 */
    exemptEntries: [],
    exemptMatchers: [],
    exemptProblems: [],
    exemptBasis: null,
    exemptFileError: null,
    /** 大小写折叠语义：'true' / 'false' / 'unset'（显式回显，不依赖平台默认）。 */
    ignoreCaseRaw: 'unset',
    /** 仅靠 core.ignoreCase 折叠才命中的豁免命中（`*review*.md` 命中 `preview.md` 那类事故）。 */
    exemptCaseFoldOnly: [],
    /** 本清单命中的已跟踪路径 ∩ 真 .gitignore 覆盖（--no-index，已排除 `!` 反选）。 */
    exemptGitignoreIntersection: [],
    /** 本清单命中、但「未被忽略、也不在 git 索引里」的路径（本该 git add）。 */
    exemptTrackableUntracked: [],
    /** 交叉校验的取数回显（候选数 / 覆盖数 / 未跟踪候选数）。 */
    exemptGitignoreStats: { candidates: 0, covered: 0, untrackedChecked: 0, ignoreCase: 'unset' },
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

  ctx.ignoreCaseRaw = core.readIgnoreCase(ctx.root);
  ctx.exemptGitignoreStats.ignoreCase = ctx.ignoreCaseRaw;

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
        `${LEDGER_REL} 与 ${EXEMPT_REL} 作为事实来源；任一不可用都宁可红也不要假绿。`,
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

/** 豁免清单自身的违规：文件缺失 / 不可解析 / 条目语法非法 → 一律 `exempt-invalid`（error）。 */
function reportExemptInvalid(ctx, message, extra) {
  ctx.report({
    check: 'exempt-invalid',
    severity: 'error',
    type: (extra && extra.type) || 'exempt-invalid',
    file: ctx.exemptRel,
    line: (extra && extra.line) || 1,
    column: null,
    target: (extra && extra.target) || ctx.exemptRel,
    message,
    hint:
      (extra && extra.hint) ||
      `豁免清单是判定依据之一：每条模式必须带 reason（写法见 ${ctx.exemptRel} 文件头与本脚本 --help）。`,
  });
}

/**
 * 台账 / 豁免清单的内容与索引不一致（R7）：工作区改动没 git add / 索引有而工作区没有 / 根本不在索引里。
 * 与 ledger-missing 分开报：文件本身可读、只是「本地看到的」与「索引里的」不是同一份事实。
 */
function reportLedgerIndexDrift(ctx, message, extra) {
  const rel = (extra && extra.file) || ctx.ledgerRel;
  ctx.report({
    check: 'ledger-index-drift',
    severity: 'error',
    type: (extra && extra.type) || 'ledger-index-drift',
    file: rel,
    line: 1,
    column: null,
    target: (extra && extra.target) || rel,
    message,
    hint:
      (extra && extra.hint) ||
      `本地绿不能依赖未提交改动：要么 git add ${rel} 把改动纳入索引，要么用 git checkout -- ${rel} 丢弃工作区改动。`,
  });
}

// ---------------------------------------------------------------------------
// 台账 / 豁免清单的读取与结构校验
// ---------------------------------------------------------------------------

/**
 * 取 git 索引里的文件原始字节（`git show :<rel>`，与 scripts/check-lib-sync.cjs:226-233 同构）。
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
 * 读 **HEAD 版**台账，作为 accounted「只减不增」的**不可篡改基线**。
 * 为什么必须用 HEAD 而不是「上一份台账」：判定基准若与被判定的对象是同一份文件，
 * 人手工往 accounted 加一条（路径确实在索引里、又未被模块声明、也不命中豁免）再 `git add`，
 * keep-only 规则会认为它「原本就在清单里」而放行——门禁与 `--check` 双双报绿（实测过的洗白后门）。
 * HEAD 版台账在提交后不可被工作区改动影响（「在 HEAD 里」本身不是绿灯理由，它只是基线的载体）。
 *
 * 返回 { status, ... }：
 *   · 'no-head'         仓库还没有任何提交（连 HEAD 都不存在）——与「HEAD 里没有该文件」同档；
 *   · 'absent'          HEAD 里有仓库，但没有 ledger/<...> 这个条目 → **首次引入的一次性初始化语义**，
 *                       本项跳过且**不许红**（基线由本次提交建立，提交之后任何新增都会被拦住）；
 *   · 'unparsable'      HEAD 里有该文件却读不出 / 不是合法 JSON / schema_version 不匹配 /
 *                       顶层结构非法 → fail-closed（调用方报 error）：删掉、写坏或只升一半版本的
 *                       HEAD 版台账绝不能变成新的洗白路径；
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
    // 不猜 git 的失败原因：HEAD 里到底有没有这个条目，用 cat-file -e 单独问一次（首次引入与真正的读失败要分开）。
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
  // 版本必须与本次判定一致：版本不匹配直接 error 是有意的（台账数据 / 门禁 / 生成器 / 豁免清单
  // 必须同一次提交一起改），否则「只升一半版本」会成为新的洗白路径。
  if (parsed.schema_version !== LEDGER_SCHEMA_VERSION) {
    return {
      status: 'unparsable',
      rev,
      message:
        `HEAD 版台账 schema_version=${JSON.stringify(parsed.schema_version)}，本门禁要求 ` +
        `${LEDGER_SCHEMA_VERSION}（结构变了必须显式升级，不做静默兼容）：台账数据、门禁、生成器、` +
        `豁免清单必须**同一次提交**一起改。`,
    };
  }
  // 只需要 accounted 路径集合做包含性判定；它缺失/类型不符同样 fail-closed（不按「空清单」放过）。
  if (!Array.isArray(parsed.accounted)) {
    return {
      status: 'unparsable',
      rev,
      message: `HEAD 版台账缺 accounted 数组（实际 ${JSON.stringify(parsed.accounted)}）`,
    };
  }
  const paths = [];
  for (const [index, entry] of parsed.accounted.entries()) {
    const p = entry && typeof entry === 'object' ? entry.path : undefined;
    if (typeof p !== 'string' || p === '') {
      return {
        status: 'unparsable',
        rev,
        message: `HEAD 版台账 accounted[${index}] 缺 path（实际 ${JSON.stringify(entry)}）`,
      };
    }
    paths.push(p);
  }
  return { status: 'ok', rev, ledger: parsed, accountedPaths: paths };
}

/**
 * accounted 棘轮：**相对 HEAD 版台账只允许集合缩小**。
 * 判定用索引版台账（ctx.ledger）对 HEAD 版台账，两者都与工作区磁盘无关。
 * 三态语义与原因见 readHeadLedger 的注释；'absent' / 'no-head'（首次引入）跳过且不红。
 */
function checkAccountedGrowth(ctx) {
  const result = readHeadLedger(ctx.root, ctx.ledgerRel);
  // 对外统一口径：'head' / 'absent' / 'no-head' / 'unparsable'。
  ctx.accountedGrowth.baseline = result.status === 'ok' ? 'head' : result.status;
  ctx.accountedGrowth.headRev = result.rev || null;
  if (result.status === 'unparsable') {
    ctx.accountedGrowth.headErr = result.message;
    return;
  }
  if (result.status !== 'ok') return; // 'absent' / 'no-head'：首次引入，本项跳过（不许红）

  const headSet = new Set(result.accountedPaths);
  ctx.accountedGrowth.headTotal = headSet.size;
  ctx.accountedGrowth.headParsed = result.ledger;
  for (const entry of ctx.ledger.accounted) {
    if (headSet.has(entry.path)) continue;
    ctx.accountedGrowth.added.push(entry.path);
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
    // 索引里没有、HEAD 里却有该台账：判定基准退化为工作区副本，accounted 棘轮的索引基线也随之失效。
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

/**
 * 读**独立豁免清单**：与台账同一套基准（索引 blob 优先，退回工作区副本并报 ledger-index-drift）。
 * 读不到（两边都没有 / 不在索引里且工作区也没有）→ 返回 false，由调用方报 exempt-invalid（error）：
 * 豁免清单是判定依据之一，读不到就不判定（宁可红也不假绿）。
 */
function loadExemptFile(ctx) {
  const abs = absOf(ctx.root, ctx.exemptRel);
  const indexBlob = readIndexBlob(ctx.root, ctx.exemptRel);

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
    ctx.exemptBasis = 'index';
    if (worktreeText === null) {
      reportLedgerIndexDrift(ctx, `工作区里的豁免清单与 git 索引不一致：索引里有 ${ctx.exemptRel}，工作区里取不到（${worktreeError}）。`, {
        file: ctx.exemptRel,
        type: 'exempt-worktree-missing',
        target: `${ctx.exemptRel}#worktree-missing`,
        hint: `判定按索引版进行：git checkout -- ${ctx.exemptRel} 可以恢复工作区副本（或确认这是有意的删除并 git add）。`,
      });
    } else if (normalizeEol(worktreeText) !== normalizeEol(indexBlob.text)) {
      reportLedgerIndexDrift(
        ctx,
        `豁免清单的工作区副本与 git 索引 blob 不一致（索引版 ${Buffer.byteLength(indexBlob.text, 'utf8')} B / ` +
          `工作区版 ${Buffer.byteLength(worktreeText, 'utf8')} B）：本次判定按**索引版**进行。`,
        { file: ctx.exemptRel, type: 'exempt-worktree-vs-index', target: `${ctx.exemptRel}#worktree-vs-index` },
      );
    }
    text = indexBlob.text;
  } else if (worktreeText !== null) {
    ctx.exemptBasis = 'worktree';
    reportLedgerIndexDrift(
      ctx,
      `豁免清单不在 git 索引里（git show :${ctx.exemptRel} 失败：${indexBlob.message}），只能退回工作区副本判定：${ctx.exemptRel}。`,
      {
        file: ctx.exemptRel,
        type: 'exempt-not-in-index',
        target: `${ctx.exemptRel}#not-in-index`,
        hint: `先 git add ${ctx.exemptRel}：否则 CI / 新克隆看不到这份豁免清单，「本地绿」是未提交改动撑起来的。`,
      },
    );
    text = worktreeText;
  } else {
    ctx.exemptBasis = null;
    ctx.exemptFileError = `豁免清单不存在或读不到：${ctx.exemptRel}（期望路径 ${abs}；索引里也没有该条目）`;
    return false;
  }

  const parsed = core.parseExemptFile(text, ctx.exemptRel);
  ctx.exemptEntries = parsed.entries;
  ctx.exemptProblems = parsed.problems;
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
      message:
        `schema_version 必须是 ${LEDGER_SCHEMA_VERSION}（v2 = 四态词汇 owned/exempt/accounted/unowned + ` +
        `独立豁免清单 ${EXEMPT_REL}），实际是 ${JSON.stringify(ledger.schema_version)}`,
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
    // 豁免清单位置必须自洽：写在 meta 里的是哪一份文件，本门禁读的就得是哪一份（不许悄悄换文件）。
    if (ledger.meta.exempt_file !== EXEMPT_REL) {
      problems.push({
        target: 'meta.exempt_file',
        message: `meta.exempt_file 必须是 ${EXEMPT_REL}（实际 ${JSON.stringify(ledger.meta.exempt_file)}）`,
      });
    }
  }
  // v1 的内嵌数组已迁出：它若还在台账里，说明只改了一半（版本不匹配已由上面拦下，这里再兜一层语义）。
  if (ledger.exempt_patterns !== undefined) {
    problems.push({
      target: 'exempt_patterns',
      message: `exempt_patterns 已迁到独立豁免清单 ${EXEMPT_REL}（v2 起台账里不再有该字段）`,
    });
  }
  // 顶层 `accounted` 必须是数组；条目的字段级校验由 accounted-invalid 逐条报（更可操作）。
  if (!Array.isArray(ledger.accounted)) {
    problems.push({ target: 'accounted', message: 'accounted 必须是数组（每条 { path, accounted_at, basis }）' });
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
// 豁免清单 × 真 .gitignore 交叉校验
// ---------------------------------------------------------------------------

/**
 * `git check-ignore --no-index -v -z --stdin`：一次问清「这批路径各自的**最后一条**匹配规则」。
 * 为什么必须加 `--no-index`：默认 check-ignore 会跳过已跟踪文件，而本项恰恰要问「已跟踪的路径
 * 是否同时被 ignore 规则覆盖」（它根本不在台账宇宙里，为它写豁免就是把忽略规则当豁免依据）。
 * `-v` 输出 4 个 NUL 分隔字段一组：<source> <lineno> <pattern> <pathname>；`!` 前缀的 pattern
 * 表示这条是**反选**（该路径最终并未被忽略，§7.5 规则 4：反选必须被尊重）。
 * 结构不认识就 fail-closed 报 guard-unavailable：绝不猜格式、也绝不静默当作「没有交集」。
 */
function gitCheckIgnoreRecords(ctx, paths) {
  if (paths.length === 0) return { ok: true, records: [] };
  let raw;
  try {
    raw = execFileSync('git', ['-c', 'core.quotePath=false', 'check-ignore', '--no-index', '-v', '-z', '--stdin'], {
      cwd: ctx.root,
      input: `${paths.join('\0')}\0`,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    // check-ignore 在没有路径被忽略时以 1 退出（stdout 仍可能有内容）；这里只在完全没有输出时才算失败。
    if (err && typeof err.stdout !== 'undefined' && err.stdout !== null) {
      raw = err.stdout;
    } else {
      return { ok: false, message: `git check-ignore 执行失败：${err.message}` };
    }
  }
  const fields = raw.toString('utf8').split('\0');
  if (fields[fields.length - 1] === '') fields.pop();
  if (fields.length % 4 !== 0) {
    return { ok: false, message: `git check-ignore -z 输出字段数 ${fields.length} 不是 4 的倍数（结构不认识）` };
  }
  const records = [];
  for (let i = 0; i < fields.length; i += 4) {
    const [source, lineno, pattern, target] = fields.slice(i, i + 4);
    if (!/^\d+$/.test(lineno) || target === '') {
      return { ok: false, message: `git check-ignore -z 输出结构不认识（第 ${i / 4 + 1} 组：${JSON.stringify(fields.slice(i, i + 4))}）` };
    }
    records.push({ source, line: Number(lineno), pattern, path: target, negated: pattern.startsWith('!') });
  }
  return { ok: true, records };
}

/**
 * 交叉校验（exempt-gitignore-cross-check，error）。三类不一致：
 *   ① 交集：本清单命中的**已跟踪**路径 ∩ 真 .gitignore 覆盖（--no-index，排除 `!` 反选）；
 *   ② 折叠误伤：仅靠 core.ignoreCase 折叠才命中（`*review*.md` 命中 `preview.md`）；
 *   ③ 放行了本该 git add 的普通文件：本清单命中的路径「未被忽略、也不在 git 索引里」。
 * ② 在 classifyTracked 里收集（判定时就已知），①③ 在这里取数。
 */
function checkExemptAgainstGitignore(ctx) {
  // ① 交集（候选 = 本次被判为 exempt 的已跟踪路径）
  ctx.exemptGitignoreStats.candidates = ctx.states.exempt.length;
  const checked = gitCheckIgnoreRecords(ctx, ctx.states.exempt);
  if (!checked.ok) {
    reportGuardUnavailable(ctx, `豁免清单 × .gitignore 交叉校验无法进行：${checked.message}`, {
      target: 'git check-ignore',
      hint:
        '本项用 `git check-ignore --no-index -v -z --stdin` 取「路径的最后一条匹配规则」；'
        + '输出结构不认识时宁可红也不假绿（静默当作「没有交集」会让事故穿过）。',
    });
  } else {
    for (const record of checked.records) {
      if (record.negated) continue; // `!` 反选 → 该路径最终并未被忽略（§7.5 规则 4）
      ctx.exemptGitignoreIntersection.push(record);
    }
    ctx.exemptGitignoreStats.covered = ctx.exemptGitignoreIntersection.length;
  }

  // ③ 未被忽略、也不在 git 索引里的普通文件，却被本清单放行
  let others = [];
  try {
    others = execGit(ctx.root, ['ls-files', '--others', '--exclude-standard', '-z'])
      .split('\0')
      .filter(Boolean)
      .map(relPosix);
  } catch (err) {
    reportGuardUnavailable(ctx, `git ls-files --others --exclude-standard 执行失败：${err.message}`, {
      target: 'git ls-files --others',
    });
    return;
  }
  ctx.exemptGitignoreStats.untrackedChecked = others.length;
  for (const rel of others) {
    const match = core.matchExemptPath(ctx.exemptMatchers, rel);
    if (match.matched) ctx.exemptTrackableUntracked.push({ path: rel, pattern: match.entry.pattern, line: match.entry.line });
  }
}

// ---------------------------------------------------------------------------
// 检查主流程
// ---------------------------------------------------------------------------

function runLedgerChecks(ctx) {
  if (!loadLedger(ctx)) return;
  if (!loadExemptFile(ctx)) {
    reportExemptInvalid(ctx, ctx.exemptFileError, { type: 'exempt-file-missing', target: `${ctx.exemptRel}#missing` });
    return;
  }

  // ---- 0. accounted 棘轮的基线比对（与 HEAD 版台账比，先于四态判定；只读，不改判定基准） ----
  checkAccountedGrowth(ctx);

  const yaml = loadYaml(ctx);
  if (!yaml) return;

  ctx.projectDirs = findProjectDirs(ctx);
  ctx.projects = ctx.projectDirs.map((dir) => ({ dir }));

  // ---- 1. 模块声明扫描 ----
  const occurrences = scanDeclarations(ctx, yaml);

  // ---- 2. 逐条声明的落地状态 + owned 集合 ----
  const ownedFiles = new Set(); // 被精确声明且真实存在的**已跟踪普通文件**
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
    if (state.tracked && state.onDisk === 'file') ownedFiles.add(state.trackedRel);
    declaredStates.push({ declared, refs, state });
  }
  ctx.declarationStats.distinctDeclaredPaths = occurrences.size;
  ctx.declarationStats.ownedTrackedFiles = ownedFiles.size;

  // ---- 3. 四态归属（与生成器**共用** core.classifyTracked，保证两道门禁逐字一致） ----
  // 每条豁免先过三道闸：静态过宽（不可豁免）→ 写法合法 → 编译成正则。
  // 被判**静态**过宽/非法的模式 **re 置空、不参与匹配**：它本该吞掉的文件会落回 accounted/unowned，
  // 绝不出现「模式被拒但文件照样被放过」的中间态。
  // **判据 3（动态命中率）不适用这句话**：命中率只能在分类之后算（见下面 3b），命中的模式**仍然参与分类**，
  // 它命中的文件仍按 exempt 计 —— 3b 只负责照报 error，不回头改写分类结果。
  ctx.exemptMatchers = core.buildExemptMatchers(ctx.exemptEntries, { ignoreCase: ctx.ignoreCaseRaw === 'true' });
  for (const m of ctx.exemptMatchers) {
    if (m.error) ctx.invalidPatterns.push({ index: m.entry.index, entry: m.entry, error: m.error });
    else if (m.breadth) ctx.broadPatterns.push({ index: m.entry.index, entry: m.entry, breadth: m.breadth });
  }

  const classified = core.classifyTracked({
    tracked: ctx.tracked,
    ownedSet: ownedFiles,
    accountedEntries: ctx.ledger.accounted,
    matchers: ctx.exemptMatchers,
  });
  ctx.states = classified.states;
  ctx.exemptCaseFoldOnly = classified.caseFoldOnly;

  // ---- 3b. 命中率过宽（判据 3）：需要宇宙信息，只能在匹配之后算 ----
  for (const m of ctx.exemptMatchers) {
    if (!m.re || ctx.tracked.length === 0) continue;
    const ratio = m.hits / ctx.tracked.length;
    if (ratio <= PATTERN_MAX_HIT_RATIO) continue;
    if (m.entry.broadConfirmed === true) continue; // 人工确认过，放行
    ctx.broadPatterns.push({
      index: m.entry.index,
      entry: m.entry,
      breadth: {
        kind: 'hit-ratio',
        ratio,
        hits: m.hits,
        universe: ctx.tracked.length,
        message:
          `pattern 命中 ${m.hits}/${ctx.tracked.length} 个已跟踪文件` +
          `（${(ratio * 100).toFixed(1)}%，超过阈值 ${PATTERN_MAX_HIT_RATIO * 100}%）：${m.entry.pattern}`,
      },
    });
  }

  // ---- 3c. 内部不变量：四态计数之和必须等于台账宇宙（R8） ----
  // 四态判定是「每个已跟踪文件落到且只落到一类」，所以这个等式是门禁自身的正确性断言，
  // 不是报告上的一行字：一旦不成立，说明归属判定漏了或重了文件，必须红。
  const statesSum =
    ctx.states.owned.length + ctx.states.exempt.length + ctx.states.accounted.length + ctx.states.unowned.length;
  if (statesSum !== ctx.tracked.length) {
    reportGuardUnavailable(
      ctx,
      `四态计数之和不等于台账宇宙：owned ${ctx.states.owned.length} + exempt ${ctx.states.exempt.length} + ` +
        `accounted ${ctx.states.accounted.length} + unowned ${ctx.states.unowned.length} = ${statesSum} ≠ ` +
        `git ls-files ${ctx.tracked.length}。（本门禁自身的归属判定漏了或重了文件，属内部不变量被破坏，绝不当作 warning。）`,
      {
        target: 'states-sum',
        hint: '这是门禁实现自身的 bug：每个已跟踪文件必须落到且只落到四态之一，请报告并修复本脚本。',
      },
    );
  }

  // ---- 3d. accounted 条目字段校验（缺 basis/accounted_at → error）+ 清单腐烂（warning） ----
  for (const problem of core.validateAccountedEntries(ctx.ledger.accounted)) {
    ctx.report({
      check: 'accounted-invalid',
      severity: 'error',
      type: 'accounted-entry-invalid',
      file: ctx.ledgerRel,
      line: 1,
      column: null,
      target: problem.target,
      message: `accounted 条目非法：${problem.message}`,
      hint:
        'accounted 是已清点记账的正账：每条必须写 path + accounted_at（YYYY-MM-DD 清点日期）+ basis（清点依据）。' +
        '依据为空/缺失的条目不是记账，是洗白——门禁一律 error。',
    });
  }
  ctx.accountedRemovable = core.accountedRot({
    trackedSet: ctx.trackedSet,
    ownedSet: ownedFiles,
    matchers: ctx.exemptMatchers,
    accountedEntries: ctx.ledger.accounted,
  });

  // ---- 4. 未命中的豁免条目 ----
  for (const m of ctx.exemptMatchers) {
    if (!m.re) continue;
    if (m.hits === 0) ctx.unusedPatterns.push(m);
  }

  // ---- 5. 豁免清单 × 真 .gitignore 交叉校验 ----
  checkExemptAgainstGitignore(ctx);

  // ---- 6. 报违规 ----
  emitViolations(ctx);
}

function emitViolations(ctx) {
  const ledgerRel = ctx.ledgerRel;
  const exemptRel = ctx.exemptRel;

  // unowned：已跟踪但无条目（error，逐条报出，不是计数）
  for (const rel of ctx.states.unowned.slice(0, EVIDENCE_LIMIT)) {
    ctx.report({
      check: 'unowned-file',
      severity: 'error',
      type: 'unowned-file',
      file: rel,
      line: 1,
      column: null,
      target: rel,
      message:
        `已跟踪文件在台账里查不到条目（既无模块归属、也不命中豁免、也不在 accounted 清单）：${rel}` +
        '——绿灯依据是**台账里有条目**，「它已经在 HEAD / 已在 git 索引里」不是条目。',
      hint:
        '修法二选一：① 让某个模块用 source.path 精确声明它（→ owned，并在文件真实存在后刷新 fingerprint）；' +
        `② 在 ${exemptRel} 里加一条带 reason 的模式豁免（→ exempt）。` +
        '**新增文件只有这两条路**：**不允许**往 accounted 里加——accounted 是存量正账，任何新增条目都是 ' +
        'accounted-growth/error（生成器 --check 同样红，写盘模式的生成器还会拒绝写盘并逐条点名）。',
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
      message: `另有 ${rest} 个无条目文件未逐条列出（共 ${ctx.states.unowned.length} 个）。`,
      hint: '先修前几条，重跑后本提示会给出下一批。',
    });
  }

  // accounted-removable：清单腐烂（warning）
  for (const item of ctx.accountedRemovable.slice(0, EVIDENCE_LIMIT)) {
    ctx.report({
      check: 'accounted-removable',
      severity: 'warning',
      type: 'accounted-removable',
      file: ledgerRel,
      line: 1,
      column: null,
      target: item.path,
      message: `accounted 条目应当删除：${item.path}（${item.why}）`,
      hint:
        `accounted 只减不增：把 ${item.path} 从 ${ledgerRel} > accounted 里删掉` +
        `（或重跑 node scripts/generate-file-ledger.cjs 自动剔除）。`,
    });
  }

  // accounted-growth：相对 HEAD 版台账的新增条目（error，逐条报出）
  const growth = ctx.accountedGrowth;
  if (growth.baseline === 'unparsable') {
    ctx.report({
      check: 'accounted-growth',
      severity: 'error',
      type: 'accounted-head-baseline-unusable',
      file: ledgerRel,
      line: 1,
      column: null,
      target: `${ledgerRel}#head-baseline`,
      message: `HEAD 版台账不可用作棘轮基线：${growth.headErr}`,
      hint:
        `删除、写坏或只升一半版本的 HEAD 版台账绝不能变成洗白路径：用 git show HEAD:${ledgerRel} 确认基线内容并把` +
        '它修成与本次门禁同版本的完整台账（必须能解析出 accounted 数组），再重跑本门禁。' +
        '（台账数据 / 门禁 / 生成器 / 豁免清单必须同一次提交一起改，版本不匹配直接 error 是有意的。）',
    });
  }
  for (const rel of growth.added.slice(0, EVIDENCE_LIMIT)) {
    ctx.report({
      check: 'accounted-growth',
      severity: 'error',
      type: 'accounted-added-vs-head',
      file: ledgerRel,
      line: 1,
      column: null,
      target: rel,
      message:
        `accounted 新增条目（HEAD 版台账里没有它）：${rel}` +
        '——清单只减不增，允许集合缩小，**任何新增即手工洗白**。',
      hint:
        `「路径在 HEAD 里」不是绿灯理由（旧 ≠ 已记账）。合法修法两条：① 让某个模块用 source.path 精确声明它；` +
        `② 在 ${exemptRel} 里加一条带 reason 的模式豁免。` +
        `若这条路径确实不该有归属，也不要往 accounted 里加（清单是已清点记账的正账，不是欠账，且不再增长）；` +
        `把 ${rel} 从 accounted 里删掉即可恢复绿。`,
    });
  }
  if (growth.added.length > EVIDENCE_LIMIT) {
    const rest = growth.added.length - EVIDENCE_LIMIT;
    ctx.report({
      check: 'accounted-growth',
      severity: 'error',
      type: 'accounted-added-vs-head',
      file: ledgerRel,
      line: 1,
      column: null,
      target: `${ledgerRel}#accounted-growth-overflow`,
      message: `另有 ${rest} 条新增条目未逐条列出（共新增 ${growth.added.length} 条，基线 = HEAD 版台账）。`,
      hint: '先修前几条，重跑后本提示会给出下一批。',
    });
  }

  // exempt-invalid：豁免清单不可用 / 条目语法非法 / 模式写法不受支持（error）
  for (const problem of ctx.exemptProblems) {
    reportExemptInvalid(
      ctx,
      `豁免条目非法：${problem.message}`,
      {
        type: 'exempt-entry-invalid',
        line: problem.line,
        target: problem.pattern ? `${exemptRel}:${problem.line} ${problem.pattern}` : `${exemptRel}:${problem.line}`,
        hint:
          '每条豁免必须写成 `<pattern> ## reason=<非空理由>`（可选 since / broad_confirmed），' +
          '缺理由的豁免等于静默放宽门禁。',
      },
    );
  }
  for (const p of ctx.invalidPatterns) {
    reportExemptInvalid(
      ctx,
      `豁免模式条目非法：${p.error}`,
      {
        type: 'exempt-entry-invalid',
        line: p.entry.line,
        target: p.entry.pattern,
        hint: '豁免必须写明 reason 且 pattern 只用 ** / * / ? 三种通配；缺理由的豁免等于静默放宽门禁。',
      },
    );
  }

  // exempt-too-broad：过宽模式（error）——一条模式就能把整个门禁静默关掉，必须红。
  for (const p of ctx.broadPatterns) {
    const kind = (p.breadth && p.breadth.kind) || 'unknown';
    ctx.report({
      check: 'exempt-too-broad',
      severity: 'error',
      type: `exempt-too-broad-${kind}`,
      file: exemptRel,
      line: p.entry.line,
      column: null,
      target: p.entry.pattern,
      message:
        `豁免模式过宽（${kind}）：${p.breadth.message}。` +
        (kind === 'hit-ratio'
          ? '**本模式仍然参与了本次分类**（命中率只能在匹配之后算出来，见本文件上方的判据 ③ 分支）：' +
            '它命中的文件仍按 `exempt` 计，**不会**落回 `accounted`/`unowned`；但本条仍是 error —— 过宽不被静默放过。'
          : '被判过宽（静态判据 1/2）的模式不参与匹配，本次判定按「该模式不存在」进行。'),
      hint:
        kind === 'hit-ratio'
          ? `若这条模式确实需要覆盖过半已跟踪文件，请在 ${exemptRel}:${p.entry.line} 的条目上显式写 ` +
            '`broad_confirmed=true`（人工确认；写上即视为已复核，但仍会被判据 1/2 拦截的写法不接受确认）。'
          : '把模式收窄到具体的目录或后缀（例：把 `**` 换成 `docs/**`）：豁免先于 accounted 判定，' +
            '过宽模式会让整个宇宙变成 exempt 而门禁仍然报绿。',
    });
  }

  // exempt-gitignore-cross-check：与真 .gitignore 的三类不一致（error）
  for (const record of ctx.exemptGitignoreIntersection.slice(0, EVIDENCE_LIMIT)) {
    ctx.report({
      check: 'exempt-gitignore-cross-check',
      severity: 'error',
      type: 'exempt-gitignore-intersection',
      file: exemptRel,
      line: 1,
      column: null,
      target: record.path,
      message:
        `豁免清单放行的路径同时被真 .gitignore 覆盖：${record.path}` +
        `（规则来自 ${record.source}:${record.line} 的 ${record.pattern}）`,
      hint:
        '不一致：这条路径根本不在台账宇宙里（被忽略文件不进 git 索引），为它写豁免等于把忽略规则当成了豁免依据。' +
        `要么收窄 ${exemptRel} 里的模式，要么修正 .gitignore（两边必须只留一个说法）。`,
    });
  }
  if (ctx.exemptGitignoreIntersection.length > EVIDENCE_LIMIT) {
    ctx.report({
      check: 'exempt-gitignore-cross-check',
      severity: 'error',
      type: 'exempt-gitignore-intersection',
      file: exemptRel,
      line: 1,
      column: null,
      target: `${exemptRel}#gitignore-intersection-overflow`,
      message: `另有 ${ctx.exemptGitignoreIntersection.length - EVIDENCE_LIMIT} 条交集未逐条列出（共 ${ctx.exemptGitignoreIntersection.length} 条）。`,
      hint: '先修前几条，重跑后本提示会给出下一批。',
    });
  }
  for (const item of ctx.exemptCaseFoldOnly.slice(0, EVIDENCE_LIMIT)) {
    ctx.report({
      check: 'exempt-gitignore-cross-check',
      severity: 'error',
      type: 'exempt-case-fold-overmatch',
      file: exemptRel,
      line: item.line,
      column: null,
      target: item.path,
      message:
        `豁免模式只靠大小写折叠才命中：${item.pattern}（第 ${item.line} 行）命中 ${item.path}` +
        `——core.ignoreCase=${ctx.ignoreCaseRaw}，大小写敏感时它并不命中。`,
      hint:
        '本会话真实事故：`*review*.md` 在 core.ignoreCase=true 下命中 `preview.md`（preview 含子串 review）。' +
        '把模式收窄到不会折叠误伤的写法（限定目录，或把大小写写全），不要依赖折叠语义。',
    });
  }
  if (ctx.exemptCaseFoldOnly.length > EVIDENCE_LIMIT) {
    ctx.report({
      check: 'exempt-gitignore-cross-check',
      severity: 'error',
      type: 'exempt-case-fold-overmatch',
      file: exemptRel,
      line: 1,
      column: null,
      target: `${exemptRel}#case-fold-overflow`,
      message: `另有 ${ctx.exemptCaseFoldOnly.length - EVIDENCE_LIMIT} 条折叠误伤未逐条列出（共 ${ctx.exemptCaseFoldOnly.length} 条）。`,
      hint: '先修前几条，重跑后本提示会给出下一批。',
    });
  }
  for (const item of ctx.exemptTrackableUntracked.slice(0, EVIDENCE_LIMIT)) {
    ctx.report({
      check: 'exempt-gitignore-cross-check',
      severity: 'error',
      type: 'exempt-covers-trackable-file',
      file: exemptRel,
      line: item.line,
      column: null,
      target: item.path,
      message:
        `豁免模式放行了一个「未被忽略、也不在 git 索引里」的普通文件：${item.pattern}（第 ${item.line} 行）命中 ${item.path}` +
        '——git 认为它是可跟踪的正常文件（既没被 .gitignore 覆盖，也没进索引）。',
      hint:
        `两种修法：① 它本来就该进仓库 → git add ${item.path}，并给它条目（owned 或豁免）；` +
        `② 它确实不该进仓库 → 收窄 ${exemptRel} 里的模式，并把它写进真 .gitignore（而不是靠台账豁免掩盖）。`,
    });
  }

  // exempt-unused：未命中的豁免（warning，可操作）
  for (const m of ctx.unusedPatterns) {
    ctx.report({
      check: 'exempt-unused',
      severity: 'warning',
      type: 'exempt-entry-unused',
      file: exemptRel,
      line: m.entry.line,
      column: null,
      target: m.entry.pattern,
      message: `豁免条目本次未命中任何已跟踪文件（可能已过期或拼写错误）：${m.entry.pattern}（第 ${m.entry.line} 行）`,
      hint: `确认不再需要就从 ${exemptRel} 里删掉；未命中的豁免会永久放过未来任何匹配该模式的路径。`,
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
    out.push(
      `台账文件: ${ctx.ledgerRel}（schema_version ${ctx.ledger ? ctx.ledger.schema_version : '-'} · 判定基准 ` +
        `${ctx.ledgerBasis === 'index' ? 'git 索引 blob' : ctx.ledgerBasis === 'worktree' ? '工作区文件（索引里没有，见 ledger-index-drift）' : '不可用'}）`,
    );
    out.push(
      `豁免清单: ${ctx.exemptRel}（判定基准 ` +
        `${ctx.exemptBasis === 'index' ? 'git 索引 blob' : ctx.exemptBasis === 'worktree' ? '工作区文件（索引里没有，见 ledger-index-drift）' : '不可用'} · ` +
        `大小写语义 core.ignoreCase=${ctx.ignoreCaseRaw}）`,
    );
    out.push(`台账宇宙: git ls-files ${total} 条 · universe_hash ${ctx.universeHash.slice(0, 16)}…`);
    out.push(
      `四态归属: owned ${s.owned.length} · exempt ${s.exempt.length} · accounted ${s.accounted.length} · ` +
        `unowned ${s.unowned.length}`,
    );
    out.push(
      paint(
        s.unowned.length > 0 ? '31' : '32',
        `绿灯依据 = 台账里有条目: ${s.owned.length} + ${s.exempt.length} + ${s.accounted.length} = ` +
          `${s.owned.length + s.exempt.length + s.accounted.length} / ${total}` +
          `（无条目 = unowned ${s.unowned.length} → error；「在 HEAD 里」不是绿灯理由）`,
      ),
    );
    out.push('');
    out.push('声明口径（planned 与 owned 必须分开，绝不合并成一个「覆盖率」）:');
    out.push(`  · 模块扫描: ${d.modulesScanned} 个（其中 ${d.modulesWithSource} 个有非空 source）`);
    out.push(`  · 声明条目: ${d.declaredRefs} 条 → 去重后 ${d.distinctDeclaredPaths} 个不同路径`);
    out.push(
      `  · planned（目标不存在）${d.planned} · existing-file（目标是真实文件）${d.existingFile} · ` +
        `existing-dir（目标是目录）${d.existingDir} · invalid（语法非法）${d.invalid}`,
    );
    out.push(
      `  · owned（= 被精确声明且真实存在**且已跟踪**的文件）${d.ownedTrackedFiles} · ` +
        `declared-untracked（存在但没 git add）${d.untrackedFile}`,
    );
    const pct = total === 0 ? 0 : (d.ownedTrackedFiles / total) * 100;
    out.push(
      paint(
        d.ownedTrackedFiles === 0 ? '33' : '32',
        `  · 归属覆盖率 = owned / 已跟踪文件 = ${d.ownedTrackedFiles} / ${total} = ${pct.toFixed(2)}%` +
          `（exempt 不是模块归属，不计入覆盖率；planned 更不算）`,
      ),
    );
    out.push('');
    out.push(
      `豁免条目: ${ctx.exemptMatchers.length} 条（其中 ${ctx.invalidPatterns.length} 条写法非法、` +
        `${ctx.broadPatterns.length} 条被判过宽而不参与匹配）· 本次命中 ${s.exempt.length} 个文件 · ` +
        `未命中 ${ctx.unusedPatterns.length} 条`,
    );
    out.push(
      `豁免 × .gitignore 交叉校验: 候选 ${ctx.exemptGitignoreStats.candidates} 个已跟踪路径 · ` +
        `与真 .gitignore 交集 ${ctx.exemptGitignoreIntersection.length} · ` +
        `大小写折叠误伤 ${ctx.exemptCaseFoldOnly.length} · ` +
        `放行了本该 git add 的普通文件 ${ctx.exemptTrackableUntracked.length}（未跟踪未忽略候选 ${ctx.exemptGitignoreStats.untrackedChecked} 个）`,
    );
    out.push(
      `accounted 清单: ${ctx.ledger ? ctx.ledger.accounted.length : 0} 条（每条带 accounted_at + basis）· ` +
        paint(
          ctx.accountedRemovable.length > 0 ? '33' : '32',
          `还可再减 ${ctx.accountedRemovable.length} 条（已 owned / 已豁免 / 已消失 / 重复）——清单只减不增`,
        ),
    );
    // 棘轮基线：与 HEAD 版台账比对的结果必须回显，否则「只减不增」无从核对。
    const g = ctx.accountedGrowth;
    if (g.baseline === 'head') {
      out.push(
        paint(
          g.added.length > 0 ? '31' : '32',
          `accounted 棘轮: 基线 = HEAD 版台账（${g.headRev || 'HEAD'} 共 ${g.headTotal} 条）· ` +
            `相对基线新增 ${g.added.length} 条 · 已减 ${
              g.headTotal === null ? '-' : Math.max(0, g.headTotal - (ctx.ledger ? ctx.ledger.accounted.length : 0))
            } 条——只允许集合缩小`,
        ),
      );
    } else if (g.baseline === 'absent' || g.baseline === 'no-head') {
      out.push(
        paint('33', `accounted 棘轮: HEAD 里没有该台账（${g.baseline === 'no-head' ? '仓库尚无提交' : '首次引入'}）→ 本项跳过，` +
          '一次性初始化：基线由本次提交建立，提交之后任何新增都会被拦成 error'),
      );
    } else if (g.baseline === 'unparsable') {
      out.push(paint('31', `accounted 棘轮: HEAD 版台账不可用作基线（${g.headErr}）→ error（fail-closed）`));
    } else {
      out.push('accounted 棘轮: 基线不可用（台账未成功加载，本项未判定）');
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
    exemptBasis: ctx.exemptBasis,
    ok: counts.error === 0,
    summary: {
      errors: counts.error,
      warnings: counts.warning,
      checks: Object.keys(CHECK_TITLES),
      ledgerFile: ctx.ledgerRel,
      exemptFile: ctx.exemptRel,
      schemaVersion: ctx.ledger ? ctx.ledger.schema_version : null,
      trackedTotal: total,
      universeHash: ctx.universeHash,
      ignoreCase: ctx.ignoreCaseRaw,
      // 绿灯依据只有一条：台账里有条目。三个数字分开回显，unowned 必须为 0。
      greenBasis: {
        note: '绿灯依据 = 台账里有条目（owned / exempt / accounted 三条来路）；已跟踪但无条目即 error（含刚提交的文件）；「在 HEAD 里」不是绿灯理由。',
        owned: ctx.states.owned.length,
        exempt: ctx.states.exempt.length,
        accounted: ctx.states.accounted.length,
        unowned: ctx.states.unowned.length,
      },
      states: {
        owned: ctx.states.owned.length,
        exempt: ctx.states.exempt.length,
        accounted: ctx.states.accounted.length,
        unowned: ctx.states.unowned.length,
      },
      statesSum:
        ctx.states.owned.length + ctx.states.exempt.length + ctx.states.accounted.length + ctx.states.unowned.length,
      moduleCoverage: {
        ownedFiles: d.ownedTrackedFiles,
        trackedTotal: total,
        percent: total === 0 ? 0 : Number(((d.ownedTrackedFiles / total) * 100).toFixed(4)),
        note: 'owned 只算「被 source.path 精确声明且真实存在且已跟踪」的文件；exempt 与 planned 都不计入覆盖率。',
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
      exempt: {
        file: ctx.exemptRel,
        total: ctx.exemptMatchers.length,
        hitFiles: ctx.states.exempt.length,
        unused: ctx.unusedPatterns.map((m) => ({ pattern: m.entry.pattern, line: m.entry.line })),
        invalid: ctx.invalidPatterns.map((p) => ({ pattern: p.entry.pattern, line: p.entry.line, error: p.error })),
        syntaxProblems: ctx.exemptProblems.map((p) => ({ line: p.line, message: p.message })),
        tooBroad: ctx.broadPatterns.map((p) => ({
          pattern: p.entry.pattern,
          line: p.entry.line,
          kind: (p.breadth && p.breadth.kind) || 'unknown',
          ...(p.breadth && p.breadth.kind === 'hit-ratio'
            ? { hits: p.breadth.hits, universe: p.breadth.universe, ratio: Number(p.breadth.ratio.toFixed(4)) }
            : {}),
        })),
        gitignoreCrossCheck: {
          note: '与真 .gitignore 的交叉校验：① 交集 ② 只靠 core.ignoreCase 折叠命中 ③ 放行了「未被忽略、也不在索引里」的普通文件。',
          ignoreCase: ctx.ignoreCaseRaw,
          candidates: ctx.exemptGitignoreStats.candidates,
          gitignoreCovered: ctx.exemptGitignoreIntersection.map((r) => ({
            path: r.path,
            source: r.source,
            line: r.line,
            pattern: r.pattern,
          })),
          caseFoldOnly: ctx.exemptCaseFoldOnly.map((i) => ({ path: i.path, pattern: i.pattern, line: i.line })),
          trackableUntracked: ctx.exemptTrackableUntracked.map((i) => ({ path: i.path, pattern: i.pattern, line: i.line })),
          untrackedChecked: ctx.exemptGitignoreStats.untrackedChecked,
        },
      },
      accounted: {
        total: ctx.ledger ? ctx.ledger.accounted.length : 0,
        invalid: core.validateAccountedEntries(ctx.ledger ? ctx.ledger.accounted : []).map((p) => ({
          target: p.target,
          message: p.message,
        })),
        removable: ctx.accountedRemovable.length,
        removableDetail: ctx.accountedRemovable.map((item) => ({ path: item.path, why: item.why })),
        // 棘轮基线（与 HEAD 版台账比）：'head' 正常比对 / 'absent' 或 'no-head' 首次引入（本项跳过、
        // 退出码 0）/ 'unparsable' 基线不可用（含 schema_version 不匹配）→ error（fail-closed）/
        // null 台账未加载，本项未判定。
        baseline: ctx.accountedGrowth.baseline,
        baselineRev: ctx.accountedGrowth.headRev,
        baselineError: ctx.accountedGrowth.headErr,
        headTotal: ctx.accountedGrowth.headTotal,
        growth: ctx.accountedGrowth.added.length,
        growthDetail: ctx.accountedGrowth.added.map((rel) => ({
          path: rel,
          note: 'HEAD 版台账的 accounted 里没有该条目（只减不增：新增即手工洗白）',
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
