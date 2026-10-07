import { createMcpAdapter } from '<home>/.pi/agent/npm/node_modules/pi-mcp-adapter/index.ts'

const trial = '<repo-root>/examples/bilibili-pi-full'
const server = (view: string) => ({
  command: '<node>',
  args: ['<repo-root>/lib/mcp.js', '--repo-root', `${trial}/project`, '--data-dir', `${trial}/normify-${view}`, '--access', 'write'],
  lifecycle: 'lazy' as const,
})

export default createMcpAdapter({
  config: {
    settings: {
      toolPrefix: 'server', directTools: false, scriptMode: true,
      outputGuard: { maxBytes: 180000, maxLines: 7000, detailsMaxBytes: 40000 },
      requestTimeoutMs: 120000,
      trace: { enabled: true, file: 'pi-mcp-trace.jsonl', maxBytes: 16000000, maxEvents: 40000 },
    },
    mcpServers: {
      architecture: server('architecture'),
      data: server('data'),
      delivery: server('delivery'),
    },
  },
})
