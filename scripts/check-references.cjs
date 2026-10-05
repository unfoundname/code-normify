#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/check-references.cjs
 * 引用完整性门禁（reference-integrity guard）
 * ---------------------------------------------------------------------------
 * 目的：让「指向已删除/不存在文件的引用」「未纳入 git 索引的新文件被已跟踪文件引用」
 *       「版本字面量漂移」「脚本指向不存在的文件」「链接 #fragment 落不到任何真实标题」
 *       这类残留在 CI 里自动变红。
 *
 * 设计约束：
 *   - Node 20+ / CommonJS，只用 node: 内置模块（CI 在 ubuntu-latest，本地在 Windows）。
 *     唯一的可选外部依赖是仓库自带的 typescript：拿不到时退化为内置正则并注明降级（见下）。
 *   - 不拼 Windows 专属路径、不调用 shell 专属命令；git 通过 execFileSync 直接 exec（无 shell）。
 *   - 只信任 git 跟踪的文件作为「工作区文本」，天然排除 node_modules/ 与未跟踪产物。
 *   - 「目标是否合法」以 git 索引（git ls-files）为权威，不以磁盘存在性为准——
 *     磁盘上有、索引里没有的文件正是「本地假绿、提交后断链」的来源（见检查 5）。
 *   - 只做高置信度检查，不做启发式猜测；无法判定的目标（外部 URL、仓库外路径）直接跳过并计入 skipped。
 *
 * 「读不到就必须红」——本脚本第一优先级的不变量：
 *   凡是「在 git 索引里」的路径，读失败一律报 guard-unavailable（error，退出码 1），包括：
 *     · EISDIR —— 已跟踪文件被同名目录顶替（例如 `Remove-Item README.md; mkdir README.md`）；
 *     · EPERM/EACCES —— ACL 拒绝读；
 *     · ENOENT —— 索引里有、工作区磁盘上没有；
 *     · 其它 IO 错误；
 *     · 解码不可信 —— UTF-16 BOM 或高比例 NUL 字节（按 utf8 硬解码会得到乱码，
 *       于是文件里的链接/版本字面量全部静默漏检）。
 *   只有「本来就不在索引里」的路径（悬空目标、被忽略目标）才允许静默跳过。
 *   历史教训：这些失败原先被 `readText` 的裸 `catch {}` 吞成 null，调用方 `continue`，
 *   门禁在「文件读不到」时反而全绿——比不检查更危险。
 *   例外：VERSION_SYNC_LITERALS 里 severity 为 warning 的条目（编译产物滞后）只发 warning，
 *   避免「没 build 就跑门禁」把本地自检卡死；见 literalSeverity。
 *
 * 模块说明符（相对 import/export）：
 *   优先用仓库自带 typescript 的编译器 API（ts.createSourceFile + 语法树遍历
 *   ImportDeclaration / ExportDeclaration / ImportCall / require() CallExpression）解析，
 *   天然覆盖副作用导入 `import './x.js'`、跨行 import、注释与字符串区分；
 *   拿不到 typescript 时退化为「注释/字符串掩码 + 多行安全正则」并置 degraded 标记（--json 输出 analysisMode）。
 *   两种模式都只认真实代码里的说明符：模板字符串里的假源码（例如 tests/branch-e2e.mjs 里
 *   写进临时夹具的 `import { values } from '../contracts/shape.mjs'`）不再被当成真 import。
 *
 * 退出码：
 *   0  通过（或只有 warning）
 *   1  存在 error 级违规，或工具链不可用（拿不到 git 跟踪清单 / 索引内文件读不到 → 宁可红也不要假绿）
 *   2  命令行用法错误（未知参数等）
 *
 * --root 的 fail-closed 约定（与 scripts/check-lib-sync.cjs / scripts/check-file-ledger.cjs 同构）：
 *   显式传了 --root 就绝不回退到「本脚本所在仓库」。以下三种都直接报 bootstrapError（error，退出码 1）
 *   且**一份文件都不扫**：
 *     · 指向的目录不存在（此前 createContext 只把 null 变成「无法定位仓库根目录」，语义含糊）；
 *     · 指向存在但不是 git 仓库根（git rev-parse --show-toplevel 的顶层目录必须与之相等）——
 *       仓库子目录会让 git 向上发现父仓库，判定基准落到另一个仓库上；
 *     · 指向的不是目录（普通文件）。
 *   未传 --root 时保持原行为：git 顶层目录，拿不到才退回脚本上级目录。
 *
 * 用法：node scripts/check-references.cjs [--json] [--root <dir>] [--help]
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const TOOL = 'check-references';
const TOOL_VERSION = '1.3.0';

// ---------------------------------------------------------------------------
// 配置：扫描范围
// ---------------------------------------------------------------------------

/** 参与扫描的文本扩展名。 */
const TEXT_EXTENSIONS = new Set(['.md', '.json', '.cjs', '.mjs', '.ts', '.yml', '.yaml', '.toml']);

/** CI 工作流目录（相对仓库根，posix 分隔符）。 */
const WORKFLOW_DIR = '.github/workflows';

/**
 * 检查项 id → 人类可读标题。
 * **顺序即 printHelp 的编号顺序，也是本表 Object.keys() 的顺序**（--json 的 summary.checks 直接取它）。
 * 唯一事实来源：printHelp 不再自带一份编号列表，而是从本表生成，避免两边顺序再次漂移
 * （历史问题：untracked-reference 在本表是 #2、在 --help 里却是 #6）。
 */
const CHECK_TITLES = {
  'dangling-reference': '悬空路径引用（Markdown / package.json / CI 指向不存在的文件）',
  'dangling-module-specifier': '相对 import/export 说明符指向根本不存在的文件',
  'untracked-reference': '引用了未纳入 git 索引的路径（磁盘上有、索引里没有 → 提交/CI 断链）',
  'deleted-reference': '指向 git 历史中已删除的文件',
  'version-drift': '版本字面量漂移（需保持同步的字面量清单）',
  'tarball-version-drift': '文档里的本地安装包文件名必须等于当前版本的 npm pack 产物名',
  'test-inventory': '测试脚本清单一致性',
  'dead-anchor': '锚点未命中目标文件的真实标题（Markdown 相对链接的 #fragment）',
  'guard-unavailable': '门禁自身不可用（索引内文件读不到 / 工具链或编码不可信）',
};

/**
 * 每一项检查在 --help 里的补充说明（可选）。
 * 与 CHECK_TITLES 的 key 一一对应；编号由 printHelp 按 CHECK_TITLES 的顺序生成，
 * 这里不再自带 1./2./… 前缀，避免两份顺序再次错位。
 */
const CHECK_HELP_DETAILS = {
  'dangling-reference': [
    '· Markdown 相对链接 [文本](路径)、图片 ![alt](路径) 与引用式定义行 [ref]: 路径',
    '  （跳过 http(s)://、mailto:、data:、协议相对 //、纯锚点 #x、代码块与行内代码）',
    '· package.json 的 main / types / exports / bin / files 字段（exports 的多段通配会逐段展开）',
    '· package.json 各 script 里的 `node <路径>`',
    `· ${WORKFLOW_DIR}/*.yml 的 run: 里的 ` + '`node <路径>`' + ` 与 ` + '`npm run <script>`' + `（script 必须存在）`,
    '· 大小写不一致的路径（Windows 能过、Linux CI 会挂）按 error 报出',
  ],
  'dangling-module-specifier': [
    '· 相对 import / export … from / import(…) / require(…) 指向「磁盘上根本不存在」的文件 → error',
    '· 说明符优先用仓库自带 typescript 的编译器 API 解析语法树（覆盖副作用导入 import \'./x.js\'、',
    '  跨行 import、注释与模板字符串区分）；拿不到 typescript 时降级为正则并在报告里标注',
    '· 与第 3 项的分工：目标「根本不存在」→ 本项；目标「存在但不在索引」→ 第 3 项（互斥，不重复报）',
  ],
  'untracked-reference': [
    '· 以 git 索引（git ls-files）为权威，而不是磁盘存在性：',
    '  已跟踪文件引用了「磁盘上有、却不在索引里」的路径 → error（本该 `git add`）',
    '· 覆盖来源：相对 import/export 说明符（`./execution.js` 会映射回 `./execution.ts`、',
    '  `./execution.d.ts` 一并判断）、package.json 的 main/types/module/browser/bin/exports/files',
    '  与 script 里的 `node <路径>`、CI run: 里的 `node <路径>`、Markdown 仓库内相对链接；',
    '· 被 .gitignore 等忽略规则覆盖的目标（node_modules/、构建临时物）跳过不报，',
    '  但在人类可读输出与 --json 里**逐条列出**（文件:行 → 目标 → 命中的忽略规则），',
    '  并对「被引用的目标恰好被忽略规则覆盖」发 warning。',
  ],
  'deleted-reference': [
    '· 用 `git log --diff-filter=D --name-only` 取历史删除清单，在工作区文本里搜完整路径（error）',
    '  与 basename（warning 次级线索）；历史记录文体（CHANGELOG.md）走脚本内的显式豁免清单。',
  ],
  'version-drift': [
    '· package.json > version 必须等于「需要同步的字面量清单」里的每个值。',
    '· 收集**全部**匹配并要求每个都等于当前版本（历史教训：只取首个匹配时，一行注释即可绕过门禁）；',
    '  注释行整体排除；同步清单里的文件若不在索引或读不到 → 报 error。',
    '· 当前清单：src/adapters/mcp.ts 的 MCP server version（error）、lib/adapters/mcp.js 编译产物（warning）、',
    '  package-lock.json 两处 version（error）、tests/mcp-e2e.mjs 的 server version 断言（error）、',
    '  README.md / README_EN.md 首段版本宣言（error）、docs/SPEC.zh-CN.md「当前实现」版本（error）。',
    '· 另有 SCRIPT_VERSION_CITATIONS：文档 / CI 注释里写的**脚本自身版本**（`scripts/x.cjs v1.2.3`）',
    '  必须等于该脚本内的 TOOL_VERSION（比较基准不是 package.json！）；见本项下方实现说明。',
  ],
  'tarball-version-drift': [
    '· 文档里的 `promptmanager-code-normify-<版本>.tgz` 必须等于本次 `npm pack` 的产物名（error）；',
    '  CHANGELOG.md 与 docs/RELEASE-*.md 属历史文体，不做断言。',
  ],
  'test-inventory': [
    '· script 里 `node tests/xxx.mjs` 必须真实存在（error）；',
    '· tests/ 下存在但没有任何 script 引用的测试文件按 warning 报出（通常是漏挂）。',
  ],
  'dead-anchor': [
    '· Markdown 仓库内相对链接里的 #fragment 必须命中目标文件的真实标题：',
    '  - 标题 id 按 GitHub 规则算：小写、去标点与 emoji、空格转 `-`、保留 CJK 与 `_`，',
    '    同名标题按出现顺序追加 `-1`/`-2`；代码围栏内的 `#` 行不算标题；',
    '  - 显式 HTML 锚点 <a id="x"> / <a name="x"> 同样算命中；纯锚点 #x 指同文件；',
    '  - 片段先 URL 解码再比对，GitHub 的 user-content-<id> 前缀两种写法都算命中；',
    '  - 目标文件不存在（第 1 项报）、目标是 Markdown 之外的文本，跳过并计数；',
    '  - 无法判定或确属历史文体的条目走 DEAD_ANCHOR_ALLOWLIST 显式豁免：',
    '    每次运行回显每条规则的命中次数，未被任何锚点命中的条目报 warning。',
  ],
  'guard-unavailable': [
    '· git 索引内的文本文件读失败（EISDIR/EPERM/ENOENT/其它 IO 错）→ error；',
    '· 编码不可信（UTF-16 BOM、高比例 NUL、非法 UTF-8）→ error，绝不按 utf8 静默硬解码；',
    '· 拿不到 git 跟踪清单 / 历史删除清单（浅克隆除外，那种情况是 warning）→ error。',
  ],
};

// ---------------------------------------------------------------------------
// 配置：「指向已删除文件」检查的显式豁免清单
// ---------------------------------------------------------------------------
/**
 * 为什么需要豁免清单：有些文件在文体上「必须」能提到已删除的路径——最典型的是
 * CHANGELOG：它逐版本记录「当时新增/删除了哪些文件」，这是历史事实而不是悬挂引用。
 * 这类豁免必须是显式的（写死在下面），并且在运行报告里回显，避免豁免悄悄掩盖真残留。
 *
 * 字段：
 *   file    引用方文件（相对仓库根，posix；支持 `*` 通配，如 `docs/RELEASE-*.md`）
 *   deleted 被引用的已删除路径；`'*'` 表示该文件可合法提及任意已删除路径
 *   reason  豁免理由（必填，运行报告与 --json 都会输出）
 *
 * 注意：只豁免「指向已删除文件」这一项检查；悬空 Markdown 链接、脚本指向不存在文件
 *       等检查不受此清单影响。
 */
const DELETED_REFERENCE_ALLOWLIST = [
  {
    file: 'CHANGELOG.md',
    deleted: '*',
    reason:
      'CHANGELOG 是逐版本的历史记录文体：条目本身就在描述"当时新增/删除了哪些文件"，' +
      '合法提及已删除路径（例如 0.5.x 条目提到后来的 cordis.patch.yml）。' +
      '若只想豁免单个路径，把 deleted 改成具体路径即可收窄。',
  },
];

