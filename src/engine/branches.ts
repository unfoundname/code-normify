import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Ajv2020 } from 'ajv/dist/2020.js';
import { boundPath, canonicalPath, WorkspaceError } from '../workspace.js';
import { diag } from './diag.js';
import { effectiveModuleDependencies, graphDigest, projectWorkPacket } from './graph.js';
import { validateProject } from './validate.js';
import { snapshotProject, restoreProject } from './edit.js';
import type { ValidateOutput } from './validate.js';
import type { Diagnostic, LocalizedText, Module } from './types.js';

export const BRANCH_PLAN_FILE = 'branch-plan.json';

export interface BranchExternalDependency {
    module: string;
    mode: 'baseline' | 'contract' | 'after' | 'unresolved';
    fixture_paths: string[];
}
export interface BranchVerification {
    commands: { id: string; argv: string[]; cwd: string }[];
    cases: { id: string; description: string; requirement_ids: string[]; command_ids: string[] }[];
    resources: { id: string; kind: 'database' | 'port' | 'filesystem' | 'service'; description: string; isolation: 'unit' }[];
}
export interface BranchUnit {
    id: string;
    title: LocalizedText;
    modules: string[];
    requirement_ids: string[];
    /** 实施先后条件；不得从软件调用箭头自动生成。 */
    needs: string[];
    external_dependencies: BranchExternalDependency[];
    verification: BranchVerification;
}
/** 静态交付契约；Git 分支、Worker 身份、授权与执行证据由宿主持有。 */
export interface BranchPlan {
    schema_version: 1;
    id: string;
    title: LocalizedText;
    graph_digest: string;
    base_commit: string;
    scope: string[];
    requirement_ids: string[];
    together: string[][];
    units: BranchUnit[];
}
export interface BranchSuggestionInput {
    id: string;
    title: LocalizedText;
    base_commit: string;
    scope: string[];
    requirement_ids: string[];
    together: string[][];
}
export interface DerivedBranchUnit {
    id: string;
    modules: string[];
    write_paths: string[];
    external_modules: string[];
    prerequisite_units: string[];
}
export interface BranchPacket {
    unit: BranchUnit;
    base_commit: string;
    graph_digest: string;
    plan_digest: string;
    modules: Module[];
    context: { id: string; body: string }[];
    dependencies: Module[];
    write_paths: string[];
    acceptance: string[];
}

const textSchema = { type: 'string', minLength: 1, pattern: '\\S' };
const idSchema = { type: 'string', pattern: '^[A-Za-z0-9][A-Za-z0-9_.-]*$' };
const moduleSchema = { type: 'string', maxLength: 4096, pattern: '^[a-z0-9][a-z0-9-]*(?:\\.[a-z0-9][a-z0-9-]*)*$' };
const idsSchema = { type: 'array', items: idSchema, uniqueItems: true };
const requirementsSchema = { type: 'array', items: textSchema, uniqueItems: true };
const modulesSchema = { type: 'array', items: moduleSchema, uniqueItems: true };
const titleSchema = { type: 'object', additionalProperties: false, required: ['zh', 'en'], properties: { zh: textSchema, en: textSchema } };
const sourceProperties = {
    id: idSchema, title: titleSchema,
    base_commit: { type: 'string', pattern: '^(?:[0-9a-f]{40}|[0-9a-f]{64})$' },
    scope: { ...modulesSchema, minItems: 1 },
    requirement_ids: { ...requirementsSchema, minItems: 1 },
    together: { type: 'array', items: { ...modulesSchema, minItems: 2 } },
};
/** 空验收和 unresolved 在候选中仍使用同一形态；语义校验阻断保存与交接。 */
export const BRANCH_PLAN_SCHEMA = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object', additionalProperties: false,
    required: ['schema_version', 'id', 'title', 'graph_digest', 'base_commit', 'scope', 'requirement_ids', 'together', 'units'],
    properties: {
        ...sourceProperties, schema_version: { const: 1 }, graph_digest: { type: 'string', pattern: '^[0-9a-f]{64}$' },
        units: {
            type: 'array', minItems: 1, items: {
                type: 'object', additionalProperties: false,
                required: ['id', 'title', 'modules', 'requirement_ids', 'needs', 'external_dependencies', 'verification'],
                properties: {
                    id: idSchema, title: titleSchema, modules: { ...modulesSchema, minItems: 1 }, requirement_ids: requirementsSchema, needs: idsSchema,
                    external_dependencies: {
                        type: 'array', items: { type: 'object', additionalProperties: false, required: ['module', 'mode', 'fixture_paths'], properties: {
                            module: moduleSchema, mode: { enum: ['baseline', 'contract', 'after', 'unresolved'] },
                            fixture_paths: { type: 'array', items: textSchema, uniqueItems: true },
                        } },
                    },
                    verification: {
                        type: 'object', additionalProperties: false, required: ['commands', 'cases', 'resources'], properties: {
                            commands: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'argv', 'cwd'], properties: {
                                id: idSchema, cwd: textSchema,
                                argv: { type: 'array', minItems: 1, prefixItems: [{ type: 'string', minLength: 1, pattern: '^[^\\u0000]+$' }], items: { type: 'string', pattern: '^[^\\u0000]*$' } },
                            } } },
                            cases: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'description', 'requirement_ids', 'command_ids'], properties: {
                                id: idSchema, description: textSchema, requirement_ids: requirementsSchema, command_ids: { ...idsSchema, minItems: 1 },
                            } } },
                            resources: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'kind', 'description', 'isolation'], properties: {
                                id: idSchema, kind: { enum: ['database', 'port', 'filesystem', 'service'] }, description: textSchema, isolation: { const: 'unit' },
                            } } },
                        },
                    },
                },
            },
        },
    },
};

