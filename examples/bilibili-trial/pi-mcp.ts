import { createMcpAdapter } from '<home>/.pi/agent/npm/node_modules/pi-mcp-adapter/index.ts'

export default createMcpAdapter({
  config: {
    settings: {
      toolPrefix: 'server',
      directTools: false,
      scriptMode: true,
      outputGuard: { maxBytes: 180000, maxLines: 7000, detailsMaxBytes: 32000 },
      requestTimeoutMs: 120000,
      trace: { enabled: true, file: 'pi-mcp-trace.jsonl', maxBytes: 2000000, maxEvents: 20000 },
    },
    mcpServers: {
      architecture: {
        command: '<node>/node.exe',
        args: ['<repo-root>/lib/mcp.js', '--repo-root', '<repo-root>/examples/bilibili-trial/project', '--data-dir', '<repo-root>/examples/bilibili-trial/normify-architecture', '--access', 'write'],
        lifecycle: 'lazy',
        includeTools: ['normify_help', 'normify_schema_get', 'normify_graph_get', 'normify_graph_validate', 'normify_graph_put', 'normify_module_get', 'normify_module_list', 'normify_search', 'normify_module_batch', 'normify_module_patch', 'normify_module_upsert', 'normify_validate', 'normify_build', 'normify_render', 'normify_work_packet', 'normify_layout_upsert'],
      },
      data: {
        command: '<node>/node.exe',
        args: ['<repo-root>/lib/mcp.js', '--repo-root', '<repo-root>/examples/bilibili-trial/project', '--data-dir', '<repo-root>/examples/bilibili-trial/normify-data', '--access', 'write'],
        lifecycle: 'lazy',
        includeTools: ['normify_help', 'normify_schema_get', 'normify_graph_get', 'normify_graph_validate', 'normify_graph_put', 'normify_module_get', 'normify_module_list', 'normify_search', 'normify_module_batch', 'normify_module_patch', 'normify_module_upsert', 'normify_validate', 'normify_build', 'normify_render', 'normify_layout_upsert'],
      },
    },
  },
})
