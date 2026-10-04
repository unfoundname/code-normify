import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { createPromptManagerTools } from '../../lib/index.js'

const trial = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(trial, 'project')
const results = {}
for (const view of ['architecture', 'data']) {
  const dataDir = join(trial, 'normify-' + view)
  const tools = new Map((await createPromptManagerTools({ repoRoot, dataDir, access: 'read' })).map(tool => [tool.name, tool]))
  const invoke = async (name, args = {}) => {
    const result = await tools.get(name).execute(args)
    assert.equal(result.ok, true, `${name}: ${JSON.stringify(result.errors)}`)
    return result
  }
  const validation = await invoke('normify_validate')
  const { graph, digest } = await invoke('normify_graph_get')
  assert.ok(graph.modules.length > 0)
  const parents = new Set(graph.modules.map(module => module.parent).filter(parent => parent !== null))
  const leaves = graph.modules.filter(module => module.parent !== null && !parents.has(module.id))
  const workerModules = new Map()
  for (const module of leaves) {
    const owners = (module.tags ?? []).filter(tag => tag.startsWith('worker:'))
    assert.equal(owners.length, 1, `模块 ${module.id} 必须有唯一 worker: 标签`)
    if (!workerModules.has(owners[0])) workerModules.set(owners[0], [])
    workerModules.get(owners[0]).push(module.id)
    assert.ok(module.source.length, `${module.id} 未分配源文件`)
  }
  const workers = []
  if (view === 'architecture') {
    for (const [owner, ids] of workerModules) {
      const packet = await invoke('normify_work_packet', { ids })
      assert.equal(packet.digest, digest, '审查过程中图发生变化，应冻结后重新验证')
      assert.equal(packet.conflicts.length, 0)
      workers.push({ owner, ids, packet })
    }
    await writeFile(join(trial, 'worker-packets.json'), JSON.stringify({ schema_version: 1, digest, workers }, null, 2) + '\n')
  }
  const receipt = JSON.parse(await readFile(join(dataDir, 'receipt.json'), 'utf8'))
  assert.equal(receipt.source_digest, digest, '编译产物不是当前冻结架构')
  await readFile(join(dataDir, 'normify.html'), 'utf8')
  await writeFile(join(trial, view + '.json'), JSON.stringify(graph, null, 2) + '\n')
  results[view] = {
    digest, modules: graph.modules.length, leaves: leaves.length,
    types: leaves.reduce((count, module) => count + (module.types ?? []).length, 0),
    apis: leaves.reduce((count, module) => count + (module.apis ?? []).length, 0),
    relations: graph.modules.reduce((count, module) => count + (module.deps ?? []).length, 0),
    workers: [...workerModules.entries()].map(([owner, ids]) => ({ owner, modules: ids.length })),
    warnings: validation.warnings.map(warning => ({ code: warning.code, module: warning.subject?.module })),
  }
}
await writeFile(join(trial, 'verification.json'), JSON.stringify({ ok: true, runner: 'pi', provider: 'deepseek', model: 'deepseek-v4-flash', reviewed_at: new Date().toISOString(), results }, null, 2) + '\n')
console.log(JSON.stringify({ ok: true, results }, null, 2))
