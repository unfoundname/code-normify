import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'
import { createPromptManagerTools } from '../lib/index.js'

const work = await mkdtemp(join(tmpdir(), 'normify-render-contracts-'))
const artifacts = resolve(process.env.NORMIFY_RENDER_ARTIFACTS ?? join(tmpdir(), 'normify-render-contracts-artifacts'))
const repoRoot = join(work, 'repo')
const dataDir = join(work, 'normify-demo')
await mkdir(repoRoot)
await mkdir(artifacts, { recursive: true })
const text = (zh, en = zh) => ({ zh, en })
const module = (id, name, description, more = {}) => ({
  uid: createHash('sha256').update(id).digest('hex').slice(0, 8), id,
  parent: id.includes('.') ? id.slice(0, id.lastIndexOf('.')) : null,
  name, description, state: 'planned', source: [], revision: '0'.repeat(40),
  updated_at: '2026-10-03T00:00:00Z', fingerprint: 'pending', ...more,
})
const requestSchema = {
  type: 'object', properties: {
    title: { type: 'string', minLength: 1, description: '任务标题' },
    priority: { type: 'string', enum: ['normal', 'high'], description: '任务优先级' },
  }, required: ['title'], additionalProperties: false,
}
const recordSchema = {
  type: 'object', properties: {
    id: { type: 'string', description: '任务标识' },
    title: { type: 'string', description: '任务标题' },
    completed: { type: 'boolean', description: '是否已完成' },
    profile: { type: 'object', properties: { displayName: { type: 'string', description: '显示名称' } }, required: ['displayName'], additionalProperties: false },
    notes: { type: 'string', description: '<img src=x onerror="window.__schemaExecuted=true">' },
  }, required: ['id', 'title', 'completed'], additionalProperties: false,
}
const graph = {
  schema_version: 1, modules: [
    module('demo', text('任务管理器', 'Task manager'), text('先定义共享数据和 IPC 接口，再按模块实现。', 'Define shared data and IPC contracts before implementing modules.')),
    module('demo.types', text('共享数据类型', 'Shared data types'), text('主进程与 React 界面共同使用的数据契约。', 'Data contracts shared by the main process and React UI.'), {
      apis: [], types: [
        { name: 'TaskRequest', description: text('创建任务的输入。', 'Input for creating a task.'), schema: requestSchema },
        { name: 'TaskRecord', description: text('保存并返回给界面的任务记录。', 'Stored task record returned to the UI.'), schema: recordSchema },
      ],
    }),
    module('demo.kernel', text('任务服务', 'Task service'), text('Electron 主进程负责创建和保存任务。', 'The Electron main process creates and stores tasks.'), {
      apis: [{ protocol: 'ipc', path: 'task:create', description: text('创建任务', 'Create a task'), input: { module: 'demo.types', name: 'TaskRequest' }, output: { module: 'demo.types', name: 'TaskRecord' } }],
      deps: [{ kind: 'reference', to: 'demo.types' }],
    }),
    module('demo.ui', text('任务面板', 'Task panel'), text('React 界面展示任务并调用主进程。', 'The React UI displays tasks and calls the main process.'), {
      apis: [{ protocol: 'rpc', path: 'TaskPanel', description: text('任务组件', 'Task component'), input: { module: 'demo.types', name: 'TaskRecord' } }],
      deps: [{ kind: 'call', to: 'demo.kernel', to_api: 'ipc:task:create' }],
    }),
  ], layouts: [{ schema_version: 1, id: 'demo', updated_at: '2026-10-03T00:00:00Z', mode: 'grid', order: ['demo.types', 'demo.kernel', 'demo.ui'] }],
}

