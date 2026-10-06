import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, readdir, writeFile, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createNormifyTools, createPromptManagerTools, defineNormifyTool } from '../lib/index.js'

import { withProjectLock, WorkspaceError } from '../lib/workspace.js'

const work = await mkdtemp(join(tmpdir(), 'normify-graph-e2e-'))
const repoRoot = join(work, 'repo')
const dataDir = join(work, 'normify-demo')
await mkdir(repoRoot)
const names = text => ({ zh: text, en: text })
const module = (id, source = [], more = {}) => ({
  uid: createHash('sha256').update(id).digest('hex').slice(0, 8), id,
  parent: id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null,
  name: names(id), description: names(id), state: 'planned', source,
  revision: '0'.repeat(40), updated_at: '2026-10-03T00:00:00Z', fingerprint: 'pending', ...more,
})
const graph = {
  schema_version: 1,
  modules: [
    module('demo'),
    module('demo.types', [{ path: 'src/types.ts' }], {
      apis: [], types: [{ name: 'Task', description: names('任务'), schema: {
        type: 'object', properties: { id: { type: 'string' }, done: { type: 'boolean' } }, required: ['id', 'done'], additionalProperties: false,
      } }],
    }),
    module('demo.kernel', [{ path: 'src/kernel.ts' }], {
      apis: [{ protocol: 'ipc', path: 'task:create', description: names('创建任务'), input: { module: 'demo.types', name: 'Task' }, output: { module: 'demo.types', name: 'Task' } }],
      deps: [{ kind: 'reference', to: 'demo.types' }],
    }),
    module('demo.ui', [{ path: 'src/TaskPanel.tsx' }], {
      apis: [{ protocol: 'rpc', path: 'TaskPanel', description: names('任务组件'), input: { module: 'demo.types', name: 'Task' } }],
      deps: [{ kind: 'call', to: 'demo.kernel', to_api: 'ipc:task:create' }],
    }),
  ], layouts: [{ schema_version: 1, id: 'demo', updated_at: '2026-10-03T00:00:00Z', mode: 'grid', order: ['demo.types', 'demo.kernel', 'demo.ui'] }],
}
try {
  const catalog = await createPromptManagerTools({ repoRoot, dataDir, access: 'write', execution: 'standalone' })
  const tools = new Map(catalog.map(tool => [tool.name, tool]))
  const call = (name, args = {}) => tools.get(name).execute(args)
  assert.equal(catalog.length, 43)
  const helpNames = reference => [...reference.matchAll(/^(normify_[a-z_]+) \[/gm)].map(match => match[1])
  const help = await call('normify_help', { topic: 'tools' })
  assert.equal(help.ok, true)
  assert.deepEqual(helpNames(help.reference), catalog.map(tool => tool.name), '帮助目录必须来自受管服务实际发布的43个工具')
  assert.deepEqual(helpNames((await call('normify_help', { topic: 'all' })).reference), catalog.map(tool => tool.name), 'all主题也必须使用公开目录')
  for (const name of ['normify_schema_get', 'normify_graph_get', 'normify_graph_validate', 'normify_graph_put', 'normify_work_packet', 'normify_module_get']) {
    const detail = await call('normify_help', { topic: 'tool:' + name })
    assert.equal(detail.ok, true, name + '必须可通过help发现')
    assert.equal(detail.topic, 'tool:' + name)
    assert.doesNotMatch(detail.reference, /^\s*(?:\* )?(?:dir|project|repoRoot|root):/m, '受管帮助不得暴露已绑定的目录参数')
  }
  const fields = await call('normify_help', { topic: 'fields' })
  assert.match(fields.reference, /types 条目:.*JSON Schema 2020-12/)
  assert.match(fields.reference, /input\?\{module,name\} output\?\{module,name\}/)
  assert.match(fields.reference, /ipc\.path 为 Electron IPC channel/)
  const readCatalog = await createPromptManagerTools({ repoRoot, dataDir, access: 'read', execution: 'standalone' })
  const readHelp = readCatalog.find(tool => tool.name === 'normify_help')
  for (const topic of ['tools', 'all']) {
    const result = await readHelp.execute({ topic })
    assert.equal(result.ok, true)
    assert.deepEqual(helpNames(result.reference), readCatalog.map(tool => tool.name), '只读帮助目录必须与只读发布目录一致')
    assert.equal(readCatalog.every(tool => tool.behavior === 'read'), true)
  }
  const unavailableHelp = await readHelp.execute({ topic: 'tool:normify_graph_put' })
  assert.equal(unavailableHelp.ok, false)
  assert.equal(unavailableHelp.errors[0].code, 'args/unknown-tool', '只读help不得提供写工具的参数契约')
  const rawCatalog = createNormifyTools({ rootDir: repoRoot, requireBilingual: true })
  const rawHelp = rawCatalog.find(tool => tool.name === 'normify_help')
  assert.deepEqual(helpNames((await rawHelp.execute({ topic: 'tools' })).reference), rawCatalog.map(tool => tool.name), '独立原始目录仍只有自身31个工具')
  assert.match((await rawHelp.execute({ topic: 'tool:normify_module_get' })).reference, /\bdir: string/)
  const schema = await call('normify_schema_get')
  assert.equal(schema.module.properties.types.type, 'array')
  assert.equal(schema.graph.properties.modules.items.properties.apis.items.properties.input.type, 'object')
  const empty = await call('normify_graph_get')
  assert.equal(empty.ok, true)
  assert.deepEqual(empty.graph.modules, [])
  const validation = await call('normify_graph_validate', { graph })
  assert.equal(validation.ok, true, JSON.stringify(validation.errors))
  assert.equal((await call('normify_graph_get')).digest, empty.digest, '候选校验不能改变当前图')
  const written = await call('normify_graph_put', { graph, expect_digest: empty.digest })
  assert.equal(written.ok, true, JSON.stringify(written.errors))
  assert.notEqual(written.digest, empty.digest)
  // Host execution is a separate argument and never a model-selected permission fallback.
  await assert.rejects(createPromptManagerTools({ repoRoot, dataDir, access: 'write' }), /execution/)
  // 公开配置校验向 SPEC 契约对齐：缺失 / 非法 / 未知键一律 workspace/config，
  // 不能再把未校验的目录参数交给 path 实现抛 TypeError，也不能静默忽略未知键。
  const rejectsConfig = async (label, options, fragment) => {
    let raised
    try { await createPromptManagerTools(options) } catch (error) { raised = error }
    assert.ok(raised, label + '必须以 workspace/config 拒绝')
    assert.equal(raised.name, 'WorkspaceError', label)
    assert.equal(raised.code, 'workspace/config', label)
    assert.match(raised.message, fragment, label)
  }
  await rejectsConfig('空配置', {}, /repoRoot 和 dataDir/)
  await rejectsConfig('缺 repoRoot', { dataDir, access: 'write', execution: 'standalone' }, /repoRoot 和 dataDir/)
  await rejectsConfig('缺 dataDir', { repoRoot, access: 'write', execution: 'standalone' }, /repoRoot 和 dataDir/)
  await rejectsConfig('repoRoot 非字符串', { repoRoot: 123, dataDir, access: 'write', execution: 'standalone' }, /repoRoot 和 dataDir/)
  await rejectsConfig('dataDir 非字符串', { repoRoot, dataDir: null, access: 'write', execution: 'standalone' }, /repoRoot 和 dataDir/)
  await rejectsConfig('dataDir 相对路径', { repoRoot, dataDir: 'normify-relative', access: 'write', execution: 'standalone' }, /repoRoot 和 dataDir/)
  await rejectsConfig('未知配置键 baseline', { repoRoot, dataDir, access: 'write', execution: 'standalone', baseline: { commit: '0'.repeat(40) } }, /未知的宿主配置项：baseline/)
  await rejectsConfig('未知配置键 dir', { repoRoot, dataDir, access: 'write', execution: 'standalone', dir: dataDir }, /未知的宿主配置项：dir/)
  await rejectsConfig('execution 非法', { repoRoot, dataDir, access: 'write', execution: 'local' }, /execution/)
  await rejectsConfig('access 非法', { repoRoot, dataDir, access: 'rw', execution: 'standalone' }, /access/)
  // 合法配置（含唯一的可选键 requireBilingual）行为一字不变：照常返回只读受管目录。
  const bilingualRead = await createPromptManagerTools({ repoRoot, dataDir, access: 'read', execution: 'standalone', requireBilingual: false })
  assert.equal(bilingualRead.length, readCatalog.length)
  assert.equal(bilingualRead.every(tool => tool.behavior === 'read'), true)
  const host = new Map((await createPromptManagerTools({ repoRoot, dataDir, access: 'write', execution: 'host' })).map(tool => [tool.name, tool]))
  const signal = new AbortController().signal
  const execution = { signal, check: () => {}, readGit: async () => { throw Error('graph APIs must not invoke Git') } }
  const hostGet = host.get('normify_graph_get'), hostPut = host.get('normify_graph_put')
  assert.equal((await hostGet.execute()).errors[0].code, 'workspace/execution-required')
  assert.equal((await hostGet.execute({}, { signal, check: () => {} })).errors[0].code, 'workspace/execution-required')
  for (const key of ['signal', 'check', 'readGit']) {
    const forged = await hostGet.execute({ [key]: 'model-controlled' }, execution)
    assert.equal(forged.ok, false)
    assert.equal(forged.errors[0].code, 'args/invalid')
    assert.equal(Object.hasOwn(hostGet.parameters.properties, key), false)
  }
  for (const key of ['repoRoot', 'dataDir', 'dir', 'project'])
    assert.equal((await hostGet.execute({ [key]: repoRoot }, execution)).errors[0].code, 'workspace/binding-fixed')
  const bytes = async root => {
    const entries = []
    const visit = async (dir, prefix = '') => {
      for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a,b) => a.name.localeCompare(b.name))) {
        const path = prefix + entry.name
        if (entry.isDirectory()) await visit(join(dir, entry.name), path + '/')
        else entries.push([path, (await readFile(join(dir, entry.name))).toString('base64')])
      }
    }
    await visit(root)
    return entries
  }
  const originalBytes = await bytes(dataDir)
  const candidate = structuredClone(graph)
  candidate.modules[2].description = names('must not publish')
  let publicationChecks = 0
  const rejectedPublication = await hostPut.execute({ graph: candidate, expect_digest: written.digest }, {
    ...execution, check: phase => { if (phase === 'publish') { publicationChecks++; throw new WorkspaceError('host/revoked', 'fixed Worker attempt revoked') } },
  })
  assert.equal(rejectedPublication.ok, false)
  assert.equal(rejectedPublication.errors[0].code, 'host/revoked')
  assert.equal(publicationChecks, 1, 'the actual graph publication boundary is reached after candidate compile/render')
  assert.deepEqual(await bytes(dataDir), originalBytes, 'pre-publication revoke must preserve every old source and artifact byte')
  // Revoke between roots: the existing publication rollback restores all bytes.
  let rootsChecked = 0
  const failedMidPublish = await hostPut.execute({ graph: candidate, expect_digest: written.digest }, {
    ...execution, check: phase => { if (phase === 'publish' && ++rootsChecked === 3) throw new WorkspaceError('host/revoked', 'revoked during multi-root publication') },
  })
  assert.equal(failedMidPublish.ok, false)
  assert.equal(rootsChecked, 3)
  assert.deepEqual(await bytes(dataDir), originalBytes, 'partial multi-root publication still uses the original rollback')
  // 异步门禁等于没有门禁：会返回 thenable 的 check 必须显式失败关闭，绝不把拒绝丢成未处理 Promise。
  const unhandled = []
  const onUnhandled = reason => { unhandled.push(reason) }
  process.on('unhandledRejection', onUnhandled)
  let asyncDenied, thenableDenied, lateThenableDenied
  try {
    asyncDenied = await hostPut.execute({ graph: candidate, expect_digest: written.digest }, { ...execution, check: async () => { throw new Error('host denied') } })
    thenableDenied = await hostPut.execute({ graph: candidate, expect_digest: written.digest }, { ...execution, check: () => Promise.reject(new Error('host denied')) })
    lateThenableDenied = await hostPut.execute({ graph: candidate, expect_digest: written.digest }, { ...execution, check: phase => phase === 'publish' ? Promise.reject(new Error('host denied')) : undefined })
    await new Promise(resolve => setTimeout(resolve, 50))
  } finally { process.off('unhandledRejection', onUnhandled) }
  for (const [label, denied] of [['async check', asyncDenied], ['返回 Promise 的 check', thenableDenied], ['发布阶段才返回 Promise 的 check', lateThenableDenied]]) {
    assert.equal(denied.ok, false, label + '必须以 ok:false 失败关闭')
    assert.equal(denied.errors[0].code, 'workspace/execution-invalid', label + '必须给出稳定的执行门禁诊断码')
    assert.match(denied.errors[0].message, /授权门禁 check/, label + '必须给出中文说明')
  }
  assert.equal(unhandled.length, 0, '宿主的拒绝不得变成未处理 Promise')
  assert.deepEqual(await bytes(dataDir), originalBytes, '失效的执行门禁不得发布任何字节')
  // Real file-lock wait cancellation/revocation cannot write or release the owner's lock.
  let unlock, locked
  const ready = new Promise(resolve => { locked = resolve })
  const hold = withProjectLock(dataDir, async () => { locked(); await new Promise(resolve => { unlock = resolve }) })
  await ready
  try {
    const controller = new AbortController()
    const pending = hostPut.execute({ graph: candidate, expect_digest: written.digest }, { ...execution, signal: controller.signal })
    await new Promise(resolve => setTimeout(resolve, 80))
    controller.abort(new Error('cancelled while awaiting project lock'))
    assert.equal((await pending).ok, false)
    let authorized = true
    const revokedWait = hostPut.execute({ graph: candidate, expect_digest: written.digest }, {
      ...execution, check: () => { if (!authorized) throw new WorkspaceError('host/revoked', 'revoked while waiting for project lock') },
    })
    await new Promise(resolve => setTimeout(resolve, 80))
    authorized = false
    assert.equal((await revokedWait).errors[0].code, 'host/revoked')
    assert.deepEqual(await bytes(dataDir), originalBytes)
    assert.equal((await readFile(join(work, '.normify-demo.lock', 'owner.json'), 'utf8')).includes(String(process.pid)), true)
  } finally { unlock(); await hold }
  assert.equal((await hostGet.execute({}, execution)).ok, true, 'both cancelled waits leave the original lock reusable')
  // Cancellation of a queued call cannot release the preceding call's queue barrier.
  let releaseQueue, enteredQueue
  const entered = new Promise(resolve => { enteredQueue = resolve })
  let runs = 0
  const queued = defineNormifyTool({ rootDir: dataDir, requireBilingual: true }, {
    name: 'test_queue', description: 'owned fixture', behavior: 'read', parameters: { type: 'object', additionalProperties: false },
  }, async () => { runs++; if (runs === 1) { enteredQueue(); await new Promise(resolve => { releaseQueue = resolve }) }; return { ok: true } })
  const firstQueued = queued.execute({}, execution)
  await entered
  const queueController = new AbortController()
  const cancelledQueue = queued.execute({}, { ...execution, signal: queueController.signal })
  queueController.abort(new Error('cancel queued call'))
  assert.equal((await cancelledQueue).ok, false)
  const following = queued.execute({}, execution)
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(runs, 1, 'a cancelled middle call must not allow the next call to overtake its predecessor')
  releaseQueue()
  assert.equal((await firstQueued).ok, true)
  assert.equal((await following).ok, true)
  assert.equal(runs, 2)
  const tree = JSON.parse(await readFile(join(dataDir, 'tree.json'), 'utf8'))
  assert.equal(tree.project.name, 'normify-demo', '候选临时目录不能泄漏到产品名称')
  assert.equal(tree.modules['demo.types'].types[0].name, 'Task')
  assert.equal(tree.modules['demo.kernel'].apis[0].input.name, 'Task')
  assert.match(await readFile(join(dataDir, 'normify.html'), 'utf8'), /Task/)
  const kernel = await call('normify_work_packet', { ids: ['demo.kernel'] })
  assert.equal(kernel.ok, true, JSON.stringify(kernel.errors))
  assert.deepEqual(kernel.write_paths, ['src/kernel.ts'])
  assert.deepEqual(kernel.dependencies.map(module => module.id), ['demo.types'])
  const ui = await call('normify_work_packet', { ids: ['demo.ui'] })
  assert.deepEqual(ui.dependencies.map(module => module.id), ['demo.kernel', 'demo.types'])
  const stale = await call('normify_graph_put', { graph, expect_digest: empty.digest })
  assert.equal(stale.ok, false)
  assert.equal(stale.errors[0].code, 'graph/conflict')
  const corruptPatch = await call('normify_module_patch', { id: 'demo.kernel', patch: { apis: [{ protocol: 'ipc', path: 'task:create', description: names('错误接口'), input: { module: 'demo.types', name: 'Missing' } }] } })
  assert.equal(corruptPatch.ok, false)
  assert.equal(corruptPatch.rolled_back, true)
  assert.equal((await call('normify_graph_get')).digest, written.digest, 'CRUD违反接口引用时必须原字节回滚')
  const invalidPreview = await call('normify_module_patch', { id: 'demo.types', patch: { types: [] }, dry_run: true })
  assert.equal(invalidPreview.ok, false, '预演必须接受与正式修改相同的L2接口门禁')
  assert.equal(invalidPreview.dryRun, true)
  assert.equal((await call('normify_graph_get')).digest, written.digest)
  const corruptDelete = await call('normify_module_delete', { id: 'demo.types' })
  assert.equal(corruptDelete.ok, false)
  assert.equal(corruptDelete.rolled_back, true)
  assert.equal((await call('normify_graph_get')).digest, written.digest, '被引用模块不能通过delete污染全图')
  const moved = await call('normify_module_move', { id: 'demo.types', new_id: 'demo.contracts' })
  assert.equal(moved.ok, true, JSON.stringify(moved.errors))
  const renamed = await call('normify_graph_get')
  assert.equal(renamed.graph.modules.find(module => module.id === 'demo.kernel').apis[0].input.module, 'demo.contracts')
  assert.equal(renamed.graph.modules.find(module => module.id === 'demo.ui').apis[0].input.module, 'demo.contracts')
  const restore = await call('normify_graph_put', { graph, expect_digest: renamed.digest })
  assert.equal(restore.ok, true)
  assert.equal(restore.digest, written.digest, '移动及引用重写后可恢复同一语义图')
  await writeFile(join(dataDir, 'custom.html'), 'existing custom output')
  const patchTag = await call('normify_module_patch', { id: 'demo.kernel', patch: { tags: ['updated'] } })
  assert.equal(patchTag.ok, true)
  const staleRender = await call('normify_render', { out: 'custom.html' })
  assert.equal(staleRender.ok, false)
  assert.equal(staleRender.errors[0].code, 'render/stale-tree')
  assert.equal(await readFile(join(dataDir, 'custom.html'), 'utf8'), 'existing custom output', '拒绝过期渲染后必须保留原自定义产物')
  const restoreAfterPatch = await call('normify_graph_put', { graph, expect_digest: (await call('normify_graph_get')).digest })
  assert.equal(restoreAfterPatch.ok, true)
  assert.equal(restoreAfterPatch.digest, written.digest)
  const invalid = structuredClone(graph)
  invalid.modules = invalid.modules.filter(module => module.id !== 'demo.types')
  invalid.layouts[0].order = ['demo.kernel', 'demo.ui']
  const rejected = await call('normify_graph_put', { graph: invalid, expect_digest: written.digest })
  assert.equal(rejected.ok, false)
  assert.equal((await call('normify_graph_get')).digest, written.digest, '非法图不得部分替换已保存图')
  const duplicate = structuredClone(graph)
  duplicate.modules.push(duplicate.modules[1])
  assert.equal((await call('normify_graph_validate', { graph: duplicate })).ok, false)
  const overlapping = structuredClone(graph)
  overlapping.modules[3].source = [{ path: 'src/kernel.ts' }]
  const overlapPut = await call('normify_graph_put', { graph: overlapping, expect_digest: written.digest })
  assert.equal(overlapPut.ok, true)
  const packet = await call('normify_work_packet', { ids: ['demo.kernel'] })
  assert.equal(packet.ok, false)
  assert.equal(packet.errors[0].code, 'worker/file-overlap')
  const noSource = structuredClone(graph)
  noSource.modules[2].source = []
  assert.equal((await call('normify_graph_put', { graph: noSource, expect_digest: overlapPut.digest })).ok, true)
  const unassigned = await call('normify_work_packet', { ids: ['demo.kernel'] })
  assert.equal(unassigned.errors[0].code, 'worker/source-unassigned')
  const current = await call('normify_graph_get')
  const newer = structuredClone(graph)
  newer.modules[2].description = names('版本二')
  const second = new Map((await createPromptManagerTools({ repoRoot, dataDir, access: 'write', execution: 'standalone' })).map(tool => [tool.name, tool]))
  const races = await Promise.all([
    call('normify_graph_put', { graph, expect_digest: current.digest }),
    second.get('normify_graph_put').execute({ graph: newer, expect_digest: current.digest }),
  ])
  assert.equal(races.filter(result => result.ok).length, 1, '并发CAS必须只有一个胜者')
  assert.equal(races.find(result => !result.ok).errors[0].code, 'graph/conflict')
  const outside = await call('normify_fingerprint', { source: [{ path: '../external.txt' }] })
  assert.equal(outside.ok, false)
  assert.equal((await call('normify_graph_get', { dir: join(work, 'normify-else') })).errors[0].code, 'workspace/binding-fixed')
  await mkdir(join(work, 'outside'))
  await writeFile(join(work, 'outside', 'secret.txt'), 'outside')
  await symlink(join(work, 'outside'), join(repoRoot, 'linked'), 'junction')
  assert.equal((await call('normify_fingerprint', { source: [{ path: 'linked/secret.txt' }] })).ok, false, '符号链接不能越过源码根')
  const escapedPlan = structuredClone(graph)
  escapedPlan.modules[2].source = [{ path: 'linked/secret.txt' }]
  assert.equal((await call('normify_graph_validate', { graph: escapedPlan })).ok, false, '尚未实现的目标文件也不能越过源码根')
  await mkdir(join(repoRoot, 'src'), { recursive: true })
  await writeFile(join(repoRoot, 'src', 'shared.ts'), 'export const shared = 1')
  await symlink(join(repoRoot, 'src'), join(repoRoot, 'alias'), 'junction')
  const aliased = structuredClone(graph)
  aliased.modules[2].source = [{ path: 'src/shared.ts' }]
  aliased.modules[3].source = [{ path: 'alias/shared.ts' }]
  const beforeAlias = (await call('normify_graph_get')).digest
  assert.equal((await call('normify_graph_put', { graph: aliased, expect_digest: beforeAlias })).ok, true)
  const aliasPacket = await call('normify_work_packet', { ids: ['demo.kernel'] })
  assert.equal(aliasPacket.ok, false, '两个不同路径指向同一真实文件也不能分配给不同Worker')
  assert.equal(aliasPacket.errors[0].code, 'worker/file-overlap')
  await symlink(join(work, 'outside'), join(dataDir, 'injected'), 'junction')
  assert.equal((await call('normify_graph_get')).errors[0].code, 'workspace/data-link')
  await rm(join(dataDir, 'injected'))
  // 两个真实 Node 进程竞争同一个CAS，验证文件锁而不是单进程队列。
  const latest = (await call('normify_graph_get')).digest
  const runner = join(work, 'concurrent.mjs')
  const entry = new URL('../lib/index.js', import.meta.url).href
  await writeFile(runner, `import {createPromptManagerTools} from ${JSON.stringify(entry)}; const tools=await createPromptManagerTools(JSON.parse(process.argv[2])); const result=await tools.find(t=>t.name==='normify_graph_put').execute(JSON.parse(process.argv[3])); process.stdout.write(JSON.stringify(result));`)
  const processCall = candidate => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [runner, JSON.stringify({ repoRoot, dataDir, access: 'write', execution: 'standalone' }), JSON.stringify({ graph: candidate, expect_digest: latest })], { windowsHide: true })
    let stdout = '', stderr = ''
    child.stdout.on('data', chunk => { stdout += chunk })
    child.stderr.on('data', chunk => { stderr += chunk })
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(stderr)))
  })
  const left = structuredClone(graph), right = structuredClone(graph)
  left.modules[2].description = names('进程一修改')
  right.modules[2].description = names('进程二修改')
  const processes = await Promise.all([processCall(left), processCall(right)])
  assert.equal(processes.filter(result => result.ok).length, 1, '两个真实进程的CAS也只能有一个胜者')
  assert.equal(processes.find(result => !result.ok).errors[0].code, 'graph/conflict')
  assert.equal((await call('normify_graph_get')).ok, true)
  console.log('graph-e2e PASS: JSON设计、类型接口、候选门禁、CAS、分工边界、符号链接和真实多进程')
} finally { await rm(work, { recursive: true, force: true }) }
