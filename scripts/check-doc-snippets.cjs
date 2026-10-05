#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/check-doc-snippets.cjs
 * 文档示例编译 / 一致性门禁（doc-snippet compile + consistency guard）
 * ---------------------------------------------------------------------------
 * 目的：拦住「README / 规范里写着的用法已经和实现不一致」这类漂移。
 *       把文档里**声称可直接使用**的代码块当成真实代码来编译，并核对文档里的
 *       数字与签名断言。路径引用类检查由 scripts/check-references.cjs 负责，
 *       本脚本不重复它的职责（不检查链接、不检查包字段）。
 *
 * 检查项：
 *   1. snippet-compile      —— 挑出「含 @promptmanager/code-normify import 语句的
 *                              ```ts / ```typescript 代码块」，还原成 .ts 文件，用仓库自带
 *                              的 typescript 以 --noEmit --strict 编译；paths 把包名映射到
 *                              <repo>/lib/types/*.d.ts。任一诊断 → error。
 *   2. required-options     —— 文档里出现的 createPromptManagerTools({...}) 调用必须包含
 *                              lib/types/service.d.ts > PromptManagerOptions 的全部必填项
 *                              （必填清单运行时解析，不硬编码）。已被编译覆盖的调用点不再重复报。
 *   3. tool-count           —— 文档里的「N 个工具 / N tools」断言必须等于运行时实际注册数
 *                              （数量由 import <repo>/lib/index.js 后调 createPromptManagerTools
 *                              数出来；read / write / 引擎目录 三个口径分别核对）。
 *   4. execute-signature    —— 散文里对 execute 签名的描述必须与 lib/types/tools.d.ts 的
 *                              NormifyTool.execute 形参一致（名字/顺序不符 → error；
 *                              只省略了尾部可选形参 → warning）。
 *
 * 设计约束：
 *   - Node 20+ / CommonJS / 零依赖，只用 node: 内置模块（CI 在 ubuntu-latest，本地在 Windows）。
 *   - 不拼 shell 命令（tsc 用 execFileSync + process.execPath 直接 exec），不用 Windows 专属路径拼接。
 *   - 只做高置信度检查；无法可靠判定的目标一律跳过并在报告里计数/给出原因，绝不静默吞掉。
 *   - 文档是并发编辑的对象：本脚本只读文档，全部中间产物写进 os.tmpdir()。
 *
 * 退出码：
 *   0  通过（或只有 warning）
 *   1  存在 error 级违规（含工具链不可用：挑到了要编译的块却跑不了 tsc 时宁可红也不要假绿）
 *   2  命令行用法错误（未知参数等）
 *
 * 用法：node scripts/check-doc-snippets.cjs [--json] [--root <dir>] [--keep-temp] [--help]
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');

const TOOL = 'check-doc-snippets';
const TOOL_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// 配置：扫描范围
// ---------------------------------------------------------------------------

/** 包名（文档 import 语句必须指向它才算「用法示例」）。 */
const PACKAGE_NAME = '@promptmanager/code-normify';

/** 固定扫描的文档（相对仓库根，posix 分隔符）。 */
const DOC_FILES = ['README.md', 'README_EN.md'];

/**
 * 额外的扫描范围。
 * 历史教训：原先只扫 README / README_EN / docs/RELEASE-*.md，于是
 * `docs/SPEC.zh-CN.md` 之外的新文档、以及 `skills/` 下的示例全都落在门禁之外——
 * 新增文档可以随意写「已过时/编不过」的用法示例而没人拦。
 * 现在按目录递归收集：
 *   · docs/ 下所有 *.md（含子目录）
 *   · skills/ 下所有文件（技能说明里的示例同样是「声称可直接使用」的用法）
 * glob（只支持 `*` / `?`，与 check-references.cjs 的约定一致）仍然保留，便于按需追加。
 */
const DOC_DIRS = ['docs', 'skills'];

/** 额外的文档 glob（相对仓库根；`**` 由扫描器按「目录递归」语义处理）。 */
const DOC_GLOBS = ['docs/RELEASE-*.md'];

/** 参与编译的语言标记；其余语言一律跳过（并计数）。 */
const COMPILABLE_LANGS = new Set(['ts', 'typescript']);

/** 「代码」语言标记：这类块里出现包 import/require 却没被编译时按 error 报告。 */
const CODE_LANGS = new Set(['js', 'javascript', 'mjs', 'cjs', 'ts', 'typescript', 'tsx', 'jsx']);

/**
 * 历史文体：RELEASE-*.md 记录的是「当时」的事实。
 * 只对它们做代码块编译，不做任何数字/签名断言——否则每次版本迭代都会把历史记录判红。
 * （与 check-references.cjs 对 CHANGELOG 的豁免理由同源。）
 */
const HISTORICAL_DOC = /^docs\/RELEASE-[^/]*\.md$/;

/** 检查项 id → 人类可读标题（报告分组用，顺序即输出顺序）。 */
const CHECK_TITLES = {
  'snippet-compile': '文档用法示例编译（```ts 块 → tsc --noEmit --strict）',
  'required-options': 'createPromptManagerTools 必填选项一致性',
  'tool-count': '工具数量断言一致性',
  'execute-signature': 'execute 签名描述一致性',
};

/** 类型声明的相对路径（与 package.json > exports 的 types 字段一致）。 */
const TYPE_FILES = {
  service: 'lib/types/service.d.ts',
  index: 'lib/types/index.d.ts',
  engineGlob: 'lib/types/engine/*.d.ts',
};

/** 运行时工具目录入口（数工具数量用）。 */
const RUNTIME_ENTRY = 'lib/index.js';

/** 探针用的数据目录名：实现要求 basename 形如 normify-<slug>，且只做校验、不落盘。 */
const PROBE_DATA_DIR = 'normify-doc-guard-probe';

/** 生成的 tsconfig 里与仓库 tsconfig.json 对齐的编译选项。 */
const TSC_COMPILER_OPTIONS = {
  target: 'ES2022',
  module: 'ESNext',
  moduleResolution: 'Bundler',
  lib: ['ES2022'],
};

// ---------------------------------------------------------------------------
// 配置：显式豁免清单（每次运行都会回显，包含「未命中」的过期条目）
// ---------------------------------------------------------------------------
/**
 * 为什么需要豁免清单：个别块确实无法独立编译（例如历史版本说明里的示例对应当时的 API），
 * 这类块应当显式登记并写明理由，而不是让门禁长期变红或悄悄放宽检查规则。
 *
 * 字段：
 *   file      被豁免的文档（相对仓库根，posix；支持 `*` 通配，如 `docs/RELEASE-*.md`）
 *   contains  块标识：命中的「违规主体文本」（编译违规 = 代码块全文；其余检查 = 出问题的源码行/调用文本）
 *             必须包含该子串。省略则匹配该文件的所有同类违规。
 *   kind      可选，限定检查项：'snippet-compile' | 'required-options' | 'tool-count' | 'execute-signature'
 *   reason    豁免理由（必填；运行报告与 --json 都会输出）
 *
 * 目前为空：现有文档没有需要豁免的块。新增条目必须带 reason，且每次运行会回显命中次数。
 */
const SNIPPET_ALLOWLIST = [];

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

/** 把仓库相对 posix 路径落到当前操作系统的绝对路径（path.join 负责分隔符转换）。 */
const absOf = (root, rel) => path.join(root, ...rel.split('/'));

/** tsconfig 里写路径用 posix 分隔符（Windows 反斜杠在 JSON/tsc 里都要转义，统一成正斜杠）。 */
const posixAbs = (p) => path.resolve(p).split(path.sep).join('/');

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}

function listFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/** 递归收集一个目录下所有匹配的文件（相对仓库根 posix 路径）。目录不存在时返回空列表。 */
function listFilesRecursive(root, dirRel, keep, out = []) {
  for (const entry of listFiles(absOf(root, dirRel))) {
    const rel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      // 跳过依赖目录与隐藏目录：它们不是「文档」，递归进去只会浪费时间和误报。
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      listFilesRecursive(root, rel, keep, out);
      continue;
    }
    if (entry.isFile() && keep(rel, entry.name)) out.push(rel);
  }
  return out;
}