let browser
try {
  const tools = new Map((await createPromptManagerTools({ repoRoot, dataDir, access: 'write', execution: 'standalone' })).map(tool => [tool.name, tool]))
  const before = await tools.get('normify_graph_get').execute({})
  const saved = await tools.get('normify_graph_put').execute({ graph, expect_digest: before.digest })
  assert.equal(saved.ok, true, JSON.stringify(saved.errors))
  assert.equal(JSON.parse(await readFile(join(dataDir, 'tree.json'), 'utf8')).modules['demo.types'].types.length, 2)
  browser = await chromium.launch({ headless: true, executablePath: chromium.executablePath() })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.message))
  const url = pathToFileURL(join(dataDir, 'normify.html'))
  url.search = '?lang=zh'
  url.hash = '#module=demo'
  await page.goto(url.href)
  await page.locator('svg.diagram .node-g').first().waitFor()
  assert.equal(await page.locator('svg.diagram .node-g').count(), 3)
  assert.equal(await page.locator('svg.diagram path.edge').count(), 2)
  assert.equal(await page.locator('.api-list .api-contract .type-ref').count(), 3, '容器API聚合应展示输入输出类型')
  await page.locator('svg.diagram .node-g[data-id="demo.kernel"]').hover()
  assert.equal(await page.locator('svg.diagram path.edge.hl').count(), 2)
  assert.equal(await page.locator('svg.diagram polygon.arrow.hl').count(), 2, '悬停高亮必须同时作用于真实箭头节点')
  await page.mouse.move(0, 0)
  const overview = join(artifacts, '01-overview.png')
  await page.screenshot({ path: overview, fullPage: true })

  await page.locator('svg.diagram .node-g[data-id="demo.kernel"]').click()
  await page.locator('.level-head h1 .hint').filter({ hasText: 'demo.kernel' }).waitFor()
  assert.equal(await page.locator('.api-list .key').textContent(), 'ipc:task:create')
  assert.deepEqual(await page.locator('.api-contract .type-ref').allTextContents(), ['demo.types.TaskRequest', 'demo.types.TaskRecord'])
  const api = join(artifacts, '02-ipc-contract.png')
  await page.screenshot({ path: api, fullPage: true })
  await page.locator('.api-contract .type-ref').first().click()
  const request = page.locator('.type-definition[data-type="TaskRequest"]')
  await request.locator('.schema-fields').waitFor()
  assert.match(await request.getAttribute('class'), /type-focus/)
  assert.equal(await request.locator('tr[data-field="title"] .schema-required').textContent(), '必填')
  assert.equal(await request.locator('tr[data-field="priority"] .schema-required').textContent(), '可选')
  await request.locator('.schema-source summary').click()
  assert.deepEqual(JSON.parse(await request.locator('.schema-source pre').textContent()), requestSchema, '完整schema须保持原始契约')
  const types = join(artifacts, '03-data-types.png')
  await page.screenshot({ path: types, fullPage: true })
  assert.equal(await page.locator('.type-definition[data-type="TaskRecord"] tr[data-field="profile.displayName"]').count(), 1)
  assert.equal(await page.locator('.data-types img').count(), 0, 'schema文案必须作为文本渲染')
  assert.equal(await page.evaluate(() => window.__schemaExecuted), undefined)

  await page.locator('#searchInput').fill('TaskRecord')
  const hit = page.locator('#searchDrop .item').filter({ hasText: '数据类型 · demo.types' }).filter({ hasText: 'TaskRecord' })
  await hit.waitFor()
  await hit.click()
  const record = page.locator('.type-definition[data-type="TaskRecord"]')
  await page.locator('.type-definition.type-focus[data-type="TaskRecord"]').waitFor()
  assert.match(await record.getAttribute('class'), /type-focus/)
  assert.match(page.url(), /type=TaskRecord/)
  assert.equal(await page.locator('#searchDrop.open').count(), 0)
  await page.locator('#btnLang').click()
  assert.equal(await record.locator('tr[data-field="id"] .schema-required').textContent(), 'Required')
  assert.equal(await page.locator('.data-types h2').textContent(), 'Data types（2）')

  await page.locator('#btnApis').click()
  await page.locator('#apiFilter').waitFor()
  const ipcRow = page.locator('table tr').filter({ hasText: 'ipc:task:create' })
  assert.deepEqual(await ipcRow.locator('.type-ref').allTextContents(), ['demo.types.TaskRequest', 'demo.types.TaskRecord'])
  await ipcRow.locator('.type-ref').last().click()
  await record.locator('.schema-fields').waitFor()
  assert.match(await record.getAttribute('class'), /type-focus/)
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, '窄屏页面不应出现横向溢出')
  const mobile = join(artifacts, '04-types-mobile.png')
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: mobile, fullPage: true })
  await page.locator('#breadcrumb a').first().click()
  await page.locator('svg.diagram .node-g').first().waitFor()
  assert.equal((await page.locator('svg.diagram .node-g[data-id="demo.kernel"] .node-name').allTextContents()).join(' '), 'Task service', '英文模块名不能把字母s当成空格')
  await page.locator('#btnApis').click()
  await page.locator('#apiFilter').waitFor()
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, '窄屏API浏览器应在表格容器中滚动')
  assert.deepEqual(pageErrors, [], '浏览器不能有JS运行错误')
  console.log('render-contracts-e2e PASS: 容器图、IPC类型跳转、完整schema、类型搜索、双语及窄屏')
  console.log('截图：' + [overview, api, types, mobile].join('\n'))
} finally {
  await browser?.close()
  await rm(work, { recursive: true, force: true })
}
