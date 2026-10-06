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

// 文件级引用解析器（共享内核，唯一事实来源）：纯重构抽取，行为与抽取前逐字节一致。
const {
  createReaderContext,
  SPECIFIER_ANALYSIS,
  absOf,
  globToRegExp,
  readText,
  readFailure,
  readTextOrReport,
  reportReadFailure,
  positionAt,
  pathState,
  globState,
  forEachMarkdownLink,
  collectPackageFieldTargets,
  positionOfJsonKey,
  extractNodeTargets,
  collectWorkflowRunLines,
  extractNpmScriptRefs,
  indexPathState,
  isIgnoredPath,
  globIndexState,
  moduleSpecifierCandidates,
  initSpecifierAnalysis,
  resolveRelativeSpecifier,
  forEachRelativeSpecifier,
  loadTypeScript,
  extractHeadingAnchors,
  anchorMatches,
  editDistance,
} = require('./reference-graph-core.cjs');

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
    '· Markdown 散文里写的 `npm run <script>` / `npm test` 必须真实存在于 package.json > scripts',
    '  （扫描面写死 = git 索引里的全部 *.md，等价 `git ls-files "*.md"`；模板/占位符跳过；见检查 1d）',
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
  {
    file: 'ledger/references.json',
    deleted: '*',
    reason:
      '机器生成的**文件级引用图**：它的内容按构造就是「仓库里所有被引用的路径」（每个节点一个 id、每条边一个 resolved），' +
      '因此必然包含历史删除路径的 basename 字面量——那是**数据**，不是残留提及。' +
      '「引用已删除文件」在图里由 status=dangling + to.state=deleted 表达，比 basename 次级线索精确得多。' +
      '若只想豁免单条，把 deleted 收窄到具体路径即可。',
  },
  {
    file: 'ledger/change-log/*',
    deleted: '*',
    reason:
      '机器生成的**改动记录**（scripts/generate-change-log.cjs 的产物）与它的 README：一条记录就是「这次改动让哪些路径出现/消失/变了状态」的事实，' +
      '它的 files.removed / files.state_changed / affected_referrers 按构造会写出**历史删除路径的原文**——那是**数据**，不是残留提及。' +
      '「谁还在引用被删的东西」在记录里由 affected_referrers[].classification=dangling-target + needs_change 表达。' +
      '若只想豁免单条，把 deleted 收窄到具体路径即可。',
  },
  {
    file: 'docs/DESIGN-code-graph.zh-CN.md',
    deleted: 'docs/VIDEO-SCRIPT.zh-CN.md',
    reason:
      '设计文档 §4.6 用**一次真实删除**（ed404e5）当反例，说明「只比 id 的差会给出一张空表」——被删文件仍被 README 链接，' +
      '于是它仍是节点、边 id 也不变，只有 state / status 变了。那是**历史事实的叙述**（与 CHANGELOG 同一类文体），不是悬挂引用；' +
      '只豁免这一条路径，不放开其它已删除路径。',
  },
];

/**
 * 豁免「指向已删除文件」检查的自身文件。
 * 理由：允许清单与检查逻辑本身不可避免地要写出已删除路径（作为豁免键），
 * 而共享内核（scripts/reference-graph-core.cjs）是从本脚本逐字抽出的同一批解析器与注释
 * （提到 package.json / index.js / README.md 这类文件名是「解析目标」的说明文字），
 * 若把两者纳入扫描，它们会被自己的文本命中，属于结构性自指，不是残留。
 */
const SELF_EXCLUDED_FILES = new Set(['scripts/check-references.cjs', 'scripts/reference-graph-core.cjs']);

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


// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

const relPosix = (p) => p.split(path.sep).join('/');


