import { Ajv2020 } from 'ajv/dist/2020.js';
import formatsPlugin from 'ajv-formats';
import { isValidId } from './ids.js';
import { diag } from './diag.js';
import type { DataType, Diagnostic, Module, ModuleFile, TypeRef } from './types.js';

export const JSON_SCHEMA_DIALECT = 'https://json-schema.org/draft/2020-12/schema';

const IDENTIFIER = /^[$_\p{ID_Start}][$_\u200c\u200d\p{ID_Continue}]*$/u;
const RESERVED_TYPE_NAMES = new Set([
    'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete',
    'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'function', 'if',
    'import', 'in', 'instanceof', 'new', 'null', 'return', 'super', 'switch', 'this', 'throw',
    'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'implements', 'interface', 'let',
    'package', 'private', 'protected', 'public', 'static', 'yield', 'await', 'any', 'unknown',
    'never', 'number', 'bigint', 'boolean', 'string', 'symbol', 'object', 'undefined',
]);

export function isValidTypeName(name: string): boolean {
    return IDENTIFIER.test(name) && !RESERVED_TYPE_NAMES.has(name);
}

/** 类型引用以统一 URN 标识，模块 id 中的点保持原样。 */
export function typeRefUri(ref: TypeRef): string {
    return 'urn:normify:' + ref.module + ':' + encodeURI(ref.name);
}

