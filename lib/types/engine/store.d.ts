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
/**
 * 模块子树里「**读不了**」的目录（EACCES / EPERM / EIO …）。
 *
 * 为什么必须把它与「不存在」分开：`walk` 原先对 `readdir` 的任何失败都 `return`（静默跳过），
 * 于是**权限失败**与**目录不存在**在引擎里长得一模一样——回退链上没有任何诊断出口，
 * 公开的 `validateProject` 会在漏扫整棵子树之后照样返回 `ok: true`（fail-open：少扫的文件越多，
 * 结论看起来越干净）。这里只记录事实，是否升级为 error 由调用方决定：
 * 只有公开 `validateProject` 这条路径要求「读不了 ⇒ 显式浮出」；
 * 受管 service 的写路径另有更早的检查，不改它们的既有语义。
 */
export interface ModuleWalkReadError {
    /** 仓库/工程相对 posix 路径（例：`modules/demo/alpha`）。 */
    path: string;
    /** 原始错误文本（`String(error)`）。 */
    reason: string;
    /** 出错码（`ENOENT` 不会进这个清单；拿不到码时为 null）。 */
    code: string | null;
}
export declare function listModuleFiles(projectDir: string, options?: {
    readErrors?: ModuleWalkReadError[];
}): Promise<string[]>;
/**
 * `modules/` 下的两类结构异常（SPEC §5.2 规则 6 的后半句：「`modules/` 下**无游离文件、无空树目录**」）。
 *
 * 为什么必须单独查：`walk`（`listModuleFiles`）**只收 `.md`**——非 `.md` 文件与不含模块文件的目录都被
 * 静默跳过，于是「modules/ 下有不该有的东西」在 L1/L2 整条链路上**没有任何诊断出口**（那条规则写了，
 * 但没人实现）。判据只看**磁盘**，与 `listModuleFiles` 同源（引擎按文件系统读模块，不按 git 索引）。
 *
 *   游离文件   = `modules/` 下任何**不以 `.md` 结尾**的普通文件（编辑器的临时文件、误落的数据文件……）；
 *   空树目录   = `modules/` 下任何**子树里一个 `.md` 都没有**的目录（git 不跟踪空目录，所以它只可能
 *                来自磁盘操作；它下面就算有文件，那些文件也全是游离文件）。
 * `modules/` 根本身不算「空树目录」（那种情形已由 `structure/no-root` 报出，不重复点名）。
 */
export declare function listModuleTreeAnomalies(projectDir: string): Promise<{
    strayFiles: string[];
    emptyTreeDirs: string[];
}>;
/** 找模块现有文件（容器 index.md 优先，其次叶子 x.md）。 */
export declare function findModuleFile(projectDir: string, id: string): string | null;
/**
 * 读全部模块文件（L1 入口）。
 * `options.surfaceDirReadErrors = true` 时，「**读不了**的目录」（非 ENOENT）会被升级成 `input/read` **error**：
 * 与下面「读不了模块文件」的诊断同码、同形状（缺一个目录会让整棵子树静默消失，比缺一个文件更严重）。
 * 不传时行为与历史版本逐字节一致——目前只有公开 `validateProject` 传它（见 `validate.ts`）。
 */
export declare function loadAllModules(projectDir: string, options?: {
    requireBilingual?: boolean;
    surfaceDirReadErrors?: boolean;
}): Promise<{
    files: ModuleFile[];
    errors: Diagnostic[];
    warnings: Diagnostic[];
}>;
/** 判断某模块当前是否为容器（有子模块或是根）。 */
export declare function isContainer(module: Module, all: Module[]): boolean;
/**
 * 目标文件与 id 的**往返一致性**（SPEC §3.2 的映射 + §5.2 规则 6「文件位置与 id 映射一致」，error 级 MUST）。
 *
 * 为什么要单独查：SPEC §3.2 的映射是「叶子 = `<最后一段>.md`」，于是**末段为 `index` 的叶子**算出的路径
 * 与「父容器 / 根的文件 `<最后一段>/index.md`」逐字节相同——`demo.index`（叶子）与容器 `demo` 都映射到
 * `modules/demo/index.md`，而 `idFromFilePath('modules/demo/index.md')` 反解回的是 `demo`。
 * `validateProject` 事后确实会报 `structure/file-id-mismatch`，但那是**写完以后**：写入本身不是「新建模块」，
 * 而是把容器根模块的文件**顶替掉**（实测：`demo.index` 覆盖 `modules/demo/index.md`，根的 id 从 `demo`
 * 变成 `demo.index`，`validateProject` 随即报 `structure/no-root` / `structure/parent-not-exist`）。
 * 而且这条判据不能只看「当前有没有别的模块占着那份文件」：`<父>/index.md` 是**留给 `<父>` 做容器/根**的位置，
 * 父模块此刻还没有子模块也一样——所以判据就是往返一致性本身，`occupant` 只用于把话说准。
 *
 * 返回 `null` = 一致（可以写）；否则 `{ target, derived, occupant }`：
 *   target   目标文件（工程相对 posix），derived = 它反解出来的 id（不是本模块的 id）
 *   occupant 现在占着这份文件的模块（可能为 `null`：那个位置只是被布局预留给父模块）
 * **本函数不改 id 空间**：`isValidId('demo.index')` 仍为 true，`<x>.index` 作为**容器**照样合法
 * （它落在 `…/index/index.md`，往返一致）；被拒的只是「算不出自己那份文件」的写法。
 */
export declare function moduleFileLayoutConflict(projectDir: string, module: Module, files: ModuleFile[]): {
    target: string;
    derived: string | null;
    occupant: ModuleFile | null;
} | null;
/** 布局冲突的 error 诊断（写路径、dry-run、批量预检共用同一份文案，避免三处口径漂移）。 */
export declare function moduleFileLayoutConflictDiag(projectDir: string, module: Module, conflict: {
    target: string;
    derived: string | null;
    occupant: ModuleFile | null;
}): Diagnostic;
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
