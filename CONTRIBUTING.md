# 贡献指南

欢迎提交 Issue 与 Pull Request。贡献前请阅读 [docs/SPEC.zh-CN.md](docs/SPEC.zh-CN.md)（正式规范 v1.0）。

## 开发环境

- Node.js ≥ 20（与 `package.json` 的 `engines.node` 一致）
- 源码构建：`npm install && npm run build`（tsc 编译 src/ → lib/）
- 引用完整性门禁：`npm run check:refs`（= `node scripts/check-references.cjs`），共**九类**检查（编号 = 脚本 `--help` 的编号列表 = 人类报告的分组顺序 = `--json` 的 `summary.checks` 顺序，三者同源于脚本内 `CHECK_TITLES`，自 v1.3.0 起不再存在两份顺序）：
  1. **悬空路径引用**（`dangling-reference`）— Markdown 相对链接/图片、`package.json` 的 `main`/`types`/`exports`/`bin`/`files` 字段、`package.json` script 与 `.github/workflows/*.yml` 的 `run:` 里 `node <路径>`（以及 `npm run <script>`，script 必须存在）指向不存在的文件；大小写不一致同样按 error 报（Windows 能过、Linux CI 会挂）。
  2. **相对说明符指向根本不存在的文件**（`dangling-module-specifier`）— 相对 `import`/`export … from`/`import(…)`/`require(…)` 的说明符指向「磁盘上根本不存在」的文件即 error；优先用仓库自带 typescript 的编译器 API 解析语法树（覆盖副作用导入 `import './x.js'`、跨行 import，并区分注释与模板字符串），拿不到 typescript 时降级为正则并在报告里标注。与第 3 项互斥：目标「根本不存在」归本项，「存在但不在索引」归第 3 项，不重复报。
  3. **未纳入 git 索引的引用目标**（`untracked-reference`）— 目标「是否合法」**以 git 索引（`git ls-files`）为权威，而不是磁盘上是否存在**：已跟踪文件引用了「磁盘上有、却不在索引里、又不被忽略规则覆盖」的路径即 error（本该 `git add`）。覆盖相对 import/export 说明符（`./x.js` 会映射回 `./x.ts` / `./x.d.ts`）、`package.json` 的 `main`/`types`/`module`/`browser`/`bin`/`exports`/`files` 字段与 script、CI `run:` 里的 `node <路径>`、Markdown 仓库内相对链接；被 `.gitignore` 等忽略规则覆盖的目标（`node_modules/`、构建临时物）跳过不报。**新增文件务必 `git add`**：否则本地全绿，一次 `git commit -am` 就会把断链写进历史，CI 与 clone 出来的树必定断链。
  4. **指向已删除文件的引用**（`deleted-reference`）— 用 `git log --diff-filter=D --name-only` 取历史删除清单再回扫工作区文本（完整路径 error，basename 为 warning 次级线索）；`CHANGELOG.md` 这类历史记录文体走脚本内的显式豁免清单（需要完整历史，CI 的 `fetch-depth: 0` 就是为它准备的）。
  5. **版本字面量漂移**（`version-drift`）— `package.json > version` 必须等于同步清单（脚本内 `VERSION_SYNC_LITERALS`，当前 **8 条：7 error + 1 warning**）里的每个字面量：`src/adapters/mcp.ts` 的 MCP server version、`package-lock.json` 顶层 `version` 与 `packages[""].version`、`tests/mcp-e2e.mjs` 的 server version 断言、`README.md` 与 `README_EN.md` 首段版本宣言、`docs/SPEC.zh-CN.md`「当前实现」版本，共 7 条为 error；`lib/adapters/mcp.js` 编译产物 1 条为 warning（只说明「改了 src 没重新 build」，CI 里 build 先于本步骤）。
  6. **本地安装包文件名漂移**（`tarball-version-drift`）— 文档里的本地安装包文件名（`…-<版本>.tgz`）必须等于本次 `npm pack` 的产物名（error）；`CHANGELOG.md` 与 `docs/RELEASE-*.md` 属历史文体，不做断言。
  7. **测试脚本清单一致性**（`test-inventory`）— script 里 `node tests/xxx.mjs` 必须真实存在（error）；`tests/` 下存在但无任何 script 引用的测试文件按 warning 提示。
  8. **锚点未命中真实标题**（`dead-anchor`）— Markdown 仓库内相对链接里的 `#fragment` 必须命中目标文件的真实标题（标题 id 按 GitHub 规则算，显式 `<a id="x">` / `<a name="x">` 也算命中）；目标文件不存在或目标不是 Markdown 时跳过，历史文体条目走脚本内的显式豁免清单。
  9. **门禁自身不可用**（`guard-unavailable`）— 拦的是「读不到却报绿」：凡**在 git 索引里**的文本文件读失败（EISDIR 已跟踪文件被同名目录顶替、EPERM/EACCES ACL 拒绝读、ENOENT 索引里有磁盘上没有）即 error（退出码 1）；编码不可信（UTF-16 BOM、高比例 NUL 字节、非法 UTF-8）同样报 error，绝不按 utf8 静默硬解码漏检；拿不到 git 跟踪清单或历史删除清单也是 error（浅克隆除外，那种情况按 warning）。第一优先级不变量：**读不到就必须红**。

