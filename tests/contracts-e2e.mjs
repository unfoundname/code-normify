// 设计先行数据契约：不要求源码存在，真实模块文件往返 + 全项目引用校验 + 编译产物。
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { l1Validate, parseModuleText, serializeModule } from '../lib/engine/frontmatter.js'
import { collectSchemaRefs, JSON_SCHEMA_DIALECT, rewriteModuleTypeReferences, typeRefUri } from '../lib/engine/contracts.js'
import { writeModuleFile } from '../lib/engine/store.js'
import { validateProject } from '../lib/engine/validate.js'
import { buildProject } from '../lib/engine/compile.js'

const workspace = mkdtempSync(join(tmpdir(), 'normify-contracts-e2e-'))
const projectDir = join(workspace, 'normify-contracts')
const text = { zh: '任务契约', en: 'Task contract' }
const module = (id, extra = {}) => ({
  uid: createHash('sha256').update(id).digest('hex').slice(0, 8),
  id,
  parent: id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null,
  name: text,
  description: text,
  source: [],
  state: 'planned',
  revision: '0'.repeat(40),
  fingerprint: 'pending',
  updated_at: '2026-10-03T12:00:00.000Z',
  ...extra,
})
const dataType = (name, schema) => ({ name, description: text, schema })
const target = { module: 'shared.task', name: 'Task' }
const request = { module: 'app.tasks', name: 'CreateTaskInput' }
const shared = module('shared.task', {
  apis: [],
  types: [dataType('Task', {
    $schema: JSON_SCHEMA_DIALECT,
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      title: { $ref: '#/$defs/Title' },
      createdAt: { type: 'string', format: 'date-time' },
      email: { type: 'string', format: 'email' },
    },
    required: ['id', 'title'],
    additionalProperties: false,
    $defs: { Title: { type: 'string', minLength: 1 } },
  })],
})
const api = {
  protocol: 'ipc',
  path: 'tasks:create',
  description: text,
  input: request,
  output: target,
}
const tasks = module('app.tasks', {
  apis: [api],
  types: [dataType('CreateTaskInput', {
    type: 'object',
    properties: {
      template: { $ref: typeRefUri(target) },
      // 注释/实例数据中的 $ref 不是 schema 引用。
      metadata: { const: { $ref: 'https://example.com/not-a-schema-reference' } },
    },
    required: ['template'],
  })],
})
const options = { requireBilingual: true, repoRoot: workspace }
const codes = output => output.errors.map(error => error.code)

