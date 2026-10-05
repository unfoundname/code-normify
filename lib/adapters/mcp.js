import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError } from '@modelcontextprotocol/sdk/types.js';
/** MCP 只负责协议转换；工作区、权限、校验和锁由受管服务统一处理。 */
export function createNormifyMcpAdapter(tools) {
    const server = new Server({ name: 'normify', version: '0.8.0' }, {
        capabilities: { tools: {} },
    });
    const byName = new Map(tools.map(tool => [tool.name, tool]));
    const active = new Set();
    const definitions = tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.parameters,
        annotations: {
            readOnlyHint: tool.behavior === 'read',
            destructiveHint: tool.behavior === 'destroy',
            idempotentHint: tool.behavior === 'read' || tool.behavior === 'idempotent',
            openWorldHint: false,
        },
    }));
    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: definitions }));
    server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
        const tool = byName.get(request.params.name);
        if (tool === undefined)
            throw new McpError(ErrorCode.InvalidParams, '未知的 Normify 工具：' + request.params.name);
        // 只在进入内核前接受取消；执行后必须回报实际落盘结果。
        if (extra.signal.aborted)
            throw new McpError(ErrorCode.InternalError, '工具请求已在执行前取消');
        let operation;
        try {
            operation = tool.execute(request.params.arguments ?? {});
            active.add(operation);
            const output = await operation;
            const isError = output.ok === false || output.errors.length > 0;
            return {
                content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
                structuredContent: output,
                isError,
            };
        }
        catch (error) {
            if (error instanceof McpError)
                throw error;
            throw new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
        }
        finally {
            if (operation !== undefined)
                active.delete(operation);
        }
    });
    return {
        server,
        drain: async () => {
            while (active.size > 0)
                await Promise.allSettled([...active]);
        },
    };
}
//# sourceMappingURL=mcp.js.map