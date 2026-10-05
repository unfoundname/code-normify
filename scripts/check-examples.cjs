#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * scripts/check-examples.cjs
 * 示例可执行 + 自净性门禁（examples runnable & self-cleaning guard）
 * ---------------------------------------------------------------------------
 * 目的：让「examples/ 下的示例已经跑不起来」和「跑个示例顺手改了仓库」这两类事故
 *       在 CI 里自动变红。
 *
 * 历史事故（本门禁存在的理由）：
 *   examples/branch-development/example.mjs 曾因引擎签名变更直接崩掉，而 CI 只跑
 *   typecheck / 测试 / 文档片段，从不执行 examples/，于是「全绿」掩盖了示例坏死。
 *
 * 本门禁做两件事：
 *   ① 可执行：按显式清单逐条 spawnSync 跑示例，超时 / 非 0 退出即 error；
 *   ② 自净性（本门禁最有价值的部分）：每条示例运行前后各取一次 git 快照并求差，
 *      只要示例往仓库里写了任何东西（改被跟踪文件、新建未跟踪文件、新建被忽略产物）
 *      就 error，并精确点名是哪个示例改了哪些路径。
 *
 * 设计约束：
 *   - Node 20+ / CommonJS / 零依赖，只用 node: 内置模块（CI 在 ubuntu-latest，本地在 Windows）。
 *   - 运行示例用 child_process.spawnSync(process.execPath, [绝对路径, ...args], { cwd: root })：
 *     不经 shell（没有引号/展开的平台差异），绝对路径 + cwd 固定为仓库根，
 *     Windows / Linux 行为一致。
 *   - 快照用 `git status --porcelain=v1 -z`（NUL 分隔，不会像 -z 之外的输出那样被
 *     引号转义或按 locale 变形）；路径分隔符统一归一成 `/` 再比较。
 *   - 只比较「两次快照之间的差」：运行前就已经 dirty 的文件（本机常年有一堆其他
 *     改动）不会被算到示例头上。
 *   - 拿不到 git 快照就无法断言自净性 → 宁可红不假绿：报 error 退出 1，不「跳过」。
 *
 * 退出码：
 *   0  全部纳入示例通过且仓库零变化
 *   1  存在 error 级违规（示例失败 / 超时 / 改了仓库 / 清单缺文件 / 无 git 快照能力）
 *   2  命令行用法错误（未知参数、--root 缺参、CHECK_EXAMPLES_TIMEOUT_MS 非法）
 *
 * 用法：node scripts/check-examples.cjs [--json] [--root <dir>] [--help]
 * 环境变量：CHECK_EXAMPLES_TIMEOUT_MS 覆盖每条示例的超时（毫秒，默认 60000）
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');

const TOOL = 'check-examples';
const TOOL_VERSION = '1.0.0';

// ---------------------------------------------------------------------------
// 配置：基础常量
// ---------------------------------------------------------------------------

/** 每条示例的默认超时（毫秒）。可用环境变量 CHECK_EXAMPLES_TIMEOUT_MS 覆盖。 */
const DEFAULT_TIMEOUT_MS = 60000;

/** 超时环境变量名（--help 里必须写明，夹具靠它把超时分支压到 2 秒内验证）。 */
const TIMEOUT_ENV = 'CHECK_EXAMPLES_TIMEOUT_MS';

/** 失败时打印的输出尾部：约 40 行 / 4000 字符，两者取更小者。 */
const TAIL_MAX_LINES = 40;
const TAIL_MAX_CHARS = 4000;

/** 单个 example-mutated-repo 示例最多逐条列出的路径数（超出的只计数，避免刷屏）。 */
const MAX_REPORTED_CHANGES = 50;

/** 子进程输出缓冲上限（示例会打印大 JSON）。 */
const MAX_BUFFER = 64 * 1024 * 1024;

/** 清单漂移扫描：扫描 examples/ 下**一层**的入口脚本（深层的示例工程内部工具不算入口）。 */
const EX_SCAN_DIR = 'examples';
const EX_SCAN_DEPTH = 1;
const EX_SCAN_EXTENSIONS = new Set(['.mjs', '.cjs', '.js']);

/**
 * 构建产物基线：纳入清单里的示例都 import 仓库构建产物（lib/**），
 * 没构建就跑示例会把「忘了 npm run build」误报成「示例崩了」，所以先查这个。
 * 除了这条基线，还会按每个纳入示例源码里的相对 import 反查它真正需要的 lib/** 文件。
 */
const REQUIRED_BUILD_ARTIFACTS = ['lib/index.js'];

// ---------------------------------------------------------------------------
// 配置：纳入清单（写死，逐条给理由与实测数据）
// ---------------------------------------------------------------------------
/**
 * 每条 = 一个「CI 里必须真的跑起来」的示例调用。
 *
 * 字段：
 *   path       相对仓库根的 posix 路径（必须存在，否则报 error manifest-missing-example）
 *   args       传给示例的 argv（数组，直接展开进 spawnSync，不经 shell）
 *   rationale  为什么纳入（含实测依据：耗时 / 仓库写入情况）
 *   measuredMs 本机实测耗时（毫秒），仅作参考与报告用；不参与判定
 *
 * 同一个 path 允许多条（不同 args = 不同模式），报告里按 `path + args` 区分。
 *
 * 纳入标准（三条全部满足才纳入）：
 *   (i)   普通 checkout（无 node_modules 自链接、无示例工程残留）里能跑；
 *   (ii)  不修改任何被 git 跟踪的文件，也不新增未跟踪/被忽略条目（自净性断言要求）；
 *   (iii) 单次运行远低于 60 秒上限。
 */
