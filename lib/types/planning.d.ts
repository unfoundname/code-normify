import { type BranchGitReader, type BranchPacket, type BranchPlan } from './engine/branches.js';
import { type PromptManagerOptions } from './service.js';
export interface BranchPlanningSnapshot {
    plan: BranchPlan;
    packets: BranchPacket[];
    plan_digest: string;
    graph_digest: string;
}
/** 接纳执行前的原子设计读取。身份/目录/Git 能力由宿主提供，不来自模型参数。 */
export declare function readBranchPlanningSnapshot(options: PromptManagerOptions, expected: {
    plan_digest: string;
    graph_digest: string;
}, readGit: BranchGitReader, signal?: AbortSignal): Promise<BranchPlanningSnapshot>;
