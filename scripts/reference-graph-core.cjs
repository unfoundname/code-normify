'use strict';
/**
 * scripts/reference-graph-core.cjs
 * 文件级引用解析的**共享内核**（引用「从哪个文件的哪一行指向哪个目标」的唯一事实来源）。
 * ---------------------------------------------------------------------------
 * 为什么要有这个文件：`scripts/check-references.cjs`（引用完整性门禁）与
 * `scripts/generate-reference-graph.cjs`（文件级引用图生成器）必须对「同一个文件里有哪些引用边」
 * 给出**逐字相同**的答案，否则会出现「门禁说悬空、图说没事」的两份真相。
 * 抽取是**纯重构**：函数体逐字从 check-references.cjs 搬来，行为、诊断码、`--json` 输出、
 * 退出码、`--help` 编号一律不变（验收：抽取前后 `node scripts/check-references.cjs --json`
 * 的 stdout 逐字节相同）。
 *
 * 覆盖的引用类别（与 docs/DESIGN-code-graph.zh-CN.md §3.3 / §3.4 的边 kind 对应）：
 *   · 模块说明符：`import` / `export … from` / `require(…)` / 动态 `import(…)`
 *     （TS 语法树优先，拿不到 typescript 时降级为正则 + 掩码，并在报告里标注降级原因）；
 *   · Markdown 内联链接 / 图片 / 引用式定义行；
 *   · Markdown 标题锚点（GitHub slug + 显式 `<a id>` / `<a name>`）；
 *   · package.json 字段（main/types/module/browser/bin/exports/files）与各 script 里的 `node <路径>`；
 *   · CI workflow `run:` 里的 `node <路径>` 与 `npm run <script>`；
 *   · 以 git 索引为权威的目标状态判定（tracked / untracked / ignored / missing / case-mismatch）。
 *
 * **ctx 契约**（内核不自建上下文，只消费下面这些字段；调用方用 `createReaderContext()` 建基座，
 * 或自行提供等价字段）：
 *   root                        仓库根（绝对路径）
 *   trackedSet / trackedDirSet  git 索引内的文件 / 目录集合
 *   lowerFileMap / lowerDirMap  小写路径 → 索引内真实大小写（用于报「大小写不一致」）
 *   untrackedSet / ignoredSet   磁盘上有但不在索引里 / 被忽略规则覆盖
 *   cache / lineOffsets / readFailures / readFailureReported / ignoreCache / anchorCache
 *   stats                       计数（unreadableIndexedFiles / skippedExternal / ambiguousTargets …）
 *   report(violation)           诊断上报入口（读失败走这里）
 *   violations                  诊断数组（createReaderContext 默认提供）
 *
 * 「读不到就必须红」的不变量在这里实现（readText / reportReadFailure）：索引内的路径读不到、
 * 或编码不可信（UTF-16 BOM / 高比例 NUL / 非法 UTF-8）→ 一律记入 readFailures 并报 error，
 * 绝不按 utf8 静默硬解码（硬解码出来的乱码会让文件里的引用全部漏检，比不检查更危险）。
 *
 * 确定性约定：只用 `path.posix` 与显式比较，不做随 locale 变化的排序
 * （全仓不用 localeCompare：ICU 差异会让同一份仓库在不同平台排出不同顺序）。
 */

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

// ---------------------------------------------------------------------------
// 从 scripts/check-references.cjs 逐字抽取的解析器（纯重构；顺序与原文件一致）
// ---------------------------------------------------------------------------

// ---- Markdown 常量与 scheme 判定（原 check-references.cjs:398-418）----
/**
 * 只处理 CommonMark 内联形式 `[文本](目标 "可选标题")` / `![alt](目标)`。
 * 参考式链接（`[文本][ref]` + `[ref]: url`）由 MD_REF_DEF 单独抽取定义行，
 * 与内联链接送进同一套检查（见 forEachMarkdownLink）。
 */
const MD_INLINE_LINK =
  /!?\[[^\]\n]*\]\(\s*(<[^<>\n]*>|[^()\n\s]+)(?:\s+(?:"[^"\n]*"|'[^'\n]*'|\([^()\n]*\)))?\s*\)/g;

/**
 * 参考式链接定义行：`[ref]: ./target "可选标题"`（缩进最多 3 空格，与 CommonMark 一致）。
 * 组 1 = 目标（可带尖括号）。行内链接不带 `](`，所以与 MD_INLINE_LINK 不会互相误吃。
 */
const MD_REF_DEF = /^ {0,3}\[[^\]\n]+\]:[ \t]*(<[^<>\n]*>|[^\s]+)/;

/**
 * 参考式链接的定义行会写进被检查的 Markdown 自身；如果本脚本也扫描自己，
 * 这些示例会被当成真实链接。SELF_EXCLUDED_FILES 已经排除本脚本，这里无需额外处理。
 */

/** 带 scheme（http:、mailto:、data: …）或协议相对（//host）的目标一律视为外部引用。 */
const HAS_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

// ---- 模块说明符解析配置（原 check-references.cjs:420-434）----
// ---------------------------------------------------------------------------
// 配置：模块说明符解析（相对 import / export / require）
// ---------------------------------------------------------------------------

/**
 * 模块说明符的解析模式：
 *   'typescript'      用仓库自带 typescript 的编译器 API 解析语法树（首选，权威）
 *   'regex-fallback'  拿不到 typescript 时的降级实现（注释/字符串掩码 + 多行安全正则）
 * 结果写进 ctx.analysisMode，并在 --json 的 summary.analysisMode 与人类可读头部回显：
 * 降级必须是可见的，否则「静默换了套更弱的解析」本身就是一种假绿。
 */
const SPECIFIER_ANALYSIS = { mode: 'regex-fallback', reason: '尚未尝试加载 typescript', version: null };

/** require 解析 typescript 的候选顺序（与 check-doc-snippets 的 resolveTsc 对齐）。 */
const TYPESCRIPT_CANDIDATE_ROOTS = [__dirname, path.resolve(__dirname, '..')];

// ---- 模块说明符扩展名 / 降级正则（原 check-references.cjs:447-495）----
/** 需要做相对说明符解析的源码扩展名。 */
const MODULE_EXTENSIONS = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);

/** TS 的 ESM 写法：`./execution.js` 实际指向源码 `./execution.ts`（编译产物则指向 `./execution.d.ts`）。 */
const MODULE_EXT_SWAPS = {
  '.js': ['.ts', '.tsx', '.d.ts', '.js'],
  '.jsx': ['.tsx', '.d.ts', '.jsx'],
  '.mjs': ['.mts', '.d.mts', '.mjs'],
  '.cjs': ['.cts', '.d.cts', '.cjs'],
};

/** 没有扩展名时的候选扩展名（含 .json：`import x from …data.json`）。 */
const MODULE_EXT_FALLBACKS = [
  '.ts',
  '.tsx',
  '.d.ts',
  '.mts',
  '.cts',
  '.d.mts',
  '.d.cts',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
];

/**
 * 降级路径用的说明符正则（只在拿不到 typescript 时启用）。
 * 与旧实现的三点差异（对应三个已修复的失败开放）：
 *   1. 静态 import / export 分支不再要求出现 `from` —— 于是副作用导入 `import './g.js';`
 *      也能命中（旧正则要求 from / import( / require(，副作用导入直接漏掉）；
 *   2. 匹配区间里**不允许出现 `;`** —— 于是跨行 import（`import {` 换行 `} from './g2.js'`）
 *      能命中，而 `from 'a'; const y = require('b')` 这种跨语句贪吃不会发生
 *      （旧正则用 `[^;\n]` 直接跨不了行，所以多行 import 全漏）；
 *   3. 只喂「掩码后的源码」（注释与字符串内容已换成同长度空格），
 *      于是注释掉的 import（`// import x from './g6.js';`）与模板字符串里的假源码都不再被当成真引用；
 *      真实说明符本身由掩码前记录的「引号内位置」提供，不受掩码影响。
 * 四个分支：`… from '…'`、副作用 `import '…'`、动态 `import('…')`、`require('…')`。
 * 注意分支顺序无关紧要（各自要求不同的关键字/括号），但副作用分支必须排除 `import(`：
 * 副作用分支的 `\s*` 不含 `(`，所以 `import('./x')` 不会落到副作用分支。
 *
 * 已如实记录的降级限制：regex-fallback **只掩掉注释里的普通文本，不掩掉注释里带引号的示例写法**
 * （掩码必须保持被检查的真实字符串字面量，无法两全）。因此如果某条注释里正好写了
 * 「关键字 + 引号 + 相对路径」这种形状，降级模式会把它当成真引用误报。
 * 拿得到 typescript 时不存在这个问题；这也是「优先用编译器 API」的又一个理由。
 */
