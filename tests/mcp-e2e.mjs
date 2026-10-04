// 真实 SDK Client 启动受管 stdio 服务，覆盖协议、写入闭环与只读权限。
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { createNormifyMcpAdapter } from '../lib/adapters/mcp.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = join(root, 'lib', 'mcp.js');
const work = mkdtempSync(join(tmpdir(), 'normify-mcp-e2e-'));
const repo = join(work, 'repo');
const dataDir = join(repo, 'normify-demo');
const clients = new Set();
mkdirSync(join(repo, 'src'), { recursive: true });
writeFileSync(join(repo, 'src', 'worker.ts'), 'export const run = (value: string) => value.length;\n');
writeFileSync(join(work, 'outside.ts'), 'export const outside = true;\n');
const git = (...args) => execFileSync('git', ['-C', repo, ...args], { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
git('init', '-q');
git('config', 'user.email', 'e2e@example.com');
git('config', 'user.name', 'e2e');
git('add', '-A');
git('commit', '-qm', 'init');

async function connect(access, launch) {
    const transport = new StdioClientTransport({
        command: process.execPath,
        args: [entry, '--repo-root', launch.repoRoot, '--data-dir', launch.dataDir, '--access', access],
        cwd: launch.cwd,
        stderr: 'pipe',
    });
    let stderr = '';
    transport.stderr.on('data', chunk => { stderr += chunk.toString(); });
    const client = new Client({ name: 'normify-mcp-e2e', version: '1.0.0' });
    const connection = { client, transport, stderr: () => stderr };
    clients.add(connection);
    await client.connect(transport);
    assert.equal(client.getServerVersion().name, 'normify');
    assert.equal(client.getServerVersion().version, '0.7.0');
    return connection;
}

async function close(connection) {
    const pid = connection.transport.pid;
    await connection.client.close();
    clients.delete(connection);
    assert.notEqual(pid, null, 'SDK 应创建真实子进程');
    assert.throws(() => process.kill(pid, 0), error => error.code === 'ESRCH', '正常关闭后不应留下服务进程');
    assert.equal(connection.stderr(), '', '成功运行应保持 stderr 安静，stdout 仅包含 MCP 协议');
}

async function call(client, name, args = {}, expectError = false) {
    const result = await client.callTool({ name, arguments: args });
    assert.equal(result.isError, expectError, name + ': ' + JSON.stringify(result));
    assert.ok(result.structuredContent !== null && typeof result.structuredContent === 'object' && !Array.isArray(result.structuredContent), name + ' 应返回对象 structuredContent');
    assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent, '文本与结构化结果必须一致');
    return result.structuredContent;
}

function planned(id, parent, extra = {}) {
    return {
        uid: id === 'demo.worker' ? '11223344' : 'aabbccdd',
        id,
        parent,
        name: { zh: '工作模块', en: 'Worker' },
        description: { zh: '执行工作。', en: 'Execute work.' },
        source: [{ path: 'src/worker.ts' }],
        revision: git('rev-parse', 'HEAD'),
        updated_at: new Date().toISOString(),
        fingerprint: 'pending',
        state: 'planned',
        types: [
            { name: 'RunInput', description: { zh: '输入', en: 'Input' }, schema: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: false } },
            { name: 'RunOutput', description: { zh: '输出', en: 'Output' }, schema: { type: 'integer', minimum: 0 } },
        ],
        apis: [{ protocol: 'ipc', path: 'demo:run', description: { zh: '运行', en: 'Run' }, input: { module: id, name: 'RunInput' }, output: { module: id, name: 'RunOutput' } }],
        ...extra,
    };
}