const ajv = new Ajv2020({ strict: true, strictTuples: false, allErrors: true });
const checkPlan = ajv.compile<BranchPlan>(BRANCH_PLAN_SCHEMA);
const checkSuggestion = ajv.compile<BranchSuggestionInput>({
    type: 'object', additionalProperties: false, required: Object.keys(sourceProperties), properties: sourceProperties,
});
const git = promisify(execFile);
/** 宿主固定的只读 Git 边界；库不取得提交、分支或执行权限。 */
export type BranchGitReader = (repoRoot: string, args: readonly string[]) => Promise<string>;
const standaloneGit: BranchGitReader = async (repoRoot, args) => (await git('git', ['--no-replace-objects', ...args],
    { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })).stdout;
const sha = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const absentDigest = sha(Buffer.alloc(0));
const sorted = (values: Iterable<string>) => [...new Set(values)].sort();

function shapeErrors(validator: typeof checkPlan | typeof checkSuggestion): Diagnostic[] {
    return (validator.errors ?? []).map(error => diag('error', 'branch/schema-invalid', '分支计划不符合静态 JSON 契约：' + error.message,
        { path: error.instancePath }, { keyword: error.keyword, params: error.params }, ['调用 normify_schema_get 查看 branch_plan 契约']));
}

export async function readBranchPlan(dataDir: string) {
    let bytes: Buffer;
    try { bytes = await readFile(join(dataDir, BRANCH_PLAN_FILE)); }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { ok: true, errors: [], warnings: [], plan: null, digest: absentDigest };
        throw error;
    }
    const digest = sha(bytes);
    let raw: unknown;
    try { raw = JSON.parse(bytes.toString('utf8')); }
    catch (error) { return { ok: false, errors: [diag('error', 'branch/json-invalid', '分支计划 JSON 无法解析', { path: BRANCH_PLAN_FILE }, { message: String(error) }, [])], warnings: [], plan: null, digest }; }
    if (!checkPlan(raw)) return { ok: false, errors: shapeErrors(checkPlan), warnings: [], plan: null, digest };
    return { ok: true, errors: [], warnings: [], plan: raw, digest };
}

