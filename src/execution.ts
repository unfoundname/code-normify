import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { WorkspaceError } from './workspace.js';

/** 固定的只读 Git 能力；第三参数必须沿宿主执行链传递。 */
export type BranchGitReader = (repoRoot: string, args: readonly string[], signal?: AbortSignal) => Promise<string>;
export type NormifyExecutionPhase = 'access' | 'publish';
/** 仅由宿主提供，永远不进入模型参数或工具 JSON Schema。 */
export interface NormifyToolExecution {
    signal: AbortSignal;
    check: (phase: NormifyExecutionPhase) => void;
    readGit: BranchGitReader;
}

const git = promisify(execFile);
/** 独立 CLI 的显式执行契约；受管 host 模式不使用它。 */
export const standaloneExecution: Readonly<NormifyToolExecution> = Object.freeze({
    signal: new AbortController().signal,
    check: () => {},
    readGit: async (repoRoot: string, args: readonly string[], signal?: AbortSignal) =>
        (await git('git', ['--no-replace-objects', ...args], {
            cwd: repoRoot, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024, timeout: 15000, signal,
        })).stdout,
});

/** 异步门禁等于没有门禁：返回的 Promise 被丢弃，宿主的拒绝对发布不生效。 */
function executionInvalid(message: string): WorkspaceError {
    return new WorkspaceError('workspace/execution-invalid', message);
}

function thenable(value: unknown): boolean {
    return value !== null && (typeof value === 'object' || typeof value === 'function') && typeof (value as { then?: unknown }).then === 'function';
}

/** 门禁必须同步裁决；漏网 thenable 先挂 catch 吞掉拒绝，再按失败关闭同步抛错。 */
function assertSynchronousCheck(outcome: unknown, at: string): void {
    if (!thenable(outcome)) return;
    Promise.resolve(outcome as PromiseLike<unknown>).catch(() => {});
    throw executionInvalid('授权门禁 check 必须' + at + '同步返回：返回的 Promise 会被丢弃，宿主的拒绝无法生效，已按失败关闭拒绝执行；请改为同步抛出错误的 check');
}

/** 库 API 的授权门禁：与工具执行链共用同一同步裁决，禁止把宿主 check 当普通函数直接调用。 */
export function checkHostGate(check: (phase: NormifyExecutionPhase) => void, signal: AbortSignal | undefined, phase: NormifyExecutionPhase = 'access'): void {
    signal?.throwIfAborted();
    assertSynchronousCheck(check(phase), '在 ' + phase + ' 阶段');
    signal?.throwIfAborted();
}

export function checkExecution(execution: NormifyToolExecution, phase: NormifyExecutionPhase = 'access'): void {
    checkHostGate(execution.check, execution.signal, phase);
}

export function bindHostExecution(execution: NormifyToolExecution | undefined): Readonly<NormifyToolExecution> {
    if (!execution || !(execution.signal instanceof AbortSignal) || typeof execution.check !== 'function' || typeof execution.readGit !== 'function')
        throw new WorkspaceError('workspace/execution-required', 'host 模式必须提供 signal、check 和固定 readGit 执行能力');
    if (Object.prototype.toString.call(execution.check) === '[object AsyncFunction]')
        throw executionInvalid('授权门禁 check 不能是 async 函数：返回的 Promise 会被丢弃，宿主的拒绝无法阻止发布，已按失败关闭拒绝执行；请改为同步抛出错误的 check');
    execution.signal.throwIfAborted();
    // 普通函数返回 Promise 的写法只能靠调用判定：绑定阶段探测一次，把静默失效变成显式报错。
    assertSynchronousCheck(execution.check('access'), '绑定阶段');
    return Object.freeze({ signal: execution.signal, check: execution.check, readGit: execution.readGit });
}

/** Git 等待前后均核对同一执行身份；撤权不转换为坏 OID 或 Git 缺失诊断。 */
export async function readExecutionGit(execution: NormifyToolExecution, repoRoot: string, args: readonly string[]): Promise<string> {
    checkExecution(execution);
    const output = await execution.readGit(repoRoot, [...args], execution.signal);
    checkExecution(execution);
    return output;
}

/** 等待可取消，但调用方仍须保留原串行队列的释放屏障。 */
export async function waitForExecution<T>(pending: Promise<T>, execution: NormifyToolExecution): Promise<T> {
    checkExecution(execution);
    let abort!: () => void;
    const cancelled = new Promise<never>((_, reject) => {
        abort = () => reject(execution.signal.reason);
        execution.signal.addEventListener('abort', abort, { once: true });
    });
    try {
        const result = await Promise.race([pending, cancelled]);
        checkExecution(execution);
        return result;
    } finally { execution.signal.removeEventListener('abort', abort); }
}
