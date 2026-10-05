'use strict';
/**
 * scripts/file-ledger-core.cjs
 * 全仓文件台账的**共享内核**（门禁与生成器的唯一事实来源，schema_version 2）。
 * ---------------------------------------------------------------------------
 * 为什么要有这个文件：门禁（scripts/check-file-ledger.cjs）与生成器
 * （scripts/generate-file-ledger.cjs）必须对「同一个已跟踪文件落到哪一态」给出**逐字相同**的答案，
 * 否则 `check:ledger:gen` 与 `check:ledger` 会在链上互相矛盾（一边红一边绿，且都自称权威）。
 * v1 把模式语义（`**` / `*` / `?`）与判定各写了两份；v2 起只有这一份：
 *   · 豁免清单的**解析**（独立文件 + gitignore 语法 + 每条必填理由）：parseExemptFile；
 *   · 模式编译与「过宽」静态判据：compilePattern / patternBreadthError；
 *   · 四态归属判定（owned / exempt / accounted / unowned）：classifyTracked；
 *   · `accounted` 的结构校验与腐烂判据：validateAccountedEntries / accountedRot。
 *
 * 四态词汇（用户口径，全仓唯一，不得自创同义词）：
 *   owned      有模块归属：被某个模块的 source.path **精确声明**，且该路径是真实存在的已跟踪普通文件；
 *   exempt     显式豁免：命中独立豁免文件 ledger/exempt.gitignore 里的某条模式（每条必填 reason）；
 *   accounted  已清点记账：在 ledger/file-ledger.json 的 accounted 清单里，**每条必须带**
 *              accounted_at（清点日期）与 basis（清点依据）——它不是欠账，是已记账的正账；
 *   unowned    三类都不占 → 门禁报 error（已跟踪但无条目即 error，包括刚提交的文件）。
 *
 * 绿灯依据只有一条：**台账里有条目**（owned / exempt / accounted 三条来路）。
 *   「在 HEAD 里 / 已在 git 索引里」**不是**绿灯理由——索引只定义待清点的全集。
 *
 * 豁免清单的语法（parseExemptFile 实现，文件头也写明同一套约定）：
 *   · 模式行：`<pattern> ## reason=<非空理由> [ ## since=YYYY-MM-DD ] [ ## broad_confirmed=true|false ]`；
 *   · `pattern` 用 gitignore 语法：`**`（至少一层）/ `*`（不跨 `/`）/ `?`（单个非 `/` 字符）；
 *   · `!` 前缀 = gitignore 的反选（后出现的条目覆盖先出现的，`!` 把已豁免的路径重新收回）；
 *   · `#` 开头的整行 = 注释，空行忽略；
 *   · 行尾字段必须 `key=value`：缺 reason / reason 为空 / 出现未知字段 → 一律报错（不猜、不降级）。
 *
 * 大小写语义（与 `core.ignoreCase` 一致，不依赖平台默认、不用 localeCompare）：
 *   · ignoreCase=true 时，模式以 `i` 标志编译（git 在本仓也是折叠匹配：core.ignoreCase=true）；
 *   · 只靠折叠才命中的路径会被单独报出（caseFoldOnly）——`*review*.md` 命中 `preview.md`
 *     就是这一类（preview 含子串 review），本会话真实事故，必须报出而不是静默放宽。
 */

const path = require('node:path');
const { execFileSync } = require('node:child_process');

/** 台账数据文件（相对仓库根，posix）。只保留机器可算部分 + 人写的 accounted 清单。 */
const LEDGER_REL = 'ledger/file-ledger.json';
/** 独立豁免清单（相对仓库根，posix）。gitignore 语法 + 每条必填理由；由门禁与生成器共同引用。 */
const EXEMPT_REL = 'ledger/exempt.gitignore';
/** 台账 schema 版本；不匹配即 error（结构变了必须显式升级，不做静默兼容）。v2 = 四态词汇与独立豁免文件。 */
const LEDGER_SCHEMA_VERSION = 2;

