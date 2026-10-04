import type { Diagnostic, Module, ModuleFile, TypeRef } from './types.js';
export declare const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";
export declare function isValidTypeName(name: string): boolean;
/** 类型引用以统一 URN 标识，模块 id 中的点保持原样。 */
export declare function typeRefUri(ref: TypeRef): string;
export declare function parseTypeRefUri(uri: string): TypeRef | null;
/** L1：由官方元 schema 验证 JSON Schema 的结构，不替代 JSON Schema 语言。 */
export declare function checkDataTypeSchema(schema: Record<string, unknown>, where: string, out: Diagnostic[]): boolean;
export interface SchemaRef {
    path: string;
    ref: string;
    target: TypeRef | null;
}
/** 只遍历规范中的子 schema 位置，避免将 const/default/examples 中的 $ref 当成引用。 */
export declare function collectSchemaRefs(schema: Record<string, unknown>): SchemaRef[];
/** move 的唯一契约重写边界；schema 片段及实例/注释中的同名字段保持原值。 */
export declare function rewriteModuleTypeReferences(module: Module, idMap: ReadonlyMap<string, string>): Module;
/** L2：命名类型唯一性、API 输入输出和 JSON Schema 引用/编译。 */
export declare function validateContracts(files: ModuleFile[], childrenOf: Map<string, string[]>): Diagnostic[];
