import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
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
export { graphDigest } from './manifest.js';
export async function readGraph(dataDir) {
    const loaded = await loadAllModules(dataDir);
    const layouts = [];
    for (const path of await listLayoutFiles(dataDir)) {
        const id = idFromLayoutPath(path);
        if (id === null) {
            loaded.errors.push(diag('error', 'layout/path-invalid', '渲染数据路径无效', { path }, {}, []));
            continue;
        }
        const result = await loadLayoutFile(dataDir, id);
        if (result.error)
            loaded.errors.push(result.error);
        if (result.layout)
            layouts.push(result.layout);
    }
    const graph = {
        schema_version: 1,
        modules: loaded.files.map(file => file.module).sort((a, b) => a.id.localeCompare(b.id)),
        layouts: layouts.sort((a, b) => a.id.localeCompare(b.id)),
    };
    return { ok: loaded.errors.length === 0, graph, digest: await graphDigest(dataDir), errors: loaded.errors, warnings: loaded.warnings };
}
/** 所有写入先在候选目录完成 L1/L2/L3；受管 service 负责固定目录和项目锁。 */
async function stageGraph(dataDir, graph, repoRoot, requireBilingual) {
    const errors = [];
    const warnings = [];
    const modules = [];
    const ids = new Set();
    const parents = new Set(graph.modules.map(module => module.parent).filter(parent => parent !== null));
    for (const module of graph.modules) {
        const checked = l1Validate(module, 'graph/' + module.id);
        errors.push(...checked.errors);
        warnings.push(...checked.warnings);
        if (!checked.module)
            continue;
        if (ids.has(module.id))
            errors.push(diag('error', 'structure/id-duplicate', 'JSON 图包含重复模块', { module: module.id }, {}, []));
        ids.add(module.id);
        if (parents.has(module.id) && module.apis !== undefined)
            errors.push(diag('error', 'api/non-leaf', '容器模块不能声明叶子接口', { module: module.id }, {}, ['将 apis 移到叶子模块']));
        if (parents.has(module.id) && module.types !== undefined)
            errors.push(diag('error', 'type/non-leaf', '容器模块不能声明叶子类型', { module: module.id }, {}, ['将 types 移到叶子模块']));
        modules.push(checked.module);
    }
    const layoutIds = new Set();
    for (const layout of graph.layouts) {
        const children = modules.filter(module => module.parent === layout.id).map(module => module.id);
        const childIds = new Set(children);
        const edges = new Set(modules.filter(module => childIds.has(module.id)).flatMap(module => (module.deps ?? []).filter(dep => childIds.has(dep.to)).map(dep => edgeKey(module.id, dep.to))));
        const checked = l1ValidateLayout(layout, layout.id, children, edges, 'graph/layout/' + layout.id);
        errors.push(...checked.errors);
        if (layoutIds.has(layout.id))
            errors.push(diag('error', 'layout/id-duplicate', 'JSON 图包含重复渲染层', { module: layout.id }, {}, []));
        layoutIds.add(layout.id);
    }
    if (errors.length)
        return { ok: false, stage: null, errors, warnings };
    const stageRoot = await mkdtemp(join(tmpdir(), 'normify-graph-'));
    const stage = join(stageRoot, basename(dataDir));
    await mkdir(stage);
    try {
        const current = await loadAllModules(dataDir);
        const bodies = new Map(current.files.map(file => [file.module.uid, file.body]));
        for (const root of ['policy.yml', 'changes'])
            if (existsSync(join(dataDir, root)))
                await cp(join(dataDir, root), join(stage, root), { recursive: true });
        await installDefaultPolicy(stage);
        const context = { files: modules.map(module => ({ module, body: bodies.get(module.uid) ?? '', file: '' })) };
        for (const module of modules.sort((a, b) => a.id.split('.').length - b.id.split('.').length))
            await writeModuleFile(stage, module, bodies.get(module.uid) ?? '', context);
        for (const layout of graph.layouts)
            await writeLayoutFile(stage, layout);
        const checked = await validateProject(stage, { repoRoot, requireBilingual });
        if (!checked.ok) {
            await rm(stageRoot, { recursive: true });
            return { ok: false, stage: null, errors: checked.errors, warnings: checked.warnings };
        }
        return { ok: true, stage, errors: checked.errors, warnings: checked.warnings };
    }
    catch (error) {
        await rm(stageRoot, { recursive: true });
        throw error;
    }
}
export async function validateGraph(dataDir, graph, repoRoot, requireBilingual) {
    const result = await stageGraph(dataDir, graph, repoRoot, requireBilingual);
    if (result.stage)
        await rm(dirname(result.stage), { recursive: true });
    return { ok: result.ok, errors: result.errors, warnings: result.warnings };
}
export async function putGraph(dataDir, graph, repoRoot, requireBilingual, expected) {
    const digest = await graphDigest(dataDir);
    if (expected !== digest)
        return {
            ok: false, errors: [diag('error', 'graph/conflict', '架构图已改变，请读取当前图后重新提交', {}, { expected, actual: digest }, ['重新调用 normify_graph_get'])], warnings: [], digest,
        };
    const staged = await stageGraph(dataDir, graph, repoRoot, requireBilingual);
    if (!staged.ok || !staged.stage)
        return { ok: false, errors: staged.errors, warnings: staged.warnings, digest };
    const stage = staged.stage;
    try {
        const build = await buildProject(stage, { repoRoot, requireBilingual });
        if (!build.ok)
            return { ok: false, errors: build.errors, warnings: build.warnings, digest };
        const render = await renderProject(stage, {});
        if (!render.ok)
            return { ok: false, errors: render.errors, warnings: render.warnings, digest };
        const roots = ['modules', 'renders', 'policy.yml', ...ARTIFACTS];
        const snapshot = await snapshotProject(dataDir, roots);
        try {
            await mkdir(dataDir, { recursive: true });
            for (const root of roots) {
                await rm(join(dataDir, root), { recursive: true, force: true });
                if (existsSync(join(stage, root)))
                    await cp(join(stage, root), join(dataDir, root), { recursive: true });
            }
        }
        catch (error) {
            try {
                await restoreProject(dataDir, snapshot);
            }
            catch (rollbackError) {
                throw new AggregateError([error, rollbackError], '架构图写入失败且回滚未确认');
            }
            throw error;
        }
        return { ok: true, errors: [], warnings: staged.warnings, digest: await graphDigest(dataDir), modules: graph.modules.length,
            artifacts: ARTIFACTS, receipt: build.receipt };
    }
    finally {
        await rm(dirname(stage), { recursive: true });
    }
}
export function moduleDependencies(module) {
    const refs = new Set((module.deps ?? []).map(dep => dep.to));
    for (const api of module.apis ?? [])
        for (const ref of [api.input, api.output])
            if (ref)
                refs.add(ref.module);
    for (const type of module.types ?? [])
        for (const ref of collectSchemaRefs(type.schema))
            if (ref.target)
                refs.add(ref.target.module);
    refs.delete(module.id);
    return [...refs];
}
/** 叶子和容器统一继承祖先声明的依赖；这是契约上下文，不代表开发先后。 */
export function effectiveModuleDependencies(module, byId) {
    const refs = new Set(moduleDependencies(module));
    let parent = module.parent;
    while (parent !== null) {
        const ancestor = byId.get(parent).module;
        for (const ref of moduleDependencies(ancestor))
            refs.add(ref);
        parent = ancestor.parent;
    }
    refs.delete(module.id);
    return [...refs];
}
/** 无调度状态的分工投影；身份、派发与权限仍由 PromptManager 内核持有。 */
export async function workPacket(dataDir, requested, repoRoot, requireBilingual) {
    const checked = await validateProject(dataDir, { repoRoot, requireBilingual });
    if (!checked.ok)
        return { ok: false, errors: checked.errors, warnings: checked.warnings };
    return projectWorkPacket(checked, requested, repoRoot, await graphDigest(dataDir));
}
/** 已验证快照的分工投影；分支整体验证复用同一快照和文件所有权检查。 */
export async function projectWorkPacket(checked, requested, repoRoot, digest, ownershipChecked = false) {
    const selected = new Map();
    const errors = [];
    for (const id of requested) {
        if (!checked.byId.has(id)) {
            errors.push(diag('error', 'module/not-found', '分工目标模块不存在', { module: id }, {}, []));
            continue;
        }
        const descendants = [id];
        while (descendants.length) {
            const candidate = descendants.pop();
            if (selected.has(candidate))
                continue;
            selected.set(candidate, checked.byId.get(candidate));
            descendants.push(...(checked.childrenOf.get(candidate) ?? []));
        }
    }
    if (errors.length)
        return { ok: false, errors, warnings: checked.warnings };
    const external = new Map();
    const pending = [...selected.values()].flatMap(file => effectiveModuleDependencies(file.module, checked.byId));
    while (pending.length) {
        const id = pending.pop();
        if (selected.has(id) || external.has(id))
            continue;
        const module = checked.byId.get(id).module;
        external.set(id, module);
        pending.push(...effectiveModuleDependencies(module, checked.byId));
        // 容器引用代表其子树契约；外部叶子的接口和类型必须进入交接上下文。
        pending.push(...(checked.childrenOf.get(id) ?? []));
    }
    const leaves = [...selected.values()].filter(file => file.module.parent !== null && !checked.childrenOf.has(file.module.id));
    for (const file of leaves)
        if (file.module.source.length === 0)
            errors.push(diag('error', 'worker/source-unassigned', '分工前必须为叶子模块声明目标源码文件；计划态文件可以尚不存在', { module: file.module.id }, {}, ['先为 source 声明该 Worker 要实现的相对路径']));
    const writePaths = new Set(leaves.flatMap(file => file.module.source.map(source => source.path)));
    const identity = async (path) => {
        const canonical = await canonicalPath(await boundPath(repoRoot, path));
        return process.platform === 'win32' ? canonical.toLowerCase() : canonical;
    };
    const conflicts = [];
    const owned = ownershipChecked ? new Set() : new Set(await Promise.all([...writePaths].map(identity)));
    for (const file of ownershipChecked ? [] : checked.byId.values()) {
        if (selected.has(file.module.id) || file.module.parent === null || checked.childrenOf.has(file.module.id))
            continue;
        for (const source of file.module.source)
            if (owned.has(await identity(source.path)))
                conflicts.push({ path: source.path, module: file.module.id });
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
//# sourceMappingURL=graph.js.map