const isTextFile = (rel) => TEXT_EXTENSIONS.has(path.posix.extname(rel).toLowerCase());


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
    checkMarkdownNpmScriptRefs(ctx);
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
    '读 / 写：',
    '  读：git 索引（`git ls-files`）与其中的文本文件（扫描范围见文末）、package.json、',
    '      .github/workflows/*.yml、git 历史删除清单（`git log --diff-filter=D --name-only`）、',
    '      检查 5 / 6 的同步字面量所在文件；',
    '  写：不写任何文件（结论只走 stdout / stderr；--json 也只写 stdout）。',
    '',
    'check 链位置（npm 脚本 `check` 的实际顺序，环名照抄）：',
    '  第 5 环 `npm run check:refs`（= 本脚本）——前一环是第 4 环 `node ci-contract-check.cjs`，',
    '  后一环是第 6 环 `npm run check:docs`。',
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
  // 读/判定层的字段（root / tracked* / untracked* / ignored* / cache / lineOffsets / readFailures /
  // ignoreCache / anchorCache / violations / stats 基座）由共享内核提供——ctx 契约见
  // scripts/reference-graph-core.cjs 文件头。这里只补本门禁特有的诊断与统计字段，
  // 保证门禁与图生成器读的是同一套解析上下文，不会各自演化出第二份字段清单。
  const ctx = createReaderContext();
  Object.assign(ctx, {
    untrackedError: null,
    textFiles: [],
    // 忽略规则原文缓存（`git check-ignore -v` 的逐条回显）。
    ignoreRuleCache: new Map(),
    // 模块说明符解析模式：'typescript'（首选）或 'regex-fallback'（降级，报告里明确标注）。
    analysisMode: { mode: 'regex-fallback', reason: '尚未初始化', version: null },
    // 检查 6 专用：豁免清单每条规则的命中次数（可命中锚点集合缓存在内核的 anchorCache）。
    anchorAllowlistHits: new Map(),
    suppressed: [],
    // 被忽略规则覆盖、因而「跳过不报」的目标：逐条列出（含命中的忽略规则），不再只给计数。
    ignoredRefs: [],
    ignoredRefSeen: new Set(),
    // 检查 1d 专用：被判定为「元变量模板」而跳过的候选 token，逐条列出（跳过必须可见）。
    npmScriptMetavariables: [],
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
      // 检查 1d（Markdown 散文里的 `npm run <script>`）：
      // mdFiles = 扫描面文件数；candidates = 抽到的候选 token 总数（含元变量）；
      // references = 去重后的 (文件, 脚本名) 引用数；dangling = 其中报 error 的条数。
      mdFiles: 0,
      npmScriptCandidates: 0,
      npmScriptMetavariablesSkipped: 0,
      npmScriptReferences: 0,
      npmScriptDangling: 0,
      checks: {},
    },
    bootstrapError: null,
  });

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


// ---------------------------------------------------------------------------
// 检查 1a：Markdown 相对链接 / 图片
// ---------------------------------------------------------------------------


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


/** 在 package.json 原文里定位某个 JSON 键的行/列（实现已移入共享内核，见文件头）。 */


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


// ---------------------------------------------------------------------------
// 检查 1d：Markdown 散文里的 `npm run <script>` / `npm test` 必须真实存在
// ---------------------------------------------------------------------------
/**
 * 为什么需要（与检查 1c 的分工）：
 *   1c 只覆盖 `.github/workflows/*.yml` 的 `run:`——CI 里调错脚本会红，但**散文里**写的
 *   `npm run <script>` 此前无人校验：脚本一旦改名/删除，README / CONTRIBUTING / docs 照旧
 *   写着旧名字，读者照抄即失败（"照抄就报 Missing script"）。与检查 1「文档提到不存在的路径」
 *   同类，因此复用 `dangling-reference` 这个 check id，不新增 check 类别。
 *
 * 扫描面（写死、可复现）：git 索引里扩展名为 `.md` 的文件，等价于 `git ls-files "*.md"`
 *   —— 含 README*、CONTRIBUTING.md、AGENTS.md、docs/**、ledger/**、skills/**、examples/**；
 *   **条数是活值 —— 取数、不复述**：现值 = `node scripts/check-references.cjs --json` 的
 *   `summary.markdownFiles`（**同一支命令就是本脚本自己的输出**，因此不会与扫描面脱节；口径 =
 *   「git 索引里扩展名为 `.md` 的文件数」= `git ls-files "*.md"` 的条数）；**留痕（时点 = 本批开工版
 *   `4e0170f`；只作留痕，不是现值 —— 旧值不删）**：该时点实测 1073 个。**不扫** .cjs/.mjs/.ts 源码里的字符串：那是代码不是散文，
 *   且源码里的 `npm run <x>` 大量出现在测试夹具、正则与注释里，纳入只会制造噪声。
 *
 * 抽取与判定规则（实证依据，不靠印象）：
 *   · 复用共享内核的 extractNpmScriptRefs（与检查 1c 同一实现，不造第二套）：覆盖
 *     `npm run <name>` / `npm run-script <name>` / `npm test|start|stop|restart`，
 *     带 `--if-present` 的整条跳过；`npm ci|install|pack` 等内建命令不含脚本名，天然不命中。
 *     `npm test` 与 `npm run test` 都归一成候选名 `test`，都要求 `scripts.test` 存在
 *     （`npm test` 只是 npm 的内建别名，脚本不存在时同样 Missing script）。
 *   · 候选名规范化：只取 token 开头一段 `[A-Za-z0-9:_.-]`，并去掉结尾的 `.`/`_`/`-`。
 *     实测依据（本仓原文，不规范化会把这 2 处**真引用**误判成悬空；截断只发生在 token
 *     尾部，不会凭空造出名字）：
 *       `…`npm run build`（tsc 编译 src/ → lib/）`            → 候选 build`（tsc → build
 *       `… # 为 HEAD 写记录（= npm run changelog:gen）`        → 候选 changelog:gen） → changelog:gen
 *   · 元变量（模板而非真引用）一律跳过，绝不报：
 *       - token 任何位置含 `<` `>` `*` `$` `…` `{` `}`（如 `npm run <script>`、`npm run $SCRIPT`、
 *         `npm run build:*`）—— 含 `*` 的通配写法整体跳过，不做前缀猜测；
 *       - 规范化后不是「ASCII 字母/数字开头」的占位（如 `npm run 某脚本`、`npm run <脚本>`）；
 *       - 单个大写字母占位（如 `npm run X`）。
 *   · 同一 (文件, 脚本名) 只报一次：【本仓该数值的现值不在此复述】（它随文档与改动变化），
 *     取数：`node scripts/check-references.cjs --json` 读 `summary.warnings`；重复上报会把报告
 *     推到大几千，反而稀释真正要看的东西。
 *
 * 零命中 fail-closed：整轮扫到的候选 token 数为 0 ⇒ 判定扫描器失效（md 读不到 / 抽取规则被改错 /
 *   扫描面被改空），报 error 并非 0 退出。**"一个引用都没找到"不等于"所有引用都合法"。**
 *   判定基准 package.json 读不到/解析失败时同理：报一条 guard-unavailable，绝不把每个候选
 *   都当悬空（噪声炸弹），也绝不静默通过。
 */

