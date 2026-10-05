import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { createPromptManagerTools } from '../../lib/service.js'

// Run from this repository after npm run build. Artifacts are preserved for inspection.
// 先 npm run build，再运行本文件；保留临时产物供审阅，不创建 PromptManager 执行组。
const work = await mkdtemp(join(tmpdir(), 'normify-branch-example-'))
const repoRoot = join(work, 'repo')
const dataDir = join(work, 'normify-video')
await mkdir(join(repoRoot, 'src'), { recursive: true })
await mkdir(join(repoRoot, 'fixtures'), { recursive: true })
await writeFile(join(repoRoot, 'src', 'contracts.mjs'),
  'export const contentStates = ["media_status", "moderation_status", "publication_status"];\n')
await writeFile(join(repoRoot, 'fixtures', 'published-video.mjs'),
  'export default { id: "video-1", media_status: "ready", moderation_status: "approved", publication_status: "published" };\n')
await writeFile(join(repoRoot, 'README.md'), 'Branch planning example baseline.\n')

const exec = promisify(execFile)
const git = async (...args) => (await exec('git', args, { cwd: repoRoot, encoding: 'utf8' })).stdout.trim()
await git('init')
await git('add', 'src/contracts.mjs', 'fixtures/published-video.mjs', 'README.md')
await git('-c', 'user.name=Normify Example', '-c', 'user.email=example@example.invalid',
  '-c', 'commit.gpgsign=false', 'commit', '-m', 'Initialize branch planning example')
const baseCommit = await git('rev-parse', 'HEAD')

const localized = (zh, en) => ({ zh, en })
const now = new Date().toISOString()
const module = (id, zh, en, paths = [], fields = {}) => ({
  uid: createHash('sha256').update(id).digest('hex').slice(0, 8),
  id,
  parent: id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null,
  name: localized(zh, en),
  description: localized(zh, en),
  source: paths.map(path => ({ path })),
  revision: baseCommit,
  updated_at: now,
  fingerprint: 'pending',
  state: 'planned',
  ...fields
})
const type = (name, zh, en, properties, required) => ({
  name,
  description: localized(zh, en),
  schema: { type: 'object', properties, required, additionalProperties: false }
})
const ref = name => ({ module: 'video.contracts', name })
const graph = {
  schema_version: 1,
  modules: [
    module('video', '视频系统', 'Video system'),
    module('video.contracts', '共享契约', 'Shared contracts', ['src/contracts.mjs'], {
      apis: [],
      types: [
        type('Asset', '上传资产', 'Uploaded asset',
          { id: { type: 'string', minLength: 1 } }, ['id']),
        type('PublishedVideo', '发布视频', 'Published video', {
          id: { type: 'string', minLength: 1 },
          media_status: { type: 'string', enum: ['ready'] },
          moderation_status: { type: 'string', enum: ['approved'] },
          publication_status: { type: 'string', enum: ['published'] }
        }, ['id', 'media_status', 'moderation_status', 'publication_status']),
        type('PlaybackState', '播放状态', 'Playback state',
          { playing: { type: 'boolean' } }, ['playing'])
      ]
    }),
    module('video.ingest', '资产接收', 'Asset ingestion', ['src/ingest.mjs'], {
      apis: [{
        protocol: 'rpc', path: 'ingest',
        description: localized('接收上传资产。', 'Receive an uploaded asset.'),
        input: ref('Asset'), output: ref('Asset')
      }]
    }),
    module('video.publication', '投稿发布', 'Publication',
      ['src/publication.mjs', 'tests/publication.test.mjs'], {
        apis: [{
          protocol: 'rpc', path: 'publish',
          description: localized('发布审核通过的视频。', 'Publish an approved video.'),
          input: ref('Asset'), output: ref('PublishedVideo')
        }],
        deps: [{ kind: 'call', to: 'video.ingest', to_api: 'rpc:ingest' }]
      }),
    module('video.player', '播放器', 'Player', ['src/player.mjs', 'tests/player.test.mjs'], {
      apis: [{
        protocol: 'rpc', path: 'play',
        description: localized('播放已发布视频。', 'Play a published video.'),
        input: ref('PublishedVideo'), output: ref('PlaybackState')
      }],
      deps: [{ kind: 'call', to: 'video.publication', to_api: 'rpc:publish' }]
    })
  ],
  layouts: []
}

const catalog = await createPromptManagerTools({ repoRoot, dataDir, access: 'write', execution: 'standalone' })
const tools = new Map(catalog.map(tool => [tool.name, tool]))
const call = async (name, args = {}) => {
  const result = await tools.get(name).execute(args)
  assert.equal(result.ok, true, name + ': ' + JSON.stringify(result.errors))
  return result
}
assert.equal(catalog.length, 43)
const schemas = await call('normify_schema_get')
assert.equal(schemas.branch_plan.type, 'object')
const initialGraph = await call('normify_graph_get')
await call('normify_graph_put', { graph, expect_digest: initialGraph.digest })
const current = await call('normify_branch_plan_get')
assert.equal(current.plan, null)