const INCLUDE = [
  {
    path: 'examples/branch-development/example.mjs',
    args: [],
    measuredMs: 5439,
    rationale:
      '历史事故的当事人：签名变更后直接崩，而 CI 从不执行它。用仓库相对路径 ../../lib/service.js ' +
      '加载构建产物；自建临时 git 仓库与全部产物都落在 os.tmpdir()/normify-branch-example-*；' +
      '实测（2026-10-05 07:45）退出 0、5439ms、前后 git 快照（含 --ignored）零差异。',
  },
  {
    path: 'examples/bilibili-trial/project-data-view.mjs',
    args: ['--check'],
    measuredMs: 10212,
    rationale:
      '只读模式（--check）：影子副本建在 os.tmpdir()/normify-bilibili-trial-*，仓库内被跟踪文件一字不改；' +
      '同时断言 normify-data / data.json 的投影仍然最新（投影过期即退出 1），是「示例产物漂移」的哨兵。' +
      '实测（2026-10-05 07:45）退出 0、10212ms、前后 git 快照零差异。',
  },
  {
    path: 'examples/bilibili-trial/project-data-view.mjs',
    args: [],
    measuredMs: 16214,
    rationale:
      '默认影子模式：把被跟踪的 normify-data 复制到 os.tmpdir() 影子副本上重建（覆盖 normify_graph_put ' +
      '写路径与项目锁），仓库内只读。相比 --check 多覆盖了写路径，能抓到写侧签名变更。' +
      '实测（2026-10-05 07:47）退出 0、16214ms、前后 git 快照零差异；' +
      '注意 --in-place 会重写数百个受跟踪文件，绝不可进清单。',
  },
];

// ---------------------------------------------------------------------------
// 配置：排除清单（写死，逐条给可核对的具体理由）
// ---------------------------------------------------------------------------
/**
 * 排除清单存在的意义：让「以为覆盖了其实没有」不可能发生——每个被排除的示例都必须在
 * 这里出现一次，理由要具体到能核对（哪个文件哪一行 / 哪个实测事实），并且在人类输出与
 * --json 里都原样打印。
 *
 * 字段：
 *   path     相对仓库根的 posix 路径，或整类排除的 glob（支持 `**`）
 *   kind     'script' = 一个具体的可执行入口脚本（缺失时报 warning stale-exclusion）
 *            'class'  = 整类排除（示例工程内部工具 / 被忽略目录 / 非入口文件）
 *   args     该脚本的典型 argv（仅作说明，不执行）
 *   reason   为什么排除（必填，必须可核对）
 *   evidence 判定依据（读代码的 file:line，或实测的命令与结果）
 */
const EXCLUDE = [
  {
    path: 'examples/bilibili-trial/verify-trial.mjs',
    kind: 'script',
    args: [],
    reason:
      '会写仓库，且写的是**被跟踪**文件：verify-trial.mjs:44 把 architecture.json / data.json 覆写回仓库，' +
      ':39 / :54 另外写出未跟踪的 worker-packets.json、verification.json。' +
      '它还会在仓库内创建被忽略目录 .normify-architecture.lock/（项目锁落在 dataDir 旁边）。' +
      '另外它依赖示例自带、却被 .gitignore 忽略的 project/ 与 normify-*/receipt.json，干净的 checkout 里根本不存在；耗时也远超 60 秒上限。',
    evidence:
      '读代码 examples/bilibili-trial/verify-trial.mjs:39,44,54；' +
      '实测（2026-10-05 07:46，PROBE_TIMEOUT_MS=30000）30.2s 后被超时杀掉：exitCode=null / signal=SIGTERM，' +
      '期间新增被忽略路径 examples/bilibili-trial/.normify-architecture.lock/（内容 owner.json 指向已死的 pid）。' +
      '未等满 8 分钟：脚本第一段循环还没跑完就被杀，已足以判定「会写仓库 + 超时」两条硬伤。',
  },
  {
    path: 'examples/bilibili-trial/capture-diagrams.mjs',
    kind: 'script',
    args: [],
    reason:
      '会往仓库写被忽略目录 screenshots/（capture-diagrams.mjs:7-8 mkdir + :23,:26 screenshot 落盘），' +
      '与本门禁的自净性断言直接冲突；且依赖示例工程内已生成好的 normify-architecture-view/normify.html 等 vendored 产物，' +
      '真实浏览器渲染的耗时也不可控（属于 test:render 那条链路的职责，不是「示例还能跑」）。',
    evidence:
      '读代码 examples/bilibili-trial/capture-diagrams.mjs:1（import playwright）、:7-8、:15-26。' +
      '注：playwright 确实在 devDependencies、CI 也装了 chromium，「需要浏览器」本身不是排除理由——' +
      '「写仓库」才是（这正是本门禁要防的事）。',
  },
  {
    path: 'examples/bilibili-trial/serve-diagrams.mjs',
    kind: 'script',
    args: [],
    reason:
      '常驻 HTTP 服务器：server.listen() 之后进程不退出（serve-diagrams.mjs:14-17），只会被超时杀掉，' +
      '在 CI 里必然是 example-timeout，属于「不该用一次性 spawn 跑」的示例。',
    evidence: '读代码 examples/bilibili-trial/serve-diagrams.mjs:14 `server.listen(0, ...)`，无任何 close/退出路径。',
  },
  {
    path: 'examples/bilibili-trial/summarize-pi.mjs',
    kind: 'script',
    args: [],
    reason:
      '脚本本身只读，但输入是**被忽略的运行产物** examples/bilibili-trial/pi-events.jsonl（78MB，' +
      '.gitignore 里忽略、干净 checkout 不存在）→ 在 CI / 新克隆上必定 ENOENT，属于「本机绿、CI 红」的假绿源。',
    evidence:
      '读代码 examples/bilibili-trial/summarize-pi.mjs:2 读 ./pi-events.jsonl；' +
      'examples/bilibili-trial/.gitignore 第 3 行 pi-events.jsonl；' +
      '实测（2026-10-05 07:46 前后两次 ls）该文件在调研期间被并发清理删除：`Test-Path` 由 True 变 False。',
  },
  {
    path: 'examples/bilibili-pi-full/run-pi.mjs',
    kind: 'script',
    args: [],
    reason:
      '硬编码 Windows 专属绝对路径 <pi-executable>（:26），ubuntu-latest 上必崩；' +
      '需要外部 pi 二进制 + 模型凭据 + 网络；运行时把 pi-events-*.jsonl、pi-stderr-*.log、pi-run.json 写进示例目录（被忽略但仍是仓库内写入）。',
    evidence:
      '读代码 examples/bilibili-pi-full/run-pi.mjs:22-31（写文件）、:26（绝对路径 spawn）。' +
      '对应 .gitignore：examples/bilibili-pi-full/.gitignore 的 pi-events-*.jsonl / pi-stderr-*.log / pi-run.json。',
  },
  {
    path: 'examples/bilibili-pi-full/project/**',
    kind: 'class',
    args: [],
    reason:
      '整类排除：示例工程内部的工具与测试（project/tools/*.mjs、project/contracts/tests/*.mjs），' +
      '不是本仓库的示例入口，而是被冻结进 frozen-project.bundle 的示例工程内容。' +
      '该目录被 .gitignore 忽略（干净 checkout 里不存在），且依赖工程自带的 vendor/node_modules。',
    evidence:
      'examples/bilibili-pi-full/.gitignore 的 `project/` 规则；' +
      'glob 清点：project/tools/*.mjs 约 40 个、project/contracts/tests/*.mjs 5 个（另见 .verify-worktree 下的同构副本）。',
  },
  {
    path: 'examples/bilibili-pi-full/.verify-worktree/**',
    kind: 'class',
    args: [],
    reason:
      '整类排除：验证用工作树快照（含 .verify-worktree/vendor/node_modules），被 .gitignore 忽略，' +
      '干净 checkout 里不存在；里面的 *.mjs 是示例工程内部脚本，不是本仓库的示例入口。',
    evidence: 'examples/bilibili-pi-full/.gitignore 的 `.verify-worktree/` 规则；实测该目录在磁盘上存在但 `git status --ignored` 显示为 `!!`。',
  },
  {
    path: 'examples/bilibili-trial/project/**',
    kind: 'class',
    args: [],
    reason:
      '整类排除：示例自带工程（从 frozen-project.bundle 解出、被 .gitignore 忽略），只被 verify-trial.mjs 消费；' +
      '干净 checkout 里不存在，也不是独立示例入口。',
    evidence: 'examples/bilibili-trial/.gitignore 的 `project/` 规则；`git status --ignored=matching` 把它列为 `!! examples/bilibili-trial/project/`。',
  },
  {
    path: 'examples/*/pi-mcp.ts',
    kind: 'class',
    args: [],
    reason:
      '非入口：pi 的 MCP 扩展模块（由 pi 通过 --extension 加载的 ESM 模块），单独用 node 运行没有意义；' +
      '两个示例各有一份，均被 run-pi.mjs / verify-trial 的运行链路引用。',
    evidence: 'examples/bilibili-trial/pi-mcp.ts、examples/bilibili-pi-full/pi-mcp.ts；examples/bilibili-pi-full/run-pi.mjs:14 `--extension join(trial, "pi-mcp.ts")`。',
  },
  {
    path: 'examples/*/**/*.json',
    kind: 'class',
    args: [],
    reason:
      '非入口：示例的数据与产物（architecture.json / data.json / diagrams.json / verification.json / *.log / *.html / *.bundle 等同理），' +
      '不是可执行脚本；本门禁只跑 examples/<示例>/ 下**一层**的 *.mjs / *.cjs / *.js 入口。',
    evidence: 'glob 清点：examples/ 下的 *.json 全部是数据/产物；入口脚本清单见本文件的 INCLUDE / EXCLUDE 两张表与 `git ls-files examples`。',
  },
];

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------

