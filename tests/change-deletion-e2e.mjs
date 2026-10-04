import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { createPromptManagerTools } from '../lib/index.js'
import { validateProject } from '../lib/engine/validate.js'
import { writeChangeFile } from '../lib/engine/changes.js'

const work = await mkdtemp(join(tmpdir(), 'normify-change-deletion-'))
const repoRoot = join(work, 'repo')
await mkdir(join(repoRoot, 'src'), { recursive: true })
await writeFile(join(repoRoot, 'src', 'module.ts'), 'export const implemented = true\n')
const text = { zh: '变更测试', en: 'Change test' }
const module = (id, extra = {}) => ({
  uid: createHash('sha256').update(id).digest('hex').slice(0, 8), id,
  parent: id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null,
  name: text, description: text, state: 'planned', source: [],
  revision: '0'.repeat(40), fingerprint: 'pending', updated_at: '2026-10-03T00:00:00Z', ...extra,
})
const api = path => ({ protocol: 'rpc', path, description: text })
const changes = (id, modules) => ({ id, title: text, intent: text, modules, acceptance: ['验证声明的操作已经完成'] })
const ids = {
  deletion: '2026-10-03-delete-module', modification: '2026-10-03-modify-module',
  removal: '2026-10-03-remove-api', addition: '2026-10-03-add-api', evidence: '2026-10-03-api-evidence',
}

async function project(slug, modules) {
  const dataDir = join(work, 'normify-' + slug)
  const tools = new Map((await createPromptManagerTools({ repoRoot, dataDir, access: 'write' })).map(tool => [tool.name, tool]))
  const call = (name, args = {}) => tools.get(name).execute(args)
  const initial = await call('normify_graph_get')
  const result = await call('normify_graph_put', { graph: { schema_version: 1, modules, layouts: [] }, expect_digest: initial.digest })
  assert.equal(result.ok, true, JSON.stringify(result.errors))
  return { dataDir, call }
}

