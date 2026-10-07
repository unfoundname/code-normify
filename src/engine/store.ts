import { checkExecution, readExecutionGit, standaloneExecution, type NormifyToolExecution } from '../execution.js';
import type { Diagnostic, Module, ModuleFile, SourceRef } from './types.js';
import type { Dirent } from 'node:fs';
import { readdir, readFile, writeFile, rename, rm, mkdir, lstat, stat } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { deriveParent, idFromFilePath, isValidId, moduleFilePath, slugify } from './ids.js';
import { parseModuleText, serializeModule } from './frontmatter.js';
import { deleteLayoutFile } from './layout.js';
import { installDefaultPolicy } from './policy.js';
import { diag } from './diag.js';
import { boundPath } from '../workspace.js';
export const PROJECT_PREFIX = 'normify-';
export class NormifyError extends Error {
    code: string;
    constructor(code: string, message: string) {
        super(message);
        this.code = code;
        this.name = 'NormifyError';
    }
}
export interface ProjectRef {
    dir: string;
    slug: string;
}
/** 解析结构数据目录：dir 显式给出，或 normify-<project> 落在 rootDir 下。create=true 时自动创建空项目目录（仅写工具使用）。 */
export async function resolveProject(rootDir: string, args: { project?: string; dir?: string }, opts: { create?: boolean } = {}): Promise<ProjectRef> {
    const root = resolve(rootDir);
    const ensureModules = async (p: string): Promise<void> => {
        if (!existsSync(join(p, 'modules'))) {
            if (opts.create) {
                await mkdir(join(p, 'modules'), { recursive: true });
                // 项目创建时自动安装默认架构规则（acyclic 等），让后续设计模块即受约束
                await installDefaultPolicy(p);
            }
            else {
                throw new NormifyError('project/no-modules', '目录不存在或缺少 modules/：' + p);
            }
        }
    };
    if (args.dir !== undefined && args.dir.trim() !== '') {
        const p = resolve(root, args.dir);
        const base = p.split(sep).pop() ?? '';
        if (!base.startsWith(PROJECT_PREFIX)) {
            throw new NormifyError('project/dir-name', '结构数据目录名必须以 ' + PROJECT_PREFIX + ' 开头，如 normify-demo-repo（实际: ' + base + '）');
        }
        await ensureModules(p);
        return { dir: p, slug: base.slice(PROJECT_PREFIX.length) };
    }
    if (args.project !== undefined && args.project.trim() !== '') {
        if (/[\/\\:]/.test(args.project)) {
            throw new NormifyError('project/slug-invalid', 'project 只接受项目 slug；明确目录请使用 dir');
        }
        const slug = slugify(args.project);
        const p = resolve(root, PROJECT_PREFIX + slug);
        await ensureModules(p);
        return { dir: p, slug };
    }
    throw new NormifyError('project/required', '必须提供 project（项目 slug）或 dir（结构数据目录绝对路径）');
}
export function listProjects(rootDir: string): ProjectRef[] {
    const root = resolve(rootDir);
    let entries: string[] = [];
    try {
        entries = readdirSync(root, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name);
    }
    catch {
        return [];
    }
    return entries
        .filter(n => n.startsWith(PROJECT_PREFIX))
        .map(n => ({ slug: n.slice(PROJECT_PREFIX.length), dir: join(root, n) }))
        .sort((a, b) => a.slug.localeCompare(b.slug));
}
/**
 * 模块子树里「**读不了**」的目录（EACCES / EPERM / EIO …）。
 *
 * 为什么必须把它与「不存在」分开：`walk` 原先对 `readdir` 的任何失败都 `return`（静默跳过），
 * 于是**权限失败**与**目录不存在**在引擎里长得一模一样——回退链上没有任何诊断出口，
 * 公开的 `validateProject` 会在漏扫整棵子树之后照样返回 `ok: true`（fail-open：少扫的文件越多，
 * 结论看起来越干净）。这里只记录事实，是否升级为 error 由调用方决定：
 * 只有公开 `validateProject` 这条路径要求「读不了 ⇒ 显式浮出」；
 * 受管 service 的写路径另有更早的检查，不改它们的既有语义。
 */