/** Windows 反斜杠归一成 posix，便于与 git 输出、清单里的路径逐字比较。 */
const toPosix = (p) => p.split('\\').join('/');

/** 把仓库相对 posix 路径落到当前操作系统的绝对路径。 */
const absOf = (root, rel) => path.join(root, ...rel.split('/'));

/** 极简 glob（只支持 `*` 与 `**`），用于整类排除条目与清单漂移扫描。 */
function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*');
  return new RegExp(`^${pattern}$`);
}

/** 目标是否被某条排除规则覆盖（精确路径或 glob；大小写敏感，与 git 一致）。 */
function matchesExclude(rel) {
  return EXCLUDE.some((entry) =>
    entry.path.includes('*') ? globToRegExp(entry.path).test(rel) : entry.path === rel,
  );
}

/** 取输出尾部：约 40 行 / 4000 字符。 */
function tailText(text) {
  if (!text) return '';
  const lines = String(text).split(/\r?\n/);
  let tail = lines.slice(-TAIL_MAX_LINES).join('\n');
  if (tail.length > TAIL_MAX_CHARS) tail = tail.slice(-TAIL_MAX_CHARS);
  return tail;
}

/** 人类输出里每条违规的严重级计数。 */
function severityCounts(violations) {
  const counts = { error: 0, warning: 0 };
  for (const v of violations) counts[v.severity] = (counts[v.severity] || 0) + 1;
  return counts;
}

// ---------------------------------------------------------------------------
// git 快照
// ---------------------------------------------------------------------------