上述「九类」是 **2026-10-05** 对照 `scripts/check-references.cjs`（v1.3.0）的 `CHECK_TITLES`（9 项）与 `--help` 写下的快照——该脚本仍在扩充，若它新增检查项或同步字面量，本清单、`.github/workflows/ci.yml` 里 Reference integrity guard 的注释都要同步改（数量、编号、覆盖范围三处）。

- 全仓文件台账门禁：`npm run check:ledger`（= `node scripts/check-file-ledger.cjs`），共**十类**检查（编号 = 脚本 `--help` 的编号列表 = 人类报告的分组顺序 = `--json` 的 `summary.checks` 顺序，三者同源于脚本内 `CHECK_TITLES`）：
  1. **无归属文件**（`unowned-file`）— 已跟踪、但既不被任何模块 `source.path` 精确声明、也不命中豁免模式、也不在祖父清单里的文件 → **error**（逐条报出，不是计数）。修法二选一：让某个模块声明它，或在台账 `exempt_patterns` 里加一条**带 reason** 的模式豁免；**不允许**往 `grandfathered` 里加（清单只减不增）。
  2. **祖父清单腐烂**（`grandfathered-removable`）— 清单里已经变成 bound、已经命中豁免、已经从 git 索引消失、或重复的条目 → **warning**，报告回显「祖父清单还可再减 N 条」。
  3. **豁免模式未命中**（`exempt-unused`）— 一条豁免模式本次没命中任何已跟踪文件（过期规则或拼写错误）→ **warning**；未命中的豁免会永久放过未来匹配该模式的路径。
  4. **豁免条目非法**（`exempt-invalid`）— 缺 `reason`（或 reason 为空）/ 缺 `pattern` / pattern 含不支持的元字符（只支持 `**`、`*`、`?`）→ **error**。
  5. **豁免模式过宽**（`exempt-too-broad`）— 一条豁免模式宽到能把整个门禁静默关掉 → **error**（豁免先于祖父判定，实测 pattern 为两个星号时四态显示 exempt-pattern 全中、`unowned 0`、退出码 0 的假绿）。三条判据：① 归一化（去掉 `*` `?` 与 `/`）后**没有任何字面量字符**（`**`、`*`、`**` 后接 `/*`、`?`）→ error，**不可豁免**；② 通配字符占比 **> 50%** → error，**不可豁免**；③ 单条模式命中率 **> 50% 台账宇宙** → error，除非该条目显式写了 `"broad_confirmed": true`（人工确认它确实要覆盖过半已跟踪文件；当前 `examples/**` 命中 89.3%，就带这个字段）。被判过宽的模式**不参与匹配**，它本该吞掉的文件会落回 `unowned`/error。
  6. **台账文件缺失或不可解析**（`ledger-missing`）— `ledger/file-ledger.json` 不存在、不是合法 JSON、顶层结构非法（含缺 `meta.known_divergences`、`broad_confirmed` 非布尔）→ **error**（台账是唯一事实来源，读不到就不判定，绝不「跳过检查」）。
  7. **台账内容与索引不一致**（`ledger-index-drift`）— 台账**内容以 git 索引 blob 为准**（`git show :ledger/file-ledger.json`，与 `check-lib-sync.cjs` 同构）：工作区副本与索引版不一致（改了没 `git add` / 索引里有而工作区没有）→ **error**，判定仍按索引版进行；台账根本不在索引里（新台账没 `git add`）→ 同样 **error**（否则「本地绿」会依赖一个未提交改动，CI 与新克隆看到的不是同一份事实）。只差行尾（Windows `core.autocrlf`）不算漂移。
  8. **台账与索引不一致**（`tracked-mismatch`）— 台账 `meta.tracked_total` 或 `meta.universe_hash` 与本次 `git ls-files` 实测不一致（**索引清单变了**：新增/删除/改名）→ **error**；重跑 `npm run ledger:gen` 重新生成。
  9. **声明目标存在但未纳入索引**（`declared-untracked`）— 模块 `source.path` 的目标在磁盘上是普通文件、却不在 git 索引里 → **warning**（本该 `git add`）；当前仓库的声明全为计划态，此项是为「声明将来落地到本仓库」准备的提醒。
  10. **门禁自身不可用**（`guard-unavailable`）— git 不可用 / 不是 git 仓库 / `git ls-files` 失败 / 解析不到 `yaml`（模块 frontmatter 解析必需）/ 模块文件读不到 / frontmatter 不是合法 YAML / `source` 不是数组 / **四态计数之和 ≠ 台账宇宙**（内部不变量断言）→ **error**，绝不静默跳过。

  上述「十类」是 **2026-10-05** 对照 `scripts/check-file-ledger.cjs`（v1.1.0）的 `CHECK_TITLES`（10 项）与 `--help` 写下的快照——该脚本仍在扩充，若它新增检查项或改动豁免模式/元信息口径，本清单、`.github/workflows/ci.yml` 里 File ledger guard 的注释都要同步改（数量、编号、覆盖范围三处）。

  **豁免模式的 glob 语义与标准 glob 有分歧**：本门禁的 `**` 至少匹配一层（编译成 `.*`），所以 `**` 后接 `/*.md` 的写法**不**匹配根级 `c.md`，只匹配带目录段的路径；`*` 与 `?` 都不跨 `/`。要同时覆盖根级与任意层，请分别写 `*.md` 与 `**` 后接 `/*.md` 两条。