async function main() {
  const deletion = await project('deletion', [module('demo'), module('demo.a', { apis: [] }),
    module('demo.b', { apis: [], source: [{ path: 'src/module.ts' }] })])
  assert.equal((await deletion.call('normify_change_open', changes(ids.deletion, { delete: ['demo.a'] }))).ok, true)
  const pendingDelete = await deletion.call('normify_change_close', { id: ids.deletion })
  assert.equal(pendingDelete.ok, false)
  assert.ok(pendingDelete.errors.some(error => error.code === 'change/delete-not-landed'))
  assert.equal((await deletion.call('normify_module_delete', { id: 'demo.a' })).ok, true)
  const deleted = await deletion.call('normify_change_close', { id: ids.deletion, render: true })
  assert.equal(deleted.ok, true, JSON.stringify(deleted.errors))
  assert.equal(JSON.parse(await readFile(join(deletion.dataDir, 'changes', ids.deletion + '.json'), 'utf8')).status, 'verified')
  assert.match(await readFile(join(deletion.dataDir, 'normify.html'), 'utf8'), /verified/)

  // 已验证的 modify 历史不能阻止后续正常删除/演进。
  assert.equal((await deletion.call('normify_change_open', changes(ids.modification, { modify: ['demo.b'] }))).ok, true)
  assert.equal((await deletion.call('normify_change_close', { id: ids.modification })).ok, true)
  assert.equal((await deletion.call('normify_module_delete', { id: 'demo.b' })).ok, true)
  assert.equal((await deletion.call('normify_validate')).ok, true)

  const contract = await project('api-lifecycle', [module('demo'), module('demo.impl', {
    apis: [api('old')], source: [{ path: 'src/module.ts' }],
  })])
  assert.equal((await contract.call('normify_change_open', changes(ids.removal, {
    api_remove: [{ module: 'demo.impl', key: 'rpc:old' }],
  }))).ok, true)
  const pendingRemoval = await contract.call('normify_change_close', { id: ids.removal })
  assert.ok(pendingRemoval.errors.some(error => error.code === 'change/api-remove-not-landed'))
  assert.equal((await contract.call('normify_module_patch', { id: 'demo.impl', patch: { apis: [] } })).ok, true)
  assert.equal((await contract.call('normify_change_close', { id: ids.removal })).ok, true)

  // API 新增不能只验证 owner 模块存在；目标 API 与源码均必须落地。
  assert.equal((await contract.call('normify_change_open', changes(ids.addition, {
    api_add: [{ module: 'demo.impl', key: 'rpc:new' }],
  }))).ok, true)
  const pendingAddition = await contract.call('normify_change_close', { id: ids.addition })
  assert.ok(pendingAddition.errors.some(error => error.code === 'change/api-add-not-landed'))
  assert.equal((await contract.call('normify_module_patch', { id: 'demo.impl', patch: { apis: [api('new')] } })).ok, true)
  const added = await contract.call('normify_change_close', { id: ids.addition })
  assert.equal(added.ok, true, JSON.stringify(added.errors))
  const implementation = await contract.call('normify_module_get', { id: 'demo.impl' })
  assert.equal(implementation.ok, true)
  assert.equal(implementation.module.state ?? 'active', 'active')
  assert.notEqual(implementation.module.fingerprint, 'pending')
  assert.equal((await contract.call('normify_module_delete', { id: 'demo.impl' })).ok, true)
  assert.equal((await contract.call('normify_validate')).ok, true, 'API 历史不要求当前模块继续存在')

  assert.equal((await contract.call('normify_module_upsert', { frontmatter: module('demo.pending', {
    apis: [api('future')], source: [{ path: 'src/not-implemented.ts' }],
  }) })).ok, true)
  assert.equal((await contract.call('normify_change_open', changes(ids.evidence, {
    api_add: [{ module: 'demo.pending', key: 'rpc:future' }],
  }))).ok, true)
  const missingImplementation = await contract.call('normify_change_close', { id: ids.evidence })
  assert.equal(missingImplementation.ok, false)
  assert.ok(missingImplementation.errors.some(error => error.code === 'refresh/activate-not-landed'))

  // L2 对开放意图与历史记录采用同一个生命周期契约。
  const historical = await project('history', [module('demo')])
  const record = {
    schema_version: 1, id: '2026-10-03-reference-lifecycle', title: text, intent: text,
    status: 'in_progress', acceptance: ['检验引用生命周期'], revision: { before: null, after: null },
    created_at: '2026-10-03T00:00:00Z', updated_at: '2026-10-03T00:00:00Z',
    modules: { create: ['demo.created'], modify: ['demo.modified'], delete: ['demo.deleted'],
      api_add: [{ module: 'demo.added', key: 'rpc:new' }], api_remove: [{ module: 'demo.removed', key: 'rpc:old' }] },
  }
  await writeChangeFile(historical.dataDir, record)
  const open = await validateProject(historical.dataDir, { repoRoot, requireBilingual: true })
  assert.equal(open.errors.filter(error => error.code === 'change/module-missing').length, 2)
  assert.equal(open.errors.filter(error => error.code === 'change/api-module-missing').length, 1)
  await writeChangeFile(historical.dataDir, { ...record, status: 'verified', closed_at: '2026-10-03T01:00:00Z' })
  assert.equal((await validateProject(historical.dataDir, { repoRoot, requireBilingual: true })).ok, true)
  await writeChangeFile(historical.dataDir, { ...record, status: 'abandoned' })
  assert.equal((await validateProject(historical.dataDir, { repoRoot, requireBilingual: true })).ok, true)
  console.log('change-deletion e2e PASS：真实删除闭环、接口增删落地、源码证据、关闭后渲染、历史演进')
}

try { await main() } finally { await rm(work, { recursive: true, force: true }) }
