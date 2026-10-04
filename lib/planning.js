import { branchPackets, readBranchPlan } from './engine/branches.js';
import { graphDigest } from './engine/manifest.js';
import { createPromptManagerTools } from './service.js';
import { withProjectLock, WorkspaceError } from './workspace.js';
/** 接纳执行前的原子设计读取。身份/目录/Git 能力由宿主提供，不来自模型参数。 */
export async function readBranchPlanningSnapshot(options, expected, readGit, signal) {
    signal?.throwIfAborted();
    if (typeof readGit !== 'function')
        throw new WorkspaceError('branch/git-reader-required', '宿主必须提供固定的只读 Git 端口');
    // 复用受管服务的目录/项目绑定校验；不执行工具，不增发写权限。
    await createPromptManagerTools({ ...options, access: 'read' });
    return withProjectLock(options.dataDir, async () => {
        if (await graphDigest(options.dataDir) !== expected.graph_digest || (await readBranchPlan(options.dataDir)).digest !== expected.plan_digest)
            throw new WorkspaceError('branch/conflict', '设计版本已改变，不能读取旧计划');
        const result = await branchPackets(options.dataDir, options.repoRoot, options.requireBilingual ?? true, readGit);
        if (!result.ok || !result.plan)
            throw new WorkspaceError('branch/not-ready', result.errors.map(error => `${error.code}: ${error.message}`).join('\n'));
        if (result.digest !== expected.plan_digest || result.graph_digest !== expected.graph_digest)
            throw new WorkspaceError('branch/conflict', '设计版本已改变，不能接纳旧计划');
        // 与不遵守服务锁的外部写入者也核对图版本，禁止将不同版本拼成执行输入。
        if (await graphDigest(options.dataDir) !== result.graph_digest || (await readBranchPlan(options.dataDir)).digest !== result.digest)
            throw new WorkspaceError('branch/graph-drift', '读取期间架构图改变，不能接纳设计');
        return structuredClone({ plan: result.plan, packets: result.packets,
            plan_digest: result.digest, graph_digest: result.graph_digest });
    }, signal);
}
//# sourceMappingURL=planning.js.map