### 全仓文件台账（`ledger/file-ledger.json`）

台账是**唯一的新增可写数据文件**，由 `scripts/generate-file-ledger.cjs`（`npm run ledger:gen`）生成，由 `scripts/check-file-ledger.cjs`（`npm run check:ledger`）只读校验。三部分：

- `meta` —— 元信息：生成日期、台账宇宙（= `git ls-files`）、`tracked_total`、`universe_hash`（= `sha256(排序后的已跟踪清单)`）、字节/覆盖率基准说明、已知差异（`known_divergences`）。
- `exempt_patterns` —— 豁免模式清单（`pattern` + **必填** `reason` + `since`）：示例项目、编译产物、测试与门禁脚本、CI 配置、文档与仓库元数据等按模式豁免。
- `grandfathered` —— 祖父清单：**只减不增**。生成器只保留「原本就在清单里、且仍然既未被模块声明、也未命中豁免、且仍在 git 索引里」的条目；**本次新出现的未归属文件不会被写进清单**（这是棘轮的牙齿：它必须继续被门禁报成 `unowned`/error）。想合法化只有两条路——让模块声明它，或往 `exempt_patterns` 里加一条**带 reason** 的模式。

四态归属（每个已跟踪文件必须落到且只落到一类，**四类计数之和必须等于 `git ls-files` 条数**；这个等式由门禁内部断言，破了即 error）：

| 状态 | 含义 | 允许增长 |
| --- | --- | --- |
| `bound` | 被某模块 `source.path` **精确声明**，且目标是真实存在的**已跟踪普通文件**（目录不算文件） | ✅ |
| `exempt-pattern` | 命中 `exempt_patterns` 的某条模式 | ⚠ 需 reason |
| `grandfathered` | 存量未归属，已知且被接受 | ⚠ 只减 |
| `unowned` | 无归属、无豁免、不在祖父清单 | ❌ 一律 error |

**planned 与 bound 必须分开**：声明存在 ≠ 已覆盖。当前仓库根没有 `normify-*` 数据目录（6 个全在 `examples/` 下），模块声明的目标全部指向**不存在的路径**（计划态），因此 `bound = 0`、**归属覆盖率必须报 0.00%**——把 planned 算成已覆盖会让覆盖率从 0% 假跳到 100%。报告把 `planned` / `bound` / `existing-file` / `existing-dir` / `declared-untracked` 分开回显，绝不合并成一个「覆盖率」。