/** 建立 offset → {line, column} 的换算表（1-based，与 check-references.cjs 一致）。 */
function makeLineIndex(text) {
  const offsets = [0];
  for (let i = 0; i < text.length; i += 1) if (text[i] === '\n') offsets.push(i + 1);
  return (index) => {
    let lo = 0;
    let hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, column: index - offsets[lo] + 1 };
  };
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n运行 \`node scripts/check-doc-snippets.cjs --help\` 查看用法。\n`);
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
    // 仓库根都定位不到：宁可红也不要假绿。
    ctx.report({
      check: 'snippet-compile',
      severity: 'error',
      type: 'guard-unavailable',
      file: '.',
      line: 1,
      target: '.',
      subject: '',
      message: ctx.bootstrapError,
      hint: '用 --root <dir> 指定被检查的仓库根。',
    });
  } else {
    try {
      collectDocs(ctx);
      checkDocSnippets(ctx);
      checkRequiredOptions(ctx);
      await loadRuntimeCounts(ctx);
      checkToolCounts(ctx);
      checkExecuteSignature(ctx);
      checkStaleAllowlist(ctx);
    } catch (err) {
      // 门禁自身出错时宁可红：带堆栈的 error，而不是静默半途而废。
      ctx.report({
        check: 'snippet-compile',
        severity: 'error',
        type: 'guard-internal-error',
        file: 'scripts/check-doc-snippets.cjs',
        line: 1,
        target: 'internal',
        subject: '',
        message: `门禁内部错误：${err && err.message ? err.message : String(err)}`,
        hint: err && err.stack ? err.stack.split('\n').slice(0, 4).join(' | ') : null,
      });
    }
  }

  cleanup(ctx, opts);

  if (opts.json) printJson(ctx);
  else printHuman(ctx);

  process.exitCode = ctx.violations.some((v) => v.severity === 'error') ? 1 : 0;
}

function parseArgs(argv) {
  const opts = { json: false, help: false, root: null, keepTemp: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--json') opts.json = true;
    else if (arg === '--help' || arg === '-h') opts.help = true;
    else if (arg === '--keep-temp') opts.keepTemp = true;
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
    `${TOOL} v${TOOL_VERSION} — 文档示例编译 / 一致性门禁`,
    '',
    '用法：',
    '  node scripts/check-doc-snippets.cjs [选项]',
    '',
    '选项：',
    '  --json          只向 stdout 输出机器可读 JSON',
    '  --root <dir>    指定被检查的仓库根（默认：本脚本所在仓库的 git 顶层目录）',
    '  --keep-temp     保留生成的临时目录（含还原出的 .ts 与 tsconfig.json），便于排查误报',
    '  -h, --help      打印本帮助',
    '',
    '退出码：',
    '  0  无 error（可能有 warning）',
    '  1  存在 error 级违规，或挑到了要编译的块却跑不了 tsc（宁可红也不要假绿）',
    '  2  命令行用法错误',
    '',
    '检查项：',
    `  1. 文档用法示例编译 —— 扫描 ${DOC_FILES.join(' / ')}、${DOC_DIRS.map((d) => `${d}/**`).join(' / ')}`,
    `     与 ${DOC_GLOBS.join(' / ')} 里的围栏代码块，`,
    `     只挑「语言标记为 ts/typescript 且含 ${PACKAGE_NAME} import / require 语句」的块，`,
    '     逐块还原成 <tmp>/snippets/snippet-NN.ts，用仓库自带 typescript：',
    '       node <repo>/node_modules/typescript/bin/tsc -p <tmp>/tsconfig.json --pretty false',
    '     编译选项 --noEmit --strict（target ES2022 / module ESNext / moduleResolution Bundler），',
    '     并用 paths 映射包名：',
    `       ${PACKAGE_NAME}          -> <repo>/${TYPE_FILES.index}`,
    `       ${PACKAGE_NAME}/service  -> <repo>/${TYPE_FILES.service}`,
    `       ${PACKAGE_NAME}/engine/* -> <repo>/${TYPE_FILES.engineGlob}`,
    '     诊断按「文档路径:块起始行号 + tsc 错误码与消息」逐条报出；任一 error → 退出码 1。',
    '  2. 必填选项一致性 —— 文档里所有 createPromptManagerTools({...}) 调用点必须包含',
    `     <repo>/${TYPE_FILES.service} > PromptManagerOptions 的全部必填项（运行时解析，不硬编码）。`,
    '     已被第 1 项编译覆盖的调用点由 tsc 权威判定，不重复报。',
    '  3. 工具数量一致性 —— 文档里的「N 个工具 / N tools / exposes all N」断言必须等于运行时实际数量，',
    `     取数方式：import <repo>/${RUNTIME_ENTRY} 后调 createPromptManagerTools({ access }) 与`,
    '     createNormifyTools(...) 数数组长度（write / read / 引擎目录 三个口径分别核对）。',
    '     取不到运行时数量（lib/ 未 build、入口不导出工厂、调用失败）→ **error**（原为 warning）。',
    `     ${HISTORICAL_DOC.source} 这类历史文体只编译、不做数字断言。`,
    '  4. execute 签名一致性 —— 散文里 `execute(...)` 的形参名/顺序必须与',
    `     <repo>/lib/types/tools.d.ts 的 NormifyTool.execute 一致（错名/错序 → error；`,
    '     只省略了尾部可选形参 → warning）。代码块内的真实调用不参与该项，避免误判。',
    '',
    '跳过规则（报告里会逐类计数，不会静默吞掉）：',
    '  · 语言标记不是 ts/typescript 的块；· 没有包 import/require 语句的块（散文片段 / 伪代码）；',
    '  · 代码语言且含包 import/require 但未被编译的块 → **error**（新增示例不许悄悄漏检，原为 warning）；',
    '  · 找不到的文档文件；· 历史文体里的数字断言。',
    '',
    `豁免清单：脚本内 SNIPPET_ALLOWLIST（当前 ${SNIPPET_ALLOWLIST.length} 条），每次运行回显命中情况，`,
    '未命中的条目按 warning 报出（防止过期豁免长期掩盖真残留）。',
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

function createContext(opts) {
  const ctx = {
    root: null,
    bootstrapError: null,
    docs: [], // { rel, text, lineAt, blocks }
    blocks: [], // 全部围栏块 { rel, index, lang, startLine, endLine, content }
    snippets: [], // 参与编译的块 { rel, index, startLine, endLine, content, imports, snippet, snippetPath }
    diagnostics: [],
    runtime: { status: 'skipped', reason: null, write: null, read: null, engine: null },
    tsc: { path: null, version: null, source: null, tsconfigPath: null, tempDir: null },
    violations: [],
    suppressed: [],
    skipped: [],
    stats: { blocksTotal: 0, blocksCompiled: 0, skippedByReason: {}, docsMissing: 0, countClaims: 0, executeClaims: 0, callSites: 0, allowlistHits: 0 },
    dedupe: new Set(),
  };

  ctx.report = (v) => {
    const key = v.dedupeKey || `${v.file}:${v.line}:${v.check}:${v.type}:${v.target}`;
    if (ctx.dedupe.has(key)) return;
    ctx.dedupe.add(key);
    delete v.dedupeKey;
    const allow = matchAllowlist(v.file, v.check, v.subject);
    if (allow) {
      ctx.stats.allowlistHits += 1;
      ctx.suppressed.push({ check: v.check, type: v.type, file: v.file, line: v.line, target: v.target, message: v.message, allowlistReason: allow.reason });
      return;
    }
    ctx.violations.push(v);
  };

  ctx.skip = (rel, line, reason, detail) => {
    ctx.stats.skippedByReason[reason] = (ctx.stats.skippedByReason[reason] || 0) + 1;
    ctx.skipped.push({ file: rel, line, reason, detail: detail || null });
  };

  ctx.root = resolveRoot(opts.root);
  if (!ctx.root) {
    ctx.bootstrapError = `无法定位仓库根目录（cwd=${process.cwd()}，--root 未指定且 git rev-parse --show-toplevel 失败）`;
  }
  return ctx;
}

function matchAllowlist(file, kind, subject) {
  for (const entry of SNIPPET_ALLOWLIST) {
    if (!entry.reason) continue; // 无理由的豁免条目不会被采用（见 printHuman 的提示）
    if (!globToRegExp(entry.file).test(file)) continue;
    if (entry.kind && entry.kind !== kind) continue;
    if (entry.contains && !String(subject || '').includes(entry.contains)) continue;
    entry.__hits = (entry.__hits || 0) + 1;
    return entry;
  }
  return null;
}

function checkStaleAllowlist(ctx) {
  for (const entry of SNIPPET_ALLOWLIST) {
    if (!entry.reason) {
      ctx.report({
        check: 'snippet-compile',
        severity: 'error',
        type: 'allowlist-entry-without-reason',
        file: 'scripts/check-doc-snippets.cjs',
        line: 1,
        target: entry.file || '(no file)',
        subject: '',
        message: `豁免清单条目缺少 reason：${JSON.stringify({ file: entry.file, contains: entry.contains })}`,
        hint: '豁免必须写明理由，否则等于静默放宽门禁。',
      });
      continue;
    }
    if (!entry.__hits) {
      ctx.report({
        check: 'snippet-compile',
        severity: 'warning',
        type: 'stale-allowlist-entry',
        file: entry.file,
        line: 1,
        target: entry.contains || '*',
        subject: '',
        message: `豁免清单条目本次未命中任何违规（可能已过期或有拼写错误）：${entry.file} :: ${entry.contains || '*'}`,
        hint: '确认该块已修复后删除该条目，避免豁免长期掩盖真残留。',
      });
    }
  }
}

function resolveRoot(explicit) {
  if (explicit) {
    const abs = path.resolve(process.cwd(), explicit);
    return fs.existsSync(abs) ? abs : null;
  }
  try {
    const out = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: __dirname,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (out) return path.resolve(out);
  } catch {
    /* 落到下面的兜底 */
  }
  const fallback = path.resolve(__dirname, '..');
  return fs.existsSync(fallback) ? fallback : null;
}

