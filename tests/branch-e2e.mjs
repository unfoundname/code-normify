// 静态分支计划门禁 + 真实临时 Git 工作树中的独立验收和合并验收。
// 这里验证小型固定契约 fixture，不派 AI Worker，也不代表 PromptManager 应用的实现验收。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createPromptManagerTools } from '../lib/index.js';

const work = await mkdtemp(join(tmpdir(), 'normify-branch-e2e-'));
const repoRoot = join(work, 'repo');
const dataDir = join(work, 'normify-demo');
const planFile = join(dataDir, 'branch-plan.json');
const names = value => ({ zh: value, en: value });
const runFile = promisify(execFile);
const gitAt = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const git = (...args) => gitAt(repoRoot, ...args);
const writeRepo = async (cwd, path, content) => {
    const parent = path.slice(0, path.lastIndexOf('/'));
    if (parent) await mkdir(join(cwd, parent), { recursive: true });
    await writeFile(join(cwd, path), content);
};
const ok = (result, message) => {
    assert.equal(result.ok, true, (message ?? '操作应成功') + ': ' + JSON.stringify(result.errors));
    assert.deepEqual(result.errors, []);
    return result;
};
const rejected = (result, message, code) => {
    assert.equal(result.ok, false, message + ': ' + JSON.stringify(result));
    assert.ok(result.errors.length > 0, message + ' 必须有诊断');
    if (code) assert.ok(result.errors.some(error => error.code === code), message + ': ' + JSON.stringify(result.errors));
    return result;
};
const module = (id, source = [], extra = {}) => ({
    uid: createHash('sha256').update(id).digest('hex').slice(0, 8), id,
    parent: id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null,
    name: names(id), description: names(id), state: 'planned',
    source: source.map(path => ({ path })), revision: '0'.repeat(40),
    updated_at: '2026-10-03T00:00:00Z', fingerprint: 'pending', ...extra,
});
const graph = {
    schema_version: 1,
    modules: [
        module('demo'),
        module('demo.contract', ['contracts/shape.mjs'], { apis: [] }),
        module('demo.alpha', ['src/alpha.mjs', 'tests/alpha.mjs'], {
            apis: [{ protocol: 'rpc', path: 'alpha', description: names('调用固定beta契约') }],
            deps: [{ kind: 'call', to: 'demo.beta', label: names('alpha调用beta') }],
        }),
        module('demo.beta', ['src/beta.mjs', 'tests/beta.mjs'], {
            apis: [{ protocol: 'rpc', path: 'beta', description: names('计算两倍') }],
            deps: [{ kind: 'reference', to: 'demo.contract', label: names('固定输入输出契约') }],
        }),
        module('demo.gamma', ['src/gamma.mjs'], { apis: [] }),
        module('demo.old', [], { state: 'deprecated', apis: [] }),
    ], layouts: [],
};
const requirements = ['REQ-ALPHA', 'REQ-BETA'];
const verification = (id, requirementId) => ({
    commands: [{ id: id + '-test', argv: [process.execPath, 'tests/' + id + '.mjs'], cwd: '.' }],
    cases: [{ id: id + '-case', description: id + '在独立工作树中满足固定接口', requirement_ids: [requirementId], command_ids: [id + '-test'] }],
    resources: [{ id: id + '-scratch', kind: 'filesystem', description: '该单元工作树内的独立临时结果', isolation: 'unit' }],
});

