import { bindHostExecution, checkExecution, standaloneExecution } from './execution.js';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createNormifyTools, defineNormifyTool } from './tools.js';
import { readGraph, putGraph, validateGraph, workPacket } from './engine/graph.js';
import { BRANCH_PLAN_SCHEMA, readBranchPlan, validateBranchPlan, putBranchPlan, deleteBranchPlan, suggestBranchPlan, branchPacket } from './engine/branches.js';
import { exportBranchWorkerPlan } from './adapters/promptmanager.js';
import { JSON_SCHEMA_DIALECT } from './engine/contracts.js';
import { snapshotProject, restoreProject } from './engine/edit.js';
import { validateProject } from './engine/validate.js';
import { diag } from './engine/diag.js';
import { assertDataDirectory, boundPath, canonicalPath, withProjectLock, WorkspaceError } from './workspace.js';
const TRANSACTION_ROOTS = ['modules', 'renders', 'policy.yml', 'changes', 'branch-plan.json', 'tree.json', 'outline.md', 'api-index.json', 'receipt.json', 'normify.html'];
/** `/conflict` 后缀是引擎对“共享产物已被并发写入者改写”的统一命名口径。 */
const CONFLICT_CODES = ['branch/conflict', 'graph/conflict', 'module/conflict', 'module/id-conflict'];
function conflictCode(code) {
    return CONFLICT_CODES.includes(code) || code.endsWith('/conflict');
}
function codesOf(value) {
    if (typeof value !== 'object' || value === null)
        return [];
    const code = value.code;
    return typeof code === 'string' ? [code] : [];
}
/**
 * CAS 冲突类失败：共享产物在本次调用期间被并发写入者改掉，引擎按摘要复核后在写盘之前就拒绝。
 * 这类失败在磁盘上没有本次调用的任何字节——冲突点全都在第一次写盘之前（graph.ts putGraph 的两处
 * graph/conflict、branches.ts putBranchPlan/deleteBranchPlan、edit.ts patchModule/moveModuleTree、
 * tools.ts module_upsert）——而调用前的快照对冲突产物来说已经是过期版本：
 * 拿它回滚只会销毁并发写入者的新版本，正是引擎层原子捕获竭力避免的事。
 * 所以冲突一律不回滚：撤销一个没写过任何东西的调用没有意义，覆盖赢家的字节才是数据损失。
 */