/** 模式行里 `pattern` 与行尾字段的分隔符（gitignore 本身没有行尾字段，这是本文件的约定）。 */
const EXEMPT_META_SEPARATOR = '##';
/** 行尾字段：必填理由 / 可选清点日期 / 命中率过阈值的人工确认。 */
const EXEMPT_REASON_FIELD = 'reason';
const EXEMPT_SINCE_FIELD = 'since';
const EXEMPT_BROAD_CONFIRM_FIELD = 'broad_confirmed';
/** 兼容旧名（v1 的字段名就是 broad_confirmed，两处保持一致）。 */
const BROAD_CONFIRM_FIELD = EXEMPT_BROAD_CONFIRM_FIELD;

/**
 * 豁免模式「过宽」判据的阈值。改这里必须同步改三处文字：
 * check-file-ledger.cjs 的 --help、CONTRIBUTING.md 的检查项清单、.github/workflows/ci.yml 的注释。
 */
/** 通配字符占比上限：`*` `?` 的个数 / pattern 长度 超过它即视为几乎没有限定作用。 */
const PATTERN_MAX_WILDCARD_RATIO = 0.5;
/** 单条模式命中率上限：命中文件数 / 台账宇宙 超过它即视为吞门禁（可用 broad_confirmed 人工确认）。 */
const PATTERN_MAX_HIT_RATIO = 0.5;

const relPosix = (p) => p.split(path.sep).join('/');

/** 把仓库相对 posix 路径落到当前操作系统的绝对路径（path.join 负责分隔符转换）。 */
const absOf = (root, rel) => path.join(root, ...rel.split('/'));

/** 码点升序（不用 localeCompare：ICU 差异会让同一份仓库在不同平台排出不同顺序）。 */
const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/** Windows 下路径比对折叠大小写（跨平台约定：posix 存路径，win32 折叠大小写）。 */
const foldCase = (p) => (process.platform === 'win32' ? p.toLowerCase() : p);

/**
 * 行尾归一化（只用于「工作区 vs 索引」比对）：
 * 索引 blob 恒为 LF，而 Windows 上 core.autocrlf=true（本仓库无 .gitattributes）检出的是 CRLF——
 * 只差行尾不算漂移，否则新克隆一跑门禁就假红（Linux CI 却绿，等于制造平台差异）。
 */
const normalizeEol = (s) => s.replace(/\r\n/g, '\n');

/** 执行 git（直接 exec，无 shell；`-c core.quotePath=false` + `-z` 读，跨平台一致）。 */
function execGit(root, args) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

// ---------------------------------------------------------------------------
// 模式编译与「过宽」静态判据
// ---------------------------------------------------------------------------

/**
 * 台账模式 → 正则。只支持 `**`（跨 `/` 任意层，**至少一层**）、`*`（不跨 `/` 任意字符）、`?`（单个非 `/` 字符）。
 * 其余元字符不猜：命中 `[`、`]`、`{`、`}` 或开头是 `\` 时返回 { error }（宁可红不假绿）。
 * 注意本语义与标准 glob 有分歧：`**` 编译成 `.*`（可空但两侧原文决定了至少一层），
 * 所以 `**` 后接 `/*.md` 的写法不匹配根级 `c.md`（见 --help 的「与标准 glob 的差异」）。
 * options.ignoreCase = true 时加 `i` 标志（匹配 core.ignoreCase 的折叠语义）。
 */
function compilePattern(pattern, options) {
  const ignoreCase = Boolean(options && options.ignoreCase);
  if (typeof pattern !== 'string' || pattern.length === 0) return { error: 'pattern 必须是非空字符串' };
  if (/[[\]{}]/.test(pattern)) {
    return { error: `pattern 含不支持的元字符（只支持 ** / * / ?）：${pattern}` };
  }
  if (pattern.startsWith('\\')) {
    return { error: `pattern 不支持转义（以 \\ 开头）：${pattern}` };
  }
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const source = escaped
    .split('**')
    .map((chunk) => chunk.split('*').join('[^/]*').split('?').join('[^/]'))
    .join('.*');
  try {
    return { re: new RegExp(`^${source}$`, ignoreCase ? 'i' : '') };
  } catch (err) {
    return { error: `pattern 编译失败：${pattern}（${err.message}）` };
  }
}

