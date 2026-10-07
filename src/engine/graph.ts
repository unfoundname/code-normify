import { checkExecution, standaloneExecution, type NormifyToolExecution } from '../execution.js';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadAllModules, writeModuleFile } from './store.js';
import { l1Validate } from './frontmatter.js';
import { edgeKey, l1ValidateLayout, loadLayoutFile, listLayoutFiles, idFromLayoutPath, writeLayoutFile } from './layout.js';
import { installDefaultPolicy } from './policy.js';
import { validateProject } from './validate.js';
import { buildProject } from './compile.js';
import { renderProject } from './render.js';
import { snapshotProject, restoreProject } from './edit.js';
import { collectSchemaRefs } from './contracts.js';
import { diag } from './diag.js';
import { graphDigest, BUILD_ARTIFACTS as ARTIFACTS } from './manifest.js';
import { boundPath, canonicalPath } from '../workspace.js';
import type { Diagnostic, LayoutData, Module, ModuleFile } from './types.js';
import type { ValidateOutput } from './validate.js';

/** 可编辑 JSON 图；树边、接口索引和类型关系都由 modules 派生，不再存第二份。 */
export interface ArchitectureGraph {
    schema_version: 1;
    modules: Module[];
    layouts: LayoutData[];
}

export { graphDigest } from './manifest.js';

export async function readGraph(dataDir: string) {
    const loaded = await loadAllModules(dataDir);
    const layouts: LayoutData[] = [];
    for (const path of await listLayoutFiles(dataDir)) {
        const id = idFromLayoutPath(path);
        if (id === null) { loaded.errors.push(diag('error', 'layout/path-invalid', '渲染数据路径无效', { path }, {}, [])); continue; }
        const result = await loadLayoutFile(dataDir, id);
        if (result.error) loaded.errors.push(result.error);
        if (result.layout) layouts.push(result.layout);
    }
    const graph: ArchitectureGraph = {
        schema_version: 1,
        modules: loaded.files.map(file => file.module).sort((a, b) => a.id.localeCompare(b.id)),
        layouts: layouts.sort((a, b) => a.id.localeCompare(b.id)),
    };
    return { ok: loaded.errors.length === 0, graph, digest: await graphDigest(dataDir), errors: loaded.errors, warnings: loaded.warnings };
}

/** 所有写入先在候选目录完成 L1/L2/L3；受管 service 负责固定目录和项目锁。 */
async function stageGraph(dataDir: string, graph: ArchitectureGraph, repoRoot: string, requireBilingual: boolean, execution: NormifyToolExecution = standaloneExecution) {
    checkExecution(execution);
    const errors: Diagnostic[] = [];
    const warnings: Diagnostic[] = [];
    const modules: Module[] = [];
    const ids = new Set<string>();
    const parents = new Set(graph.modules.map(module => module.parent).filter(parent => parent !== null));
    for (const module of graph.modules) {
        const checked = l1Validate(module, 'graph/' + module.id, { requireBilingual });
        errors.push(...checked.errors); warnings.push(...checked.warnings);
        if (!checked.module) continue;
        if (ids.has(module.id)) errors.push(diag('error', 'structure/id-duplicate', 'JSON 图包含重复模块', { module: module.id }, {}, []));
        ids.add(module.id);
        if (parents.has(module.id) && module.apis !== undefined)
            errors.push(diag('error', 'api/non-leaf', '容器模块不能声明叶子接口', { module: module.id }, {}, ['将 apis 移到叶子模块']));
        if (parents.has(module.id) && module.types !== undefined)
            errors.push(diag('error', 'type/non-leaf', '容器模块不能声明叶子类型', { module: module.id }, {}, ['将 types 移到叶子模块']));
        modules.push(checked.module);
    }
    const layoutIds = new Set<string>();
    for (const layout of graph.layouts) {
        const children = modules.filter(module => module.parent === layout.id).map(module => module.id);
        const childIds = new Set(children);
        const edges = new Set(modules.filter(module => childIds.has(module.id)).flatMap(module =>
            (module.deps ?? []).filter(dep => childIds.has(dep.to)).map(dep => edgeKey(module.id, dep.to))));
        const checked = l1ValidateLayout(layout, layout.id, children, edges, 'graph/layout/' + layout.id);
        errors.push(...checked.errors);
        if (layoutIds.has(layout.id)) errors.push(diag('error', 'layout/id-duplicate', 'JSON 图包含重复渲染层', { module: layout.id }, {}, []));
        layoutIds.add(layout.id);
    }
    if (errors.length) return { ok: false, stage: null, errors, warnings };
    const stageRoot = await mkdtemp(join(tmpdir(), 'normify-graph-'));
    const stage = join(stageRoot, basename(dataDir));
    try {
        await mkdir(stage);
        checkExecution(execution);
        const current = await loadAllModules(dataDir);
        checkExecution(execution);
        const bodies = new Map(current.files.map(file => [file.module.uid, file.body]));
        for (const root of ['policy.yml', 'changes'])
            if (existsSync(join(dataDir, root))) await cp(join(dataDir, root), join(stage, root), { recursive: true });
        checkExecution(execution);
        await installDefaultPolicy(stage);
        checkExecution(execution);
        const context = { files: modules.map(module => ({ module, body: bodies.get(module.uid) ?? '', file: '' })) };
        for (const module of modules.sort((a, b) => a.id.split('.').length - b.id.split('.').length)) {
            checkExecution(execution);
            await writeModuleFile(stage, module, bodies.get(module.uid) ?? '', context);
        }
        for (const layout of graph.layouts) await writeLayoutFile(stage, layout);
        const checked = await validateProject(stage, { repoRoot, requireBilingual });
        checkExecution(execution);
        if (!checked.ok) { await rm(stageRoot, { recursive: true }); return { ok: false, stage: null, errors: checked.errors, warnings: checked.warnings }; }
        return { ok: true, stage, errors: checked.errors, warnings: checked.warnings };
    } catch (error) { await rm(stageRoot, { recursive: true }); throw error; }
}