function cleanup(ctx, opts) {
  if (!ctx.tsc.tempDir) return;
  if (opts.keepTemp) {
    ctx.tsc.tempDirKept = true;
    return;
  }
  try {
    fs.rmSync(ctx.tsc.tempDir, { recursive: true, force: true });
  } catch {
    /* 清理失败不影响门禁结论 */
  }
  ctx.tsc.tempDirKept = false;
}

// ---------------------------------------------------------------------------
// 文档收集与围栏解析
// ---------------------------------------------------------------------------

function collectDocs(ctx) {
  const rels = [...DOC_FILES];
  // 目录递归：docs/ 与 skills/ 下的所有 .md（覆盖历史上完全没被扫描的文档与技能说明）。
  for (const dirRel of DOC_DIRS) {
    for (const rel of listFilesRecursive(ctx.root, dirRel, (r) => /\.md$/i.test(r))) rels.push(rel);
  }
  // 显式 glob（`docs/RELEASE-*.md` 之类），与目录递归取并集。
  for (const glob of DOC_GLOBS) {
    const dirRel = path.posix.dirname(glob);
    const re = globToRegExp(path.posix.basename(glob));
    const prefix = glob.startsWith('**/') ? '' : dirRel;
    for (const entry of listFiles(absOf(ctx.root, prefix))) {
      if (!entry.isFile()) continue;
      if (re.test(entry.name)) rels.push(prefix ? path.posix.join(prefix, entry.name) : entry.name);
    }
  }

  for (const rel of [...new Set(rels)].sort()) {
    const abs = absOf(ctx.root, rel);
    if (!fs.existsSync(abs)) {
      ctx.stats.docsMissing += 1;
      ctx.skip(rel, 1, 'missing-file', '文档不存在，未扫描');
      continue;
    }
    let text;
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch (err) {
      ctx.stats.docsMissing += 1;
      ctx.skip(rel, 1, 'unreadable-file', err.message);
      continue;
    }
    // 剥掉 UTF-8 BOM：否则首行内容会带 U+FEFF，围栏/标题解析在边界上会出错。
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const doc = { rel, text, lineAt: makeLineIndex(text), blocks: extractFences(text) };
    for (let i = 0; i < doc.blocks.length; i += 1) {
      doc.blocks[i].index = i;
      doc.blocks[i].rel = rel; // 供诊断归属到具体的块
    }
    ctx.docs.push(doc);
    ctx.stats.blocksTotal += doc.blocks.length;
    ctx.blocks.push(...doc.blocks);
  }
}

/**
 * 解析 Markdown 围栏代码块。要点：
 *   - 兼容 ``` 与 ~~~、兼容 ```` 这类更长围栏（块内出现的短围栏按内容处理）；
 *   - 兼容 CRLF（split(/\r?\n/)）；围栏行缩进最多 3 空格（CommonMark）；
 *   - startLine / endLine 是**内容**的 1-based 行号（不含围栏行）。
 */
function extractFences(text) {
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let open = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (m) {
      if (open === null) {
        open = { ch: m[1][0], len: m[1].length, fenceLine: i + 1, info: m[2].trim(), lines: [] };
        continue;
      }
      const isClose = m[1][0] === open.ch && m[1].length >= open.len && m[2].trim() === '';
      if (isClose) {
        blocks.push(makeBlock(open, i + 1, false));
        open = null;
        continue;
      }
      // 非闭合的长短围栏（例如 ````markdown 里的 ```ts）按内容处理
    }
    if (open !== null) open.lines.push(line);
  }
  if (open !== null) blocks.push(makeBlock(open, lines.length + 1, true));
  return blocks;
}

function makeBlock(open, closeFenceLine, unterminated) {
  const info = open.info;
  const lang = (info.split(/\s+/)[0] || '').toLowerCase();
  return {
    lang,
    info,
    startLine: open.fenceLine + 1,
    endLine: closeFenceLine - 1,
    unterminated: Boolean(unterminated),
    content: open.lines.join('\n'),
    lines: open.lines,
  };
}

/**
 * 抽取代码块里的字符串字面量及其 1-based 行号，同时把注释内容与字符串**内容**掩成空格。
 * 这样后续的 import/require 识别既能拿到真实说明符，又不会被注释里的假示例骗到
 * （`// import x from '@promptmanager/code-normify'` 不是一个真的用法示例）。
 * 保留两端的引号字符，方便正则确认「说明符确实在引号里」。
 * 返回 { masked, strings:[{ value, line, start, end, kind }] }
 *   start/end = 字符串内容在 masked 里的 [起始, 结束) 偏移；kind: 'require' | 'other'。
 */