const MODULE_SPECIFIER_FALLBACK =
  /\b(?:import|export)\b[^;]{0,400}?\bfrom\s*(?=['"])|(?:^|[^\w$.])import\s*(?=['"])|(?:^|[^\w$.])import\s*\(\s*(?=['"])|(?:^|[^\w$.])require\s*\(\s*(?=['"])/gm;

// ---- absOf（原 check-references.cjs:503-504）----
/** 把仓库相对 posix 路径落到当前操作系统的绝对路径（path.join 负责分隔符转换）。 */
const absOf = (root, rel) => path.join(root, ...rel.split('/'));

// ---- globToRegExp（原 check-references.cjs:508-511）----
function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}

// ---- decodeFragment（原 check-references.cjs:513-524）----
/**
 * 解码 `#` 后面的片段：GitHub 用解码后的值与标题 id 比对，所以 `#5-%E5%AE%89%E8%A3%85`
 * 等价于 `#5-安装`。非法百分号编码按原文处理（绝不因为编码坏掉而误报）。
 * 注意 `+` 在片段里是字面加号，不做空格转换。
 */
function decodeFragment(raw) {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// ---- 文件访问层（读不到就必须红）（原 check-references.cjs:928-1033）----
// ---------------------------------------------------------------------------
// 文件访问（「读不到就必须红」的实现层）
// ---------------------------------------------------------------------------
/**
 * 解码一份「必须是文本」的文件内容。
 *   · 剥掉 UTF-8 BOM（否则 Markdown 首行标题会带 U+FEFF，锚点 slug 算出来与 GitHub 不一致）；
 *   · UTF-16 BOM（FF FE / FE FF）或高比例 NUL 字节 → 判定为「不是可读的 UTF-8 文本」，
 *     返回 error 而不是按 utf8 硬解码：硬解码出来的乱码会让文件里的链接/版本字面量
 *     全部静默漏检（这正是本函数存在的理由）；
 *   · 非法 UTF-8 连续字节（替换字符 U+FFFD）同样按不可信处理，绝不静默将就。
 */
function decodeGuardedText(buffer) {
  if (buffer.length >= 2 && ((buffer[0] === 0xff && buffer[1] === 0xfe) || (buffer[0] === 0xfe && buffer[1] === 0xff))) {
    return { error: 'UTF-16 BOM 编码（本门禁只接受 UTF-8；按 utf8 解码会变成乱码并静默漏检）' };
  }
  let nul = 0;
  for (const byte of buffer) if (byte === 0) nul += 1;
  if (buffer.length > 0 && nul / buffer.length > 0.1) {
    return { error: `含 ${nul}/${buffer.length} 个 NUL 字节（疑似 UTF-16/二进制，而非 UTF-8 文本）` };
  }
  const text = buffer.toString('utf8');
  if (text.includes('\uFFFD')) return { error: '不是合法 UTF-8（解码出现替换字符 U+FFFD）' };
  return { text: text.charCodeAt(0) === 0xfeff ? text.slice(1) : text };
}

/**
 * 读取一个仓库相对路径的文本。
 * **读不到就记账**：凡「在 git 索引里」的路径（或「磁盘上确实存在」的路径）读失败/解码不可信，
 * 都写进 ctx.readFailures，由 checkTrackedReadability 逐条报 guard-unavailable（error）。
 * 只有「不在索引里、磁盘上也不存在」的悬空目标才允许静默返回 null —— 那种目标是别的检查的职责。
 * 返回值：成功 = 字符串；失败 = null（失败原因见 ctx.readFailure(rel)）。
 */
function readText(ctx, rel) {
  const cached = ctx.cache.get(rel);
  if (cached !== undefined) return cached.value;
  const entry = { value: null };
  ctx.cache.set(rel, entry);

  const abs = absOf(ctx.root, rel);
  const indexed = ctx.trackedSet.has(rel);
  let buffer = null;
  let status = null;
  try {
    buffer = fs.readFileSync(abs);
  } catch (err) {
    const code = (err && err.code) || 'EUNKNOWN';
    // EISDIR：已跟踪文件被同名目录顶替（`Remove-Item README.md; mkdir README.md`）。
    // EPERM/EACCES：ACL 拒绝读。ENOENT：索引里有、磁盘上没有。都算「读不到」。
    status = {
      status: code === 'ENOENT' ? 'missing-on-disk' : 'unreadable',
      code,
      reason: `${code}: ${(err && err.message) || String(err)}`,
    };
  }

  if (!status) {
    const decoded = decodeGuardedText(buffer);
    if (decoded.error) status = { status: 'undecodable', code: 'ENCODING', reason: decoded.error };
    else entry.value = decoded.text;
  }

  if (status && (indexed || fs.existsSync(abs))) {
    ctx.readFailures.set(rel, status);
    ctx.stats.unreadableIndexedFiles += 1;
  }
  return entry.value;
}

/** 某个路径的读取失败记录（没有则返回 null）。 */
function readFailure(ctx, rel) {
  return ctx.readFailures.get(rel) || null;
}

/**
 * 读取一个「检查必然要读」的文本文件；读不到时由 checkTrackedReadability 统一报 error。
 * 供各检查复用：读失败一律不再静默 continue（那正是要修的失败开放）。
 * options.severity 传 'warning' 时降级为 warning（仅用于编译产物滞后这类非阻塞条目）。
 */
function readTextOrReport(ctx, rel, options) {
  const text = readText(ctx, rel);
  if (text !== null) return text;
  const failure = readFailure(ctx, rel);
  if (failure) reportReadFailure(ctx, rel, failure, options && options.severity);
  return null;
}

/** 统一报「索引内路径读不到」：severity 默认 error，退出码 1。 */
function reportReadFailure(ctx, rel, failure, severity) {
  const key = `${rel}::${failure.code}`;
  if (ctx.readFailureReported.has(key)) return;
  ctx.readFailureReported.add(key);
  const indexed = ctx.trackedSet.has(rel);
  ctx.report({
    check: 'guard-unavailable',
    severity: severity === 'warning' ? 'warning' : 'error',
    type: 'guard-unavailable',
    file: rel,
    line: 1,
    target: rel,
    message: `${indexed ? 'git 索引内' : '磁盘上存在'}的路径读不到（${failure.status}）：${failure.reason}`,
    hint:
      '「读不到就必须红」：本门禁只信任能读到的 UTF-8 文本。按 utf8 硬解码或静默跳过会让文件里的' +
      '链接/版本字面量全部漏检（比不检查更危险）。修法：恢复文件可读（EISDIR = 被同名目录顶替；' +
      'EPERM = ACL 拒绝读；ENOENT = 索引里有但工作区缺文件），或把非 UTF-8 文件转成 UTF-8。',
  });
}

// ---- positionAt / pathState / glob 展开（原 check-references.cjs:1084-1218）----
/** 1-based 行号 / 列号：按字节偏移换算。 */
function positionAt(ctx, rel, text, index) {
  let offsets = ctx.lineOffsets.get(rel);
  if (!offsets) {
    offsets = [0];
    for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') offsets.push(i + 1);
    ctx.lineOffsets.set(rel, offsets);
  }
  let lo = 0;
  let hi = offsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (offsets[mid] <= index) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo + 1, column: index - offsets[lo] + 1 };
}

/**
 * 判定仓库相对路径是否存在，并区分「大小写不一致」。
 * 大小写不一致在 Windows/macOS 上 fs.existsSync 为 true，在 ubuntu-latest 上会 404，
 * 属于典型的「本地绿、CI 红」，这里按 error 报出。
 */
function pathState(ctx, rel) {
  if (!rel || rel === '.' || rel.startsWith('..')) return 'outside';
  if (ctx.trackedSet.has(rel) || ctx.trackedDirSet.has(rel)) return 'ok';

  const lower = rel.toLowerCase();
  const trackedMatch = ctx.lowerFileMap.get(lower) || ctx.lowerDirMap.get(lower);

  let onDisk = false;
  try {
    fs.statSync(absOf(ctx.root, rel));
    onDisk = true;
  } catch {
    onDisk = false;
  }

  if (onDisk) return trackedMatch && trackedMatch !== rel ? 'case-mismatch' : 'ok';
  if (trackedMatch) return 'case-mismatch';
  return 'missing';
}

/** 单个路径段是否含通配符。 */
const hasGlobMagic = (segment) => segment.includes('*') || segment.includes('?');

/** 单段通配 → 正则（`*`/`?` 不跨 `/`）。 */
function segmentRegExp(segment) {
  const escaped = segment.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}

const GLOB_MAX_NODES = 20000;

/**
 * 递归展开一个仓库相对 glob（posix 分隔符），返回**真实存在**的匹配路径（相对仓库根）。
 * 关键修复：旧实现的 glob 只 readdir 顶层目录，遇到多段通配（package.json 的
 * `exports` 里写 `lib` + 通配目录 + `index.js` 这种形状）必然判「悬空」，
 * 而 npm 完全支持这种 exports 形状，
 * 于是真实存在的目标被误报，逼人往豁免清单里塞条目。这里按段递归：
 *   `lib` + `*` + `index.js` 会逐段下钻，`*` 只匹配一层，`**` 匹配任意层。
 * 上限 GLOB_MAX_NODES 防止病态 glob 把门禁卡死（超限只是少列候选，不影响已匹配到的结果）。
 */
function expandGlob(ctx, globRel) {
  const segments = globRel.split('/').filter((s) => s !== '');
  const results = [];
  let budget = GLOB_MAX_NODES;

  const walk = (dirRel, index) => {
    if (budget <= 0) return;
    budget -= 1;
    if (index >= segments.length) return;
    const segment = segments[index];
    const last = index === segments.length - 1;

    if (segment === '**') {
      if (!last) walk(dirRel, index + 1); // `**` 匹配零层
      const entries = readDirEntries(ctx, dirRel);
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        walk(dirRel ? `${dirRel}/${entry.name}` : entry.name, index);
      }
      return;
    }

    const entries = readDirEntries(ctx, dirRel);
    if (!hasGlobMagic(segment)) {
      const match = entries.find((entry) => entry.name === segment);
      if (!match) return;
      const nextRel = dirRel ? `${dirRel}/${segment}` : segment;
      if (last) {
        if (match.isFile()) results.push(nextRel);
      } else if (match.isDirectory()) walk(nextRel, index + 1);
      return;
    }

    const re = segmentRegExp(segment);
    for (const entry of entries) {
      if (!re.test(entry.name)) continue;
      const nextRel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
      if (last) {
        if (entry.isFile()) results.push(nextRel);
      } else if (entry.isDirectory()) walk(nextRel, index + 1);
    }
  };

  walk('', 0);
  return results;
}

/** readdir 的容错包装（目录不存在 / 无权限 → 空列表，由调用方按 missing/ambiguous 处理）。 */
function readDirEntries(ctx, dirRel) {
  try {
    return fs.readdirSync(dirRel ? absOf(ctx.root, dirRel) : ctx.root, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * 解析 glob（npm files/exports 里的 `*`）：展开后只要有任意一个匹配真实存在即视为存在。
 * 无通配符时语义与 pathState 完全一致（保证既有行为不变）。
 */
function globState(ctx, rel) {
  if (!hasGlobMagic(rel)) return pathState(ctx, rel);
  const matches = expandGlob(ctx, rel);
  if (matches.length === 0) return 'missing';
  let sawCaseMismatch = false;
  for (const match of matches) {
    const state = pathState(ctx, match);
    if (state === 'ok') return 'ok';
    if (state === 'case-mismatch') sawCaseMismatch = true;
  }
  return sawCaseMismatch ? 'case-mismatch' : 'missing';
}

// ---- forEachMarkdownLink（原 check-references.cjs:1224-1349）----
/**
 * 遍历一个 Markdown 文件里所有「仓库内相对目标」的链接 / 图片，逐个交给 visit(link)。
 * 跳过：外部 URL（http(s):、mailto:、data:、//host）、纯锚点（除非 options.includeSameFileAnchors）、
 *       模板占位符、代码块（``` / ~~~）与行内代码、HTML 注释里的伪链接。
 * 覆盖形式：内联 `[文本](目标)` / `![alt](目标)`，以及**引用式链接定义行** `[ref]: 目标`
 *       （历史缺口：只解析内联形式时，`[x][r]` + `[r]: ./ghost.md` 三道检查全都不报）。
 * 读不到文件时不再静默返回：报 guard-unavailable（error，见 readTextOrReport）。
 * link = { target 原文, decoded 解码后, resolved 仓库相对路径, line, column,
 *          fragment 片段（URL 解码后，无 `#` 则为空串）, fragmentRaw 片段原文,
 *          sameFile 是否「纯锚点」形式的同文件链接 }
 * 行号/列号按原文精确推进（CRLF 也不会漂移），与既有报告格式保持一致。
 *
 * options.countSkips             默认 true；检查 5 / 检查 6 复用本遍历器时传 false，跳过计数只统计一次。
 * options.includeSameFileAnchors 默认 false；检查 6 需要校验 `[x](#frag)`，其余调用方行为不变。
 */
function forEachMarkdownLink(ctx, rel, visit, options) {
  // countSkips: false —— 检查 5 会复用同一个遍历器，跳过计数只应由检查 1a 统计一次，避免报告数字翻倍。
  const countSkips = !options || options.countSkips !== false;
  const includeSameFileAnchors = Boolean(options && options.includeSameFileAnchors);
  // 读不到就报 error：Markdown 是本门禁最主要的输入，静默跳过等于整份文件不设防。
  const text = readTextOrReport(ctx, rel);
  if (text === null) return;

  const lines = text.split(/\r?\n/);
  let offset = 0;
  let fence = null; // 代码块围栏（``` / ~~~）
  let inComment = false;

  /**
   * 把一个「链接目标」送进 visitor。内联链接与引用式定义行共用这一套解析：
   * 片段切分、外部 scheme 跳过、百分号解码、按引用方目录解析成仓库相对路径。
   */
  const emit = (target, pos) => {
    if (!target) return;
    // `#fragment` 在第一个 `#` 之后（查询串里的 `?` 不影响片段提取）。
    const hashAt = target.indexOf('#');
    const fragmentRaw = hashAt === -1 ? '' : target.slice(hashAt + 1);
    const fragment = fragmentRaw ? decodeFragment(fragmentRaw) : '';

    if (target.startsWith('#')) {
      // 纯锚点 = 指向本文件；只有需要做锚点校验的调用方关心它，其余调用方沿用旧行为（直接跳过）。
      if (includeSameFileAnchors) {
        visit({ target, decoded: '', resolved: rel, fragment, fragmentRaw, sameFile: true, line: pos.line, column: pos.column });
      }
      return;
    }
    if (target.startsWith('//') || HAS_SCHEME.test(target)) {
      if (countSkips) ctx.stats.skippedExternal += 1;
      return;
    }
    if (target.includes('{{') || target.includes('${')) return; // 模板占位符

    let decoded = target;
    try {
      decoded = decodeURIComponent(target);
    } catch {
      /* 非法百分号编码：按原文处理 */
    }
    decoded = decoded.split('#')[0].split('?')[0].trim();
    if (!decoded) return;

    const resolved = decoded.startsWith('/')
      ? path.posix.normalize(decoded.slice(1))
      : path.posix.normalize(path.posix.join(path.posix.dirname(rel), decoded));

    visit({ target, decoded, resolved, fragment, fragmentRaw, line: pos.line, column: pos.column });
  };

  for (const rawLine of lines) {
    const lineStart = offset;
    // 精确推进：split(/\r?\n/) 丢掉了行尾的 \r，这里按原文补回，否则 CRLF 文件的行号会逐行漂移。
    offset += rawLine.length;
    if (text.startsWith('\r\n', offset)) offset += 2;
    else if (text[offset] === '\n' || text[offset] === '\r') offset += 1;

    const fenceMatch = rawLine.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;

    let line = rawLine;
    if (inComment) {
      const end = line.indexOf('-->');
      if (end === -1) continue;
      line = ' '.repeat(end + 3) + line.slice(end + 3);
      inComment = false;
    }
    const commentStart = line.indexOf('<!--');
    if (commentStart !== -1) {
      const end = line.indexOf('-->', commentStart);
      if (end === -1) {
        inComment = true;
        line = line.slice(0, commentStart) + ' '.repeat(line.length - commentStart);
      } else {
        line = line.slice(0, commentStart) + ' '.repeat(end + 3 - commentStart) + line.slice(end + 3);
      }
    }

    // 引用式链接定义行：`[ref]: ./target "标题"`。
    // 在剥行内代码之前抽取（目标本身可能被反引号包着，那种写法少见但合法），
    // 与内联链接共用 emit，于是悬空/未跟踪/死锚点三道检查一并覆盖。
    const refDef = MD_REF_DEF.exec(rawLine);
    if (refDef) {
      const rawTarget = refDef[1];
      const target = rawTarget.startsWith('<') ? rawTarget.slice(1, -1).trim() : rawTarget;
      const column = rawLine.indexOf(rawTarget, refDef[0].indexOf(']:')) + 1;
      emit(target, { line: positionAt(ctx, rel, text, lineStart).line, column: column > 0 ? column : 1 });
    }

    // 行内代码里的 [x](y) 不是链接（同长度空格替换，保持列号）。
    line = line.replace(/`+[^`]*`+/g, (m) => ' '.repeat(m.length));

    MD_INLINE_LINK.lastIndex = 0;
    let m;
    while ((m = MD_INLINE_LINK.exec(line)) !== null) {
      const rawTarget = m[1];
      const target = rawTarget.startsWith('<') ? rawTarget.slice(1, -1).trim() : rawTarget;
      const pos = positionAt(ctx, rel, text, lineStart + m.index);
      emit(target, pos);
    }
  }
}

// ---- package.json 目标收集（原 check-references.cjs:1494-1516）----
/** 收集 package.json 里所有指向仓库内路径的字段值（main/types/module/browser/bin/exports/files）。 */
function collectPackageFieldTargets(pkg) {
  const fieldTargets = [];
  for (const field of ['main', 'types', 'module', 'browser']) {
    if (typeof pkg[field] === 'string') fieldTargets.push({ field, target: pkg[field] });
  }
  if (typeof pkg.bin === 'string') fieldTargets.push({ field: 'bin', target: pkg.bin });
  else if (pkg.bin && typeof pkg.bin === 'object') {
    for (const [name, target] of Object.entries(pkg.bin)) fieldTargets.push({ field: `bin.${name}`, target });
  }
  for (const [key, value] of collectExportStrings(pkg.exports)) fieldTargets.push({ field: `exports["${key}"]`, target: value });
  if (Array.isArray(pkg.files)) for (const entry of pkg.files) fieldTargets.push({ field: 'files', target: entry });
  return fieldTargets;
}

/** 收集 exports 里所有字符串叶子（含 `*` 通配），键为子路径 key。 */
function collectExportStrings(exportsField, key = '.', out = []) {
  if (typeof exportsField === 'string') out.push([key, exportsField]);
  else if (exportsField && typeof exportsField === 'object') {
    for (const [k, v] of Object.entries(exportsField)) collectExportStrings(v, key === '.' ? k : `${key}.${k}`, out);
  }
  return out;
}

/** 在 package.json 原文里定位某个 JSON 键的行/列（找不到返回 null）。 */
function positionOfJsonKey(ctx, text, rel, key) {
  if (!key) return null;
  const re = new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"\\s*:`);
  const m = re.exec(text);
  return m ? positionAt(ctx, rel, text, m.index) : null;
}

// ---- extractNodeTargets（原 check-references.cjs:1526-1556）----
/** 从一段 shell 风格命令行里抽取 `node <入口文件>` 的目标（跳过 flag；-e/-p 视为内联代码）。 */
function extractNodeTargets(command) {
  const out = [];
  for (const segment of command.split(/&&|\|\||;|\|/)) {
    const tokens = segment.match(/"[^"]*"|'[^']*'|[^\s"']+/g) || [];
    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i].replace(/^["']|["']$/g, '');
      if (token !== 'node') continue;
      let j = i + 1;
      let target = null;
      while (j < tokens.length) {
        const arg = tokens[j].replace(/^["']|["']$/g, '');
        if (arg === '-e' || arg === '--eval' || arg === '-p' || arg === '--print') {
          target = null; // 内联代码，没有入口文件
          j = tokens.length;
          break;
        }
        if (arg.startsWith('-')) {
          j += 1;
          continue;
        }
        target = arg;
        break;
      }
      if (!target) continue;
      // 只认「看起来像文件」的参数：带路径分隔符或已知脚本扩展名。
      if (target.includes('/') || target.includes('\\') || /\.(c|m)?js$|\.ts$/.test(target)) out.push(target);
    }
  }
  return out;
}

// ---- CI run 抽取（原 check-references.cjs:1616-1666）----
/**
 * 抽取 workflow YAML 里所有 `run:` 命令行（含 `|` / `>` 块标量的多行体），带 1-based 行号。
 * 行号语义与旧的内联实现完全一致（块体按缩进判定结束）。
 */
function collectWorkflowRunLines(text) {
  const out = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^(\s*(?:-\s+)?)run:\s*(.*)$/);
    if (!m) continue;
    const runIndent = m[0].indexOf('run:');
    const inline = m[2].trim();

    if (inline && !/^[|>][+-]?$/.test(inline)) {
      out.push({ line: i + 1, text: inline });
      continue;
    }
    for (let j = i + 1; j < lines.length; j += 1) {
      const bodyLine = lines[j];
      if (bodyLine.trim() === '') {
        out.push({ line: j + 1, text: '' });
        continue;
      }
      const indent = bodyLine.match(/^\s*/)[0].length;
      if (indent <= runIndent) break;
      out.push({ line: j + 1, text: bodyLine });
    }
  }
  return out;
}

/** 抽取 `npm run <name>` / `npm test` 形式引用的 script 名（跳过 npm ci/install 等内建命令）。 */
function extractNpmScriptRefs(line) {
  const out = [];
  const tokens = line.match(/"[^"]*"|'[^']*'|[^\s"']+/g) || [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i].replace(/^["']|["']$/g, '');
    if (token !== 'npm') continue;
    const next = (tokens[i + 1] || '').replace(/^["']|["']$/g, '');
    if (next === 'run' || next === 'run-script') {
      const name = (tokens[i + 2] || '').replace(/^["']|["']$/g, '');
      if (!name || name.startsWith('-')) continue;
      if (tokens.slice(i + 2).some((t) => t === '--if-present')) continue;
      out.push(name);
    } else if (next === 'test' || next === 'start' || next === 'stop' || next === 'restart') {
      out.push(next);
    }
  }
  return out;
}

// ---- 索引状态判定 / 说明符候选 / TS 与正则解析 / 相对说明符解析（原 check-references.cjs:2322-2662）----
/**
 * 判定引用目标相对 git 索引的状态（检查 5 专用；既有 pathState 的语义一字未动）。
 *   'tracked'       目标在索引里（含被跟踪的目录）→ 合法
 *   'untracked'     磁盘上有、不在索引里、且不被忽略规则覆盖 → 本该 `git add`（被引用即 error）
 *   'ignored'       磁盘上有、但被忽略规则覆盖 → 正常状态，不报
 *   'missing'       磁盘上也没有 → 不在本检查范围
 *   'case-mismatch' 大小写不一致 → 交给既有的大小写检查报，避免重复
 *   'ambiguous'     磁盘上有但无法判定 → 跳过并计数
 *   'outside'       仓库外路径 / 根路径本身
 */
function indexPathState(ctx, rel) {
  // Markdown 链接可能写成 `docs/`：目录要按去掉尾斜杠的形式比对索引（git 只记录 `docs`）。
  let target = rel;
  while (target.length > 1 && target.endsWith('/')) target = target.slice(0, -1);
  if (!target || target === '.' || target.startsWith('..')) return 'outside';
  if (ctx.trackedSet.has(target) || ctx.trackedDirSet.has(target)) return 'tracked';

  let stat = null;
  try {
    stat = fs.statSync(absOf(ctx.root, target));
  } catch {
    stat = null;
  }

  const lowerMatch = ctx.lowerFileMap.get(target.toLowerCase()) || ctx.lowerDirMap.get(target.toLowerCase());
  if (!stat) return lowerMatch ? 'case-mismatch' : 'missing';
  if (lowerMatch && lowerMatch !== target) return 'case-mismatch';

  if (ctx.untrackedSet.has(target)) return 'untracked';
  if (ctx.ignoredSet.has(target)) return 'ignored';

  // 被 `--directory` 折叠掉的忽略目录的后代、以及边界情形，用 check-ignore 兜底。
  const ignored = isIgnoredPath(ctx, target);
  if (ignored === true) return 'ignored';
  if (ignored === null) return 'ambiguous';

  // 目录：磁盘上有、索引里没有、也不被忽略 → 整个目录都没被跟踪（git 不跟踪空目录）。
  if (stat.isDirectory()) return 'untracked';
  // 文件：不在 `ls-files --others` 输出里又不被忽略（嵌套 git 仓库等）→ 不猜。
  return 'ambiguous';
}

/**
 * 目标是否被忽略规则（.gitignore / .git/info/exclude / core.excludesFile）覆盖。
 * 返回 true / false；git 命令本身出错时返回 null（调用方按「无法判定」处理，不误报）。
 */
function isIgnoredPath(ctx, rel) {
  if (ctx.ignoreCache.has(rel)) return ctx.ignoreCache.get(rel);
  let result = null;
  try {
    execFileSync('git', ['-c', 'core.quotePath=false', 'check-ignore', '-q', '--', rel], {
      cwd: ctx.root,
      stdio: ['ignore', 'ignore', 'ignore'],
    });
    result = true;
  } catch (err) {
    result = err && err.status === 1 ? false : null;
  }
  ctx.ignoreCache.set(rel, result);
  return result;
}

/**
 * glob 形式的字段值（npm files/exports 的 `*`）：返回 { state, path }。
 * 用与 globState 相同的递归展开（多段通配 `lib` + `*` + `index.js` 也能落到真实文件），
 * 而不是旧实现的「只 readdir 顶层」——那会把真实存在的 exports 目标误判成悬空。
 */
function globIndexState(ctx, rel) {
  if (!hasGlobMagic(rel)) return { state: indexPathState(ctx, rel), path: rel };

  const matches = expandGlob(ctx, rel);
  const firstOf = (state) => matches.find((m) => indexPathState(ctx, m) === state);

  const tracked = firstOf('tracked');
  if (tracked) return { state: 'tracked', path: tracked };
  const untracked = firstOf('untracked');
  if (untracked) return { state: 'untracked', path: untracked };
  const ignored = firstOf('ignored');
  if (ignored) return { state: 'ignored', path: ignored };
  const ambiguous = firstOf('ambiguous');
  if (ambiguous) return { state: 'ambiguous', path: ambiguous };
  const caseMismatch = firstOf('case-mismatch');
  if (caseMismatch) return { state: 'case-mismatch', path: caseMismatch };

  // 一个真实文件都没展开出来：按「通配符前面那段目录」的状态归类，便于给出可读原因。
  const star = Math.min(
    ...[rel.indexOf('*'), rel.indexOf('?')].filter((i) => i >= 0),
  );
  const prefix = rel.slice(0, star);
  const dirRel = prefix.endsWith('/') ? prefix.slice(0, -1) : path.posix.dirname(prefix);
  const dirState = dirRel && dirRel !== '.' ? indexPathState(ctx, dirRel) : 'tracked';
  if (dirState === 'tracked') return { state: 'missing', path: rel };
  return { state: dirState, path: dirRel };
}

/** 把相对说明符展开成候选的真实文件路径（按 TS/ESM 解析顺序，前者优先）。 */
function moduleSpecifierCandidates(fromRel, spec) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), spec));
  const out = new Set([base]);
  const ext = path.posix.extname(base);
  const stem = ext ? base.slice(0, -ext.length) : base;
  const swaps = MODULE_EXT_SWAPS[ext];
  if (swaps) for (const candidateExt of swaps) out.add(stem + candidateExt);
  else if (!ext) for (const candidateExt of MODULE_EXT_FALLBACKS) out.add(base + candidateExt);
  for (const candidateExt of MODULE_EXT_FALLBACKS) out.add(path.posix.join(stem, `index${candidateExt}`));
  return [...out].filter((candidate) => candidate && candidate !== '.' && !candidate.startsWith('..'));
}

// ---------------------------------------------------------------------------
// 模块说明符抽取：typescript 编译器 API 优先，正则降级
// ---------------------------------------------------------------------------

/**
 * 尝试加载仓库自带的 typescript（只用编译器 API，不做类型检查；不引入运行时依赖）。
 * 失败不是错误：记下降级原因，报告里明确标注。这样 CI 没装 devDependencies 时门禁仍能跑，
 * 但「用的是哪套解析」永远可见（静默降级本身就是一种假绿）。
 */
function initSpecifierAnalysis() {
  const tried = [];
  for (const base of TYPESCRIPT_CANDIDATE_ROOTS) {
    try {
      const ts = require(require.resolve('typescript', { paths: [base] }));
      if (ts && typeof ts.createSourceFile === 'function') {
        SPECIFIER_ANALYSIS.mode = 'typescript';
        SPECIFIER_ANALYSIS.reason = null;
        SPECIFIER_ANALYSIS.version = ts.version || null;
        SPECIFIER_ANALYSIS.source = require.resolve('typescript', { paths: [base] });
        return;
      }
      tried.push(`${base}: 模块存在但没有 createSourceFile`);
    } catch (err) {
      tried.push(`${base}: ${(err && err.code) || (err && err.message) || 'require 失败'}`);
    }
  }
  SPECIFIER_ANALYSIS.mode = 'regex-fallback';
  SPECIFIER_ANALYSIS.reason = `定位不到 typescript（试过：${tried.join('；')}）`;
  SPECIFIER_ANALYSIS.version = null;
}

/** 扩展名 → TS 解析用的 ScriptKind（拿不到 ts 时返回 'mixed'，由调用方用统一解析）。 */
function scriptKindFor(ts, rel) {
  const ext = path.posix.extname(rel).toLowerCase();
  if (!ts) return 'mixed';
  if (ext === '.tsx') return ts.ScriptKind.TSX;
  if (ext === '.jsx') return ts.ScriptKind.JSX;
  if (ext === '.js' || ext === '.mjs' || ext === '.cjs') return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

/**
 * 用 typescript 语法树抽取「真实代码里」的相对/裸模块说明符。
 * 与正则实现的关键差别（都是历史失败开放的根因）：
 *   · ImportDeclaration 覆盖副作用导入 `import './g.js'`（无 import 子句也无 from 关键字）；
 *   · 说明符来自字符串字面量节点，天然跨行；
 *   · 注释与模板字符串里的文本不是节点，不会被误报——
 *     例如 tests/branch-e2e.mjs 里写进临时夹具的模板字符串源码。
 * 返回 [{ spec, index, kind, typeOnly }]（index 为文件内字符偏移，用于定位行列；
 * typeOnly = 这条说明符所在语句是**纯类型级**的：`import type …` / `export type … from`）。
 */
function collectSpecifiersWithKinds(ts, rel, text) {
  const source = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, scriptKindFor(ts, rel));
  const out = [];

  const pushLiteral = (node, kind, typeOnly) => {
    if (!node || !ts.isStringLiteralLike(node)) return;
    // typeOnly 由调用方按语法节点判定（见 visit）；这里只负责把它带上，不在这里猜结构。
    out.push({ spec: node.text, index: node.getStart(source), kind, typeOnly: Boolean(typeOnly) });
  };
  const importLikeCallKind = (node) => {
    if (!ts.isCallExpression(node) || node.arguments.length === 0) return null;
    const callee = node.expression;
    if (callee.kind === ts.SyntaxKind.ImportKeyword) return 'dynamic-import'; // import('./x.js')
    // require('./x.js')：只认不带属性的裸 require 调用。
    if (ts.isIdentifier(callee) && callee.text === 'require') return 'require';
    return null;
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      // `import type { X } from '…'`：整个 import 子句标了 type ⇒ 这条说明符运行时不会被加载。
      // 注意 `import { type X } from '…'`（行内 type 修饰符）**不算**：语句本身仍是运行时导入，
      // 只有部分绑定是类型——判成纯类型会让人误以为「删了不用跑测试」，方向更危险，故从保守。
      pushLiteral(node.moduleSpecifier, 'import', node.importClause && node.importClause.isTypeOnly);
    } else if (ts.isExportDeclaration(node)) {
      // `export type { X } from '…'`：整个导出声明标了 type（`export { type X } from` 同理不算）。
      pushLiteral(node.moduleSpecifier, 'export-from', node.isTypeOnly);
    } else {
      const kind = importLikeCallKind(node);
      // require(…) / import(…) 在这条分支上都是 CallExpression ⇒ 运行时加载，恒 false。
      // （纯类型位置的 `type T = import('./x.js').T` 是 ImportTypeNode，根本不走这条分支、也不产边；
      //   这里刻意不引入「按位置猜类型性」的逻辑——把边当运行时是保守方向，猜错的方向更危险。）
      if (kind) pushLiteral(node.arguments[0], kind, false);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  out.sort((a, b) => a.index - b.index);
  return out;
}

/**
 * 门禁使用的形态：`[{ spec, index }]`（与抽取前逐字一致）。
 * 它由 `collectSpecifiersWithKinds` **投影**而来——两者共用同一份语法树遍历，
 * 图生成器拿 kind、门禁拿位置，不会各自演化出第二套解析（否则「门禁说悬空、图说没事」）。
 */
function collectSpecifiersWithTypescript(ts, rel, text) {
  return collectSpecifiersWithKinds(ts, rel, text).map(({ spec, index }) => ({ spec, index }));
}

/**
 * 把源码里的「注释」与「字符串 / 模板字面量」替换成同长度空格，保留换行结构。
 * 目的是让降级正则跑在「纯代码骨架」上：
 *   · `// import x from './g6.js';` 与 `/* ... *\/` 不再被当成引用；
 *   · 模板字符串里的假源码（写进临时夹具的 import 语句）不再被当成引用。
 * 说明符本身由掩码前解析出来的「引号内区间」提供，所以掩码不会丢掉真实说明符。
 */
function maskSource(text) {
  const out = text.split('');
  const blank = (from, to) => {
    for (let i = from; i < to; i += 1) if (out[i] !== '\n' && out[i] !== '\r') out[i] = ' ';
  };
  const length = text.length;
  let i = 0;
  while (i < length) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === '/' && next === '/') {
      let j = i + 2;
      while (j < length && text[j] !== '\n') j += 1;
      blank(i, j);
      i = j;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end === -1 ? length : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let j = i + 1;
      while (j < length) {
        if (text[j] === '\\') {
          j += 2;
          continue;
        }
        if (text[j] === quote) {
          j += 1;
          break;
        }
        j += 1;
      }
      // 只在确实找到闭引号时才保留它；未闭合的模板/字符串必须整段掩掉，
      // 否则会把一个孤立的引号留在掩码里，让正则从那里误配到后面的真实说明符。
      if (j <= length && text[j - 1] === quote && j - 1 > i) {
        out[i] = quote;
        out[j - 1] = quote;
        blank(i + 1, j - 1);
      } else {
        blank(i, Math.min(j, length));
      }
      i = j;
      continue;
    }
    i += 1;
  }
  return out.join('');
}

/**
 * 降级实现（带 kind）：在掩码后的源码上找 import/export/require 的起始关键字位置。
 * kind 由命中的关键字分支判定（正则的四个分支各自要求不同的关键字/括号，见 MODULE_SPECIFIER_FALLBACK）。
 * typeOnly **一律 false**：正则算不出「纯类型级」——`import type { X }` 与 `import { type X }` 的差别、
 * `export type … from` 里的 type 位置，全都在它看不见的结构里；猜错的方向是「谎称不必跑测试」，
 * 比不猜更坏。因此无 TypeScript 时这些边一律按**运行时**处理（保守）。
 */
function collectSpecifiersWithRegexKinds(text) {
  const masked = maskSource(text);
  const out = [];
  MODULE_SPECIFIER_FALLBACK.lastIndex = 0;
  let m;
  while ((m = MODULE_SPECIFIER_FALLBACK.exec(masked)) !== null) {
    if (m[0] === '') {
      MODULE_SPECIFIER_FALLBACK.lastIndex += 1;
      continue;
    }
    // 关键字之后跳过空白，读一个真实的字符串字面量（从原文取，掩码里内容是空格）。
    let j = MODULE_SPECIFIER_FALLBACK.lastIndex;
    while (j < text.length && /\s/.test(text[j])) j += 1;
    const quote = text[j];
    if (quote !== '"' && quote !== "'") continue;
    let k = j + 1;
    let value = '';
    let closed = false;
    while (k < text.length) {
      if (text[k] === '\\') {
        value += text[k + 1] || '';
        k += 2;
        continue;
      }
      if (text[k] === quote) {
        closed = true;
        break;
      }
      if (text[k] === '\n') break;
      value += text[k];
      k += 1;
    }
    if (!closed) continue;
    // 命中的是哪一个关键字分支：`require(` / `import(` / `… from`（import 或 export）/ 副作用 import。
    const hit = m[0];
    const kind = /\brequire\s*\(/.test(hit)
      ? 'require'
      : /\bimport\s*\(/.test(hit)
        ? 'dynamic-import'
        : /\bexport\b/.test(hit)
          ? 'export-from'
          : 'import';
    out.push({ spec: value, index: j + 1, kind, typeOnly: false });
    MODULE_SPECIFIER_FALLBACK.lastIndex = k + 1;
  }
  return out;
}

/** 门禁使用的形态：`[{ spec, index }]`（与抽取前逐字一致；由带 kind 的实现投影而来）。 */
function collectSpecifiersWithRegex(text) {
  return collectSpecifiersWithRegexKinds(text).map(({ spec, index }) => ({ spec, index }));
}

/** 抽取一个源码文件里全部模块说明符（含裸模块名；由调用方筛掉非相对说明符）。 */
function collectModuleSpecifiers(ctx, ts, rel) {
  const text = readTextOrReport(ctx, rel);
  if (text === null) return [];
  return ts ? collectSpecifiersWithTypescript(ts, rel, text) : collectSpecifiersWithRegex(text);
}

/**
 * 与 collectModuleSpecifiers 同源、但保留 kind（图生成器用）：
 * 返回 `[{ spec, index, kind, typeOnly }]`，kind ∈ { import, export-from, require, dynamic-import }；
 * typeOnly = 该说明符所在语句是否为纯类型级（正则回退时**恒 false**，理由见 collectSpecifiersWithRegexKinds）。
 */
function collectModuleSpecifiersKinds(ctx, ts, rel) {
  const text = readTextOrReport(ctx, rel);
  if (text === null) return [];
  return ts ? collectSpecifiersWithKinds(ts, rel, text) : collectSpecifiersWithRegexKinds(text);
}

/**
 * 在一个「引用方」里解析一个相对说明符，判断它的最终归宿。
 * 返回 { kind, candidate, specIndex }：
 *   'missing'       所有候选都不存在 → **悬空模块说明符**（dangling-module-specifier，检查 6）
 *   'untracked'     某个候选在磁盘上、却不在索引里 → 未跟踪引用（untracked-file-reference，检查 5）
 *   'ignored'       某个候选被忽略规则覆盖 → 跳过并逐条列出
 *   'ambiguous'     磁盘上有但无法判定 → 跳过并计数
 *   'tracked'       命中索引 → 合法
 * 分工（本任务明确要求的边界）：
 *   目标**根本不存在** → dangling-module-specifier；
 *   目标**存在但不在索引** → untracked-file-reference。
 * 两者的唯一区别就是磁盘上有没有那个候选文件，因此必须由同一处判定，避免一个目标被两个检查重复报。
 * 优先序：tracked > ignored > ambiguous > untracked > missing。
 *   ignored 排在 untracked 之前：被 gitignore 覆盖的目标按设计「跳过不报」，
 *   不能因为 `git ls-files --others` 的语义差异反而变成 error。
 */
function resolveRelativeSpecifier(ctx, fromRel, spec) {
  const candidates = moduleSpecifierCandidates(fromRel, spec);
  const states = candidates.map((candidate) => ({ candidate, state: indexPathState(ctx, candidate) }));
  const firstOf = (state) => states.find((s) => s.state === state);

  const tracked = firstOf('tracked');
  if (tracked) return { kind: 'tracked', candidate: tracked.candidate };
  const ignored = firstOf('ignored');
  if (ignored) return { kind: 'ignored', candidate: ignored.candidate };
  const ambiguous = firstOf('ambiguous');
  if (ambiguous) return { kind: 'ambiguous', candidate: ambiguous.candidate };
  const untracked = firstOf('untracked');
  if (untracked) return { kind: 'untracked', candidate: untracked.candidate };
  const caseMismatch = firstOf('case-mismatch');
  if (caseMismatch) return { kind: 'case-mismatch', candidate: caseMismatch.candidate };
  return { kind: 'missing', candidate: candidates[0] || spec };
}

/** 遍历所有被跟踪的源码文件，对每个相对说明符调用 visit({ rel, spec, index, text, resolution }) */
function forEachRelativeSpecifier(ctx, ts, visit) {
  for (const rel of ctx.tracked) {
    if (!MODULE_EXTENSIONS.has(path.posix.extname(rel).toLowerCase())) continue;
    const text = readTextOrReport(ctx, rel);
    if (text === null) continue;
    for (const { spec, index } of collectModuleSpecifiers(ctx, ts, rel)) {
      // 裸模块名 / node: 内置 / 绝对路径 / URL 不归本门禁管。
      if (!spec.startsWith('.')) continue;
      visit({ rel, spec, index, text, resolution: resolveRelativeSpecifier(ctx, rel, spec) });
    }
  }
}

// ---- loadTypeScript（原 check-references.cjs:2742-2752）----
/** 取本进程已加载的 typescript（只在没有源码文件可查时不加载）。 */
function loadTypeScript() {
  if (SPECIFIER_ANALYSIS.mode !== 'typescript') return null;
  if (SPECIFIER_ANALYSIS.module) return SPECIFIER_ANALYSIS.module;
  try {
    SPECIFIER_ANALYSIS.module = require(SPECIFIER_ANALYSIS.source);
  } catch {
    SPECIFIER_ANALYSIS.module = null;
  }
  return SPECIFIER_ANALYSIS.module;
}

// ---- 锚点解析（原 check-references.cjs:2959-3082）----
/** GitHub 的 heading → id 规则（小写、去标点与 emoji、空格转 `-`、保留 CJK 与 `_`）。 */
function githubSlug(headingText) {
  return headingText
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\p{Pc}\- ]/gu, '')
    .replace(/ /g, '-');
}

/** ATX 标题：`#` 后必须跟空格或行尾（CommonMark），行尾的 `#` 闭合序列不算标题内容。 */
const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*))?$/;