const suggested = await call('normify_branch_plan_suggest', {
  id: 'video-development',
  title: localized('视频交付计划', 'Video delivery plan'),
  base_commit: baseCommit,
  scope: ['video.ingest', 'video.publication', 'video.player'],
  requirement_ids: ['REQ:publish', 'REQ:play'],
  together: [['video.ingest', 'video.publication']]
})
assert.equal(suggested.ready, false)
assert.equal(suggested.plan.units.length, 2)
const plan = structuredClone(suggested.plan)
const publication = plan.units.find(unit => unit.modules.includes('video.publication'))
const playback = plan.units.find(unit => unit.modules.includes('video.player'))
assert.ok(publication)
assert.ok(playback)

// Edit the same BranchPlan shape. Runtime calls do not become implementation prerequisites.
// 编辑原候选；播放器用基线 fixture 独立验证，不因运行时调用自动等待投稿组。
publication.id = 'publication'
publication.title = localized('投稿发布组', 'Publication group')
publication.requirement_ids = ['REQ:publish']
publication.external_dependencies = [{
  module: 'video.contracts', mode: 'baseline', fixture_paths: []
}]
publication.verification = {
  commands: [{ id: 'publication-test', argv: ['node', '--test', 'tests/publication.test.mjs'], cwd: '.' }],
  cases: [{
    id: 'publish-approved-video',
    description: '接收资产并发布视频；媒体、审核、发布状态分别符合已冻结契约。',
    requirement_ids: ['REQ:publish'],
    command_ids: ['publication-test']
  }],
  resources: [{
    id: 'publication-scratch', kind: 'filesystem',
    description: '由宿主按 unit.id 分配独立临时目录，组间不共享写入。',
    isolation: 'unit'
  }]
}
playback.id = 'playback'
playback.title = localized('播放组', 'Playback group')
playback.requirement_ids = ['REQ:play']
playback.external_dependencies = [
  { module: 'video.contracts', mode: 'baseline', fixture_paths: [] },
  { module: 'video.publication', mode: 'contract', fixture_paths: ['fixtures/published-video.mjs'] }
]
playback.verification = {
  commands: [{ id: 'player-test', argv: ['node', '--test', 'tests/player.test.mjs'], cwd: '.' }],
  cases: [{
    id: 'play-contract-fixture',
    description: '用固定基线的视频 fixture 独立验证播放状态，不等待投稿组实现。',
    requirement_ids: ['REQ:play'],
    command_ids: ['player-test']
  }],
  resources: [{
    id: 'playback-scratch', kind: 'filesystem',
    description: '由宿主按 unit.id 分配独立临时目录，组间不共享写入。',
    isolation: 'unit'
  }]
}

await call('normify_branch_plan_validate', { plan })
await call('normify_branch_plan_put', { plan, expect_digest: current.digest, dry_run: true })
assert.equal((await call('normify_branch_plan_get')).digest, current.digest)
const saved = await call('normify_branch_plan_put', { plan, expect_digest: current.digest })
const packets = []
for (const unit of plan.units) {
  const result = await call('normify_branch_packet', { unit_id: unit.id })
  assert.equal(result.packet.plan_digest, saved.digest)
  assert.equal(result.packet.base_commit, baseCommit)
  packets.push(result.packet)
}
const exported = await call('normify_branch_plan_export', { lead_ref: 'example-lead-template' })
assert.equal(exported.worker_plan.items.length, 2)
for (const item of exported.worker_plan.items) {
  assert.equal(item.role, 'lead')
  assert.equal(JSON.parse(item.spec).plan_digest, saved.digest)
}
await call('normify_branch_plan_delete', { expect_digest: saved.digest, dry_run: true })
assert.equal((await call('normify_branch_plan_get')).digest, saved.digest)

console.log(JSON.stringify({
  artifact_directory: work,
  tool_count: catalog.length,
  candidate_ready: suggested.ready,
  candidate_readiness_codes: suggested.readiness.errors.map(error => error.code),
  graph_digest: plan.graph_digest,
  plan_digest: saved.digest,
  base_commit: baseCommit,
  units: packets.map(packet => ({
    id: packet.unit.id,
    modules: packet.unit.modules,
    write_paths: packet.write_paths,
    needs: packet.unit.needs,
    external_dependencies: packet.unit.external_dependencies
  })),
  worker_plan: { id: exported.worker_plan.id, items: exported.worker_plan.items.map(({ key, role, ref, needs }) => ({ key, role, ref, needs })) },
  verification_commands_executed: false,
  promptmanager_groups_created: false
}, null, 2))