interface Context {
    checked: ValidateOutput;
    graph_digest: string;
    leaves: Map<string, Module>;
    descendantLeaves: Map<string, string[]>;
    directReferences: Map<string, string[]>;
    paths: Map<string, string>;
    errors: Diagnostic[];
    warnings: Diagnostic[];
}
async function identity(repoRoot: string, path: string): Promise<string> {
    const canonical = await canonicalPath(await boundPath(repoRoot, path));
    return process.platform === 'win32' ? canonical.toLowerCase() : canonical;
}
async function context(dataDir: string, repoRoot: string, requireBilingual: boolean): Promise<Context> {
    const checked = await validateProject(dataDir, { repoRoot, requireBilingual });
    const errors = [...checked.errors];
    const leaves = new Map(checked.files.filter(file => file.module.parent !== null && !checked.childrenOf.has(file.module.id)).map(file => [file.module.id, file.module]));
    const descendantLeaves = new Map<string, string[]>();
    for (const module of leaves.values()) {
        const parts = module.id.split('.');
        for (let end = 1; end <= parts.length; end++) {
            const id = parts.slice(0, end).join('.');
            const descendants = descendantLeaves.get(id) ?? [];
            descendants.push(module.id);
            descendantLeaves.set(id, descendants);
        }
    }
    // 祖先链只有在结构校验通过后才可用于依赖推导；错误图保留原始诊断。
    const directReferences = checked.ok
        ? new Map([...leaves.values()].map(module => [module.id, sorted(effectiveModuleDependencies(module, checked.byId).flatMap(id => descendantLeaves.get(id) ?? []))]))
        : new Map<string, string[]>();
    const paths = new Map<string, string>();
    for (const module of leaves.values()) for (const source of module.source) {
        if (paths.has(source.path)) continue;
        try { paths.set(source.path, await identity(repoRoot, source.path)); }
        catch (error) { errors.push(diag('error', error instanceof WorkspaceError ? error.code : 'branch/path-unavailable', String(error), { module: module.id }, { path: source.path }, [])); }
    }
    return { checked, graph_digest: await graphDigest(dataDir), leaves, descendantLeaves, directReferences, paths, errors, warnings: [...checked.warnings] };
}

function expand(ctx: Context, requested: string[], errors: Diagnostic[], field: string): string[] {
    const selected = new Set<string>();
    for (const id of requested) {
        if (!ctx.checked.byId.has(id)) { errors.push(diag('error', 'branch/module-not-found', '计划引用的模块不存在', { module: id, path: field }, {}, [])); continue; }
        const matches = (ctx.descendantLeaves.get(id) ?? []).map(leaf => ctx.leaves.get(leaf)!).filter(module => module.state !== 'deprecated');
        if (!matches.length) errors.push(diag('error', 'branch/scope-empty', '模块选区没有可开发的非废弃叶子', { module: id, path: field }, {}, []));
        for (const module of matches) selected.add(module.id);
    }
    return sorted(selected);
}
function externalModules(ctx: Context, modules: string[]): string[] {
    const selected = new Set(modules);
    const refs = new Set<string>();
    for (const id of modules) for (const dep of ctx.directReferences.get(id) ?? []) if (!selected.has(dep)) refs.add(dep);
    return sorted(refs);
}

/** 完整 OID 必须确实是绑定仓库的 commit；HEAD 可以继续变化。 */
async function baseline(repoRoot: string, oid: string, errors: Diagnostic[], readGit: BranchGitReader): Promise<Map<string, { mode: string; size: number }> | null> {
    try {
        const root = await readGit(repoRoot, ['rev-parse', '--show-toplevel']);
        const actualRoot = await canonicalPath(root.trim());
        const expectedRoot = await canonicalPath(repoRoot);
        const sameRoot = process.platform === 'win32' ? actualRoot.toLowerCase() === expectedRoot.toLowerCase() : actualRoot === expectedRoot;
        if (!sameRoot) throw new Error('宿主绑定的源码根必须是该仓库或 worktree 的根目录');
        const result = await readGit(repoRoot, ['cat-file', '-t', oid]);
        if (result.trim() !== 'commit') throw new Error('OID 不是 commit 对象');
        const tree = await readGit(repoRoot, ['ls-tree', '-r', '-l', '-z', oid]);
        const files = new Map<string, { mode: string; size: number }>();
        for (const line of tree.split('\0')) {
            if (!line) continue;
            const tab = line.indexOf('\t');
            const [mode, type, , size] = line.slice(0, tab).trim().split(/\s+/);
            if (type === 'blob') files.set(line.slice(tab + 1), { mode, size: Number(size) });
        }
        return files;
    } catch (error) {
        errors.push(diag('error', 'branch/base-commit-invalid', '固定基线不是绑定仓库中可读取的 commit', {}, { base_commit: oid, message: error instanceof Error ? error.message : String(error) }, ['填写该仓库已有的完整 commit OID']));
        return null;
    }
}
function hasBaselineFile(files: Map<string, { mode: string; size: number }> | null, path: string, nonempty = true): boolean {
    const file = files?.get(path);
    return file !== undefined && (file.mode === '100644' || file.mode === '100755') && (!nonempty || file.size > 0);
}
function uniqueIds(items: { id: string }[], errors: Diagnostic[], field: string, unit: string): void {
    const ids = new Set<string>();
    for (const item of items) {
        if (ids.has(item.id)) errors.push(diag('error', 'branch/id-duplicate', '同一集合中的 id 重复', { unit, path: field }, { id: item.id }, []));
        ids.add(item.id);
    }
}