export interface ModuleWalkReadError {
    /** 仓库/工程相对 posix 路径（例：`modules/demo/alpha`）。 */
    path: string;
    /** 原始错误文本（`String(error)`）。 */
    reason: string;
    /** 出错码（`ENOENT` 不会进这个清单；拿不到码时为 null）。 */
    code: string | null;
}
/**
 * 深度优先收集 `modules/` 下的 `.md`（posix 相对路径）。
 * `readErrors` 传入时，**读不了的目录**会被记进它（`ENOENT` 除外：不存在不是读失败）；
 * 不传时行为与历史版本逐字节一致（受管 service / 写路径依赖这个默认值）。
 */
async function walk(dir: string, base: string, out: string[], readErrors?: ModuleWalkReadError[]): Promise<void> {
    let entries: Dirent[];
    try {
        entries = await readdir(dir, { withFileTypes: true });
    }
    catch (error) {
        // 「不存在」与「读不了」是两件事：前者沿用既有语义（静默跳过，交给 no-root 那类结构检查），
        // 后者必须显式浮出——静默跳过会让上层漏扫后报 ok（fail-open）。
        const code = (error as NodeJS.ErrnoException).code ?? null;
        if (code !== 'ENOENT' && readErrors !== undefined)
            readErrors.push({ path: base === '' ? 'modules' : 'modules/' + base, reason: String(error), code });
        return;
    }
    for (const e of entries) {
        const rel = base === '' ? e.name : base + '/' + e.name;
        if (e.isDirectory())
            await walk(join(dir, e.name), rel, out, readErrors);
        else if (e.name.endsWith('.md'))
            out.push(rel);
    }
}
export async function listModuleFiles(projectDir: string, options: { readErrors?: ModuleWalkReadError[] } = {}): Promise<string[]> {
    const out: string[] = [];
    await walk(join(projectDir, 'modules'), '', out, options.readErrors);
    return out.sort();
}
/**
 * `modules/` 下的两类结构异常（SPEC §5.2 规则 6 的后半句：「`modules/` 下**无游离文件、无空树目录**」）。
 *
 * 为什么必须单独查：`walk`（`listModuleFiles`）**只收 `.md`**——非 `.md` 文件与不含模块文件的目录都被
 * 静默跳过，于是「modules/ 下有不该有的东西」在 L1/L2 整条链路上**没有任何诊断出口**（那条规则写了，
 * 但没人实现）。判据只看**磁盘**，与 `listModuleFiles` 同源（引擎按文件系统读模块，不按 git 索引）。
 *
 *   游离文件   = `modules/` 下任何**不以 `.md` 结尾**的普通文件（编辑器的临时文件、误落的数据文件……）；
 *   空树目录   = `modules/` 下任何**子树里一个 `.md` 都没有**的目录（git 不跟踪空目录，所以它只可能
 *                来自磁盘操作；它下面就算有文件，那些文件也全是游离文件）。
 * `modules/` 根本身不算「空树目录」（那种情形已由 `structure/no-root` 报出，不重复点名）。
 */
export async function listModuleTreeAnomalies(projectDir: string): Promise<{ strayFiles: string[]; emptyTreeDirs: string[] }> {
    const strayFiles: string[] = [];
    const emptyTreeDirs: string[] = [];
    const visit = async (dir: string, rel: string): Promise<number> => {
        let entries: Dirent[];
        try {
            entries = await readdir(dir, { withFileTypes: true });
        }
        catch {
            return 0; // 目录不存在 / 读不了：与 walk 同款（这里不报，交给 no-root 那类检查）
        }
        let moduleFiles = 0;
        for (const e of entries) {
            const childRel = rel === '' ? e.name : rel + '/' + e.name;
            if (e.isDirectory())
                moduleFiles += await visit(join(dir, e.name), childRel);
            else if (e.name.endsWith('.md'))
                moduleFiles += 1;
            else
                strayFiles.push(childRel);
        }
        if (rel !== '' && moduleFiles === 0)
            emptyTreeDirs.push(rel);
        return moduleFiles;
    };
    await visit(join(projectDir, 'modules'), '');
    return { strayFiles: strayFiles.sort(), emptyTreeDirs: emptyTreeDirs.sort() };
}
/** 找模块现有文件（容器 index.md 优先，其次叶子 x.md）。 */
export function findModuleFile(projectDir: string, id: string): string | null {
    if (!isValidId(id))
        return null;
    const container = moduleFilePath(projectDir, id, true);
    if (existsSync(container))
        return container;
    const leaf = moduleFilePath(projectDir, id, false);
    if (existsSync(leaf))
        return leaf;
    return null;
}
/**
 * 读全部模块文件（L1 入口）。
 * `options.surfaceDirReadErrors = true` 时，「**读不了**的目录」（非 ENOENT）会被升级成 `input/read` **error**：
 * 与下面「读不了模块文件」的诊断同码、同形状（缺一个目录会让整棵子树静默消失，比缺一个文件更严重）。
 * 不传时行为与历史版本逐字节一致——目前只有公开 `validateProject` 传它（见 `validate.ts`）。
 */