async function main() {
  const rootOnlyDir = join(workspace, 'normify-root-only')
  await writeModuleFile(rootOnlyDir, module('root'), '')
  const rootOnly = await validateProject(rootOnlyDir, options)
  assert.equal(rootOnly.ok, true, JSON.stringify(rootOnly.errors))
  await writeModuleFile(rootOnlyDir, module('root', { types: [dataType('RootType', {})] }), '')
  assert.ok(codes(await validateProject(rootOnlyDir, options)).includes('type/non-leaf'))
  await writeModuleFile(rootOnlyDir, module('root', { apis: [] }), '')
  assert.ok(codes(await validateProject(rootOnlyDir, options)).includes('api/non-leaf'))

  for (const root of ['shared', 'app'])
    await writeModuleFile(projectDir, module(root), '')
  await writeModuleFile(projectDir, shared, '类型所有者')
  await writeModuleFile(projectDir, tasks, 'IPC 实现任务')

  const roundtrip = parseModuleText(serializeModule(tasks, 'IPC 实现任务'), 'roundtrip')
  assert.equal(roundtrip.errors.length, 0)
  assert.deepEqual(roundtrip.module.types, tasks.types)
  assert.deepEqual(roundtrip.module.apis[0].input, api.input)
  assert.deepEqual(roundtrip.module.apis[0].output, api.output)
  assert.equal(roundtrip.module.apis[0].protocol, 'ipc')
  assert.equal(collectSchemaRefs(tasks.types[0].schema).length, 1)

  const schemaToMove = module('app.tasks', { apis: [api], types: [dataType('CreateTaskInput', {
    $id: typeRefUri(request),
    properties: {
      template: { $ref: typeRefUri(target) + '#/$defs/Title' },
      dynamic: { $dynamicRef: typeRefUri(target) + '#node' },
      literal: { const: { $ref: typeRefUri(target) } },
    },
    default: { $id: typeRefUri(request) },
    examples: [{ $ref: typeRefUri(target) }],
  })] })
  const moved = rewriteModuleTypeReferences(schemaToMove, new Map([
    ['app.tasks', 'app.worker'], ['shared.task', 'shared.contracts'],
  ]))
  assert.equal(moved.apis[0].input.module, 'app.worker')
  assert.equal(moved.apis[0].output.module, 'shared.contracts')
  assert.equal(moved.types[0].schema.$id, 'urn:normify:app.worker:CreateTaskInput')
  assert.equal(moved.types[0].schema.properties.template.$ref, 'urn:normify:shared.contracts:Task#/$defs/Title')
  assert.equal(moved.types[0].schema.properties.dynamic.$dynamicRef, 'urn:normify:shared.contracts:Task#node')
  assert.equal(moved.types[0].schema.properties.literal.const.$ref, typeRefUri(target))
  assert.equal(moved.types[0].schema.default.$id, typeRefUri(request))
  assert.equal(moved.types[0].schema.examples[0].$ref, typeRefUri(target))
  assert.equal(schemaToMove.types[0].schema.$id, typeRefUri(request), '重写不能修改输入对象')
  const deprecated = module('app.old', { apis: [], state: 'deprecated', replacement: 'shared.task' })
  assert.equal(rewriteModuleTypeReferences(deprecated, new Map([['shared.task', 'shared.contracts']])).replacement, 'shared.contracts')
  assert.equal(deprecated.replacement, 'shared.task', '重写 replacement 不能修改输入对象')

  const valid = await validateProject(projectDir, options)
  assert.equal(valid.ok, true, JSON.stringify(valid.errors))
  assert.equal(valid.files.every(file => file.module.source.length === 0), true)

  const built = await buildProject(projectDir, options)
  assert.equal(built.ok, true, JSON.stringify(built.errors))
  const tree = JSON.parse(readFileSync(join(projectDir, 'tree.json'), 'utf8'))
  const index = JSON.parse(readFileSync(join(projectDir, 'api-index.json'), 'utf8'))
  assert.deepEqual(tree.modules['app.tasks'].types, tasks.types)
  assert.deepEqual(tree.modules['app.tasks'].apis[0].input, request)
  assert.equal(tree.api_index['ipc:tasks:create'], 'app.tasks')
  assert.equal(tree.project.stats.type_count, 2)
  assert.equal(index.schema_version, 2)
  assert.deepEqual(index.apis['ipc:tasks:create'].output, target)
  assert.deepEqual(index.types[typeRefUri(target)].schema, shared.types[0].schema)

  const unicodeTarget = { module: 'shared.task', name: '任务' }
  assert.equal(typeRefUri(unicodeTarget), 'urn:normify:shared.task:%E4%BB%BB%E5%8A%A1')
  await writeModuleFile(projectDir, { ...shared, types: [...shared.types, dataType('任务', { type: 'string' })] }, '')
  await writeModuleFile(projectDir, { ...tasks, types: [dataType('CreateTaskInput', { $ref: typeRefUri(unicodeTarget) })] }, '')
  assert.equal((await validateProject(projectDir, options)).ok, true, 'Unicode TypeScript标识符使用标准编码URN')
  await writeModuleFile(projectDir, shared, '')
  await writeModuleFile(projectDir, tasks, '')

  // 删除类型后 API 和跨模块 schema 都明确报告悬空目标。
  await writeModuleFile(projectDir, { ...shared, types: [] }, '')
  const missing = await validateProject(projectDir, options)
  assert.equal(missing.ok, false)
  assert.ok(codes(missing).includes('api/output-type-missing'))
  assert.ok(codes(missing).includes('type/schema-ref-missing'))
  await writeModuleFile(projectDir, shared, '')

  // 同模块类型名必须唯一；不同模块同名允许。
  await writeModuleFile(projectDir, { ...shared, types: [...shared.types, shared.types[0]] }, '')
  assert.ok(codes(await validateProject(projectDir, options)).includes('type/name-duplicate'))
  await writeModuleFile(projectDir, shared, '')

  const invalidSchema = l1Validate(module('app.tasks', {
    apis: [], types: [dataType('Bad', { type: 'imaginary', required: 'title' })],
  }), 'invalid-schema')
  assert.equal(invalidSchema.module, null)
  assert.ok(codes(invalidSchema).includes('type/schema-invalid'))
  const oldDialect = l1Validate(module('app.tasks', {
    apis: [], types: [dataType('Bad', { $schema: 'http://json-schema.org/draft-07/schema#' })],
  }), 'old-dialect')
  assert.ok(codes(oldDialect).includes('type/schema-dialect'))
  const invalidName = l1Validate(module('app.tasks', {
    apis: [], types: [dataType('bad-name', {})],
  }), 'invalid-name')
  assert.ok(codes(invalidName).includes('type/name-invalid'))
  const stringReference = l1Validate(module('app.tasks', {
    apis: [{ ...api, input: 'CreateTaskInput' }],
  }), 'invalid-reference')
  assert.ok(codes(stringReference).includes('type/ref-shape'))
  for (const path of ['C:/outside.ts', 'src/unsafe\u0000.ts', 'src/unsafe\n.ts']) {
    const invalidSource = l1Validate(module('app.tasks', { apis: [], source: [{ path }] }), 'invalid-source')
    assert.ok(codes(invalidSource).includes('structure/source-path-invalid'))
  }

  await writeModuleFile(projectDir, { ...tasks, types: [dataType('CreateTaskInput', {
    type: 'object', propeties: { title: { type: 'string' } },
  })] }, '')
  assert.ok(codes(await validateProject(projectDir, options)).includes('type/schema-invalid'), '拼错 schema 关键字不可静默忽略')

  await writeModuleFile(projectDir, { ...tasks, types: [dataType('CreateTaskInput', {
    $ref: typeRefUri(target) + '#/$defs/Title',
  })] }, '')
  assert.equal((await validateProject(projectDir, options)).ok, true, '跨类型 URN 片段可按标准引用')

  await writeModuleFile(projectDir, { ...tasks, types: [dataType('CreateTaskInput', {
    type: 'object', properties: { title: { $ref: '#/$defs/Missing' } },
  })] }, '')
  assert.ok(codes(await validateProject(projectDir, options)).includes('type/schema-invalid'))

  await writeModuleFile(projectDir, { ...tasks, types: [dataType('CreateTaskInput', {
    $ref: 'https://example.com/remote.json',
  })] }, '')
  assert.ok(codes(await validateProject(projectDir, options)).includes('type/schema-ref-invalid'))

  // 正常递归 schema、2020-12 tuple 和 boolean 子 schema 仍按标准工作。
  await writeModuleFile(projectDir, { ...tasks, types: [dataType('CreateTaskInput', {
    $ref: '#/$defs/Node',
    $defs: { Node: {
      type: 'object',
      properties: {
        next: { anyOf: [{ type: 'null' }, { $ref: '#/$defs/Node' }] },
        pair: { type: 'array', prefixItems: [{ type: 'string' }, { type: 'number' }], items: false },
      },
    } },
  })] }, '')
  assert.equal((await validateProject(projectDir, options)).ok, true)

  // 容器数据契约在 L2 拒绝，不能藏在父模块上。
  await writeModuleFile(projectDir, module('app', { types: [dataType('ParentType', {})] }), '')
  assert.ok(codes(await validateProject(projectDir, options)).includes('type/non-leaf'))

  // 模块级依赖不依赖是否存在 apis 字段，容器的悬空边同样拒绝。
  await writeModuleFile(projectDir, module('app', { deps: [{ kind: 'reference', to: 'missing.module' }] }), '')
  assert.ok(codes(await validateProject(projectDir, options)).includes('dep/target-missing'))
  await writeModuleFile(projectDir, module('app', { deps: [{ kind: 'reference', to: 'shared.task', from_api: 'ipc:tasks:create' }] }), '')
  assert.ok(codes(await validateProject(projectDir, options)).includes('dep/from-api-non-leaf'))
  console.log('contracts e2e PASS')
}

try { await main() } finally { rmSync(workspace, { recursive: true, force: true }) }
