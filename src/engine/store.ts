import { checkExecution, readExecutionGit, standaloneExecution, type NormifyToolExecution } from '../execution.js';
import type { Diagnostic, Module, ModuleFile, SourceRef } from './types.js';
import type { Dirent } from 'node:fs';
import { readdir, readFile, writeFile, rename, rm, mkdir, lstat, stat } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { deriveParent, isValidId, moduleFilePath, slugify } from './ids.js';
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
async function walk(dir: string, base: string, out: string[]): Promise<void> {
    let entries: Dirent[];
    try {
        entries = await readdir(dir, { withFileTypes: true });
    }
    catch {
        return;
    }
    for (const e of entries) {
        const rel = base === '' ? e.name : base + '/' + e.name;
        if (e.isDirectory())
            await walk(join(dir, e.name), rel, out);
        else if (e.name.endsWith('.md'))
            out.push(rel);
    }
}
export async function listModuleFiles(projectDir: string): Promise<string[]> {
    const out: string[] = [];
    await walk(join(projectDir, 'modules'), '', out);
    return out.sort();
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
export async function loadAllModules(projectDir: string, options: { requireBilingual?: boolean } = {}): Promise<{ files: ModuleFile[]; errors: Diagnostic[]; warnings: Diagnostic[] }> {
    const errors: Diagnostic[] = [];
    const warnings: Diagnostic[] = [];
    const files: ModuleFile[] = [];
    for (const rel of await listModuleFiles(projectDir)) {
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
    return { files, errors, warnings };
}
/** 判断某模块当前是否为容器（有子模块或是根）。 */
export function isContainer(module: Module, all: Module[]): boolean {
    if (module.parent === null)
        return true;
    return all.some(m => m.parent === module.id);
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
    const existing = findModuleFile(projectDir, module.id);
    if (existing !== null && existing !== target) {
        await rename(existing, target);
        promoted.push(module.id);
    }
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, serializeModule(module, body), 'utf8');
    const parentId = deriveParent(module.id);
    if (parentId !== null) {
        const parentLeaf = moduleFilePath(projectDir, parentId, false);
        if (existsSync(parentLeaf)) {
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
        try {
            const entries = await readdir(d);
            if (entries.length === 0)
                await rm(d, { force: true });
        }
        catch {
            /* 非空或不存在则跳过 */
        }
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