function lostRace(failure) {
    if (failure instanceof WorkspaceError)
        return conflictCode(failure.code);
    const result = (failure ?? {});
    return [...(Array.isArray(result.errors) ? result.errors : []), result.error].some(item => codesOf(item).some(conflictCode));
}
async function previewTool(dataDir, repoRoot, env, tool, args, execution) {
    const stageRoot = await mkdtemp(join(tmpdir(), 'normify-preview-'));
    const candidate = join(stageRoot, basename(dataDir));
    try {
        await mkdir(candidate);
        for (const path of TRANSACTION_ROOTS)
            if (existsSync(join(dataDir, path)))
                await cp(join(dataDir, path), join(candidate, path), { recursive: true });
        checkExecution(execution);
        const result = await tool.execute({ ...args, dir: candidate, dry_run: false }, execution);
        checkExecution(execution);
        if (!result.ok)
            return { ...result, dryRun: true, changed: [] };
        const validation = await validateProject(candidate, { repoRoot, requireBilingual: env.requireBilingual });
        checkExecution(execution);
        const lost = result.warnings.filter(warning => warning.code === 'structure/api-dropped-on-promote');
        return { ...result, ok: validation.ok && lost.length === 0, dryRun: true, changed: [],
            errors: [...validation.errors, ...lost.map(warning => ({ ...warning, severity: 'error', code: 'module/promotion-contract' }))], warnings: [...result.warnings, ...validation.warnings] };
    }
    finally {
        await rm(stageRoot, { recursive: true });
    }
}
function object(properties, required = []) {
    return { type: 'object', additionalProperties: false, properties, required };
}
/** 与原 CRUD 使用同一绑定参数；预览时只替换候选目录，公开目录不接受 dir。 */
function branchParameters(properties, required = []) {
    return object({ dir: { type: 'string' }, ...properties }, ['dir', ...required]);
}
/** 一个服务实例绑定一个项目，模型参数不拥有改写绑定身份的能力。 */
export async function createPromptManagerTools(options) {
    options = { ...options };
    if (!isAbsolute(options.repoRoot) || !isAbsolute(options.dataDir))
        throw new WorkspaceError('workspace/config', 'repoRoot 和 dataDir 必须由宿主配置为绝对路径');
    if (options.execution !== 'host' && options.execution !== 'standalone')
        throw new WorkspaceError('workspace/config', 'execution 必须明确配置 host 或 standalone');
    if (options.access !== 'read' && options.access !== 'write')
        throw new WorkspaceError('workspace/config', 'access 必须明确配置 read 或 write');
    const repoRoot = await canonicalPath(resolve(options.repoRoot));
    const dataDir = await canonicalPath(resolve(options.dataDir));
    if (!/^normify-[a-z0-9][a-z0-9-]*$/.test(basename(dataDir)))
        throw new WorkspaceError('workspace/config', '结构数据目录必须命名为 normify-<slug>');
    const repoInsideData = relative(dataDir, repoRoot);
    if (repoInsideData === '' || (!isAbsolute(repoInsideData) && repoInsideData !== '..' && !repoInsideData.startsWith('..' + sep)))
        throw new WorkspaceError('workspace/config', '结构数据目录不能等于或包含源码仓库');
    const env = { rootDir: dataDir, requireBilingual: options.requireBilingual ?? true };
    const base = createNormifyTools(env, () => catalog);
    const moduleSchema = base.find(tool => tool.name === 'normify_module_upsert').parameters.properties.frontmatter;
    const graphSchema = object({
        schema_version: { type: 'integer', const: 1 },
        modules: { type: 'array', minItems: 1, items: moduleSchema },
        layouts: { type: 'array', items: { type: 'object' } },
    }, ['schema_version', 'modules', 'layouts']);
    const extra = [
        defineNormifyTool(env, {
            name: 'normify_graph_get', behavior: 'read', description: '读取当前完整 JSON 架构图和固定 digest；编辑后用 graph_put 的 expect_digest 防止覆盖其他 Worker。',
            parameters: object({}),
        }, async () => readGraph(dataDir)),
        defineNormifyTool(env, {
            name: 'normify_graph_put', behavior: 'destroy', description: '以 JSON 一次提交完整模块树、数据类型、输入输出接口和布局。必须提供读取时的 digest；候选先校验和编译，成功后替换图并生成 HTML。未包含的模块将被删除。',
            parameters: object({ graph: graphSchema, expect_digest: { type: 'string', pattern: '^[a-f0-9]{64}$' } }, ['graph', 'expect_digest']),
        }, async (args, execution) => putGraph(dataDir, args.graph, repoRoot, env.requireBilingual, args.expect_digest, execution)),
        defineNormifyTool(env, {
            name: 'normify_graph_validate', behavior: 'read', description: '完整校验候选 JSON 图：模块树、命名类型及引用、接口输入输出、依赖和规则；不修改当前架构图。计划态无需已存在源码。',
            parameters: object({ graph: graphSchema }, ['graph']),
        }, async (args, execution) => validateGraph(dataDir, args.graph, repoRoot, env.requireBilingual, execution)),
        defineNormifyTool(env, {
            name: 'normify_schema_get', behavior: 'read', description: '取得 JSON 架构图、模块及数据类型的统一 Schema，含工具完整参数 Schema；先设计再实现的契约入口。',
            parameters: object({}),
        }, async () => ({ ok: true, schema_version: 1, dialect: JSON_SCHEMA_DIALECT, graph: graphSchema, module: moduleSchema, branch_plan: BRANCH_PLAN_SCHEMA,
            type_ref: object({ module: { type: 'string' }, name: { type: 'string' } }, ['module', 'name']),
            type_uri: 'urn:normify:<module-id>:<type-name>', tools: catalog.map(tool => ({ name: tool.name, behavior: tool.behavior, parameters: tool.parameters })) })),
        defineNormifyTool(env, {
            name: 'normify_work_packet', behavior: 'read', description: '按模块生成 Worker 实现包：模块契约、Markdown 正文、依赖接口及共享类型、目标文件、验收要求和固定架构 digest；发现与其他模块的文件重叠时拒绝独立分工。此结果供内核派工，不产生 Worker 状态。',
            parameters: object({ ids: { type: 'array', minItems: 1, uniqueItems: true, items: { type: 'string' } } }, ['ids']),
        }, async (args) => workPacket(dataDir, args.ids, repoRoot, env.requireBilingual)),
        defineNormifyTool(env, {
            name: 'normify_branch_plan_suggest', behavior: 'read', description: '按源码重叠和显式 together 约束建议可独立验证的交付单元。输出同一 BranchPlan 候选；不猜验收、需求分配或外部依赖策略，不按接口数量分 Worker，不从调用关系生成 needs。候选须补齐后 validate/put。',
            parameters: branchParameters({
                id: BRANCH_PLAN_SCHEMA.properties.id, title: BRANCH_PLAN_SCHEMA.properties.title,
                base_commit: BRANCH_PLAN_SCHEMA.properties.base_commit,
                scope: BRANCH_PLAN_SCHEMA.properties.scope,
                requirement_ids: BRANCH_PLAN_SCHEMA.properties.requirement_ids,
                together: BRANCH_PLAN_SCHEMA.properties.together,
            }, ['id', 'title', 'base_commit', 'scope', 'requirement_ids', 'together']),
        }, async (args, execution) => { const { dir, ...input } = args; return suggestBranchPlan(dir, input, repoRoot, env.requireBilingual, execution); }),
        defineNormifyTool(env, {
            name: 'normify_branch_plan_get', behavior: 'read', description: '读取保存的独立分支拆分计划及 CAS digest；尚无计划时明确返回 plan:null。计划的运行状态和分支由 PromptManager 管理。',
            parameters: branchParameters({}),
        }, async (args) => readBranchPlan(args.dir)),
        defineNormifyTool(env, {
            name: 'normify_branch_plan_validate', behavior: 'read', description: '静态校验分支计划：固定图和 Git 基线、叶子及需求覆盖、唯一文件归属、同组约束、实施 DAG、外部依赖验证方式与验收命令/场景。校验不执行命令，不证明业务或运行隔离已经通过。',
            parameters: branchParameters({ plan: BRANCH_PLAN_SCHEMA }, ['plan']),
        }, async (args, execution) => validateBranchPlan(args.dir, args.plan, repoRoot, env.requireBilingual, execution)),
        defineNormifyTool(env, {
            name: 'normify_branch_plan_put', behavior: 'write', description: '以完整 BranchPlan 创建或更新分组、依赖和独立验收定义；静态校验通过后 CAS 保存。expect_digest 来自 plan_get。dry_run 在隔离候选目录验证，不改原计划。',
            parameters: branchParameters({ plan: BRANCH_PLAN_SCHEMA, expect_digest: { type: 'string', pattern: '^[a-f0-9]{64}$' }, dry_run: { type: 'boolean' } }, ['plan', 'expect_digest']),
        }, async (args, execution) => putBranchPlan(args.dir, args.plan, repoRoot, env.requireBilingual, args.expect_digest, execution)),
        defineNormifyTool(env, {
            name: 'normify_branch_plan_delete', behavior: 'destroy', description: '按 plan_get 的固定 digest 删除静态拆分计划，支持 dry_run；不会删除代码分支、Worker、测试数据或运行资源。',
            parameters: branchParameters({ expect_digest: { type: 'string', pattern: '^[a-f0-9]{64}$' }, dry_run: { type: 'boolean' } }, ['expect_digest']),
        }, async (args, execution) => deleteBranchPlan(args.dir, args.expect_digest, execution)),
        defineNormifyTool(env, {
            name: 'normify_branch_packet', behavior: 'read', description: '取得一个交付单元的冻结分支交接包：模块与外部契约、写入范围、真实前置条件、测试替身、验收定义，以及固定 base_commit/graph_digest/plan_digest。计划陈旧或不完整时拒绝。不会创建分支或派发 Worker。',
            parameters: branchParameters({ unit_id: { type: 'string', minLength: 1 } }, ['unit_id']),
        }, async (args, execution) => branchPacket(args.dir, args.unit_id, repoRoot, env.requireBilingual, execution)),
        defineNormifyTool(env, {
            name: 'normify_branch_plan_export', behavior: 'read', description: '将已保存且重新校验的分支计划投影为 PromptManager WorkerPlan，每个交付单元对应一个 lead 编排组。lead_ref 仅为模板引用，宿主必须核对正式配置、身份和权限；本工具不创建分支、不派工、不签发验证证明。',
            parameters: branchParameters({ lead_ref: { type: 'string', minLength: 1 } }, ['lead_ref']),
        }, async (args, execution) => exportBranchWorkerPlan(args.dir, repoRoot, env.requireBilingual, args.lead_ref, execution)),
    ];
    const catalog = [...base, ...extra].filter(tool => options.access === 'write' || tool.behavior === 'read').map(tool => {
        const parameters = structuredClone(tool.parameters);
        const boundKeys = new Set(['project', 'dir', 'repoRoot', 'dataDir']);
        if (tool.name === 'normify_tree_list')
            boundKeys.add('root');
        for (const key of boundKeys)
            delete parameters.properties?.[key];
        if (parameters.required)
            parameters.required = parameters.required.filter(key => !boundKeys.has(key));
        return {
            ...tool, parameters,
            execute: async (args = {}, suppliedExecution) => {
                try {
                    const supplied = options.execution === 'host' ? bindHostExecution(suppliedExecution) : bindHostExecution(suppliedExecution ?? standaloneExecution);
                    // Bind callbacks as well as directories; callers cannot switch the queued Git root.
                    const execution = Object.freeze({
                        signal: supplied.signal, check: supplied.check,
                        readGit: (root, argv, signal) => {
                            if (root !== repoRoot)
                                throw new WorkspaceError('workspace/binding-fixed', 'Git 只能读取宿主固定的源码根');
                            return supplied.readGit(repoRoot, [...argv], signal);
                        },
                    });
                    checkExecution(execution);
                    args = structuredClone(args);
                    for (const key of boundKeys)
                        if (Object.hasOwn(args, key))
                            throw new WorkspaceError('workspace/binding-fixed', '项目与源码目录由宿主固定，不能通过工具参数修改：' + key);
                    await assertDataDirectory(dataDir);
                    checkExecution(execution);
                    if (typeof args.out === 'string') {
                        await boundPath(dataDir, args.out);
                        if (!args.out.endsWith('.html'))
                            throw new WorkspaceError('workspace/render-path', '架构图输出必须为数据目录内的 .html 文件');
                    }
                    if (typeof args.diff === 'string' && (args.diff.startsWith('-') || /[\x00-\x1f]/.test(args.diff)))
                        throw new WorkspaceError('workspace/git-ref', 'diff 必须为 Git 版本引用，不能是命令选项');
                    const input = { ...args };
                    if (tool.parameters.properties?.dir)
                        input.dir = dataDir;
                    if (tool.parameters.properties?.repoRoot)
                        input.repoRoot = repoRoot;
                    if (tool.name === 'normify_tree_list') {
                        const graph = await withProjectLock(dataDir, async () => {
                            checkExecution(execution);
                            const graph = await readGraph(dataDir);
                            checkExecution(execution);
                            return graph;
                        }, execution.signal, () => checkExecution(execution));
                        return { ...graph, projects: [{ dir: dataDir, slug: basename(dataDir).slice('normify-'.length), roots: graph.graph.modules.filter(module => module.parent === null) }] };
                    }
                    return await withProjectLock(dataDir, async () => {
                        checkExecution(execution);
                        await assertDataDirectory(dataDir);
                        checkExecution(execution);
                        if (tool.behavior === 'read') {
                            const result = await tool.execute(input, execution);
                            checkExecution(execution);
                            return result;
                        }
                        if (tool.name === 'normify_graph_put')
                            return tool.execute(input, execution);
                        if (input.dry_run === true)
                            return previewTool(dataDir, repoRoot, env, tool, input, execution);
                        const snapshot = await snapshotProject(dataDir, [...TRANSACTION_ROOTS, ...(typeof input.out === 'string' ? [input.out] : [])]);
                        // started=false 表示授权门禁在工具执行之前就拒绝了：从快照到门禁之间没有任何写盘，
                        // 本次调用在磁盘上不存在需要撤销的字节（此时回滚只会覆盖并发写入者）。
                        let started = false;
                        let published;
                        try {
                            checkExecution(execution, 'publish');
                            started = true;
                            const result = await tool.execute(input, execution);
                            // 本次执行真正留下的字节，紧接着工具返回时取；恢复只针对它，
                            // 并发写入者之后写进去的版本不会被回滚覆盖（restoreProject 的第二参数）。
                            published = await snapshotProject(dataDir, snapshot.roots);
                            checkExecution(execution);
                            if (!result.ok) {
                                if (!lostRace(result))
                                    await restoreProject(dataDir, snapshot, published);
                                return { ...result, rolled_back: true };
                            }
                            const validation = await validateProject(dataDir, { repoRoot, requireBilingual: env.requireBilingual });
                            checkExecution(execution);
                            const lostContracts = result.warnings.filter(warning => warning.code === 'structure/api-dropped-on-promote');
                            if (!validation.ok || lostContracts.length > 0) {
                                await restoreProject(dataDir, snapshot, published);
                                return { ok: false, errors: [...validation.errors, ...lostContracts.map(warning => ({ ...warning, severity: 'error',
                                            code: 'module/promotion-contract', message: '模块晋升不能丢弃接口；请在同一批次显式将契约下放到子模块' }))],
                                    warnings: validation.warnings, phase: 'validate', rolled_back: true };
                            }
                            return { ...result, validation: { ok: true, errors: [], warnings: validation.warnings } };
                        }
                        catch (error) {
                            if (started && !lostRace(error)) {
                                try {
                                    await restoreProject(dataDir, snapshot, published ?? await snapshotProject(dataDir, snapshot.roots));
                                }
                                catch (rollbackError) {
                                    throw new AggregateError([error, rollbackError], '工具失败且回滚未确认');
                                }
                            }
                            throw error;
                        }
                    }, execution.signal, () => checkExecution(execution));
                }
                catch (error) {
                    const code = error instanceof WorkspaceError ? error.code : 'workspace/operation';
                    return { ok: false, errors: [diag('error', code, error instanceof Error ? error.message : String(error), {}, {}, [])], warnings: [] };
                }
            },
        };
    });
    return catalog;
}
//# sourceMappingURL=service.js.map