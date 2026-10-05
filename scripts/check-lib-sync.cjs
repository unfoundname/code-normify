#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/check-lib-sync.cjs
 * 构建产物与源一致门禁（lib-sync guard）
 * ---------------------------------------------------------------------------
 * 目的：让「改了 src/ 却忘了重建 lib/ 就提交」在 CI 里自动变红。
 *       lib/ 是被 git 跟踪的构建产物（索引里 84 个文件），却没有门禁能发现
 *       「源码已改、产物还是旧的」——本地 `npm test` 跑的是旧 lib，全绿；
 *       CI 里 clone 出来的也是旧 lib，也全绿。这类假绿只有靠「重新编译一遍再逐字节比对」
 *       才能发现。
 *
 * ============================ 判定基准（关键） ============================
 * 判定基准必须是 **git 索引里的 lib/**（`git ls-files -s -- lib` 给出条目与 blob id，
 * 内容用 `git cat-file --batch` 批量读、逐文件 `git show :<path>` 作为回退），
 * **不是工作区当前内容**。
 *   为什么：CI 的典型步骤是 `npm ci && npm run build && npm test && <门禁>`。
 *   如果门禁读工作区的 lib/，那么 build 刚刚把工作区刷成最新，门禁永远绿——
 *   它恰好放过了它唯一要抓的那种提交（src 改了、lib 没提交）。读索引才等于问
 *   「这次提交/合并进仓库树的 lib 是不是和 src 对得上」。
 *   同理，产物集合也用 `git ls-files -- lib`（索引），不是工作区目录列举。
 *
 * ======================= 编译方式：临时工程根，零归一化 =======================
 * 做法：在系统 temp 里造一个**临时工程根**，把仓库的 tsconfig / package.json / src 搬过去编译，
 *       而不是对仓库原地编译、也不是 `tsc --outDir <tmp>`。
 *   为什么不原地编译：本门禁有一条硬约束——运行期不得写被检查仓库的任何文件
 *   （包括 lib/ 与 tsconfig.tsbuildinfo）。原地编译会覆盖工作区 lib/，既污染别的
 *   agent 的工作，又让「比对」失去意义。所以本脚本**只读仓库，只写 temp**。
 *   为什么不用 `--outDir <tmp>`：sourcemap 的 sources 是「产物目录 → 源码目录」的
 *       相对路径。实测（git show :lib/index.js.map）索引里的内容是
 *         {"version":3,"file":"index.js","sourceRoot":"","sources":["../src/index.ts"],...}
 *       lib/engine/branches.js.map 则是 sources:["../../src/engine/branches.ts"]。
 *       把 <repo>/src 编译到 <tmp>/lib，等于改变了「产物目录」相对「源码目录」的位置
 *       （路径深度不同、甚至不同盘符），tsc 写出的 sources 必然跟着变，
 *       于是每个 .js.map 都会假红。
 *       想消除这个假红只有两条路：归一化 sourcemap，或者让临时工程里的相对布局与仓库完全一致。
 *       **本门禁选后者，因为前者会掩盖真实差异**：sources 一旦归一化，
 *       「产物引用了错误的源码路径」这类真问题就再也报不出来。
 *   临时工程的相对布局与仓库逐字一致：
 *       <tmp>/tsconfig.json     ← 仓库 tsconfig.json 的字节拷贝（编译选项一字不改）
 *       <tmp>/package.json      ← 仓库 package.json 的字节拷贝（NodeNext 靠它的 type 字段定 ESM/CJS）
 *       <tmp>/src/**            ← 仓库 src/**（按 git 存储形式物化，见 materializeSrc）
 *       <tmp>/node_modules      ← 指向 <repo>/node_modules 的目录链接（junction / dir symlink）
 *     tsconfig 里的 outDir="lib"、declarationDir="lib/types"、rootDir="src"、include=["src"]
 *     全部按 tsconfig 所在目录解析，于是自动落进 temp；同时因 <tmp>/src 与 <repo>/src
 *     处于同一相对深度，sourcemap 的 sources 与索引里的完全一致——无需任何归一化。
 *     若 tsconfig 有 extends，被继承的文件也按同样的相对路径复制进 temp
 *     （见 copyTsconfigChain；做不到就报 error，不静默降级）。
 *
 * ============================== 零归一化 ==============================
 * **产物比对**是逐字节的：Buffer.equals，零归一化（normalizations: []）。
 *   不做行尾归一化（CRLF/LF 差异必须报出来，否则 Windows 提交 CRLF 产物、Linux CI 读到
 *   另一套字节的问题会被吞掉）；
 *   不做 BOM 剥离、不做尾随空白修剪、不做 JSON 重新序列化、不重写 sourcemap 的 sources；
 *   不做「解码成字符串再比」——那会掩盖非法 UTF-8 与编码差异。
 *   如有朝一日必须引入归一化，必须同时写清：理由、精确范围（哪些扩展名/哪些字段）、
 *   以及为什么它不会掩盖真实差异；并且要同步更新 NORMALIZATIONS 常量与报告。
 *   当前 NORMALIZATIONS 恒为空数组，报告里会回显它。
 *
 * 唯一的**非比对**字节处理在「源码物化」这一步（materializeSrc，作用在编译器输入上，
 * 不作用在比对结果上）：src/ 按 git 存储形式复制进临时工程 —— 只有当工作区文件与索引 blob
 * 的差异**恰好只由 CRLF→LF 解释**时才改用索引 blob。理由、精确范围、以及为什么它不会掩盖
 * 真实差异，全部写在 materializeSrc 上方的注释里，并在人类报告与 --json 里逐个文件回显。
 * 背景：tsc 把模板字符串原文逐字节写进产物，而 core.autocrlf=true 的检出会把行尾换成 CRLF，
 * 于是「同一份提交」在 Windows 上会比 ubuntu CI 多出一批与提交内容无关的假红。
 *
 * ============================== 临时目录与自净 ==============================
 *   - 临时目录一律用 `fs.mkdtempSync(path.join(os.tmpdir(), 'dsh-libsync-'))` 前缀
 *     （不要改成别的前缀：同机上其它 agent 会按前缀清理自己的目录）。
 *   - 结束时在 finally 里尽力清理；清理前先显式摘掉 node_modules 目录链接，
 *     避免递归删除跟随链接删到仓库的 node_modules（这是本脚本唯一有破坏性的动作，
 *     所以额外加了「tmp 必须在 os.tmpdir() 之下、且不在被检查仓库内」的硬校验）。
 *
 * 退出码：
 *   0  通过（lib/ 产物与全新编译逐字节一致）
 *   1  存在 error 级违规（含工具链不可用：拿不到 git 索引 / 编不了 / 取不到索引内容时
 *      宁可红也不要假绿）
 *   2  命令行用法错误（未知参数等）
 *
 * 用法：node scripts/check-lib-sync.cjs [--json] [--root <dir>] [--help]
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const TOOL = 'check-lib-sync';
const TOOL_VERSION = '1.0.0';

/** 被检查的构建产物目录（相对仓库根，posix）。 */
const LIB_DIR = 'lib';

/** 源码目录（相对仓库根，posix）；物化进临时工程时按 git 存储形式处理，见 materializeSrc。 */
const SRC_DIR = 'src';

/** 临时工程目录前缀。固定不动：同机上其它 agent 按各自前缀清理。 */
const TEMP_PREFIX = 'dsh-libsync-';

/**
 * 归一化清单。**恒为空**：本门禁逐字节比对，零归一化。
 * 这里保留一个显式常量（而不是在报告里硬写 "[]"），是为了让「将来不得不引入归一化」
 * 这件事必须经过一次代码改动 + 一次报告文案改动，不可能悄悄发生。
 */
const NORMALIZATIONS = [];

/** 违规类型 → 人类可读标题（报告分组用，顺序即输出顺序）。 */
const CHECK_TITLES = {
  'lib-sync': '构建产物与源一致（lib/ 索引内容 vs 全新编译）',
};

/** 违规 type → 报告里的中文说明（--json 里也带上，便于 CI 侧识别）。 */
const VIOLATION_TYPE_TITLES = {
  'lib-artifact-missing': 'lib 产物缺失（索引里没有该产物）',
  'lib-artifact-diff': 'lib 产物与全新编译不一致',
  'lib-artifact-orphan': 'lib 里的孤儿产物（索引里有、全新编译不再产出）',
  'compile-failed': '全新编译失败（TS 诊断错误）',
  'guard-unavailable': '工具链/前置条件不可用（宁可红不假绿）',
  'source-materialization-degraded': '源码物化降级（只能按工作区字节编译，可能假红）',
};

/** 单条违规里行内容摘要的截断长度（字符）。 */
const SNIPPET_LIMIT = 120;

/** 行级 diff 摘要最多列出的差异行数。 */
const LINE_DIFF_LIMIT = 5;