/**
 * 「过宽模式」静态判据（不需要宇宙信息，因此**不接受人工确认**）：返回 null 表示没命中。
 * 这类模式一旦被接受，四态判定会立刻假绿（实测 pattern=`**` → 整个宇宙变成 exempt、unowned 0、exit 0）。
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
        '——豁免先于 accounted 判定，这种模式会把整个宇宙变成 exempt 并静默报绿',
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

// ---------------------------------------------------------------------------
// 独立豁免清单的解析（gitignore 语法 + 行尾 key=value 字段）
// ---------------------------------------------------------------------------

const EXEMPT_META_RE = /^([a-z_][a-z0-9_]*)\s*=\s*(.*)$/;
const EXEMPT_KNOWN_FIELDS = new Set([EXEMPT_REASON_FIELD, EXEMPT_SINCE_FIELD, EXEMPT_BROAD_CONFIRM_FIELD]);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 解析独立豁免清单。返回 { entries, problems }：
 *   entries：{ index, line, pattern, negated, reason, since, broadConfirmed }（**保持文件顺序**，
 *            顺序即语义：gitignore 的后出现覆盖先出现，`!` 反选把已豁免的路径重新收回）；
 *   problems：语法级问题（缺 reason / 未知字段 / 值非法 / 空 pattern）——调用方必须报 error，不猜不降级。
 * 只做语法与字段校验；模式编译与「过宽」判据在 buildExemptMatchers 里做（那一步需要 fail-closed 语义）。
 */
function parseExemptFile(text, source) {
  const entries = [];
  const problems = [];
  const lines = String(text).split(/\r?\n/);
  lines.forEach((raw, i) => {
    const line = i + 1;
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed.startsWith('#')) return; // gitignore：空行与 # 整行注释
    const parts = trimmed.split(EXEMPT_META_SEPARATOR);
    let pattern = parts[0].trim();
    const meta = { reason: null, since: null, broadConfirmed: null };
    for (const chunk of parts.slice(1)) {
      const piece = chunk.trim();
      if (piece === '') continue;
      const m = EXEMPT_META_RE.exec(piece);
      if (!m) {
        problems.push({ line, pattern, message: `第 ${line} 行行尾字段必须是 key=value（实际 ${JSON.stringify(piece)}）` });
        continue;
      }
      const key = m[1];
      const value = m[2].trim();
      if (!EXEMPT_KNOWN_FIELDS.has(key)) {
        problems.push({
          line,
          pattern,
          message: `第 ${line} 行出现未知行尾字段 ${key}=（只支持 ${[...EXEMPT_KNOWN_FIELDS].join(' / ')}）`,
        });
        continue;
      }
      if (key === EXEMPT_BROAD_CONFIRM_FIELD) {
        if (value !== 'true' && value !== 'false') {
          problems.push({ line, pattern, message: `第 ${line} 行 ${key} 只能是 true 或 false（实际 ${JSON.stringify(value)}）` });
          continue;
        }
        meta.broadConfirmed = value === 'true';
        continue;
      }
      if (value === '') {
        problems.push({ line, pattern, message: `第 ${line} 行 ${key}= 的值不能为空` });
        continue;
      }
      meta[key] = value;
    }

    let negated = false;
    if (pattern.startsWith('!')) {
      negated = true;
      pattern = pattern.slice(1).trim();
    }
    if (pattern === '') {
      problems.push({ line, message: `第 ${line} 行的 pattern 为空（\`!\` 反选行同样必须写模式）` });
      return;
    }
    if (meta.reason === null) {
      problems.push({
        line,
        pattern,
        message: `第 ${line} 行的豁免缺 reason（pattern=${JSON.stringify(pattern)}）：每条豁免必须写明理由`,
      });
    }
    if (meta.since !== null && !DATE_RE.test(meta.since)) {
      problems.push({ line, pattern, message: `第 ${line} 行 since 必须是 YYYY-MM-DD（实际 ${JSON.stringify(meta.since)}）` });
    }
    entries.push({
      index: entries.length,
      line,
      pattern,
      negated,
      reason: meta.reason,
      since: meta.since,
      broadConfirmed: meta.broadConfirmed,
      source: source || EXEMPT_REL,
    });
  });
  return { entries, problems };
}

/**
 * 把条目编译成匹配器（顺序敏感）。每条 matcher：
 *   { entry, re, reStrict, error, breadth, hits }
 * 被判「非法」或「过宽（判据 1/2）」的模式 **re 置空、不参与匹配**：它本该吞掉的文件会落回
 * accounted/unowned，绝不出现「模式被拒但文件照样被放过」的中间态（宁可红不假绿）。
 * `reStrict` 是同一模式的**大小写敏感**版本，只用于识别「仅靠 core.ignoreCase 折叠才命中」的误伤。
 */
