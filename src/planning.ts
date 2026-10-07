import { checkExecution, checkHostGate, type NormifyToolExecution, type NormifyExecutionPhase } from './execution.js';
import { branchPackets, readBranchPlan, type BranchGitReader, type BranchPacket, type BranchPlan } from './engine/branches.js';
import { graphDigest } from './engine/manifest.js';
import { createPromptManagerTools, type PromptManagerOptions } from './service.js';
import { withProjectLock, WorkspaceError } from './workspace.js';

export interface BranchPlanningSnapshot {
    plan: BranchPlan;
    packets: BranchPacket[];
    plan_digest: string;
    graph_digest: string;
}
export interface BranchPlanningHead {
    plan: BranchPlan | null;
    plan_digest: string;
    graph_digest: string;
}

/** 发现当前设计版本；接纳仍须完整校验快照与固定 Git 基线。 */
export async function readBranchPlanningHead(options: PromptManagerOptions, signal?: AbortSignal, check: (phase: NormifyExecutionPhase) => void = () => {}): Promise<BranchPlanningHead> {
    options = { ...options };
    // 宿主 check 必须同步裁决：直接调用会把返回的 Promise 丢掉，等于失败开放。
    const gate = (phase: NormifyExecutionPhase = 'access') => checkHostGate(check, signal, phase);
    signal?.throwIfAborted();
    gate();
    await createPromptManagerTools({ ...options, access: 'read', execution: 'host' });
    // 关键 await 之后必须用同一 execution 重新核对身份（SPEC §3.1）：这一步不重新核对，
    // 从门禁到取锁之间的撤权就只能靠 withProjectLock 顺手挡住，而不是契约要求的显式复核。
    gate();
    return withProjectLock(options.dataDir, async () => {
        const graph_digest = await graphDigest(options.dataDir), result = await readBranchPlan(options.dataDir);
        // 关键 await 之后、任何诊断之前复核授权：撤权 MUST NOT 被降级成 branch/not-ready、
        // branch/graph-drift 这类普通诊断（SPEC §3.1）。顺序反了就等于把撤权报成「设计变了」。
        gate();
        if (result.errors.length) throw new WorkspaceError('branch/not-ready', result.errors.map(error => error.message).join('\n'));
        const recheckGraph = await graphDigest(options.dataDir), recheckPlan = await readBranchPlan(options.dataDir);
        gate();
        if (recheckGraph !== graph_digest || recheckPlan.digest !== result.digest)
            throw new WorkspaceError('branch/graph-drift', '读取期间设计改变，请重新读取版本');
        gate();
        return structuredClone({ plan: result.plan, plan_digest: result.digest, graph_digest });
    }, signal, () => gate());
}

/** 接纳执行前的原子设计读取。身份/目录/Git 能力由宿主提供，不来自模型参数。 */
export async function readBranchPlanningSnapshot(options: PromptManagerOptions,
    expected: { plan_digest: string; graph_digest: string }, readGit: BranchGitReader, signal?: AbortSignal, check: (phase: NormifyExecutionPhase) => void = () => {}): Promise<BranchPlanningSnapshot> {
    signal?.throwIfAborted();
    const gate = (phase: NormifyExecutionPhase = 'access') => checkHostGate(check, signal, phase);
    gate();
    expected = { ...expected };
    if (typeof readGit !== 'function') throw new WorkspaceError('branch/git-reader-required', '宿主必须提供固定的只读 Git 端口');
    const execution: NormifyToolExecution = { signal: signal ?? new AbortController().signal, check, readGit };
    checkExecution(execution);
    // 复用受管服务的目录/项目绑定校验；不执行工具，不增发写权限。
    await createPromptManagerTools({ ...options, access: 'read', execution: 'host' });
    // 关键 await 之后必须用同一 execution 重新核对身份（SPEC §3.1），不能把复核推给取锁的副作用。
    checkExecution(execution);
    return withProjectLock(options.dataDir, async () => {
        const currentGraph = await graphDigest(options.dataDir), currentPlan = await readBranchPlan(options.dataDir);
        // 两次关键读之后、版本冲突诊断之前复核授权（SPEC §3.1）：撤权 MUST NOT 被降级成 branch/conflict。
        checkExecution(execution);
        if (currentGraph !== expected.graph_digest || currentPlan.digest !== expected.plan_digest)
            throw new WorkspaceError('branch/conflict', '设计版本已改变，不能读取旧计划');
        const result = await branchPackets(options.dataDir, options.repoRoot, options.requireBilingual ?? true, execution);
        checkExecution(execution);
        if (!result.ok || !result.plan) throw new WorkspaceError('branch/not-ready',
            result.errors.map(error => `${error.code}: ${error.message}`).join('\n'));
        if (result.digest !== expected.plan_digest || result.graph_digest !== expected.graph_digest)
            throw new WorkspaceError('branch/conflict', '设计版本已改变，不能接纳旧计划');
        // 与不遵守服务锁的外部写入者也核对图版本，禁止将不同版本拼成执行输入。
        const settledGraph = await graphDigest(options.dataDir), settledPlan = await readBranchPlan(options.dataDir);
        checkExecution(execution);
        if (settledGraph !== result.graph_digest || settledPlan.digest !== result.digest)
            throw new WorkspaceError('branch/graph-drift', '读取期间架构图改变，不能接纳设计');
        return structuredClone({ plan: result.plan, packets: result.packets,
            plan_digest: result.digest, graph_digest: result.graph_digest });
    }, signal, () => gate());
}