function maskCommentsAndStrings(content) {
  const out = content.split('');
  const strings = [];
  const blank = (from, to) => {
    for (let i = from; i < to; i += 1) if (out[i] !== '\n' && out[i] !== '\r') out[i] = ' ';
  };
  const lineAt = (index) => content.slice(0, index).split('\n').length;
  const n = content.length;
  let i = 0;

  while (i < n) {
    const ch = content[i];
    const next = content[i + 1];
    if (ch === '/' && next === '/') {
      let j = i + 2;
      while (j < n && content[j] !== '\n') j += 1;
      blank(i, j);
      i = j;
      continue;
    }
    if (ch === '/' && next === '*') {
      const end = content.indexOf('*/', i + 2);
      const stop = end === -1 ? n : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      let j = i + 1;
      let value = '';
      while (j < n) {
        if (content[j] === '\\') {
          value += content[j + 1] || '';
          j += 2;
          continue;
        }
        if (content[j] === quote) break;
        value += content[j];
        j += 1;
      }
      const before = content.slice(Math.max(0, i - 24), i);
      const kind = /\brequire\s*\(\s*$/.test(before) ? 'require' : 'other';
      // start 指向开引号本身，end 指向闭引号本身（或内容末尾）：
      // 掩码只把「内容」换成空格、保留引号，所以这两个偏移在掩码里同样有效。
      strings.push({ value, line: lineAt(i), start: i, end: Math.min(j, n), kind });
      blank(i + 1, Math.min(j, n)); // 只掩内容，保留引号
      i = Math.min(j, n - 1) + 1;
      continue;
    }
    i += 1;
  }
  return { masked: out.join(''), strings };
}

/**
 * 在代码块里找「包用法示例」——静态 import / export-from / 副作用导入，以及 CommonJS `require(...)`。
 * 覆盖点（都是历史缺口或已修的误报）：
 *   · `require('@promptmanager/code-normify/service')` 现在也算用法示例
 *     （原先只认 import，require 写法的示例会悄悄漏检）；
 *   · 支持跨行写法（`import {` 换行 `} from '@…'`）；
 *   · **注释里的示例不算**（同一套掩码同时挡住 `// import …` 与块注释）。
 * 实现：先掩码，再用正则定位「引号开始的位置」，最后回查该位置属于哪个字符串字面量。
 * 返回值按出现顺序排列，元素带 1-based 行号（相对代码块内容）。
 */
function findPackageImports(content) {
  const { masked, strings } = maskCommentsAndStrings(content);
  const byStart = new Map(strings.map((s) => [s.start, s]));
  const out = [];
  const seen = new Set();

  const consider = (spec, line, fromRequire) => {
    void fromRequire;
    if (spec !== PACKAGE_NAME && !spec.startsWith(`${PACKAGE_NAME}/`)) return;
    const key = `${line}:${spec}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ line, specifier: spec });
  };

  // 1) require('…') —— 掩码里 require 关键字与引号都还在，字符串内容已变空格。
  const requireRe = /\brequire\s*\(\s*(?=['"])/g;
  let rm;
  while ((rm = requireRe.exec(masked)) !== null) {
    let j = rm.index + rm[0].length;
    while (j < masked.length && /\s/.test(masked[j])) j += 1;
    const s = byStart.get(j);
    if (s) consider(s.value, s.line, true);
  }

  // 2) import / export … from '…'（包括跨行），以及副作用导入 import '…'。
  const importRe = /\b(?:import|export)\b[\s\S]{0,400}?\bfrom\s*(?=['"])|(?:^|[\s;{}(])import\s*(?=['"])/gm;
  let im;
  while ((im = importRe.exec(masked)) !== null) {
    let j = im.index + im[0].length;
    while (j < masked.length && /\s/.test(masked[j])) j += 1;
    const s = byStart.get(j);
    if (s) consider(s.value, s.line, false);
  }

  out.sort((a, b) => a.line - b.line);
  return out;
}

// ---------------------------------------------------------------------------
// 检查 1：文档用法示例编译
// ---------------------------------------------------------------------------

function checkDocSnippets(ctx) {
  for (const doc of ctx.docs) {
    for (const block of doc.blocks) {
      const imports = findPackageImports(block.content);
      const isCompilableLang = COMPILABLE_LANGS.has(block.lang);

      if (!isCompilableLang) {
        if (CODE_LANGS.has(block.lang) && imports.length > 0) {
          // error（原为 warning）：「文档里声称可用的用法示例没有被任何门禁覆盖」是实打实的漏检面，
          // 不是环境问题。降级成 warning 的后果已经出现过：新增示例只要把语言标记写成 js，
          // 就永远编译不到，而门禁照样绿。要放行必须走 SNIPPET_ALLOWLIST 显式登记。
          ctx.report({
            check: 'snippet-compile',
            severity: 'error',
            type: 'uncompiled-package-example',
            file: doc.rel,
            line: block.startLine,
            target: block.lang,
            subject: block.content,
            message: `代码块（语言标记 \`${block.lang}\`）引用了 ${PACKAGE_NAME}，但只有 ts/typescript 块会被编译，本示例未纳入门禁。`,
            hint: '把语言标记改成 ts/typescript（或确认它只是运行片段并走 SNIPPET_ALLOWLIST 显式豁免），否则新增示例会悄悄漏检。',
          });
          ctx.skip(doc.rel, block.startLine, 'code-lang-not-compiled', `语言标记 ${block.lang}`);
        } else {
          ctx.skip(doc.rel, block.startLine, 'non-code-language', `语言标记 ${block.lang || '(无)'}`);
        }
        continue;
      }

      if (imports.length === 0) {
        ctx.skip(doc.rel, block.startLine, 'no-package-import', 'ts 块但没有包 import 语句（散文片段 / 类型形状说明）');
        continue;
      }

      ctx.snippets.push({
        rel: doc.rel,
        index: block.index,
        startLine: block.startLine,
        endLine: block.endLine,
        lang: block.lang,
        content: block.content,
        imports,
        snippet: null,
        snippetPath: null,
      });
    }
  }

  const total = ctx.snippets.length;
  if (total === 0) {
    ctx.skipped.push({ file: '(all)', line: null, reason: 'no-usage-example', detail: '未发现可编译的用法示例，编译检查无事可做' });
    return;
  }

  ctx.stats.blocksCompiled = total;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'code-normify-doc-snippets-'));
  ctx.tsc.tempDir = tmpDir;

  const snippetDir = path.join(tmpDir, 'snippets');
  fs.mkdirSync(snippetDir, { recursive: true });
  ctx.snippets.forEach((s, i) => {
    s.snippet = `snippet-${String(i + 1).padStart(2, '0')}.ts`;
    s.snippetPath = path.join(snippetDir, s.snippet);
    fs.writeFileSync(s.snippetPath, `${s.content}\n`, 'utf8');
  });

  const typeState = typeFilesState(ctx);
  const tsconfigPath = path.join(tmpDir, 'tsconfig.json');
  ctx.tsc.tsconfigPath = tsconfigPath;
  fs.writeFileSync(tsconfigPath, `${JSON.stringify(buildTsconfig(ctx, typeState), null, 2)}\n`, 'utf8');

  const tsc = resolveTsc(ctx.root);
  ctx.tsc.path = tsc.path;
  ctx.tsc.source = tsc.source;
  if (!tsc.path) {
    ctx.report({
      check: 'snippet-compile',
      severity: 'error',
      type: 'guard-unavailable',
      file: '.',
      line: 1,
      target: 'typescript',
      subject: '',
      message: `找到 ${total} 个需要编译的文档示例，但定位不到 typescript（找过 <repo>/node_modules/typescript/bin/tsc、脚本自身仓库与 require.resolve）。`,
      hint: '先 `npm ci` / `npm install` 安装 devDependencies。',
    });
    return;
  }
  ctx.tsc.version = readTscVersion(ctx.tsc.path);
  if (typeState.missing.length > 0) {
    // 类型声明缺失时 tsc 会把所有包 import 报成 TS2307，那是环境问题而不是文档漂移：显式判红。
    ctx.report({
      check: 'snippet-compile',
      severity: 'error',
      type: 'guard-unavailable',
      file: '.',
      line: 1,
      target: typeState.missing.join(', '),
      subject: '',
      message: `paths 映射指向的类型声明不存在：${typeState.missing.join('、')}。`,
      hint: '先 `npm run build` 生成 lib/types（CI 的 Build 步骤已满足）。',
    });
    return;
  }
  if (!typeState.hasNodeTypes) {
    ctx.report({
      check: 'snippet-compile',
      severity: 'warning',
      type: 'node-types-unavailable',
      file: '.',
      line: 1,
      target: '@types/node',
      subject: '',
      message: '找不到 @types/node，示例里的 `node:*` import 可能被报成 TS2307（环境问题）。',
      hint: '安装 devDependencies（@types/node）后重跑。',
    });
  }

  const run = runTsc(ctx.tsc.path, tsconfigPath, tmpDir);
  const parsed = parseDiagnostics(run.output);
  let errors = 0;
  for (const diag of parsed.diagnostics) {
    const snippet = ctx.snippets.find((s) => path.basename(diag.file) === s.snippet);
    const line = snippet ? snippet.startLine + Math.max(0, diag.line - 1) : 1;
    // 环境缺 @types/node 时 `node:*` 会报 TS2307：那是环境问题，不该把文档判红（已在上面发 warning）。
    const nodeBuiltinUnresolved = !typeState.hasNodeTypes && (diag.code === 2307 || diag.code === 7016) && /['"]node:[^'"]+['"]/.test(diag.message);
    if (diag.severity !== 'error' || nodeBuiltinUnresolved) {
      ctx.report({
        check: 'snippet-compile',
        severity: 'warning',
        type: nodeBuiltinUnresolved ? 'node-types-unavailable' : 'tsc-diagnostic',
        file: snippet ? snippet.rel : diag.file,
        line,
        column: snippet ? diag.column : null,
        target: `TS${diag.code}`,
        subject: snippet ? snippet.content : diag.file,
        message: nodeBuiltinUnresolved
          ? `${snippet ? `文档示例（块起始行 ${snippet.startLine}）` : 'tsc'} 的 node:* import 无法解析（TS${diag.code} ${diag.message}）——本机缺 @types/node，按环境问题记 warning。`
          : `${snippet ? `文档示例（块起始行 ${snippet.startLine}）` : 'tsc'} 产生 ${diag.severity} TS${diag.code}：${diag.message}`,
        hint: nodeBuiltinUnresolved
          ? '安装 devDependencies（@types/node）后重跑即可恢复为硬检查。'
          : snippet
            ? `还原出的文件：${snippet.snippet}（--keep-temp 可保留现场）`
            : null,
      });
      continue;
    }
    errors += 1;
    ctx.report({
      check: 'snippet-compile',
      severity: 'error',
      type: diag.code === 2307 || diag.code === 7016 ? 'unresolved-import' : 'tsc-error',
      file: snippet ? snippet.rel : diag.file,
      line,
      column: snippet ? diag.column : null,
      target: `TS${diag.code}`,
      subject: snippet ? snippet.content : diag.file,
      message: snippet
        ? `文档示例编译失败（块起始行 ${snippet.startLine}，${snippet.lang}）：TS${diag.code} ${diag.message}`
        : `tsc 报出无法归属到文档块的错误：TS${diag.code} ${diag.message}`,
      hint: snippet
        ? `该块的 import：${snippet.imports.map((im) => im.specifier).join('、')}；还原出的文件：${snippet.snippet}`
        : '通常是 tsconfig 或类型声明有问题；--keep-temp 可保留临时目录。',
    });
  }

  // tsc 非 0 退出但一条诊断都没解析出来：不能当成通过。
  if (errors === 0 && run.status !== 0) {
    ctx.report({
      check: 'snippet-compile',
      severity: 'error',
      type: 'guard-unavailable',
      file: '.',
      line: 1,
      target: 'tsc',
      subject: '',
      message: `tsc 退出码 ${run.status} 但没有可解析的诊断，无法判断文档示例是否可编译。`,
      hint: run.output ? `原始输出：${run.output.slice(0, 800)}` : 'tsc 无任何输出。',
    });
  }
}