/**
 * 显式 HTML 锚点：`<a id="x">` / `<a name="x">`（元素名不限，属性值可带引号或裸写）。
 * GitHub 会剥掉大部分 HTML 属性，但锚点依赖的 id / name 是保留的。
 */
const HTML_ANCHOR_ATTR = /<[a-zA-Z][a-zA-Z0-9-]*\b[^>]*?\s(?:id|name)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

/** 标题文本里的行内 Markdown（图片/链接/HTML 标签/反引号）先还原成纯文本，再算 slug。 */
function headingPlainText(rawHeading) {
  return rawHeading
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, '')
    .replace(/`/g, '')
    .trim();
}

/**
 * 解析一个 Markdown 文件里所有可命中的锚点 id（标题 slug + 显式 HTML 锚点），按文件缓存。
 * 返回 { slugs:Set, explicit:Set, headings:[{id,text}], missing:boolean }（missing = 文件读不到）。
 */
function extractHeadingAnchors(ctx, rel) {
  if (ctx.anchorCache.has(rel)) return ctx.anchorCache.get(rel);

  const result = { slugs: new Set(), explicit: new Set(), headings: [], missing: false };
  ctx.anchorCache.set(rel, result); // 先入缓存：异常路径下也不会重复解析

  // BOM 已在 readText 里剥掉（否则首行标题会带 U+FEFF，slug 与 GitHub 不一致 → 真实锚点被判死）。
  const text = readTextOrReport(ctx, rel);
  if (text === null) {
    result.missing = true;
    return result;
  }

  const lines = text.split(/\r?\n/);
  const seen = new Map(); // slug → 出现次数（重名标题追加 -1、-2…）
  let fence = null;
  let inComment = false;

  for (const rawLine of lines) {
    // 代码围栏内的 `#` 行不是标题（围栏判定与检查 1a 的遍历器保持一致）。
    const fenceMatch = rawLine.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;

    let line = rawLine;
    if (inComment) {
      const end = line.indexOf('-->');
      if (end === -1) continue;
      line = ' '.repeat(end + 3) + line.slice(end + 3);
      inComment = false;
    }
    const commentStart = line.indexOf('<!--');
    if (commentStart !== -1) {
      const end = line.indexOf('-->', commentStart);
      if (end === -1) {
        inComment = true;
        line = line.slice(0, commentStart);
      } else {
        line = line.slice(0, commentStart) + ' '.repeat(end + 3 - commentStart) + line.slice(end + 3);
      }
    }

    HTML_ANCHOR_ATTR.lastIndex = 0;
    let attr;
    while ((attr = HTML_ANCHOR_ATTR.exec(line)) !== null) {
      const id = (attr[1] ?? attr[2] ?? attr[3] ?? '').trim();
      if (id) result.explicit.add(id);
    }

    const heading = line.match(ATX_HEADING);
    if (!heading) continue;
    const plain = headingPlainText((heading[2] || '').replace(/[ \t]+#+[ \t]*$/, ''));
    if (!plain) continue;
    const base = githubSlug(plain);
    if (!base) continue; // 纯标点/emoji 标题在 GitHub 上也算不出可用 id，跳过（不误判也别硬猜）
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count}`;
    result.slugs.add(id);
    result.headings.push({ id, text: plain });
  }

  return result;
}

/** 片段是否命中：GitHub 的锚点图标自带 id="user-content-<slug>"，两种写法都能跳。 */
function anchorMatches(anchors, fragment) {
  const candidates = fragment.startsWith('user-content-')
    ? [fragment, fragment.slice('user-content-'.length)]
    : [fragment];
  return candidates.some((candidate) => anchors.slugs.has(candidate) || anchors.explicit.has(candidate));
}

/** 编辑距离：只用于「最接近的候选」提示，不参与判定。 */
function editDistance(a, b) {
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = curr[j];
  }
  return prev[b.length];
}


// ---------------------------------------------------------------------------
// 上下文基座
// ---------------------------------------------------------------------------

/**
 * 建一个「只负责读与判定」的上下文基座：字段契约见文件头。
 * 门禁（check-references.cjs）与图生成器（generate-reference-graph.cjs）共用它，
 * 避免两边各自维护一份 ctx 字段清单——那正是「两份真相」的起点。
 * options.root / options.tracked 省略时为空，由调用方在拿到 git 索引后回填。
 */
function createReaderContext(options) {
  const opts = options || {};
  const ctx = {
    root: opts.root || null,
    tracked: opts.tracked ? [...opts.tracked] : [],
    trackedSet: new Set(),
    trackedDirSet: new Set(),
    lowerFileMap: new Map(),
    lowerDirMap: new Map(),
    untrackedSet: opts.untracked || new Set(),
    ignoredSet: opts.ignored || new Set(),
    ignoreCache: new Map(),
    cache: new Map(),
    lineOffsets: new Map(),
    readFailures: new Map(),
    readFailureReported: new Set(),
    anchorCache: new Map(),
    violations: [],
    stats: {
      skippedExternal: 0,
      ambiguousTargets: 0,
      ignoredTargets: 0,
      danglingModuleSpecifiers: 0,
      unreadableIndexedFiles: 0,
      anchorsChecked: 0,
      anchorsHit: 0,
      anchorsMissed: 0,
      anchorsViaExplicitHtmlId: 0,
      anchorTargetsNonMarkdown: 0,
      anchorTargetsUnresolved: 0,
    },
  };
  // 默认上报 = 收进 violations（门禁会换成带去重的版本；生成器用这一份就够）。
  ctx.report = (violation) => {
    ctx.violations.push(violation);
  };
  /** 回填 git 索引清单，并派生 trackedSet / trackedDirSet / 小写映射（与门禁的派生规则一致）。 */
  ctx.setTracked = (tracked) => {
    ctx.tracked = [...tracked];
    ctx.trackedSet = new Set();
    ctx.trackedDirSet = new Set();
    ctx.lowerFileMap = new Map();
    ctx.lowerDirMap = new Map();
    for (const rel of ctx.tracked) {
      ctx.trackedSet.add(rel);
      ctx.lowerFileMap.set(rel.toLowerCase(), rel);
      let dir = path.posix.dirname(rel);
      while (dir !== '.' && dir !== '/') {
        ctx.trackedDirSet.add(dir);
        if (!ctx.lowerDirMap.has(dir.toLowerCase())) ctx.lowerDirMap.set(dir.toLowerCase(), dir);
        dir = path.posix.dirname(dir);
      }
    }
    return ctx;
  };
  return ctx;
}

// ---------------------------------------------------------------------------
// 符号级解析（增量 3）：ts.createProgram + getTypeChecker
// ---------------------------------------------------------------------------
/**
 * 为什么必须建 program（设计稿 §3.1）：单文件语法树（`ts.createSourceFile`）看得见
 * `import { foo } from './x.js'` 这个节点，却**回答不了 `foo` 指向 `x.ts` 里的哪个声明**。
 * 下面这些问句只有类型检查器能回答，本模块因此逐个用到它们（注释里标明用的是哪个 API）：
 *   · `export * from './x.js'` 的再导出链 → `checker.getExportsOfModule(moduleSymbol)`
 *     （`src/index.ts` 里那行 `export * from './engine/types.js';` 就是这种形状，它自己一个声明都没有）；
 *   · 同名声明区分（`store.ts` 与 `edit.ts` 各有一个同名声明）→ 符号**身份**而不是名字字符串
 *     （`checker.getSymbolAtLocation` 拿到的 Symbol 对象，再映射到声明节点）；
 *   · import / 再导出别名穿透 → `checker.getAliasedSymbol(symbol)`；
 *   · 类型引用归属（`TypeReferenceNode`）→ `checker.getSymbolAtLocation(node.typeName)`；
 *   · 声明位置反查 → `sourceFile.getLineAndCharacterOfPosition()`（1 基行列，LF 归一化文本）。
 *
 * **输入一律取自 git 索引**：本模块不自建文档读取，而是要求调用方给一份
 * `textOf`（仓库相对路径 → 索引 blob 的 LF 归一化文本），并用自建的 `ts.CompilerHost`
 * 把「仓库内文件」的 `fileExists` / `readFile` / `getSourceFile` / `directoryExists` /
 * `getDirectories` 全部重定向到那份映射与索引派生出来的目录集合。三个后果：
 *   ① 不读工作区（CRLF 检出、未 `git add` 的半成品、被写坏的文件都影响不到图）；
 *   ② 能为**历史提交**建图（改动记录要重建任意提交的快照，那时工作区是今天的样子）；
 *   ③ 仓库外的东西（`node_modules/`、TypeScript 自带 lib）默认看不见——见下。
 *
 * **范围边界（刻意，不是能力不足）**：compilerOptions 显式 `noLib: true` + `types: []`，
 * 于是 Program 里只有调用方给的 rootNames（由 `stats.program_source_files` 与
 * `stats.program_outside_repo_files` 自证「没把 node_modules 拉进来」）。代价是库类型
 * （`Promise` / `Map` / `Record` / `ReturnType`…）与 `@types/*` 里的名字解析不出符号：
 * 这类边如实记 `status: unresolved` + `reason: symbol-not-found-in-program`，
 * 那是**本批的范围边界**，不得读成「断链」。同理，非 `.ts` 后缀（`.mjs` / `.cjs` / `.js`）
 * 按设计稿 §3.4 退化为文件级，不在这里产符号边。
 */

/**
 * 索引状态 → 边的 status。**单一事实来源**：文件级边与符号级边共用这一张表，
 * 免得同一个目标在两处被写成两个结论（「门禁说悬空、图说没事」的同类风险）。
 */
const STATUS_OF_INDEX_STATE = {
  tracked: 'resolved',
  untracked: 'untracked',
  ignored: 'ignored',
  missing: 'dangling',
  'case-mismatch': 'case-mismatch',
  ambiguous: 'ambiguous',
  outside: 'external',
};

/**
 * 符号级边的**原因码闭集**。「无静默 null」是增量 3 最重要的一条不变量：
 * 每条符号级边的 `to.sym` 要么指向一个真实存在的声明节点 id，要么**必须**带下面某一个原因码。
 * 本模块对该不变量是 fail-closed（违反即抛错），生成器与测试另有全局断言。
 */
const SYMBOL_REASONS = {
  /** 说明符是裸模块名 / node: 内置 / URL：目标在仓库外，不是文件引用。 */
  BARE_MODULE_SPECIFIER: 'bare-module-specifier',
  /** 相对说明符指向的文件哪里都没有（悬空）。 */
  MODULE_SPECIFIER_UNRESOLVED: 'module-specifier-unresolved',
  /** 相对说明符指向的文件在磁盘上、却不在 git 索引里（本该 `git add`）。 */
  MODULE_SPECIFIER_UNTRACKED: 'module-specifier-untracked',
  /** 目标被忽略规则覆盖（正常状态，不产符号）。 */
  MODULE_SPECIFIER_IGNORED: 'module-specifier-ignored',
  /** 目标存在但无法判定（嵌套仓库等）。 */
  MODULE_SPECIFIER_AMBIGUOUS: 'module-specifier-ambiguous',
  /** 大小写与索引不一致（Windows 能过、Linux CI 会挂）。 */
  MODULE_SPECIFIER_CASE_MISMATCH: 'module-specifier-case-mismatch',
  /** 名字来自一个裸模块名的导入：模块本身不在 Program 里，符号自然拿不到。 */
  EXTERNAL_MODULE_SYMBOL: 'external-module-symbol',
  /** 名字来自一个「相对但解析不到文件」的导入：模块没进来，符号也拿不到。 */
  IMPORTED_SYMBOL_NOT_LOADED: 'imported-symbol-not-loaded',
  /** 名字在 Program 里根本没有声明（库类型 / 全局类型 / 拼错，本批不加载 lib 与 @types）。 */
  SYMBOL_NOT_FOUND: 'symbol-not-found-in-program',
  /** 目标是一整个模块而不是单个声明（命名空间导入、副作用导入、`export * as ns`、`require(…)`）。 */
  MODULE_LEVEL_TARGET: 'module-level-target',
  /** 说明符不是字符串字面量（模板串 / 表达式）：静态分析不猜。 */
  NON_LITERAL_SPECIFIER: 'non-literal-module-specifier',
  /** 解析到的声明不在本次符号级扫描面内（例如类成员、`declare module` 内部的名字）。 */
  DECLARATION_OUT_OF_SCOPE: 'declaration-out-of-scope',
  /** 符号存在但一个声明节点都没有（纯类型参数、合成符号等）。 */
  SYMBOL_WITHOUT_DECLARATION: 'symbol-without-declaration',
};

/** UTF-8 字节序比较（设计稿 §3.6 的 0 容忍项：不用 localeCompare）。 */
const byUtf8Bytes = (a, b) => Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));

