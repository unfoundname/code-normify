import { type NormifyToolExecution } from '../execution.js';
import type { BranchPlanningSnapshot } from '../planning.js';
/** 固定快照的纯投影：宿主落库后不再读可变的设计文件。 */
export declare function projectBranchWorkerPlan(snapshot: BranchPlanningSnapshot, leadRef: string): {
    id: string;
    items: {
        key: string;
        title: string;
        spec: string;
        requirementIds: string[];
        role: "lead";
        ref: string;
        needs: string[];
    }[];
};
/** 固定设计投影到宿主已有 WorkerPlan；不持有 Worker 身份、状态、权限或 Git 句柄。 */
export declare function exportBranchWorkerPlan(dataDir: string, repoRoot: string, requireBilingual: boolean, leadRef: string, execution?: NormifyToolExecution): Promise<{
    packets: never[];
    ok: boolean;
    errors: import("../index.js").Diagnostic[];
    graph_digest: string;
    units: never[];
    warnings: never[];
    plan: null;
    digest: string;
} | {
    packets: import("../engine/branches.js").BranchPacket[];
    digest: string;
    ok: boolean;
    errors: import("../index.js").Diagnostic[];
    warnings: import("../index.js").Diagnostic[];
    plan: import("../engine/branches.js").BranchPlan;
    graph_digest: string;
    units: import("../engine/branches.js").DerivedBranchUnit[];
} | {
    ok: boolean;
    errors: import("../index.js").Diagnostic[];
    warnings: never[];
    plan_digest?: undefined;
    graph_digest?: undefined;
    base_commit?: undefined;
    worker_plan?: undefined;
} | {
    ok: boolean;
    errors: never[];
    warnings: import("../index.js").Diagnostic[];
    plan_digest: string;
    graph_digest: string;
    base_commit: string;
    worker_plan: {
        id: string;
        items: {
            key: string;
            title: string;
            spec: string;
            requirementIds: string[];
            role: "lead";
            ref: string;
            needs: string[];
        }[];
    };
}>;
