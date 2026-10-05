import { type NormifyExecutionPhase } from './execution.js';
import { type BranchGitReader, type BranchPacket, type BranchPlan } from './engine/branches.js';
import { type PromptManagerOptions } from './service.js';
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
export declare function readBranchPlanningHead(options: PromptManagerOptions, signal?: AbortSignal, check?: (phase: NormifyExecutionPhase) => void): Promise<BranchPlanningHead>;
/** 接纳执行前的原子设计读取。身份/目录/Git 能力由宿主提供，不来自模型参数。 */
export declare function readBranchPlanningSnapshot(options: PromptManagerOptions, expected: {
    plan_digest: string;
    graph_digest: string;
}, readGit: BranchGitReader, signal?: AbortSignal, check?: (phase: NormifyExecutionPhase) => void): Promise<BranchPlanningSnapshot>;
