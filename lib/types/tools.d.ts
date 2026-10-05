import { type NormifyToolExecution } from './execution.js';
import type { ToolCatalogEntry } from './engine/reference.js';
import type { Diagnostic } from './engine/types.js';
export interface ToolEnv {
    rootDir: string;
    requireBilingual: boolean;
}
/** JSON Schema 节点（作者态：属性级内联 required: true；编译后对象级为 required: string[]）。 */
export interface SchemaNode {
    type?: string | string[];
    description?: string;
    required?: boolean | string[];
    properties?: Record<string, SchemaNode>;
    items?: SchemaNode;
    additionalProperties?: boolean;
    [key: string]: unknown;
}
/** params() 编译出的对象级 JSON Schema。 */
export type ObjectSchema = SchemaNode & {
    type: 'object';
    required?: string[];
};
/** 工具行为标记：read=只读；write=写入；destroy=破坏性；idempotent=幂等。 */
export type ToolBehavior = 'read' | 'write' | 'destroy' | 'idempotent';
/** register() 的工具定义。 */
interface ToolDef {
    description: string;
    behavior: ToolBehavior;
    parameters: ObjectSchema;
}
/** 工具结果始终为 JSON 对象，业务诊断保留在对应工具的字段中。 */
export interface NormifyToolResult {
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    [key: string]: unknown;
}
/** 可直接交给 Electron 主进程、MCP 或其他宿主的统一工具目录。 */
export interface NormifyTool {
    name: string;
    description: string;
    behavior: ToolBehavior;
    parameters: ObjectSchema;
    execute: (args?: Record<string, unknown>, execution?: NormifyToolExecution) => Promise<NormifyToolResult>;
}
export type NormifyToolRegistration = (tool: NormifyTool) => void;
/** 新能力复用同一参数校验、错误契约与进程内串行调度边界。 */
export declare function defineNormifyTool<A>(env: ToolEnv, definition: ToolDef & {
    name: string;
}, execute: (args: A, execution: NormifyToolExecution) => Promise<{
    ok: boolean;
}>): NormifyTool;
export declare function createNormifyTools(env: ToolEnv, getHelpCatalog?: () => readonly ToolCatalogEntry[]): NormifyTool[];
/** 类型化登记入口；宿主决定如何发布目录。 */
export declare function registerTools(register: NormifyToolRegistration, env: ToolEnv): void;
export {};