async function verifyCancellationAndErrors() {
    let enter;
    let release;
    let preCancelledCalls = 0;
    const entered = new Promise(resolve => { enter = resolve; });
    const released = new Promise(resolve => { release = resolve; });
    const resultFile = join(work, 'cancel-completed.txt');
    const makeTool = (name, execute) => ({ name, description: name, behavior: 'write', parameters: { type: 'object', additionalProperties: false }, execute });
    const adapter = createNormifyMcpAdapter([
        makeTool('normify_cancel_before_entry', async () => { preCancelledCalls++; return { ok: true, errors: [], warnings: [] }; }),
        makeTool('normify_cancel_after_entry', async () => {
            enter();
            await released;
            writeFileSync(resultFile, 'completed');
            return { ok: true, applied: true, errors: [], warnings: [] };
        }),
        makeTool('normify_errors_only', async () => ({ ok: true, errors: [{ code: 'test/failure', severity: 'error', message: 'test failure' }], warnings: [] })),
        makeTool('normify_throw', async () => { throw new Error('test exception'); }),
    ]);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'normify-mcp-cancellation', version: '1.0.0' });
    await adapter.server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
        await call(client, 'normify_errors_only', {}, true);
        await assert.rejects(client.callTool({ name: 'normify_throw', arguments: {} }), error => error.code === ErrorCode.InternalError && /test exception/.test(error.message));
        const early = new AbortController();
        const earlyRequest = client.callTool({ name: 'normify_cancel_before_entry', arguments: {} }, undefined, { signal: early.signal });
        early.abort(new Error('cancel-before-entry'));
        await assert.rejects(earlyRequest, /cancel-before-entry/);
        await new Promise(resolve => setImmediate(resolve));
        assert.equal(preCancelledCalls, 0, '入口前取消不能执行工具');

        const late = new AbortController();
        const lateRequest = client.callTool({ name: 'normify_cancel_after_entry', arguments: {} }, undefined, { signal: late.signal });
        await entered;
        late.abort(new Error('cancel-after-entry'));
        await assert.rejects(lateRequest, /cancel-after-entry/);
        release();
        await adapter.drain();
        assert.equal(readFileSync(resultFile, 'utf8'), 'completed', '入口后的取消不能把已开始的写入声称为未写入');
    }
    finally {
        release();
        await adapter.drain();
        await client.close();
        await adapter.server.close();
    }
}

