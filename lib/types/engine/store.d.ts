import { type NormifyToolExecution } from '../execution.js';
import type { Diagnostic, Module, ModuleFile, SourceRef } from './types.js';
export declare const PROJECT_PREFIX = "normify-";
export declare class NormifyError extends Error {
    code: string;
    constructor(code: string, message: string);
}
export interface ProjectRef {
    dir: string;
    slug: string;
}
/** 解析结构数据目录：dir 显式给出，或 normify-<project> 落在 rootDir 下。create=true 时自动创建空项目目录（仅写工具使用）。 */
export declare function resolveProject(rootDir: string, args: {
    project?: string;
    dir?: string;
}, opts?: {
    create?: boolean;
}): Promise<ProjectRef>;
export declare function listProjects(rootDir: string): ProjectRef[];
export declare function listModuleFiles(projectDir: string): Promise<string[]>;
/** 找模块现有文件（容器 index.md 优先，其次叶子 x.md）。 */
export declare function findModuleFile(projectDir: string, id: string): string | null;
export declare function loadAllModules(projectDir: string, options?: {
    requireBilingual?: boolean;
}): Promise<{
    files: ModuleFile[];
    errors: Diagnostic[];
    warnings: Diagnostic[];
}>;
/** 判断某模块当前是否为容器（有子模块或是根）。 */
export declare function isContainer(module: Module, all: Module[]): boolean;
export declare function writeModuleFile(projectDir: string, module: Module, body: string, context?: {
    files: ModuleFile[];
}): Promise<{
    file: string;
    promoted: string[];
    warnings: Diagnostic[];
}>;
/** 删除模块及其子树（含空目录清理与父模块降级）。 */
export declare function deleteModuleTree(projectDir: string, id: string): Promise<{
    deleted: string[];
    demoted: string | null;
    warnings: Diagnostic[];
}>;
/** 叶子晋升容器：x.md → x/index.md。 */
export declare function promoteModule(projectDir: string, id: string): Promise<{
    file: string;
    warnings: Diagnostic[];
}>;
export declare function gitHead(repoRoot: string, execution?: NormifyToolExecution): Promise<{
    sha: string | null;
    error: string | null;
}>;
/** git 变更文件清单（增量再生成的输入）。 */
export declare function gitChangedFiles(repoRoot: string, diffSpec: string, execution?: NormifyToolExecution): Promise<{
    files: string[] | null;
    error: string | null;
}>;
/** source 路径的落地形态：普通文件（含指向普通文件的符号链接）/ 路径不存在 / 存在但不是普通文件。 */
export type SourcePathKind = 'file' | 'missing' | 'not-a-file';
/**
 * 判定 source 路径属于哪种落地形态。三态必须分开：existsSync 对目录同样返回 true，
 * 用它判存在会把「目录」算成已落地的源码文件（历史上目录于是被报成「文件缺失」）。
 *  · lstat ENOENT           → missing（路径确实不存在）；
 *  · lstat 其它 io 错误     → not-a-file（EACCES/EPERM/ELOOP 等都不是「不存在」）；
 *  · 普通文件               → file；
 *  · 符号链接               → 按目标判定：指向普通文件仍算 file，断链或指向目录/设备算 not-a-file。
 */
export declare function classifySourcePath(repoRoot: string, path: string): Promise<{
    kind: SourcePathKind;
    abs: string;
}>;
/** source 文件集合的 SHA-256 指纹（全量哈希，v1 不做采样）。missing 与 notFiles 都让 hash 为 null。 */
export declare function fingerprintOf(repoRoot: string, sources: SourceRef[]): Promise<{
    hash: string | null;
    missing: string[];
    notFiles: string[];
}>;
export declare function sha256Text(text: string): string;