**改完仓库后必须重跑 `npm run ledger:gen`**：新增/删除/改名任何已跟踪文件都会让 `universe_hash` 漂移，不重生成则门禁报 `tracked-mismatch`（error）。生成器**只重算机器可算的部分**（`tracked_total` / `universe_hash` / `grandfathered`），保留 `meta` 其余字段与全部豁免条目——它**绝不自动新增豁免**（豁免必须由人写明理由），也**绝不新增祖父条目**（只减不增）。改完台账要 `git add ledger/file-ledger.json`：门禁以**索引 blob** 为判定基准，工作区与索引不一致会报 `ledger-index-drift`（error）。**改了门禁脚本、生成器、`package.json` 或 CI 配置同样要 `git add`**——`git commit` 写进历史、CI 与新克隆看到的都是**索引里的那一份**，工作区改了不 add 等于没改，且两种后果都很难查：`package.json` 里新加的 script 没 add，CI 跑到那一步会直接以 `npm error Missing script` 失败；门禁 / 生成器脚本没 add，CI 与新克隆用的是**旧版门禁**，该红的照样报绿（旧版 `scripts/check-file-ledger.cjs` 不认识 `exempt-too-broad` 与 `ledger-index-drift`，一条 `**` 豁免、一份没 `git add` 的台账都会被它判绿）。新增文件若确实不该归属，就手工往 `exempt_patterns` 加一条带 reason 的模式（注意 `exempt-too-broad` 的过宽判据）。

> 已知缺口（增量 1，2026-10-05）：门禁能拦住「生成器自动新增祖父条目」，但拦不住「人手工把某条**确实在索引里**的路径加进 `grandfathered` 并一起 `git add`」（不在索引里的手工条目会被 `check:ledger:gen` 与 `grandfathered-removable` 抓出来，边界见下面 `check:ledger:gen` 那条）——`grandfathered` 的集合没有与上一版（`HEAD` 版台账）做基线比对，而本仓当前的台账尚未进入 `HEAD`。后续增量需要「与 `HEAD` 版台账比对、只允许集合缩小」的检查项。

## 全量门禁

`npm run check` 按顺序跑：`npm run typecheck` → `npm run build` → `npm test` → `node ci-contract-check.cjs` → `npm run check:refs` → `npm run check:docs` → `npm run check:libsync` → `npm run check:examples` → `npm run check:ledger:gen` → `npm run check:ledger`（CI 里每道门禁各占一个独立步骤，红了能一眼看出是哪道）。下面五道脚本门禁的当前口径（`check:libsync` / `check:examples` 于 2026-10-05 接入：此前脚本已完工但零接线，永远不会被执行；`check:ledger:gen` 于同日晚些时候接入，理由见该条）：

