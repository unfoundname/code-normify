#!/usr/bin/env node
import { resolve } from 'node:path';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createNormifyMcpAdapter } from './adapters/mcp.js';
import { createPromptManagerTools } from './service.js';

const usage = '用法：normify-mcp --repo-root <路径> --data-dir <路径> --access <read|write>；相对路径按宿主启动 cwd 解析';

function parseOptions(argv: string[]): { repoRoot: string; dataDir: string; access: 'read' | 'write'; execution: 'standalone' } {
    const allowed = new Set(['--repo-root', '--data-dir', '--access']);
    const options = new Map<string, string>();
    for (let i = 0; i < argv.length; i += 2) {
        const key = argv[i];
        const value = argv[i + 1];
        if (!allowed.has(key) || options.has(key) || value === undefined || value.startsWith('--'))
            throw new Error('无效、重复或缺少值的启动参数：' + key + '\n' + usage);
        options.set(key, value);
    }
    const repoRoot = options.get('--repo-root');
    const dataDir = options.get('--data-dir');
    const access = options.get('--access');
    if (repoRoot === undefined || dataDir === undefined || access === undefined)
        throw new Error('必须显式指定 repo-root、data-dir 和 access。\n' + usage);
    if (access !== 'read' && access !== 'write')
        throw new Error('access 必须是 read 或 write。\n' + usage);
    const launchCwd = process.cwd();
    return { repoRoot: resolve(launchCwd, repoRoot), dataDir: resolve(launchCwd, dataDir), access, execution: 'standalone' };
}

async function main(): Promise<void> {
    if (process.argv.length === 3 && process.argv[2] === '--help') {
        console.error(usage);
        return;
    }
    const tools = await createPromptManagerTools(parseOptions(process.argv.slice(2)));
    const adapter = createNormifyMcpAdapter(tools);
    let closing: Promise<void> | undefined;
    const close = (): Promise<void> => {
        closing ??= (async () => {
            await adapter.server.close();
            await adapter.drain();
        })();
        return closing;
    };
    const shutdown = (): void => {
        void close().then(() => process.exit(0), error => {
            console.error('[normify-mcp] 关闭失败：' + String(error));
            process.exit(1);
        });
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
    process.stdin.once('end', shutdown);
    adapter.server.onerror = error => console.error('[normify-mcp] 协议错误：' + error.message);
    await adapter.server.connect(new StdioServerTransport());
}

void main().catch(error => {
    console.error('[normify-mcp] ' + (error instanceof Error ? error.message : String(error)));
    process.exit(1);
});