export function parseTypeRefUri(uri: string): TypeRef | null {
    const match = /^urn:normify:([^:]+):([^:#]+)(?:#.*)?$/.exec(uri);
    if (match === null || !isValidId(match[1]))
        return null;
    let name: string;
    try { name = decodeURIComponent(match[2]); }
    catch { return null; }
    const ref = { module: match[1], name };
    if (!isValidTypeName(name) || typeRefUri(ref) !== 'urn:normify:' + match[1] + ':' + match[2])
        return null;
    return ref;
}

function isJsonValue(value: unknown, ancestors: Set<object>): boolean {
    if (value === null || typeof value === 'string' || typeof value === 'boolean')
        return true;
    if (typeof value === 'number')
        return Number.isFinite(value);
    if (typeof value !== 'object' || ancestors.has(value))
        return false;
    const prototype = Object.getPrototypeOf(value);
    if (!Array.isArray(value) && prototype !== Object.prototype && prototype !== null)
        return false;
    ancestors.add(value);
    const ok = Object.values(value).every(child => isJsonValue(child, ancestors));
    ancestors.delete(value);
    return ok;
}

// 注册标准格式，使 date-time / uuid / email 等契约可以按标准编译。
const metaValidator = new Ajv2020({ strict: false, allErrors: true });
formatsPlugin.default(metaValidator, { keywords: false });

/** L1：由官方元 schema 验证 JSON Schema 的结构，不替代 JSON Schema 语言。 */
export function checkDataTypeSchema(schema: Record<string, unknown>, where: string, out: Diagnostic[]): boolean {
    if (!isJsonValue(schema, new Set())) {
        out.push(diag('error', 'type/schema-not-json', 'schema 必须是无循环引用、无非 JSON 值的 JSON 对象', { path: where }, {}, ['使用合法 JSON Schema 2020-12 对象']));
        return false;
    }
    if (schema.$schema !== undefined && schema.$schema !== JSON_SCHEMA_DIALECT) {
        out.push(diag('error', 'type/schema-dialect', 'schema 只支持 JSON Schema 2020-12', { path: where + '/$schema' }, { value: schema.$schema, expected: JSON_SCHEMA_DIALECT }, ['将 $schema 改为 ' + JSON_SCHEMA_DIALECT]));
        return false;
    }
    if (!metaValidator.validateSchema(schema)) {
        out.push(diag('error', 'type/schema-invalid', 'schema 不符合 JSON Schema 2020-12 元 schema', { path: where }, { errors: metaValidator.errors }, ['修正 JSON Schema 关键字及其取值']));
        return false;
    }
    return true;
}

export interface SchemaRef {
    path: string;
    ref: string;
    target: TypeRef | null;
}

/** 标准 2020-12 子 schema 位置，注释和实例数据不是 schema。 */
function walkSubschemas(schema: Record<string, unknown>, callback: (node: Record<string, unknown>, path: string) => void): void {
    const escape = (key: string): string => key.replace(/~/g, '~0').replace(/\//g, '~1');
    const visit = (value: unknown, path: string): void => {
        if (value === null || typeof value !== 'object' || Array.isArray(value))
            return;
        const node = value as Record<string, unknown>;
        callback(node, path);
        for (const keyword of ['$defs', 'properties', 'patternProperties', 'dependentSchemas']) {
            const map = node[keyword];
            if (map !== null && typeof map === 'object' && !Array.isArray(map)) {
                for (const [key, child] of Object.entries(map))
                    visit(child, path + '/' + keyword + '/' + escape(key));
            }
        }
        for (const keyword of ['allOf', 'anyOf', 'oneOf', 'prefixItems']) {
            const list = node[keyword];
            if (Array.isArray(list))
                list.forEach((child, i) => visit(child, path + '/' + keyword + '/' + i));
        }
        for (const keyword of ['additionalProperties', 'unevaluatedProperties', 'items', 'unevaluatedItems', 'contains', 'propertyNames', 'not', 'if', 'then', 'else', 'contentSchema'])
            visit(node[keyword], path + '/' + keyword);
    };
    visit(schema, '');
}

/** 只遍历规范中的子 schema 位置，避免将 const/default/examples 中的 $ref 当成引用。 */
export function collectSchemaRefs(schema: Record<string, unknown>): SchemaRef[] {
    const refs: SchemaRef[] = [];
    walkSubschemas(schema, (node, path) => {
        for (const keyword of ['$ref', '$dynamicRef']) {
            if (typeof node[keyword] === 'string') {
                const ref = node[keyword] as string;
                refs.push({ path: path + '/' + keyword, ref, target: parseTypeRefUri(ref) });
            }
        }
    });
    return refs;
}

/** move 的唯一契约重写边界；schema 片段及实例/注释中的同名字段保持原值。 */
export function rewriteModuleTypeReferences(module: Module, idMap: ReadonlyMap<string, string>): Module {
    const rewriteRef = (ref: TypeRef): TypeRef => {
        const targetModule = idMap.get(ref.module);
        return targetModule === undefined ? ref : { ...ref, module: targetModule };
    };
    const rewriteUri = (uri: string): string => {
        const ref = parseTypeRefUri(uri);
        if (ref === null)
            return uri;
        const targetModule = idMap.get(ref.module);
        if (targetModule === undefined)
            return uri;
        const fragmentIndex = uri.indexOf('#');
        const fragment = fragmentIndex === -1 ? '' : uri.slice(fragmentIndex);
        return typeRefUri({ module: targetModule, name: ref.name }) + fragment;
    };
    return {
        ...module,
        ...(module.replacement !== undefined ? { replacement: idMap.get(module.replacement) ?? module.replacement } : {}),
        ...(module.apis !== undefined ? {
            apis: module.apis.map(api => ({
                ...api,
                ...(api.input !== undefined ? { input: rewriteRef(api.input) } : {}),
                ...(api.output !== undefined ? { output: rewriteRef(api.output) } : {}),
            })),
        } : {}),
        ...(module.types !== undefined ? {
            types: module.types.map(type => {
                const schema = structuredClone(type.schema);
                walkSubschemas(schema, node => {
                    for (const keyword of ['$id', '$ref', '$dynamicRef']) {
                        if (typeof node[keyword] === 'string')
                            node[keyword] = rewriteUri(node[keyword] as string);
                    }
                });
                return { ...type, schema };
            }),
        } : {}),
    };
}

interface NamedType {
    module: string;
    type: DataType;
    path: string;
    uri: string;
}

/** L2：命名类型唯一性、API 输入输出和 JSON Schema 引用/编译。 */
export function validateContracts(files: ModuleFile[], childrenOf: Map<string, string[]>): Diagnostic[] {
    const out: Diagnostic[] = [];
    const definitions = new Map<string, NamedType>();
    const invalid = new Set<string>();
    for (const file of files) {
        const module = file.module;
        if (module.types !== undefined && (module.parent === null || childrenOf.has(module.id)))
            out.push(diag('error', 'type/non-leaf', '非叶子模块禁止 types 字段；命名数据契约只定义在叶子上', { module: module.id }, {}, ['将 types 下放到叶子模块并删除本字段']));
        for (const [i, type] of (module.types ?? []).entries()) {
            const uri = typeRefUri({ module: module.id, name: type.name });
            const path = module.id + '/types/' + i + '/schema';
            if (definitions.has(uri)) {
                out.push(diag('error', 'type/name-duplicate', '同一模块中的类型名重复', { module: module.id, type: type.name }, {}, ['删除重复类型或为其使用独立名称']));
                invalid.add(uri);
                continue;
            }
            definitions.set(uri, { module: module.id, type, path, uri });
            if (type.schema.$id !== undefined && type.schema.$id !== uri) {
                out.push(diag('error', 'type/schema-id', '类型 schema 的 $id 必须等于该类型的统一 URN', { module: module.id, type: type.name }, { value: type.schema.$id, expected: uri }, ['使用 ' + uri + ' 或删除 $id']));
                invalid.add(uri);
            }
        }
    }
    for (const file of files) {
        for (const [i, api] of (file.module.apis ?? []).entries()) {
            for (const direction of ['input', 'output'] as const) {
                const ref = api[direction];
                if (ref !== undefined && !definitions.has(typeRefUri(ref)))
                    out.push(diag('error', 'api/' + direction + '-type-missing', 'API 的 ' + direction + ' 引用的命名类型不存在', { module: file.module.id, path: file.module.id + '/apis/' + i + '/' + direction }, { target: ref }, ['创建目标类型或修正引用']));
            }
        }
    }
    if (definitions.size === 0)
        return out;
    for (const definition of definitions.values()) {
        for (const ref of collectSchemaRefs(definition.type.schema)) {
            if (ref.ref.startsWith('#'))
                continue;
            if (ref.target === null) {
                out.push(diag('error', 'type/schema-ref-invalid', '跨类型 schema 引用必须使用 urn:normify:<module-id>:<type-name>', { module: definition.module, type: definition.type.name, path: definition.path + ref.path }, { ref: ref.ref }, ['使用类型的统一 URN，或使用本地 # 引用']));
                invalid.add(definition.uri);
            }
            else if (!definitions.has(typeRefUri(ref.target))) {
                out.push(diag('error', 'type/schema-ref-missing', 'schema 引用的命名类型不存在', { module: definition.module, type: definition.type.name, path: definition.path + ref.path }, { target: ref.target, ref: ref.ref }, ['创建目标类型或修正 $ref']));
                invalid.add(definition.uri);
            }
        }
    }
    // 只接受已知 schema 关键字；其余严格模式关闭，保留标准中的合法类型组合/tuple。
    const compiler = new Ajv2020({ strict: false, strictSchema: true, allErrors: true });
    formatsPlugin.default(compiler, { keywords: false });
    // 先统一注册全部类型，允许相互引用、前向引用和递归类型。
    for (const definition of definitions.values()) {
        if (invalid.has(definition.uri))
            continue;
        try {
            compiler.addSchema({ ...definition.type.schema, $id: definition.uri }, definition.uri);
        }
        catch (error) {
            invalid.add(definition.uri);
            out.push(diag('error', 'type/schema-invalid', 'schema 注册失败：' + (error instanceof Error ? error.message : String(error)), { module: definition.module, type: definition.type.name, path: definition.path }, {}, ['修正 JSON Schema 标识和关键字']));
        }
    }
    for (const definition of definitions.values()) {
        if (invalid.has(definition.uri))
            continue;
        try {
            compiler.getSchema(definition.uri);
        }
        catch (error) {
            out.push(diag('error', 'type/schema-invalid', 'schema 无法编译或解析本地引用：' + (error instanceof Error ? error.message : String(error)), { module: definition.module, type: definition.type.name, path: definition.path }, {}, ['修正 JSON Schema 及其引用']));
        }
    }
    return out;
}
