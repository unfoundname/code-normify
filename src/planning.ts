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
    return withProjectLock(options.dataDir, async () => {
        const graph_digest = await graphDigest(options.dataDir), result = await readBranchPlan(options.dataDir);
        if (result.errors.length) throw new WorkspaceError('branch/not-ready', result.errors.map(error => error.message).join('\n'));
        if (await graphDigest(options.dataDir) !== graph_digest || (await readBranchPlan(options.dataDir)).digest !== result.digest)
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
    return withProjectLock(options.dataDir, async () => {
        if (await graphDigest(options.dataDir) !== expected.graph_digest || (await readBranchPlan(options.dataDir)).digest !== expected.plan_digest)
            throw new WorkspaceError('branch/conflict', '设计版本已改变，不能读取旧计划');
        const result = await branchPackets(options.dataDir, options.repoRoot, options.requireBilingual ?? true, execution);
        checkExecution(execution);
        if (!result.ok || !result.plan) throw new WorkspaceError('branch/not-ready',
            result.errors.map(error => `${error.code}: ${error.message}`).join('\n'));
        if (result.digest !== expected.plan_digest || result.graph_digest !== expected.graph_digest)
            throw new WorkspaceError('branch/conflict', '设计版本已改变，不能接纳旧计划');
        // 与不遵守服务锁的外部写入者也核对图版本，禁止将不同版本拼成执行输入。
        if (await graphDigest(options.dataDir) !== result.graph_digest || (await readBranchPlan(options.dataDir)).digest !== result.digest)
            throw new WorkspaceError('branch/graph-drift', '读取期间架构图改变，不能接纳设计');
        checkExecution(execution);
        return structuredClone({ plan: result.plan, packets: result.packets,
            plan_digest: result.digest, graph_digest: result.graph_digest });
    }, signal, () => gate());
}