export async function validateGraph(dataDir: string, graph: ArchitectureGraph, repoRoot: string, requireBilingual: boolean, execution: NormifyToolExecution = standaloneExecution) {
    const result = await stageGraph(dataDir, graph, repoRoot, requireBilingual, execution);
    if (result.stage) await rm(dirname(result.stage), { recursive: true });
    checkExecution(execution);
    return { ok: result.ok, errors: result.errors, warnings: result.warnings };
}

export async function putGraph(dataDir: string, graph: ArchitectureGraph, repoRoot: string, requireBilingual: boolean, expected: string, execution: NormifyToolExecution = standaloneExecution) {
    const digest = await graphDigest(dataDir);
    if (expected !== digest) return {
        ok: false, errors: [diag('error', 'graph/conflict', '架构图已改变，请读取当前图后重新提交', {}, { expected, actual: digest }, ['重新调用 normify_graph_get'])], warnings: [], digest,
    };
    const staged = await stageGraph(dataDir, graph, repoRoot, requireBilingual, execution);
    if (!staged.ok || !staged.stage) return { ok: false, errors: staged.errors, warnings: staged.warnings, digest };
    const stage = staged.stage;
    try {
        const build = await buildProject(stage, { repoRoot, requireBilingual });
        checkExecution(execution);
        if (!build.ok) return { ok: false, errors: build.errors, warnings: build.warnings, digest };
        const render = await renderProject(stage, {});
        checkExecution(execution);
        if (!render.ok) return { ok: false, errors: render.errors, warnings: render.warnings, digest };
        const roots = ['modules', 'renders', 'policy.yml', ...ARTIFACTS];
        const snapshot = await snapshotProject(dataDir, roots);
        // 发布前的 CAS 复核：期望值与当前摘要都进 evidence（与写盘前那次复核同一套字段），digest 复用同一个值。
        const actual = await graphDigest(dataDir);
        if (actual !== expected) {
            return { ok: false, errors: [diag('error', 'graph/conflict', '发布前架构图版本改变', {}, { expected, actual }, ['重新调用 normify_graph_get'])], warnings: [], digest: actual };
        }
        checkExecution(execution, 'publish');
        try {
            await mkdir(dataDir, { recursive: true });
            for (const root of roots) {
                checkExecution(execution, 'publish');
                await rm(join(dataDir, root), { recursive: true, force: true });
                if (existsSync(join(stage, root))) await cp(join(stage, root), join(dataDir, root), { recursive: true });
            }
            checkExecution(execution);
        } catch (error) {
            try { await restoreProject(dataDir, snapshot); }
            catch (rollbackError) { throw new AggregateError([error, rollbackError], '架构图写入失败且回滚未确认'); }
            throw error;
        }
        return { ok: true, errors: [], warnings: staged.warnings, digest: await graphDigest(dataDir), modules: graph.modules.length,
            artifacts: ARTIFACTS, receipt: build.receipt };
    } finally { await rm(dirname(stage), { recursive: true }); }
}

export function moduleDependencies(module: Module): string[] {
    const refs = new Set((module.deps ?? []).map(dep => dep.to));
    for (const api of module.apis ?? []) for (const ref of [api.input, api.output]) if (ref) refs.add(ref.module);
    for (const type of module.types ?? []) for (const ref of collectSchemaRefs(type.schema)) if (ref.target) refs.add(ref.target.module);
    refs.delete(module.id);
    return [...refs];
}