/** 直接 exec git（无 shell），拿不到就抛错——调用方按「宁可红不假绿」处理。 */
function execGit(root, args) {
  return execFileSync('git', ['-c', 'core.quotePath=false', ...args], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

/**
 * 解析 `git status --porcelain=v1 -z` 的输出为 Map<path, {xy, origPath}>。
 *
 * -z 格式：每条记录是 `XY<空格><路径>`，记录之间用 NUL 分隔（不是换行），因此路径里
 * 的空格、引号、换行都不会被转义，不需要也不应该再做 unquote。
 *
 * 重命名 / 复制（XY 首字母 R / C）在 -z 下**额外**跟一段原路径（同样是独立的 NUL 段）：
 * 必须把这一段一起吃掉，否则原路径会被当成一个新出现的条目，凭空造出假违规。
 */
function parsePorcelainZ(raw) {
  const tokens = raw.split('\0');
  const entries = new Map();
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (!token) continue;
    const xy = token.slice(0, 2);
    const file = toPosix(token.slice(3));
    let origPath = null;
    if (xy[0] === 'R' || xy[0] === 'C') {
      const next = tokens[i + 1];
      if (next) {
        origPath = toPosix(next);
        i += 1;
      }
    }
    entries.set(file, { xy, origPath });
  }
  return entries;
}

/** 删除状态：索引侧或工作区侧任一为 D。 */
const isDeletedStatus = (xy) => xy[0] === 'D' || xy[1] === 'D';

/**
 * 取一次仓库快照。两路 git status 分工不同：
 *   worktree：--untracked-files=all —— 已跟踪文件的增删改 + 逐个列出的未跟踪文件；
 *   ignored ：--untracked-files=normal --ignored=matching —— 被忽略的条目（目录级折叠，便宜）。
 * 只比较两次快照之间的差，所以运行前就 dirty 的文件不会算到示例头上。
 */
function takeSnapshot(root) {
  const worktree = parsePorcelainZ(execGit(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']));
  const ignored = new Map();
  for (const [rel, entry] of parsePorcelainZ(
    execGit(root, ['status', '--porcelain=v1', '-z', '--untracked-files=normal', '--ignored=matching']),
  )) {
    if (entry.xy === '!!') ignored.set(rel, entry);
  }
  return { worktree, ignored };
}

/**
 * 求两次快照的差，逐条给出分类：
 *   new-untracked    示例新建了未跟踪文件（本该 git add 的东西，或纯垃圾）→ error
 *   modified-tracked 示例改了/动了被跟踪文件（含状态变化，如 ' M' → 'MM'）→ error
 *   deleted-tracked  示例删了被跟踪文件 → error
 *   removed-untracked 示例删了未跟踪文件 → error
 *   new-ignored      示例在仓库里新建了被忽略产物（日志/锁/截图…）→ error
 *   removed-ignored  示例删了被忽略产物 → error
 * 重命名（XY = R?）只按「新路径」报一条 modified-tracked，原路径不重复计入删除。
 * 设计取舍见 printHelp() 里的说明：纳入清单里的示例必须**完全不写仓库**，
 * 所以被忽略路径的变化同样是 error，而不是「反正 git 不跟踪」。
 */
function diffSnapshots(before, after) {
  const changes = [];

  // 重命名在 -z 下是「新路径 + 原路径」两段：原路径被算作 after 条目的来源，
  // 必须从「before 里有、after 里没有」的删除集合里排除，否则一次重命名会被报成
  // 「删了一个 + 改了一个」两条违规。
  const renamedFrom = new Set();
  for (const entry of after.worktree.values()) {
    if (entry.origPath) renamedFrom.add(entry.origPath);
  }

  for (const [rel, entry] of after.worktree) {
    const prev = before.worktree.get(rel);
    if (!prev) {
      changes.push({
        category: entry.xy === '??' ? 'new-untracked' : 'modified-tracked',
        path: rel,
        before: null,
        after: entry.xy,
      });
    } else if (prev.xy !== entry.xy) {
      changes.push({
        category: isDeletedStatus(entry.xy) ? 'deleted-tracked' : 'modified-tracked',
        path: rel,
        before: prev.xy,
        after: entry.xy,
      });
    }
  }
  for (const [rel, entry] of before.worktree) {
    if (after.worktree.has(rel)) continue;
    if (renamedFrom.has(rel)) continue; // 已被 after 侧的重命名条目消费
    changes.push({
      category: entry.xy === '??' ? 'removed-untracked' : 'deleted-tracked',
      path: rel,
      before: entry.xy,
      after: null,
    });
  }
  for (const [rel, entry] of after.ignored) {
    if (before.ignored.has(rel)) continue;
    changes.push({ category: 'new-ignored', path: rel, before: null, after: entry.xy });
  }
  for (const [rel, entry] of before.ignored) {
    if (after.ignored.has(rel)) continue;
    changes.push({ category: 'removed-ignored', path: rel, before: entry.xy, after: null });
  }

  changes.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return changes;
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

function main(argv) {
  let opts;
  try {
    opts = parseArgs(argv);
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n运行 \`node scripts/check-examples.cjs --help\` 查看用法。\n`);
    process.exitCode = 2;
    return;
  }

  if (opts.help) {
    printHelp();
    process.exitCode = 0;
    return;
  }

  // 超时环境变量放在 --help 之后解析：`--help` 永远可用，不会被坏环境变量挡掉。
  try {
    opts.timeoutMs = resolveTimeout();
  } catch (err) {
    process.stderr.write(`${TOOL}: ${err.message}\n\n运行 \`node scripts/check-examples.cjs --help\` 查看用法。\n`);
    process.exitCode = 2;
    return;
  }

  const ctx = {
    root: path.resolve(process.cwd(), opts.root || path.resolve(__dirname, '..')),
    timeoutMs: opts.timeoutMs,
    violations: [],
    examples: [],
    stats: {},
    bootstrapError: null,
  };
  ctx.report = (violation) => ctx.violations.push(violation);

  try {
    run(ctx);
  } catch (err) {
    // 未预期异常同样按「宁可红不假绿」处理，绝不静默吞掉。
    ctx.report({
      severity: 'error',
      type: 'guard-crashed',
      example: null,
      message: `门禁自身异常：${err && err.stack ? err.stack : String(err)}`,
      hint: '这是本脚本的 bug（不是示例的问题）；请把上面的堆栈连同 --json 输出一起报出来。',
    });
  }

  if (opts.json) printJson(ctx);
  else printHuman(ctx);

  process.exitCode = ctx.violations.some((v) => v.severity === 'error') ? 1 : 0;
}

function run(ctx) {
  if (!fs.existsSync(ctx.root) || !fs.statSync(ctx.root).isDirectory()) {
    ctx.bootstrapError = `--root 指向的目录不存在或不是目录：${ctx.root}`;
    ctx.report({
      severity: 'error',
      type: 'root-not-found',
      example: null,
      message: `--root 指向的目录不存在或不是目录：${ctx.root}`,
      hint: '所有示例路径都相对 --root 解析；夹具靠这个开关驱动清单。',
    });
    return;
  }

  // ① git 能力自检：拿不到快照就没法断言自净性 → 直接红（而不是「跳过检查」）。
  try {
    execGit(ctx.root, ['rev-parse', '--is-inside-work-tree']);
  } catch (err) {
    ctx.bootstrapError = `无法在 ${ctx.root} 执行 git（rev-parse 失败）：${err.message}`;
    ctx.report({
      severity: 'error',
      type: 'guard-unavailable',
      example: null,
      message: ctx.bootstrapError,
      hint:
        '自净性断言依赖 `git status --porcelain=v1 -z`；拿不到 git 时宁可红也不假绿。' +
        '请在完整 git checkout 里运行（CI 的 actions/checkout 已满足，且 fetch-depth 不影响本门禁）。',
    });
    return;
  }

  // ② 清单卫生：清单里声明了但磁盘上没有的示例、新增却没纳入清单的入口脚本。
  checkManifest(ctx);

  // ③ 构建产物自检：把「忘了 npm run build」与「示例崩了」区分开。
  const missingArtifacts = collectMissingArtifacts(ctx);
  if (missingArtifacts.length > 0) {
    ctx.blockedByBuildArtifacts = true;
    for (const rel of missingArtifacts) {
      ctx.report({
        severity: 'error',
        type: 'build-artifacts-missing',
        example: null,
        message: `缺少构建产物 ${rel}，无法运行示例（示例 import 的是仓库构建产物，不是 src/）。`,
        hint: '先 `npm run build` 再跑本门禁；CI 里 Build (tsc) 步骤必须排在本步骤之前。',
      });
    }
  }

  // ④ 逐条跑纳入清单（构建产物缺失时不跑：那是环境问题，跑出来的失败全是噪声）。
  for (let i = 0; i < INCLUDE.length; i += 1) {
    const entry = INCLUDE[i];
    const abs = absOf(ctx.root, entry.path);
    const record = {
      path: entry.path,
      args: entry.args.slice(),
      status: 'pending',
      exitCode: null,
      signal: null,
      durationMs: null,
      violations: [],
      changes: [],
      stdoutTail: '',
      stderrTail: '',
    };
    ctx.examples.push(record);

    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      record.status = 'missing';
      pushExampleViolation(ctx, record, {
        severity: 'error',
        type: 'manifest-missing-example',
        message: `清单里声明纳入的示例在磁盘上不存在：${entry.path}`,
        hint: '示例被删除/改名后必须同步改本脚本的 INCLUDE 表（或把它移进 EXCLUDE 并说明理由）。',
      });
      continue;
    }
    if (ctx.blockedByBuildArtifacts) {
      record.status = 'skipped';
      continue;
    }

    runOne(ctx, record, abs);
  }

  ctx.stats.totalDurationMs = ctx.examples.reduce((sum, e) => sum + (e.durationMs || 0), 0);
  ctx.stats.changedPaths = ctx.examples.reduce((sum, e) => sum + e.changes.length, 0);
}

/** 把违规同时挂到「全局列表」与「该示例的 violations」，报告里两处都能看到。 */
function pushExampleViolation(ctx, record, violation) {
  const full = { ...violation, example: `${record.path}${record.args.length ? ` ${record.args.join(' ')}` : ''}` };
  ctx.report(full);
  record.violations.push(full);
}

function runOne(ctx, record, abs) {
  const label = `${record.path}${record.args.length ? ` ${record.args.join(' ')}` : ''}`;

  let before;
  try {
    before = takeSnapshot(ctx.root);
  } catch (err) {
    record.status = 'skipped';
    pushExampleViolation(ctx, record, {
      severity: 'error',
      type: 'guard-unavailable',
      message: `运行前无法取得 git 快照（${label}）：${err.message}`,
      hint: '无法断言自净性时不运行示例：宁可红也不要在无法审计的情况下「跑绿」。',
    });
    return;
  }

  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [abs, ...record.args], {
    cwd: ctx.root,
    timeout: ctx.timeoutMs,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
    windowsHide: true,
  });
  record.durationMs = Date.now() - startedAt;
  record.exitCode = typeof result.status === 'number' ? result.status : null;
  record.signal = result.signal || null;
  record.stdoutTail = tailText(result.stdout);
  record.stderrTail = tailText(result.stderr);

  const timedOut = Boolean(result.error && result.error.code === 'ETIMEDOUT');

  if (timedOut) {
    record.status = 'timeout';
    pushExampleViolation(ctx, record, {
      severity: 'error',
      type: 'example-timeout',
      message: `示例超时（> ${ctx.timeoutMs}ms）被杀：${label}`,
      hint:
        `默认上限 ${DEFAULT_TIMEOUT_MS}ms，可用环境变量 ${TIMEOUT_ENV} 覆盖。` +
        '常驻服务器 / 需要真实浏览器 / 上万次文件 IO 的脚本不要放进 INCLUDE。',
    });
  } else if (result.error) {
    record.status = 'failed';
    pushExampleViolation(ctx, record, {
      severity: 'error',
      type: 'example-failed',
      message: `示例无法启动（spawn 失败，exitCode=${record.exitCode}）：${label} —— ${result.error.message}`,
      hint: '检查 process.execPath 是否可执行、示例路径是否存在（本门禁用绝对路径 + 无 shell 启动）。',
    });
  } else if (record.exitCode !== 0) {
    record.status = 'failed';
    pushExampleViolation(ctx, record, {
      severity: 'error',
      type: 'example-failed',
      message: `示例以非 0 退出码结束（exitCode=${record.exitCode}${record.signal ? `, signal=${record.signal}` : ''}）：${label}`,
      hint: '下面是该示例的输出尾部；示例是「能跑起来的活文档」，签名变更后必须同步修示例。',
    });
  } else {
    record.status = 'passed';
  }

  // 自净性断言：无论示例成功、失败还是被超时杀掉，都要比对仓库快照
  // （被 SIGTERM 杀掉的示例同样可能留下半截产物）。
  let after;
  try {
    after = takeSnapshot(ctx.root);
  } catch (err) {
    pushExampleViolation(ctx, record, {
      severity: 'error',
      type: 'guard-unavailable',
      message: `运行后无法取得 git 快照（${label}）：${err.message}`,
      hint: '无法断言自净性 → 按 error 处理，绝不当作「没变化」。',
    });
    return;
  }

  const changes = diffSnapshots(before, after);
  record.changes = changes;
  for (const change of changes.slice(0, MAX_REPORTED_CHANGES)) {
    pushExampleViolation(ctx, record, {
      severity: 'error',
      type: 'example-mutated-repo',
      category: change.category,
      changedPath: change.path,
      message:
        `[${change.category}] 示例改了仓库：${change.path}` +
        `（快照前 ${change.before || '未出现'} → 快照后 ${change.after || '已消失'}）`,
      hint:
        '纳入清单里的示例必须完全不写仓库（含被忽略的产物目录）。' +
        '要么改示例让它只写 os.tmpdir()，要么把它移进 EXCLUDE 并说明理由——不要放宽这条断言。' +
        '本机若同时有别的进程在写仓库（并发 tsc 构建、别的 agent 改文件），它落在两次快照之间也会命中这里：' +
        '先按路径判断是不是该示例碰得到的东西（示例几乎不可能去写 src/、lib/、scripts/），CI 上则没有并发写者。',
    });
  }
  if (changes.length > MAX_REPORTED_CHANGES) {
    pushExampleViolation(ctx, record, {
      severity: 'error',
      type: 'example-mutated-repo',
      category: 'truncated',
      message: `还有 ${changes.length - MAX_REPORTED_CHANGES} 条仓库变化未逐条列出（共 ${changes.length} 条），完整清单见 --json 的 changes 字段。`,
    });
  }
}

// ---------------------------------------------------------------------------
// 清单卫生 / 构建产物
// ---------------------------------------------------------------------------

/** 清单里声明了但磁盘上没有的示例（INCLUDE 逐条查；EXCLUDE 的 script 条目缺失 → warning）。 */
function checkManifest(ctx) {
  for (const entry of EXCLUDE) {
    if (entry.kind !== 'script' || entry.path.includes('*')) continue;
    if (fs.existsSync(absOf(ctx.root, entry.path))) continue;
    ctx.report({
      severity: 'warning',
      type: 'stale-exclusion',
      example: null,
      message: `排除清单里的脚本在磁盘上不存在：${entry.path}`,
      hint: '排除规则过期了：删掉这一条，或把路径改成新的位置，别让它一直盖着一个已经不存在的文件。',
    });
  }

  ctx.stats.coverageGaps = 0;
  const dir = path.join(ctx.root, EX_SCAN_DIR);
  if (!fs.existsSync(dir)) return; // 没有 examples/ 时由 INCLUDE 的 manifest-missing-example 报

  const includSet = new Set(INCLUDE.map((entry) => entry.path));
  // 只扫「示例根」这一层（EX_SCAN_DEPTH = 1）：示例工程内部的工具/测试
  // （examples/<示例>/project/tools/*.mjs 之类）不是本仓库的示例入口，由 EXCLUDE 的整类条目覆盖。
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!dirent.isDirectory()) continue;
    const current = path.join(dir, dirent.name);
    let files = [];
    try {
      files = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.isFile()) continue;
      if (!EX_SCAN_EXTENSIONS.has(path.extname(file.name).toLowerCase())) continue;
      const rel = toPosix(path.relative(ctx.root, path.join(current, file.name)));
      if (includSet.has(rel) || matchesExclude(rel)) continue;
      ctx.stats.coverageGaps += 1;
      ctx.report({
        severity: 'error',
        type: 'manifest-coverage-gap',
        example: null,
        message: `examples/ 下的入口脚本既不在 INCLUDE 也不在 EXCLUDE 里：${rel}`,
        hint:
          '新增示例必须显式表态：能跑且自净 → 加进 INCLUDE（附实测耗时）；不能 → 加进 EXCLUDE 并写清可核对的具体理由。' +
          '这条检查就是为了避免「以为覆盖了其实没有」。',
      });
    }
  }
}