function typeFilesState(ctx) {
  const missing = [];
  const check = (rel) => {
    if (!fs.existsSync(absOf(ctx.root, rel))) missing.push(rel);
  };
  check(TYPE_FILES.service);
  check(TYPE_FILES.index);
  const engineDir = absOf(ctx.root, path.posix.dirname(TYPE_FILES.engineGlob));
  const engineFiles = listFiles(engineDir).filter((e) => e.isFile() && e.name.endsWith('.d.ts'));
  if (engineFiles.length === 0) missing.push(TYPE_FILES.engineGlob);

  const typeRootCandidates = [path.join(ctx.root, 'node_modules', '@types'), path.join(__dirname, '..', 'node_modules', '@types')];
  const typeRoots = typeRootCandidates.filter((dir) => fs.existsSync(dir));
  return { missing, typeRoots, hasNodeTypes: typeRoots.some((dir) => fs.existsSync(path.join(dir, 'node'))) };
}

function buildTsconfig(ctx, typeState) {
  const compilerOptions = {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    ...TSC_COMPILER_OPTIONS,
    baseUrl: '.',
    forceConsistentCasingInFileNames: true,
    esModuleInterop: true,
    paths: {
      [PACKAGE_NAME]: [posixAbs(absOf(ctx.root, TYPE_FILES.index))],
      [`${PACKAGE_NAME}/service`]: [posixAbs(absOf(ctx.root, TYPE_FILES.service))],
      [`${PACKAGE_NAME}/engine/*`]: [posixAbs(absOf(ctx.root, TYPE_FILES.engineGlob))],
    },
  };
  if (typeState.hasNodeTypes) {
    compilerOptions.types = ['node'];
    compilerOptions.typeRoots = typeState.typeRoots.map(posixAbs);
  } else {
    // 显式空数组：避免继承「机器上某层 node_modules/@types」的隐式全局类型，
    // 否则同一份文档在开发机与 CI 上的编译结果可能不同。
    compilerOptions.types = [];
  }
  return { compilerOptions, include: ['snippets/**/*.ts'] };
}

/** 定位 tsc：优先被检查仓库自带的 typescript，其次脚本自身仓库，最后 require.resolve。 */
function resolveTsc(root) {
  const candidates = [
    { file: path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), source: '<repo>/node_modules/typescript' },
    { file: path.join(__dirname, '..', 'node_modules', 'typescript', 'bin', 'tsc'), source: '<script>/node_modules/typescript' },
  ];
  for (const c of candidates) if (fs.existsSync(c.file)) return { path: c.file, source: c.source };
  try {
    const resolved = require.resolve('typescript');
    const file = path.join(path.dirname(path.dirname(resolved)), 'bin', 'tsc');
    if (fs.existsSync(file)) return { path: file, source: 'require.resolve("typescript")' };
  } catch {
    /* 落空 */
  }
  return { path: null, source: null };
}