/** 叶子和容器统一继承祖先声明的依赖；这是契约上下文，不代表开发先后。 */
export function effectiveModuleDependencies(module: Module, byId: ReadonlyMap<string, ModuleFile>): string[] {
    const refs = new Set(moduleDependencies(module));
    let parent = module.parent;
    while (parent !== null) {
        const ancestor = byId.get(parent)!.module;
        for (const ref of moduleDependencies(ancestor)) refs.add(ref);
        parent = ancestor.parent;
    }
    refs.delete(module.id);
    return [...refs];
}

/** 无调度状态的分工投影；身份、派发与权限仍由 PromptManager 内核持有。 */
export async function workPacket(dataDir: string, requested: string[], repoRoot: string, requireBilingual: boolean) {
    const checked = await validateProject(dataDir, { repoRoot, requireBilingual });
    if (!checked.ok) return { ok: false, errors: checked.errors, warnings: checked.warnings };
    return projectWorkPacket(checked, requested, repoRoot, await graphDigest(dataDir));
}

/** 已验证快照的分工投影；分支整体验证复用同一快照和文件所有权检查。 */
export async function projectWorkPacket(checked: ValidateOutput, requested: string[], repoRoot: string, digest: string, ownershipChecked = false) {
    const selected = new Map<string, ModuleFile>();
    const errors: Diagnostic[] = [];
    for (const id of requested) {
        if (!checked.byId.has(id)) { errors.push(diag('error', 'module/not-found', '分工目标模块不存在', { module: id }, {}, [])); continue; }
        const descendants = [id];
        while (descendants.length) {
            const candidate = descendants.pop()!;
            if (selected.has(candidate)) continue;
            selected.set(candidate, checked.byId.get(candidate)!);
            descendants.push(...(checked.childrenOf.get(candidate) ?? []));
        }
    }
    if (errors.length) return { ok: false, errors, warnings: checked.warnings };
    const external = new Map<string, Module>();
    const pending = [...selected.values()].flatMap(file => effectiveModuleDependencies(file.module, checked.byId));
    while (pending.length) {
        const id = pending.pop()!;
        if (selected.has(id) || external.has(id)) continue;
        const module = checked.byId.get(id)!.module;
        external.set(id, module);
        pending.push(...effectiveModuleDependencies(module, checked.byId));
        // 容器引用代表其子树契约；外部叶子的接口和类型必须进入交接上下文。
        pending.push(...(checked.childrenOf.get(id) ?? []));
    }
    const leaves = [...selected.values()].filter(file => file.module.parent !== null && !checked.childrenOf.has(file.module.id));
    for (const file of leaves) if (file.module.source.length === 0)
        errors.push(diag('error', 'worker/source-unassigned', '分工前必须为叶子模块声明目标源码文件；计划态文件可以尚不存在', { module: file.module.id }, {}, ['先为 source 声明该 Worker 要实现的相对路径']));
    const writePaths = new Set(leaves.flatMap(file => file.module.source.map(source => source.path)));
    const identity = async (path: string) => {
        const canonical = await canonicalPath(await boundPath(repoRoot, path));
        return process.platform === 'win32' ? canonical.toLowerCase() : canonical;
    };
    const conflicts: { path: string; module: string }[] = [];
    const owned = ownershipChecked ? new Set<string>() : new Set(await Promise.all([...writePaths].map(identity)));
    for (const file of ownershipChecked ? [] : checked.byId.values()) {
        if (selected.has(file.module.id) || file.module.parent === null || checked.childrenOf.has(file.module.id)) continue;
        for (const source of file.module.source) if (owned.has(await identity(source.path))) conflicts.push({ path: source.path, module: file.module.id });
    }
    for (const conflict of conflicts)
        errors.push(diag('error', 'worker/file-overlap', '目标文件同时属于其他未选择的叶子模块，不能独立分工', { module: conflict.module }, { path: conflict.path }, ['重新划分模块文件边界，或把相关模块分到同一 Worker']));
    return {
        ok: errors.length === 0, errors, warnings: checked.warnings, digest,
        modules: [...selected.values()].map(file => ({ ...file.module })).sort((a, b) => a.id.localeCompare(b.id)),
        context: [...selected.values()].map(file => ({ id: file.module.id, body: file.body })),
        dependencies: [...external.values()].sort((a, b) => a.id.localeCompare(b.id)),
        write_paths: [...writePaths].sort(), conflicts,
        acceptance: ['实现选中模块声明的接口与 JSON Schema 数据契约', '仅修改 write_paths；外部依赖契约需由其负责 Worker 变更', '实现后 refresh(activate=true)、validate、change_close，提交固定代码版本及测试证据'],
    };
}