/** 基线构建产物 + 各纳入示例源码里 import 到的 lib/** 文件，缺任何一个都报 build-artifacts-missing。 */
function collectMissingArtifacts(ctx) {
  const required = new Set(REQUIRED_BUILD_ARTIFACTS);
  for (const entry of INCLUDE) {
    const abs = absOf(ctx.root, entry.path);
    if (!fs.existsSync(abs)) continue;
    let text = '';
    try {
      text = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const dir = path.posix.dirname(entry.path);
    const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)['"]([^'"\n]+)['"]/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const spec = m[1];
      if (!spec.startsWith('.')) continue;
      const resolved = path.posix.normalize(path.posix.join(dir, spec));
      if (resolved.startsWith('..') || !resolved.startsWith('lib/')) continue;
      if (/\.(ts|mts|cts)$/.test(resolved)) continue; // 源码说明符在本门禁里不适用
      required.add(resolved);
    }
  }

  const missing = [];
  for (const rel of [...required].sort()) {
    if (!fs.existsSync(absOf(ctx.root, rel))) missing.push(rel);
  }
  ctx.stats.requiredArtifacts = [...required].sort();
  return missing;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const opts = { json: false, help: false, root: null, timeoutMs: DEFAULT_TIMEOUT_MS };
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

/** 读 CHECK_EXAMPLES_TIMEOUT_MS；非法值按用法错误处理（宁可报错也不静默用默认值）。 */
function resolveTimeout() {
  const raw = process.env[TIMEOUT_ENV];
  if (raw === undefined || raw === '') return DEFAULT_TIMEOUT_MS;
  if (!/^\d+$/.test(raw) || Number(raw) <= 0) {
    throw new Error(`${TIMEOUT_ENV} 必须是正整数毫秒数，当前是 ${JSON.stringify(raw)}`);
  }
  return Number(raw);
}