try {
    await mkdir(repoRoot);
    git('init', '-q', '-b', 'main');
    git('config', 'user.name', 'branch-e2e');
    git('config', 'user.email', 'branch-e2e@example.com');
    await writeRepo(repoRoot, 'contracts/shape.mjs', 'export const values = Object.freeze([0, 1, 2, 13]);\n');
    await writeRepo(repoRoot, 'contracts/first.mjs', 'export const first = value => value;\n');
    await writeRepo(repoRoot, 'contracts/second.mjs', 'export const second = value => value;\n');
    await writeRepo(repoRoot, 'fixtures/beta-contract.mjs', 'export const beta = value => value * 2;\n');
    await writeRepo(repoRoot, 'src/shared.mjs', 'export const shared = true;\n');
    await writeRepo(repoRoot, 'tests/integration.mjs', `import assert from 'node:assert/strict';
import { values } from '../contracts/shape.mjs';
import { alpha } from '../src/alpha.mjs';
import { beta } from '../src/beta.mjs';
for (const value of values) assert.equal(alpha(value, beta), value * 2 + 1);
console.log('integration PASS');
`);
    git('add', '-A');
    git('commit', '-qm', 'Fixed interface and integration fixture');
    const baseCommit = git('rev-parse', 'HEAD');
    const catalog = await createPromptManagerTools({ repoRoot, dataDir, access: 'write' });
    const tools = new Map(catalog.map(tool => [tool.name, tool]));
    const call = (name, args = {}) => tools.get(name).execute(args);
    const schema = ok(await call('normify_schema_get'));
    assert.equal(schema.branch_plan.type, 'object');
    assert.equal(schema.branch_plan.properties.schema_version.const, 1);
    const replaceGraph = async candidate => {
        const current = ok(await call('normify_graph_get'));
        return ok(await call('normify_graph_put', { graph: candidate, expect_digest: current.digest }));
    };
    const installed = await replaceGraph(graph);
    const empty = ok(await call('normify_branch_plan_get'));
    assert.equal(empty.plan, null);
    assert.equal(empty.digest, createHash('sha256').update('').digest('hex'), '无计划也有确定的CAS版本');

    const suggestArgs = { id: 'demo-delivery', title: names('独立交付'), base_commit: baseCommit,
        scope: ['demo.alpha', 'demo.beta'], requirement_ids: requirements, together: [] };
    const suggestion = ok(await call('normify_branch_plan_suggest', suggestArgs));
    assert.equal(suggestion.ready, false, '建议成功不意味着候选已经可交付');
    assert.equal(suggestion.readiness.ok, false);
    assert.ok(suggestion.readiness.errors.length > 0);
    assert.ok(suggestion.plan, '建议必须保留同型候选以供补全验收与依赖策略');
    assert.equal(existsSync(planFile), false, '建议不保存计划');
    assert.equal(suggestion.plan.graph_digest, installed.digest);
    assert.equal(suggestion.plan.units.length, 2, '调用依赖不等于必须合组');
    assert.ok(suggestion.plan.units.every(unit => unit.needs.length === 0), '调用边不得自动变成前置交付关系');
    assert.ok(suggestion.plan.units.every(unit => unit.verification.commands.length === 0 && unit.verification.cases.length === 0), '不能猜测验收命令和需求用例');
    assert.ok(suggestion.plan.units.flatMap(unit => unit.external_dependencies).some(dep => dep.mode === 'unresolved'), '外部依赖策略须显式待决');
    rejected(await call('normify_branch_plan_put', { plan: suggestion.plan, expect_digest: empty.digest }), '未补全候选不能派工或保存');
    assert.equal(existsSync(planFile), false);

    const plan = {
        schema_version: 1, id: 'demo-delivery', title: names('独立交付'), graph_digest: installed.digest,
        base_commit: baseCommit, scope: ['demo.alpha', 'demo.beta'], requirement_ids: requirements, together: [],
        units: [
            { id: 'alpha', title: names('alpha'), modules: ['demo.alpha'], requirement_ids: ['REQ-ALPHA'], needs: [],
                external_dependencies: [{ module: 'demo.beta', mode: 'contract', fixture_paths: ['fixtures/beta-contract.mjs'] }],
                verification: verification('alpha', 'REQ-ALPHA') },
            { id: 'beta', title: names('beta'), modules: ['demo.beta'], requirement_ids: ['REQ-BETA'], needs: [],
                external_dependencies: [{ module: 'demo.contract', mode: 'baseline', fixture_paths: [] }],
                verification: verification('beta', 'REQ-BETA') },
        ],
    };
    ok(await call('normify_branch_plan_validate', { plan }), '显式契约fixture允许调用两端独立交付');
    const wrong = async (label, mutate, code) => {
        const candidate = structuredClone(plan);
        mutate(candidate);
        const before = ok(await call('normify_branch_plan_get'));
        rejected(await call('normify_branch_plan_validate', { plan: candidate }), label, code);
        rejected(await call('normify_branch_plan_put', { plan: candidate, expect_digest: before.digest }), label + '不得落盘', code);
        assert.equal((await call('normify_branch_plan_get')).digest, before.digest, label + '不得改变计划digest');
        return candidate;
    };
    await wrong('选区叶子必须完整覆盖', candidate => { candidate.units.pop(); });
    await wrong('同一叶子不能重复归属', candidate => { candidate.units[1].modules.push('demo.alpha'); });
    await wrong('单元不能包含选区外模块', candidate => { candidate.units[1].modules.push('demo.gamma'); });
    await wrong('单元不能把容器当作叶子', candidate => { candidate.units[0].modules = ['demo']; });
    await wrong('废弃模块不能进入交付范围', candidate => { candidate.scope.push('demo.old'); candidate.units[1].modules.push('demo.old'); });
    await wrong('needs必须引用已有单元', candidate => { candidate.units[0].needs = ['missing']; });
    await wrong('needs必须无环', candidate => { candidate.units[0].needs = ['beta']; candidate.units[1].needs = ['alpha']; });
    await wrong('外部依赖不能未决', candidate => { candidate.units[0].external_dependencies[0].mode = 'unresolved'; }, 'branch/dependency-unresolved');
    await wrong('外部调用必须有显式策略', candidate => { candidate.units[0].external_dependencies = []; });
    await wrong('after必须声明依赖单元为前置', candidate => { candidate.units[0].external_dependencies[0] = { module: 'demo.beta', mode: 'after', fixture_paths: [] }; });
    const after = structuredClone(plan);
    after.units[0].external_dependencies[0] = { module: 'demo.beta', mode: 'after', fixture_paths: [] };
    after.units[0].needs = ['beta'];
    ok(await call('normify_branch_plan_validate', { plan: after }), '明确needs时after策略才成立');

    const transitive = structuredClone(after);
    transitive.scope.push('demo.gamma');
    transitive.requirement_ids.push('REQ-GAMMA');
    transitive.units.push({ id: 'gamma', title: names('gamma'), modules: ['demo.gamma'], requirement_ids: ['REQ-GAMMA'], needs: ['beta'], external_dependencies: [],
        verification: { commands: [{ id: 'gamma-test', argv: [process.execPath, '-e', 'process.exit(0)'], cwd: '.' }],
            cases: [{ id: 'gamma-case', description: '固定gamma验收', requirement_ids: ['REQ-GAMMA'], command_ids: ['gamma-test'] }], resources: [] } });
    transitive.units[0].needs = ['gamma'];
    ok(await call('normify_branch_plan_validate', { plan: transitive }), 'after可通过needs传递前置证明');
    await wrong('contract须声明fixture', candidate => { candidate.units[0].external_dependencies[0].fixture_paths = []; });
    await wrong('contract不得引用基线不存在且不属于单元的fixture', candidate => { candidate.units[0].external_dependencies[0].fixture_paths = ['fixtures/missing.mjs']; });
    await writeRepo(repoRoot, 'fixtures/uncommitted.mjs', 'export const beta = value => value * 2;\n');
    await wrong('工作区新文件不能冒充固定基线fixture', candidate => { candidate.units[0].external_dependencies[0].fixture_paths = ['fixtures/uncommitted.mjs']; });
    const ownFixture = structuredClone(plan);
    ownFixture.units[0].external_dependencies[0].fixture_paths = ['tests/alpha.mjs'];
    ok(await call('normify_branch_plan_validate', { plan: ownFixture }), '该单元的独占写路径可作为待实现fixture');
    await writeRepo(repoRoot, 'src/beta.mjs', 'export const beta = value => value * 2;\n');
    await wrong('baseline读取固定commit而非当前工作区', candidate => { candidate.units[0].external_dependencies[0] = { module: 'demo.beta', mode: 'baseline', fixture_paths: [] }; });
    await rm(join(repoRoot, 'src', 'beta.mjs'));
    await rm(join(repoRoot, 'fixtures', 'uncommitted.mjs'));
    await wrong('基线必须是完整commit OID', candidate => { candidate.base_commit = 'HEAD'; }, 'args/invalid');
    await wrong('完整OID也必须指向存在的commit', candidate => { candidate.base_commit = 'f'.repeat(40); }, 'branch/base-commit-invalid');
    const nestedRoot = join(repoRoot, 'subproject');
    await mkdir(nestedRoot);
    const nestedTools = new Map((await createPromptManagerTools({ repoRoot: nestedRoot, dataDir: join(work, 'normify-nested'), access: 'write' })).map(tool => [tool.name, tool]));
    const nestedEmpty = ok(await nestedTools.get('normify_graph_get').execute({}));
    const nestedGraph = ok(await nestedTools.get('normify_graph_put').execute({ graph, expect_digest: nestedEmpty.digest }));
    const nestedPlan = structuredClone(plan);
    nestedPlan.graph_digest = nestedGraph.digest;
    rejected(await nestedTools.get('normify_branch_plan_validate').execute({ plan: nestedPlan }), '源码根不能借用Git向上发现的父仓库基线', 'branch/base-commit-invalid');
    await rm(nestedRoot, { recursive: true });
    await wrong('需求必须被单元覆盖', candidate => { candidate.units[1].requirement_ids = []; });
    await wrong('需求验收必须覆盖单元需求', candidate => { candidate.units[1].verification.cases = []; });
    await wrong('用例不能引用不存在的命令', candidate => { candidate.units[0].verification.cases[0].command_ids = ['missing']; });
    await wrong('用例不能引用计划外需求', candidate => { candidate.units[0].verification.cases[0].requirement_ids = ['REQ-UNKNOWN']; });
    await wrong('命令cwd必须留在源码根', candidate => { candidate.units[0].verification.commands[0].cwd = '..'; });
    await wrong('资源必须按单元隔离', candidate => { candidate.units[0].verification.resources[0].isolation = 'shared'; });
    const sharedRequirement = structuredClone(plan);
    sharedRequirement.requirement_ids.push('REQ:SHARED');
    for (const unit of sharedRequirement.units) {
        unit.requirement_ids.push('REQ:SHARED');
        unit.verification.cases[0].requirement_ids.push('REQ:SHARED');
    }
    ok(await call('normify_branch_plan_validate', { plan: sharedRequirement }), '跨单元共同承担需求仍须各自有明确验收');
    await wrong('together声明的模块必须在同组', candidate => { candidate.together = [['demo.alpha', 'demo.beta']]; });
    const joined = await call('normify_branch_plan_suggest', { ...suggestArgs, together: [['demo.alpha', 'demo.beta']] });
    assert.ok(joined.plan);
    assert.equal(joined.plan.units.length, 1);
    assert.deepEqual([...joined.plan.units[0].modules].sort(), ['demo.alpha', 'demo.beta']);
    const containerSuggestion = await call('normify_branch_plan_suggest', { ...suggestArgs, scope: ['demo'] });
    assert.ok(containerSuggestion.plan);
    assert.deepEqual(containerSuggestion.plan.units.flatMap(unit => unit.modules).sort(), ['demo.alpha', 'demo.beta', 'demo.contract', 'demo.gamma'], '容器选区展开全部非废弃叶子');

    // 两个词法路径指向同一真实文件，必须合组，不能用不同字符串绕过独占边界。
    await symlink(join(repoRoot, 'src'), join(repoRoot, 'alias'), 'junction');
    const aliased = structuredClone(graph);
    aliased.modules.find(item => item.id === 'demo.alpha').source = [{ path: 'src/shared.mjs' }];
    aliased.modules.find(item => item.id === 'demo.beta').source = [{ path: 'alias/shared.mjs' }];
    const overlapGraph = await replaceGraph(aliased);
    const overlapSuggestion = await call('normify_branch_plan_suggest', suggestArgs);
    assert.ok(overlapSuggestion.plan);
    assert.equal(overlapSuggestion.plan.units.length, 1, '规范真实路径重叠必须自动并组');
    const splitOverlap = structuredClone(plan);
    splitOverlap.graph_digest = overlapGraph.digest;
    rejected(await call('normify_branch_plan_validate', { plan: splitOverlap }), '已有规范路径冲突不能保存拆分候选');
    await rm(join(repoRoot, 'alias'));
    const restored = await replaceGraph(graph);
    assert.equal(restored.digest, installed.digest);

    // 源端祖先容器的明确契约边也属于叶子上下文；目标容器展开为具体叶子。
    const ancestorGraph = structuredClone(graph);
    ancestorGraph.modules[0].deps = [{ kind: 'reference', to: 'demo.contracts', label: names('祖先容器共享契约') }];
    ancestorGraph.modules.push(
        module('demo.contracts'),
        module('demo.contracts.first', ['contracts/first.mjs'], {
            apis: [], types: [{ name: 'AncestorInput', description: names('祖先声明的输入契约'),
                schema: { type: 'object', properties: { value: { type: 'integer', minimum: 0 } }, required: ['value'], additionalProperties: false } }],
        }),
        module('demo.contracts.second', ['contracts/second.mjs'], {
            apis: [{ protocol: 'rpc', path: 'ancestor-second', description: names('祖先声明的调用契约'),
                input: { module: 'demo.contracts.first', name: 'AncestorInput' } }],
        }),
    );
    const ancestorInstalled = await replaceGraph(ancestorGraph);
    const ancestorSuggestion = ok(await call('normify_branch_plan_suggest', suggestArgs));
    assert.equal(ancestorSuggestion.plan.units.length, 2, '祖先契约边不自动合组');
    assert.ok(ancestorSuggestion.plan.units.every(unit => unit.needs.length === 0), '祖先契约边不自动生成实施前置');
    for (const unit of ancestorSuggestion.plan.units) {
        const external = unit.external_dependencies.map(dep => dep.module);
        assert.ok(external.includes('demo.contracts.first'));
        assert.ok(external.includes('demo.contracts.second'));
    }
    const ancestorPlan = structuredClone(plan);
    ancestorPlan.graph_digest = ancestorInstalled.digest;
    rejected(await call('normify_branch_plan_validate', { plan: ancestorPlan }), '不能遗漏从源端祖先继承的外部契约', 'branch/dependency-undeclared');
    for (const unit of ancestorPlan.units) unit.external_dependencies.push(
        { module: 'demo.contracts.first', mode: 'baseline', fixture_paths: [] },
        { module: 'demo.contracts.second', mode: 'baseline', fixture_paths: [] },
    );
    ok(await call('normify_branch_plan_validate', { plan: ancestorPlan }));
    const ancestorStored = ok(await call('normify_branch_plan_put', { plan: ancestorPlan, expect_digest: empty.digest }));
    const ancestorPacket = ok(await call('normify_branch_packet', { unit_id: 'alpha' }));
    assert.ok(ancestorPacket.packet.dependencies.some(item => item.id === 'demo.contracts.first' && item.types.some(type => type.name === 'AncestorInput')));
    assert.ok(ancestorPacket.packet.dependencies.some(item => item.id === 'demo.contracts.second' && item.apis.some(api => api.path === 'ancestor-second')));
    const internalTarget = structuredClone(ancestorPlan);
    internalTarget.scope.push('demo.contracts.first');
    internalTarget.units[0].modules.push('demo.contracts.first');
    internalTarget.units[0].external_dependencies = internalTarget.units[0].external_dependencies.filter(dep => dep.module !== 'demo.contracts.first');
    ok(await call('normify_branch_plan_validate', { plan: internalTarget }), '目标容器中已经同组的叶子是内部依赖，不需外部策略');
    ok(await call('normify_branch_plan_delete', { expect_digest: ancestorStored.digest }));
    assert.equal((await replaceGraph(graph)).digest, installed.digest);

    const preview = ok(await call('normify_branch_plan_put', { plan, expect_digest: empty.digest, dry_run: true }));
    assert.equal(preview.dryRun, true);
    assert.deepEqual(preview.changed, []);
    assert.ok(preview.warnings.some(warning => warning.code === 'branch/verification-declared'), '预演须保留静态验收声明警告，不能暗示已执行验收');
    assert.equal(existsSync(planFile), false);
    assert.equal((await call('normify_graph_get')).digest, installed.digest, '计划预演不改变原架构');
    const stored = ok(await call('normify_branch_plan_put', { plan, expect_digest: empty.digest }));
    assert.notEqual(stored.digest, empty.digest);
    const savedBytes = await readFile(planFile, 'utf8');
    const saved = ok(await call('normify_branch_plan_get'));
    assert.deepEqual(saved.plan, plan);
    assert.equal(saved.digest, stored.digest);
    rejected(await call('normify_branch_plan_put', { plan, expect_digest: empty.digest }), '过期CAS不能覆盖计划', 'branch/conflict');
    assert.equal(await readFile(planFile, 'utf8'), savedBytes);
    const invalidStored = structuredClone(plan);
    invalidStored.units[0].verification.cases = [];
    rejected(await call('normify_branch_plan_put', { plan: invalidStored, expect_digest: stored.digest }), '保存后非法候选仍不能覆盖');
    assert.equal(await readFile(planFile, 'utf8'), savedBytes);
    const deletePreview = ok(await call('normify_branch_plan_delete', { expect_digest: stored.digest, dry_run: true }));
    assert.equal(deletePreview.dryRun, true);
    assert.deepEqual(deletePreview.changed, []);
    assert.equal(await readFile(planFile, 'utf8'), savedBytes);
    rejected(await call('normify_branch_plan_delete', { expect_digest: empty.digest }), '过期CAS不能删除计划', 'branch/conflict');

    const packetAlpha = ok(await call('normify_branch_packet', { unit_id: 'alpha' }));
    const packetBeta = ok(await call('normify_branch_packet', { unit_id: 'beta' }));
    assert.equal(packetAlpha.graph_digest, installed.digest);
    assert.equal(packetBeta.digest, stored.digest);
    assert.deepEqual(packetAlpha.packet.write_paths, ['src/alpha.mjs', 'tests/alpha.mjs']);
    assert.deepEqual(packetBeta.packet.write_paths, ['src/beta.mjs', 'tests/beta.mjs']);
    assert.deepEqual(packetAlpha.packet.unit.verification, plan.units[0].verification);
    assert.equal(packetAlpha.packet.base_commit, baseCommit);
    assert.equal(packetAlpha.packet.plan_digest, stored.digest);
    assert.deepEqual(packetAlpha.packet.unit.needs, []);
    const exported = ok(await call('normify_branch_plan_export', { lead_ref: 'test-lead-template' }));
    assert.equal(exported.worker_plan.items.length, 2);
    assert.equal(exported.worker_plan.id, plan.id + ':' + stored.digest);
    const packets = new Map([packetAlpha.packet, packetBeta.packet].map(packet => [packet.unit.id, packet]));
    for (const item of exported.worker_plan.items) {
        assert.equal(item.role, 'lead');
        assert.equal(item.ref, 'test-lead-template');
        const spec = JSON.parse(item.spec);
        assert.deepEqual(spec, packets.get(item.key), 'adapter spec须完整保留同源冻结交接包');
        assert.deepEqual(item.requirementIds, spec.unit.requirement_ids);
        assert.deepEqual(item.needs, spec.unit.needs);
        assert.equal(spec.graph_digest, installed.digest, '导出worker spec必须包含冻结架构');
    }
    assert.equal(existsSync(join(repoRoot, 'src', 'alpha.mjs')), false, '导出计划不能执行实现或验收命令');
    rejected(await call('normify_branch_packet', { unit_id: 'missing' }), '未知单元不得派工');

    const readTools = new Map((await createPromptManagerTools({ repoRoot, dataDir, access: 'read' })).map(tool => [tool.name, tool]));
    assert.ok(!readTools.has('normify_branch_plan_put'));
    assert.ok(!readTools.has('normify_branch_plan_delete'));
    ok(await readTools.get('normify_branch_plan_get').execute({}));
    ok(await readTools.get('normify_branch_plan_validate').execute({ plan }));
    ok(await readTools.get('normify_branch_packet').execute({ unit_id: 'alpha' }));
    ok(await readTools.get('normify_branch_plan_export').execute({ lead_ref: 'test-lead-template' }));

    // 真实两分支从同一固定基线开始：alpha用固定beta fixture独立验收，beta验证自身输出。
    const alphaWorktree = join(work, 'alpha-worktree');
    const betaWorktree = join(work, 'beta-worktree');
    git('worktree', 'add', '-q', '-b', 'delivery-alpha', alphaWorktree, baseCommit);
    git('worktree', 'add', '-q', '-b', 'delivery-beta', betaWorktree, baseCommit);
    assert.equal(gitAt(alphaWorktree, 'rev-parse', 'HEAD'), baseCommit);
    assert.equal(gitAt(betaWorktree, 'rev-parse', 'HEAD'), baseCommit);
    await writeRepo(alphaWorktree, 'src/alpha.mjs', 'export const alpha = (value, beta) => beta(value) + 1;\n');
    await writeRepo(alphaWorktree, 'tests/alpha.mjs', `import assert from 'node:assert/strict';
import { values } from '../contracts/shape.mjs';
import { beta } from '../fixtures/beta-contract.mjs';
import { alpha } from '../src/alpha.mjs';
for (const value of values) assert.equal(alpha(value, beta), value * 2 + 1);
console.log('alpha standalone PASS');
`);
    await writeRepo(betaWorktree, 'src/beta.mjs', 'export const beta = value => value * 2;\n');
    await writeRepo(betaWorktree, 'tests/beta.mjs', `import assert from 'node:assert/strict';
import { values } from '../contracts/shape.mjs';
import { beta } from '../src/beta.mjs';
for (const value of values) assert.equal(beta(value), value * 2);
console.log('beta standalone PASS');
`);
    assert.equal(existsSync(join(alphaWorktree, 'src', 'beta.mjs')), false, 'alpha验收不读取beta待交付源码');
    assert.equal(existsSync(join(betaWorktree, 'src', 'alpha.mjs')), false, 'beta验收不读取alpha待交付源码');
    const runDeclared = (packet, cwd) => {
        const command = packet.unit.verification.commands[0];
        return runFile(command.argv[0], command.argv.slice(1), { cwd: join(cwd, command.cwd), encoding: 'utf8', windowsHide: true });
    };
    const [alphaResult, betaResult] = await Promise.all([
        runDeclared(packetAlpha.packet, alphaWorktree), runDeclared(packetBeta.packet, betaWorktree),
    ]);
    assert.match(alphaResult.stdout, /alpha standalone PASS/);
    assert.match(betaResult.stdout, /beta standalone PASS/);
    for (const [cwd, message] of [[alphaWorktree, 'Implement alpha against fixed contract'], [betaWorktree, 'Implement beta against fixed contract']]) {
        gitAt(cwd, 'add', '-A');
        gitAt(cwd, 'commit', '-qm', message);
    }
    git('merge', '--no-ff', '-qm', 'Integrate alpha delivery', 'delivery-alpha');
    git('merge', '--no-ff', '-qm', 'Integrate beta delivery', 'delivery-beta');
    const integrationOutput = execFileSync(process.execPath, ['tests/integration.mjs'], { cwd: repoRoot, encoding: 'utf8', windowsHide: true });
    assert.match(integrationOutput, /integration PASS/);
    git('worktree', 'remove', alphaWorktree);
    git('worktree', 'remove', betaWorktree);
    ok(await call('normify_branch_packet', { unit_id: 'alpha' }), 'HEAD变化不改变冻结基线计划');

    const changedGraph = structuredClone(graph);
    changedGraph.modules.find(item => item.id === 'demo.alpha').description = names('架构语义已更新');
    await replaceGraph(changedGraph);
    rejected(await call('normify_branch_packet', { unit_id: 'alpha' }), '架构漂移阻断单元派工', 'branch/graph-drift');
    rejected(await call('normify_branch_plan_export', { lead_ref: 'test-lead-template' }), '架构漂移阻断整计划导出', 'branch/graph-drift');
    assert.equal(await readFile(planFile, 'utf8'), savedBytes, '漂移诊断保留旧计划供修订');
    await replaceGraph(graph);
    ok(await call('normify_branch_plan_delete', { expect_digest: stored.digest }));
    assert.equal(existsSync(planFile), false);
    const deleted = ok(await call('normify_branch_plan_get'));
    assert.equal(deleted.plan, null);
    assert.equal(deleted.digest, empty.digest);
    const secondWriter = new Map((await createPromptManagerTools({ repoRoot, dataDir, access: 'write' })).map(tool => [tool.name, tool]));
    const alternate = structuredClone(plan);
    alternate.title = names('另一个并发候选');
    const race = await Promise.all([
        call('normify_branch_plan_put', { plan, expect_digest: deleted.digest }),
        secondWriter.get('normify_branch_plan_put').execute({ plan: alternate, expect_digest: deleted.digest }),
    ]);
    assert.equal(race.filter(result => result.ok).length, 1, '两个服务实例竞争同一CAS只能有一个胜者');
    rejected(race.find(result => !result.ok), '并发失败方必须收到明确版本冲突', 'branch/conflict');
    ok(await call('normify_branch_plan_delete', { expect_digest: (await call('normify_branch_plan_get')).digest }));
    console.log('branch-e2e PASS：交付单元门禁、固定Git基线、fixture/after/baseline、CAS/预演/只读/漂移、真实alpha/beta工作树独立验收与main合并验收。');
} finally {
    // work由本测试mkdtemp创建；绝不删除调用者仓库或用户目录。
    await rm(work, { recursive: true, force: true });
}