/**
 * 符号级 Program 的 compilerOptions —— **显式给出**，不由 `tsconfig.json` 的 `include` 决定
 * （本批只对扫描面内的 `.ts` 建图；`tsconfig.json` 的 `include: ["src"]` 恰好只覆盖 `src/`，
 * 但那是仓库的构建口径，不是图的扫描面口径）。取值理由逐条：
 *   · `target/module/moduleResolution` 与 `tsconfig.json` 对齐（ES2023 / NodeNext），
 *     这样 `.js` → `.ts` 的扩展名映射与 `tsc` 的解析行为一致；
 *   · `noLib: true` + `types: []`：**不把 `node_modules/` 拉进 Program**（含 TypeScript 自带
 *     `lib.*.d.ts` 与 `@types/*`）；代价见文件头「范围边界」；
 *   · `skipLibCheck: true`：与仓库 `tsconfig.json` 一致（本批没有 lib 文件，取值只为口径一致）；
 *   · `allowJs: false`：`.mjs` / `.cjs` / `.js` 按设计稿 §3.4 退化为文件级；
 *   · `noEmit: true`：只解析，不产出任何文件（宿主 `writeFile` 也是空实现）。
 */
function symbolCompilerOptions(ts) {
  return {
    target: ts.ScriptTarget.ES2023,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    noLib: true,
    types: [],
    skipLibCheck: true,
    allowJs: false,
    noEmit: true,
    forceConsistentCasingInFileNames: true,
  };
}