function printHelp() {
  const lines = [
    `${TOOL} v${TOOL_VERSION} — 示例可执行 + 自净性门禁（examples runnable & self-cleaning guard）`,
    '',
    '用法：',
    '  node scripts/check-examples.cjs [选项]',
    '',
    '选项：',
    '  --json          只向 stdout 输出机器可读 JSON（含纳入/排除清单、每条示例的结果、统计）',
    '  --root <dir>    指定仓库根（默认：本脚本所在仓库根）。示例路径、git 快照、构建产物检查全部相对它解析',
    '  -h, --help      打印本帮助',
    '',
    '环境变量：',
    `  ${TIMEOUT_ENV}  每条示例的超时上限（毫秒，正整数，默认 ${DEFAULT_TIMEOUT_MS}）。`,
    '                  夹具靠它把超时分支压到 2 秒内验证：' + `${TIMEOUT_ENV}=1500 node scripts/check-examples.cjs`,
    '',
    '退出码：',
    '  0  纳入清单里的示例全部通过，且仓库零变化',
    '  1  存在 error 级违规（示例失败 / 超时 / 改了仓库 / 清单缺文件 / 构建产物缺失 / 无 git 快照能力）',
    '  2  命令行用法错误（未知参数等）',
    '',
    '纳入清单（INCLUDE，写死在脚本里，逐条跑；同一路径可以有多条不同 argv 的模式）：',
    ...INCLUDE.map(
      (entry, i) =>
        `  ${i + 1}. ${entry.path}${entry.args.length ? ` ${entry.args.join(' ')}` : '（无参数）'}` +
        `  [实测 ${entry.measuredMs}ms]`,
    ),
    '',
    '排除清单（EXCLUDE，写死在脚本里，逐条给可核对的具体理由；人类输出与 --json 都会打印）：',
    ...EXCLUDE.map((entry, i) => `  ${i + 1}. ${entry.path}  —— ${entry.reason}`),
    '',
    '本门禁做的两类断言：',
    '  ① 可执行：spawnSync(process.execPath, [绝对路径, ...args], { cwd: <root>, timeout }) 不经 shell，',
    '     超时 → example-timeout，非 0 退出 → example-failed；失败时打印输出尾部（约 40 行 / 4000 字符）。',
    '  ② 自净性：每条示例运行前后各取一次快照并求差——',
    '     · git status --porcelain=v1 -z --untracked-files=all（已跟踪增删改 + 逐个未跟踪文件）',
    '     · git status --porcelain=v1 -z --untracked-files=normal --ignored=matching（被忽略条目，目录级折叠）',
    '     只要前后有任何差异就是 error（type example-mutated-repo），并逐条列出分类：',
    '       new-untracked / modified-tracked / deleted-tracked / removed-untracked / new-ignored / removed-ignored。',
    '     设计取舍：纳入清单里的示例必须**完全不写仓库**，所以被忽略路径的变化同样按 error 处理——',
    '     「反正 .gitignore 里有」正是历史事故里「跑个示例顺手改了工作区」的成因；',
    '     运行前就已经 dirty 的文件（本机常年一堆其他改动）不在两次快照的差里，不会被算到示例头上。',
    '',
    '其它检查：',
    `  · 构建产物：基线 ${REQUIRED_BUILD_ARTIFACTS.join(' / ')} + 各纳入示例 import 到的 lib/**，缺失报 build-artifacts-missing`,
    '    （hint：CI 里 Build 步骤必须排在本步骤之前，别把「没构建」误报成「示例崩了」）。',
    '  · 清单卫生：include 里声明但磁盘上没有的示例 → error；examples/ 下一层存在却没被任何一张表覆盖的',
    '    入口脚本 → error（manifest-coverage-gap）；EXCLUDE 里的脚本已不存在 → warning（规则过期）。',
    '  · git 不可用 → error 退出 1（拿不到快照就没法断言自净性，宁可红不假绿）。',
  ];
  process.stdout.write(`${lines.join('\n')}\n`);
}