function buildExemptMatchers(entries, options) {
  const ignoreCase = Boolean(options && options.ignoreCase);
  return entries.map((entry) => {
    const compiled = compilePattern(entry.pattern, { ignoreCase });
    const strict = compilePattern(entry.pattern, { ignoreCase: false });
    const breadth = compiled.error ? null : patternBreadthError(entry.pattern);
    const matcher = {
      entry,
      re: compiled.re || null,
      reStrict: strict.re || null,
      error: compiled.error || null,
      breadth: breadth || null,
      hits: 0,
    };
    if (matcher.error || matcher.breadth) matcher.re = null;
    return matcher;
  });
}

/**
 * 一个路径在豁免清单里的最终判定（gitignore 语义：**后出现的条目覆盖先出现的**）。
 * 返回 { matched, entry, strictMatched, caseFoldOnly }：
 *   · matched       最终是否被豁免（最后一条命中的条目不是 `!` 反选）；
 *   · strictMatched 同一判定在**大小写敏感**语义下的结果；
 *   · caseFoldOnly  matched 为真而 strictMatched 为假 —— 只有靠 core.ignoreCase 折叠才命中，
 *                   即 `*review*.md` 命中 `preview.md` 那类事故，调用方必须报出来。
 */
function matchExemptPath(matchers, rel) {
  let last = null;
  let lastStrict = null;
  for (const m of matchers) {
    if (m.re && m.re.test(rel)) last = m;
    if (m.reStrict && m.reStrict.test(rel)) lastStrict = m;
  }
  const matched = Boolean(last) && !last.entry.negated;
  const strictMatched = Boolean(lastStrict) && !lastStrict.entry.negated;
  return {
    matched,
    entry: matched ? last.entry : null,
    matcher: matched ? last : null,
    strictMatched,
    caseFoldOnly: matched && !strictMatched,
  };
}

// ---------------------------------------------------------------------------
// 四态归属判定（唯一实现：门禁与生成器都调它）
// ---------------------------------------------------------------------------

/**
 * 逐文件判定四态。输入：
 *   tracked          git ls-files 的路径清单（码点升序）
 *   ownedSet         被模块 source.path 精确声明且真实存在且已跟踪的路径
 *   accountedEntries 台账 accounted 清单（对象数组，含 path）
 *   matchers         buildExemptMatchers 的产物（会被就地累加 hits）
 * 返回 { states, caseFoldOnly }：四态路径清单 + 「仅靠折叠命中」的明细（顺序 == tracked 顺序）。
 * 判定顺序固定 owned → exempt → accounted → unowned（豁免**先于** accounted，与 v1 一致）。
 */
function classifyTracked(input) {
  const states = { owned: [], exempt: [], accounted: [], unowned: [] };
  const caseFoldOnly = [];
  const accountedPaths = new Set(input.accountedEntries.map((e) => e.path));
  for (const rel of input.tracked) {
    for (const m of input.matchers) {
      if (m.re && m.re.test(rel)) m.hits += 1;
    }
    if (input.ownedSet.has(rel)) {
      states.owned.push(rel);
      continue;
    }
    const match = matchExemptPath(input.matchers, rel);
    if (match.matched) {
      states.exempt.push(rel);
      if (match.caseFoldOnly) caseFoldOnly.push({ path: rel, pattern: match.entry.pattern, line: match.entry.line });
      continue;
    }
    if (accountedPaths.has(rel)) {
      states.accounted.push(rel);
      continue;
    }
    states.unowned.push(rel);
  }
  return { states, caseFoldOnly };
}

/**
 * `accounted` 条目的结构校验（返回问题清单，空数组 = 合法）。判据：
 *   · 每条必须是非 null 对象；path / accounted_at / basis 都必须是**非空字符串**；
 *   · accounted_at 必须是 YYYY-MM-DD（清点日期）；
 *   · 路径不得重复（重复条目属于腐烂，accountedRot 也会兜一层）。
 * 依据为空 → error：`accounted` 是**已清点记账的正账**，没有依据的条目不是记账，是洗白。
 */
