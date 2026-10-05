/** 宿主无关的架构工具库；Electron、MCP 等适配层使用同一工具契约。 */
export { createNormifyTools, defineNormifyTool, registerTools } from './tools.js';
export type { NormifyTool, NormifyToolRegistration, NormifyToolResult, ObjectSchema, SchemaNode, ToolBehavior, ToolEnv } from './tools.js';
export * from './engine/types.js';
export { NormifyError, resolveProject, loadAllModules } from './engine/store.js';
export { validateProject } from './engine/validate.js';
export { buildProject } from './engine/compile.js';
export { renderProject } from './engine/render.js';
export { createPromptManagerTools } from './service.js';
export type { PromptManagerOptions } from './service.js';
export type { ArchitectureGraph } from './engine/graph.js';
export { BRANCH_PLAN_SCHEMA, readBranchPlan, validateBranchPlan, putBranchPlan, deleteBranchPlan, suggestBranchPlan, branchPacket, branchPackets } from './engine/branches.js';
export type { BranchPlan, BranchUnit, BranchPacket, BranchSuggestionInput } from './engine/branches.js';
export { exportBranchWorkerPlan, projectBranchWorkerPlan } from './adapters/promptmanager.js';
export { readBranchPlanningSnapshot, readBranchPlanningHead } from './planning.js';
export type { BranchPlanningSnapshot, BranchPlanningHead } from './planning.js';
export type { BranchGitReader } from './engine/branches.js';
export type { NormifyToolExecution, NormifyExecutionPhase } from './execution.js';