/** compile-failed 报告里最多带出的诊断条数。 */
const DIAGNOSTIC_LIMIT = 10;

/** 超过这个毫秒数就在报告里解释耗时构成。 */
const SLOW_MS = 15000;

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

const relPosix = (p) => p.split(path.sep).join('/');

/** 把仓库相对 posix 路径落到当前操作系统的绝对路径（path.join 负责分隔符转换）。 */
const absOf = (root, rel) => path.join(root, ...rel.split('/'));

const sha256Short = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12);

/** 截断成一行摘要（去掉换行/CR，超长加省略号）。 */
function snippetOf(text) {
  if (text === null || text === undefined) return '(无)';
  const oneLine = text.replace(/[\r\n]+/g, '\\n');
  return oneLine.length > SNIPPET_LIMIT ? `${oneLine.slice(0, SNIPPET_LIMIT)}…` : oneLine;
}

/** 取 buf 里第 offset 个字节所在的行（0-based 行号）。 */
function lineSliceAt(buf, offset) {
  const end = offset >= buf.length ? buf.length : offset;
  let lineStart = end;
  while (lineStart > 0 && buf[lineStart - 1] !== 0x0a) lineStart -= 1;
  let lineEnd = end;
  while (lineEnd < buf.length && buf[lineEnd] !== 0x0a) lineEnd += 1;
  return { text: buf.subarray(lineStart, lineEnd).toString('utf8'), start: lineStart, end: lineEnd };
}

/** 字节偏移 → 1-based 行号（只数 \n；与 check-references 的 positionAt 语义一致）。 */
function lineNumberAt(buf, offset) {
  let line = 1;
  const end = Math.min(offset, buf.length);
  for (let i = 0; i < end; i += 1) if (buf[i] === 0x0a) line += 1;
  return line;
}

/** 首个差异字节偏移；完全相同返回 -1。 */
function firstDiffOffset(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) if (a[i] !== b[i]) return i;
  return a.length === b.length ? -1 : n;
}

/**
 * 二进制判定：前 8KB 里出现 NUL 字节即视为二进制（不猜扩展名）。
 * 二进制内容只报偏移与哈希，不做行级 diff（行级 diff 对二进制是噪声）。
 */
function isProbablyBinary(buf) {
  const n = Math.min(buf.length, 8192);
  for (let i = 0; i < n; i += 1) if (buf[i] === 0x00) return true;
  return false;
}

