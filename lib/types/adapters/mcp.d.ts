import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { NormifyTool } from '../tools.js';
export interface NormifyMcpAdapter {
    server: Server;
    /** 等待已经进入内核的操作完成，避免关闭传输时中断落盘。 */
    drain: () => Promise<void>;
}
/** MCP 只负责协议转换；工作区、权限、校验和锁由受管服务统一处理。 */
export declare function createNormifyMcpAdapter(tools: readonly NormifyTool[]): NormifyMcpAdapter;