/** 落进产物的 compilerOptions 描述（写**名字**不写数字枚举：数字会随 TS 版本漂移，破坏可比性）。 */
function symbolCompilerOptionsText() {
  return {
    target: 'ES2023',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    strict: true,
    noLib: true,
    types: [],
    skipLibCheck: true,
    allowJs: false,
    noEmit: true,
    forceConsistentCasingInFileNames: true,
  };
}

/**
 * 以**索引为唯一事实来源**的编译宿主。
 * 仓库内的路径（含根目录自身）一律只认索引：`fileExists` = 在已跟踪集合里，
 * `readFile` / `getSourceFile` = 索引 blob 文本，`directoryExists` / `getDirectories` = 由索引路径派生的目录集合。
 *
 * **仓库外路径一律不可见（2026-10-05 修复）**：三个 fs 类 API 对仓库外路径**统一返回「不存在」**，
 * 而不是交给 `ts.createCompilerHost` 的默认实现去读磁盘。这条不是洁癖，是一处**实测到的假绿**：
 * 原实现把仓库外路径委派给默认宿主，而 node 的模块解析会**逐级向上**找 `node_modules`——
 * 于是「Program 里只有 rootNames」这条自证只在**仓库根的父目录恰好没有 `node_modules` 时**成立。
 * 实测（`tests/reference-graph-e2e.mjs` 第 13 组，夹具物化到 `%TEMP%` 下）：夹具根本身没有
 * `node_modules`，但 `%TEMP%\node_modules` 存在 ⇒ 默认宿主把 `zod` / `ajv` / `yaml` /
 * `@modelcontextprotocol` 等 **212 个仓库外源文件**拉进 Program（`program_outside_repo_files = 212`）。
 * 它之所以没在本仓暴露，只是因为本仓根的父目录凑巧没有 `node_modules`——换个检出位置就会复现。
 * 现在 `stats.program_outside_repo_files` 恒为 0 是**结构性保证**，不再依赖检出位置。
 * 代价（如实记账）：仓库外的一切（含 TypeScript 自带 `lib.*.d.ts`）都无法加载，
 * 这正是 `noLib: true` + `types: []` 已经选择的边界——两边从此**一致**，而不是一处声明、一处靠运气。
 */
