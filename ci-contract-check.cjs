const { pathToFileURL } = require('node:url');
const { resolve, dirname, join } = require('node:path');

function checkCatalog(catalog, required) {
  if (!Array.isArray(catalog) || catalog.length === 0)
    throw new Error('expected a non-empty Normify tool catalog');
  const names = new Set();
  for (const tool of catalog) {
    if (!/^[a-zA-Z0-9_-]+$/.test(tool.name))
      throw new Error('tool name is not provider-safe: ' + tool.name);
    if (names.has(tool.name))
      throw new Error('duplicate tool name: ' + tool.name);
    names.add(tool.name);
    if (tool.parameters.type !== 'object')
      throw new Error('tool parameters must be an object JSON Schema: ' + tool.name);
    if (typeof tool.execute !== 'function')
      throw new Error('missing tool executor: ' + tool.name);
  }
  for (const name of required)
    if (!names.has(name))
      throw new Error('missing tool: ' + name);
}

async function check() {
  const library = await import(pathToFileURL(resolve('lib/index.js')).href);
  const baseTools = library.createNormifyTools({ rootDir: process.cwd(), requireBilingual: true });
  checkCatalog(baseTools, ['normify_project_init', 'normify_help', 'normify_module_batch']);
  const repoRoot = process.cwd();
  const promptManagerTools = await library.createPromptManagerTools({
    repoRoot,
    dataDir: join(dirname(repoRoot), 'normify-ci-fixture'),
    access: 'write', execution: 'standalone',
  });
  checkCatalog(promptManagerTools, ['normify_schema_get', 'normify_graph_get', 'normify_work_packet', 'normify_branch_plan_suggest', 'normify_branch_plan_get', 'normify_branch_plan_validate', 'normify_branch_plan_put', 'normify_branch_plan_delete', 'normify_branch_packet', 'normify_branch_plan_export']);
  if ('apply' in library || 'inject' in library)
    throw new Error('DSH plugin entry point remains in the standalone library');
  console.log('library and PromptManager tool contracts ok (' + baseTools.length + ' base, ' + promptManagerTools.length + ' bound tools)');
}

check().catch(error => { console.error(error); process.exitCode = 1; });
