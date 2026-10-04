import type { Diagnostic, LayoutData, Module, ModuleFile } from './types.js';
import type { ValidateOutput } from './validate.js';
/** 可编辑 JSON 图；树边、接口索引和类型关系都由 modules 派生，不再存第二份。 */
export interface ArchitectureGraph {
    schema_version: 1;
    modules: Module[];
    layouts: LayoutData[];
}
export { graphDigest } from './manifest.js';
export declare function readGraph(dataDir: string): Promise<{
    ok: boolean;
    graph: ArchitectureGraph;
    digest: string;
    errors: Diagnostic[];
    warnings: Diagnostic[];
}>;
export declare function validateGraph(dataDir: string, graph: ArchitectureGraph, repoRoot: string, requireBilingual: boolean): Promise<{
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
}>;
export declare function putGraph(dataDir: string, graph: ArchitectureGraph, repoRoot: string, requireBilingual: boolean, expected: string): Promise<{
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    digest: string;
    modules?: undefined;
    artifacts?: undefined;
    receipt?: undefined;
} | {
    ok: boolean;
    errors: never[];
    warnings: Diagnostic[];
    digest: string;
    modules: number;
    artifacts: string[];
    receipt: Record<string, unknown> | null;
}>;
export declare function moduleDependencies(module: Module): string[];
/** 叶子和容器统一继承祖先声明的依赖；这是契约上下文，不代表开发先后。 */
export declare function effectiveModuleDependencies(module: Module, byId: ReadonlyMap<string, ModuleFile>): string[];
/** 无调度状态的分工投影；身份、派发与权限仍由 PromptManager 内核持有。 */
export declare function workPacket(dataDir: string, requested: string[], repoRoot: string, requireBilingual: boolean): Promise<{
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    digest: string;
    modules: {
        uid: string;
        id: string;
        parent: string | null;
        name: import("./types.js").LocalizedText;
        description: import("./types.js").LocalizedText;
        source: import("./types.js").SourceRef[];
        revision: string;
        updated_at: string;
        fingerprint: string;
        repository?: string;
        state?: import("./types.js").ModuleState;
        replacement?: string;
        tags?: string[];
        apis?: import("./types.js").Api[];
        types?: import("./types.js").DataType[];
        deps?: import("./types.js").Dep[];
    }[];
    context: {
        id: string;
        body: string;
    }[];
    dependencies: Module[];
    write_paths: string[];
    conflicts: {
        path: string;
        module: string;
    }[];
    acceptance: string[];
} | {
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
}>;
/** 已验证快照的分工投影；分支整体验证复用同一快照和文件所有权检查。 */
export declare function projectWorkPacket(checked: ValidateOutput, requested: string[], repoRoot: string, digest: string, ownershipChecked?: boolean): Promise<{
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    digest?: undefined;
    modules?: undefined;
    context?: undefined;
    dependencies?: undefined;
    write_paths?: undefined;
    conflicts?: undefined;
    acceptance?: undefined;
} | {
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    digest: string;
    modules: {
        uid: string;
        id: string;
        parent: string | null;
        name: import("./types.js").LocalizedText;
        description: import("./types.js").LocalizedText;
        source: import("./types.js").SourceRef[];
        revision: string;
        updated_at: string;
        fingerprint: string;
        repository?: string;
        state?: import("./types.js").ModuleState;
        replacement?: string;
        tags?: string[];
        apis?: import("./types.js").Api[];
        types?: import("./types.js").DataType[];
        deps?: import("./types.js").Dep[];
    }[];
    context: {
        id: string;
        body: string;
    }[];
    dependencies: Module[];
    write_paths: string[];
    conflicts: {
        path: string;
        module: string;
    }[];
    acceptance: string[];
}>;