function readTscVersion(tscPath) {
  try {
    return execFileSync(process.execPath, [tscPath, '--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

function runTsc(tscPath, tsconfigPath, cwd) {
  const env = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' };
  try {
    const stdout = execFileSync(process.execPath, [tscPath, '-p', tsconfigPath, '--pretty', 'false'], {
      cwd,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { status: 0, output: stdout };
  } catch (err) {
    const stdout = typeof err.stdout === 'string' ? err.stdout : '';
    const stderr = typeof err.stderr === 'string' ? err.stderr : '';
    const status = typeof err.status === 'number' ? err.status : -1;
    const extra = status === -1 && err.message ? `${err.message}\n` : '';
    return { status, output: `${extra}${stdout}${stderr}` };
  }
}

const DIAG_RE = /^(.+?)\((\d+),(\d+)\):\s+(error|warning|suggestion)\s+TS(\d+):\s*(.*)$/;
const GLOBAL_DIAG_RE = /^(error|warning|suggestion)\s+TS(\d+):\s*(.*)$/;

function parseDiagnostics(output) {
  const diagnostics = [];
  for (const rawLine of output.split(/\r?\n/)) {
    if (!rawLine.trim()) continue;
    const m = DIAG_RE.exec(rawLine);
    if (m) {
      diagnostics.push({ file: m[1], line: Number(m[2]), column: Number(m[3]), severity: m[4], code: Number(m[5]), message: m[6].trim() });
      continue;
    }
    const g = GLOBAL_DIAG_RE.exec(rawLine.trim());
    if (g) {
      diagnostics.push({ file: '(tsc)', line: 1, column: 1, severity: g[1], code: Number(g[2]), message: g[3].trim() });
      continue;
    }
    if (diagnostics.length > 0 && /^\s+\S/.test(rawLine)) {
      // 多行诊断的续行：并入上一条消息，避免丢失关键信息
      const last = diagnostics[diagnostics.length - 1];
      last.message = `${last.message} ${rawLine.trim()}`.trim();
    }
  }
  return { diagnostics };
}

// ---------------------------------------------------------------------------
// 检查 2：createPromptManagerTools 必填选项
// ---------------------------------------------------------------------------

/** 解析 d.ts 里某个 interface 的成员（必填 / 可选）。 */
function parseInterfaceProps(text, name) {
  const decl = new RegExp(`interface\\s+${name}\\s*\\{`).exec(text);
  if (!decl) return null;
  const body = sliceBalanced(text, decl.index + decl[0].length - 1, '{', '}');
  if (body === null) return null;
  const required = [];
  const optional = [];
  const memberRe = /(?:^|[;\n])\s*([A-Za-z_$][\w$]*)\s*(\?)?\s*:/g;
  let m;
  while ((m = memberRe.exec(body)) !== null) {
    (m[2] ? optional : required).push(m[1]);
  }
  return { required, optional };
}

/** 从 openIndex（指向 open 字符）起做括号配对，返回括号内的原文。 */
function sliceBalanced(text, openIndex, open, close) {
  if (text[openIndex] !== open) return null;
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      i = skipString(text, i) - 1;
      continue;
    }
    if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      if (nl === -1) break;
      i = nl;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end === -1) break;
      i = end + 1;
      continue;
    }
    if (ch === open) depth += 1;
    else if (ch === close) {
      depth -= 1;
      if (depth === 0) return text.slice(openIndex + 1, i);
    }
  }
  return null;
}

/** 跳过字符串字面量，返回结束引号之后的下标。 */
function skipString(text, start) {
  const quote = text[start];
  for (let i = start + 1; i < text.length; i += 1) {
    if (text[i] === '\\') {
      i += 1;
      continue;
    }
    if (text[i] === quote) return i + 1;
    if (quote !== '`' && text[i] === '\n') return i; // 未闭合的单行字符串
  }
  return text.length;
}

/** 解析对象字面量的顶层键（跳过嵌套与注释；识别 ...spread / 字符串键）。 */
function parseObjectKeys(text, openIndex) {
  const keys = [];
  let sawSpread = false;
  let complete = true;
  let expectKey = true;
  let depth = 0;
  let i = openIndex;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '/' && text[i + 1] === '/') {
      const nl = text.indexOf('\n', i);
      if (nl === -1) break;
      i = nl;
      continue;
    }
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      if (end === -1) break;
      i = end + 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(text, i);
      if (depth === 1 && expectKey) {
        keys.push(text.slice(i + 1, end - 1));
        expectKey = false;
      }
      i = end;
      continue;
    }
    if (ch === '{' || ch === '(' || ch === '[') {
      depth += 1;
      if (depth === 1 && ch === '{') expectKey = true;
      i += 1;
      continue;
    }
    if (ch === '}' || ch === ')' || ch === ']') {
      depth -= 1;
      i += 1;
      if (depth <= 0) break;
      continue;
    }
    if (depth === 1) {
      if (ch === ',') {
        expectKey = true;
        i += 1;
        continue;
      }
      if (expectKey) {
        if (/\s/.test(ch)) {
          i += 1;
          continue;
        }
        if (text.startsWith('...', i)) {
          sawSpread = true;
          expectKey = false;
          i += 3;
          continue;
        }
        const m = /^[A-Za-z_$][\w$]*/.exec(text.slice(i, i + 64));
        if (m) {
          keys.push(m[0]);
          expectKey = false;
          i += m[0].length;
          continue;
        }
        complete = false;
        expectKey = false;
      }
    }
    i += 1;
  }
  return { keys, sawSpread, complete };
}