async function main() {
    await verifyCancellationAndErrors();
    for (const args of [[], ['--repo-root', repo, '--data-dir', dataDir, '--access'], ['--repo-root', repo, '--data-dir', dataDir, '--access', 'admin'], ['--repo-root', repo, '--repo-root', repo]]) {
        const rejected = spawnSync(process.execPath, [entry, ...args], { cwd: root, encoding: 'utf8' });
        assert.equal(rejected.status, 1, '启动参数错误应退出');
        assert.equal(rejected.stdout, '', '启动错误不能污染 stdout');
        assert.match(rejected.stderr, /normify-mcp/);
    }

    const writer = await connect('write', { cwd: root, repoRoot: repo, dataDir });
    const catalog = await writer.client.listTools();
    const byName = new Map(catalog.tools.map(tool => [tool.name, tool]));
    const branchToolNames = ['normify_branch_plan_suggest', 'normify_branch_plan_get', 'normify_branch_plan_validate', 'normify_branch_plan_put', 'normify_branch_plan_delete', 'normify_branch_plan_export', 'normify_branch_packet'];
    assert.equal(catalog.tools.length, 43, '受管服务应公开包含分支计划的43个工具');
    for (const name of branchToolNames) assert.ok(byName.has(name), name + ' 必须经真实 MCP 发布');
    for (const tool of catalog.tools) {
        assert.equal(tool.inputSchema.type, 'object', tool.name + ' 应使用对象 inputSchema');
        assert.equal(typeof tool.annotations.readOnlyHint, 'boolean');
        assert.equal(typeof tool.annotations.destructiveHint, 'boolean');
        assert.equal(typeof tool.annotations.idempotentHint, 'boolean');
        assert.equal(tool.annotations.openWorldHint, false);
    }
    assert.equal(byName.get('normify_validate').annotations.readOnlyHint, true);
    assert.equal(byName.get('normify_module_delete').annotations.destructiveHint, true);
    assert.equal(byName.get('normify_build').annotations.idempotentHint, true);
    assert.equal(byName.get('normify_module_upsert').annotations.readOnlyHint, false);
    assert.equal(byName.get('normify_branch_plan_put').annotations.readOnlyHint, false);
    assert.equal(byName.get('normify_branch_plan_delete').annotations.destructiveHint, true);
    assert.equal(byName.get('normify_branch_packet').annotations.readOnlyHint, true);
    assert.equal(byName.get('normify_branch_plan_export').annotations.openWorldHint, false, '导出计划不得执行外部命令');

    await call(writer.client, 'normify_module_upsert', { frontmatter: 'invalid' }, true);
    assert.equal(existsSync(join(dataDir, 'modules', 'demo', 'worker.md')), false, '无效实参不得写入');
    await assert.rejects(writer.client.callTool({ name: 'normify_missing_tool', arguments: {} }), /未知.*Normify/);

    await call(writer.client, 'normify_project_init', {
        root: { id: 'demo', name: { zh: '演示', en: 'Demo' }, description: { zh: '演示工程。', en: 'Demo project.' } },
    });
    await call(writer.client, 'normify_module_upsert', { frontmatter: planned('demo.worker', 'demo') });
    const before = readFileSync(join(dataDir, 'modules', 'demo', 'worker.md'), 'utf8');
    await call(writer.client, 'normify_module_patch', { id: 'demo.worker', patch: { tags: ['preview'] }, dry_run: true });
    assert.equal(readFileSync(join(dataDir, 'modules', 'demo', 'worker.md'), 'utf8'), before);
    await call(writer.client, 'normify_module_patch', { id: 'demo.worker', patch: { tags: ['managed-mcp'] } });
    await call(writer.client, 'normify_module_upsert', { frontmatter: planned('demo.escape', 'demo', { source: [{ path: '../outside.ts' }] }) }, true);
    await call(writer.client, 'normify_fingerprint', { source: [{ path: '../outside.ts' }] }, true);

    const changeId = '2026-10-03-mcp';
    await call(writer.client, 'normify_change_open', {
        id: changeId,
        title: { zh: 'MCP 接入', en: 'MCP integration' },
        intent: { zh: '验证受管写入闭环。', en: 'Verify managed write lifecycle.' },
        modules: { create: ['demo.worker'], modify: ['demo'], delete: [] },
        acceptance: ['全项目校验无错误'],
        status: 'in_progress',
    });
    await call(writer.client, 'normify_module_refresh', { all: true, activate: true });
    await call(writer.client, 'normify_validate');
    const closed = await call(writer.client, 'normify_change_close', { id: changeId, activate: true, render: true });
    assert.equal(closed.phase, 'verified');
    for (const artifact of ['tree.json', 'outline.md', 'api-index.json', 'receipt.json', 'normify.html'])
        assert.ok(existsSync(join(dataDir, artifact)), artifact + ' 应生成');
    const compiled = JSON.parse(readFileSync(join(dataDir, 'tree.json'), 'utf8'));
    assert.equal(compiled.modules['demo.worker'].types.length, 2, '命名类型应经过 MCP 写入并编译');
    assert.equal(compiled.modules['demo.worker'].apis[0].protocol, 'ipc');
    assert.deepEqual(compiled.modules['demo.worker'].apis[0].input, { module: 'demo.worker', name: 'RunInput' });
    assert.deepEqual(compiled.modules['demo.worker'].apis[0].output, { module: 'demo.worker', name: 'RunOutput' });
    await call(writer.client, 'normify_render', { out: '../outside.html' }, true);
    assert.equal(existsSync(join(repo, 'outside.html')), false, '已有有效产物时仍须拒绝越界渲染');

    // 分支计划走同一个真实 SDK/stdio 边界；验收命令只能作为数据保存和导出。
    const branchFile = join(dataDir, 'branch-plan.json');
    const branchMarker = join(repo, 'verification-must-not-execute.txt');
    const branchSchema = await call(writer.client, 'normify_schema_get');
    assert.equal(branchSchema.branch_plan.type, 'object');
    const noPlan = await call(writer.client, 'normify_branch_plan_get');
    assert.equal(noPlan.plan, null);
    assert.match(noPlan.digest, /^[a-f0-9]{64}$/);
    const suggested = await call(writer.client, 'normify_branch_plan_suggest', {
        id: 'mcp-delivery', title: { zh: 'MCP独立交付', en: 'MCP independent delivery' },
        base_commit: git('rev-parse', 'HEAD'), scope: ['demo'], requirement_ids: ['REQ-MCP'], together: [],
    });
    assert.equal(suggested.ready, false);
    assert.equal(suggested.readiness.ok, false);
    assert.ok(suggested.plan, '不完整建议仍须给出同型候选供补全');
    assert.deepEqual(suggested.plan.units.flatMap(unit => unit.modules), ['demo.worker']);
    const branchPlan = structuredClone(suggested.plan);
    branchPlan.units[0].requirement_ids = ['REQ-MCP'];
    branchPlan.units[0].verification = {
        commands: [{ id: 'check-worker', argv: [process.execPath, '-e', "require('node:fs').writeFileSync('verification-must-not-execute.txt', 'executed')"], cwd: '.' }],
        cases: [{ id: 'worker-case', description: '验证独立交付契约', requirement_ids: ['REQ-MCP'], command_ids: ['check-worker'] }], resources: [],
    };
    await call(writer.client, 'normify_branch_plan_validate', { plan: branchPlan });
    const previewPlan = await call(writer.client, 'normify_branch_plan_put', { plan: branchPlan, expect_digest: noPlan.digest, dry_run: true });
    assert.equal(previewPlan.dryRun, true);
    assert.ok(previewPlan.warnings.some(warning => warning.code === 'branch/verification-declared'), '真实MCP预演也须保留验收尚未执行的警告');
    assert.equal(existsSync(branchFile), false, 'MCP dry_run不得保存分支计划');
    const savedPlan = await call(writer.client, 'normify_branch_plan_put', { plan: branchPlan, expect_digest: noPlan.digest });
    assert.ok(existsSync(branchFile));
    assert.notEqual(savedPlan.digest, noPlan.digest);
    const planBytes = readFileSync(branchFile, 'utf8');
    const conflict = await call(writer.client, 'normify_branch_plan_put', { plan: branchPlan, expect_digest: noPlan.digest }, true);
    assert.equal(conflict.errors[0].code, 'branch/conflict');
    assert.equal(readFileSync(branchFile, 'utf8'), planBytes, 'CAS失败不得改写已保存计划');
    const invalidPlan = structuredClone(branchPlan);
    invalidPlan.units[0].verification.cases[0].command_ids = ['missing-command'];
    await call(writer.client, 'normify_branch_plan_put', { plan: invalidPlan, expect_digest: savedPlan.digest }, true);
    assert.equal(readFileSync(branchFile, 'utf8'), planBytes, '非法候选不得落盘');
    await call(writer.client, 'normify_branch_packet', { unit_id: branchPlan.units[0].id });
    await call(writer.client, 'normify_branch_plan_export', { lead_ref: 'mcp-test-lead-template' });
    assert.equal(existsSync(branchMarker), false, 'validate/put/packet/export均不得执行验收命令');
    const deletePreview = await call(writer.client, 'normify_branch_plan_delete', { expect_digest: savedPlan.digest, dry_run: true });
    assert.equal(deletePreview.dryRun, true);
    assert.equal(readFileSync(branchFile, 'utf8'), planBytes, '删除预演不得移除计划');
    await call(writer.client, 'normify_branch_plan_delete', { expect_digest: noPlan.digest }, true);
    await call(writer.client, 'normify_branch_plan_delete', { expect_digest: savedPlan.digest });
    assert.equal(existsSync(branchFile), false);
    const deletedPlan = await call(writer.client, 'normify_branch_plan_get');
    assert.equal(deletedPlan.plan, null);
    assert.equal(deletedPlan.digest, noPlan.digest, '删除后恢复固定空计划digest');
    await call(writer.client, 'normify_branch_plan_put', { plan: branchPlan, expect_digest: deletedPlan.digest });
    await close(writer);

    const reader = await connect('read', { cwd: repo, repoRoot: '.', dataDir: 'normify-demo' });
    const readCatalog = await reader.client.listTools();
    assert.ok(readCatalog.tools.length > 0);
    assert.ok(readCatalog.tools.every(tool => tool.annotations.readOnlyHint), '只读服务只能暴露 read 工具');
    assert.ok(!readCatalog.tools.some(tool => tool.name === 'normify_module_upsert'));
    assert.ok(!readCatalog.tools.some(tool => ['normify_branch_plan_put', 'normify_branch_plan_delete'].includes(tool.name)), '只读MCP不得发布分支写工具');
    for (const name of branchToolNames.filter(name => !['normify_branch_plan_put', 'normify_branch_plan_delete'].includes(name)))
        assert.ok(readCatalog.tools.some(tool => tool.name === name), name + ' 应可用于只读审查');
    const relativeModules = await call(reader.client, 'normify_module_list');
    assert.ok(relativeModules.modules.some(module => module.id === 'demo.worker'), '相对路径必须绑定宿主启动 cwd 下的源码仓库和结构数据');
    await call(reader.client, 'normify_validate');
    const schema = await call(reader.client, 'normify_schema_get');
    assert.equal(schema.dialect, 'https://json-schema.org/draft/2020-12/schema');
    assert.equal(schema.graph.type, 'object');
    assert.equal(schema.branch_plan.type, 'object');
    const graph = await call(reader.client, 'normify_graph_get');
    assert.match(graph.digest, /^[a-f0-9]{64}$/);
    assert.equal(graph.graph.modules.find(module => module.id === 'demo.worker').types.length, 2);
    await call(reader.client, 'normify_graph_validate', { graph: graph.graph });
    const packet = await call(reader.client, 'normify_work_packet', { ids: ['demo.worker'] });
    assert.equal(packet.digest, graph.digest, '派工包应绑定读取到的架构版本');
    assert.deepEqual(packet.write_paths, ['src/worker.ts']);
    assert.equal(packet.modules[0].apis[0].input.name, 'RunInput');
    const readPlan = await call(reader.client, 'normify_branch_plan_get');
    assert.deepEqual(readPlan.plan, branchPlan);
    await call(reader.client, 'normify_branch_plan_validate', { plan: readPlan.plan });
    await call(reader.client, 'normify_branch_packet', { unit_id: branchPlan.units[0].id });
    await call(reader.client, 'normify_branch_plan_export', { lead_ref: 'mcp-test-lead-template' });
    await assert.rejects(reader.client.callTool({ name: 'normify_branch_plan_put', arguments: { plan: branchPlan, expect_digest: readPlan.digest } }), /未知.*Normify/);
    await assert.rejects(reader.client.callTool({ name: 'normify_branch_plan_delete', arguments: { expect_digest: readPlan.digest } }), /未知.*Normify/);
    await assert.rejects(reader.client.callTool({ name: 'normify_module_delete', arguments: { id: 'demo.worker' } }), /未知.*Normify/);
    await close(reader);
    console.log('MCP e2e PASS：initialize/listTools/callTool、受管写入闭环、只读权限、取消与异常映射、越界拒绝与进程关闭。');
}

try {
    await main();
}
finally {
    await Promise.allSettled([...clients].map(connection => connection.client.close()));
    rmSync(work, { recursive: true, force: true });
}