export async function loadAllModules(projectDir: string, options: { requireBilingual?: boolean; surfaceDirReadErrors?: boolean } = {}): Promise<{ files: ModuleFile[]; errors: Diagnostic[]; warnings: Diagnostic[] }> {
    const errors: Diagnostic[] = [];
    const warnings: Diagnostic[] = [];
    const files: ModuleFile[] = [];
    const dirReadErrors: ModuleWalkReadError[] = [];
    for (const rel of await listModuleFiles(projectDir, { readErrors: dirReadErrors })) {
        const abs = join(projectDir, 'modules', rel.replace(/\//g, sep));
        let text: string;
        try {
            text = await readFile(abs, 'utf8');
        }
        catch (error) {
            errors.push(diag('error', 'input/read', '无法读取模块文件', { path: rel }, { reason: String(error) }, []));
            continue;
        }
        const parsed = parseModuleText(text, rel, options);
        errors.push(...parsed.errors);
        warnings.push(...parsed.warnings);
        if (parsed.module !== null) {
            files.push({ module: parsed.module, body: parsed.body, file: rel });
        }
    }
    if (options.surfaceDirReadErrors === true) {
        for (const e of dirReadErrors) {
            errors.push(diag('error', 'input/read', '无法读取模块目录（该目录下的模块文件全部被漏扫）', { path: e.path }, { reason: e.reason, code: e.code }, ['检查该目录的读/执行权限后重跑；漏扫目录时校验结论不可信（少扫的文件越多，看起来越干净）']));
        }
    }
    return { files, errors, warnings };
}
/** 判断某模块当前是否为容器（有子模块或是根）。 */
export function isContainer(module: Module, all: Module[]): boolean {
    if (module.parent === null)
        return true;
    return all.some(m => m.parent === module.id);
}
/** 两个绝对路径是否指向同一个文件（Windows 上文件系统折叠大小写，比对也必须折叠，否则会漏判顶替）。 */
function sameFile(a: string, b: string): boolean {
    const norm = (p: string): string => {
        const abs = resolve(p);
        return process.platform === 'win32' ? abs.toLowerCase() : abs;
    };
    return norm(a) === norm(b);
}
/**
 * 目标文件与 id 的**往返一致性**（SPEC §3.2 的映射 + §5.2 规则 6「文件位置与 id 映射一致」，error 级 MUST）。
 *
 * 为什么要单独查：SPEC §3.2 的映射是「叶子 = `<最后一段>.md`」，于是**末段为 `index` 的叶子**算出的路径
 * 与「父容器 / 根的文件 `<最后一段>/index.md`」逐字节相同——`demo.index`（叶子）与容器 `demo` 都映射到
 * `modules/demo/index.md`，而 `idFromFilePath('modules/demo/index.md')` 反解回的是 `demo`。
 * `validateProject` 事后确实会报 `structure/file-id-mismatch`，但那是**写完以后**：写入本身不是「新建模块」，
 * 而是把容器根模块的文件**顶替掉**（实测：`demo.index` 覆盖 `modules/demo/index.md`，根的 id 从 `demo`
 * 变成 `demo.index`，`validateProject` 随即报 `structure/no-root` / `structure/parent-not-exist`）。
 * 而且这条判据不能只看「当前有没有别的模块占着那份文件」：`<父>/index.md` 是**留给 `<父>` 做容器/根**的位置，
 * 父模块此刻还没有子模块也一样——所以判据就是往返一致性本身，`occupant` 只用于把话说准。
 *
 * 返回 `null` = 一致（可以写）；否则 `{ target, derived, occupant }`：
 *   target   目标文件（工程相对 posix），derived = 它反解出来的 id（不是本模块的 id）
 *   occupant 现在占着这份文件的模块（可能为 `null`：那个位置只是被布局预留给父模块）
 * **本函数不改 id 空间**：`isValidId('demo.index')` 仍为 true，`<x>.index` 作为**容器**照样合法
 * （它落在 `…/index/index.md`，往返一致）；被拒的只是「算不出自己那份文件」的写法。
 */
export function moduleFileLayoutConflict(projectDir: string, module: Module, files: ModuleFile[]): { target: string; derived: string | null; occupant: ModuleFile | null } | null {
    const all = files.map(f => f.module);
    const target = moduleFilePath(projectDir, module.id, isContainer(module, all));
    const rel = relative(projectDir, target).replace(/\\/g, '/');
    const derived = idFromFilePath(rel);
    if (derived === module.id)
        return null;
    const occupant = files.find(f => sameFile(join(projectDir, 'modules', ...f.file.split('/')), target)) ?? null;
    return { target: rel, derived, occupant };
}
/** 布局冲突的 error 诊断（写路径、dry-run、批量预检共用同一份文案，避免三处口径漂移）。 */
export function moduleFileLayoutConflictDiag(projectDir: string, module: Module, conflict: { target: string; derived: string | null; occupant: ModuleFile | null }): Diagnostic {
    const owner = conflict.occupant === null ? null : conflict.occupant.module.id;
    return diag('error', 'module/file-layout-conflict', (owner === null ? '目标文件是另一个 id 的容器位（文件布局冲突）：' : '目标文件已被另一个模块占用（文件布局冲突）：') + module.id + ' 算出的 ' + conflict.target + ' 反解回 ' + JSON.stringify(conflict.derived) + (owner === null ? '' : '（当前属于 ' + owner + '）'), { module: module.id }, { target: conflict.target, derived: conflict.derived, occupant: owner, reason: '叶子的文件是 `<末段>.md`，末段为 `index` 时与「父容器 / 根的文件 `<最后一段>/index.md`」逐字节相同（SPEC §3.2）；§5.2 规则 6 要求文件位置与 id 映射一致，所以这种 id 在同一棵树里没有属于自己的文件' }, ['改掉末段 `index`（例如 ' + module.id + ' → ' + (deriveParent(module.id) ?? module.id) + '.index-view），或把它写成**容器**（那时它落在 `…/index/index.md`，往返一致）']);
}
/** 写入模块文件；自动晋升父模块（leaf 文件 → index.md）。 */
/** 晋升为容器时 API 必须下放到叶子：摘掉容器上的 apis，并给出丢失的 API 键清单。 */
function stripApisForContainer(file: ModuleFile): { module: Module; dropped: string[] } {
    const dropped = (file.module.apis ?? []).map(a => a.protocol + ':' + a.path);
    if (dropped.length === 0)
        return { module: file.module, dropped };
    const next: Module = { ...file.module, updated_at: new Date().toISOString() };
    delete next.apis;
    return { module: next, dropped };
}
function apiDropWarning(id: string, rel: string, dropped: string[]): Diagnostic {
    return diag('warning', 'structure/api-dropped-on-promote', '模块晋升为容器（' + id + '）：容器不允许声明 API，已从容器上摘除 ' + dropped.join('、'), { module: id }, { file: rel, dropped_apis: dropped }, ['把这些 API 写到合适的叶子子模块的 apis 字段上']);
}
export async function writeModuleFile(projectDir: string, module: Module, body: string, context?: { files: ModuleFile[] }): Promise<{ file: string; promoted: string[]; warnings: Diagnostic[] }> {
    const promoted: string[] = [];
    const warnings: Diagnostic[] = [];
    const loaded = context ?? await loadAllModules(projectDir);
    const all = loaded.files.map(f => f.module);
    const container = isContainer(module, all);
    const target = moduleFilePath(projectDir, module.id, container);
    // 布局冲突必须在**任何写入之前**拦下：否则下面这行 writeFile 顶替的是另一个模块（常常是树的根）的文件。
    const conflict = moduleFileLayoutConflict(projectDir, module, loaded.files);
    if (conflict !== null)
        throw new NormifyError('module/file-layout-conflict', moduleFileLayoutConflictDiag(projectDir, module, conflict).message);
    // 父模块晋升的预检同样放在写入之前：晋升是对**父模块的文件**做 rename，前提是那份文件真的是父模块的。
    // 末段 `index` 的布局冲突会打破这个前提（`demo.index` 的叶子位正是根 `demo` 的 `modules/demo/index.md`），
    // 不查就改名 = 把根模块的文件搬走、根随之消失；而放在 mkdir/write 之后才查还会留下一个刚建出来又没人用的目录。
    const parentId = deriveParent(module.id);
    const parentLeaf = parentId === null ? null : moduleFilePath(projectDir, parentId, false);
    const parentPromotes = parentLeaf !== null && existsSync(parentLeaf);
    if (parentLeaf !== null && parentPromotes) {
        const parentLeafOwner = loaded.files.find(f => sameFile(join(projectDir, 'modules', ...f.file.split('/')), parentLeaf));
        if (parentLeafOwner !== undefined && parentLeafOwner.module.id !== parentId) {
            throw new NormifyError('module/file-layout-conflict', '父模块晋升会顶替另一个模块的文件（文件布局冲突）：' + parentId + ' 的叶子位 `' + relative(projectDir, parentLeaf).replace(/\\/g, '/') + '` 实际属于 ' + parentLeafOwner.module.id + '。末段 `index` 的模块与父容器映射到同一份文件（SPEC §3.2 + §5.2 规则 6），因此它的子模块无法按「叶子晋升为容器」的方式落盘');
        }
    }
    const existing = findModuleFile(projectDir, module.id);
    if (existing !== null && existing !== target) {
        await rename(existing, target);
        promoted.push(module.id);
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, serializeModule(module, body), 'utf8');
    if (parentId !== null && parentPromotes) {
        const parentContainer = moduleFilePath(projectDir, parentId, true);
        await mkdir(dirname(parentContainer), { recursive: true });
        const parentFile = loaded.files.find(f => f.module.id === parentId);
        const stripped = parentFile !== undefined ? stripApisForContainer(parentFile) : null;
        if (parentFile === undefined || stripped === null || stripped.dropped.length === 0) {
            // 无 API 需要摘除：保持原有的"改名即晋升"（字节不变）
            await rename(parentLeaf, parentContainer);
        }
        else {
            await writeFile(parentContainer, serializeModule(stripped.module, parentFile.body ?? ''), 'utf8');
            await rm(parentLeaf, { force: true });
            warnings.push(apiDropWarning(parentId, relative(projectDir, parentContainer).replace(/\\/g, '/'), stripped.dropped));
        }
        promoted.push(parentId);
    }
    return { file: relative(projectDir, target).replace(/\\/g, '/'), promoted, warnings };
}
/** 删除模块及其子树（含空目录清理与父模块降级）。 */
export async function deleteModuleTree(projectDir: string, id: string): Promise<{ deleted: string[]; demoted: string | null; warnings: Diagnostic[] }> {
    const warnings: Diagnostic[] = [];
    const { files } = await loadAllModules(projectDir);
    const all = files.map(f => f.module);
    if (!all.some(m => m.id === id)) {
        throw new NormifyError('module/not-found', '模块不存在：' + id);
    }
    const toDelete = new Set([id]);
    let grew = true;
    while (grew) {
        grew = false;
        for (const m of all) {
            if (!toDelete.has(m.id) && m.parent !== null && toDelete.has(m.parent)) {
                toDelete.add(m.id);
                grew = true;
            }
        }
    }
    const order = all.filter(m => toDelete.has(m.id)).sort((a, b) => b.id.length - a.id.length);
    const deleted: string[] = [];
    for (const m of order) {
        const file = findModuleFile(projectDir, m.id);
        if (file !== null) {
            await rm(file, { force: true });
            deleted.push(m.id);
        }
    }
    await pruneEmptyDirs(join(projectDir, 'modules'), deleted);
    // 结构删除时同步清理对应的渲染数据（避免孤儿 layout 阻断校验）
    for (const deletedId of deleted)
        await deleteLayoutFile(projectDir, deletedId);
    const parentId = deriveParent(id);
    let demoted: string | null = null;
    if (parentId !== null) {
        const remaining = all.filter(m => !toDelete.has(m.id));
        const parentStill = remaining.find(m => m.id === parentId);
        if (parentStill !== undefined && parentStill.parent !== null && !remaining.some(m => m.parent === parentId)) {
            const container = moduleFilePath(projectDir, parentId, true);
            if (existsSync(container)) {
                const leaf = moduleFilePath(projectDir, parentId, false);
                await mkdir(dirname(leaf), { recursive: true });
                await rename(container, leaf);
                await deleteLayoutFile(projectDir, parentId);
                demoted = parentId;
            }
        }
    }
    return { deleted, demoted, warnings };
}
/**
 * 删掉删除模块后**已经空掉**的目录（深路径优先）。与 `edit.ts` 的 `pruneEmpty` 同一处病根与同一修法：
 * `rm(dir, { force: true })` 删目录抛 `ERR_FS_EISDIR`，而原地把异常静默 catch 掉 ⇒ 清理从未生效、
 * `modules/` 下残留空目录（SPEC §5.2 规则 6 的 `structure/empty-tree-dir` 会点名）。
 * 只有**先确认为空**才 `recursive` 删；catch 只吞 ENOENT，其余抛出（不静默吞错）。
 */
async function pruneEmptyDirs(base: string, deletedIds: string[]): Promise<void> {
    const dirs = new Set<string>();
    for (const id of deletedIds) {
        const segs = id.split('.');
        for (let i = 1; i <= segs.length; i++) {
            dirs.add(join(base, ...segs.slice(0, i)));
        }
    }
    const sorted = [...dirs].sort((a, b) => b.length - a.length);
    for (const d of sorted) {
        let entries;
        try {
            entries = await readdir(d);
        }
        catch (error) {
            if ((error as { code?: string }).code !== 'ENOENT')
                throw error;
            continue; // 不存在就是已经达成
        }
        if (entries.length === 0)
            await rm(d, { recursive: true, force: true });
    }
}
/** 叶子晋升容器：x.md → x/index.md。 */
export async function promoteModule(projectDir: string, id: string): Promise<{ file: string; warnings: Diagnostic[] }> {
    const warnings: Diagnostic[] = [];
    const container = moduleFilePath(projectDir, id, true);
    const leaf = moduleFilePath(projectDir, id, false);
    const rel = relative(projectDir, container).replace(/\\/g, '/');
    if (existsSync(container)) {
        return { file: rel, warnings };
    }
    if (!existsSync(leaf)) {
        throw new NormifyError('module/not-found', '模块不存在：' + id);
    }
    await mkdir(dirname(container), { recursive: true });
    const file = (await loadAllModules(projectDir)).files.find(f => f.module.id === id);
    const stripped = file !== undefined ? stripApisForContainer(file) : null;
    if (file === undefined || stripped === null || stripped.dropped.length === 0) {
        await rename(leaf, container);
        return { file: rel, warnings };
    }
    // 容器不允许声明 API：晋升时摘下并回报丢失清单（否则 L2 立刻 api/non-leaf）
    await writeFile(container, serializeModule(stripped.module, file.body ?? ''), 'utf8');
    await rm(leaf, { force: true });
    warnings.push(apiDropWarning(id, rel, stripped.dropped));
    return { file: rel, warnings };
}
/** 仓库当前 HEAD（40 位 SHA）。 */
async function runGit(repoRoot: string, args: string[], execution: NormifyToolExecution): Promise<{ stdout: string; error: string | null }> {
    try { return { stdout: await readExecutionGit(execution, repoRoot, args), error: null }; }
    catch (error) { checkExecution(execution); return { stdout: '', error: error instanceof Error ? error.message : String(error) }; }
}
export async function gitHead(repoRoot: string, execution: NormifyToolExecution = standaloneExecution): Promise<{ sha: string | null; error: string | null }> {
    const result = await runGit(repoRoot, ['rev-parse', 'HEAD'], execution);
    if (result.error !== null) return { sha: null, error: result.error };
    const sha = result.stdout.trim();
    if (!/^[a-f0-9]{40}$/.test(sha))
        return { sha: null, error: 'git HEAD 不是 40 位 SHA：' + sha };
    return { sha, error: null };
}
/** git 变更文件清单（增量再生成的输入）。 */
export async function gitChangedFiles(repoRoot: string, diffSpec: string, execution: NormifyToolExecution = standaloneExecution): Promise<{ files: string[] | null; error: string | null }> {
    const spec = diffSpec.trim() === '' ? 'HEAD' : diffSpec.trim();
    if (spec.startsWith('-') || /[\x00-\x1f]/.test(spec)) return { files: null, error: 'diff 必须为 Git 版本引用，不能是命令选项' };
    const result = await runGit(repoRoot, ['diff', '--name-only', spec], execution);
    if (result.error !== null) return { files: null, error: result.error };
    const changed = result.stdout.split(/\r?\n/).map(s => s.trim()).filter(s => s.length > 0);
    // 新增但未 add 的文件（AI 开发中最常见的“新文件”形态）也纳入同步建议
    const untracked = await runGit(repoRoot, ['ls-files', '--others', '--exclude-standard'], execution);
    if (untracked.error !== null) return { files: null, error: untracked.error };
    {
        for (const f of String(untracked.stdout).split(/\r?\n/).map(s => s.trim())) {
            if (f.length > 0 && !changed.includes(f))
                changed.push(f);
        }
    }
    return { files: changed, error: null };
}
/** source 路径的落地形态：普通文件（含指向普通文件的符号链接）/ 路径不存在 / 存在但不是普通文件。 */
export type SourcePathKind = 'file' | 'missing' | 'not-a-file';
/**
 * 判定 source 路径属于哪种落地形态。三态必须分开：existsSync 对目录同样返回 true，
 * 用它判存在会把「目录」算成已落地的源码文件（历史上目录于是被报成「文件缺失」）。
 *  · lstat ENOENT           → missing（路径确实不存在）；
 *  · lstat 其它 io 错误     → not-a-file（EACCES/EPERM/ELOOP 等都不是「不存在」）；
 *  · 普通文件               → file；
 *  · 符号链接               → 按目标判定：指向普通文件仍算 file，断链或指向目录/设备算 not-a-file。
 */
export async function classifySourcePath(repoRoot: string, path: string): Promise<{ kind: SourcePathKind; abs: string }> {
    const abs = await boundPath(repoRoot, path);
    let info;
    try {
        info = await lstat(abs);
    }
    catch (error) {
        return { kind: (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'missing' : 'not-a-file', abs };
    }
    if (info.isFile())
        return { kind: 'file', abs };
    if (info.isSymbolicLink()) {
        try {
            return { kind: (await stat(abs)).isFile() ? 'file' : 'not-a-file', abs };
        }
        catch {
            // 断链符号链接：lstat 命中、stat 落空，既不是普通文件也不是「路径不存在」
            return { kind: 'not-a-file', abs };
        }
    }
    return { kind: 'not-a-file', abs };
}
/** source 文件集合的 SHA-256 指纹（全量哈希，v1 不做采样）。missing 与 notFiles 都让 hash 为 null。 */
export async function fingerprintOf(repoRoot: string, sources: SourceRef[]): Promise<{ hash: string | null; missing: string[]; notFiles: string[] }> {
    const paths = [...new Set(sources.map(s => s.path))].sort();
    const missing: string[] = [];
    const notFiles: string[] = [];
    const hash = createHash('sha256');
    for (const p of paths) {
        try {
            const { kind, abs } = await classifySourcePath(repoRoot, p);
            if (kind === 'missing') {
                missing.push(p);
                continue;
            }
            if (kind === 'not-a-file') {
                notFiles.push(p);
                continue;
            }
            const buf = await readFile(abs);
            hash.update(p);
            hash.update('\0');
            hash.update(buf);
        }
        catch (error) {
            if ((error as { name?: string }).name === 'WorkspaceError') throw error;
            // 分类后仍读失败（并发删除等）：只有 ENOENT 算缺失，其余是「不可作为普通文件读取」
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') missing.push(p);
            else notFiles.push(p);
        }
    }
    return { hash: missing.length > 0 || notFiles.length > 0 ? null : hash.digest('hex'), missing, notFiles };
}
export function sha256Text(text: string): string {
    return createHash('sha256').update(text, 'utf8').digest('hex');
}
