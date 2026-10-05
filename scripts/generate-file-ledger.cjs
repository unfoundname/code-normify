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
 *   · 因此「往清单里手加一条」无法靠生成器洗白：加进来的条目下次生成会被剔除（它不在原清单里）。
 *
 *   历史缺口（增量 1 实测，已在 2026-10-05 修复）：本生成器原先把 grandfathered **全量重算**为
 *   「所有既未 bound 也未豁免的已跟踪文件」，于是「新增一个无归属文件 → 跑一次生成器」会把这个
 *   新路径自动写进 grandfathered，门禁随之由红转绿——与「只减不增」的文档**逐字矛盾**。
 *   现在改为「只保留原清单里的条目」，上述洗白路径不复存在。
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
const TOOL_VERSION = '1.1.1';

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
    if (opts.check) {
      if (result.changed) {
        process.stderr.write(
          `${TOOL}: 台账与重新生成的结果不一致（${LEDGER_REL}）。\n` +
            `  台账 tracked_total=${result.before.total} · 重算 tracked_total=${result.after.total}\n` +
            `  台账 grandfathered=${result.before.grandfathered} 条 · 重算 ${result.after.grandfathered} 条\n` +
            '  修法：node scripts/generate-file-ledger.cjs\n',
        );
        process.exitCode = 1;
        return;
      }
      process.stdout.write(`${TOOL}: 台账与重新生成的结果一致（${LEDGER_REL}）。\n`);
      process.exitCode = 0;
      return;
    }
    process.stdout.write(
      `${TOOL}: ${result.changed ? `已写出 ${LEDGER_REL}` : `${LEDGER_REL} 与重新生成的结果一致，未改动文件`}\n` +
        `  宇宙 = git ls-files ${result.after.total} 条 · universe_hash ${result.after.hash.slice(0, 16)}…\n` +
        `  bound ${result.after.bound} · exempt-pattern ${result.after.exempt} · grandfathered ${result.after.grandfathered}\n` +
        `  自动剔除的腐烂条目 ${result.removed.length} 条` +
        (result.removed.length > 0 ? `：\n${result.removed.map((r) => `    - ${r.rel}（${r.why}）`).join('\n')}` : '') +
        '\n',
    );
    process.exitCode = 0;
  } catch (err) {
    process.stderr.write(`${TOOL}: 生成失败：${err.message}\n`);
    process.exitCode = 1;
  }
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
    '  --check         只比较不写盘：台账与重新生成的结果一致 → 0，否则 1（两侧行尾先归一到 LF）',
    '  -h, --help      打印本帮助',
    '',
    '退出码：0 成功 / 1 生成失败（含 --check 不一致）/ 2 用法错误',
    '',
    '生成器只重算「机器可算」的部分：',
    `  · meta.tracked_total / meta.universe_hash —— 台账宇宙 = git ls-files（${LEDGER_REL}）`,
    '  · grandfathered —— 只保留原清单里「仍然既未被模块 source.path 精确声明、也未命中豁免模式、',
    '    且仍在 git 索引里」的条目（只减不增）；本次新出现的未归属路径**不会**被写进清单。',
    '人写的部分一律保留（生成器绝不自动新增豁免）：',
    '  · meta.generated_at / meta.known_divergences / meta.byte_basis / meta.coverage_basis',
    `  · exempt_patterns（pattern + reason + since + ${BROAD_CONFIRM_FIELD}，reason 必填）`,
    '',
    '棘轮：grandfathered 只减不增——',
    '  已 bound / 已豁免 / 已从索引消失的条目会被自动剔除；',
    '  新增未归属文件不会进清单，而是被 scripts/check-file-ledger.cjs 报成 unowned/error；',
    '  手工往清单里加条目也不会被本生成器保留（它不在原清单里），--check 会在链上把它报出来。',
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
  if (!fs.existsSync(ledgerAbs)) {
    throw new Error(`台账数据文件不存在：${LEDGER_REL}（期望 ${ledgerAbs}）；生成器不会凭空创建它（人写部分无法推导）`);
  }
  let previous;
  try {
    const text = fs.readFileSync(ledgerAbs, 'utf8');
    previous = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);
  } catch (err) {
    throw new Error(`台账数据文件不可解析：${LEDGER_REL}（${err.message}）`);
  }
  if (!previous || typeof previous !== 'object' || !Array.isArray(previous.exempt_patterns) || !Array.isArray(previous.grandfathered)) {
    throw new Error(`台账结构非法（缺 exempt_patterns / grandfathered 数组）：${LEDGER_REL}`);
  }
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

  // ---- 3. grandfathered 重算（只减不增：只保留原清单里的条目，绝不吸收本次新出现的未归属路径） ----
  // 关键不变量：next ⊆ previous。新出现的未归属文件不会因为「跑了一次生成器」就被追认为存量，
  // 它必须继续被门禁报成 unowned/error（棘轮的牙齿）。要合法化只有两条路：
  // 让模块声明它，或往 exempt_patterns 里加一条带 reason 的模式（都需要人写东西）。
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
  const meta = { ...(previous.meta || {}) };
  meta.tracked_total = tracked.length;
  meta.universe_hash = universeHash;

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
    grandfathered: [...grandfathered].sort(byCodePoint),
  };

  const serialized = `${JSON.stringify(next, null, 2)}\n`;
  // 两侧行尾先归一到 LF（与 check-file-ledger.cjs 的 ledger-index-drift 同口径）：
  // Windows 上 core.autocrlf=true 会把工作区台账检出成 CRLF，裸比较会把「内容一字不差」判成 changed。
  const changed = normalizeEol(serialized) !== normalizeEol(fs.readFileSync(ledgerAbs, 'utf8'));
  if (!opts.check && changed) fs.writeFileSync(ledgerAbs, serialized, 'utf8');

  return {
    changed,
    removed,
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