/**
 * 豁免「指向已删除文件」检查的自身文件。
 * 理由：允许清单与检查逻辑本身不可避免地要写出已删除路径（作为豁免键），
 * 若把本脚本也纳入扫描，它会被自己的清单命中，属于结构性自指，不是残留。
 */
const SELF_EXCLUDED_FILES = new Set(['scripts/check-references.cjs']);

// ---------------------------------------------------------------------------
// 配置：「锚点未命中标题」检查（检查 6）的显式豁免清单
// ---------------------------------------------------------------------------
/**
 * 为什么需要豁免清单：片段能否命中，取决于「目标文件的标题按 GitHub slug 规则算出的 id」。
 * 有些目标链接确实无法判定或属于历史文体（例如指向某个当时存在、如今已改名的章节），
 * 这类豁免必须显式写死在下面，运行报告里回显每条规则的命中次数；**没有被任何锚点命中的
 * 条目会报 warning**（见 checkDeadAnchors），避免豁免过期后一直盖住真残留。
 *
 * 字段（file 必填；target / fragment 缺省或写 '*' 表示不限制）：
 *   file     引用方文件（相对仓库根，posix；支持 `*` 通配，如 `docs/RELEASE-*.md`）
 *   target   链接目标原文（例如 `../README.md#5-安装`）
 *   fragment 片段本身（不含 `#`，已 URL 解码）
 *   reason   豁免理由（必填，运行报告与 --json 都会输出）
 *
 * 注意：只豁免本项检查；悬空路径引用、未跟踪引用、已删除文件等检查不受此清单影响。
 *       当前为空 = 仓库里没有需要豁免的锚点。不要为了「让门禁变绿」往这里加条目：
 *       锚点死了就改锚点（或改文档），只有确属历史文体/无法判定时才豁免。
 */
const DEAD_ANCHOR_ALLOWLIST = [];

// ---------------------------------------------------------------------------
// 配置：需要与 package.json > version 保持同步的字面量清单
// ---------------------------------------------------------------------------
/**
 * 每一条 = 一个「必须与 package.json version 相等」的版本字面量。
 * 扩展方式：往数组里追加一条即可，不要写死行号；regex 用正则自行定位。
 *
 *   file      相对仓库根的文件
 *   regex     定位字面量的正则，捕获组 2 = 版本值（组 1 = 引号）
 *   jsonPath  或者：从 JSON 里取值（点分路径，'' 表示空键）
 *   severity  error = 漂移即失败；warning = 仅提示（例如编译产物滞后）
 *   label     报告里的人类可读名称
 */