/** 扫描面判定：git 索引里扩展名为 `.md` 的文件（`git ls-files "*.md"` 的等价形式）。 */
const isMarkdownPath = (rel) => path.posix.extname(rel).toLowerCase() === '.md';

/**
 * 候选名规范化 + 元变量判定。
 *   { name }              真引用：name 是待断言的 npm script 名
 *   { skip: true, reason } 模板/占位符：跳过并计入统计（**不是**合法引用，只是不报）
 */
function classifyNpmScriptCandidate(raw) {
  const bare = String(raw == null ? '' : raw)
    .trim()
    .replace(/^[`"']+/, '')
    .replace(/[`"']+$/, '');
  if (!bare) return { skip: true, reason: '空 token' };

  // 元变量标记：出现在 token 任何位置都说明这是模板而不是名字。
  const marker = /[<>*$…{}]/.exec(bare);
  if (marker) return { skip: true, reason: `含元变量标记 ${marker[0]}` };

  const name = (/^[A-Za-z0-9][A-Za-z0-9:_.-]*/.exec(bare) || [''])[0].replace(/[._-]+$/, '');
  if (!name) return { skip: true, reason: '非 ASCII 字母/数字开头的占位符' };
  if (/^[A-Z]$/.test(name)) return { skip: true, reason: '单个大写字母占位符' };
  return { name };
}

function checkMarkdownNpmScriptRefs(ctx) {
  const parsed = readJson(ctx, 'package.json');
  if (parsed.error) {
    // 判定基准不可用：既不能把每个候选都当悬空（噪声炸弹），也不能静默放行 —— fail-closed。
    ctx.report({
      check: 'dangling-reference',
      severity: 'error',
      type: 'guard-unavailable',
      file: 'package.json',
      line: 1,
      target: 'scripts',
      dedupeKey: 'md-npm-script-baseline-unavailable',
      message: `Markdown 里 npm script 引用的判定基准 package.json 不可用（${parsed.error}）：本项检查失效，按 fail-closed 报 error。`,
      hint: '先修 package.json 的可读性 / JSON 语法；判定基准不在就不能判「引用合法」。',
    });
    return;
  }
  const scripts = parsed.value.scripts && typeof parsed.value.scripts === 'object' ? parsed.value.scripts : {};

  let markdownFiles = 0;
  let candidates = 0;
  let metavariables = 0;
  let references = 0;
  let dangling = 0;
  const seen = new Set();

  for (const rel of ctx.textFiles) {
    if (!isMarkdownPath(rel)) continue;
    markdownFiles += 1;
    const text = readText(ctx, rel);
    if (text === null) continue; // 读失败由 checkTrackedReadability 统一报 guard-unavailable

    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      let searchFrom = 0;
      for (const raw of extractNpmScriptRefs(line)) {
        candidates += 1;
        const classified = classifyNpmScriptCandidate(raw);
        if (classified.skip) {
          metavariables += 1;
          ctx.npmScriptMetavariables.push({ file: rel, line: i + 1, token: raw, reason: classified.reason });
          continue;
        }
        const name = classified.name;
        // 列号：在整行里顺着找这个 token（同一行多次出现时逐个推进），找不到就退回第 1 列。
        const at = line.indexOf(raw, searchFrom);
        if (at >= 0) searchFrom = at + raw.length;
        const column = at >= 0 ? at + 1 : 1;

        const key = `${rel}\u0000${name}`;
        if (seen.has(key)) continue; // 同一 (文件, 脚本名) 只报一次
        seen.add(key);
        references += 1;

        if (Object.prototype.hasOwnProperty.call(scripts, name)) continue;
        dangling += 1;
        ctx.report({
          check: 'dangling-reference',
          severity: 'error',
          type: 'dangling-markdown-npm-script',
          file: rel,
          line: i + 1,
          column,
          target: name,
          dedupeKey: `md-npm-script::${rel}::${name}`,
          message: `Markdown 里写了 \`npm run ${name}\`，但 package.json > scripts 里没有这个脚本。`,
          hint: '改文档里的命令，或在 package.json > scripts 里补上该脚本；元变量（如 `npm run <script>`）会被跳过、不会报。',
        });
      }
    }
  }

  ctx.stats.mdFiles = markdownFiles;
  ctx.stats.npmScriptCandidates = candidates;
  ctx.stats.npmScriptMetavariablesSkipped = metavariables;
  ctx.stats.npmScriptReferences = references;
  ctx.stats.npmScriptDangling = dangling;

  // 零命中 fail-closed：扫描器失效必须变红，而不是"没找到就算通过"。
  if (candidates === 0) {
    ctx.report({
      check: 'dangling-reference',
      severity: 'error',
      type: 'guard-unavailable',
      file: '.',
      line: 1,
      target: 'npm run',
      dedupeKey: 'md-npm-script-scan-empty',
      message:
        `Markdown 散文里的 npm script 引用扫描到 0 个候选 token（扫描面 ${markdownFiles} 个 .md）——` +
        '视为扫描器失效，按 fail-closed 报 error：没抽到任何引用不等于所有引用都合法。',
      hint: '检查 git 索引里的 *.md 是否可读、抽取规则是否仍匹配 `npm run <script>` 的写法。',
    });
  }
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
 *   的条数、`SCRIPT_VERSION_CITATIONS` 的条数）。那些条数散落在 CONTRIBUTING.md 的散文里，
 *   **目前仍靠人工同步**——CONTRIBUTING 已就此写明。
 *   **上述两个条数本身也是活值 —— 取数、不复述**：现值 = 数本脚本里 `const VERSION_SYNC_LITERALS = [`
 *   与 `const SCRIPT_VERSION_CITATIONS = [` 两个数组的条目数，口径 = 「两个 `];` 之前的条目数」
 *   （`VERSION_SYNC_LITERALS` 按 `id:` 行数、`SCRIPT_VERSION_CITATIONS` 按 `kind:` 行数；两者都是一条一行）；
 *   最小可跑片段（本批复核实跑，输出 `8 / 8`，其中 `VERSION_SYNC_LITERALS` = 7 error + 1 warning）：
 *   `node -e "const s=require('fs').readFileSync('scripts/check-references.cjs','utf8');const cut=(n)=>{const a=s.slice(s.indexOf('const '+n+' = ['));return a.slice(0,a.indexOf('\n];'))};const v=cut('VERSION_SYNC_LITERALS');const sev=[...v.matchAll(/severity: '(\w+)'/g)].map(m=>m[1]);console.log('VERSION_SYNC_LITERALS',(v.match(/^    id: /gm)||[]).length,'error',sev.filter(x=>x==='error').length,'warning',sev.filter(x=>x==='warning').length);const c=cut('SCRIPT_VERSION_CITATIONS');console.log('SCRIPT_VERSION_CITATIONS',(c.match(/^    kind: /gm)||[]).length)"`。
 *   **留痕（时点 = 本批开工版 `4e0170f`；只作留痕，不是现值 —— 旧值不删）**：该时点两个条数都是 8 条。
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
    out.push(
      `Markdown 里的 npm script 引用: 扫描面 ${ctx.stats.mdFiles} 个 .md · 候选 token ${ctx.stats.npmScriptCandidates} · 元变量跳过 ${ctx.stats.npmScriptMetavariablesSkipped} · 引用(文件,脚本) ${ctx.stats.npmScriptReferences} · 悬空(报 error) ${ctx.stats.npmScriptDangling}`,
    );
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
      markdownFiles: ctx.stats.mdFiles,
      npmScriptCandidates: ctx.stats.npmScriptCandidates,
      npmScriptMetavariablesSkipped: ctx.stats.npmScriptMetavariablesSkipped,
      npmScriptReferences: ctx.stats.npmScriptReferences,
      npmScriptDangling: ctx.stats.npmScriptDangling,
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
    // 检查 1d 里被判为「元变量模板」而跳过的候选 token：逐条列出（跳过不等于看不见）。
    npmScriptMetavariables: ctx.npmScriptMetavariables.map((entry) => ({
      file: entry.file,
      line: entry.line,
      token: entry.token,
      reason: entry.reason,
    })),
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main(process.argv.slice(2));