- **`npm run check:docs`**（= `node scripts/check-doc-snippets.cjs`，共 4 项检查）— 扫描 `README.md` / `README_EN.md`、`docs/**` 与 `skills/**`（含 `docs/RELEASE-*.md`）里的围栏代码块：语言标记为 `ts`/`typescript` 且含包 `import`/`require` 的块还原成 `.ts`，用仓库自带 typescript 以 `--noEmit --strict` 编译（`paths` 映射到 `lib/types/*.d.ts`），并核对文档里的工具数量断言、`createPromptManagerTools` 必填选项与 `execute` 签名描述。**2026-10-05 起多处判定由 warning 升为 error**：`js`/`cjs`/`mjs` 等「代码语言」块里出现包 `import`/`require` 却未被编译（`uncompiled-package-example`）直接红（历史上把语言标记写成 `js` 就能悄悄绕过编译），**运行时工具数量取不到也是 error 而不是 warning**（`lib/` 未 build、入口不导出工厂、调用失败）——所以它必须排在 `build` 之后：CI 里由前面的 Build 步骤提供 `lib/` 与运行时数量，缺了是红，不是黄。
- **`npm run check:libsync`**（= `node scripts/check-lib-sync.cjs`）— **git 索引里的 `lib/`** 必须与「拿索引版 `src/` 全新编译」的产物**逐字节**一致（零归一化）。基准刻意取 git 索引而不是工作区：`check` 链里 `build` 排在它前面，比工作区会永远绿，恰好放过它唯一要抓的那种提交（`src/` 改了、`lib/` 没重建就提交）。代价是一次全量 tsc；临时工程建在 `os.tmpdir()`，被检查仓库运行期只读。
- **`npm run check:examples`**（= `node scripts/check-examples.cjs`）— 逐条执行脚本内 `INCLUDE` 清单里的示例（当前 3 条），断言退出 0，并在每条示例运行前后各取一次 git 快照（`git status --porcelain -z`，含 `--ignored`）求差：示例失败/超时，或改动仓库（**含被忽略路径**的变化）都算 error。依赖 `build` 产物，耗时约 30–60 秒，不要并进 `npm test`。
- **`npm run check:ledger:gen`**（= `node scripts/generate-file-ledger.cjs --check`，只比较不写盘）— 台账必须与「重新生成的结果」**字符串完全相等**（行尾除外，见本段末），否则 exit 1——实现上比的是「重新生成后按 `JSON.stringify(next, null, 2)` 规范化序列化、再补一个尾随换行」得到的字符串与台账文件原文，**不是**解析成对象后做深比较：缩进、键序、空白的任何差异都算不一致；两侧行尾在比较前统一归一到 LF（`normalizeEol`），**只差行尾不算不一致**——Windows 上 `core.autocrlf=true` 会把工作区台账检出成 CRLF，不归一的话全新 clone 在 Windows 上到这一步必然假红，而 Linux CI 全绿。这与 `check:ledger` 的 `ledger-index-drift`（见上）是同一条口径；代价是这一步**不再**能发现「工作区台账被写成 CRLF」这件事本身——写入侧恒输出 LF、门禁又以索引 blob 为判定基准，所以行尾之外的差异（含缩进 / 键序 / 空白 / 任何一个数字）仍然照红。它把「台账还是不是机器可算出来的那一份」变成链上的硬失败，具体拦两类：① 索引清单变了（新增/删除/改名）而台账没重跑（`tracked_total` / `universe_hash` 漂移）；② 祖父清单腐烂没清（条目已经 bound / 已命中豁免 / 已从索引消失——门禁对这类只给 warning，本步直接红）。它**不是**棘轮的牙齿本身：新增的未归属文件不会被生成器写进 `grandfathered`，所以「跑一次 `ledger:gen` 就把 `unowned` 抹掉」这条洗白路径已经不成立（生成器只减不增）；但手工洗白只挡住一半，抓不抓得住取决于那条路径**在不在 git 索引里**：手工加一条**不在索引里**（或已删除 / 改名）的路径再 `git add`，本步会 **exit 1**（重算时该条目按「已从索引消失」被剔除，报告回显「台账 grandfathered=30 条 · 重算 29 条」），`check:ledger` 同时给出 `grandfathered-removable` warning（warning 自身不致红，红线由本步的 exit 1 提供）；只有手工加一条**确实在索引里**、又未被模块声明、也不命中豁免模式的路径时，本步与 `check:ledger` 才都 **exit 0**（keep-only 规则认为它「原本就在清单里」而保留）——这才是下面那条已知缺口的准确边界。与 `check:ledger` 的分工：本步查「台账还是不是机器可算出来的那一份」，`check:ledger` 查「四态归属是否成立」。
- **`npm run check:ledger`**（= `node scripts/check-file-ledger.cjs`，共 10 项检查）— **git 索引里的每个已跟踪文件**必须落到四态之一（`bound` / `exempt-pattern` / `grandfathered` / `unowned`），四类计数之和必须等于 `git ls-files` 条数（内部不变量断言）；台账数据文件 = `ledger/file-ledger.json`。判定基准是 git 索引而不是工作区磁盘列举（被忽略文件不在台账宇宙内），**台账内容也取索引 blob**（`git show :ledger/file-ledger.json`）：工作区与索引不一致、或台账没 `git add`，都报 `ledger-index-drift`（error）。`planned` 声明与 `bound` 覆盖严格分离：声明存在但目标不存在只计 `planned`，绝不计入覆盖率。`--root` 非仓库根一律 error（fail-closed，不回退到别的仓库）；临时夹具仓库要先 `git add` 台账。它**不依赖 `build` 产物**（只读脚本，不 import `lib/`），因此放在链尾只是为了让前四道先给出结论；红了先看是「新文件没归属」（加归属或加带 reason 的豁免）还是「台账过期 / 改了没 `git add`」（重跑 `npm run ledger:gen` 后 `git add`）。与 `check:libsync` 的分工：`lib/` 的可再生性由 `check:libsync` 逐字节保证，台账只把它按模式豁免，不为它单独记归属。

## 修改与验证

1. 改 `src/engine/`（框架无关核心）或 `src/tools.ts` / `src/index.ts`（DSH 适配层）。
2. `npm run typecheck` 通过后再 `npm run build`。
3. 引擎回归：node 直调 lib 引擎跑「建树 → 校验 → 编译 → 渲染 → 负例」闭环。
4. 渲染回归：渲染 HTML 后，提取查看器 JS 做 `node --check`；可用无头浏览器 dump-dom 后做几何断言（线不穿框、文字不出框、标签不压框）。
5. 工具回归：在 DSH 会话内注入插件（dev_inject_plugin），派子代理用 `normify.*` 工具做端到端验收。

## 提交规范

- 每个提交聚焦一件事；破坏性变更必须同步更新 docs/SPEC.zh-CN.md 与 CHANGELOG.md。
- `kind` 枚举扩展是向后兼容变更（只改校验器与渲染器各一处常量表）。
