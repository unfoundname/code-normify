import { branchPackets } from '../engine/branches.js';
import { diag } from '../engine/diag.js';
/** 固定快照的纯投影：宿主落库后不再读可变的设计文件。 */
export function projectBranchWorkerPlan(snapshot, leadRef) {
    if (!leadRef.trim())
        throw new Error('必须明确指定编排组 lead 模板引用');
    return { id: snapshot.plan.id + ':' + snapshot.plan_digest,
        items: snapshot.packets.map(packet => ({ key: packet.unit.id, title: packet.unit.title.zh,
            spec: JSON.stringify(packet, null, 2), requirementIds: [...packet.unit.requirement_ids],
            role: 'lead', ref: leadRef, needs: [...packet.unit.needs] })) };
}
/** 固定设计投影到宿主已有 WorkerPlan；不持有 Worker 身份、状态、权限或 Git 句柄。 */
export async function exportBranchWorkerPlan(dataDir, repoRoot, requireBilingual, leadRef) {
    if (!leadRef.trim())
        return { ok: false, errors: [diag('error', 'branch/template-ref', '必须明确指定编排组 lead 模板引用')], warnings: [] };
    const result = await branchPackets(dataDir, repoRoot, requireBilingual);
    if (!result.ok || !result.plan || !result.packets)
        return result;
    const workerPlan = projectBranchWorkerPlan({ plan: result.plan, packets: result.packets,
        plan_digest: result.digest, graph_digest: result.graph_digest }, leadRef);
    return { ok: true, errors: [], warnings: result.warnings, plan_digest: result.digest,
        graph_digest: result.graph_digest, base_commit: result.plan.base_commit, worker_plan: workerPlan };
}
//# sourceMappingURL=promptmanager.js.map