function createIndexCompilerHost(ts, options) {
  const { root, trackedSet, trackedDirSet, textOf, compilerOptions } = options;
  const base = ts.createCompilerHost(compilerOptions);
  const relOfAbs = (fileName) => {
    const rel = path.relative(root, fileName).split(path.sep).join('/');
    if (rel.startsWith('..')) return null;
    return rel === '' ? '.' : rel;
  };
  return {
    ...base,
    // 索引路径是精确匹配的：显式声明大小写敏感，跨平台（Windows / Linux）得到同一份解析结果。
    useCaseSensitiveFileNames: () => true,
    getCurrentDirectory: () => root,
    getCanonicalFileName: (fileName) => fileName,
    getNewLine: () => '\n',
    // 只解析不产出：即使将来有人加回 emit，宿主也不会往仓库里写任何东西。
    writeFile: () => {},
    realpath: (fileName) => fileName,
    // 仓库外路径：不读磁盘、不承认存在（理由见本函数上方注释里的实测假绿）。
    // 三个 API 必须**同时**返回「不存在」：只堵 readFile 不够——解析器会先问 fileExists / directoryExists，
    // 任何一处放行都会让它按「文件存在但读不到」继续，反而可能拿到半成品解析结果。
    fileExists: (fileName) => {
      const rel = relOfAbs(fileName);
      if (rel === null) return false;
      return trackedSet.has(rel);
    },
    readFile: (fileName) => {
      const rel = relOfAbs(fileName);
      if (rel === null) return undefined;
      return textOf.get(rel);
    },
    directoryExists: (dir) => {
      const rel = relOfAbs(dir);
      if (rel === null) return false;
      return rel === '.' ? true : trackedDirSet.has(rel);
    },
    getDirectories: (dir) => {
      const rel = relOfAbs(dir);
      if (rel === null) return [];
      const prefix = !rel || rel === '.' ? '' : `${rel}/`;
      const out = new Set();
      for (const known of trackedDirSet) {
        if (!known.startsWith(prefix)) continue;
        const rest = known.slice(prefix.length);
        if (rest && !rest.includes('/')) out.add(absOf(root, known));
      }
      return [...out];
    },
    getSourceFile: (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
      const rel = relOfAbs(fileName);
      // 仓库外 ⇒ 不存在（与 fileExists / directoryExists 同一结论）。
      if (rel === null) return undefined;
      const text = textOf.get(rel);
      // 索引里没有 ⇒ 这个文件不存在（未跟踪 / 被忽略 / 已删除一律看不见）——不静默退回工作区。
      if (text === undefined) return undefined;
      return ts.createSourceFile(fileName, text, languageVersion, true, scriptKindFor(ts, rel));
    },
  };
}

/** 一个绑定名（可能是解构模式）摊平成标识符列表。 */
function bindingIdentifiersOf(ts, name) {
  if (ts.isIdentifier(name)) return [name];
  const out = [];
  if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
    for (const element of name.elements) {
      if (ts.isBindingElement(element)) out.push(...bindingIdentifiersOf(ts, element.name));
    }
  }
  return out;
}

/**
 * 符号级图：声明节点表 + 符号级边表。返回值里**不含时间戳、不含绝对路径**（幂等要求），
 * 计时只放在 `stats` 里由调用方决定怎么用（绝不落进产物）。
 *
 * options:
 *   ts             仓库自带的 typescript 模块（拿不到时传 null → mode: 'unavailable'）
 *   ctx            共享读取上下文（只用来读 root / trackedSet / trackedDirSet 与解析说明符）
 *   textOf         Map<仓库相对路径, LF 归一化文本>（索引 blob）
 *   rootNames      符号级扫描面（仓库相对 posix 路径，只放 `.ts`/`.tsx`/`.mts`/`.cts`）
 *   stateOfTarget  (indexState, file) → 文件级边用的 to.state（与文件级图同一张表）
 */