async function validateWithContext(plan: BranchPlan, ctx: Context, repoRoot: string, readGit: BranchGitReader = standaloneGit) {
    const errors = [...ctx.errors];
    const warnings = [...ctx.warnings];
    if (errors.length > 0) return { ok: false, errors, warnings, plan, graph_digest: ctx.graph_digest, units: [] };
    if (plan.graph_digest !== ctx.graph_digest) errors.push(diag('error', 'branch/graph-drift', '架构图已改变，分支计划的冻结契约已过期', {}, { expected: plan.graph_digest, actual: ctx.graph_digest }, ['读取当前图并重新确认分支计划']));
    const scope = new Set(expand(ctx, plan.scope, errors, 'scope'));
    const owner = new Map<string, string>();
    const unitById = new Map<string, BranchUnit>();
    const requirements = new Set(plan.requirement_ids);
    const covered = new Set<string>();
    const units: DerivedBranchUnit[] = [];
    uniqueIds(plan.units, errors, 'units', plan.id);
    for (const unit of plan.units) {
        unitById.set(unit.id, unit);
        if (unit.requirement_ids.length === 0) errors.push(diag('error', 'branch/unit-requirements-empty', '每个交付单元必须明确负责的正式需求', { unit: unit.id }, {}, []));
        for (const id of unit.modules) {
            if (!ctx.leaves.has(id) || ctx.leaves.get(id)!.state === 'deprecated') errors.push(diag('error', 'branch/module-not-leaf', '交付单元必须明确列出非废弃叶子模块', { unit: unit.id, module: id }, {}, []));
            else if (!scope.has(id)) errors.push(diag('error', 'branch/module-outside-scope', '单元分配了 scope 以外的模块', { unit: unit.id, module: id }, {}, []));
            if (owner.has(id)) errors.push(diag('error', 'branch/module-overlap', '一个叶子模块必须只归属一个交付单元', { unit: unit.id, module: id }, { owner: owner.get(id) }, []));
            owner.set(id, unit.id);
        }
        for (const requirement of unit.requirement_ids) {
            if (!requirements.has(requirement)) errors.push(diag('error', 'branch/requirement-unknown', '单元引用了计划范围以外的正式需求', { unit: unit.id }, { requirement_id: requirement }, []));
            covered.add(requirement);
        }
    }
    for (const id of scope) if (!owner.has(id)) errors.push(diag('error', 'branch/module-unassigned', 'scope 中的叶子未分配到交付单元', { module: id }, {}, []));
    for (const id of requirements) if (!covered.has(id)) errors.push(diag('error', 'branch/requirement-uncovered', '正式需求没有交付单元负责', {}, { requirement_id: id }, []));
    for (const [index, group] of plan.together.entries()) {
        const leaves = expand(ctx, group, errors, 'together/' + index);
        for (const id of leaves) if (!scope.has(id)) errors.push(diag('error', 'branch/together-outside-scope', '必须同组的约束只能引用 scope 内模块', { module: id }, {}, []));
        const assigned = new Set(leaves.map(id => owner.get(id)));
        if (assigned.size > 1) errors.push(diag('error', 'branch/together-split', '明确要求一起修改的模块被拆到了不同单元', {}, { modules: leaves, units: [...assigned] }, []));
    }
    // 文件身份只计算一次；文件不同片段也由同一单元写入。
    const fileOwners = new Map<string, { unit: string | undefined; module: string; path: string }[]>();
    for (const module of ctx.leaves.values()) {
        const unit = owner.get(module.id);
        if (unit !== undefined && module.source.length === 0) errors.push(diag('error', 'branch/source-unassigned', '独立交付前必须明确叶子模块的目标源码文件', { unit, module: module.id }, {}, []));
        for (const source of module.source) {
            const key = ctx.paths.get(source.path);
            if (key === undefined) continue;
            const entries = fileOwners.get(key) ?? [];
            entries.push({ unit, module: module.id, path: source.path });
            fileOwners.set(key, entries);
        }
    }
    for (const entries of fileOwners.values()) {
        if (!entries.some(entry => entry.unit !== undefined)) continue;
        if (new Set(entries.map(entry => entry.unit)).size > 1) errors.push(diag('error', 'branch/file-overlap', '同一真实源码文件属于多个单元或 scope 外模块，无法独立交付', {}, { owners: entries }, ['把相关模块分入同一单元，或明确拆开文件边界']));
    }
    const closures = new Map<string, Set<string>>();
    const visit = (id: string, chain: string[]): Set<string> => {
        const ready = closures.get(id);
        if (ready) return ready;
        if (chain.includes(id)) { errors.push(diag('error', 'branch/needs-cycle', '实施先后条件存在环', { unit: id }, { chain: [...chain, id] }, [])); return new Set(); }
        const dependencies = new Set<string>();
        for (const required of unitById.get(id)!.needs) {
            if (required === id) { errors.push(diag('error', 'branch/needs-self', '单元不能等待自身', { unit: id }, {}, [])); continue; }
            if (!unitById.has(required)) { errors.push(diag('error', 'branch/needs-missing', '实施前置单元不存在', { unit: id }, { needs: required }, [])); continue; }
            dependencies.add(required);
            for (const transitive of visit(required, [...chain, id])) dependencies.add(transitive);
        }
        closures.set(id, dependencies);
        return dependencies;
    };
    for (const id of unitById.keys()) visit(id, []);
    const baselineFiles = await baseline(repoRoot, plan.base_commit, errors, readGit);
    for (const unit of plan.units) {
        const validModules = unit.modules.filter(id => ctx.leaves.has(id) && ctx.leaves.get(id)!.state !== 'deprecated');
        const writePaths = sorted(validModules.flatMap(id => ctx.leaves.get(id)!.source.map(source => source.path)));
        const ownedPaths = new Set(writePaths.map(path => ctx.paths.get(path)).filter((path): path is string => path !== undefined));
        const external = externalModules(ctx, validModules);
        const declared = new Map<string, BranchExternalDependency>();
        for (const dependency of unit.external_dependencies) {
            if (declared.has(dependency.module)) errors.push(diag('error', 'branch/dependency-duplicate', '外部依赖策略重复', { unit: unit.id, module: dependency.module }, {}, []));
            declared.set(dependency.module, dependency);
            if (!external.includes(dependency.module)) { errors.push(diag('error', 'branch/dependency-extra', '声明的外部依赖不属于该单元的直接依赖契约', { unit: unit.id, module: dependency.module }, {}, [])); continue; }
            if (dependency.mode !== 'contract' && dependency.fixture_paths.length > 0) errors.push(diag('error', 'branch/fixture-mode', 'fixture_paths 只用于 contract 依赖策略', { unit: unit.id, module: dependency.module }, {}, []));
            if (dependency.mode === 'unresolved') errors.push(diag('error', 'branch/dependency-unresolved', '外部依赖的验证策略尚未决定', { unit: unit.id, module: dependency.module }, {}, ['明确使用固定基线、契约测试替身，或等待前置交付单元']));
            if (dependency.mode === 'baseline') {
                const sources = ctx.leaves.get(dependency.module)!.source;
                if (sources.length === 0 || sources.some(source => !hasBaselineFile(baselineFiles, source.path))) errors.push(diag('error', 'branch/baseline-source-missing', 'baseline 依赖必须在固定 commit 中拥有可读取的非空源码文件', { unit: unit.id, module: dependency.module }, { base_commit: plan.base_commit, source: sources.map(source => source.path) }, []));
            }
            if (dependency.mode === 'after') {
                const provider = owner.get(dependency.module);
                if (provider === undefined || !closures.get(unit.id)!.has(provider)) errors.push(diag('error', 'branch/dependency-after-missing', 'after 依赖的负责单元必须位于明确的 needs 前置链中', { unit: unit.id, module: dependency.module }, { provider }, []));
            }
            if (dependency.mode === 'contract') {
                if (dependency.fixture_paths.length === 0) errors.push(diag('error', 'branch/fixture-required', 'contract 依赖必须声明测试替身或 fixture 文件', { unit: unit.id, module: dependency.module }, {}, []));
                for (const path of dependency.fixture_paths) {
                    try {
                        const key = await identity(repoRoot, path);
                        if (!hasBaselineFile(baselineFiles, path, false) && !ownedPaths.has(key)) errors.push(diag('error', 'branch/fixture-unavailable', 'fixture 必须属于固定基线或本单元明确的写入范围', { unit: unit.id, module: dependency.module }, { path }, []));
                    } catch (error) { errors.push(diag('error', error instanceof WorkspaceError ? error.code : 'branch/path-unavailable', String(error), { unit: unit.id }, { path }, [])); }
                }
            }
        }
        for (const id of external) if (!declared.has(id)) errors.push(diag('error', 'branch/dependency-undeclared', '直接外部依赖没有明确的独立验证策略', { unit: unit.id, module: id }, {}, []));
        const verification = unit.verification;
        uniqueIds(verification.commands, errors, 'verification/commands', unit.id);
        uniqueIds(verification.cases, errors, 'verification/cases', unit.id);
        uniqueIds(verification.resources, errors, 'verification/resources', unit.id);
        if (verification.commands.length === 0 || verification.cases.length === 0) errors.push(diag('error', 'branch/verification-empty', '独立交付必须声明非空验证命令和验收场景', { unit: unit.id }, {}, []));
        const commands = new Set(verification.commands.map(command => command.id));
        for (const command of verification.commands) if (command.cwd !== '.') {
            try { await boundPath(repoRoot, command.cwd); }
            catch (error) { errors.push(diag('error', error instanceof WorkspaceError ? error.code : 'branch/path-unavailable', String(error), { unit: unit.id, command: command.id }, { cwd: command.cwd }, [])); }
        }
        const unitRequirements = new Set(unit.requirement_ids);
        const verified = new Set<string>();
        for (const testcase of verification.cases) {
            for (const command of testcase.command_ids) if (!commands.has(command)) errors.push(diag('error', 'branch/case-command-missing', '验收场景引用的命令不存在', { unit: unit.id, case: testcase.id }, { command_id: command }, []));
            for (const requirement of testcase.requirement_ids) {
                if (!unitRequirements.has(requirement)) errors.push(diag('error', 'branch/case-requirement-unknown', '验收场景只能覆盖本单元负责的正式需求', { unit: unit.id, case: testcase.id }, { requirement_id: requirement }, []));
                verified.add(requirement);
            }
        }
        for (const requirement of unitRequirements) if (!verified.has(requirement)) errors.push(diag('error', 'branch/verification-uncovered', '单元负责的需求缺少验收场景', { unit: unit.id }, { requirement_id: requirement }, []));
        units.push({ id: unit.id, modules: validModules, write_paths: writePaths, external_modules: external, prerequisite_units: sorted(closures.get(unit.id)!) });
    }
    warnings.push(diag('warning', 'branch/verification-declared', '验证命令、场景和资源隔离仅为静态声明；本工具不执行命令，也不证明真实集成已通过', {}, {}, []));
    return { ok: errors.length === 0, errors, warnings, plan, graph_digest: ctx.graph_digest, units };
}