// ---------------------------------------------------------------------------
// 报告
// ---------------------------------------------------------------------------

const STATUS_LABEL = {
  passed: 'PASS',
  failed: 'FAIL',
  timeout: 'TIMEOUT',
  missing: 'MISSING',
  skipped: 'SKIP',
  pending: 'PENDING',
};

function printHuman(ctx) {
  const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
  const paint = (code, s) => (useColor ? `\u001b[${code}m${s}\u001b[0m` : s);
  const out = [];

  out.push(paint('1', `${TOOL} v${TOOL_VERSION} — 示例可执行 + 自净性门禁`));
  out.push(`仓库根 : ${ctx.root}`);
  out.push(`超时   : ${ctx.timeoutMs}ms（${TIMEOUT_ENV} 可覆盖，默认 ${DEFAULT_TIMEOUT_MS}ms）`);
  if (ctx.bootstrapError) out.push(paint('31', `引导失败: ${ctx.bootstrapError}`));
  out.push('');

  // ---- 纳入清单（永远打印：跑没跑、跑的是什么参数，一眼可见）----
  out.push(paint('1', `纳入清单 INCLUDE（${INCLUDE.length} 条）`));
  INCLUDE.forEach((entry, i) => {
    out.push(`  ${i + 1}. ${entry.path}${entry.args.length ? ` ${entry.args.join(' ')}` : ''}  [实测 ${entry.measuredMs}ms]`);
    out.push(`     ↳ ${entry.rationale}`);
  });
  out.push('');

  // ---- 排除清单（永远打印：避免「以为覆盖了其实没有」）----
  out.push(paint('1', `排除清单 EXCLUDE（${EXCLUDE.length} 条）`));
  EXCLUDE.forEach((entry, i) => {
    out.push(`  ${i + 1}. [${entry.kind}] ${entry.path}`);
    out.push(`     ↳ 理由: ${entry.reason}`);
    out.push(`     ↳ 依据: ${entry.evidence}`);
  });
  out.push('');

  // ---- 逐条结果 ----
  out.push(paint('1', '运行结果'));
  if (ctx.examples.length === 0) out.push('  （没有运行任何示例）');
  for (const record of ctx.examples) {
    const label = `${record.path}${record.args.length ? ` ${record.args.join(' ')}` : ''}`;
    const tag =
      record.status === 'passed'
        ? paint('32', STATUS_LABEL[record.status])
        : record.status === 'skipped'
          ? paint('33', STATUS_LABEL[record.status])
          : paint('31', STATUS_LABEL[record.status]);
    const detail = [
      record.exitCode === null ? 'exit=null' : `exit=${record.exitCode}`,
      record.signal ? `signal=${record.signal}` : null,
      record.durationMs === null ? null : `${record.durationMs}ms`,
      `仓库变化 ${record.changes.length} 条`,
    ]
      .filter(Boolean)
      .join(' · ');
    out.push(`  ${tag}  ${label}  (${detail})`);

    if (record.status === 'failed' || record.status === 'timeout') {
      if (record.stdoutTail) {
        out.push('       --- stdout（尾部）---');
        for (const line of record.stdoutTail.split('\n')) out.push(`       ${line}`);
      }
      if (record.stderrTail) {
        out.push('       --- stderr（尾部）---');
        for (const line of record.stderrTail.split('\n')) out.push(`       ${line}`);
      }
    }
    if (record.changes.length > 0) {
      out.push(`       --- 该示例造成的仓库变化（${record.changes.length} 条）---`);
      for (const change of record.changes.slice(0, MAX_REPORTED_CHANGES)) {
        out.push(`       [${change.category}] ${change.path}  (${change.before || '未出现'} → ${change.after || '已消失'})`);
      }
      if (record.changes.length > MAX_REPORTED_CHANGES) {
        out.push(`       … 另有 ${record.changes.length - MAX_REPORTED_CHANGES} 条，见 --json`);
      }
    }
  }
  out.push('');

  // ---- 违规汇总 ----
  if (ctx.violations.length === 0) {
    out.push(paint('32', '✔ 纳入清单里的示例全部通过，且仓库零变化。'));
  } else {
    const byType = new Map();
    for (const v of ctx.violations) {
      if (!byType.has(v.type)) byType.set(v.type, []);
      byType.get(v.type).push(v);
    }
    for (const [type, items] of byType) {
      out.push(paint('1', `${type}  (${items.length})`));
      for (const v of items) {
        const tag = v.severity === 'error' ? paint('31', 'ERROR  ') : paint('33', 'WARNING');
        out.push(`  ${tag} ${v.example ? `${v.example}  ->  ` : ''}${v.message}`);
        if (v.hint) out.push(`          ↳ ${v.hint}`);
      }
      out.push('');
    }
  }

  const counts = severityCounts(ctx.violations);
  out.push(
    `统计: 纳入 ${INCLUDE.length} 条 · 运行 ${ctx.examples.filter((e) => e.status !== 'skipped' && e.status !== 'missing').length} 条` +
      ` · 通过 ${ctx.examples.filter((e) => e.status === 'passed').length}` +
      ` · 失败 ${ctx.examples.filter((e) => e.status === 'failed').length}` +
      ` · 超时 ${ctx.examples.filter((e) => e.status === 'timeout').length}` +
      ` · 缺失 ${ctx.examples.filter((e) => e.status === 'missing').length}` +
      ` · 清单缺口 ${ctx.stats.coverageGaps || 0}` +
      ` · 仓库变化 ${ctx.stats.changedPaths || 0} 条路径` +
      ` · 示例总耗时 ${ctx.stats.totalDurationMs || 0}ms`,
  );
  const summary = `${counts.error} error / ${counts.warning} warning`;
  out.push(counts.error > 0 ? paint('31', `✖ ${summary} —— 门禁未通过`) : paint('32', `✔ ${summary} —— 门禁通过`));

  process.stdout.write(`${out.join('\n')}\n`);
}