function buildSymbolGraph(options) {
  const opts = options || {};
  const { ts, ctx, textOf } = opts;
  const stateOfTarget =
    typeof opts.stateOfTarget === 'function'
      ? opts.stateOfTarget
      : (indexState) => (indexState === 'tracked' ? 'indexed' : indexState === 'outside' ? 'outside' : indexState);
  const rootNames = [...(opts.rootNames || [])].sort(byUtf8Bytes);

  const stats = {
    root_names: rootNames.length,
    program_source_files: 0,
    program_outside_repo_files: 0,
    program_ms: 0,
    collect_ms: 0,
    missing_source_files: 0,
    declarations: 0,
    edges: 0,
    resolved_edges: 0,
    edges_without_symbol: 0,
    skipped_anonymous_declarations: 0,
  };
  const result = {
    mode: 'typescript',
    reasons: [],
    declarations: [],
    edges: [],
    stats,
    compiler_options: symbolCompilerOptionsText(),
  };
  if (!ts || typeof ts.createProgram !== 'function') {
    result.mode = 'unavailable';
    result.reasons.push('typescript-unavailable');
    return result;
  }
  if (rootNames.length === 0) {
    result.mode = 'empty';
    result.reasons.push('no-symbol-scope-files');
    return result;
  }

  const relOfAbs = (fileName) => {
    const rel = path.relative(ctx.root, fileName).split(path.sep).join('/');
    return !rel || rel.startsWith('..') ? null : rel;
  };
  const absOfRel = (rel) => absOf(ctx.root, rel);
  const posOf = (sourceFile, node) => {
    const p = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    return { line: p.line + 1, column: p.character + 1 };
  };

  const compilerOptions = symbolCompilerOptions(ts);
  const startedAt = Date.now();
  const host = createIndexCompilerHost(ts, {
    root: ctx.root,
    trackedSet: ctx.trackedSet,
    trackedDirSet: ctx.trackedDirSet,
    textOf,
    compilerOptions,
  });
  const program = ts.createProgram({ rootNames: rootNames.map(absOfRel), options: compilerOptions, host });
  stats.program_ms = Date.now() - startedAt;
  const checker = program.getTypeChecker();
  for (const sourceFile of program.getSourceFiles()) {
    stats.program_source_files += 1;
    if (relOfAbs(sourceFile.fileName) === null) stats.program_outside_repo_files += 1;
  }

  // ---- ① 声明节点表（顶层声明；函数内局部变量与参数属增量 4，本批不产）----
  const declByNode = new Map(); // 声明节点 → 声明记录（符号反查用）
  const declById = new Map();
  const statementDecls = new Map(); // 顶层语句 → 它包含的声明记录（用于给引用填 from.sym）
  const addDeclaration = (rel, sourceFile, keyNode, nameNode, declKind, exportedDirect, statement) => {
    const pos = posOf(sourceFile, nameNode);
    const name = nameNode.text;
    const id = `${rel}#${name}@${pos.line}:${pos.column}`;
    if (declById.has(id)) throw new Error(`符号级声明 id 冲突（同文件同名同位置产出两次）：${id}`);
    const record = {
      id,
      file: rel,
      name,
      decl_kind: declKind,
      exported: exportedDirect,
      scope: null, // 顶层声明的 scope 为 null（函数内声明的 scope 属增量 4）
      line: pos.line,
      column: pos.column,
      origin: 'source',
    };
    declById.set(id, record);
    declByNode.set(keyNode, record);
    if (statement) {
      const list = statementDecls.get(statement) || [];
      list.push({ record, keyNode });
      statementDecls.set(statement, list);
    }
    return record;
  };

  for (const rel of rootNames) {
    const sourceFile = program.getSourceFile(absOfRel(rel));
    if (!sourceFile) {
      stats.missing_source_files += 1;
      continue;
    }
    for (const statement of sourceFile.statements) {
      const exportedDirect = Boolean(
        ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export,
      );
      if (ts.isFunctionDeclaration(statement)) {
        if (statement.name) addDeclaration(rel, sourceFile, statement, statement.name, 'function', exportedDirect, statement);
        else stats.skipped_anonymous_declarations += 1;
      } else if (ts.isClassDeclaration(statement)) {
        if (statement.name) addDeclaration(rel, sourceFile, statement, statement.name, 'class', exportedDirect, statement);
        else stats.skipped_anonymous_declarations += 1;
      } else if (ts.isInterfaceDeclaration(statement)) {
        addDeclaration(rel, sourceFile, statement, statement.name, 'interface', exportedDirect, statement);
      } else if (ts.isTypeAliasDeclaration(statement)) {
        addDeclaration(rel, sourceFile, statement, statement.name, 'type', exportedDirect, statement);
      } else if (ts.isEnumDeclaration(statement)) {
        addDeclaration(rel, sourceFile, statement, statement.name, 'enum', exportedDirect, statement);
      } else if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            addDeclaration(rel, sourceFile, declaration, declaration.name, 'variable', exportedDirect, statement);
          } else {
            for (const element of bindingIdentifiersOf(ts, declaration.name)) {
              if (ts.isIdentifier(element.name)) {
                addDeclaration(rel, sourceFile, element, element.name, 'variable', exportedDirect, statement);
              }
            }
          }
        }
      }
    }
  }

  // ---- ② `exported` 的权威判定：以**模块导出表**为准（它覆盖直接 export、本地 export { x }
  //         与 export * 的再导出；这些是语法修饰符看不出来的）----
  for (const rel of rootNames) {
    const sourceFile = program.getSourceFile(absOfRel(rel));
    if (!sourceFile) continue;
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!moduleSymbol) continue;
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      for (const declaration of target.declarations || []) {
        const record = declByNode.get(declaration);
        if (record) record.exported = true;
      }
    }
  }
  for (const record of declById.values()) result.declarations.push(record);
  result.declarations.sort((a, b) => byUtf8Bytes(a.id, b.id));

  // ---- ③ 符号级边 ----
  const edges = [];
  const edgeIds = new Set();
  const pushEdge = (edge) => {
    const discriminator = edge.discriminator ? `:${edge.discriminator}` : '';
    const id = `${edge.from.file}:${edge.from.line}:${edge.from.column}:${edge.kind}${discriminator}`;
    if (edgeIds.has(id)) throw new Error(`符号级边 id 冲突（同位置同 kind 同消歧键产出两次）：${id}`);
    edgeIds.add(id);
    // 「无静默 null」的机器判据：to.sym 为空必须有非空 reason，否则整批生成失败（不写盘）。
    if (edge.to.sym === null && !edge.reason) {
      throw new Error(`符号级边缺少原因（to.sym 为 null 却没有 reason）：${id}`);
    }
    const record = {
      id,
      kind: edge.kind,
      from: { file: edge.from.file, line: edge.from.line, column: edge.from.column, sym: edge.from.sym || null },
      to: {
        sym: edge.to.sym === undefined ? null : edge.to.sym,
        file: edge.to.file === undefined ? null : edge.to.file,
        line: edge.to.line === undefined ? null : edge.to.line,
        column: edge.to.column === undefined ? null : edge.to.column,
        state: edge.to.state === undefined ? null : edge.to.state,
      },
      cross_file: Boolean(edge.to.file) && edge.to.file !== edge.from.file,
      specifier: edge.specifier === undefined ? null : edge.specifier,
      resolved: edge.resolved === undefined ? null : edge.resolved,
      status: edge.status,
      reason: edge.reason || null,
      type_only: Boolean(edge.type_only),
    };
    edges.push(record);
    stats.edges += 1;
    if (record.to.sym !== null) stats.resolved_edges += 1;
    else stats.edges_without_symbol += 1;
    return record;
  };

  /** 符号 → 声明记录（先按别名穿透；再按声明节点反查我们自己的节点表）。 */
  const resolveSymbol = (symbol) => {
    if (!symbol) return { kind: 'none' };
    const declarations = symbol.declarations || [];
    for (const declaration of declarations) {
      const record = declByNode.get(declaration);
      if (record) return { kind: 'declaration', record };
    }
    const first = declarations[0];
    if (first) {
      const file = relOfAbs(first.getSourceFile().fileName);
      const pos = posOf(first.getSourceFile(), first);
      return { kind: 'out-of-scope', file, line: pos.line, column: pos.column };
    }
    return { kind: 'none' };
  };
  const symbolAt = (node) => {
    let symbol = checker.getSymbolAtLocation(node);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    return symbol || null;
  };

  for (const rel of rootNames) {
    const sourceFile = program.getSourceFile(absOfRel(rel));
    if (!sourceFile) continue;
    /** 本文件的局部导入名 → 它的模块说明符（类型引用解析不出来时用来给原因）。 */
    const localImports = new Map();

    /** 说明符 → { status, reason, toFile, state }（与文件级边同一套索引判定）。 */
    const moduleStateOf = (spec) => {
      if (!spec.startsWith('.')) {
        return { status: 'external', reason: SYMBOL_REASONS.BARE_MODULE_SPECIFIER, toFile: null, state: 'outside' };
      }
      const resolution = resolveRelativeSpecifier(ctx, rel, spec);
      const status = STATUS_OF_INDEX_STATE[resolution.kind] || 'ambiguous';
      const reasonOf = {
        missing: SYMBOL_REASONS.MODULE_SPECIFIER_UNRESOLVED,
        untracked: SYMBOL_REASONS.MODULE_SPECIFIER_UNTRACKED,
        ignored: SYMBOL_REASONS.MODULE_SPECIFIER_IGNORED,
        ambiguous: SYMBOL_REASONS.MODULE_SPECIFIER_AMBIGUOUS,
        'case-mismatch': SYMBOL_REASONS.MODULE_SPECIFIER_CASE_MISMATCH,
      };
      return {
        status,
        reason: resolution.kind === 'tracked' ? null : reasonOf[resolution.kind] || SYMBOL_REASONS.MODULE_SPECIFIER_AMBIGUOUS,
        toFile: resolution.candidate,
        state: stateOfTarget(resolution.kind, resolution.candidate),
      };
    };

    /** 语句 → 包含 node 的那条顶层声明记录（变量语句可以有多个声明，按节点区间归属）。 */
    const statementRecordOf = (statement, node) => {
      const list = statementDecls.get(statement) || [];
      if (list.length === 0) return null;
      for (const entry of list) {
        if (node.pos >= entry.keyNode.pos && node.end <= entry.keyNode.end) return entry.record;
      }
      return list[0].record;
    };

    // ---- import / export-from / require / dynamic-import（第一遍：同时登记局部导入名）----
    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) {
        const specifierNode = statement.moduleSpecifier;
        const kind = ts.isImportDeclaration(statement) ? 'import' : 'export-from';
        const fromDecl = statementRecordOf(statement, statement);
        if (!specifierNode) {
          if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
            // `export { a, b }`（本地导出，没有模块说明符）：不构成跨声明引用，由 declarations[].exported 表达。
            continue;
          }
          continue;
        }
        if (!ts.isStringLiteralLike(specifierNode)) {
          const pos = posOf(sourceFile, specifierNode);
          pushEdge({
            kind,
            from: { file: rel, ...pos, sym: fromDecl ? fromDecl.id : null },
            to: { sym: null, file: null, line: null, column: null, state: null },
            specifier: null,
            resolved: null,
            status: 'unresolved',
            reason: SYMBOL_REASONS.NON_LITERAL_SPECIFIER,
            type_only: Boolean(ts.isExportDeclaration(statement) && statement.isTypeOnly),
          });
          continue;
        }
        const spec = specifierNode.text;
        const moduleState = moduleStateOf(spec);
        const specPos = posOf(sourceFile, specifierNode);

        if (ts.isImportDeclaration(statement)) {
          const clause = statement.importClause;
          const baseTypeOnly = Boolean(clause && clause.isTypeOnly);
          const pushImportBinding = (nameNode, typeOnly) => {
            localImports.set(nameNode.text, spec);
            const pos = posOf(sourceFile, nameNode);
            const from = { file: rel, ...pos, sym: fromDecl ? fromDecl.id : null };
            if (moduleState.status === 'external' || moduleState.reason) {
              // 模块本身就没进来：符号拿不到，如实记原因（绝不写一个空的 to.sym 了事）。
              pushEdge({
                kind: 'import',
                from,
                to: { sym: null, file: moduleState.toFile, line: null, column: null, state: moduleState.state },
                specifier: spec,
                resolved: moduleState.status === 'resolved' ? moduleState.toFile : null,
                status: moduleState.status === 'resolved' ? 'unresolved' : moduleState.status,
                reason:
                  moduleState.status === 'resolved'
                    ? SYMBOL_REASONS.IMPORTED_SYMBOL_NOT_LOADED
                    : moduleState.reason,
                type_only: baseTypeOnly || Boolean(typeOnly),
              });
              return;
            }
            const target = resolveSymbol(symbolAt(nameNode));
            if (target.kind === 'declaration') {
              pushEdge({
                kind: 'import',
                from,
                to: { sym: target.record.id, file: target.record.file, line: target.record.line, column: target.record.column, state: 'indexed' },
                specifier: spec,
                resolved: spec,
                status: 'resolved',
                reason: null,
                type_only: baseTypeOnly || Boolean(typeOnly),
              });
            } else if (target.kind === 'out-of-scope') {
              pushEdge({
                kind: 'import',
                from,
                to: { sym: null, file: target.file, line: target.line, column: target.column, state: target.file ? 'indexed' : null },
                specifier: spec,
                resolved: spec,
                status: 'unresolved',
                reason: SYMBOL_REASONS.DECLARATION_OUT_OF_SCOPE,
                type_only: baseTypeOnly || Boolean(typeOnly),
              });
            } else {
              pushEdge({
                kind: 'import',
                from,
                to: { sym: null, file: moduleState.toFile, line: null, column: null, state: moduleState.state },
                specifier: spec,
                resolved: spec,
                status: 'unresolved',
                reason: SYMBOL_REASONS.SYMBOL_NOT_FOUND,
                type_only: baseTypeOnly || Boolean(typeOnly),
              });
            }
          };
          if (clause) {
            if (clause.name) pushImportBinding(clause.name, false);
            const bindings = clause.namedBindings;
            if (bindings && ts.isNamedImports(bindings)) {
              for (const element of bindings.elements) pushImportBinding(element.name, element.isTypeOnly);
            } else if (bindings && ts.isNamespaceImport(bindings)) {
              // `import * as ns from './x.js'`：目标是**整个模块**，不是某个声明。
              localImports.set(bindings.name.text, spec);
              const pos = posOf(sourceFile, bindings.name);
              pushEdge({
                kind: 'import',
                from: { file: rel, ...pos, sym: fromDecl ? fromDecl.id : null },
                to: { sym: null, file: moduleState.toFile, line: null, column: null, state: moduleState.state },
                specifier: spec,
                resolved: moduleState.toFile,
                status: moduleState.status,
                reason: moduleState.status === 'resolved' ? SYMBOL_REASONS.MODULE_LEVEL_TARGET : moduleState.reason,
                type_only: baseTypeOnly,
                discriminator: bindings.name.text,
              });
            }
          } else {
            // 副作用导入 `import './x.js'`：不引入名字，目标就是模块。
            pushEdge({
              kind: 'import',
              from: { file: rel, ...specPos, sym: fromDecl ? fromDecl.id : null },
              to: { sym: null, file: moduleState.toFile, line: null, column: null, state: moduleState.state },
              specifier: spec,
              resolved: moduleState.toFile,
              status: moduleState.status,
              reason: moduleState.status === 'resolved' ? SYMBOL_REASONS.MODULE_LEVEL_TARGET : moduleState.reason,
            });
          }
          continue;
        }

        // ---- export … from ----
        const exportStatement = statement;
        const typeOnly = Boolean(exportStatement.isTypeOnly);
        const clause = exportStatement.exportClause;
        if (!clause) {
          // `export * from './x.js'`：靠导出表把**每一个**再导出的名字穿透到真实声明
          // （`checker.getExportsOfModule` 是这里唯一能用的 API：语法树上只有一个 `*`）。
          const moduleSymbol = checker.getSymbolAtLocation(specifierNode);
          const names = moduleSymbol ? checker.getExportsOfModule(moduleSymbol) : [];
          if (names.length === 0) {
            pushEdge({
              kind: 'export-from',
              from: { file: rel, ...specPos, sym: fromDecl ? fromDecl.id : null },
              to: { sym: null, file: moduleState.toFile, line: null, column: null, state: moduleState.state },
              specifier: spec,
              resolved: moduleState.toFile,
              status: moduleState.status === 'resolved' ? 'unresolved' : moduleState.status,
              reason: moduleState.status === 'resolved' ? SYMBOL_REASONS.MODULE_LEVEL_TARGET : moduleState.reason,
              discriminator: '*',
            });
            continue;
          }
          for (const symbol of names) {
            const exportedName = symbol.getName();
            const target = resolveSymbol(symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
            if (target.kind === 'declaration') {
              pushEdge({
                kind: 'export-from',
                from: { file: rel, ...specPos, sym: fromDecl ? fromDecl.id : null },
                to: { sym: target.record.id, file: target.record.file, line: target.record.line, column: target.record.column, state: 'indexed' },
                specifier: spec,
                resolved: spec,
                status: 'resolved',
                reason: null,
                type_only: typeOnly || exportedName.startsWith('type '),
                discriminator: exportedName,
              });
            } else {
              pushEdge({
                kind: 'export-from',
                from: { file: rel, ...specPos, sym: fromDecl ? fromDecl.id : null },
                to: { sym: null, file: moduleState.toFile, line: null, column: null, state: moduleState.state },
                specifier: spec,
                resolved: spec,
                status: 'unresolved',
                reason: target.kind === 'out-of-scope' ? SYMBOL_REASONS.DECLARATION_OUT_OF_SCOPE : SYMBOL_REASONS.SYMBOL_NOT_FOUND,
                type_only: typeOnly,
                discriminator: exportedName,
              });
            }
          }
          continue;
        }
        if (ts.isNamespaceExport(clause)) {
          pushEdge({
            kind: 'export-from',
            from: { file: rel, ...posOf(sourceFile, clause.name), sym: fromDecl ? fromDecl.id : null },
            to: { sym: null, file: moduleState.toFile, line: null, column: null, state: moduleState.state },
            specifier: spec,
            resolved: moduleState.toFile,
            status: moduleState.status,
            reason: moduleState.status === 'resolved' ? SYMBOL_REASONS.MODULE_LEVEL_TARGET : moduleState.reason,
            type_only: typeOnly,
            discriminator: clause.name.text,
          });
          continue;
        }
        for (const element of clause.elements) {
          const pos = posOf(sourceFile, element.name);
          const from = { file: rel, ...pos, sym: fromDecl ? fromDecl.id : null };
          const elementTypeOnly = typeOnly || Boolean(element.isTypeOnly);
          if (moduleState.status !== 'resolved' || moduleState.reason) {
            pushEdge({
              kind: 'export-from',
              from,
              to: { sym: null, file: moduleState.toFile, line: null, column: null, state: moduleState.state },
              specifier: spec,
              resolved: null,
              status: moduleState.status === 'resolved' ? 'unresolved' : moduleState.status,
              reason: moduleState.status === 'resolved' ? SYMBOL_REASONS.IMPORTED_SYMBOL_NOT_LOADED : moduleState.reason,
              type_only: elementTypeOnly,
            });
            continue;
          }
          const target = resolveSymbol(symbolAt(element.name));
          if (target.kind === 'declaration') {
            pushEdge({
              kind: 'export-from',
              from,
              to: { sym: target.record.id, file: target.record.file, line: target.record.line, column: target.record.column, state: 'indexed' },
              specifier: spec,
              resolved: spec,
              status: 'resolved',
              reason: null,
              type_only: elementTypeOnly,
            });
          } else if (target.kind === 'out-of-scope') {
            pushEdge({
              kind: 'export-from',
              from,
              to: { sym: null, file: target.file, line: target.line, column: target.column, state: target.file ? 'indexed' : null },
              specifier: spec,
              resolved: spec,
              status: 'unresolved',
              reason: SYMBOL_REASONS.DECLARATION_OUT_OF_SCOPE,
              type_only: elementTypeOnly,
            });
          } else {
            pushEdge({
              kind: 'export-from',
              from,
              to: { sym: null, file: moduleState.toFile, line: null, column: null, state: moduleState.state },
              specifier: spec,
              resolved: spec,
              status: 'unresolved',
              reason: SYMBOL_REASONS.SYMBOL_NOT_FOUND,
              type_only: elementTypeOnly,
            });
          }
        }
      }
    }

    // ---- type-reference：整文件遍历（`TypeReferenceNode`），归属到所在顶层声明 ----
    const visit = (node, fromDecl) => {
      if (ts.isTypeReferenceNode(node)) {
        const pos = posOf(sourceFile, node.typeName);
        const from = { file: rel, ...pos, sym: fromDecl ? fromDecl.id : null };
        const rootName = ts.isIdentifier(node.typeName) ? node.typeName.text : null;
        const symbol = symbolAt(node.typeName);
        const target = resolveSymbol(symbol);
        if (target.kind === 'declaration') {
          pushEdge({
            kind: 'type-reference',
            from,
            to: { sym: target.record.id, file: target.record.file, line: target.record.line, column: target.record.column, state: 'indexed' },
            specifier: null,
            resolved: target.record.file,
            status: 'resolved',
            reason: null,
            type_only: true,
          });
        } else if (target.kind === 'out-of-scope') {
          pushEdge({
            kind: 'type-reference',
            from,
            to: { sym: null, file: target.file, line: target.line, column: target.column, state: target.file ? 'indexed' : null },
            specifier: null,
            resolved: target.file,
            status: 'unresolved',
            reason: SYMBOL_REASONS.DECLARATION_OUT_OF_SCOPE,
            type_only: true,
          });
        } else if (rootName && localImports.has(rootName)) {
          // 名字来自一个 import，但解析不出来：原因归到那个模块说明符上（外部依赖 / 悬空 / 未跟踪…）。
          const spec = localImports.get(rootName);
          const moduleState = moduleStateOf(spec);
          const external = moduleState.status === 'external';
          pushEdge({
            kind: 'type-reference',
            from,
            to: { sym: null, file: moduleState.toFile, line: null, column: null, state: moduleState.state },
            specifier: spec,
            resolved: moduleState.toFile,
            status: external ? 'external' : 'unresolved',
            reason: external ? SYMBOL_REASONS.EXTERNAL_MODULE_SYMBOL : SYMBOL_REASONS.IMPORTED_SYMBOL_NOT_LOADED,
            type_only: true,
          });
        } else {
          pushEdge({
            kind: 'type-reference',
            from,
            to: { sym: null, file: null, line: null, column: null, state: null },
            specifier: null,
            resolved: null,
            status: 'unresolved',
            reason: SYMBOL_REASONS.SYMBOL_NOT_FOUND,
            type_only: true,
          });
        }
      }
      ts.forEachChild(node, (child) => visit(child, fromDecl));
    };
    for (const statement of sourceFile.statements) {
      const list = statementDecls.get(statement) || [];
      visit(statement, list.length === 0 ? null : list[0].record);
    }
  }

  result.edges = edges;
  stats.collect_ms = Date.now() - startedAt - stats.program_ms;
  stats.declarations = result.declarations.length;
  return result;
}