export async function validateBranchPlan(dataDir: string, raw: unknown, repoRoot: string, requireBilingual: boolean) {
    if (!checkPlan(raw)) return { ok: false, errors: shapeErrors(checkPlan), warnings: [], plan: null, graph_digest: await graphDigest(dataDir), units: [] };
    return validateWithContext(raw, await context(dataDir, repoRoot, requireBilingual), repoRoot);
}

export async function putBranchPlan(dataDir: string, raw: unknown, repoRoot: string, requireBilingual: boolean, expected: string) {
    const current = await readBranchPlan(dataDir);
    if (current.digest !== expected) return { ok: false, errors: [diag('error', 'branch/conflict', '分支计划已改变，请重新读取后提交', {}, { expected, actual: current.digest }, ['调用 normify_branch_plan_get'])], warnings: [], digest: current.digest, plan: null, graph_digest: await graphDigest(dataDir), units: [] };
    const result = await validateBranchPlan(dataDir, raw, repoRoot, requireBilingual);
    if (!result.ok || !result.plan) return { ...result, digest: current.digest };
    const snapshot = await snapshotProject(dataDir, [BRANCH_PLAN_FILE]);
    try {
        await mkdir(dataDir, { recursive: true });
        await writeFile(join(dataDir, BRANCH_PLAN_FILE), JSON.stringify(result.plan, null, 2) + '\n', 'utf8');
    } catch (error) {
        try { await restoreProject(dataDir, snapshot); }
        catch (rollbackError) { throw new AggregateError([error, rollbackError], '分支计划写入失败且回滚未确认'); }
        throw error;
    }
    return { ...result, digest: (await readBranchPlan(dataDir)).digest };
}