/** 行级 diff 摘要：按 \n 切行，列出前 LINE_DIFF_LIMIT 个内容不同的行（1-based 行号）。 */
function lineDiffSummary(fresh, indexed) {
  const a = fresh.toString('utf8').split('\n');
  const b = indexed.toString('utf8').split('\n');
  const out = [];
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n && out.length < LINE_DIFF_LIMIT; i += 1) {
    const left = i < a.length ? a[i] : null;
    const right = i < b.length ? b[i] : null;
    if (left === right) continue;
    out.push({
      line: i + 1,
      fresh: left === null ? null : snippetOf(left),
      indexed: right === null ? null : snippetOf(right),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 子进程：git / node（一律 execFile，无 shell、无 npx）
// ---------------------------------------------------------------------------
/**
 * 执行 git。**直接 exec，不经 shell**：不拼字符串、不引号转义，Windows 与
 * ubuntu-latest 行为一致（check-references.cjs 同款约定）。
 */
function execGit(root, args, options) {
  const opts = options || {};
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    cwd: root,
    encoding: opts.encoding === undefined ? 'utf8' : opts.encoding,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** 取索引里某个条目的原始字节（`git show :<path>`）。失败由调用方报 guard-unavailable。 */
function execGitShowBytes(root, rel) {
  return execFileSync('git', ['-c', 'core.quotePath=false', 'show', `:${rel}`], {
    cwd: root,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/** git blob 的 SHA-1（`blob <size>\0<content>`）：用来校验「取到的字节」确实就是索引里那条。 */
function gitBlobSha1(buf) {
  return crypto
    .createHash('sha1')
    .update(`blob ${buf.length}\0`, 'utf8')
    .update(buf)
    .digest('hex');
}

/**
 * 批量取索引内容：一次 `git cat-file --batch`（stdin 传各条目 blob sha）读回全部字节。
 *
 * 为什么不是 84 次 `git show :<path>`：两者读的是**同一份索引 blob、同样的字节**
 * （脚本会用 git blob SHA-1 逐条自校验，见 gitBlobSha1），但每次 `git show` 都要新起一个
 * git 进程；实测 Windows 上单次约 110ms，84 次 ≈ 9.5s，把整条门禁拖到 20s（本地）。
 * 批量读把这一段压到一个进程。
 *
 * 返回 { contents: Map<rel, Buffer>, errors: Map<rel, string>, batchError: string|null }。
 *   - batchError 非空 = 批量读整体不可用（调用方回退到逐文件 `git show`，语义完全一致）；
 *   - errors 里的条目 = 该索引条目取不到/不是 blob/自校验失败（调用方报 guard-unavailable，宁可红不假绿）。
 */
function fetchIndexContents(ctx, entries) {
  const contents = new Map();
  const errors = new Map();
  if (entries.length === 0) return { contents, errors, batchError: null };

  const input = Buffer.from(`${entries.map((e) => e.sha).join('\n')}\n`, 'utf8');
  let out;
  try {
    out = execFileSync('git', ['-c', 'core.quotePath=false', 'cat-file', '--batch'], {
      cwd: ctx.root,
      input,
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (err) {
    return { contents, errors, batchError: `git cat-file --batch 执行失败：${err.message}` };
  }

  let pos = 0;
  for (const entry of entries) {
    const nl = out.indexOf(0x0a, pos);
    if (nl === -1) return { contents, errors, batchError: 'git cat-file --batch 输出提前结束（缺头部行）' };

    const header = out.subarray(pos, nl).toString('utf8');
    pos = nl + 1;
    const parts = header.split(' ');
    if (parts.length < 2 || parts[1] === 'missing') {
      errors.set(entry.rel, `索引条目取不到（git cat-file 返回 "${header}"）`);
      continue;
    }
    if (parts[1] !== 'blob') {
      errors.set(entry.rel, `索引条目不是 blob（type=${parts[1]}）`);
      continue;
    }
    const size = Number(parts[2]);
    if (!Number.isInteger(size) || size < 0 || pos + size > out.length) {
      return { contents, errors, batchError: `git cat-file --batch 输出长度与头部声明不符（"${header}"）` };
    }
    const buf = out.subarray(pos, pos + size);
    pos += size;
    if (out[pos] === 0x0a) pos += 1; // 内容后跟一个换行

    // 逐条自校验：算出来的 git blob SHA-1 必须等于索引里的 object id。
    // 只要批量解析有任何错位，这里立刻炸成 error，绝不会静默给出「比对通过」。
    if (gitBlobSha1(buf) !== entry.sha.toLowerCase()) {
      errors.set(entry.rel, `取到的字节与索引 object id 不符（自校验失败：期望 sha1 ${entry.sha}）`);
      continue;
    }
    contents.set(entry.rel, buf);
  }

  return { contents, errors, batchError: null };
}

/**
 * 定位仓库自带的 TypeScript 编译器入口（tsc.js）。
 * 用 require.resolve 而不是 `npx` / PATH 上的 `tsc`：CI 与本地必须编译同一份编译器，
 * 且不引入「PATH 里恰好有个别的 tsc」这种不可复现因素。
 */
function resolveTsc(root) {
  return require.resolve('typescript/lib/tsc.js', { paths: [root, __dirname] });
}

// ---------------------------------------------------------------------------
// JSONC：读 tsconfig（允许注释与尾随逗号）
// ---------------------------------------------------------------------------

/**
 * 极简 JSONC 解析：单趟扫描，字符串原样透传（绝不在字符串里做注释/逗号处理），
 * 行注释、块注释、尾随逗号在扫描时就地丢弃。
 * 只用来读 extends / 关键字段，不做 schema 校验（校验是 tsc 的事）。
 */
function parseJsonc(text, fileLabel) {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const n = src.length;
  let out = '';
  let i = 0;

  while (i < n) {
    const ch = src[i];

    if (ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') {
          j += 2;
          continue;
        }
        if (src[j] === '"') {
          j += 1;
          break;
        }
        j += 1;
      }
      out += src.slice(i, j);
      i = j;
      continue;
    }

    if (ch === '/' && src[i + 1] === '/') {
      while (i < n && src[i] !== '\n') i += 1;
      continue;
    }

    if (ch === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }

    if (ch === ',') {
      // 尾随逗号：向后跳过空白与注释，若紧跟 } 或 ] 就丢掉这个逗号。
      let j = i + 1;
      for (;;) {
        while (j < n && /\s/.test(src[j])) j += 1;
        if (src[j] === '/' && src[j + 1] === '/') {
          while (j < n && src[j] !== '\n') j += 1;
          continue;
        }
        if (src[j] === '/' && src[j + 1] === '*') {
          j += 2;
          while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j += 1;
          j += 2;
          continue;
        }
        break;
      }
      if (src[j] === '}' || src[j] === ']') {
        i += 1;
        continue;
      }
      out += ch;
      i += 1;
      continue;
    }

    out += ch;
    i += 1;
  }

  try {
    return JSON.parse(out);
  } catch (err) {
    throw new Error(`${fileLabel} 不是合法 JSON/JSONC：${err.message}`);
  }
}

/**
 * 解析 tsconfig 的 extends 目标。
 * 只支持**相对路径**目标（`./x.json`、`../x`）：临时工程要保持与仓库一致的相对布局，
 * 相对路径才能被原样搬过去。裸包名（`@tsconfig/node20`）与绝对路径会被调用方判为
 * 「搬不动」并报 error —— 不静默降级（静默降级会让临时工程用上与仓库不同的编译选项，
 * 于是比对结果整体失真）。
 * 返回绝对路径；不支持的写法返回 null。
 */
function resolveExtendsTarget(fromDirAbs, spec) {
  if (path.isAbsolute(spec)) return null;
  if (!spec.startsWith('./') && !spec.startsWith('../')) return null;

  const base = path.resolve(fromDirAbs, spec);
  const candidates = [base, `${base}.json`, path.join(base, 'tsconfig.json')];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`tsconfig 的 extends "${spec}" 解析不到文件（试过：${candidates.join('、')}）。`);
}

/**
 * 把仓库 tsconfig 及其 extends 链**按原相对路径**搬进临时工程根。
 * 逐字节 copyFileSync（不重新序列化：重新序列化会丢掉注释/BOM，也会掩盖真实差异）。
 * 搬不动（extends 是裸包名 / 指向仓库外 / 解析不到）一律抛错。
 */
function copyTsconfigChain(root, tmpDir) {
  const rootCfgAbs = absOf(root, 'tsconfig.json');
  if (!fs.existsSync(rootCfgAbs)) {
    throw new Error(`被检查仓库根下找不到 tsconfig.json：${rootCfgAbs}`);
  }

  const seen = new Set();
  const queue = [{ abs: rootCfgAbs, rel: 'tsconfig.json' }];
  const copied = [];

  while (queue.length > 0) {
    const { abs, rel } = queue.shift();
    const key = process.platform === 'win32' ? abs.toLowerCase() : abs;
    if (seen.has(key)) continue;
    seen.add(key);

    if (!fs.existsSync(abs)) throw new Error(`tsconfig 链上的文件不存在：${abs}`);

    const cfgDirAbs = path.dirname(abs);
    const cfgDirRel = path.posix.dirname(rel); // 该 tsconfig 在临时工程里的目录（posix）

    let parsed;
    try {
      parsed = parseJsonc(fs.readFileSync(abs, 'utf8'), relPosix(path.relative(root, abs)) || rel);
    } catch (err) {
      throw new Error(`无法解析 tsconfig（${rel}）：${err.message}`);
    }

    const dst = absOf(tmpDir, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(abs, dst); // 字节拷贝：选项、注释、BOM 一律原样
    copied.push(rel);

    const rawExtends = parsed && parsed.extends;
    if (rawExtends === undefined || rawExtends === null) continue;
    const specs = Array.isArray(rawExtends) ? rawExtends : [rawExtends];

    for (const spec of specs) {
      if (typeof spec !== 'string' || !spec) {
        throw new Error(`tsconfig（${rel}）的 extends 里有非字符串条目：${JSON.stringify(spec)}`);
      }
      const targetAbs = resolveExtendsTarget(cfgDirAbs, spec);
      if (!targetAbs) {
        throw new Error(
          `tsconfig（${rel}）的 extends "${spec}" 不是相对路径（裸包名或绝对路径），` +
            '无法按相同相对布局搬进临时工程；本门禁不会静默降级（降级会让临时工程用上不同的编译选项，比对整体失真）。',
        );
      }
      const relFromCfgDir = relPosix(path.relative(cfgDirAbs, targetAbs));
      const childRel = path.posix.normalize(path.posix.join(cfgDirRel, relFromCfgDir));
      if (childRel.startsWith('..')) {
        throw new Error(`tsconfig（${rel}）的 extends "${spec}" 指向仓库外（${targetAbs}），无法搬进临时工程。`);
      }
      queue.push({ abs: targetAbs, rel: childRel });
    }
  }

  return copied;
}

// ---------------------------------------------------------------------------
// 临时工程
// ---------------------------------------------------------------------------

/** 递归列出目录下的普通文件（posix 相对路径，已排序）。目录链接不跟随。 */
function walkFiles(absDir, relPrefix, out) {
  let entries;
  try {
    entries = fs.readdirSync(absDir, { withFileTypes: true });
  } catch (err) {
    throw new Error(`无法读取目录 ${absDir}：${err.message}`);
  }
  for (const entry of entries) {
    const rel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walkFiles(path.join(absDir, entry.name), rel, out);
    else if (entry.isFile()) out.push(rel);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 源码物化：按 git 存储形式（git-canonical）复制 src/ 进临时工程
// ---------------------------------------------------------------------------
/**
 * 为什么需要这一步（这不是「产物比对」的归一化，是「编译器输入」的保真）：
 *
 *   tsc 把模板字符串（template literal）的原文**逐字节**写进产物。所以产物字节会带上源码里的行尾。
 *   在 `core.autocrlf=true` 的机器上（本仓库所在 Windows 就是），git 检出时把 LF 换成 CRLF：
 *   工作区的 src/engine/policy.ts 是 CRLF（457 处），而索引 blob 是 LF；两者 `git status` 报**干净**，
 *   因为 git 认为它们只差检出过滤器。此时如果直接拿工作区字节去编译，产出的
 *   lib/engine/policy.js 会带 CRLF 的模板字符串（22885 字节），而索引里的 blob 是 LF（22835 字节）——
 *   门禁就为「换了台机器检出」这种与提交内容无关的原因报红，且 Windows 开发者永远修不绿。
 *
 * 规则（精确范围）：
 *   对 src/ 下的每个**已被 git 跟踪**的文件，比较「工作区字节 W」与「索引 blob 字节 I」：
 *     · I 存在且 I.equals(W)                            → 用 W（两者本来一致）；
 *     · I 存在且 crlfToLf(W).equals(I)                  → 用 I（差异**恰好只由 CRLF→LF 解释**）；
 *     · 其它一切情况（含真实的工作区改动、未跟踪的新文件、取不到 I） → 用 W，一个字节都不改。
 *
 * 为什么不会掩盖真实差异：
 *   1. 该规则只在「差异恰好等于一次 CRLF→LF 转换」时生效。开发者只要真改了内容（哪怕只多一个字符），
 *      crlfToLf(W) 就不会等于 I，于是原样使用工作区字节，产物差异照报不误。
 *   2. 它作用在**编译器输入**上，不是作用在比对结果上：产物两侧仍然是 Buffer.equals 逐字节比对，
 *      零归一化。规则改的是「喂给 tsc 的源码是哪一份」，而它选的是 git 的存储形式 ——
 *      也就是 CI 上一次干净 checkout 会喂给 tsc 的那一份。提交门禁要比对的本来就是「提交进仓库的 src」
 *      与「提交进仓库的 lib」，工作区里被检出过滤器改过的行尾从来不属于提交内容。
 *   3. 它只会让「同一份提交在 Windows 与 ubuntu 上得到同一个结论」，不可能把红变绿：
 *      真产物差异（内容、结构、sourcemap）与行尾无关，一律照报。
 *   4. 每次运行都会在人类报告与 --json 里**逐个列出**被这样物化的文件，不做静默处理。
 */
function crlfToLf(buf) {
  if (buf.indexOf(0x0d) === -1) return buf;
  const out = Buffer.allocUnsafe(buf.length);
  let w = 0;
  for (let i = 0; i < buf.length; i += 1) {
    if (buf[i] === 0x0d && buf[i + 1] === 0x0a) continue; // 只吃掉 CRLF 里的 CR；孤立 CR 与 LF 原样保留
    out[w] = buf[i];
    w += 1;
  }
  return out.subarray(0, w);
}

/** 读 src/ 的索引 blob（rel → Buffer）。失败返回 error 字符串，调用方降级为「按工作区物化」并报 warning。 */
function readSrcIndexBlobs(ctx) {
  const map = new Map();
  let entries = [];
  try {
    const raw = execGit(ctx.root, ['ls-files', '-s', '-z', '--', SRC_DIR]);
    for (const record of raw.split('\0').filter(Boolean)) {
      const tab = record.indexOf('\t');
      if (tab === -1) continue;
      const stage = record.slice(0, tab).split(/\s+/)[2];
      if (stage !== '0') continue;
      entries.push({ rel: record.slice(tab + 1), sha: record.slice(0, tab).split(/\s+/)[1] });
    }
  } catch (err) {
    return { map, error: `git ls-files -s -- ${SRC_DIR} 失败：${err.message}` };
  }
  if (entries.length === 0) return { map, error: `索引里没有 ${SRC_DIR}/ 下的文件（未跟踪？）` };

  const fetched = fetchIndexContents(ctx, entries);
  if (fetched.batchError) return { map, error: fetched.batchError };
  for (const [rel, buf] of fetched.contents) map.set(rel, buf);
  if (fetched.errors.size > 0) {
    return { map, error: `${fetched.errors.size} 个 ${SRC_DIR}/ 索引条目取不到内容` };
  }
  return { map, error: null };
}

/**
 * 把 <repo>/src 递归复制到 <tmp>/src，按上面的 git-canonical 规则决定每个文件写哪些字节。
 * 目录结构、相对深度、文件名一律保持原样（sourcemap 的 sources 依赖这个布局）。
 */
function materializeSrc(ctx, dstSrcAbs) {
  const srcAbs = absOf(ctx.root, SRC_DIR);

  function walk(fromDirAbs, toDirAbs, relPrefix) {
    fs.mkdirSync(toDirAbs, { recursive: true });
    for (const entry of fs.readdirSync(fromDirAbs, { withFileTypes: true })) {
      const from = path.join(fromDirAbs, entry.name);
      const to = path.join(toDirAbs, entry.name);
      const childPrefix = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(from, to, childPrefix);
        continue;
      }
      if (!entry.isFile()) continue; // 符号链接等：不跟随、不复制（tsc 也不会从这里取输入）

      const rel = `${SRC_DIR}/${childPrefix}`;
      const worktree = fs.readFileSync(from);
      const indexed = ctx.srcIndexBlobs.get(rel);

      if (indexed && !indexed.equals(worktree) && crlfToLf(worktree).equals(indexed)) {
        fs.writeFileSync(to, indexed);
        ctx.stats.srcFromIndex.push(rel);
        continue;
      }
      fs.writeFileSync(to, worktree);
      ctx.stats.srcFromWorktree += 1;
      if (!indexed) ctx.stats.srcNotInIndex += 1;
    }
  }

  walk(srcAbs, dstSrcAbs, '');
}

/**
 * 建临时工程根：<tmp>/tsconfig.json(+extends 链) + <tmp>/src/** + <tmp>/node_modules 链接。
 * 仓库侧只读（readFileSync / copyFileSync / symlink 的目标），不写任何仓库文件。
 * 返回 { dir, tsconfigs }。
 */
function prepareTempProject(ctx) {
  const tmpBase = os.tmpdir();
  const dir = fs.mkdtempSync(path.join(tmpBase, TEMP_PREFIX));

  // 硬校验：绝不接受「临时目录落在被检查仓库里」——否则清理就等于删仓库。
  const tmpReal = safeRealpath(dir);
  const rootReal = safeRealpath(ctx.root);
  if (isInside(tmpReal, rootReal)) {
    throw new Error(`临时目录 ${dir} 落在被检查仓库 ${ctx.root} 内，拒绝继续（避免清理时删到仓库）。`);
  }
  ctx.tempDir = dir;

  const srcAbs = absOf(ctx.root, SRC_DIR);
  if (!fs.existsSync(srcAbs) || !fs.statSync(srcAbs).isDirectory()) {
    throw new Error(`被检查仓库根下找不到 ${SRC_DIR}/ 目录：${srcAbs}`);
  }
  // 源码物化：按 git 存储形式复制（详见 materializeSrc 的注释）。index blobs 取不到时降级为
  // 「按工作区原样物化」并报 warning —— 降级只可能带来假红（CRLF 检出），不可能带来假绿。
  const srcBlobs = readSrcIndexBlobs(ctx);
  ctx.srcIndexBlobs = srcBlobs.map;
  ctx.srcIndexBlobsError = srcBlobs.error;
  materializeSrc(ctx, path.join(dir, SRC_DIR));

  // package.json 必须跟着搬：tsconfig 是 `module: NodeNext` 时，tsc 按**最近的 package.json**
  // 的 `type` 字段决定该文件编译成 ESM 还是 CommonJS。临时工程里没有它，tsc 会一路向上找到
  // （通常不存在的）%TEMP%/package.json 并默认成 CommonJS，于是全新编译产出 `"use strict";` +
  // `require(...)`，而索引里是 `import ...` —— 84 个文件全部假红。
  // 只在仓库根确实有 package.json 时复制（没有就照实不复制，与仓库内 tsc 的行为保持一致）；
  // 字节拷贝，不做任何改写。
  const pkgAbs = absOf(ctx.root, 'package.json');
  if (fs.existsSync(pkgAbs)) {
    fs.copyFileSync(pkgAbs, path.join(dir, 'package.json'));
  }
  ctx.stats.packageJsonCopied = fs.existsSync(pkgAbs);

  const tsconfigs = copyTsconfigChain(ctx.root, dir);

  // node_modules：目录链接（Windows 用 junction，其它平台用 dir symlink）。
  // 失败必须报 error：没有它，tsconfig 的 types:["node"] 解析不到，编译会因假原因失败。
  const nmTarget = path.join(ctx.root, 'node_modules');
  if (!fs.existsSync(nmTarget)) {
    throw new Error(
      `被检查仓库根下找不到 node_modules/：${nmTarget}。CI 需先 \`npm ci\`（本门禁不会替你安装依赖）。`,
    );
  }
  const nmLink = path.join(dir, 'node_modules');
  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  try {
    fs.symlinkSync(safeRealpath(nmTarget), nmLink, linkType);
  } catch (err) {
    throw new Error(
      `无法在临时工程里建立 node_modules 目录链接（${linkType}）：${err.message}。` +
        'Windows 下 junction 目标必须是绝对路径；若权限策略禁止建链接，请改用允许创建 junction 的环境。',
    );
  }

  return { dir, tsconfigs };
}

function safeRealpath(p) {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return path.resolve(p);
  }
}

/** child 是否在 parent 之内（含相等）。大小写按平台处理。 */
function isInside(child, parent) {
  const norm = (s) => {
    let out = s.replace(/[\\/]+$/, '');
    return process.platform === 'win32' ? out.toLowerCase() : out;
  };
  const c = norm(child);
  const p = norm(parent);
  if (c === p) return true;
  const sep = process.platform === 'win32' ? '\\' : '/';
  return c.startsWith(p.endsWith(sep) ? p : p + sep);
}

/**
 * 清理临时工程。**先显式摘掉 node_modules 链接再递归删**：
 * 递归删除若跟随目录链接，就会删到仓库的 node_modules（灾难性副作用），
 * 所以这里不依赖 fs.rmSync 对链接的处理，自己先断开。
 */
function cleanupTemp(ctx) {
  const dir = ctx.tempDir;
  if (!dir) return;
  const notes = [];

  const tmpBase = safeRealpath(os.tmpdir());
  const dirReal = safeRealpath(dir);
  if (!isInside(dirReal, tmpBase) || isInside(dirReal, safeRealpath(ctx.root))) {
    notes.push(`临时目录 ${dir} 不在 os.tmpdir() 之下或落在被检查仓库内，出于安全拒绝递归删除。`);
    ctx.stats.tempCleanup = notes.join(' ');
    return;
  }

  const nmLink = path.join(dir, 'node_modules');
  try {
    if (fs.existsSync(nmLink) || fs.lstatSync(nmLink)) {
      try {
        fs.unlinkSync(nmLink); // junction / symlink：只摘链接，不动目标
      } catch {
        fs.rmdirSync(nmLink);
      }
    }
  } catch {
    /* 链接本来就不存在 */
  }

  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3 });
  } catch (err) {
    notes.push(`清理临时目录失败（不影响判定结果，可手工删除 ${dir}）：${err.message}`);
  }
  ctx.stats.tempCleanup = notes.length > 0 ? notes.join(' ') : `已清理 ${dir}`;
}

// ---------------------------------------------------------------------------
// 编译
// ---------------------------------------------------------------------------

/**
 * 跑一次全新编译（node + tsc.js 绝对路径；不经 shell、不用 npx）。
 * 返回 { status, diagnostics[], raw }。诊断只保留含 `error TS` 的行（tsc 出错时写 stdout）。
 */
function runTsc(ctx, tscPath, tmpDir) {
  const t0 = Date.now();
  let status = 0;
  let stdout = '';
  let stderr = '';

  try {
    stdout = execFileSync(process.execPath, [tscPath, '-p', 'tsconfig.json'], {
      cwd: tmpDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
    });
  } catch (err) {
    status = typeof err.status === 'number' ? err.status : 1;
    stdout = typeof err.stdout === 'string' ? err.stdout : '';
    stderr = typeof err.stderr === 'string' ? err.stderr : '';
    if (!stdout && !stderr) stderr = err.message;
  }

  ctx.timing.tscMs = Date.now() - t0;
  const combined = `${stdout}\n${stderr}`;
  const diagnostics = combined
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => /\berror TS\d+/.test(line));

  return { status, diagnostics, raw: combined.trim() };
}

// ---------------------------------------------------------------------------
// 上下文 / CLI
// ---------------------------------------------------------------------------

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n运行 \`node scripts/check-lib-sync.cjs --help\` 查看用法。\n`);
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
    // 拿不到仓库根 / 拿不到 git 索引时宁可红：静默跳过会让门禁假绿。
    ctx.report({
      check: 'lib-sync',
      severity: 'error',
      type: 'guard-unavailable',
      file: '.',
      line: 1,
      target: ctx.root || 'git',
      message: ctx.bootstrapError,
      hint:
        '本门禁依赖 `git ls-files -s -- lib` 与 `git cat-file --batch`（回退 `git show :<path>`）作为判定基准，' +
        '并依赖仓库自带的 typescript 做一次全新编译；请在完整 git checkout + 已 `npm ci` 的仓库里运行。',
    });
  } else {
    runLibSync(ctx);
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
  const lines = [
    `${TOOL} v${TOOL_VERSION} — 构建产物与源一致门禁（lib-sync guard）`,
    '',
    '用法：',
    '  node scripts/check-lib-sync.cjs [选项]',
    '',
    '选项：',
    '  --json          只向 stdout 输出机器可读 JSON（含 normalizations / violations）',
    '  --root <dir>    指定被检查的仓库根（默认：git rev-parse --show-toplevel，从本脚本所在目录解析）',
    '  -h, --help      打印本帮助',
    '',
    '退出码：',
    '  0  lib/ 索引内容与全新编译逐字节一致',
    '  1  存在 error 级违规，或工具链不可用（git / typescript / 临时工程失败）',
    '  2  命令行用法错误',
    '',
    '判定基准：',
    `  **git 索引里的 ${LIB_DIR}/**（\`git ls-files -s -- ${LIB_DIR}\` 给出条目与 blob id，`,
    '  内容取 `git cat-file --batch` 批量读、或逐文件 `git show :<path>` 回退），**不是工作区当前内容**。',
    '  否则 CI 里「先 npm run build 再检查工作区」会让门禁永远绿，恰好放过它唯一要抓的那种提交',
    '  （src/ 改了、lib/ 没重建就提交）。',
    '',
    '编译方式（零仓库写入）：',
    `  在系统 temp（os.tmpdir()）下建一个临时工程根：`,
    '    <tmp>/tsconfig.json   ← 仓库 tsconfig.json 的字节拷贝（编译选项一字不改；含 extends 链按原相对路径一并复制）',
    '    <tmp>/package.json    ← 仓库 package.json 的字节拷贝（NodeNext 靠它的 type 字段决定 ESM/CommonJS，缺了会整体编译成 CJS 而全部假红）',
    '    <tmp>/src/**          ← 仓库 src/** 的复制（按 git 存储形式，见下「源码物化」）',
    '    <tmp>/node_modules    ← 指向 <repo>/node_modules 的目录链接（Windows: junction；其它: dir symlink）',
    '  然后 node <repo>/node_modules/typescript/lib/tsc.js -p tsconfig.json（cwd=<tmp>，无 shell、无 npx）。',
    '  被检查仓库在运行期**只读**：不写 lib/、不写 tsconfig.tsbuildinfo、不写任何文件；临时目录在 finally 里清理。',
    '  为什么不原地编译：原地编译会污染工作区 lib/，也会让「比对」失去意义。',
    '  为什么不用 --outDir <tmp>：sourcemap 的 sources 是「产物目录 → 源码目录」的相对路径',
    '    （索引里 lib/index.js.map 是 sources:["../src/index.ts"]，lib/engine/branches.js.map 是 ["../../src/engine/branches.ts"]），',
    '    改路径深度/盘符会让 sources 变化，从而每个 .js.map 假红。临时工程保持与仓库逐字一致的相对布局，',
    '    sources 因此天然一致——**不需要任何归一化**。',
    '',
    '比对方式：',
    '  **产物逐字节比对，零归一化**（normalizations: []）。',
    '  不做行尾（CRLF/LF）归一化、不做 BOM 剥离、不做尾随空白修剪、不做 JSON 重新序列化、',
    '  不重写 sourcemap 的 sources、不「解码成字符串再比」（那会掩盖非法 UTF-8）。',
    '',
    '源码物化（唯一一处非比对的字节处理，作用在「编译器输入」上，不作用在比对结果上）：',
    '  src/ 按 **git 存储形式**复制进临时工程：对每个被跟踪的 src 文件，比较工作区字节 W 与索引 blob 字节 I，',
    '    · I.equals(W)               → 用 W；',
    '    · crlfToLf(W).equals(I)     → 用 I（差异**恰好只由 CRLF→LF 解释**，即检出过滤器的产物）；',
    '    · 其它一切情况（真实改动 / 未跟踪 / 取不到 I） → 用 W，一个字节都不改。',
    '  理由：tsc 把模板字符串原文逐字节写进产物，而 `core.autocrlf=true` 的检出会把 src 的行尾换成 CRLF，',
    '    于是同一份提交在 Windows 上产出的 lib/*.js 会比索引里的 LF blob 多出成百上千字节 —— 与提交内容无关的假红。',
    '  精确范围：只作用于 src/ 下被 git 跟踪的普通文件；只做 CRLF→LF（孤立 CR 与 LF 原样保留）。',
    '  为什么不会掩盖真实差异：该规则只在「差异恰好等于一次 CRLF→LF」时生效，真改了内容就必然落到「用 W」分支；',
    '    且它选的是 git 的存储形式，也就是 CI 一次干净 checkout 会喂给 tsc 的那一份。每次运行都会逐个文件回显命中的路径。',
    '',
    '检查项：',
    `  1. lib-artifact-missing → error：全新编译产出的文件在 \`git ls-files -s -- ${LIB_DIR}\` 里找不到`,
    '       → 说明产物没构建/没 `git add`（判定基准是索引，不是工作区磁盘）。',
    '  2. lib-artifact-diff → error：两侧字节不一致。报告给出路径、两侧字节数、首个差异字节偏移、',
    '       该偏移所在行号、两侧该行内容摘要（截断约 120 字符）、两侧 sha256 前 12 位；',
    '       文本文件额外给行级 diff 摘要，二进制内容只给偏移与哈希。',
    '  3. lib-artifact-orphan → error：索引里有、全新编译不再产出（源码已删/已改名，产物没清）。',
    '  4. compile-failed → error：全新编译有 TS 诊断错误时，只报编译失败（带前约 10 条诊断）并停止后续比对，',
    '       避免把几十个文件都报成 orphan 淹没真因。',
    '  5. guard-unavailable → error：git 不可用 / 不是 git 仓库 / `git ls-files` 失败 / 取某个索引条目',
    '       的内容失败（批量读自校验不过或 `git show` 失败）/ 索引条目处于合并冲突 / typescript 工具链取不到 /',
    '       tsconfig 搬不进临时工程 —— 一律红，不假绿。',
    '',
    '性能：只跑一次 tsc；索引内容一次 `git cat-file --batch` 批量读（逐条做 git blob SHA-1 自校验），',
    '  批量读不可用时回退到逐文件 `git show :<path>`。',
    `  总耗时超过 ${SLOW_MS / 1000}s 时，报告里会解释耗时构成（编译 / 取索引 / 比对）。`,
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

function resolveRoot(explicit) {
  if (explicit) {
    const abs = path.resolve(process.cwd(), explicit);
    if (fs.existsSync(abs)) return abs;
    return { missing: abs };
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

function createContext(opts) {
  const cwd = process.cwd();
  const ctx = {
    root: null,
    tempDir: null,
    head: null,
    libIndex: [],
    libEntries: [],
    indexStageConflicts: [],
    produced: [],
    srcIndexBlobs: new Map(),
    srcIndexBlobsError: null,
    stats: {
      identical: 0,
      missing: 0,
      orphan: 0,
      diff: 0,
      compared: 0,
      diagnostics: 0,
      tempCleanup: null,
      packageJsonCopied: false,
      batchRead: null,
      batchReadError: null,
      // 源码物化统计：srcFromIndex = 差异恰好只由 CRLF→LF 解释、因此用索引 blob 的文件
      srcFromIndex: [],
      srcFromWorktree: 0,
      srcNotInIndex: 0,
    },
    timing: { indexMs: 0, prepareMs: 0, tscMs: 0, compareMs: 0 },
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

  ctx.root = resolveRoot(opts.root);
  if (ctx.root && typeof ctx.root === 'object' && ctx.root.missing) {
    ctx.bootstrapError = `--root 指向的目录不存在：${ctx.root.missing}`;
    ctx.root = null;
    return ctx;
  }
  if (!ctx.root) {
    ctx.bootstrapError = `无法定位仓库根目录（cwd=${cwd}，git rev-parse --show-toplevel 失败）`;
    return ctx;
  }

  // --root 必须是仓库根本身：否则 git 会向上发现别的仓库，比对基准就落到了另一个仓库的索引上。
  try {
    assertGitRoot(ctx.root);
  } catch (err) {
    ctx.bootstrapError = err.message;
    return ctx;
  }

  return ctx;
}

/**
 * 校验 root 确实是 git 仓库根。
 * 只跑 `git ls-files` 是不够的：git 会向上发现父级仓库，于是「--root 指向一个非 git 的
 * 临时目录」会被静默当成附近某个仓库，判定基准就跑偏了。这里用 rev-parse 的顶层目录做等值校验。
 */
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
    const real = safeRealpath(path.resolve(p));
    const trimmed = real.replace(/[\\/]+$/, '');
    return process.platform === 'win32' ? trimmed.toLowerCase() : trimmed;
  };
  if (normalize(top) !== normalize(root)) {
    throw new Error(
      `--root ${root} 不是 git 仓库根：git 报告的顶层目录是 ${path.resolve(top)}。` +
        '（若传的是仓库内的子目录，git 会向上发现父仓库，判定基准会落到错误的仓库上。）',
    );
  }
}

// ---------------------------------------------------------------------------
// 主检查：全新编译 vs git 索引里的 lib/
// ---------------------------------------------------------------------------

function runLibSync(ctx) {
  const t0 = Date.now();

  // ---- 1. 索引基线 ----
  const tIndex = Date.now();
  try {
    // `-s` 额外给出每个条目的 blob object id（用于批量取内容 + 自校验），`-z` 让路径不被引号包裹/转义。
    const raw = execGit(ctx.root, ['ls-files', '-s', '-z', '--', LIB_DIR]);
    for (const record of raw.split('\0').filter(Boolean)) {
      const tab = record.indexOf('\t');
      if (tab === -1) continue;
      const [mode, sha, stage] = record.slice(0, tab).split(/\s+/);
      const rel = record.slice(tab + 1);
      // stage 0 = 无冲突的正常条目；`git show :<path>` 读的正是 stage 0。
      if (stage !== '0') {
        ctx.indexStageConflicts.push(rel);
        continue;
      }
      ctx.libIndex.push(rel);
      ctx.libEntries.push({ rel, sha, mode });
    }
  } catch (err) {
    ctx.report({
      check: 'lib-sync',
      severity: 'error',
      type: 'guard-unavailable',
      file: '.',
      line: 1,
      target: `git ls-files -s -- ${LIB_DIR}`,
      message: `git ls-files 执行失败：${err.message}`,
      hint: `判定基准是 git 索引里的 ${LIB_DIR}/；拿不到它就没法比对，宁可红也不假绿。`,
    });
    return;
  }
  // 索引里有冲突条目（stage 1/2/3，没有 stage 0）时 `git show :<path>` 必然失败：显式报出来。
  for (const rel of ctx.indexStageConflicts) {
    ctx.report({
      check: 'lib-sync',
      severity: 'error',
      type: 'guard-unavailable',
      file: rel,
      line: 1,
      target: `git show :${rel}`,
      message: `索引里的 ${rel} 处于合并冲突状态（只有 stage 1/2/3，没有 stage 0），无法取到「索引内容」这一基准。`,
      hint: '先解决合并冲突（git add 该文件产生 stage 0 条目）再跑本门禁。',
    });
  }
  try {
    ctx.head = execGit(ctx.root, ['rev-parse', '--short', 'HEAD']).trim();
  } catch {
    ctx.head = null; // 无提交（全新仓库）：只是展示信息，不影响判定
  }
  ctx.timing.indexMs = Date.now() - tIndex;

  // ---- 2. 工具链 ----
  let tscPath;
  try {
    tscPath = resolveTsc(ctx.root);
  } catch (err) {
    ctx.report({
      check: 'lib-sync',
      severity: 'error',
      type: 'guard-unavailable',
      file: '.',
      line: 1,
      target: 'typescript/lib/tsc.js',
      message: `工具链不可用：解析不到仓库里的 typescript（require.resolve('typescript/lib/tsc.js') 失败）：${err.message}`,
      hint: 'CI 里请先 `npm ci` 再跑本门禁；本门禁不会替你安装依赖，也不会退回 PATH 上的 tsc（不可复现）。',
    });
    return;
  }

  // ---- 3. 临时工程 + 全新编译 ----
  let prep;
  const tPrep = Date.now();
  try {
    prep = prepareTempProject(ctx);
  } catch (err) {
    ctx.timing.prepareMs = Date.now() - tPrep;
    ctx.report({
      check: 'lib-sync',
      severity: 'error',
      type: 'guard-unavailable',
      file: '.',
      line: 1,
      target: 'temp-project',
      message: `无法在系统 temp 里建立临时工程（本门禁拒绝原地编译，因此没有它就无法比对）：${err.message}`,
      hint: `临时目录前缀固定为 ${TEMP_PREFIX}（os.tmpdir() 之下）；本门禁运行期不写被检查仓库的任何文件。`,
    });
    return;
  }
  ctx.timing.prepareMs = Date.now() - tPrep;

  // 取不到 src 索引 blob ⇒ 源码只能按工作区原样物化。这只可能造成假红（CRLF 检出 vs LF blob），
  // 不可能造成假绿，所以报 warning 而不是 error；但绝不静默。
  if (ctx.srcIndexBlobsError) {
    ctx.report({
      check: 'lib-sync',
      severity: 'warning',
      type: 'source-materialization-degraded',
      file: SRC_DIR,
      line: 1,
      target: `${SRC_DIR}/ 索引 blob`,
      message:
        `无法按 git 存储形式物化 ${SRC_DIR}/（${ctx.srcIndexBlobsError}），已降级为按工作区字节原样物化。`,
      hint:
        '降级只可能造成假红：在 core.autocrlf=true 的检出上，源码行尾是 CRLF 而索引 blob 是 LF，' +
        '模板字符串会把 CRLF 带进产物，于是与索引里的 LF 产物报不一致。若出现这类不一致，先确认 ' +
        '`git status` 对该文件是否干净（干净 = 纯检出过滤器差异，不是真问题）。',
    });
  }

  try {
    const compiled = runTsc(ctx, tscPath, prep.dir);

    // 编译失败（或有诊断）时直接停：产物不可信，继续比对会把几十个文件报成 orphan，淹没真因。
    if (compiled.status !== 0 || compiled.diagnostics.length > 0) {
      ctx.stats.diagnostics = compiled.diagnostics.length;
      const shown = compiled.diagnostics.slice(0, DIAGNOSTIC_LIMIT);
      ctx.report({
        check: 'lib-sync',
        severity: 'error',
        type: 'compile-failed',
        file: 'tsconfig.json',
        line: 1,
        target: `${tscPath}`,
        message:
          `全新编译失败（tsc 退出码 ${compiled.status}，共 ${compiled.diagnostics.length} 条 TS 诊断）。` +
          '产物不可信，已停止后续的缺失/孤儿/内容比对，避免噪声淹没真因。',
        hint: '先修 src/（或 tsconfig）的编译错误；本门禁编译的是 <temp>/src 的字节拷贝与仓库 tsconfig 的字节拷贝。',
        diagnostics: shown,
        diagnosticsTotal: compiled.diagnostics.length,
      });
      return;
    }

    // ---- 4. 枚举全新编译产物 ----
    // 相对路径带上 `lib/` 前缀：索引里的路径形如 `lib/engine/branches.js`，
    // 两侧必须是同一套「相对仓库根」的路径，否则集合比对会整体错位（84 missing + 84 orphan）。
    const producedDir = path.join(prep.dir, LIB_DIR);
    let produced = [];
    if (fs.existsSync(producedDir)) produced = walkFiles(producedDir, LIB_DIR, []).sort();
    ctx.produced = produced;

    if (produced.length === 0) {
      ctx.report({
        check: 'lib-sync',
        severity: 'error',
        type: 'compile-failed',
        file: 'tsconfig.json',
        line: 1,
        target: `${tscPath}`,
        message:
          `全新编译没有任何输出（tsc 退出码 ${compiled.status}，${path.join(prep.dir, LIB_DIR)} 为空或不存在）。` +
          '产物为空时直接停，避免把索引里的每个文件都误报成 orphan。',
        hint: '检查 tsconfig 的 outDir / include / files 是否真的覆盖到了 src/。',
      });
      return;
    }

    // ---- 5. 集合比对（产物集合 vs 索引集合） ----
    const tCompare = Date.now();
    const indexSet = new Set(ctx.libIndex);
    const producedSet = new Set(produced);

    // 取索引侧字节：优先一次 `git cat-file --batch`（与 84 次 `git show :<path>` 读同一份索引 blob，
    // 且逐条做 git blob SHA-1 自校验）；批量读整体不可用时回退到逐文件 `git show`，语义完全一致。
    ctx.stats.batchRead = true;
    let fetched = fetchIndexContents(ctx, ctx.libEntries);
    if (fetched.batchError) {
      ctx.stats.batchRead = false;
      ctx.stats.batchReadError = fetched.batchError;
      fetched = { contents: new Map(), errors: new Map(), batchError: null };
      for (const entry of ctx.libEntries) {
        try {
          fetched.contents.set(entry.rel, execGitShowBytes(ctx.root, entry.rel));
        } catch (err) {
          fetched.errors.set(entry.rel, `git show :${entry.rel} 失败：${err.message}`);
        }
      }
    }
    // 索引侧取不到的条目：error（宁可红不假绿），且不参与内容比对。
    for (const [rel, message] of fetched.errors) {
      ctx.report({
        check: 'lib-sync',
        severity: 'error',
        type: 'guard-unavailable',
        file: rel,
        line: 1,
        target: `git show :${rel}`,
        message: `取索引内容失败（${rel}）：${message}`,
        hint: '拿不到索引侧的字节就没法比对，宁可红也不假绿（索引条目损坏 / 稀疏检出 / git 异常 / 合并冲突）。',
      });
    }

    // 产物有、索引里没有 → lib-artifact-missing（「lib 产物缺失，需构建并提交」）。
    for (const rel of produced) {
      if (indexSet.has(rel)) continue;
      ctx.stats.missing += 1;
      ctx.report({
        check: 'lib-sync',
        severity: 'error',
        type: 'lib-artifact-missing',
        file: rel,
        line: 1,
        target: rel,
        resolved: rel,
        message: `lib 产物缺失，需构建并提交（npm run build && git add lib）：全新编译产出了 ${rel}，但它在 git 索引里不存在。`,
        hint:
          '全新编译会产出它，但索引里没有它 —— 说明这次提交的 lib/ 不完整（漏 build、漏 `git add`，或 .gitignore 挡掉了）。' +
          `注意判定基准是索引（\`git ls-files -- ${LIB_DIR}\`），不是工作区磁盘。`,
      });
    }

    // 索引里有、全新编译不再产出 → lib-artifact-orphan（「lib 里的孤儿产物」）。
    for (const rel of ctx.libIndex) {
      if (producedSet.has(rel)) continue;
      ctx.stats.orphan += 1;
      ctx.report({
        check: 'lib-sync',
        severity: 'error',
        type: 'lib-artifact-orphan',
        file: rel,
        line: 1,
        target: rel,
        resolved: rel,
        message: `lib 里的孤儿产物：${rel} 在 git 索引里存在，但全新编译不再产出它。`,
        hint:
          '源码已删除/改名/移出 include，但旧产物仍留在索引里 —— 需要 `npm run build` 后 `git add -A lib` 把它从索引里删掉。',
      });
    }

    for (const rel of ctx.libIndex) {
      if (!producedSet.has(rel)) continue;
      compareOne(ctx, rel, producedDir, fetched.contents.get(rel));
    }
    ctx.timing.compareMs = Date.now() - tCompare;
  } finally {
    cleanupTemp(ctx);
  }
}

/**
 * 逐字节比对单个产物：全新编译（temp 磁盘）vs 索引（`git show :<path>` / 批量读到的索引 blob 字节）。
 * `indexed` 为 undefined 表示索引侧取不到 —— 上面已按 guard-unavailable 报过，这里不重复报。
 */
function compareOne(ctx, rel, producedDir, indexed) {
  const freshAbs = absOf(producedDir, rel.slice(LIB_DIR.length + 1));

  let fresh;
  try {
    fresh = fs.readFileSync(freshAbs);
  } catch (err) {
    ctx.report({
      check: 'lib-sync',
      severity: 'error',
      type: 'guard-unavailable',
      file: rel,
      line: 1,
      target: rel,
      message: `无法读取全新编译产物 ${freshAbs}：${err.message}`,
      hint: '产物枚举与读取之间文件消失；本门禁按「宁可红不假绿」处理。',
    });
    return;
  }

  if (!Buffer.isBuffer(indexed)) return; // 索引侧取不到，已报 guard-unavailable

  ctx.stats.compared += 1;

  if (fresh.equals(indexed)) {
    ctx.stats.identical += 1;
    return;
  }

  // ---- 差异定位：逐字节，零归一化 ----
  const offset = firstDiffOffset(fresh, indexed);
  const binary = isProbablyBinary(fresh) || isProbablyBinary(indexed);
  const freshSha = sha256Short(fresh);
  const indexSha = sha256Short(indexed);

  let line = 1;
  let freshLine = null;
  let indexLine = null;
  let lineDiff = null;

  if (offset >= 0) {
    line = lineNumberAt(fresh, offset);
    freshLine = snippetOf(lineSliceAt(fresh, offset).text);
    indexLine = snippetOf(lineSliceAt(indexed, offset).text);
  }
  if (!binary) lineDiff = lineDiffSummary(fresh, indexed);

  ctx.stats.diff += 1;
  ctx.report({
    check: 'lib-sync',
    severity: 'error',
    type: 'lib-artifact-diff',
    file: rel,
    line,
    target: rel,
    resolved: rel,
    message:
      `lib 产物与全新编译不一致（逐字节比对，零归一化）：${rel} —— ` +
      `全新编译 ${fresh.length} 字节 vs 索引 ${indexed.length} 字节；` +
      `首个差异字节偏移 ${offset}（第 ${line} 行）；sha256 全新=${freshSha} 索引=${indexSha}。` +
      (binary ? '（二进制内容：只给偏移与哈希，不做行级 diff）' : ''),
    hint:
      offset >= 0
        ? `该行内容 —— 全新编译: ${freshLine} ／ 索引: ${indexLine}`
        : '两侧长度不同但公共前缀完全一致（一侧是另一侧的前缀）。',
    diff: {
      path: rel,
      binary,
      freshBytes: fresh.length,
      indexBytes: indexed.length,
      firstDiffOffset: offset,
      firstDiffLine: line,
      freshLine,
      indexLine,
      freshSha256: freshSha,
      indexSha256: indexSha,
      lineDiff,
    },
  });
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------

function severityCounts(ctx) {
  const counts = { error: 0, warning: 0 };
  for (const v of ctx.violations) counts[v.severity] = (counts[v.severity] || 0) + 1;
  return counts;
}

function totalMs(ctx) {
  return ctx.timing.indexMs + ctx.timing.prepareMs + ctx.timing.tscMs + ctx.timing.compareMs;
}

function printHuman(ctx) {
  const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
  const paint = (code, s) => (useColor ? `\u001b[${code}m${s}\u001b[0m` : s);
  const out = [];

  out.push(paint('1', `${TOOL} v${TOOL_VERSION} — 构建产物与源一致门禁（lib-sync）`));
  out.push(
    `判定基准: git 索引里的 ${LIB_DIR}/（git ls-files -s -- ${LIB_DIR} + git cat-file --batch / git show :<path>）——不是工作区当前内容`,
  );
  out.push(`比对方式: 产物逐字节比对，零归一化（normalizations: ${JSON.stringify(NORMALIZATIONS)}）`);
  out.push(`仓库根: ${ctx.root || '(未定位)'}`);
  if (ctx.bootstrapError) {
    out.push(paint('31', `引导失败: ${ctx.bootstrapError}`));
  } else {
    out.push(`索引基线: HEAD ${ctx.head || '(无提交)'} · 索引里 ${LIB_DIR}/ 文件数 ${ctx.libIndex.length}`);
    out.push(
      `全新编译: 产物 ${ctx.produced.length} 个 · 与索引同名比对 ${ctx.stats.compared} 个 · 逐字节相同 ${ctx.stats.identical} 个`,
    );
    out.push(
      `差异分类: 缺失 ${ctx.stats.missing} · 内容不一致 ${ctx.stats.diff} · 孤儿 ${ctx.stats.orphan} · 编译失败 ${ctx.stats.diagnostics} 条诊断`,
    );
    out.push(
      `索引内容读法: ${ctx.stats.batchRead ? 'git cat-file --batch（一次进程，逐条 git blob SHA-1 自校验）' : 'git show :<path> 逐文件回退'}` +
        (ctx.stats.batchReadError ? ` · 批量读不可用原因: ${ctx.stats.batchReadError}` : ''),
    );
    out.push(
      `源码物化: git 存储形式 · 用索引 blob ${ctx.stats.srcFromIndex.length} 个（工作区差异只由 CRLF→LF 解释） · 用工作区字节 ${ctx.stats.srcFromWorktree} 个（其中未跟踪/取不到索引 ${ctx.stats.srcNotInIndex} 个）`,
    );
    if (ctx.stats.srcFromIndex.length > 0) {
      const shown = ctx.stats.srcFromIndex.slice(0, 20);
      out.push(`  以下文件按索引 blob（LF）编译，而非工作区 CRLF 字节：`);
      for (const rel of shown) out.push(`    · ${rel}`);
      if (ctx.stats.srcFromIndex.length > shown.length) {
        out.push(`    · …（共 ${ctx.stats.srcFromIndex.length} 个，完整清单见 --json 的 sourceMaterialization.filesFromIndex）`);
      }
    }
    if (ctx.srcIndexBlobsError) out.push(paint('33', `  降级原因: ${ctx.srcIndexBlobsError}`));
    out.push(
      `临时工程: 系统 temp（os.tmpdir()）· 被检查仓库运行期只读 · tsconfig/package.json 字节拷贝 · package.json ${ctx.stats.packageJsonCopied ? '已复制' : '不存在（未复制）'} · ${ctx.stats.tempCleanup || '未创建'}`,
    );
    out.push(
      '说明: 「产物逐字节比对、零归一化」指的是比对阶段；上面的「源码物化」作用在编译器输入上，',
    );
    out.push(
      '      只把「恰好只差一次 CRLF→LF」的工作区源码换成 git 存储形式，逐文件回显，不静默、不掩盖真实差异。',
    );
  }
  out.push('');

  if (ctx.violations.length === 0) {
    out.push(paint('32', `✔ ${LIB_DIR}/ 索引内容与全新编译逐字节一致（零归一化）。`));
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
        const loc = `${v.file}:${v.line}${v.column ? `:${v.column}` : ''}`;
        out.push(`  ${tag} ${loc}  ->  ${v.target}`);
        out.push(`          [${v.type}] ${VIOLATION_TYPE_TITLES[v.type] || v.type}`);
        out.push(`          ${v.message}`);
        if (v.diff) {
          out.push(
            `          字节: 全新 ${v.diff.freshBytes} vs 索引 ${v.diff.indexBytes}` +
              ` · 首个差异偏移 ${v.diff.firstDiffOffset}（第 ${v.diff.firstDiffLine} 行）`,
          );
          out.push(`          行内容: 全新编译 ${v.diff.freshLine}`);
          out.push(`          行内容: 索引     ${v.diff.indexLine}`);
          out.push(`          sha256: 全新 ${v.diff.freshSha256} vs 索引 ${v.diff.indexSha256}`);
          if (v.diff.binary) out.push('          二进制内容：只给偏移与哈希，不做行级 diff。');
          else if (v.diff.lineDiff && v.diff.lineDiff.length > 0) {
            out.push('          行级 diff 摘要（前若干处）：');
            for (const d of v.diff.lineDiff) {
              out.push(`            L${d.line} - ${d.indexed === null ? '(索引无此行)' : d.indexed}`);
              out.push(`            L${d.line} + ${d.fresh === null ? '(全新编译无此行)' : d.fresh}`);
            }
          }
        }
        if (v.diagnostics && v.diagnostics.length > 0) {
          out.push(`          前 ${v.diagnostics.length} 条诊断：`);
          for (const d of v.diagnostics) out.push(`            ${d}`);
          if (v.diagnosticsTotal > v.diagnostics.length) {
            out.push(`            …（共 ${v.diagnosticsTotal} 条，此处只列前 ${v.diagnostics.length} 条）`);
          }
        }
        if (v.hint) out.push(`          ↳ ${v.hint}`);
      }
      out.push('');
    }
  }

  const counts = severityCounts(ctx);
  const summary = `${counts.error} error / ${counts.warning} warning`;
  out.push(counts.error > 0 ? paint('31', `✖ ${summary} —— 门禁未通过`) : paint('32', `✔ ${summary} —— 门禁通过`));

  const ms = totalMs(ctx);
  out.push(
    `耗时: 总 ${ms}ms（取索引 ${ctx.timing.indexMs}ms · 建临时工程 ${ctx.timing.prepareMs}ms · 编译 ${ctx.timing.tscMs}ms · 比对 ${ctx.timing.compareMs}ms）`,
  );
  if (ms > SLOW_MS) {
    out.push(
      `说明: 总耗时超过 ${SLOW_MS / 1000}s。构成见上 —— tsc 是单次全量编译，` +
        `比对阶段是 ${ctx.stats.compared} 次逐文件 \`git show\`（进程启动开销为主）。` +
        '这是本门禁为「以索引为基准、逐字节、零归一化」付出的成本，没有做并行/批量化。',
    );
  }

  process.stdout.write(`${out.join('\n')}\n`);
}

function printJson(ctx) {
  const counts = severityCounts(ctx);
  const payload = {
    tool: TOOL,
    toolVersion: TOOL_VERSION,
    root: ctx.root,
    ok: counts.error === 0,
    // 零归一化：产物比对阶段恒为空数组。任何对**比对结果**的归一化都必须显式出现在这里
    // + 脚本注释 + 人类报告里。注意「源码物化」不是比对归一化，单独在 sourceMaterialization 里说明。
    normalizations: NORMALIZATIONS,
    normalizationsNote:
      '产物比对为逐字节（Buffer.equals），零归一化。任何字节差异都会按 lib-artifact-diff 报出。',
    sourceMaterialization: {
      rule: 'git-canonical',
      description:
        `${SRC_DIR}/ 按 git 存储形式物化进临时工程：工作区文件与索引 blob 的差异若恰好只由 CRLF→LF 解释，则用索引 blob；其它情况一律用工作区字节。`,
      reason:
        'tsc 把模板字符串原文逐字节写进产物；core.autocrlf=true 的检出会把源码行尾换成 CRLF，' +
        '使同一份提交在 Windows 上产出的 lib/*.js 与索引里的 LF blob 出现与提交内容无关的差异。',
      scope: `只作用于 ${SRC_DIR}/ 下被 git 跟踪的普通文件；只做 CRLF→LF（孤立 CR 与 LF 原样保留）。`,
      whyNotMasking:
        '只在「差异恰好等于一次 CRLF→LF」时生效（真改了内容必然落到「用工作区字节」分支）；' +
        '选的是 git 的存储形式，即 CI 一次干净 checkout 会喂给 tsc 的那一份；产物比对仍是零归一化。',
      available: !ctx.srcIndexBlobsError,
      degradedReason: ctx.srcIndexBlobsError,
      filesFromIndex: ctx.stats.srcFromIndex,
      filesFromWorktree: ctx.stats.srcFromWorktree,
      filesNotInIndex: ctx.stats.srcNotInIndex,
    },
    baseline: {
      kind: 'git-index',
      description: `git ls-files -s -- ${LIB_DIR} / git cat-file --batch（或回退 git show :<path>）：索引内容，不是工作区当前内容`,
      head: ctx.head,
      libIndexFiles: ctx.libIndex.length,
      indexBytesReadMethod: ctx.stats.batchRead ? 'git-cat-file-batch' : 'git-show-per-file',
      batchReadError: ctx.stats.batchReadError,
    },
    compile: {
      method: 'temp-project',
      tempPrefix: TEMP_PREFIX,
      tempDir: ctx.tempDir,
      writesToRepo: false,
      tscEntry: 'node_modules/typescript/lib/tsc.js',
      tsconfigCopied: 'byte-copy',
      packageJsonCopied: ctx.stats.packageJsonCopied,
      srcCopied: 'git-canonical（工作区差异恰好只由 CRLF→LF 解释时用索引 blob）',
      nodeModulesLink: process.platform === 'win32' ? 'junction' : 'dir-symlink',
      tempCleanup: ctx.stats.tempCleanup,
    },
    summary: {
      errors: counts.error,
      warnings: counts.warning,
      libIndexFiles: ctx.libIndex.length,
      producedFiles: ctx.produced.length,
      comparedFiles: ctx.stats.compared,
      identicalFiles: ctx.stats.identical,
      missingFiles: ctx.stats.missing,
      diffFiles: ctx.stats.diff,
      orphanFiles: ctx.stats.orphan,
      compileDiagnostics: ctx.stats.diagnostics,
      indexStageConflicts: ctx.indexStageConflicts.length,
      durationMs: totalMs(ctx),
      timingMs: { ...ctx.timing },
      slow: totalMs(ctx) > SLOW_MS,
    },
    bootstrapError: ctx.bootstrapError,
    violations: ctx.violations.map((v) => ({
      check: v.check,
      severity: v.severity,
      type: v.type,
      typeTitle: VIOLATION_TYPE_TITLES[v.type] || v.type,
      file: v.file,
      line: v.line,
      column: v.column || null,
      target: v.target,
      resolved: v.resolved || null,
      message: v.message,
      hint: v.hint || null,
      diff: v.diff || null,
      diagnostics: v.diagnostics || null,
      diagnosticsTotal: v.diagnosticsTotal === undefined ? null : v.diagnosticsTotal,
    })),
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main(process.argv.slice(2));
