// 静态分支计划门禁 + 真实临时 Git 工作树中的独立验收和合并验收。
// 这里验证小型固定契约 fixture，不派 AI Worker，也不代表 PromptManager 应用的实现验收。
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { existsSync, symlinkSync, writeFileSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { createPromptManagerTools, deleteBranchPlan, readBranchPlanningHead, readBranchPlanningSnapshot, validateProject } from '../lib/index.js';
import { fingerprintOf } from '../lib/engine/store.js';
import { serializeModule } from '../lib/engine/frontmatter.js';

import { WorkspaceError } from '../lib/workspace.js';

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
/** 删除流程的临时捕获物必须一个都不剩；只认本流程自己的命名，不依赖数据目录布局。 */
const captureResidue = async cwd => (await readdir(cwd)).filter(name => /^\.branch-plan\.json\.delete-[0-9a-f-]+\.tmp$/.test(name));
/** 递归收集数据目录里所有文件字节，用于断言“被校验过的字节已经真的不在磁盘上了”。 */
const filesUnder = async (cwd, rel = '') => {
    const found = [];
    for (const entry of await readdir(join(cwd, rel), { withFileTypes: true })) {
        const child = rel === '' ? entry.name : rel + '/' + entry.name;
        if (entry.isDirectory()) found.push(...await filesUnder(cwd, child));
        else found.push(child);
    }
    return found;
};
/** 数据目录全部文件的字节摘要；用于断言失败后“目录与调用前逐字节一致”。 */
const treeDigest = async cwd => {
    const map = new Map();
    for (const rel of (await filesUnder(cwd)).sort())
        map.set(rel, createHash('sha256').update(await readFile(join(cwd, rel))).digest('hex'));
    return map;
};
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
    const catalog = await createPromptManagerTools({ repoRoot, dataDir, access: 'write', execution: 'standalone' });
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
    // Host Git reads are fixed capability calls; the real fixture remains readable by standalone Git.
    const hostOptions = { repoRoot, dataDir, access: 'write', execution: 'host' };
    const hostTools = new Map((await createPromptManagerTools(hostOptions)).map(tool => [tool.name, tool]));
    const hostController = new AbortController();
    const expectedGit = [ ['rev-parse', '--show-toplevel'], ['cat-file', '-t', baseCommit], ['ls-tree', '-r', '-l', '-z', baseCommit] ];
    const gitOutputs = new Map(expectedGit.map(argv => [JSON.stringify(argv), git(...argv)]));
    const calls = [];
    const readGit = async (root, argv, signal) => {
        assert.equal(root, repoRoot, 'reader always receives the bound root');
        assert.equal(signal, hostController.signal, 'cancellation reaches every Git read');
        calls.push([...argv]);
        if (!gitOutputs.has(JSON.stringify(argv))) throw new Error('undeclared host Git query: ' + JSON.stringify(argv));
        return gitOutputs.get(JSON.stringify(argv));
    };
    const hostExecution = { signal: hostController.signal, check: () => {}, readGit };
    const hostCall = (name, args = {}, execution = hostExecution) => hostTools.get(name).execute(args, execution);
    ok(await hostCall('normify_branch_plan_suggest', suggestArgs));
    ok(await hostCall('normify_branch_plan_validate', { plan }));
    assert.deepEqual(calls, [...expectedGit, ...expectedGit], 'suggest and validate use the exact same reader');
    const deniedReader = await hostCall('normify_branch_plan_validate', { plan }, {
        ...hostExecution, readGit: async () => { throw new Error('host Git intentionally denied'); },
    });
    rejected(deniedReader, 'a denied host reader must never fall back to the valid standalone repository', 'branch/base-commit-invalid');
    // Suspension inside the host reader exposes the real post-await authority boundary.
    let releaseGit, gitEntered;
    const enteredGit = new Promise(resolve => { gitEntered = resolve; });
    let authorized = true;
    const pendingHostWrite = hostCall('normify_branch_plan_put', { plan, expect_digest: empty.digest }, {
        ...hostExecution,
        check: () => { if (!authorized) throw new WorkspaceError('host/revoked', 'fixed requirement or Worker attempt changed'); },
        readGit: async (root, argv, signal) => { gitEntered(); await new Promise(resolve => { releaseGit = resolve; }); return readGit(root, argv, signal); },
    });
    await enteredGit;
    authorized = false;
    releaseGit();
    rejected(await pendingHostWrite, 'Git wait revocation must not write a branch plan', 'host/revoked');
    assert.equal(existsSync(planFile), false);
    // Put/delete publish checks preserve both absence and the exact saved plan bytes.
    let plannedPublication = false;
    const prepublish = await hostCall('normify_branch_plan_put', { plan, expect_digest: empty.digest }, {
        ...hostExecution, check: phase => { if (phase === 'publish') { plannedPublication = true; throw new WorkspaceError('host/revoked', 'no write authority'); } },
    });
    rejected(prepublish, 'plan pre-publication revoke', 'host/revoked');
    assert.equal(plannedPublication, true);
    assert.equal(existsSync(planFile), false);
    const hostStored = ok(await hostCall('normify_branch_plan_put', { plan, expect_digest: empty.digest }));
    const hostBytes = await readFile(planFile, 'utf8');
    const publicationDenied = { ...hostExecution, check: phase => { if (phase === 'publish') throw new WorkspaceError('host/revoked', 'cannot replace saved plan'); } };
    rejected(await hostCall('normify_branch_plan_put', { plan: { ...plan, title: names('rejected host title') }, expect_digest: hostStored.digest }, publicationDenied), 'replacement revoke', 'host/revoked');
    rejected(await hostCall('normify_branch_plan_delete', { expect_digest: hostStored.digest }, publicationDenied), 'delete revoke', 'host/revoked');
    assert.equal(await readFile(planFile, 'utf8'), hostBytes);
    const beforePacket = calls.length;
    ok(await hostCall('normify_branch_packet', { unit_id: 'alpha' }));
    ok(await hostCall('normify_branch_plan_export', { lead_ref: 'host-fixed-template' }));
    assert.deepEqual(calls.slice(beforePacket), [...expectedGit, ...expectedGit], 'packet and export also use the host reader');
    const head = await readBranchPlanningHead(hostOptions, hostController.signal, hostExecution.check);
    const snapshot = await readBranchPlanningSnapshot(hostOptions, head, readGit, hostController.signal, hostExecution.check);
    assert.equal(snapshot.plan_digest, hostStored.digest);
    assert.equal(snapshot.packets.length, 2);
    assert.deepEqual(calls.slice(-3), expectedGit, 'snapshot has no standalone Git fallback');
    await assert.rejects(readBranchPlanningHead(hostOptions, hostController.signal, () => { throw new WorkspaceError('host/revoked', 'read authority revoked'); }), /revoked/);
    // 宿主 async check 必须失败关闭：既不能返回结果，也不能把拒绝降级成未处理拒绝。
    const pendingRejections = [];
    const countRejection = reason => pendingRejections.push(reason);
    process.on('unhandledRejection', countRejection);
    try {
        const asyncCheck = async () => { throw new WorkspaceError('host/revoked', '异步授权门禁不得放行'); };
        const invalidGate = error => {
            assert.ok(error instanceof WorkspaceError, 'async check 必须以结构化诊断失败：' + error);
            assert.equal(error.code, 'workspace/execution-invalid', 'async check 必须以执行契约诊断失败关闭');
            assert.match(error.message, /同步返回/, '诊断必须指明门禁须同步裁决');
            return true;
        };
        await assert.rejects(readBranchPlanningHead(hostOptions, hostController.signal, asyncCheck), invalidGate);
        await assert.rejects(readBranchPlanningSnapshot(hostOptions, head, readGit, hostController.signal, asyncCheck), invalidGate);
        // 未处理拒绝在拒绝发生后的下一轮事件循环才显形：这里必须留出同一进程内的观察窗口。
        await new Promise(resolve => setTimeout(resolve, 50));
        assert.deepEqual(pendingRejections, [], 'async check 不得留下未处理拒绝');
    } finally { process.off('unhandledRejection', countRejection); }
    const previewHost = ok(await hostCall('normify_branch_plan_put', { plan, expect_digest: hostStored.digest, dry_run: true }));
    assert.equal(previewHost.dryRun, true);
    assert.equal(await readFile(planFile, 'utf8'), hostBytes);
    ok(await hostCall('normify_branch_plan_delete', { expect_digest: hostStored.digest }));
    assert.equal(existsSync(planFile), false);
    // The three existing non-plan Git tools also use the host port, including after Git cancellation.
    const extraGitCalls = [];
    const extraExecution = { ...hostExecution, readGit: async (root, argv, signal) => {
        assert.equal(root, repoRoot); assert.equal(signal, hostController.signal); extraGitCalls.push([...argv]);
        if (argv[0] === 'rev-parse') return baseCommit;
        if (argv[0] === 'diff' || argv[0] === 'ls-files') return '';
        throw new Error('unexpected Git read');
    } };
    ok(await hostCall('normify_sync', {}, extraExecution));
    assert.deepEqual(extraGitCalls, [['diff', '--name-only', 'HEAD'], ['ls-files', '--others', '--exclude-standard']]);
    extraGitCalls.length = 0;
    ok(await hostCall('normify_module_refresh', { ids: ['demo'], dry_run: true }, extraExecution));
    assert.deepEqual(extraGitCalls, [['rev-parse', 'HEAD']]);
    const controller = new AbortController();
    let enteredCancelledGit, releaseCancelledGit;
    const cancelledGitEntered = new Promise(resolve => { enteredCancelledGit = resolve; });
    const cancelledGit = hostCall('normify_branch_plan_validate', { plan }, {
        ...hostExecution, signal: controller.signal,
        readGit: async (_root, _argv, signal) => { assert.equal(signal, controller.signal); enteredCancelledGit(); await new Promise(resolve => { releaseCancelledGit = resolve; }); return gitOutputs.get(JSON.stringify(expectedGit[0])); },
    });
    await cancelledGitEntered;
    controller.abort(new Error('cancel pending host Git'));
    releaseCancelledGit();
    rejected(await cancelledGit, 'cancelled Git response is not accepted');
    assert.equal(existsSync(planFile), false);
    ok(await hostCall('normify_branch_plan_validate', { plan }), 'cancelled Git fully releases the project lock and tool queue');

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
    const nestedTools = new Map((await createPromptManagerTools({ repoRoot: nestedRoot, dataDir: join(work, 'normify-nested'), access: 'write', execution: 'standalone' })).map(tool => [tool.name, tool]));
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
    const staleDelete = rejected(await call('normify_branch_plan_delete', { expect_digest: empty.digest }), '过期CAS不能删除计划', 'branch/conflict');
    assert.equal(staleDelete.deleted, false);

    // 删除的 CAS 复核必须发生在真正销毁之前，且销毁必须只针对“调用方核对过的那批字节”：
    // 不遵守项目锁的外部写入者在 publish 授权钩子里替换文件（此时删除方还没捕获），
    // 所以删除方捕获到的就是并发版本 —— 必须返回冲突、原样保留该版本字节，并且不留捕获临时文件。
    const racingBytes = Buffer.from(JSON.stringify({ ...structuredClone(plan), title: names('并发替换的另一个版本') }, null, 2) + '\n');
    assert.equal(createHash('sha256').update(savedBytes).digest('hex'), stored.digest, 'CAS digest 是计划文件原始字节的 SHA-256');
    assert.notEqual(createHash('sha256').update(racingBytes).digest('hex'), stored.digest, '并发版本必须与已核对的版本不同');
    let replaced = 0;
    const racingExecution = {
        signal: new AbortController().signal,
        check: phase => { if (phase === 'publish' && replaced === 0) { replaced = 1; writeFileSync(planFile, racingBytes); } },
        readGit: async () => '',
    };
    const deleteConflict = rejected(await deleteBranchPlan(dataDir, stored.digest, racingExecution), '删除前复核必须拒绝并发替换进来的新版本', 'branch/conflict');
    assert.equal(replaced, 1, '测试必须真实触发 publish 阶段的并发替换');
    assert.equal(deleteConflict.deleted, false);
    assert.deepEqual(deleteConflict.errors[0].evidence, { expected: stored.digest, actual: createHash('sha256').update(racingBytes).digest('hex') });
    assert.deepEqual(deleteConflict.errors[0].supportedFixes, ['调用 normify_branch_plan_get']);
    const entryConflict = rejected(await deleteBranchPlan(dataDir, empty.digest, { ...racingExecution, check: () => {} }), '入口比对仍拒绝过期摘要', 'branch/conflict');
    assert.deepEqual(Object.keys(deleteConflict).sort(), Object.keys(entryConflict).sort(), '同一函数内两种CAS冲突必须同形');
    assert.ok(existsSync(planFile), '并发替换进来的新版本不得被删除');
    assert.deepEqual(await readFile(planFile), racingBytes, '并发替换进来的新版本字节必须原样保留');
    assert.deepEqual(await captureResidue(dataDir), [], '冲突路径必须把捕获物放回，不留临时文件');
    const racingDigest = createHash('sha256').update(racingBytes).digest('hex');
    for (const rel of await filesUnder(dataDir))
        assert.notEqual(createHash('sha256').update(await readFile(join(dataDir, rel))).digest('hex'), stored.digest, '被并发替换掉的旧版本不得被藏进任何临时文件');
    assert.equal(racingDigest !== stored.digest, true);

    // 捕获之后的窗口（新增确定性用例）。删除方现在先原子捕获计划文件，再按捕获到的字节校验；
    // 外部写入者在“路径已空、删除尚未落地”的间隙里写进第三个版本。注入点是并发写入者观测到
    // 路径消失（= 捕获真的发生了）之后立刻写入，因此判定不是“希望抢到时机”，而是对观测结果做强断言：
    // 只要它确实写过，写进去的字节就必须原样存在；它一次都没写成，则必须精确删除捕获物。
    // 这条用例为什么不判旧实现有罪：旧实现根本没有“捕获”阶段，路径在整个调用期都不为空，
    // 写入者的注入条件（路径消失）不会成立；它锁定的是新设计的不变量，判别力由仓库外压测脚本承担。
    const postCaptureBytes = Buffer.from(JSON.stringify({ ...structuredClone(plan), title: names('捕获之后写入的第三个版本') }, null, 2) + '\n');
    assert.notEqual(createHash('sha256').update(postCaptureBytes).digest('hex'), stored.digest);
    await writeFile(planFile, savedBytes);
    let postCaptureWrites = 0;
    const postCaptureWatcher = setInterval(() => {
        if (postCaptureWrites > 0) return;
        if (!existsSync(planFile)) { writeFileSync(planFile, postCaptureBytes); postCaptureWrites += 1; }
    }, 0);
    let postCaptureResult;
    try { postCaptureResult = await deleteBranchPlan(dataDir, stored.digest, { signal: new AbortController().signal, check: () => {}, readGit: async () => '' }); }
    finally { clearInterval(postCaptureWatcher); }
    ok(postCaptureResult, '捕获到的字节就是 expected：必须删除成功');
    assert.equal(postCaptureResult.deleted, true);
    if (postCaptureWrites > 0) {
        assert.ok(existsSync(planFile), '捕获之后写入的新版本不得被这次删除销毁');
        assert.deepEqual(await readFile(planFile), postCaptureBytes, '捕获之后写入的新版本字节必须原样保留');
    } else {
        assert.equal(existsSync(planFile), false, '没有并发写入时必须精确删除捕获物');
    }
    assert.deepEqual(await captureResidue(dataDir), [], '成功路径不得留下捕获临时文件');
    for (const rel of await filesUnder(dataDir))
        assert.notEqual(createHash('sha256').update(await readFile(join(dataDir, rel))).digest('hex'), stored.digest, 'ok:true 之后被销毁的 expected 字节不得还留在任何文件里');

    // 捕获之后失败（异常路径）：让捕获后的图摘要读取到一个坏链接而抛错。
    // 删除流程必须把捕获到的字节原样放回 branch-plan.json，既不丢数据也不留临时文件。
    // 用 'junction' 形态是为了跨平台：POSIX 忽略类型参数，Windows 上建目录联接不需要开发者模式，
    // 且两种平台下它都被 Dirent 视为非目录、readFile 报 ENOENT，正好让图摘要读取失败。
    await writeFile(planFile, savedBytes);
    const poison = join(dataDir, 'modules', 'demo', 'alpha.poison.md');
    const poisonTarget = join(dataDir, 'definitely-missing-target');
    const plantPoison = () => symlinkSync(poisonTarget, poison, 'junction');
    let poisonSupported = true;
    try { plantPoison(); await rm(poison, { force: true }); }
    catch { poisonSupported = false; }
    if (poisonSupported) {
        let poisoned = 0;
        let poisonError = null;
        const poisonWatcher = setInterval(() => {
            if (poisoned > 0) return;
            poisoned += 1;
            if (existsSync(planFile)) return;
            try { plantPoison(); }
            catch (error) { poisonError = error.code; }
        }, 0);
        let postCaptureError = null;
        try { await deleteBranchPlan(dataDir, stored.digest, { signal: new AbortController().signal, check: () => {}, readGit: async () => '' }); }
        catch (error) { postCaptureError = error; }
        finally { clearInterval(poisonWatcher); }
        if (postCaptureError !== null) {
            assert.equal(poisonError, null, '删除失败必须来自注入的坏链接：' + poisonError);
            let broken = false;
            try { await readFile(poison); } catch { broken = true; }
            assert.ok(broken, '注入物必须真的是读不动的坏链接，否则这条用例没有验证力');
            assert.deepEqual(await readFile(planFile), savedBytes, '异常路径必须把捕获的计划字节原样放回 branch-plan.json');
        } else {
            assert.equal(existsSync(planFile), false, '注入没赶上时至少必须精确删除捕获物');
        }
        await rm(poison, { force: true });
        assert.deepEqual(await captureResidue(dataDir), [], '异常路径不得留下捕获临时文件');
        console.log('branch-e2e 提示：捕获之后失败的异常路径已执行（注入' + (postCaptureError === null ? '未赶上，仅验证精确删除' : '命中：抛错且字节已放回') + '）。');
    } else {
        console.log('branch-e2e 提示：本机既不能建符号链接也不能建目录联接，跳过“捕获之后失败”的异常路径用例；Linux CI 会执行。');
    }
    await writeFile(planFile, savedBytes);

    // 图摘要与计划摘要同口径：窗口期内架构图变化也必须阻断删除，且不触碰计划文件。
    const moduleFile = join(dataDir, 'modules', 'demo', 'alpha.md');
    assert.ok(existsSync(moduleFile), '测试依赖真实的模块源文件参与图摘要');
    const moduleBytes = await readFile(moduleFile, 'utf8');
    let drifted = 0;
    const driftExecution = {
        signal: new AbortController().signal,
        check: phase => { if (phase === 'publish' && drifted === 0) { drifted = 1; writeFileSync(moduleFile, moduleBytes + '\n'); } },
        readGit: async () => '',
    };
    rejected(await deleteBranchPlan(dataDir, stored.digest, driftExecution), '架构图漂移必须阻断删除', 'branch/conflict');
    assert.equal(drifted, 1, '测试必须真实触发 publish 阶段的架构图变化');
    assert.ok(existsSync(planFile), '架构图漂移时不得删除计划');
    assert.equal(await readFile(planFile, 'utf8'), savedBytes);
    await writeFile(moduleFile, moduleBytes);

    // 工具层回滚不得销毁并发写入者的新版本（受管服务的快照/回滚 × 引擎 CAS 的集成缺口）。
    // 注入点仍是 host 的 publish 授权钩子：并发写入者在这里把计划文件换成新版本，工具随后按过期摘要拒绝。
    // 冲突意味着引擎在写盘之前就放弃了这次调用，磁盘上的新版本属于并发写入者；调用前的快照对它已经过期。
    const serviceBytes = Buffer.from(JSON.stringify({ ...structuredClone(plan), title: names('服务级并发替换版本') }, null, 2) + '\n');
    assert.notEqual(createHash('sha256').update(serviceBytes).digest('hex'), stored.digest, '并发版本必须与已核对的版本不同');
    let serviceReplacements = 0;
    const serviceRacingExecution = {
        ...hostExecution,
        check: phase => { if (phase === 'publish' && serviceReplacements === 0) { serviceReplacements += 1; writeFileSync(planFile, serviceBytes); } },
    };
    const serviceConflict = rejected(await hostCall('normify_branch_plan_delete', { expect_digest: stored.digest }, serviceRacingExecution), '服务级删除仍须按过期摘要拒绝并发替换', 'branch/conflict');
    assert.equal(serviceReplacements, 1, '测试必须真实触发 publish 阶段的并发替换');
    assert.deepEqual(await readFile(planFile), serviceBytes, '冲突回滚不得把并发写入者的新版本还原成调用前的快照');
    assert.equal(serviceConflict.rolled_back, true);
    assert.deepEqual(Object.keys(serviceConflict).sort(), ['deleted', 'digest', 'errors', 'ok', 'rolled_back', 'warnings'], '冲突返回形状不变');
    assert.equal(serviceConflict.deleted, false);
    assert.deepEqual(serviceConflict.errors[0].evidence, { expected: stored.digest, actual: createHash('sha256').update(serviceBytes).digest('hex') });
    assert.deepEqual(serviceConflict.errors[0].supportedFixes, ['调用 normify_branch_plan_get']);
    // 同一个包装也覆盖 put：并发替换之后按过期摘要提交，同样不得覆盖并发版本。
    await writeFile(planFile, savedBytes);
    const servicePutBytes = Buffer.from(JSON.stringify({ ...structuredClone(plan), title: names('服务级并发替换版本（put）') }, null, 2) + '\n');
    let servicePutReplacements = 0;
    const servicePutExecution = {
        ...hostExecution,
        check: phase => { if (phase === 'publish' && servicePutReplacements === 0) { servicePutReplacements += 1; writeFileSync(planFile, servicePutBytes); } },
    };
    rejected(await hostCall('normify_branch_plan_put', { plan, expect_digest: stored.digest }, servicePutExecution), '服务级保存仍须按过期摘要拒绝并发替换', 'branch/conflict');
    assert.equal(servicePutReplacements, 1, '测试必须真实触发 publish 阶段的并发替换');
    assert.deepEqual(await readFile(planFile), servicePutBytes, '保存冲突同样不得覆盖并发写入者的新版本');
    // 控制组：非冲突的失败仍然必须完整回滚（写工具失败后数据目录字节与调用前一致）。
    // 悬空依赖只有在本模块真的落盘并被全项目校验读到时才可能出现，因此这条断言不是空转。
    await writeFile(planFile, savedBytes);
    const beforeRollback = await treeDigest(dataDir);
    const dangling = module('demo.ghost', ['src/ghost.mjs'], { apis: [], deps: [{ kind: 'call', to: 'demo.missing' }] });
    const rollbackFailure = rejected(await call('normify_module_upsert', { frontmatter: dangling }), '悬空依赖必须被全项目校验拒绝', 'dep/target-missing');
    assert.equal(rollbackFailure.rolled_back, true);
    assert.equal(existsSync(join(dataDir, 'modules', 'demo', 'ghost.md')), false, '被拒绝的新模块文件不得留在数据目录');
    assert.deepEqual(await treeDigest(dataDir), beforeRollback, '非冲突失败必须把数据目录恢复到调用前的字节');

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

    const readTools = new Map((await createPromptManagerTools({ repoRoot, dataDir, access: 'read', execution: 'standalone' })).map(tool => [tool.name, tool]));
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
    const secondWriter = new Map((await createPromptManagerTools({ repoRoot, dataDir, access: 'write', execution: 'standalone' })).map(tool => [tool.name, tool]));
    const alternate = structuredClone(plan);
    alternate.title = names('另一个并发候选');
    const race = await Promise.all([
        call('normify_branch_plan_put', { plan, expect_digest: deleted.digest }),
        secondWriter.get('normify_branch_plan_put').execute({ plan: alternate, expect_digest: deleted.digest }),
    ]);
    assert.equal(race.filter(result => result.ok).length, 1, '两个服务实例竞争同一CAS只能有一个胜者');
    rejected(race.find(result => !result.ok), '并发失败方必须收到明确版本冲突', 'branch/conflict');
    ok(await call('normify_branch_plan_delete', { expect_digest: (await call('normify_branch_plan_get')).digest }));

    // ---- 证据诊断·source 路径三态：目录不得被说成「文件缺失」，不存在的路径仍按缺失报 ----
    // 每种落地形态各建一个数据目录（normify-<slug> + modules/<tree>/index.md 容器 + 带 apis 的叶子）。
    await writeRepo(repoRoot, 'src/real-dir/keep.mjs', 'export const keep = true;\n');
    await writeRepo(repoRoot, 'src/plain.mjs', 'export const plain = true;\n');
    const SOURCE_CODES = ['evidence/source-missing', 'evidence/source-not-a-file', 'evidence/fingerprint-unavailable', 'evidence/fingerprint-drift', 'evidence/fingerprint-pending'];
    const sourceCaseDir = async (slug, { path, state, fingerprint }) => {
        const dir = join(work, 'normify-' + slug);
        const container = {
            uid: createHash('sha256').update('demo').digest('hex').slice(0, 8), id: 'demo', parent: null,
            name: names('演示'), description: names('演示树根'), source: [], revision: '0'.repeat(40),
            updated_at: '2026-10-03T00:00:00Z', fingerprint: 'pending', state: 'planned',
        };
        const leaf = {
            uid: createHash('sha256').update(slug).digest('hex').slice(0, 8), id: 'demo.subject', parent: 'demo',
            name: names('目标模块'), description: names('目标模块'), source: [{ path }], revision: '0'.repeat(40),
            updated_at: '2026-10-03T00:00:00Z', fingerprint, state,
            apis: [{ protocol: 'rpc', path: 'subject', description: names('目标接口') }],
        };
        await writeRepo(dir, 'modules/demo/index.md', serializeModule(container, ''));
        await writeRepo(dir, 'modules/demo/subject.md', serializeModule(leaf, ''));
        return dir;
    };
    const sourceCodesOf = result => result.errors.map(error => error.code).filter(code => SOURCE_CODES.includes(code));

    const dirCaseDir = await sourceCaseDir('src-dir', { path: 'src/real-dir', state: 'active', fingerprint: '0'.repeat(64) });
    const dirCase = await validateProject(dirCaseDir, { repoRoot, requireBilingual: false });
    assert.equal(dirCase.ok, false, '目录不能被当成已落地的源码文件');
    const notFile = dirCase.errors.filter(error => error.code === 'evidence/source-not-a-file');
    assert.equal(notFile.length, 1, '目录必须报 evidence/source-not-a-file：' + JSON.stringify(dirCase.errors));
    assert.deepEqual(notFile[0].evidence.not_files, ['src/real-dir'], '证据必须落在 not_files 而不是 missing');
    assert.ok(!/文件缺失/.test(notFile[0].message), '文案不得再写「文件缺失」：' + notFile[0].message);
    assert.deepEqual(sourceCodesOf(dirCase), ['evidence/source-not-a-file'], '目录不得被报成路径不存在或指纹缺失');

    const plannedDirCase = await validateProject(await sourceCaseDir('src-dir-planned', { path: 'src/real-dir', state: 'planned', fingerprint: 'pending' }), { repoRoot, requireBilingual: false });
    assert.equal(plannedDirCase.ok, false, '目录是「已落地但不是文件」的实现错误，planned 也必须报');
    assert.deepEqual(sourceCodesOf(plannedDirCase), ['evidence/source-not-a-file'], 'planned 不得把目录降级成「尚未落地」');
    assert.ok(!plannedDirCase.warnings.some(warning => warning.code === 'structure/planned-source-missing'), '目录不得记成 planned-source-missing');

    // ---- 四态之外的第五个观测点：证据层 error 非空时，分支四入口实际推导出多少交付单元 ----
    // 背景（设计文档 5.6）：`src/engine/branches.ts` 里 `if (errors.length > 0) return {` 与 `if (ctx.errors.length || selectionErrors.length || leaves.length === 0) return {` 两处在 ctx.errors 非空时直接清空 units。
    // 两条通路形态不同，必须分别断言：suggest 在生成前短路（plan 为 null，无任何候选）；
    // validate/put/packet 走 validateWithContext，plan 原样保留、但推导出的 units 为空。
    // 这里锁死「实际值」，将来任何一侧改语义（例如只为与本次计划无关的既存错误放行）都会在此断言处变红。
    const caseDirTools = async caseDir => new Map((await createPromptManagerTools({ repoRoot, dataDir: caseDir, access: 'read', execution: 'standalone' }))
        .map(tool => [tool.name, tool]));
    const derivedUnits = result => Array.isArray(result.units) ? result.units.length : result.plan.units.length;
    const planOfCase = digest => ({
        schema_version: 1, id: 'demo-delivery', title: names('独立交付'), graph_digest: digest, base_commit: baseCommit,
        scope: ['demo.subject'], requirement_ids: ['REQ-DIR-SOURCE'], together: [],
        units: [{ id: 'subject', title: names('subject'), modules: ['demo.subject'], requirement_ids: ['REQ-DIR-SOURCE'], needs: [],
            external_dependencies: [],
            verification: { commands: [{ id: 'subject-test', argv: [process.execPath, 'tests/subject.mjs'], cwd: '.' }],
                cases: [{ id: 'subject-case', description: '唯一叶子', requirement_ids: ['REQ-DIR-SOURCE'], command_ids: ['subject-test'] }], resources: [] } }],
    });
    const entryOfCase = async (caseDir, plan) => {
        const tools = await caseDirTools(caseDir);
        const graphDigest = ok(await tools.get('normify_graph_get').execute({})).digest;
        const input = { id: 'demo-delivery', title: names('独立交付'), base_commit: baseCommit,
            scope: ['demo.subject'], requirement_ids: ['REQ-DIR-SOURCE'], together: [] };
        return {
            suggest: await tools.get('normify_branch_plan_suggest').execute(input),
            validate: await tools.get('normify_branch_plan_validate').execute({ plan: plan ?? planOfCase(graphDigest) }),
        };
    };
    const dirEntry = await entryOfCase(dirCaseDir);
    assert.equal(dirEntry.suggest.units.length, 0, '目录型 source 时 suggest 实际推导的 units 必须是 0：' + JSON.stringify(dirEntry.suggest.units));
    assert.equal(dirEntry.suggest.plan, null, '目录型 source 时 suggest 不得返回候选计划');
    assert.ok(dirEntry.suggest.errors.some(error => error.code === 'evidence/source-not-a-file'), 'units 为空必须伴随准确的目录诊断，而不是静默空结果');
    assert.equal(dirEntry.validate.units.length, 0, '目录型 source 时 validate 实际推导的 units 必须是 0：' + JSON.stringify(dirEntry.validate.units));
    assert.equal(dirEntry.validate.plan.units.length, 1, 'units 为空不等于计划本身失效：调用方提交的计划原样保留，便于修订后重试');

    const absentCase = await validateProject(await sourceCaseDir('src-absent', { path: 'src/not-yet-written.ts', state: 'active', fingerprint: '0'.repeat(64) }), { repoRoot, requireBilingual: false });
    const missingDiag = absentCase.errors.filter(error => error.code === 'evidence/source-missing');
    assert.equal(missingDiag.length, 1, '不存在的路径仍须报 evidence/source-missing：' + JSON.stringify(absentCase.errors));
    assert.deepEqual(missingDiag[0].evidence.missing, ['src/not-yet-written.ts'], '缺失证据仍走 missing');
    assert.deepEqual(sourceCodesOf(absentCase), ['evidence/source-missing'], '不存在的路径不得被报成 not-a-file');

    const plainHash = (await fingerprintOf(repoRoot, [{ path: 'src/plain.mjs' }])).hash;
    assert.match(String(plainHash), /^[a-f0-9]{64}$/, '真实普通文件必须能算出指纹');
    const fileCaseDir = await sourceCaseDir('src-file', { path: 'src/plain.mjs', state: 'active', fingerprint: plainHash });
    const fileCase = await validateProject(fileCaseDir, { repoRoot, requireBilingual: false });
    assert.deepEqual(sourceCodesOf(fileCase), [], '普通文件不得产生任何 source/fingerprint 诊断');
    assert.deepEqual(fileCase.errors, [], '真实普通文件 + 匹配指纹必须零 error：' + JSON.stringify(fileCase.errors));

    // 对照组：同一观测点上，真实文件型 source 必须真的推导出交付单元——
    // 否则「目录型 source 得到 0」也可能只是四个入口整体失效，断言就没有鉴别力。
    const fileEntry = await entryOfCase(fileCaseDir);
    assert.ok(derivedUnits(fileEntry.suggest) > 0, '对照：真实文件型 source 必须能推导出交付单元，否则上面的 0 没有鉴别力');
    assert.ok(derivedUnits(fileEntry.validate) > 0, '对照：真实文件型 source 的 validate 必须推导出交付单元');

    // 符号链接指向普通文件必须仍按普通文件处理（Windows 未开开发者模式时创建失败，跳过而不是伪造）。
    let linked = false;
    try { symlinkSync(join(repoRoot, 'src', 'plain.mjs'), join(repoRoot, 'src', 'link-plain.mjs'), 'file'); linked = true; }
    catch { console.log('（跳过文件符号链接用例：本机无法创建文件符号链接）'); }
    if (linked) {
        const linkHash = (await fingerprintOf(repoRoot, [{ path: 'src/link-plain.mjs' }])).hash;
        assert.match(String(linkHash), /^[a-f0-9]{64}$/, '指向普通文件的符号链接必须按普通文件算指纹');
        const linkCase = await validateProject(await sourceCaseDir('src-link', { path: 'src/link-plain.mjs', state: 'active', fingerprint: linkHash }), { repoRoot, requireBilingual: false });
        assert.deepEqual(sourceCodesOf(linkCase), [], '指向普通文件的符号链接不得报 not-a-file');
    }
    console.log('证据三态 PASS：目录报 evidence/source-not-a-file（planned 同样报）、不存在的路径仍报 evidence/source-missing、普通文件零 error。');

    console.log('branch-e2e PASS：交付单元门禁、固定Git基线、fixture/after/baseline、CAS/预演/只读/漂移、真实alpha/beta工作树独立验收与main合并验收。');
} finally {
    // work由本测试mkdtemp创建；绝不删除调用者仓库或用户目录。
    await rm(work, { recursive: true, force: true });
}