export async function deleteBranchPlan(dataDir: string, expected: string) {
    const current = await readBranchPlan(dataDir);
    if (current.digest !== expected) return { ok: false, errors: [diag('error', 'branch/conflict', '分支计划已改变，不能删除其他版本', {}, { expected, actual: current.digest }, [])], warnings: [], digest: current.digest, deleted: false };
    await rm(join(dataDir, BRANCH_PLAN_FILE), { force: true });
    return { ok: true, errors: [], warnings: [], digest: absentDigest, deleted: current.digest !== absentDigest };
}

/** 基于真实共享文件及 together 的连通分量；不猜业务验收和依赖实现顺序。 */
export async function suggestBranchPlan(dataDir: string, input: unknown, repoRoot: string, requireBilingual: boolean) {
    if (!checkSuggestion(input)) return { ok: false, errors: shapeErrors(checkSuggestion), warnings: [], plan: null, graph_digest: await graphDigest(dataDir), units: [] };
    const ctx = await context(dataDir, repoRoot, requireBilingual);
    const selectionErrors: Diagnostic[] = [];
    const leaves = expand(ctx, input.scope, selectionErrors, 'scope');
    const selected = new Set(leaves);
    const parent = new Map(leaves.map(id => [id, id]));
    const find = (id: string): string => {
        const p = parent.get(id)!;
        if (p !== id) parent.set(id, find(p));
        return parent.get(id)!;
    };
    const union = (a: string, b: string) => { const left = find(a); const right = find(b); if (left !== right) parent.set(right, left); };
    const fileOwner = new Map<string, string>();
    for (const id of leaves) for (const source of ctx.leaves.get(id)!.source) {
        const key = ctx.paths.get(source.path);
        if (key === undefined) continue;
        const previous = fileOwner.get(key);
        if (previous !== undefined) union(previous, id);
        else fileOwner.set(key, id);
    }
    for (const [index, group] of input.together.entries()) {
        const members = expand(ctx, group, selectionErrors, 'together/' + index);
        for (const id of members) if (!selected.has(id)) selectionErrors.push(diag('error', 'branch/together-outside-scope', '同组约束包含 scope 外模块', { module: id }, {}, []));
        const inScope = members.filter(id => selected.has(id));
        for (const id of inScope.slice(1)) union(inScope[0], id);
    }
    if (ctx.errors.length || selectionErrors.length || leaves.length === 0) return { ok: false, errors: [...ctx.errors, ...selectionErrors], warnings: ctx.warnings, plan: null, graph_digest: ctx.graph_digest, units: [] };
    const groups = new Map<string, string[]>();
    for (const id of leaves) { const root = find(id); const group = groups.get(root) ?? []; group.push(id); groups.set(root, group); }
    const units: BranchUnit[] = [...groups.values()].sort((a, b) => a[0].localeCompare(b[0])).map((modules, index) => ({
        id: 'unit-' + String(index + 1).padStart(3, '0'),
        title: { zh: modules.map(id => ctx.leaves.get(id)!.name.zh).join('、'), en: modules.map(id => ctx.leaves.get(id)!.name.en).join(', ') },
        modules, requirement_ids: [], needs: [],
        external_dependencies: externalModules(ctx, modules).map(module => ({ module, mode: 'unresolved', fixture_paths: [] })),
        verification: { commands: [], cases: [], resources: [] },
    }));
    const plan: BranchPlan = { schema_version: 1, ...input, graph_digest: ctx.graph_digest, units };
    const result = await validateWithContext(plan, ctx, repoRoot);
    const incompleteCodes = new Set(['branch/verification-empty', 'branch/requirement-uncovered', 'branch/dependency-unresolved', 'branch/unit-requirements-empty']);
    const structural = result.errors.filter(error => !incompleteCodes.has(error.code));
    const readiness = { ok: result.ok, errors: result.errors };
    return { ...result, ok: structural.length === 0, errors: structural, ready: result.ok, readiness,
        warnings: structural.length === 0 && !result.ok ? [...result.warnings, diag('warning', 'branch/candidate-incomplete', '候选已生成；请补齐正式需求、外部依赖策略与独立验收后保存', {}, {}, [])] : result.warnings };
}

