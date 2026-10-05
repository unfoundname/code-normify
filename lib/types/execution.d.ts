/** 固定的只读 Git 能力；第三参数必须沿宿主执行链传递。 */
export type BranchGitReader = (repoRoot: string, args: readonly string[], signal?: AbortSignal) => Promise<string>;
export type NormifyExecutionPhase = 'access' | 'publish';
/** 仅由宿主提供，永远不进入模型参数或工具 JSON Schema。 */
export interface NormifyToolExecution {
    signal: AbortSignal;
    check: (phase: NormifyExecutionPhase) => void;
    readGit: BranchGitReader;
}
/** 独立 CLI 的显式执行契约；受管 host 模式不使用它。 */
export declare const standaloneExecution: Readonly<NormifyToolExecution>;
/** 库 API 的授权门禁：与工具执行链共用同一同步裁决，禁止把宿主 check 当普通函数直接调用。 */
export declare function checkHostGate(check: (phase: NormifyExecutionPhase) => void, signal: AbortSignal | undefined, phase?: NormifyExecutionPhase): void;
export declare function checkExecution(execution: NormifyToolExecution, phase?: NormifyExecutionPhase): void;
export declare function bindHostExecution(execution: NormifyToolExecution | undefined): Readonly<NormifyToolExecution>;
/** Git 等待前后均核对同一执行身份；撤权不转换为坏 OID 或 Git 缺失诊断。 */
export declare function readExecutionGit(execution: NormifyToolExecution, repoRoot: string, args: readonly string[]): Promise<string>;
/** 等待可取消，但调用方仍须保留原串行队列的释放屏障。 */
export declare function waitForExecution<T>(pending: Promise<T>, execution: NormifyToolExecution): Promise<T>;
