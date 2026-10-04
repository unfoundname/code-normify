import { chromium } from 'playwright'
import { readFile, mkdir } from 'node:fs/promises'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const trial = dirname(fileURLToPath(import.meta.url))
const screenshots = join(trial, 'screenshots')
await mkdir(screenshots, { recursive: true })
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 1200 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  for (const [view, root] of [['architecture', 'bili'], ['data', 'data.publish.t-4a95581d']]) {
    const url = pathToFileURL(join(trial, view === 'architecture' ? 'normify-architecture-view' : 'normify-data', 'normify.html'))
    url.search = '?lang=zh'
    url.hash = '#module=' + root
    await page.goto(url.href)
    if (view === 'architecture') {
      await page.locator('svg.diagram .node-g').first().waitFor()
      await page.getByRole('button', { name: '适应', exact: true }).click()
      await page.locator('.diagram-wrap').evaluate(element => { element.style.maxHeight = 'none' })
      await page.locator('svg.diagram').screenshot({ path: join(screenshots, view + '.png') })
    } else {
      await page.locator('.type-definition').waitFor()
      await page.locator('.data-types').screenshot({ path: join(screenshots, view + '.png') })
    }
  }
  const data = JSON.parse(await readFile(join(trial, 'data.json'), 'utf8'))
  const videoTypes = data.modules.filter(module => module.parent === 'data.publish').map(module => ({ id: module.id, types: (module.types ?? []).map(type => type.name) }))
  console.log(JSON.stringify({ screenshots, pageErrors: errors, videoTypes }))
  if (errors.length) throw new Error(JSON.stringify(errors))
} finally { await browser.close() }