async function packetContext(dataDir: string, repoRoot: string, requireBilingual: boolean, readGit: BranchGitReader = standaloneGit) {
    const current = await readBranchPlan(dataDir);
    if (!current.ok || !current.plan) return { ...current, ok: false, errors: current.ok ? [diag('error', 'branch/plan-not-found', '尚未保存分支计划', {}, {}, [])] : current.errors, graph_digest: await graphDigest(dataDir), units: [], ctx: null };
    const ctx = await context(dataDir, repoRoot, requireBilingual);
    const checked = await validateWithContext(current.plan, ctx, repoRoot, readGit);
    return { ...checked, digest: current.digest, ctx };
}
async function makePacket(ctx: Context, plan: BranchPlan, digest: string, unit: BranchUnit, repoRoot: string): Promise<BranchPacket> {
    const projected = await projectWorkPacket(ctx.checked, unit.modules, repoRoot, ctx.graph_digest, true);
    if (!projected.ok || !projected.modules || !projected.context || !projected.dependencies || !projected.write_paths || !projected.acceptance) throw new Error('已验证的分支单元无法投影分工包');
    return { unit, base_commit: plan.base_commit, graph_digest: ctx.graph_digest, plan_digest: digest,
        modules: projected.modules, context: projected.context, dependencies: projected.dependencies,
        write_paths: projected.write_paths, acceptance: projected.acceptance };
}
export async function branchPacket(dataDir: string, unitId: string, repoRoot: string, requireBilingual: boolean) {
    const checked = await packetContext(dataDir, repoRoot, requireBilingual);
    const { ctx, ...result } = checked;
    if (!result.ok || !ctx || !result.plan) return { ...result, packet: null };
    const unit = result.plan.units.find(candidate => candidate.id === unitId);
    if (!unit) return { ...result, ok: false, errors: [diag('error', 'branch/unit-not-found', '分支交付单元不存在', { unit: unitId }, {}, [])], packet: null };
    return { ...result, packet: await makePacket(ctx, result.plan, result.digest, unit, repoRoot) };
}
export async function branchPackets(dataDir: string, repoRoot: string, requireBilingual: boolean, readGit: BranchGitReader = standaloneGit) {
    const checked = await packetContext(dataDir, repoRoot, requireBilingual, readGit);
    const { ctx, ...result } = checked;
    if (!result.ok || !ctx || !result.plan) return { ...result, packets: [] };
    const packets: BranchPacket[] = [];
    for (const unit of result.plan.units) packets.push(await makePacket(ctx, result.plan, result.digest, unit, repoRoot));
    return { ...result, packets };
}