/** 找出文档里所有 createPromptManagerTools(...) 调用点。 */
function collectCallSites(doc) {
  const sites = [];
  const re = /createPromptManagerTools\s*\(/g;
  let m;
  while ((m = re.exec(doc.text)) !== null) {
    const openParen = m.index + m[0].length - 1;
    let i = openParen + 1;
    while (i < doc.text.length && /\s/.test(doc.text[i])) i += 1;
    const pos = doc.lineAt(m.index);
    if (doc.text[i] !== '{') {
      sites.push({ ...pos, index: m.index, keys: null, raw: doc.text.slice(m.index, Math.min(doc.text.length, i + 40)).split('\n')[0] });
      continue;
    }
    const parsed = parseObjectKeys(doc.text, i);
    const raw = doc.text.slice(m.index, Math.min(doc.text.length, i + 400));
    sites.push({ ...pos, index: m.index, keys: parsed.keys, complete: parsed.complete, sawSpread: parsed.sawSpread, raw });
  }
  return sites;
}

function checkRequiredOptions(ctx) {
  const serviceRel = TYPE_FILES.service;
  const serviceAbs = absOf(ctx.root, serviceRel);
  let props = null;
  if (fs.existsSync(serviceAbs)) {
    props = parseInterfaceProps(fs.readFileSync(serviceAbs, 'utf8'), 'PromptManagerOptions');
  }
  if (!props || props.required.length === 0) {
    ctx.report({
      check: 'required-options',
      severity: 'warning',
      type: 'guard-unavailable',
      file: serviceRel,
      line: 1,
      target: 'PromptManagerOptions',
      subject: '',
      message: `无法从 ${serviceRel} 解析出 PromptManagerOptions 的必填项，必填选项检查已跳过。`,
      hint: '确认该文件存在且包含 `export interface PromptManagerOptions { ... }`。',
    });
    return;
  }

  const compiledRanges = ctx.snippets.map((s) => ({ rel: s.rel, from: s.startLine, to: s.endLine }));
  for (const doc of ctx.docs) {
    for (const site of collectCallSites(doc)) {
      ctx.stats.callSites += 1;
      const covered = compiledRanges.some((r) => r.rel === doc.rel && site.line >= r.from && site.line <= r.to);
      if (covered) {
        ctx.skipped.push({ file: doc.rel, line: site.line, reason: 'covered-by-compile', detail: '该调用点位于被编译的代码块内，由 tsc 权威判定' });
        continue;
      }
      if (site.keys === null) {
        ctx.skip(doc.rel, site.line, 'options-not-object-literal', '实参不是对象字面量，无法静态判断必填项');
        continue;
      }
      if (!site.complete || site.sawSpread) {
        ctx.skip(doc.rel, site.line, 'options-object-unparsable', site.sawSpread ? '对象含 ...spread，无法确定键集合' : '对象字面量含无法解析的成员');
        continue;
      }
      const missing = props.required.filter((k) => !site.keys.includes(k));
      if (missing.length === 0) continue;
      ctx.report({
        check: 'required-options',
        severity: 'error',
        type: 'missing-required-options',
        file: doc.rel,
        line: site.line,
        column: site.column,
        target: missing.join(', '),
        subject: site.raw,
        message: `createPromptManagerTools(...) 缺少必填选项：${missing.join('、')}（实际给出：${site.keys.join(', ') || '(空)'}）。`,
        hint: `必填清单来自 ${serviceRel} > PromptManagerOptions：${props.required.join(', ')}。`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 检查 3：工具数量断言
// ---------------------------------------------------------------------------

async function loadRuntimeCounts(ctx) {
  const entryAbs = absOf(ctx.root, RUNTIME_ENTRY);
  if (!fs.existsSync(entryAbs)) {
    ctx.runtime = { status: 'unavailable', reason: `未找到 ${RUNTIME_ENTRY}（先 npm run build）`, write: null, read: null, engine: null };
    return;
  }
  try {
    const mod = await import(pathToFileURL(entryAbs).href);
    if (typeof mod.createPromptManagerTools !== 'function') {
      ctx.runtime = { status: 'unavailable', reason: `${RUNTIME_ENTRY} 未导出 createPromptManagerTools`, write: null, read: null, engine: null };
      return;
    }
    const makeOptions = (access) => ({
      repoRoot: ctx.root,
      dataDir: path.join(ctx.root, PROBE_DATA_DIR),
      access,
      execution: 'standalone',
    });
    const writeTools = await mod.createPromptManagerTools(makeOptions('write'));
    const readTools = await mod.createPromptManagerTools(makeOptions('read'));
    const engineTools =
      typeof mod.createNormifyTools === 'function' ? mod.createNormifyTools({ rootDir: ctx.root, requireBilingual: false }) : null;
    ctx.runtime = {
      status: 'ok',
      reason: null,
      source: `${RUNTIME_ENTRY} > createPromptManagerTools({ access }) / createNormifyTools(...)`,
      write: Array.isArray(writeTools) ? writeTools.length : null,
      read: Array.isArray(readTools) ? readTools.length : null,
      engine: Array.isArray(engineTools) ? engineTools.length : null,
    };
  } catch (err) {
    ctx.runtime = { status: 'unavailable', reason: `调用运行时入口失败：${err && err.message ? err.message : String(err)}`, write: null, read: null, engine: null };
  }
}

/**
 * 文档里的数量断言 → 三个口径：
 *   write  总目录（默认口径，「43 个工具」）
 *   read   只读目录（同一句里最近出现的模式词是 read / 只读）
 *   engine 引擎目录（「31 个（宿主无关）引擎工具」）
 */
const COUNT_CLAIMS = [
  { re: /(\d+)\s*个工具/g, bucket: 'auto' },
  { re: /(\d+)\s+tools?\b/gi, bucket: 'auto' },
  { re: /exposes\s+all\s+(\d+)/gi, bucket: 'auto' },
];

function checkToolCounts(ctx) {
  // 运行时不可用 → 本项检查形同虚设，必须报 error 而不是「只发 warning 就放行」。
  // 历史行为：lib/ 没 build 时每个数量断言各发一条 warning，退出码仍是 0——
  // 于是「文档里的工具数量已经和实现不一致」在没 build 的机器上完全测不出来。
  if (ctx.runtime.status !== 'ok') {
    ctx.report({
      check: 'tool-count',
      severity: 'error',
      type: 'guard-unavailable',
      file: RUNTIME_ENTRY,
      line: 1,
      target: 'runtime',
      subject: '',
      message: `取不到运行时工具数量，数量断言无法核对：${ctx.runtime.reason || '未知原因'}`,
      hint: '先 `npm run build` 生成 lib/（CI 的 Build 步骤已满足）后重跑；本项现在按 error 阻塞。',
    });
  }

  for (const doc of ctx.docs) {
    if (HISTORICAL_DOC.test(doc.rel)) {
      const hits = countClaimLines(doc);
      for (const line of hits) ctx.skip(doc.rel, line, 'historical-count-claim', '历史文体（RELEASE-*.md）记录当时事实，不做数字断言');
      continue;
    }
    const lines = doc.text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!/\d/.test(line)) continue;
      for (const claim of COUNT_CLAIMS) {
        claim.re.lastIndex = 0;
        let m;
        while ((m = claim.re.exec(line)) !== null) {
          const value = Number(m[1]);
          const bucket = classifyCountBucket(line, m.index);
          ctx.stats.countClaims += 1;
          const expected = bucket === 'read' ? ctx.runtime.read : ctx.runtime.write;
          if (expected === null || expected === undefined) {
            ctx.report({
              check: 'tool-count',
              severity: 'warning',
              type: 'runtime-count-unavailable',
              file: doc.rel,
              line: i + 1,
              target: `${value}`,
              subject: line,
              message: `文档断言「${m[0].trim()}」，但取不到运行时工具数量（${ctx.runtime.reason || '未知原因'}），本断言未核对。`,
              hint: '先 `npm run build` 生成 lib/ 后重跑；本项不阻塞（环境问题不判红）。',
            });
            continue;
          }
          if (value === expected) continue;
          ctx.report({
            check: 'tool-count',
            severity: 'error',
            type: 'tool-count-drift',
            file: doc.rel,
            line: i + 1,
            column: m.index + 1,
            target: `${value} != ${expected}`,
            subject: line,
            message: `文档断言「${m[0].trim()}」，但运行时 ${bucket === 'read' ? 'read' : 'write'} 目录实际注册 ${expected} 个工具。`,
            hint: `数量取自 ${ctx.runtime.source}（access: ${bucket === 'read' ? 'read' : 'write'}）。`,
          });
        }
      }
      countEngineClaim(ctx, doc, line, i + 1);
    }
  }
}

/** 「N 个（宿主无关）引擎工具」单独一个口径：模式与「N 个工具」不重叠。 */
function countEngineClaim(ctx, doc, line, lineNo) {
  const re = /(\d+)\s*个(?:宿主无关)?引擎工具/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    const value = Number(m[1]);
    ctx.stats.countClaims += 1;
    const expected = ctx.runtime.engine;
    if (expected === null || expected === undefined) {
      ctx.report({
        check: 'tool-count',
        severity: 'warning',
        type: 'runtime-count-unavailable',
        file: doc.rel,
        line: lineNo,
        target: `${value}`,
        subject: line,
        message: `文档断言「${m[0].trim()}」，但取不到运行时引擎工具数量（${ctx.runtime.reason || '未知原因'}），本断言未核对。`,
        hint: '先 `npm run build` 生成 lib/ 后重跑；本项不阻塞。',
      });
      continue;
    }
    if (value === expected) continue;
    ctx.report({
      check: 'tool-count',
      severity: 'error',
      type: 'tool-count-drift',
      file: doc.rel,
      line: lineNo,
      column: m.index + 1,
      target: `${value} != ${expected}`,
      subject: line,
      message: `文档断言「${m[0].trim()}」，但运行时引擎目录实际注册 ${expected} 个工具。`,
      hint: `数量取自 ${ctx.runtime.source}（createNormifyTools）。`,
    });
  }
}

function countClaimLines(doc) {
  const out = [];
  const lines = doc.text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (COUNT_CLAIMS.some((c) => new RegExp(c.re.source, c.re.flags).test(lines[i])) || /(\d+)\s*个(?:宿主无关)?引擎工具/.test(lines[i])) out.push(i + 1);
  }
  return out;
}

/** 用「数字之前最近的模式词」判断断言属于 read 还是 write 目录；没有模式词则按总目录（write）。 */
function classifyCountBucket(line, index) {
  const before = line.slice(Math.max(0, index - 60), index);
  const modeRe = /`?(write|read)`?|只读|read-only/gi;
  let last = null;
  let m;
  while ((m = modeRe.exec(before)) !== null) last = m[0].toLowerCase();
  if (!last) return 'write';
  return last.includes('write') ? 'write' : 'read';
}

// ---------------------------------------------------------------------------
// 检查 4：execute 签名描述
// ---------------------------------------------------------------------------

/** 解析 NormifyTool.execute 的形参名（按声明顺序）。 */
function parseExecuteParams(text) {
  const iface = /interface\s+NormifyTool\s*\{/.exec(text);
  const scope = iface ? sliceBalanced(text, iface.index + iface[0].length - 1, '{', '}') : text;
  if (scope === null) return null;
  const decl = /execute\s*:\s*\(/.exec(scope);
  if (!decl) return null;
  const paramsSource = sliceBalanced(scope, decl.index + decl[0].length - 1, '(', ')');
  if (paramsSource === null) return null;
  const params = splitTopLevel(paramsSource);
  const names = [];
  for (const raw of params) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const m = /^([A-Za-z_$][\w$]*)\s*(\?)?\s*:/.exec(trimmed);
    if (!m) return null; // 形参形状不认识（解构等）：交给上层按「无法判定」处理
    names.push(m[1]);
  }
  return names;
}

/** 按顶层逗号切分（忽略 <>/()/[]/{} 内的逗号与字符串里的逗号）。 */
function splitTopLevel(source) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '"' || ch === "'" || ch === '`') {
      const end = skipString(source, i);
      current += source.slice(i, end);
      i = end - 1;
      continue;
    }
    if ('<([{'.includes(ch)) depth += 1;
    else if ('>)]}'.includes(ch)) depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

function checkExecuteSignature(ctx) {
  const rel = 'lib/types/tools.d.ts';
  const abs = absOf(ctx.root, rel);
  let declared = null;
  if (fs.existsSync(abs)) declared = parseExecuteParams(fs.readFileSync(abs, 'utf8'));
  if (!declared || declared.length === 0) {
    ctx.report({
      check: 'execute-signature',
      severity: 'warning',
      type: 'guard-unavailable',
      file: rel,
      line: 1,
      target: 'NormifyTool.execute',
      subject: '',
      message: `无法从 ${rel} 解析出 NormifyTool.execute 的形参，签名描述检查已跳过。`,
      hint: '确认该文件存在且包含 `interface NormifyTool { ... execute: (...) => ... }`。',
    });
    return;
  }

  for (const doc of ctx.docs) {
    const lines = doc.text.split(/\r?\n/);
    const fenced = fenceLineSet(doc);
    for (let i = 0; i < lines.length; i += 1) {
      if (fenced.has(i + 1)) continue; // 代码块内的 execute(...) 是真实调用，不是签名描述
      const re = /execute\s*\(([^()]*)\)/g;
      let m;
      while ((m = re.exec(lines[i])) !== null) {
        const inner = m[1].trim();
        const names = inner
          ? inner.split(',').map((s) => s.trim().replace(/\?$/, ''))
          : [];
        const looksLikeSignature = names.every((n) => /^[A-Za-z_$][\w$]*$/.test(n));
        if (!looksLikeSignature) {
          ctx.skip(doc.rel, i + 1, 'execute-usage-not-signature', `execute(${inner}) 不是形参清单，未做签名比对`);
          continue;
        }
        ctx.stats.executeClaims += 1;
        const isSubsequence = names.every((n, idx) => declared[idx] === n);
        if (names.length === declared.length && isSubsequence) continue;
        if (isSubsequence && names.length < declared.length) {
          const omitted = declared.slice(names.length);
          ctx.report({
            check: 'execute-signature',
            severity: 'warning',
            type: 'execute-signature-partial',
            file: doc.rel,
            line: i + 1,
            column: m.index + 1,
            target: omitted.join(', '),
            subject: lines[i],
            message: `文档写成 execute(${names.join(', ')})，省略了尾部可选形参 ${omitted.join(', ')}（实现为 execute(${declared.join(', ')})）。`,
            hint: '形参名/顺序没错，只是描述不全；建议补全以便读者看到 execution 通道。',
          });
          continue;
        }
        ctx.report({
          check: 'execute-signature',
          severity: 'error',
          type: 'execute-signature-mismatch',
          file: doc.rel,
          line: i + 1,
          column: m.index + 1,
          target: `execute(${names.join(', ')})`,
          subject: lines[i],
          message: `文档写成 execute(${names.join(', ')})，与 ${rel} 的 NormifyTool.execute(${declared.join(', ')}) 形参名/顺序不一致。`,
          hint: `以 ${rel} 为准更新文档。`,
        });
      }
    }
  }
}

/** 该文档所有围栏行的行号集合（含围栏行本身），用于把代码块内容排除在散文检查之外。 */
function fenceLineSet(doc) {
  const set = new Set();
  for (const block of doc.blocks) {
    for (let l = block.startLine - 1; l <= block.endLine + 1; l += 1) set.add(l);
  }
  return set;
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------

function severityCounts(ctx) {
  const counts = { error: 0, warning: 0 };
  for (const v of ctx.violations) counts[v.severity] = (counts[v.severity] || 0) + 1;
  return counts;
}

function runtimeSummary(ctx) {
  if (ctx.runtime.status !== 'ok') return `不可用（${ctx.runtime.reason || '未知'}）`;
  return `write=${ctx.runtime.write} · read=${ctx.runtime.read} · engine=${ctx.runtime.engine}`;
}

function printHuman(ctx) {
  const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
  const paint = (code, s) => (useColor ? `\u001b[${code}m${s}\u001b[0m` : s);
  const out = [];

  out.push(paint('1', `${TOOL} v${TOOL_VERSION} — 文档示例编译 / 一致性门禁`));
  out.push(`仓库根: ${ctx.root}`);
  if (ctx.bootstrapError) {
    out.push(paint('31', `引导失败: ${ctx.bootstrapError}`));
  } else {
    out.push(`扫描文档: ${ctx.docs.map((d) => d.rel).join(' · ') || '(无)'}${ctx.stats.docsMissing ? `（缺失 ${ctx.stats.docsMissing}）` : ''}`);
    out.push(`围栏代码块: ${ctx.stats.blocksTotal} · 参与编译: ${ctx.snippets.length}`);
    if (ctx.tsc.tempDir) {
      out.push(`临时目录: ${ctx.tsc.tempDir}${ctx.tsc.tempDirKept ? '（已保留）' : '（运行结束已清理）'}`);
      out.push(`tsc: ${ctx.tsc.version || '(未知版本)'} · 来源 ${ctx.tsc.source}`);
    }
    out.push(`运行时工具数量: ${runtimeSummary(ctx)}`);
    out.push(`跳过: ${formatSkips(ctx)}`);
  }
  out.push('');

  if (ctx.violations.length === 0) {
    out.push(paint('32', '✔ 未发现文档示例漂移。'));
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
        out.push(`          [${v.type}] ${v.message}`);
        if (v.hint) out.push(`          ↳ ${v.hint}`);
      }
      out.push('');
    }
  }

  out.push(paint('2', `豁免清单（scripts/check-doc-snippets.cjs > SNIPPET_ALLOWLIST）${SNIPPET_ALLOWLIST.length} 条：`));
  if (SNIPPET_ALLOWLIST.length === 0) out.push('  · （空）');
  for (const entry of SNIPPET_ALLOWLIST) {
    out.push(`  · ${entry.file} :: ${entry.contains || '*'}${entry.kind ? ` [${entry.kind}]` : ''}  命中 ${entry.__hits || 0} 次`);
    out.push(`    理由: ${entry.reason || '（缺少 reason！）'}`);
  }
  out.push('');

  if (ctx.suppressed.length > 0) {
    out.push(paint('2', `被豁免抑制的违规 ${ctx.suppressed.length} 条：`));
    for (const s of ctx.suppressed) {
      out.push(`  · ${s.file}:${s.line} -> ${s.target}（${s.check}/${s.type}）`);
      out.push(`    理由: ${s.allowlistReason}`);
    }
    out.push('');
  }

  const counts = severityCounts(ctx);
  const summary = `${counts.error} error / ${counts.warning} warning`;
  out.push(counts.error > 0 ? paint('31', `✖ ${summary} —— 门禁未通过`) : paint('32', `✔ ${summary} —— 门禁通过`));

  process.stdout.write(`${out.join('\n')}\n`);
}

function formatSkips(ctx) {
  const entries = Object.entries(ctx.stats.skippedByReason).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return '无';
  return entries.map(([reason, n]) => `${reason} ${n}`).join(' · ');
}

function printJson(ctx) {
  const counts = severityCounts(ctx);
  const payload = {
    tool: TOOL,
    toolVersion: TOOL_VERSION,
    root: ctx.root,
    ok: counts.error === 0,
    summary: {
      errors: counts.error,
      warnings: counts.warning,
      docsScanned: ctx.docs.map((d) => d.rel),
      docsMissing: ctx.stats.docsMissing,
      blocksTotal: ctx.stats.blocksTotal,
      blocksCompiled: ctx.stats.blocksCompiled,
      skippedByReason: ctx.stats.skippedByReason,
      callSites: ctx.stats.callSites,
      countClaims: ctx.stats.countClaims,
      executeClaims: ctx.stats.executeClaims,
      allowlisted: ctx.suppressed.length,
      checks: Object.keys(CHECK_TITLES),
    },
    bootstrapError: ctx.bootstrapError,
    tsc: { version: ctx.tsc.version, source: ctx.tsc.source, keepTemp: Boolean(ctx.tsc.tempDirKept) },
    runtime: ctx.runtime,
    compiledSnippets: ctx.snippets.map((s) => ({
      file: s.rel,
      blockStartLine: s.startLine,
      blockEndLine: s.endLine,
      lang: s.lang,
      importSpecifiers: s.imports.map((im) => im.specifier),
      snippet: s.snippet,
    })),
    skipped: ctx.skipped,
    allowlist: SNIPPET_ALLOWLIST.map((entry) => ({
      file: entry.file,
      contains: entry.contains || null,
      kind: entry.kind || null,
      reason: entry.reason || null,
      hits: entry.__hits || 0,
    })),
    suppressed: ctx.suppressed,
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