module.exports = {
  createReaderContext,
  // ---- Markdown / 锚点 ----
  MD_INLINE_LINK,
  MD_REF_DEF,
  HAS_SCHEME,
  // ---- 模块说明符 ----
  SPECIFIER_ANALYSIS,
  TYPESCRIPT_CANDIDATE_ROOTS,
  MODULE_EXTENSIONS,
  MODULE_EXT_SWAPS,
  MODULE_EXT_FALLBACKS,
  MODULE_SPECIFIER_FALLBACK,
  // ---- 路径 / 状态判定 ----
  absOf,
  globToRegExp,
  // ---- Markdown / 锚点 ----
  decodeFragment,
  // ---- 读取（读不到就必须红） ----
  decodeGuardedText,
  readText,
  readFailure,
  readTextOrReport,
  reportReadFailure,
  // ---- 路径 / 状态判定 ----
  positionAt,
  pathState,
  hasGlobMagic,
  segmentRegExp,
  GLOB_MAX_NODES,
  expandGlob,
  readDirEntries,
  globState,
  // ---- Markdown / 锚点 ----
  forEachMarkdownLink,
  // ---- package.json / CI 目标 ----
  collectPackageFieldTargets,
  collectExportStrings,
  positionOfJsonKey,
  extractNodeTargets,
  collectWorkflowRunLines,
  extractNpmScriptRefs,
  // ---- 路径 / 状态判定 ----
  indexPathState,
  isIgnoredPath,
  globIndexState,
  // ---- 模块说明符 ----
  moduleSpecifierCandidates,
  initSpecifierAnalysis,
  scriptKindFor,
  collectSpecifiersWithTypescript,
  collectSpecifiersWithKinds,
  maskSource,
  collectSpecifiersWithRegex,
  collectSpecifiersWithRegexKinds,
  collectModuleSpecifiers,
  collectModuleSpecifiersKinds,
  resolveRelativeSpecifier,
  forEachRelativeSpecifier,
  loadTypeScript,
  // ---- Markdown / 锚点 ----
  githubSlug,
  ATX_HEADING,
  HTML_ANCHOR_ATTR,
  headingPlainText,
  extractHeadingAnchors,
  anchorMatches,
  editDistance,
  // ---- 符号级（增量 3）：ts.createProgram + getTypeChecker ----
  STATUS_OF_INDEX_STATE,
  SYMBOL_REASONS,
  symbolCompilerOptions,
  symbolCompilerOptionsText,
  createIndexCompilerHost,
  bindingIdentifiersOf,
  buildSymbolGraph,
};