function validateAccountedEntries(accounted) {
  const problems = [];
  const seen = new Map();
  accounted.forEach((entry, index) => {
    const target = `accounted[${index}]`;
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      problems.push({ index, target, message: `${target} 必须是对象 { path, accounted_at, basis }` });
      return;
    }
    for (const key of ['path', 'accounted_at', 'basis']) {
      const value = entry[key];
      if (typeof value !== 'string' || value.trim() === '') {
        problems.push({
          index,
          target: `${target}.${key}`,
          path: typeof entry.path === 'string' ? entry.path : null,
          field: key,
          message: `${target}.${key} 必填且必须是非空字符串（path=${JSON.stringify(entry.path)}）`,
        });
      }
    }
    if (typeof entry.accounted_at === 'string' && entry.accounted_at.trim() !== '' && !DATE_RE.test(entry.accounted_at)) {
      problems.push({
        index,
        target: `${target}.accounted_at`,
        path: typeof entry.path === 'string' ? entry.path : null,
        field: 'accounted_at',
        message: `${target}.accounted_at 必须是 YYYY-MM-DD 的清点日期（实际 ${JSON.stringify(entry.accounted_at)}）`,
      });
    }
    if (typeof entry.path !== 'string' || entry.path.trim() === '') return;
    if (seen.has(entry.path)) {
      problems.push({
        index,
        target: `${target}.path`,
        path: entry.path,
        field: 'path',
        message: `${target}.path 与 accounted[${seen.get(entry.path)}] 重复：${entry.path}（重复条目属于腐烂）`,
      });
    } else {
      seen.set(entry.path, index);
    }
  });
  return problems;
}

/**
 * `accounted` 清单腐烂检测（返回 [{ path, why, entry }]）：条目已经 owned、已经命中豁免、
 * 已经从 git 索引消失、或清单内重复 —— 都应当从清单里删掉（门禁报 warning、生成器自动剔除）。
 * 与 classifyTracked 共用同一套豁免/归属判据，因此生成器算出来的「可移除」与门禁报的**逐字一致**。
 */
function accountedRot(input) {
  const rot = [];
  const seen = new Set();
  for (const entry of input.accountedEntries) {
    const rel = entry.path;
    if (seen.has(rel)) {
      rot.push({ path: rel, why: '清单内重复条目', entry });
      continue;
    }
    seen.add(rel);
    if (!input.trackedSet.has(rel)) {
      rot.push({ path: rel, why: '已从 git 索引消失（文件被删除或改名）', entry });
      continue;
    }
    if (input.ownedSet.has(rel)) {
      rot.push({ path: rel, why: '已经 owned（被模块 source.path 精确声明且存在）', entry });
      continue;
    }
    const match = matchExemptPath(input.matchers, rel);
    if (match.matched) rot.push({ path: rel, why: `已命中豁免模式 ${match.entry.pattern}`, entry });
  }
  return rot;
}

/**
 * 读 `core.ignoreCase`（模式匹配的大小写语义必须显式，不依赖平台默认、不用 localeCompare）。
 * 返回 'true' / 'false' / 'unset'（未设置时回显 'unset'，匹配语义按大小写敏感处理并如实回显）。
 */
function readIgnoreCase(root) {
  try {
    const out = execGit(root, ['config', '--bool', 'core.ignoreCase']).trim();
    if (out === 'true' || out === 'false') return out;
    return 'unset';
  } catch {
    return 'unset';
  }
}

module.exports = {
  LEDGER_REL,
  EXEMPT_REL,
  LEDGER_SCHEMA_VERSION,
  EXEMPT_META_SEPARATOR,
  EXEMPT_REASON_FIELD,
  EXEMPT_SINCE_FIELD,
  EXEMPT_BROAD_CONFIRM_FIELD,
  BROAD_CONFIRM_FIELD,
  PATTERN_MAX_WILDCARD_RATIO,
  PATTERN_MAX_HIT_RATIO,
  relPosix,
  absOf,
  byCodePoint,
  foldCase,
  normalizeEol,
  execGit,
  readIgnoreCase,
  compilePattern,
  patternBreadthError,
  parseExemptFile,
  buildExemptMatchers,
  matchExemptPath,
  classifyTracked,
  validateAccountedEntries,
  accountedRot,
};