const VERSION_SYNC_LITERALS = [
  {
    id: 'mcp-server-declaration',
    file: 'src/adapters/mcp.ts',
    label: 'MCP Server 声明的 server version（src）',
    // 定位 `new Server({ ... version: '<x>' ... })`，不依赖行号，容忍中间插入其他字段。
    // 捕获组 2 = 版本值（组 1 = 引号），与 checkVersionLiterals 的约定一致。
    regex: /new\s+Server\s*\(\s*\{[\s\S]{0,800}?\bversion\s*:\s*(['"])([^'"]+)\1/,
    severity: 'error',
  },
  {
    id: 'mcp-server-compiled',
    file: 'lib/adapters/mcp.js',
    label: 'MCP Server 声明的 server version（编译产物 lib）',
    regex: /new\s+Server\s*\(\s*\{[\s\S]{0,800}?\bversion\s*:\s*(['"])([^'"]+)\1/,
    // 编译产物滞后说明「改了 src 没重新 build」，CI 里 build 先于本步骤，所以只会本地提示。
    severity: 'warning',
  },
  {
    id: 'lockfile-root-version',
    file: 'package-lock.json',
    label: 'package-lock.json 顶层 version',
    jsonPath: ['version'],
    severity: 'error',
  },
  {
    id: 'lockfile-package-version',
    file: 'package-lock.json',
    label: 'package-lock.json packages[""].version',
    jsonPath: ['packages', '', 'version'],
    severity: 'error',
  },
  {
    id: 'mcp-e2e-version-assertion',
    file: 'tests/mcp-e2e.mjs',
    label: 'tests/mcp-e2e.mjs 对 MCP server version 的断言',
    // 定位 `getServerVersion().version, '<x>'`，不依赖行号。
    // 组 1 = 引号（占位，满足「组 2 = 版本值」的约定），组 2 = 版本值。
    regex: /getServerVersion\(\)\.version\s*,\s*(['"])([^'"]+)\1/,
    severity: 'error',
  },
  {
    id: 'readme-zh-version',
    file: 'README.md',
    label: 'README.md 首段「<版本> 是 PromptManager 的本地架构与分支规划工具」',
    // 只认首段那句版本宣言，不用「文件里任意 0.x.y」这种松正则，避免把历史附注也算成漂移。
    // 组 1 = 包名前缀（占位，满足「组 2 = 版本值」的约定），组 2 = 版本值。
    regex: /(`@promptmanager\/code-normify`\s+)(\d+\.\d+\.\d+)/,
    severity: 'error',
  },
  {
    id: 'readme-en-version',
    file: 'README_EN.md',
    label: 'README_EN.md 首段 version 宣言',
    regex: /(`@promptmanager\/code-normify`\s+)(\d+\.\d+\.\d+)/,
    severity: 'error',
  },
  {
    id: 'spec-version',
    file: 'docs/SPEC.zh-CN.md',
    label: 'docs/SPEC.zh-CN.md 「当前实现」版本',
    regex: /(当前实现：`@promptmanager\/code-normify`\s*\*\*)(\d+\.\d+\.\d+)\*\*/,
    severity: 'error',
  },
];

// ---------------------------------------------------------------------------
// 配置：文档 / CI 注释里的「脚本自身版本」引用
// ---------------------------------------------------------------------------
/**
 * 每一条 = 「某处文字里引用的脚本版本号」必须等于「该脚本内的 TOOL_VERSION」。
 *
 * 为什么单列一份、不复用 VERSION_SYNC_LITERALS：
 *   VERSION_SYNC_LITERALS 的比较基准是 **package.json > version**（0.8.2），而脚本版本号是
 *   脚本自己的 TOOL_VERSION（1.3.0 / 1.0.0）——不是同一个数，塞进那份清单只会互相打架。
 *
 * 为什么不能复用 checkOneVersionLiteral（历史坑，务必保留这段说明）：
 *   那个函数逐行 `if (isCommentLine(rawLine)) continue;` **刻意排除注释行**——因为历史上
 *   「一行注释里的正确版本」能让真实漂移判绿。而本清单要检查的目标**本身就是注释**
 *   （`.github/workflows/ci.yml` 的步骤注释）。所以这里必须自己逐行匹配，且**只认注释行**，
 *   不复用那个函数。
 *
 *   file       被检查的「引用方」文件（通常含注释）
 *   from       被引用的脚本：版本值取自它内部的 `TOOL_VERSION = '<x>'`
 *   regex      在 file 里定位引用的正则；捕获组 1（= m[1]）为版本值（可含 `v` 前缀）
 *   label      报告里的人类可读名称
 *
 * 扩展方式：往数组里追加一条即可，不要写死行号。新增一条后：
 *   ① 跑 `node scripts/check-references.cjs` 确认 exit 0；
 *   ② 同步 CONTRIBUTING.md 的本清单条数（该文件写明「数字随实现变化，改实现要同步」）。
 */
const SCRIPT_VERSION_CITATIONS = [
  {
    kind: 'version',
    file: '.github/workflows/ci.yml',
    from: 'scripts/check-references.cjs',
    // 组 1 = 版本值**含 `v` 前缀**；行内必须同时出现 `check-references.cjs`（避免与下面几条互相误吃），
    // 末尾的 lookahead `(?=）)` 钉住右括号，防止将来写成 v1.3.0.x 时只匹配到前缀。
    regex: /check-references\.cjs\s+(v\d+\.\d+\.\d+)(?=）)/,
    label: 'ci.yml 的 Reference integrity guard 注释里引用的 check-references.cjs 版本',
  },
  {
    kind: 'version',
    file: '.github/workflows/ci.yml',
    from: 'scripts/generate-file-ledger.cjs',
    regex: /generate-file-ledger\.cjs\s+(v\d+\.\d+\.\d+)/,
    label: 'ci.yml 的 File ledger generator check 注释里引用的 generate-file-ledger.cjs 版本',
  },
  {
    kind: 'version',
    file: '.github/workflows/ci.yml',
    from: 'scripts/check-file-ledger.cjs',
    regex: /check-file-ledger\.cjs\s+(v\d+\.\d+\.\d+)/,
    label: 'ci.yml 的 File ledger guard 注释里引用的 check-file-ledger.cjs 版本',
  },
  {
    kind: 'version',
    file: '.github/workflows/ci.yml',
    from: 'scripts/check-doc-snippets.cjs',
    regex: /check-doc-snippets\.cjs\s+(v\d+\.\d+\.\d+)/,
    label: 'ci.yml 的 Doc snippets guard 注释里引用的 check-doc-snippets.cjs 版本',
  },
  // ── 检查项计数：同一份「文档/CI 注释 vs 实现」的口径，只是期望值来自 CHECK_TITLES.length ──
  // 为什么需要：CONTRIBUTING.md 自己要求「若脚本新增检查项，本清单与 ci.yml 注释都要同步改
  // （数量、编号、覆盖范围三处）」，但此前**这三处数量没有任何门禁**。本清单把其中两处变成断言。
  // 注意「类数」（顶层 key 数）与「某类下的覆盖范围条数」是两件事：见下一条的说明。
  {
    kind: 'count',
    file: '.github/workflows/ci.yml',
    from: 'scripts/check-references.cjs',
    regex: /# 引用完整性门禁（[^）]*）(\d+) 类检查/,
    label: 'ci.yml 的 Reference integrity guard 注释里写明的检查项数',
  },
  {
    kind: 'count',
    file: 'CONTRIBUTING.md',
    from: 'scripts/check-references.cjs',
    // 锚定到整条 bullet 的开头（`- 引用完整性门禁：… 共 N 类检查`）：不锚定就会串味——
    // 实测踩过：松正则 /共 \*\*(\d+) 类\*\*检查/ 在 CONTRIBUTING 里同时命中台账那一条。
    regex: /^- 引用完整性门禁：[\s\S]{0,200}?共 \*\*(\d+) 类\*\*检查/,
    label: 'CONTRIBUTING.md 里写明的 check-references.cjs 检查项数',
  },
  {
    kind: 'count',
    file: '.github/workflows/ci.yml',
    from: 'scripts/check-file-ledger.cjs',
    // 注意实际写法是 `（…，13 项检查）`——数字在括号**内**、且在前（`，13 项检查）：`）。
    regex: /全仓文件台账门禁（[^）]*，(\d+) 项检查）/,
    label: 'ci.yml 的 File ledger guard 注释里写明的检查项数',
  },
  {
    kind: 'count',
    file: 'CONTRIBUTING.md',
    from: 'scripts/check-file-ledger.cjs',
    regex: /^- 全仓文件台账门禁：[\s\S]{0,200}?共 \*\*(\d+) 类\*\*检查/,
    label: 'CONTRIBUTING.md 里写明的 check-file-ledger.cjs 检查项数',
  },
];

// ---------------------------------------------------------------------------
// 配置：Markdown 内联链接
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 配置：未跟踪引用检查（检查 5）——以 git 索引为权威
// ---------------------------------------------------------------------------
/**
 * 为什么以 git 索引（git ls-files）为权威、而不是「磁盘上是否存在」：
 *   本地磁盘上存在、却从未 `git add` 的新文件会让所有基于磁盘存在性的判定假绿
 *   （tsc 解析得到、node 跑得起来、npm pack 打得进去），而 CI 与下一次 clone 出来的树里没有它。
 *   `git commit -am` 只暂存已跟踪文件的改动，一次常规提交就把断链永久写进历史。
 *   所以：目标「在索引里」才算合法；「只在磁盘上」不算。
 */

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

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

const relPosix = (p) => p.split(path.sep).join('/');

/** 把仓库相对 posix 路径落到当前操作系统的绝对路径（path.join 负责分隔符转换）。 */
const absOf = (root, rel) => path.join(root, ...rel.split('/'));

const isTextFile = (rel) => TEXT_EXTENSIONS.has(path.posix.extname(rel).toLowerCase());

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]');
  return new RegExp(`^${escaped}$`);
}

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

/** 执行 git（直接 exec，无 shell；不依赖 Windows/POSIX 差异）。 */
function execGit(root, args) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

// ---------------------------------------------------------------------------
// 注释识别（版本字面量的「排除注释行」用）
// ---------------------------------------------------------------------------

/** 行首注释前缀：覆盖主流注释样式（双斜杠、块注释星号、HTML 注释、井号、双横线、分号）。 */
const COMMENT_LINE_PREFIX = /^(\/\/|\/\*|\*|<!--|#|--|;)/;

/** 去掉已经闭合的块注释内容（保留长度不影响行号；用于 <!-- --> 之外的兜底）。 */
function stripClosedBlockComments(line) {
  let out = line;
  for (;;) {
    const start = out.indexOf('/*');
    if (start === -1) break;
    const end = out.indexOf('*/', start + 2);
    if (end === -1) break;
    out = out.slice(0, start) + ' '.repeat(end + 2 - start) + out.slice(end + 2);
  }
  return out;
}

/**
 * 该行是否「整行都是注释」（用于版本字面量检查排除注释行）。
 * 判定从宽：只要行首（去缩进后）是注释前缀，就算注释行，整行不参与版本同步断言。
 * 这样 `// version: '0.8.0'` 这类说明注释不会把真实漂移掩盖掉——历史教训：
 * 旧实现 regex.exec 只取首个匹配，一行注释就能让门禁判绿。
 * 先剥掉已闭合的块注释，避免「块注释 + 代码」写在同一行时被整行跳过。
 *
 * `relFile` 决定要不要做块注释剥离（默认做，保持旧行为）。**YAML/其它非 JS 文件必须传**：
 * 实测踩过——`# 全仓文件台账门禁（scripts/check-file-ledger.cjs v1.3.0…` 这行里
 * `check-file-ledger.cjs` 含 `/*`，会被 `stripClosedBlockComments` 当成块注释起点，
 * 把该行从 `scripts` 起全部抹掉，导致行首的 `#` 也一起消失、整行不再被认成注释（假阴性）。
 */
function isCommentLine(rawLine, relFile) {
  const jsLike = !relFile || /\.(cjs|mjs|js|jsx|ts|tsx|mts|cts)$/i.test(relFile);
  const base = jsLike ? stripClosedBlockComments(rawLine) : rawLine;
  const stripped = base.replace(/^[ \t]+/, '');
  if (!stripped.trim()) return false;
  return COMMENT_LINE_PREFIX.test(stripped);
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n运行 \`node scripts/check-references.cjs --help\` 查看用法。\n`);
    process.exitCode = 2;
    return;
  }

  if (opts.help) {
    printHelp();
    process.exitCode = 0;
    return;
  }

  const ctx = createContext(opts);
  const fatal = ctx.bootstrapError;
  if (fatal) {
    // 拿不到 git 跟踪清单时宁可红：静默跳过会让门禁假绿。
    ctx.report({
      check: 'dangling-reference',
      severity: 'error',
      type: 'guard-unavailable',
      file: '.',
      line: 1,
      target: 'git',
      message: fatal,
      hint: '本脚本依赖 `git ls-files` / `git log`；请在完整 git checkout 中运行（CI 的 actions/checkout 已满足）。',
    });
  } else {
    // 顺序即 CHECK_TITLES 的顺序（printHelp 与这里同源）。
    checkTrackedReadability(ctx);
    checkMarkdownLinks(ctx);
    checkPackageJson(ctx);
    checkWorkflowRuns(ctx);
    const resolvedSpecifiers = checkDanglingModuleSpecifiers(ctx);
    checkVersionLiterals(ctx);
    checkScriptVersionCitations(ctx);
    checkTarballNames(ctx);
    checkTestInventory(ctx);
    checkDeletedReferences(ctx);
    checkUntrackedReferences(ctx, resolvedSpecifiers);
    checkDeadAnchors(ctx);
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
  // 编号列表从 CHECK_TITLES 生成：两处顺序曾不一致（untracked-reference 在表里是 #2、
  // 在 --help 里是 #6），现在只有一个事实来源。
  const checkList = Object.entries(CHECK_TITLES).flatMap(([id, title], index) => [
    `  ${index + 1}. ${title}`,
    ...(CHECK_HELP_DETAILS[id] || []).map((line) => `       ${line}`),
  ]);

  const lines = [
    `${TOOL} v${TOOL_VERSION} — 引用完整性门禁（reference-integrity guard）`,
    '',
    '用法：',
    '  node scripts/check-references.cjs [选项]',
    '',
    '选项：',
    '  --json          只向 stdout 输出机器可读 JSON（含 file/line/column/target/type）',
    '  --root <dir>    指定被检查的仓库根（默认：本脚本所在仓库的 git 顶层目录）',
    '  -h, --help      打印本帮助',
    '',
    '退出码：',
    '  0  无 error（可能有 warning）',
    '  1  存在 error 级违规，或工具链不可用（含「索引内文件读不到」）',
    '  2  命令行用法错误',
    '',
    '第一优先级不变量 —— 读不到就必须红：',
    '  凡「在 git 索引里」的文本文件读失败一律报 error（guard-unavailable，退出码 1）：',
    '    · EISDIR 已跟踪文件被同名目录顶替 · EPERM/EACCES ACL 拒绝读 · ENOENT 索引里有磁盘上没有',
    '    · 编码不可信：UTF-16 BOM 或高比例 NUL 字节（按 utf8 硬解码会得到乱码并静默漏检）',
    '  只有「本来就不在索引里」的路径（悬空目标、被忽略目标）才允许静默跳过。',
    '',
    '检查项（编号顺序 = 报告分组顺序 = --json 的 summary.checks 顺序）：',
    ...checkList,
    '',
    '扫描范围：git 跟踪的文本文件（' + [...TEXT_EXTENSIONS].join(' ') + '）。',
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

function createContext(opts) {
  const cwd = process.cwd();
  const ctx = {
    root: null,
    tracked: [],
    trackedSet: new Set(),
    trackedDirSet: new Set(),
    lowerFileMap: new Map(),
    lowerDirMap: new Map(),
    untrackedSet: new Set(),
    ignoredSet: new Set(),
    untrackedError: null,
    ignoreCache: new Map(),
    textFiles: [],
    cache: new Map(),
    lineOffsets: new Map(),
    // 「读不到就必须红」的账本：rel → { status, code, reason }（见 readText / checkTrackedReadability）。
    readFailures: new Map(),
    readFailureReported: new Set(),
    // 忽略规则原文缓存（`git check-ignore -v` 的逐条回显）。
    ignoreRuleCache: new Map(),
    // 模块说明符解析模式：'typescript'（首选）或 'regex-fallback'（降级，报告里明确标注）。
    analysisMode: { mode: 'regex-fallback', reason: '尚未初始化', version: null },
    // 检查 6 专用：目标文件的「可命中锚点集合」缓存，以及豁免清单每条规则的命中次数。
    anchorCache: new Map(),
    anchorAllowlistHits: new Map(),
    violations: [],
    suppressed: [],
    // 被忽略规则覆盖、因而「跳过不报」的目标：逐条列出（含命中的忽略规则），不再只给计数。
    ignoredRefs: [],
    ignoredRefSeen: new Set(),
    dedupe: new Set(),
    stats: {
      skippedExternal: 0,
      skippedOutsideRoot: 0,
      allowlisted: 0,
      untrackedTargets: 0,
      ignoredTargets: 0,
      ambiguousTargets: 0,
      unresolvedModuleSpecifiers: 0,
      danglingModuleSpecifiers: 0,
      ignoredRefsWarned: 0,
      unreadableIndexedFiles: 0,
      anchorsChecked: 0,
      anchorsHit: 0,
      anchorsMissed: 0,
      anchorsViaExplicitHtmlId: 0,
      anchorTargetsNonMarkdown: 0,
      anchorTargetsUnresolved: 0,
      checks: {},
    },
    bootstrapError: null,
  };

  // report/suppress 必须在任何提前 return 之前挂好：引导失败时 main() 也要能报 guard-unavailable。
  ctx.report = (v) => {
    const key = v.dedupeKey || `${v.file}:${v.line}:${v.type}:${v.target}`;
    if (ctx.dedupe.has(key)) return;
    ctx.dedupe.add(key);
    delete v.dedupeKey;
    ctx.violations.push(v);
  };
  ctx.suppress = (v, reason) => {
    ctx.stats.allowlisted += 1;
    ctx.suppressed.push({ ...v, allowlistReason: reason });
  };
  /**
   * 记录一个「被忽略规则覆盖、因此跳过不报」的引用目标（人类可读输出与 --json 逐条列出）。
   * 命中的忽略规则用 `git check-ignore -v` 取（惰性、每条路径只算一次），拿不到就写 null。
   */
  ctx.recordIgnoredRef = ({ file, line, target, resolved, source }) => {
    ctx.stats.ignoredTargets += 1;
    const key = `${file}:${line || 1}:${source}:${resolved}`;
    if (ctx.ignoredRefSeen.has(key)) return null;
    ctx.ignoredRefSeen.add(key);
    const entry = { file, line: line || 1, target, resolved, source, rule: ignoreRuleFor(ctx, resolved) };
    ctx.ignoredRefs.push(entry);
    return entry;
  };

  ctx.root = resolveRoot(opts.root, cwd);
  if (ctx.root && typeof ctx.root === 'object' && ctx.root.error) {
    // 显式 --root 无效：绝不回退。报错即红（退出码 1），不扫描任何仓库。
    ctx.bootstrapError = ctx.root.error;
    ctx.root = null;
    return ctx;
  }
  if (!ctx.root) {
    ctx.bootstrapError = `无法定位仓库根目录（cwd=${cwd}，git rev-parse --show-toplevel 失败）`;
    return ctx;
  }

  // --root 必须是仓库根本身：git 会向上发现父仓库，指向仓库子目录/普通临时目录时
  // 判定基准会静默落到另一个仓库的索引上（那是最隐蔽的一种假绿）。
  try {
    assertGitRoot(ctx.root, Boolean(opts.root));
  } catch (err) {
    ctx.bootstrapError = err.message;
    ctx.root = null;
    return ctx;
  }

  try {
    const raw = execGit(ctx.root, ['ls-files', '-z']);
    ctx.tracked = raw.split('\0').filter(Boolean).map(relPosix);
  } catch (err) {
    ctx.bootstrapError = `git ls-files 执行失败：${err.message}`;
    return ctx;
  }

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
  ctx.textFiles = ctx.tracked.filter(isTextFile);

  // 模块说明符解析模式：优先 typescript 编译器 API，拿不到就降级为正则并注明原因。
  // 放在这里（而不是各检查内部）是为了让 --json / 人类可读头部都能回显「本次用了哪套解析」。
  initSpecifierAnalysis();
  ctx.analysisMode = { mode: SPECIFIER_ANALYSIS.mode, reason: SPECIFIER_ANALYSIS.reason, version: SPECIFIER_ANALYSIS.version };

  // 「磁盘上有、索引里没有」的两类候选（检查 5 的数据源）：
  //   untracked = 未被任何忽略规则覆盖 → 本该 `git add`，被引用即 error；
  //   ignored   = 被 .gitignore / .git/info/exclude / core.excludesFile 覆盖（node_modules/、
  //               构建临时物、示例运行日志…）→ 正常状态，被引用时不报。
  // `--directory` 把整棵被忽略的目录折叠成一条（node_modules/），避免枚举上万条路径。
  try {
    ctx.untrackedSet = new Set(
      execGit(ctx.root, ['ls-files', '-z', '--others', '--exclude-standard'])
        .split('\0')
        .filter(Boolean)
        .map(relPosix),
    );
    ctx.ignoredSet = new Set(
      execGit(ctx.root, ['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--directory'])
        .split('\0')
        .filter(Boolean)
        .map(relPosix)
        .map((rel) => (rel.endsWith('/') ? rel.slice(0, -1) : rel)),
    );
  } catch (err) {
    // 拿不到未跟踪清单时绝不能让检查 5 静默通过（那正好复现它要防的假绿）：记录原因，由检查 5 报 error。
    ctx.untrackedError = `git ls-files --others 执行失败：${err.message}`;
  }

  return ctx;
}

/**
 * 解析 --root / 默认根。
 * 关键约定（与 scripts/check-lib-sync.cjs、scripts/check-file-ledger.cjs 同构）：**显式传了 --root 就绝不回退**。
 * 返回绝对路径字符串，或 { error } 标记对象 —— 后者必须由 createContext 变成 bootstrapError，
 * 否则「--root 打错一个字符」会静默退回本脚本所在仓库继续扫描：扫了另一个仓库还报绿，
 * 正是本脚本第 20-32 行那条「宁可红也不要假绿」不变量要防的假绿。
 * 注意「存在但不是仓库根」是更隐蔽的一半：git 会向上发现父仓库，于是
 * `--root <仓库子目录>` 会静默把扫描基准落到父仓库上，这由下面的 assertGitRoot 拦。
 */
function resolveRoot(explicit, cwd) {
  if (explicit) {
    const abs = path.resolve(cwd, explicit);
    if (!fs.existsSync(abs)) {
      return { error: `--root 指向的目录不存在：${abs}（已 fail-closed：绝不回退到本脚本所在仓库）` };
    }
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
    /* 落到下面的兜底 */
  }
  const fallback = path.resolve(__dirname, '..');
  return fs.existsSync(fallback) ? fallback : null;
}

/** realpath，取不到就退回 path.resolve（目录可能已被删/无权限解析链接）。 */
function safeRealpath(p) {
  try {
    return fs.realpathSync.native(p);
  } catch {
    return path.resolve(p);
  }
}

/**
 * 校验 root 确实是 git 仓库根（照 scripts/check-lib-sync.cjs 的 assertGitRoot）。
 * 只跑 `git ls-files` 是不够的：git 会向上发现父级仓库，于是
 *   · `--root <仓库子目录>`（例如 --root scripts）会被静默当成父仓库，
 *   · `--root <普通非 git 临时目录>` 会被静默当成附近某个仓库，
 * 两种情况下扫描/判定基准都落到**另一个仓库**上，而报告里的人类可读「仓库根:」还照着
 * 传进来的那个路径打印 —— 同一个坑的两种假绿形态。这里用 rev-parse 的顶层目录做等值校验。
 */
function assertGitRoot(root, explicit) {
  let top;
  try {
    top = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      maxBuffer: 8 * 1024 * 1024,
    }).trim();
  } catch (err) {
    throw new Error(
      (explicit ? `--root ${root}` : `默认根 ${root}`) +
        ` 不是 git 仓库根（git rev-parse --show-toplevel 失败）：${err.message}`,
    );
  }
  if (!top) {
    throw new Error((explicit ? `--root ${root}` : `默认根 ${root}`) + ' 不是 git 仓库根（git 未报告顶层目录）。');
  }

  // win32 折叠大小写：Windows 上 I:\X 与 i:\x 是同一目录，逐字比较会误报。
  const normalize = (p) => {
    const real = safeRealpath(path.resolve(p));
    const trimmed = real.replace(/[\\/]+$/, '');
    return process.platform === 'win32' ? trimmed.toLowerCase() : trimmed;
  };
  if (normalize(top) !== normalize(root)) {
    throw new Error(
      `--root ${root} 不是 git 仓库根：git 报告的顶层目录是 ${path.resolve(top)}。` +
        '（若传的是仓库内的子目录，git 会向上发现父仓库，扫描基准会落到错误的仓库上。）',
    );
  }
}

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

/**
 * 检查 0（最先跑）：git 索引内的文本文件必须能读到且能可信解码。
 * 覆盖范围 = 所有参与扫描的文本扩展名；读失败逐条 error（不是计数、不是跳过）。
 */
function checkTrackedReadability(ctx) {
  for (const rel of ctx.textFiles) {
    if (readText(ctx, rel) !== null) continue;
    const failure = readFailure(ctx, rel);
    if (failure) reportReadFailure(ctx, rel, failure);
  }
}

/** 命中某路径的忽略规则原文（`git check-ignore -v`），供逐条列出用；拿不到返回 null。 */
function ignoreRuleFor(ctx, rel) {
  if (!rel || rel.startsWith('..')) return null;
  if (ctx.ignoreRuleCache.has(rel)) return ctx.ignoreRuleCache.get(rel);
  let rule = null;
  try {
    const out = execFileSync('git', ['-c', 'core.quotePath=false', 'check-ignore', '-v', '--', rel], {
      cwd: ctx.root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const line = out.split(/\r?\n/).find((l) => l.trim());
    if (line) {
      // `git check-ignore -v` 的输出是 `<来源>:<行号>:<规则>\t<被检查的路径>`；
      // 必须按 TAB 切开，否则贪婪匹配会把「规则 + 路径」整段吞进规则里。
      const [head, ...rest] = line.split('\t');
      const m = /^(.*?):(\d+):(.*)$/.exec(head);
      rule = m ? `${m[1]}:${m[2]} → ${m[3]}${rest.length ? `（匹配 ${rest.join('\t')}）` : ''}` : head.trim();
    }
  } catch {
    rule = null; // 未被忽略 / git 判定失败：不猜
  }
  ctx.ignoreRuleCache.set(rel, rule);
  return rule;
}

function readJson(ctx, rel) {
  const text = readText(ctx, rel);
  // 读失败（含 EISDIR/EPERM/编码不可信）由 checkTrackedReadability 统一报 error，这里不再重复报解析错。
  if (text === null) return { error: `无法读取 ${rel}（详见 guard-unavailable）`, unreadable: true };
  try {
    return { value: JSON.parse(text) };
  } catch (err) {
    return { error: `${rel} 不是合法 JSON：${err.message}` };
  }
}

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

// ---------------------------------------------------------------------------
// 检查 1a：Markdown 相对链接 / 图片
// ---------------------------------------------------------------------------

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

function checkMarkdownLinks(ctx) {
  for (const rel of ctx.textFiles) {
    if (path.posix.extname(rel).toLowerCase() !== '.md') continue;

    forEachMarkdownLink(ctx, rel, ({ target, decoded, resolved, line, column }) => {
      const state = pathState(ctx, resolved);
      if (state === 'outside') {
        ctx.stats.skippedOutsideRoot += 1;
        return;
      }
      if (state === 'ok') {
        noteIgnoredLinkTarget(ctx, { file: rel, line, target, resolved });
        return;
      }

      ctx.report({
        check: 'dangling-reference',
        severity: 'error',
        type: state === 'case-mismatch' ? 'path-case-mismatch' : 'dangling-markdown-link',
        file: rel,
        line,
        column,
        target,
        resolved,
        message:
          state === 'case-mismatch'
            ? `Markdown 链接目标大小写与仓库实际路径不一致：${decoded}`
            : `Markdown 链接/图片指向不存在的路径：${decoded}`,
        hint:
          state === 'case-mismatch'
            ? `仓库中的实际路径是 ${ctx.lowerFileMap.get(resolved.toLowerCase()) || ctx.lowerDirMap.get(resolved.toLowerCase())}（Windows 能过、Linux CI 会挂）`
            : '相对路径按 Markdown 文件所在目录解析；以 / 开头按仓库根解析。',
      });
    });
  }
}

// ---------------------------------------------------------------------------
// 被忽略的目标：跳过不报，但必须逐条可见
// ---------------------------------------------------------------------------
/**
 * 设计：目标被 .gitignore / .git/info/exclude / core.excludesFile 覆盖时**跳过不报**（正常状态），
 * 但「跳过」绝不能等于「看不见」：人类可读输出与 --json 里逐条列出
 * （引用方:行 → 目标 → 命中的忽略规则）。另外对「被引用的目标恰好被忽略规则覆盖」发 warning：
 * 这种情况下引用方是已跟踪文件、目标却永远不会被提交，clean checkout 上就是断链，
 * 只是被忽略规则合法地挡住了 error——语义上需要人看一眼。
 */
function noteIgnoredRef(ctx, entry) {
  const recorded = ctx.recordIgnoredRef(entry);
  if (!recorded) return recorded;
  if (ctx.trackedSet.has(entry.file)) {
    ctx.stats.ignoredRefsWarned += 1;
    ctx.report({
      check: 'untracked-reference',
      severity: 'warning',
      type: 'referenced-target-is-ignored',
      file: entry.file,
      line: entry.line,
      target: entry.target,
      resolved: entry.resolved,
      dedupeKey: `ignored-warn::${entry.file}:${entry.line}:${entry.resolved}`,
      message: `已跟踪文件引用的目标被忽略规则覆盖，因此本项跳过不报（不算 error）：${entry.resolved}`,
      hint:
        `命中的规则：${entry.rule || '(未能取得规则原文)'}。` +
        '目标不会被提交，clean checkout / CI 上没有它。若这是有意为之（构建产物、示例运行物）可忽略本条；' +
        '若引用方需要它存在，就把它纳入索引并收窄忽略规则。',
    });
  }
  return recorded;
}

/** Markdown 链接：目标在磁盘上、不在索引里、且被忽略规则覆盖 → 记一条逐条可见的「跳过」。 */
function noteIgnoredLinkTarget(ctx, { file, line, target, resolved }) {
  if (!resolved || resolved === '.' || resolved.startsWith('..')) return;
  if (ctx.trackedSet.has(resolved) || ctx.trackedDirSet.has(resolved)) return;
  if (!fs.existsSync(absOf(ctx.root, resolved))) return;
  if (isIgnoredPath(ctx, resolved) !== true) return;
  noteIgnoredRef(ctx, { file, line, target, resolved, source: 'Markdown 链接/图片' });
}

// ---------------------------------------------------------------------------
// 检查 1b：package.json 字段 + scripts 里的 node <路径>
// ---------------------------------------------------------------------------

function checkPackageJson(ctx) {
  const rel = 'package.json';
  if (!ctx.trackedSet.has(rel)) return;
  const parsed = readJson(ctx, rel);
  if (parsed.error) {
    if (!parsed.unreadable) reportParseError(ctx, rel, parsed.error);
    return;
  }
  const pkg = parsed.value;
  const text = readTextOrReport(ctx, rel) || '';

  const fieldTargets = collectPackageFieldTargets(pkg);

  for (const { field, target } of fieldTargets) {
    if (typeof target !== 'string' || !target) continue;
    const normalized = path.posix.normalize(target.replace(/^\.\//, ''));
    if (normalized === '.' || normalized.startsWith('..')) continue;
    const state = globState(ctx, normalized);
    if (state === 'ok' || state === 'outside') continue;
    ctx.report({
      check: 'dangling-reference',
      severity: 'error',
      type: state === 'case-mismatch' ? 'path-case-mismatch' : 'dangling-package-field',
      file: rel,
      ...positionOfJsonKey(ctx, text, rel, field.split(/[.[]/)[0]),
      target,
      resolved: normalized,
      message: `package.json > ${field} 指向不存在的路径：${target}`,
      hint: state === 'case-mismatch' ? '大小写不一致：Windows 能过、Linux CI 会挂。' : '字段值按仓库根解析。',
    });
  }

  // scripts 里的 `node <路径>`
  const scripts = pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {};
  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== 'string') continue;
    for (const target of extractNodeTargets(command)) {
      const normalized = path.posix.normalize(target.replace(/^\.\//, ''));
      if (normalized.startsWith('..') || path.posix.isAbsolute(normalized)) continue;
      const state = pathState(ctx, normalized);
      if (state === 'ok' || state === 'outside') continue;
      const pos = positionOfJsonKey(ctx, text, rel, name) || positionOfJsonKey(ctx, text, rel, 'scripts');
      ctx.report({
        check: 'dangling-reference',
        severity: 'error',
        type: state === 'case-mismatch' ? 'path-case-mismatch' : 'dangling-script-target',
        file: rel,
        line: pos ? pos.line : 1,
        column: pos ? pos.column : 1,
        target,
        resolved: normalized,
        dedupeKey: `package.json::${normalized}`,
        message: `package.json > scripts["${name}"] 调用 node 指向不存在的文件：${target}`,
        hint: '脚本体按仓库根解析 node 的入口文件参数（跳过 -e/--eval 之类内联代码）。',
      });
    }
  }
}

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

// ---------------------------------------------------------------------------
// 检查 1c：workflow run: 里的 node <路径> 与 npm run <script>
// ---------------------------------------------------------------------------

function checkWorkflowRuns(ctx) {
  const workflows = ctx.textFiles.filter(
    (rel) => path.posix.dirname(rel) === WORKFLOW_DIR && /\.ya?ml$/i.test(rel),
  );
  const pkgParsed = readJson(ctx, 'package.json');
  const scripts =
    !pkgParsed.error && pkgParsed.value.scripts && typeof pkgParsed.value.scripts === 'object'
      ? pkgParsed.value.scripts
      : {};

  for (const rel of workflows) {
    const text = readText(ctx, rel);
    if (text === null) continue;

    for (const { line, text: bodyText } of collectWorkflowRunLines(text)) {
      if (!bodyText) continue;
      for (const target of extractNodeTargets(bodyText)) {
        const normalized = path.posix.normalize(target.replace(/^\.\//, ''));
        if (normalized.startsWith('..')) continue;
        const state = pathState(ctx, normalized);
        if (state === 'ok' || state === 'outside') continue;
        ctx.report({
          check: 'dangling-reference',
          severity: 'error',
          type: state === 'case-mismatch' ? 'path-case-mismatch' : 'dangling-ci-node-target',
          file: rel,
          line,
          column: bodyText.indexOf(target) + 1,
          target,
          resolved: normalized,
          message: `CI run: 里的 node 指向不存在的文件：${target}`,
          hint: 'run: 中的路径按仓库根解析。',
        });
      }

      for (const scriptName of extractNpmScriptRefs(bodyText)) {
        if (Object.prototype.hasOwnProperty.call(scripts, scriptName)) continue;
        ctx.report({
          check: 'dangling-reference',
          severity: 'error',
          type: 'dangling-ci-npm-script',
          file: rel,
          line,
          column: bodyText.indexOf(scriptName) + 1,
          target: scriptName,
          dedupeKey: `${rel}:${line}:npm-run::${scriptName}`,
          message: `CI run: 调用了 package.json 中不存在的 script：${scriptName}`,
          hint: '在 package.json > scripts 里补上该 script，或改掉 CI 里的调用。',
        });
      }
    }
  }
}

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

// ---------------------------------------------------------------------------
// 检查 2：版本字面量漂移
// ---------------------------------------------------------------------------

function checkVersionLiterals(ctx) {
  const parsed = readJson(ctx, 'package.json');
  if (parsed.error) {
    reportParseError(ctx, 'package.json', parsed.error);
    return;
  }
  const expected = parsed.value.version;
  if (!expected) {
    ctx.report({
      check: 'version-drift',
      severity: 'error',
      type: 'missing-package-version',
      file: 'package.json',
      line: 1,
      target: 'version',
      message: 'package.json 缺少 version 字段，无法做版本同步校验。',
    });
    return;
  }

  for (const entry of VERSION_SYNC_LITERALS) {
    // 同步清单里的文件若不在索引（被删/改名）或读不到 → 报 error：
    // 「清单说这里必须有版本字面量，实际却没有可读的文件」本身就是门禁失效，不能静默 continue。
    if (!ctx.trackedSet.has(entry.file)) {
      ctx.report({
        check: 'version-drift',
        severity: literalSeverity(entry),
        type: 'version-literal-file-missing',
        file: entry.file,
        line: 1,
        target: entry.label,
        message: `同步清单「${entry.label}」指定的文件不在 git 索引里（被删除/改名/从未 add？）：${entry.file}`,
        hint: '改任一处的版本字面量都必须同步清单本身；文件改名后请同步更新 VERSION_SYNC_LITERALS 的 file 字段。',
      });
      continue;
    }

    if (entry.regex) {
      const text = readText(ctx, entry.file);
      if (text === null) {
        // 读不到（EISDIR/EPERM/ENOENT/编码不可信）绝不能当成「没有漂移」。
        const failure = readFailure(ctx, entry.file);
        if (failure) reportReadFailure(ctx, entry.file, failure, entry.severity);
        else {
          ctx.report({
            check: 'guard-unavailable',
            severity: literalSeverity(entry),
            type: 'guard-unavailable',
            file: entry.file,
            line: 1,
            target: entry.label,
            message: `同步清单「${entry.label}」的文件读不到，版本漂移检查无法进行：${entry.file}`,
          });
        }
        continue;
      }
      checkOneVersionLiteral(ctx, entry, text, expected);
      continue;
    }

    if (entry.jsonPath) {
      const json = readJson(ctx, entry.file);
      if (json.error) {
        if (!json.unreadable) reportParseError(ctx, entry.file, json.error);
        else {
          const failure = readFailure(ctx, entry.file);
          if (failure) reportReadFailure(ctx, entry.file, failure, entry.severity);
        }
        continue;
      }
      let node = json.value;
      for (const segment of entry.jsonPath) {
        if (node === null || typeof node !== 'object') {
          node = undefined;
          break;
        }
        node = node[segment];
      }
      if (typeof node !== 'string') {
        ctx.report({
          check: 'version-drift',
          severity: literalSeverity(entry),
          type: 'version-literal-not-found',
          file: entry.file,
          line: 1,
          target: entry.label,
          message: `同步清单「${entry.label}」在 ${entry.file} 里定位不到版本字面量（路径 ${entry.jsonPath.join('.')} 不存在或不是字符串）。`,
          hint: '同步清单写死的是定位方式而非行号；JSON 结构变了就更新 VERSION_SYNC_LITERALS 的 jsonPath。',
        });
        continue;
      }
      if (node !== expected) {
        ctx.report({
          check: 'version-drift',
          severity: literalSeverity(entry),
          type: 'version-drift',
          file: entry.file,
          line: 1,
          column: 1,
          target: node,
          message: `${entry.label} = ${node}，与 package.json > version = ${expected} 不一致。`,
          hint: '改任一处后必须同步另一处（本清单见 scripts/check-references.cjs 的 VERSION_SYNC_LITERALS）。',
        });
      }
      continue;
    }

    ctx.report({
      check: 'version-drift',
      severity: literalSeverity(entry),
      type: 'version-literal-not-found',
      file: entry.file,
      line: 1,
      target: entry.label,
      message: `同步清单「${entry.label}」既没有 regex 也没有 jsonPath，无法定位版本字面量。`,
      hint: '给该条目补上 regex 或 jsonPath。',
    });
  }
}

/** 同步清单条目的严重级（只有显式 warning 才降级，其余一律 error）。 */
function literalSeverity(entry) {
  return entry.severity === 'warning' ? 'warning' : 'error';
}

/**
 * 从被引用脚本的**源码文本**里取「期望值」：
 *   kind='version'（默认）→ 该脚本的 TOOL_VERSION（带 `v` 前缀，与文档里的写法一致）
 *   kind='count'          → 该脚本 CHECK_TITLES 的顶层条目数（即 --help 的编号项数）
 * 取不到 → 返回 { error }，调用方必须报 error：拿不到期望值就不能说「没问题」。
 *
 * 为什么解析源码而不是 `require()` 那个脚本（实测教训，别改回去）：
 *   这些脚本文件末尾直接顶层调用 `main(...)`，**require 会真的把它跑起来**——实测一次
 *   `require('./scripts/check-file-ledger.cjs')` 触发了整轮引用完整性扫描并把报告打到 stdout；
 *   而且它们并未 `module.exports` 出 CHECK_TITLES。所以这里只读源码文本，
 *   数 `CHECK_TITLES` 的顶层 `'<id>':` 行。
 * 代价（写在这里，别让读者误以为它万能）：它假定 CHECK_TITLES 是「两个空格缩进 + `'<id>':`
 *   开头、一个一行」的写法——本仓库两个脚本都是这个风格；若哪天改成一行式或换缩进，
 *   这里会数出 0 并**报 error**（fail-closed，不会静默变绿）。
 */
function expectedCitationValue(fromRel, kind, source) {
  if (kind === 'count') {
    const start = source.indexOf('const CHECK_TITLES = {');
    if (start === -1) {
      return { error: `${fromRel} 里找不到 \`const CHECK_TITLES = {\`，无法数出检查项数。` };
    }
    const end = source.indexOf('\n};', start);
    if (end === -1) {
      return { error: `${fromRel} 里 CHECK_TITLES 的结尾（换行 + \`};\`）找不到，无法数出检查项数。` };
    }
    const body = source.slice(start, end);
    const count = (body.match(/^ {2}'[a-z0-9-]+':/gm) || []).length;
    if (count === 0) {
      return { error: `${fromRel} 的 CHECK_TITLES 里没数到任何条目，无法得出检查项数。` };
    }
    return { value: String(count) };
  }
  const m = /TOOL_VERSION\s*=\s*'([^']+)'/.exec(source);
  if (!m) {
    return { error: `${fromRel} 里找不到 \`TOOL_VERSION = '<x>'\`，无法得出脚本版本。` };
  }
  return { value: `v${m[1]}` };
}

/**
 * 文档 / CI 注释里引用的「脚本自身版本」或「脚本检查项数」必须等于实现里的真值。
 * 归入既有 check id `version-drift`（同为「需要保持同步的字面量」一族），因此不新增检查项、
 * 也不改变 CHECK_TITLES 的规模（--help 编号 / summary.checks 顺序保持不变）。
 *
 * fail-closed 三连（与 checkVersionLiterals 同构，任一不成立都报 error，绝不静默跳过）：
 *   ① 被引用的脚本不在 git 索引（被删/改名）或读不到 → error；
 *   ② 从脚本里取不到期望值（没有 TOOL_VERSION / 数不出 CHECK_TITLES）→ error；
 *   ③ 引用正则一处都没命中 → error（正则失效或那句引用被删；「找不到」≠「一致」）。
 * 另：同一文案里出现多处引用时**每一处都要查**（total 计数），只取首个匹配会被
 * 「前面写对、后面写错」绕过——这正是 checkOneVersionLiteral 当年踩过的坑。
 *
 * **计数条目的已知边界（写在实现里，别让读者误以为它万能）**：
 *   它断言的是「顶层**类数**」，即 `CHECK_TITLES` 的 key 数（= `--help` 的编号项数）。
 *   它**管不到**「某一类内部的覆盖范围条数」（例如 version-drift 里 `VERSION_SYNC_LITERALS`
 *   的 8 条、`SCRIPT_VERSION_CITATIONS` 的 8 条）。那些条数散落在 CONTRIBUTING.md 的散文里，
 *   **目前仍靠人工同步**——CONTRIBUTING 已就此写明。
 */
function checkScriptVersionCitations(ctx) {
  for (const entry of SCRIPT_VERSION_CITATIONS) {
    if (!ctx.trackedSet.has(entry.from)) {
      ctx.report({
        check: 'version-drift',
        severity: 'error',
        type: 'version-citation-source-missing',
        file: entry.from,
        line: 1,
        target: entry.label,
        message: `脚本字面量引用「${entry.label}」的被引用脚本不在 git 索引里（被删除/改名/从未 add？）：${entry.from}`,
        hint: '脚本改名后请同步更新 SCRIPT_VERSION_CITATIONS 的 from 字段。',
      });
      continue;
    }
    const source = readText(ctx, entry.from);
    if (source === null) {
      const failure = readFailure(ctx, entry.from);
      if (failure) reportReadFailure(ctx, entry.from, failure, 'error');
      else {
        ctx.report({
          check: 'guard-unavailable',
          severity: 'error',
          type: 'guard-unavailable',
          file: entry.from,
          line: 1,
          target: entry.label,
          message: `脚本字面量引用「${entry.label}」的被引用脚本读不到，无法取得期望值：${entry.from}`,
        });
      }
      continue;
    }
    const expectedResult = expectedCitationValue(entry.from, entry.kind, source);
    if (expectedResult.error) {
      ctx.report({
        check: 'version-drift',
        severity: 'error',
        type: 'version-citation-source-missing',
        file: entry.from,
        line: 1,
        target: entry.label,
        message: `${expectedResult.error}脚本字面量引用「${entry.label}」无从校验。`,
        hint: '期望值必须来自实现本身：版本取 TOOL_VERSION，计数取 CHECK_TITLES 的顶层条目数。',
      });
      continue;
    }
    const expected = expectedResult.value;

    if (!ctx.trackedSet.has(entry.file)) {
      ctx.report({
        check: 'version-drift',
        severity: 'error',
        type: 'version-citation-target-missing',
        file: entry.file,
        line: 1,
        target: entry.label,
        message: `脚本字面量引用「${entry.label}」所在的文件不在 git 索引里：${entry.file}`,
      });
      continue;
    }
    const text = readText(ctx, entry.file);
    if (text === null) {
      const failure = readFailure(ctx, entry.file);
      if (failure) reportReadFailure(ctx, entry.file, failure, 'error');
      else {
        ctx.report({
          check: 'guard-unavailable',
          severity: 'error',
          type: 'guard-unavailable',
          file: entry.file,
          line: 1,
          target: entry.label,
          message: `脚本字面量引用「${entry.label}」所在的文件读不到：${entry.file}`,
        });
      }
      continue;
    }

    // 行迭代：lineStart 是原文里的精确偏移（CRLF 也不会让列号漂移）。
    const lineRe = /.*(?:\r\n|\n|\r|$)/g;
    const drifts = [];
    let total = 0;
    let lm;
    while ((lm = lineRe.exec(text)) !== null) {
      if (lm[0] === '') break; // 末尾空匹配
      const lineStart = lm.index;
      const rawLine = lm[0].replace(/\r?\n$|\r$/, '');
      // 与 checkOneVersionLiteral 相反的取舍：本机制**只认注释行**（引用就写在注释里）。
      // 例外：CONTRIBUTING.md 不是代码，整行都是正文，没有「注释行」概念，按普通行匹配。
      if (entry.file.endsWith('.yml') && !isCommentLine(rawLine, entry.file)) continue;
      const flags = entry.regex.flags.includes('g') ? entry.regex.flags : `${entry.regex.flags}g`;
      const re = new RegExp(entry.regex.source, flags);
      let m;
      while ((m = re.exec(rawLine)) !== null) {
        if (m[0] === '') {
          re.lastIndex += 1;
          continue;
        }
        total += 1;
        if (m[1] !== expected) drifts.push({ value: m[1], index: lineStart + m.index });
      }
    }

    if (total === 0) {
      ctx.report({
        check: 'version-drift',
        severity: 'error',
        type: 'version-citation-not-found',
        file: entry.file,
        line: 1,
        target: entry.label,
        message: `脚本字面量引用「${entry.label}」在 ${entry.file} 里定位不到（正则失效，或这句引用被删/改写了）。`,
        hint: `期望值 = ${entry.from} 的${entry.kind === 'count' ? ' `CHECK_TITLES` 条目数' : ' `TOOL_VERSION`'}（唯一事实来源）；改实现时要同步改这里。`,
      });
      continue;
    }

    for (const drift of drifts) {
      const pos = positionAt(ctx, entry.file, text, drift.index);
      ctx.report({
        check: 'version-drift',
        severity: 'error',
        type: 'version-drift',
        file: entry.file,
        line: pos.line,
        column: pos.column,
        target: drift.value,
        message: `${entry.label} = ${drift.value}，但 ${entry.from} 的${entry.kind === 'count' ? ' `CHECK_TITLES` 条目数' : ' `TOOL_VERSION`'} = ${expected} 不一致（应为 ${expected}）。`,
        hint: '脚本版本号 / 检查项数与其在文档、CI 注释里的引用必须同步（数量、编号、覆盖范围三处）。',
      });
    }
  }
}

/**
 * 校验一条「正则型」版本同步条目：**收集全部匹配**，要求每一个都等于 package.json > version。
 * 历史教训：旧实现用 regex.exec 只取首个匹配，于是一行注释（`// version: '0.8.0'`）或任意
 * 靠前的正确字面量就能让真实漂移判绿——一行注释即可绕过门禁。
 * 现在：注释行整体排除（isCommentLine），其余每行用带 /g 的副本取全部匹配；
 * 只要有一个不等于期望值就报 error，且报的是**那个真正漂移的字面量**的位置（不是首个匹配的位置）。
 */
function checkOneVersionLiteral(ctx, entry, text, expected) {
  // 用「行 + 行终止符」迭代，保证 lineStart 是原文里的精确偏移（CRLF 也不会让列号漂移）。
  const lineRe = /.*(?:\r\n|\n|\r|$)/g;
  let total = 0;
  const drifts = [];
  let lm;

  while ((lm = lineRe.exec(text)) !== null) {
    if (lm[0] === '') break; // 末尾空匹配
    const lineStart = lm.index;
    const rawLine = lm[0].replace(/\r?\n$|\r$/, '');
    if (isCommentLine(rawLine, entry.file)) continue;
    // 每条目自带正则、可能带 g：复制一份避免 lastIndex 在多次调用间泄漏。
    const flags = entry.regex.flags.includes('g') ? entry.regex.flags : `${entry.regex.flags}g`;
    const re = new RegExp(entry.regex.source, flags);
    let m;
    while ((m = re.exec(rawLine)) !== null) {
      if (m[0] === '') {
        re.lastIndex += 1;
        continue;
      }
      total += 1;
      if (m[2] !== expected) drifts.push({ value: m[2], index: lineStart + m.index });
    }
  }

  if (total === 0) {
    ctx.report({
      check: 'version-drift',
      severity: literalSeverity(entry),
      type: 'version-literal-not-found',
      file: entry.file,
      line: 1,
      target: entry.label,
      message: `同步清单「${entry.label}」在 ${entry.file} 里定位不到版本字面量（正则失效，或字面量只出现在注释里）。`,
      hint:
        '同步清单写死了定位方式而非行号；如果源码结构变了，请更新 VERSION_SYNC_LITERALS 里的 regex。' +
        '注意注释行不参与匹配：把版本字面量写进注释不算同步。',
    });
    return;
  }

  for (const drift of drifts) {
    const pos = positionAt(ctx, entry.file, text, drift.index);
    ctx.report({
      check: 'version-drift',
      severity: literalSeverity(entry),
      type: 'version-drift',
      file: entry.file,
      line: pos.line,
      column: pos.column,
      target: drift.value,
      dedupeKey: `version-drift::${entry.file}:${pos.line}:${pos.column}:${drift.value}`,
      message: `${entry.label} = ${drift.value}，与 package.json > version = ${expected} 不一致（该文件共 ${total} 处版本字面量，必须全部等于当前版本）。`,
      hint: '改任一处后必须同步另一处；本检查收集全部匹配（含同一文件里的多处声明），注释行除外。',
    });
  }
}

// ---------------------------------------------------------------------------
// 检查 3：文档里的本地安装包文件名（跟版本走）
// ---------------------------------------------------------------------------
/**
 * 为什么单列一项：README 里 `npm install --save-dev /absolute/path/promptmanager-code-normify-<版本>.tgz`
 * 是用户照着敲的命令。版本升级时只改 package.json、忘了改这行，用户就会拿着旧包安装——
 * 0.7.0 的事故正是「同一个版本号下 tarball 与源码行为不一致」，命令行里的版本号必须跟着版本走。
 * 只看确定性的一类文本（固定字符串 + 三种文档扩展名、非历史文体），不做启发式猜测。
 */
const TARBALL_NAME_RE = /promptmanager-code-normify-(\d+\.\d+\.\d+)\.tgz/g;

/** 历史版本名在以下文档里是「当时的事实」，不做漂移断言。 */
const HISTORICAL_VERSION_DOC = /^(CHANGELOG\.md|docs\/RELEASE-[^/]*\.md)$/;

/** 哪些文件里的 tarball 名要跟着当前版本走（排除历史文体）。 */
function isLiveVersionDoc(rel) {
  if (HISTORICAL_VERSION_DOC.test(rel)) return false;
  return /\.md$/i.test(rel);
}

function checkTarballNames(ctx) {
  const parsed = readJson(ctx, 'package.json');
  if (parsed.error) return; // package.json 读不了时 checkVersionLiterals 已报错
  const expected = `promptmanager-code-normify-${parsed.value.version}.tgz`;

  for (const rel of ctx.textFiles) {
    if (!isLiveVersionDoc(rel)) continue;
    const text = readTextOrReport(ctx, rel);
    if (text === null) continue;
    for (const m of text.matchAll(TARBALL_NAME_RE)) {
      if (m[0] === expected) continue;
      const pos = positionAt(ctx, rel, text, m.index);
      ctx.report({
        check: 'tarball-version-drift',
        severity: 'error',
        type: 'tarball-name-drift',
        file: rel,
        line: pos.line,
        column: pos.column,
        target: m[0],
        message: `文档写的本地安装包是 ${m[0]}，但当前 package.json > version = ${parsed.value.version}，\`npm pack\` 产出的是 ${expected}。`,
        hint: '让用户照着敲的安装命令必须指向本次打包产物：同步改成本次版本的文件名。',
      });
    }
  }
}

// ---------------------------------------------------------------------------
// 检查 4：测试脚本清单一致性
// ---------------------------------------------------------------------------

function checkTestInventory(ctx) {
  const parsed = readJson(ctx, 'package.json');
  if (parsed.error) return;
  const scripts = parsed.value.scripts && typeof parsed.value.scripts === 'object' ? parsed.value.scripts : {};
  const allText = Object.values(scripts)
    .filter((v) => typeof v === 'string')
    .join('\n');
  const testFiles = ctx.tracked.filter((rel) => /^tests\/.+\.(mjs|cjs|js)$/.test(rel));

  // (a) script 里引用的 tests/xxx 必须存在（与悬空引用检查共用 dedupeKey，不重复报）。
  for (const m of allText.matchAll(/node\s+(tests\/[^\s"'&|;]+)/g)) {
    const target = path.posix.normalize(m[1]);
    if (pathState(ctx, target) === 'ok') continue;
    ctx.report({
      check: 'test-inventory',
      severity: 'error',
      type: 'test-script-missing',
      file: 'package.json',
      line: positionOfJsonKey(ctx, readText(ctx, 'package.json') || '', 'package.json', 'test')?.line || 1,
      target,
      resolved: target,
      dedupeKey: `package.json::${target}`,
      message: `package.json 的 script 引用了不存在的测试文件：${target}`,
      hint: '测试文件被删除/重命名后，scripts 里的引用必须同步更新。',
    });
  }

  // (b) tests/ 下存在但没有任何 script 引用 → warning（通常是漏挂）。
  for (const rel of testFiles) {
    if (allText.includes(rel)) continue;
    ctx.report({
      check: 'test-inventory',
      severity: 'warning',
      type: 'unreferenced-test-file',
      file: rel,
      line: 1,
      target: rel,
      message: `测试文件存在但没有任何 package.json script 引用它：${rel}`,
      hint: '通常意味着漏挂（把它加进 npm test / 专用 script），确认是有意保留的辅助文件时可忽略本条 warning。',
    });
  }
}

// ---------------------------------------------------------------------------
// 检查 4：指向已删除文件的引用
// ---------------------------------------------------------------------------

function checkDeletedReferences(ctx) {
  let deleted = [];
  try {
    const raw = execGit(ctx.root, ['log', '--diff-filter=D', '--name-only', '--pretty=format:']);
    deleted = [...new Set(raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))];
  } catch (err) {
    ctx.report({
      check: 'deleted-reference',
      severity: 'error',
      type: 'guard-unavailable',
      file: '.',
      line: 1,
      target: 'git log --diff-filter=D',
      message: `无法获取历史删除清单：${err.message}`,
    });
    return;
  }

  // 浅克隆（actions/checkout 默认 fetch-depth: 1）拿不到删除历史，本项检查会静默失效。
  // 与其假绿，不如把盲区显式报出来（warning，不阻塞；补 fetch-depth: 0 即消失）。
  if (isShallowRepo(ctx)) {
    ctx.report({
      check: 'deleted-reference',
      severity: 'warning',
      type: 'shallow-clone-history-unavailable',
      file: '.',
      line: 1,
      target: 'git-history',
      message: `当前是浅克隆（git rev-parse --is-shallow-repository = true），只能看到 ${deleted.length} 条历史删除路径，「指向已删除文件」检查在本次运行中不完整。`,
      hint: '在 actions/checkout 步骤加 `with: fetch-depth: 0` 可让该检查在 CI 里完整生效。',
    });
  }

  // 只关注「删了而且现在仍然不在工作区」的路径（删了又加回来的不算残留）。
  const stillDeleted = deleted.filter((rel) => !ctx.trackedSet.has(rel) && !fs.existsSync(absOf(ctx.root, rel)));
  ctx.stats.deletedPaths = stillDeleted.length;
  if (stillDeleted.length === 0) return;

  const byBasename = new Map();
  for (const rel of stillDeleted) {
    const base = path.posix.basename(rel);
    if (!byBasename.has(base)) byBasename.set(base, []);
    byBasename.get(base).push(rel);
  }

  for (const rel of ctx.textFiles) {
    if (SELF_EXCLUDED_FILES.has(rel)) continue;
    const text = readTextOrReport(ctx, rel);
    if (text === null) continue;
    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line) continue;
      const reportedPaths = new Set();

      for (const deletedPath of stillDeleted) {
        const idx = line.indexOf(deletedPath);
        if (idx === -1) continue;
        reportedPaths.add(deletedPath);
        const violation = {
          check: 'deleted-reference',
          severity: 'error',
          type: 'deleted-file-reference',
          file: rel,
          line: i + 1,
          column: idx + 1,
          target: deletedPath,
          message: `引用了 git 历史中已删除的文件：${deletedPath}`,
        };
        const allow = matchAllowlist(rel, deletedPath);
        if (allow) {
          ctx.suppress(violation, allow.reason);
          continue;
        }
        ctx.report(violation);
      }

      // 次级线索：basename 命中（同一行已经报过完整路径就不再重复）。
      for (const [base, owners] of byBasename) {
        if (base.length < 4) continue;
        const idx = line.indexOf(base);
        if (idx === -1) continue;
        if (owners.some((owner) => reportedPaths.has(owner))) continue;
        const violation = {
          check: 'deleted-reference',
          severity: 'warning',
          type: 'deleted-file-basename-mention',
          file: rel,
          line: i + 1,
          column: idx + 1,
          target: base,
          message: `提到了已删除文件的文件名 ${base}（完整路径：${owners.join(', ')}）——次级线索，可能是路径写错或残留提及。`,
        };
        const allow = matchAllowlist(rel, owners[0]);
        if (allow) {
          ctx.suppress(violation, allow.reason);
          continue;
        }
        ctx.report(violation);
      }
    }
  }
}

/** 判断是否浅克隆；命令不可用（老版本 git）时返回 false，不干扰主流程。 */
function isShallowRepo(ctx) {
  try {
    return execGit(ctx.root, ['rev-parse', '--is-shallow-repository']).trim() === 'true';
  } catch {
    return false;
  }
}

function matchAllowlist(referencingFile, deletedPath) {
  for (const entry of DELETED_REFERENCE_ALLOWLIST) {
    const fileOk = entry.file.includes('*') ? globToRegExp(entry.file).test(referencingFile) : entry.file === referencingFile;
    if (!fileOk) continue;
    if (entry.deleted === '*' || entry.deleted === deletedPath) return entry;
  }
  return null;
}

// ---------------------------------------------------------------------------
// 检查 5：引用了「磁盘上有、git 索引里没有」的路径（未跟踪的新文件）
// ---------------------------------------------------------------------------
/**
 * 为什么需要这一项（假绿根因）：
 *   其它检查、以及 tsc / node / npm pack，都以「磁盘上是否存在」判断目标可用性。于是一个
 *   从未 `git add` 的新文件会让本地全绿；而 `git commit -am` 只暂存已跟踪文件的改动，一次
 *   常规提交就会把断链写进历史——CI 的 `npm run build` 报 TS2307、clone 出来的树运行时
 *   ERR_MODULE_NOT_FOUND、连门禁脚本自己都找不到（这正是本仓库真实发生过的事）。
 *   所以「目标是否合法」必须以 git 索引（git ls-files）为权威，而不是磁盘存在性。
 *
 * 覆盖的引用来源（引用方本身已被跟踪，否则不构成「提交即断链」）：
 *   1. 源码里的相对 import / export 说明符（含动态 import 与 require），并按 TS 的 ESM 规则
 *      把 `./x.js` 映射回 `./x.ts` / `./x.d.ts` 一起判断；
 *   2. package.json 的 main / types / module / browser / bin / exports / files 与 script 里的 `node <路径>`；
 *   3. .github/workflows/*.yml 的 run: 里的 `node <路径>`；
 *   4. Markdown 里的仓库内相对链接 / 图片。
 *
 * 分级（不改动既有检查的语义与退出码约定）：
 *   - 磁盘上有、索引里没有、也不被忽略规则覆盖 → error（本该 `git add`）；
 *   - 磁盘上有、但被 .gitignore 等忽略规则覆盖（node_modules/、构建临时物）→ 跳过并计数；
 *   - 哪里都不存在 → 不在本检查范围（沿用既有检查各自的语义，由它们报或跳过）；
 *   - 无法判定（嵌套 git 仓库 / 稀疏检出等）→ 跳过并计数，绝不静默吞掉。
 */

function checkUntrackedReferences(ctx, resolvedSpecifiers) {
  if (ctx.untrackedError) {
    // 宁可红也不要假绿：拿不到「索引 vs 磁盘」的差集时，这一项检查形同虚设。
    ctx.report({
      check: 'untracked-reference',
      severity: 'error',
      type: 'guard-unavailable',
      file: '.',
      line: 1,
      target: 'git ls-files --others',
      message: ctx.untrackedError,
      hint: '本检查依赖 `git ls-files --others [--ignored]`（索引与磁盘的差集）；请在完整 git checkout 中运行。',
    });
    return;
  }

  checkUntrackedModuleSpecifiers(ctx, resolvedSpecifiers || []);
  checkUntrackedPackageJson(ctx);
  checkUntrackedWorkflowRefs(ctx);
  checkUntrackedMarkdownLinks(ctx);
}

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
 * 返回 [{ spec, index }]（index 为文件内字符偏移，用于定位行列）。
 */
function collectSpecifiersWithTypescript(ts, rel, text) {
  const source = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, scriptKindFor(ts, rel));
  const out = [];

  const pushLiteral = (node) => {
    if (!node || !ts.isStringLiteralLike(node)) return;
    out.push({ spec: node.text, index: node.getStart(source) });
  };
  const importLikeCall = (node) => {
    if (!ts.isCallExpression(node) || node.arguments.length === 0) return false;
    const callee = node.expression;
    if (callee.kind === ts.SyntaxKind.ImportKeyword) return true; // import('./x.js')
    // require('./x.js')：只认不带属性的裸 require 调用。
    return ts.isIdentifier(callee) && callee.text === 'require';
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node)) pushLiteral(node.moduleSpecifier);
    else if (ts.isExportDeclaration(node)) pushLiteral(node.moduleSpecifier);
    else if (importLikeCall(node)) pushLiteral(node.arguments[0]);
    ts.forEachChild(node, visit);
  };
  visit(source);
  out.sort((a, b) => a.index - b.index);
  return out;
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

/** 降级实现：在掩码后的源码上找 import/export/require 的起始关键字位置。 */
function collectSpecifiersWithRegex(text) {
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
    out.push({ spec: value, index: j + 1 });
    MODULE_SPECIFIER_FALLBACK.lastIndex = k + 1;
  }
  return out;
}

/** 抽取一个源码文件里全部模块说明符（含裸模块名；由调用方筛掉非相对说明符）。 */
function collectModuleSpecifiers(ctx, ts, rel) {
  const text = readTextOrReport(ctx, rel);
  if (text === null) return [];
  return ts ? collectSpecifiersWithTypescript(ts, rel, text) : collectSpecifiersWithRegex(text);
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

// ---------------------------------------------------------------------------
// 检查 6：相对说明符指向根本不存在的文件（悬空模块说明符）
// ---------------------------------------------------------------------------
/**
 * 为什么单列一项（覆盖面空洞，比其它失败开放更严重）：
 *   悬空类检查原先只有 5 种目标类型——Markdown 链接、package.json 字段、script、
 *   CI run: 目标、历史删除路径——**没有 module-specifier**；而「未跟踪引用」只在
 *   「目标在磁盘上存在」时才判，目标不存在就直接丢弃。于是
 *   `import { z } from './nope.js'`、`export { q } from './nope2.js'`、
 *   `require('./nope3.js')`、`import './nope4.js'` 全部指向不存在的文件时，
 *   门禁 EXIT 0，而且连计数都没有（unresolvedModuleSpecifiers 只是个统计口径）。
 *   这类残留本地跑得起来才怪，但如果目标是被 `tsc` 之后才生成的（或纯类型路径），
 *   它会在 CI 上以 TS2307 / ERR_MODULE_NOT_FOUND 的形式炸掉。
 *
 * 与 untracked-reference 的分工（同一份 resolveRelativeSpecifier 判定，二者互斥）：
 *   目标**根本不存在**（磁盘上没有）        → 本检查（dangling-module-specifier，error）
 *   目标**存在但不在 git 索引里**           → untracked-reference（untracked-file-reference，error）
 *   目标被忽略规则覆盖                      → 跳过并逐条列出（不报）
 */
function checkDanglingModuleSpecifiers(ctx) {
  const ts = loadTypeScript();
  const resolvedSpecifiers = [];
  forEachRelativeSpecifier(ctx, ts, (item) => {
    const { rel, spec, index, text, resolution } = item;
    resolvedSpecifiers.push(item);
    if (resolution.kind === 'tracked') return;
    if (resolution.kind === 'ignored') {
      const pos = positionAt(ctx, rel, text, index);
      noteIgnoredRef(ctx, { file: rel, line: pos.line, target: spec, resolved: resolution.candidate, source: '相对 import/export 说明符' });
      return;
    }
    if (resolution.kind === 'ambiguous') {
      ctx.stats.ambiguousTargets += 1;
      return;
    }
    if (resolution.kind === 'untracked') return; // 由检查 5 报，避免重复

    if (resolution.kind === 'case-mismatch') {
      // 大小写不一致：Windows 能过、Linux 会挂。既有的大小写检查只覆盖 Markdown/包字段，
      // 说明符这条路径此前无人负责，这里按同一个 type 报出。
      const pos = positionAt(ctx, rel, text, index);
      ctx.report({
        check: 'dangling-module-specifier',
        severity: 'error',
        type: 'path-case-mismatch',
        file: rel,
        line: pos.line,
        column: pos.column,
        target: spec,
        resolved: resolution.candidate,
        dedupeKey: `spec-case::${rel}:${resolution.candidate}`,
        message: `相对说明符 ${spec} 的大小写与仓库实际路径不一致：${resolution.candidate}`,
        hint: 'Windows 上能解析、Linux CI 上会挂；按实际路径改大小写。',
      });
      return;
    }

    const pos = positionAt(ctx, rel, text, index);
    ctx.stats.danglingModuleSpecifiers += 1;
    ctx.report({
      check: 'dangling-module-specifier',
      severity: 'error',
      type: 'dangling-module-specifier',
      file: rel,
      line: pos.line,
      column: pos.column,
      target: spec,
      resolved: resolution.candidate,
      dedupeKey: `dangling-spec::${rel}:${spec}`,
      message: `相对 import/export 说明符指向根本不存在的文件：${spec}（试过 ${moduleSpecifierCandidates(rel, spec).slice(0, 4).join('、')} …）`,
      hint:
        '磁盘上不存在这个目标（不是「存在但没 git add」——那种情况由 untracked-reference 报）。' +
        '修法：把目标文件建出来/改正说明符；若它应当由构建生成，说明它不该被源码相对引用。',
    });
  });
  return resolvedSpecifiers;
}

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

/** 统一报告「引用了未纳入 git 索引的路径」。 */
function reportUntrackedReference(ctx, { file, line, column, target, resolved, source }) {
  ctx.stats.untrackedTargets += 1;
  ctx.report({
    check: 'untracked-reference',
    severity: 'error',
    type: 'untracked-file-reference',
    file,
    line: line || 1,
    column: column || 1,
    target,
    resolved,
    dedupeKey: `untracked::${file}:${line || 1}:${resolved}`,
    message: `${source} 引用了「磁盘上有、却不在 git 索引里」的路径：${resolved}`,
    hint:
      `引用方 ${file} 已被 git 跟踪，目标却没有：clean checkout / CI 上这里必定断链` +
      `（TS2307 / ERR_MODULE_NOT_FOUND / 404），而本机因为磁盘上有它而全绿。` +
      `若它应当被跟踪：git add ${resolved}；若本应忽略：把规则补进 .gitignore（它当前不在任何忽略规则覆盖范围内）。`,
  });
}

/**
 * 来源 1：源码里的相对 import / export 说明符（未跟踪那一半）。
 * 说明符抽取与状态判定都由 checkDanglingModuleSpecifiers 用同一份结果提供，
 * 保证「不存在 → 悬空」与「存在但没 add → 未跟踪」两种归宿互斥、不重复报。
 */
function checkUntrackedModuleSpecifiers(ctx, specifierResults) {
  for (const { rel, spec, index, text, resolution } of specifierResults) {
    if (resolution.kind !== 'untracked') continue;
    const pos = positionAt(ctx, rel, text, index);
    reportUntrackedReference(ctx, {
      file: rel,
      line: pos.line,
      column: pos.column,
      target: spec,
      resolved: resolution.candidate,
      source: '相对 import/export 说明符',
    });
  }
}

/** 来源 2：package.json 的路径字段与 script 里的 `node <路径>`。 */
function checkUntrackedPackageJson(ctx) {
  const rel = 'package.json';
  if (!ctx.trackedSet.has(rel)) return;
  const parsed = readJson(ctx, rel);
  if (parsed.error) return; // 解析失败由既有检查报，不重复
  const pkg = parsed.value;
  const text = readTextOrReport(ctx, rel) || '';

  for (const { field, target } of collectPackageFieldTargets(pkg)) {
    if (typeof target !== 'string' || !target) continue;
    const normalized = path.posix.normalize(target.replace(/^\.\//, ''));
    if (normalized === '.' || normalized.startsWith('..')) continue;
    const resolved = globIndexState(ctx, normalized);
    if (resolved.state === 'ignored') {
      noteIgnoredRef(ctx, {
        file: rel,
        line: positionOfJsonKey(ctx, text, rel, field.split(/[.[]/)[0])?.line || 1,
        target,
        resolved: resolved.path,
        source: `package.json > ${field}`,
      });
      continue;
    }
    if (resolved.state !== 'untracked') {
      if (resolved.state === 'ambiguous') ctx.stats.ambiguousTargets += 1;
      continue;
    }
    const pos = positionOfJsonKey(ctx, text, rel, field.split(/[.[]/)[0]);
    reportUntrackedReference(ctx, {
      file: rel,
      line: pos ? pos.line : 1,
      column: pos ? pos.column : 1,
      target,
      resolved: resolved.path,
      source: `package.json > ${field}`,
    });
  }

  const scripts = pkg.scripts && typeof pkg.scripts === 'object' ? pkg.scripts : {};
  for (const [name, command] of Object.entries(scripts)) {
    if (typeof command !== 'string') continue;
    for (const target of extractNodeTargets(command)) {
      const normalized = path.posix.normalize(target.replace(/^\.\//, ''));
      if (normalized.startsWith('..') || path.posix.isAbsolute(normalized)) continue;
      const state = indexPathState(ctx, normalized);
      const pos = positionOfJsonKey(ctx, text, rel, name) || positionOfJsonKey(ctx, text, rel, 'scripts');
      if (state === 'ignored') {
        noteIgnoredRef(ctx, { file: rel, line: pos ? pos.line : 1, target, resolved: normalized, source: `package.json > scripts["${name}"]` });
        continue;
      }
      if (state !== 'untracked') {
        if (state === 'ambiguous') ctx.stats.ambiguousTargets += 1;
        continue;
      }
      reportUntrackedReference(ctx, {
        file: rel,
        line: pos ? pos.line : 1,
        column: pos ? pos.column : 1,
        target,
        resolved: normalized,
        source: `package.json > scripts["${name}"]`,
      });
    }
  }
}

/** 来源 3：.github/workflows/*.yml 的 run: 里的 `node <路径>`。 */
function checkUntrackedWorkflowRefs(ctx) {
  const workflows = ctx.tracked.filter(
    (rel) => path.posix.dirname(rel) === WORKFLOW_DIR && /\.ya?ml$/i.test(rel),
  );

  for (const rel of workflows) {
    const text = readTextOrReport(ctx, rel);
    if (text === null) continue;

    for (const { line, text: bodyText } of collectWorkflowRunLines(text)) {
      if (!bodyText) continue;
      for (const target of extractNodeTargets(bodyText)) {
        const normalized = path.posix.normalize(target.replace(/^\.\//, ''));
        if (normalized.startsWith('..')) continue;
        const state = indexPathState(ctx, normalized);
        const column = bodyText.indexOf(target) + 1;
        if (state === 'ignored') {
          noteIgnoredRef(ctx, { file: rel, line, target, resolved: normalized, source: 'CI run: 里的 node 入口' });
          continue;
        }
        if (state !== 'untracked') {
          if (state === 'ambiguous') ctx.stats.ambiguousTargets += 1;
          continue;
        }
        reportUntrackedReference(ctx, {
          file: rel,
          line,
          column,
          target,
          resolved: normalized,
          source: 'CI run: 里的 node 入口',
        });
      }
    }
  }
}

/** 来源 4：Markdown 里的仓库内相对链接 / 图片（含引用式链接定义行，见 forEachMarkdownLink）。 */
function checkUntrackedMarkdownLinks(ctx) {
  for (const rel of ctx.tracked) {
    if (path.posix.extname(rel).toLowerCase() !== '.md') continue;

    forEachMarkdownLink(
      ctx,
      rel,
      ({ target, resolved, line, column }) => {
        const state = indexPathState(ctx, resolved);
        if (state === 'ignored') {
          noteIgnoredRef(ctx, { file: rel, line, target, resolved, source: 'Markdown 链接/图片' });
          return;
        }
        if (state === 'ambiguous') {
          ctx.stats.ambiguousTargets += 1;
          return;
        }
        if (state !== 'untracked') return;

        reportUntrackedReference(ctx, {
          file: rel,
          line,
          column,
          target,
          resolved,
          source: 'Markdown 链接/图片',
        });
      },
      { countSkips: false },
    );
  }
}

// ---------------------------------------------------------------------------
// 检查 6：Markdown 链接的 #fragment 是否命中目标文件的真实标题
// ---------------------------------------------------------------------------
/**
 * 为什么需要这一项（假绿根因）：
 *   检查 1a 只校验「目标文件是否存在」。于是 `[README「安装」](../README.md#5-安装)` 这类
 *   「文件还在、章节早被删掉」的链接会被判为通过：点开能打开 README，却落不到任何章节
 *   （在 GitHub 上等同于跳到页面顶部）——比 404 更隐蔽，没人会发现。
 *   本项把「#fragment 必须命中目标文件里真实存在的标题（或其显式 HTML 锚点）」变成门禁。
 *
 * 判定规则（对齐 GitHub 的 heading → id 实现）：
 *   - 标题 id = 标题文本小写 → 去掉所有非「字母/数字/组合标记/连接符」字符（标点与 emoji
 *     一并去掉，CJK 保留、`_` 保留）→ 空格转 `-`；同名标题按出现顺序追加 `-1`、`-2`…；
 *   - 代码围栏（``` / ~~~）内的 `#` 行不是标题；HTML 注释里的标题也不算；
 *   - 显式 HTML 锚点 `<a id="x">` / `<a name="x">`（元素名不限）同样算命中；
 *   - 片段先做 URL 解码再比对；GitHub 锚点图标自带的 `user-content-<id>` 前缀两种写法都算命中；
 *   - 纯锚点链接 `[x](#frag)` 指同文件，一并校验。
 *
 * 分级（不改动既有检查的语义与退出码约定）：
 *   - 片段没命中任何标题/显式锚点 → error；
 *   - 目标不是 Markdown、目标文件本身不存在/读不到（由检查 1a 报）→ 跳过并计数，不重复报；
 *   - 无法可靠判定或确属历史文体的条目 → 走 DEAD_ANCHOR_ALLOWLIST 显式豁免
 *     （每次运行回显命中次数；未被任何锚点命中的条目报 warning）。
 */

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

/** 命中 DEAD_ANCHOR_ALLOWLIST 的哪一条（返回 { entry, index }；未命中返回 null）。 */
function matchAnchorAllowlist(referencingFile, target, fragment) {
  for (let index = 0; index < DEAD_ANCHOR_ALLOWLIST.length; index += 1) {
    const entry = DEAD_ANCHOR_ALLOWLIST[index];
    const fileOk = entry.file.includes('*')
      ? globToRegExp(entry.file).test(referencingFile)
      : entry.file === referencingFile;
    if (!fileOk) continue;
    if (entry.target && entry.target !== '*' && entry.target !== target) continue;
    if (entry.fragment && entry.fragment !== '*' && entry.fragment !== fragment) continue;
    return { entry, index };
  }
  return null;
}

/** 死锚点的修法提示：写清 slug 规则，并给出目标文件里最接近的候选。 */
function anchorHint(anchors, fragment) {
  const head =
    'fragment 必须与目标文件里真实存在的标题 id 完全一致（GitHub 规则：小写、去标点与 emoji、空格转 `-`、' +
    '保留 CJK 与 `_`，重名标题追加 `-1`/`-2`），或命中显式 <a id="…">。';
  const candidates = [...anchors.slugs, ...anchors.explicit];
  if (candidates.length === 0) return `${head} 该文件里没有任何标题，也没有显式 HTML 锚点。`;
  let best = null;
  let bestDistance = Infinity;
  for (const candidate of candidates.slice(0, 500)) {
    const distance = editDistance(candidate, fragment);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return `${head} 最接近的候选：#${best}（编辑距离 ${bestDistance}）。`;
}

function checkDeadAnchors(ctx) {
  for (const rel of ctx.textFiles) {
    if (path.posix.extname(rel).toLowerCase() !== '.md') continue;

    forEachMarkdownLink(
      ctx,
      rel,
      ({ target, fragment, resolved, line, column, sameFile }) => {
        if (!fragment) return; // 没有 #fragment：本项检查不管

        if (!sameFile && pathState(ctx, resolved) !== 'ok') {
          // 目标文件本身不存在（或大小写不一致）：由检查 1a 报，本项不重复报。
          ctx.stats.anchorTargetsUnresolved += 1;
          return;
        }
        if (path.posix.extname(resolved).toLowerCase() !== '.md') {
          // 非 Markdown 目标（代码、JSON…）：没有「标题」概念，无法可靠判定 → 跳过并计数。
          ctx.stats.anchorTargetsNonMarkdown += 1;
          return;
        }

        const anchors = extractHeadingAnchors(ctx, resolved);
        if (anchors.missing) {
          // 目标被 git 跟踪、但磁盘上读不到（例如工作区里被删掉的文件）：不猜，跳过并计数。
          ctx.stats.anchorTargetsUnresolved += 1;
          return;
        }

        ctx.stats.anchorsChecked += 1;
        if (anchorMatches(anchors, fragment)) {
          ctx.stats.anchorsHit += 1;
          if (!anchors.slugs.has(fragment) && anchors.explicit.has(fragment)) ctx.stats.anchorsViaExplicitHtmlId += 1;
          return;
        }

        ctx.stats.anchorsMissed += 1;
        const violation = {
          check: 'dead-anchor',
          severity: 'error',
          type: 'dead-anchor',
          file: rel,
          line,
          column,
          target,
          resolved,
          fragment,
          message: `锚点未命中 ${resolved} 的任何标题：#${fragment}`,
          hint: anchorHint(anchors, fragment) + (sameFile ? ' 本链接是纯锚点，指同文件。' : ''),
        };

        const allow = matchAnchorAllowlist(rel, target, fragment);
        if (allow) {
          ctx.anchorAllowlistHits.set(allow.index, (ctx.anchorAllowlistHits.get(allow.index) || 0) + 1);
          ctx.suppress(violation, allow.entry.reason);
          return;
        }
        ctx.report(violation);
      },
      { countSkips: false, includeSameFileAnchors: true },
    );
  }

  // 豁免清单里没被任何锚点命中的条目 = 过期规则：报 warning（不阻塞门禁）。
  // 否则豁免会一直盖住真残留（「加了豁免就再也没人看」正是这套机制要防的事）。
  DEAD_ANCHOR_ALLOWLIST.forEach((entry, index) => {
    if ((ctx.anchorAllowlistHits.get(index) || 0) > 0) return;
    ctx.report({
      check: 'dead-anchor',
      severity: 'warning',
      type: 'unused-anchor-allowlist-entry',
      file: '.',
      line: 1,
      target: `${entry.file}${entry.target ? ` → ${entry.target}` : ''}`,
      message: `锚点豁免清单第 ${index + 1} 条本次没有任何命中：规则可能已过期，或锚点已被修好。`,
      hint: `理由写的是「${entry.reason}」；确认不再需要就从 scripts/check-references.cjs 的 DEAD_ANCHOR_ALLOWLIST 里删掉。`,
    });
  });
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------

function reportParseError(ctx, file, message) {
  ctx.report({
    check: 'dangling-reference',
    severity: 'error',
    type: 'unparsable-file',
    file,
    line: 1,
    target: file,
    message,
    hint: '本脚本无法解析该文件，相关检查已跳过；先修 JSON 语法。',
  });
}

function severityCounts(ctx) {
  const counts = { error: 0, warning: 0 };
  for (const v of ctx.violations) counts[v.severity] = (counts[v.severity] || 0) + 1;
  return counts;
}

function printHuman(ctx) {
  const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
  const paint = (code, s) => (useColor ? `\u001b[${code}m${s}\u001b[0m` : s);
  const out = [];

  out.push(paint('1', `${TOOL} v${TOOL_VERSION} — 引用完整性门禁`));
  out.push(`仓库根: ${ctx.root}`);
  if (ctx.bootstrapError) out.push(paint('31', `引导失败: ${ctx.bootstrapError}`));
  else {
    out.push(
      `git 跟踪文件: ${ctx.tracked.length} · 参与扫描的文本文件: ${ctx.textFiles.length} · 历史删除路径: ${ctx.stats.deletedPaths || 0}`,
    );
    out.push(
      `跳过: 外部链接 ${ctx.stats.skippedExternal} · 仓库外路径 ${ctx.stats.skippedOutsideRoot} · 允许清单豁免 ${ctx.stats.allowlisted}`,
    );
    out.push(
      `索引外目标: 未跟踪(报 error) ${ctx.stats.untrackedTargets} · 被忽略(跳过) ${ctx.stats.ignoredTargets} · 无法判定(跳过) ${ctx.stats.ambiguousTargets}`,
    );
    out.push(
      `相对说明符: 悬空(报 error) ${ctx.stats.danglingModuleSpecifiers} · 解析模式 ${ctx.analysisMode.mode}${
        ctx.analysisMode.version ? `（typescript ${ctx.analysisMode.version}）` : ''
      }`,
    );
    if (ctx.analysisMode.mode !== 'typescript' && ctx.analysisMode.reason) {
      out.push(paint('33', `  ⚠ 降级解析：${ctx.analysisMode.reason}`));
    }
    out.push(`索引内读失败(报 error): ${ctx.stats.unreadableIndexedFiles}`);
    const anchorAllowHits = DEAD_ANCHOR_ALLOWLIST.reduce(
      (sum, _entry, index) => sum + (ctx.anchorAllowlistHits.get(index) || 0),
      0,
    );
    out.push(
      `锚点校验: 命中 ${ctx.stats.anchorsHit} · 未命中 ${ctx.stats.anchorsMissed} · 其中靠显式 HTML 锚点命中 ${ctx.stats.anchorsViaExplicitHtmlId}`,
    );
    out.push(
      `锚点跳过: 目标非 Markdown ${ctx.stats.anchorTargetsNonMarkdown} · 目标文件不存在/读不到 ${ctx.stats.anchorTargetsUnresolved}`,
    );
    out.push(`锚点豁免清单: ${DEAD_ANCHOR_ALLOWLIST.length} 条规则 · 本次命中 ${anchorAllowHits} 次`);
  }
  out.push('');

  if (ctx.violations.length === 0) {
    out.push(paint('32', '✔ 未发现引用完整性问题。'));
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

  // 被忽略规则覆盖的目标：跳过不报，但逐条列出（文件:行 → 目标 → 命中的忽略规则）。
  if (ctx.ignoredRefs.length > 0) {
    out.push(paint('2', `被忽略规则覆盖、已跳过不报的引用目标 ${ctx.ignoredRefs.length} 条：`));
    for (const entry of ctx.ignoredRefs) {
      out.push(`  · ${entry.file}:${entry.line} -> ${entry.resolved}（来源：${entry.source}）`);
      out.push(`    命中的忽略规则: ${entry.rule || '(未能取得规则原文；目标在 git check-ignore 判定中被忽略)'}`);
    }
    out.push('');
  }

  if (ctx.suppressed.length > 0) {
    out.push(paint('2', `允许清单豁免 ${ctx.suppressed.length} 条：`));
    for (const s of ctx.suppressed) {
      out.push(`  · ${s.file}:${s.line} -> ${s.target}（${s.check}）`);
      out.push(`    理由: ${s.allowlistReason}`);
    }
    out.push('');
  }

  const counts = severityCounts(ctx);
  const summary = `${counts.error} error / ${counts.warning} warning`;
  out.push(counts.error > 0 ? paint('31', `✖ ${summary} —— 门禁未通过`) : paint('32', `✔ ${summary} —— 门禁通过`));

  process.stdout.write(`${out.join('\n')}\n`);
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
      trackedFiles: ctx.tracked.length,
      scannedTextFiles: ctx.textFiles.length,
      deletedPaths: ctx.stats.deletedPaths || 0,
      skippedExternalLinks: ctx.stats.skippedExternal,
      skippedOutsideRoot: ctx.stats.skippedOutsideRoot,
      allowlisted: ctx.stats.allowlisted,
      untrackedTargets: ctx.stats.untrackedTargets,
      ignoredTargetsSkipped: ctx.stats.ignoredTargets,
      ignoredTargetsListed: ctx.ignoredRefs.length,
      ignoredRefsWarned: ctx.stats.ignoredRefsWarned,
      ambiguousTargetsSkipped: ctx.stats.ambiguousTargets,
      unresolvedModuleSpecifiers: ctx.stats.unresolvedModuleSpecifiers,
      danglingModuleSpecifiers: ctx.stats.danglingModuleSpecifiers,
      unreadableIndexedFiles: ctx.stats.unreadableIndexedFiles,
      specifierAnalysis: { mode: ctx.analysisMode.mode, version: ctx.analysisMode.version || null, reason: ctx.analysisMode.reason || null },
      anchorsChecked: ctx.stats.anchorsChecked,
      anchorsHit: ctx.stats.anchorsHit,
      anchorsMissed: ctx.stats.anchorsMissed,
      anchorsViaExplicitHtmlId: ctx.stats.anchorsViaExplicitHtmlId,
      anchorTargetsNonMarkdownSkipped: ctx.stats.anchorTargetsNonMarkdown,
      anchorTargetsUnresolvedSkipped: ctx.stats.anchorTargetsUnresolved,
      deadAnchorAllowlist: DEAD_ANCHOR_ALLOWLIST.map((entry, index) => ({
        rule: index + 1,
        file: entry.file,
        target: entry.target || '*',
        fragment: entry.fragment || '*',
        hits: ctx.anchorAllowlistHits.get(index) || 0,
        reason: entry.reason,
      })),
      checks: Object.keys(CHECK_TITLES),
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
      resolved: v.resolved || null,
      fragment: v.fragment || null,
      message: v.message,
      hint: v.hint || null,
    })),
    suppressed: ctx.suppressed.map((s) => ({
      check: s.check,
      type: s.type,
      file: s.file,
      line: s.line,
      target: s.target,
      allowlistReason: s.allowlistReason,
    })),
    // 被忽略规则覆盖、跳过不报的目标：逐条列出（文件:行 → 目标 → 命中的忽略规则），
    // 不再只给一个 ignoredTargetsSkipped 计数。
    ignoredTargets: ctx.ignoredRefs.map((entry) => ({
      file: entry.file,
      line: entry.line,
      target: entry.target,
      resolved: entry.resolved,
      source: entry.source,
      ignoreRule: entry.rule,
    })),
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main(process.argv.slice(2));