function printJson(ctx) {
  const counts = severityCounts(ctx.violations);
  const payload = {
    tool: TOOL,
    toolVersion: TOOL_VERSION,
    root: ctx.root,
    ok: counts.error === 0,
    timeoutMs: ctx.timeoutMs,
    timeoutEnv: TIMEOUT_ENV,
    gitAvailable: !ctx.bootstrapError,
    manifest: {
      include: INCLUDE.map((entry, index) => ({
        index: index + 1,
        path: entry.path,
        args: entry.args,
        rationale: entry.rationale,
        measuredMs: entry.measuredMs,
      })),
      exclude: EXCLUDE.map((entry, index) => ({
        index: index + 1,
        path: entry.path,
        kind: entry.kind,
        reason: entry.reason,
        evidence: entry.evidence,
      })),
    },
    examples: ctx.examples.map((record) => ({
      path: record.path,
      args: record.args,
      status: record.status,
      exitCode: record.exitCode,
      signal: record.signal,
      durationMs: record.durationMs,
      violations: record.violations.map((v) => ({
        type: v.type,
        severity: v.severity,
        category: v.category || null,
        changedPath: v.changedPath || null,
        message: v.message,
        hint: v.hint || null,
      })),
      changes: record.changes,
      stdoutTail: record.stdoutTail,
      stderrTail: record.stderrTail,
    })),
    summary: {
      included: INCLUDE.length,
      excluded: EXCLUDE.length,
      ran: ctx.examples.filter((e) => e.status !== 'skipped' && e.status !== 'missing').length,
      passed: ctx.examples.filter((e) => e.status === 'passed').length,
      failed: ctx.examples.filter((e) => e.status === 'failed').length,
      timedOut: ctx.examples.filter((e) => e.status === 'timeout').length,
      missing: ctx.examples.filter((e) => e.status === 'missing').length,
      skipped: ctx.examples.filter((e) => e.status === 'skipped').length,
      manifestCoverageGaps: ctx.stats.coverageGaps || 0,
      requiredBuildArtifacts: ctx.stats.requiredArtifacts || [],
      changedPaths: ctx.stats.changedPaths || 0,
      examplesDurationMs: ctx.stats.totalDurationMs || 0,
      errors: counts.error,
      warnings: counts.warning,
    },
    bootstrapError: ctx.bootstrapError,
    violations: ctx.violations.map((v) => ({
      type: v.type,
      severity: v.severity,
      example: v.example || null,
      category: v.category || null,
      changedPath: v.changedPath || null,
      message: v.message,
      hint: v.hint || null,
    })),
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main(process.argv.slice(2));
