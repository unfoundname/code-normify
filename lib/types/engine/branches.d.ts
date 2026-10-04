import type { Diagnostic, LocalizedText, Module } from './types.js';
export declare const BRANCH_PLAN_FILE = "branch-plan.json";
export interface BranchExternalDependency {
    module: string;
    mode: 'baseline' | 'contract' | 'after' | 'unresolved';
    fixture_paths: string[];
}
export interface BranchVerification {
    commands: {
        id: string;
        argv: string[];
        cwd: string;
    }[];
    cases: {
        id: string;
        description: string;
        requirement_ids: string[];
        command_ids: string[];
    }[];
    resources: {
        id: string;
        kind: 'database' | 'port' | 'filesystem' | 'service';
        description: string;
        isolation: 'unit';
    }[];
}
export interface BranchUnit {
    id: string;
    title: LocalizedText;
    modules: string[];
    requirement_ids: string[];
    /** 实施先后条件；不得从软件调用箭头自动生成。 */
    needs: string[];
    external_dependencies: BranchExternalDependency[];
    verification: BranchVerification;
}
/** 静态交付契约；Git 分支、Worker 身份、授权与执行证据由宿主持有。 */
export interface BranchPlan {
    schema_version: 1;
    id: string;
    title: LocalizedText;
    graph_digest: string;
    base_commit: string;
    scope: string[];
    requirement_ids: string[];
    together: string[][];
    units: BranchUnit[];
}
export interface BranchSuggestionInput {
    id: string;
    title: LocalizedText;
    base_commit: string;
    scope: string[];
    requirement_ids: string[];
    together: string[][];
}
export interface DerivedBranchUnit {
    id: string;
    modules: string[];
    write_paths: string[];
    external_modules: string[];
    prerequisite_units: string[];
}
export interface BranchPacket {
    unit: BranchUnit;
    base_commit: string;
    graph_digest: string;
    plan_digest: string;
    modules: Module[];
    context: {
        id: string;
        body: string;
    }[];
    dependencies: Module[];
    write_paths: string[];
    acceptance: string[];
}
/** 空验收和 unresolved 在候选中仍使用同一形态；语义校验阻断保存与交接。 */
export declare const BRANCH_PLAN_SCHEMA: {
    $schema: string;
    type: string;
    additionalProperties: boolean;
    required: string[];
    properties: {
        schema_version: {
            const: number;
        };
        graph_digest: {
            type: string;
            pattern: string;
        };
        units: {
            type: string;
            minItems: number;
            items: {
                type: string;
                additionalProperties: boolean;
                required: string[];
                properties: {
                    id: {
                        type: string;
                        pattern: string;
                    };
                    title: {
                        type: string;
                        additionalProperties: boolean;
                        required: string[];
                        properties: {
                            zh: {
                                type: string;
                                minLength: number;
                                pattern: string;
                            };
                            en: {
                                type: string;
                                minLength: number;
                                pattern: string;
                            };
                        };
                    };
                    modules: {
                        minItems: number;
                        type: string;
                        items: {
                            type: string;
                            maxLength: number;
                            pattern: string;
                        };
                        uniqueItems: boolean;
                    };
                    requirement_ids: {
                        type: string;
                        items: {
                            type: string;
                            minLength: number;
                            pattern: string;
                        };
                        uniqueItems: boolean;
                    };
                    needs: {
                        type: string;
                        items: {
                            type: string;
                            pattern: string;
                        };
                        uniqueItems: boolean;
                    };
                    external_dependencies: {
                        type: string;
                        items: {
                            type: string;
                            additionalProperties: boolean;
                            required: string[];
                            properties: {
                                module: {
                                    type: string;
                                    maxLength: number;
                                    pattern: string;
                                };
                                mode: {
                                    enum: string[];
                                };
                                fixture_paths: {
                                    type: string;
                                    items: {
                                        type: string;
                                        minLength: number;
                                        pattern: string;
                                    };
                                    uniqueItems: boolean;
                                };
                            };
                        };
                    };
                    verification: {
                        type: string;
                        additionalProperties: boolean;
                        required: string[];
                        properties: {
                            commands: {
                                type: string;
                                items: {
                                    type: string;
                                    additionalProperties: boolean;
                                    required: string[];
                                    properties: {
                                        id: {
                                            type: string;
                                            pattern: string;
                                        };
                                        cwd: {
                                            type: string;
                                            minLength: number;
                                            pattern: string;
                                        };
                                        argv: {
                                            type: string;
                                            minItems: number;
                                            prefixItems: {
                                                type: string;
                                                minLength: number;
                                                pattern: string;
                                            }[];
                                            items: {
                                                type: string;
                                                pattern: string;
                                            };
                                        };
                                    };
                                };
                            };
                            cases: {
                                type: string;
                                items: {
                                    type: string;
                                    additionalProperties: boolean;
                                    required: string[];
                                    properties: {
                                        id: {
                                            type: string;
                                            pattern: string;
                                        };
                                        description: {
                                            type: string;
                                            minLength: number;
                                            pattern: string;
                                        };
                                        requirement_ids: {
                                            type: string;
                                            items: {
                                                type: string;
                                                minLength: number;
                                                pattern: string;
                                            };
                                            uniqueItems: boolean;
                                        };
                                        command_ids: {
                                            minItems: number;
                                            type: string;
                                            items: {
                                                type: string;
                                                pattern: string;
                                            };
                                            uniqueItems: boolean;
                                        };
                                    };
                                };
                            };
                            resources: {
                                type: string;
                                items: {
                                    type: string;
                                    additionalProperties: boolean;
                                    required: string[];
                                    properties: {
                                        id: {
                                            type: string;
                                            pattern: string;
                                        };
                                        kind: {
                                            enum: string[];
                                        };
                                        description: {
                                            type: string;
                                            minLength: number;
                                            pattern: string;
                                        };
                                        isolation: {
                                            const: string;
                                        };
                                    };
                                };
                            };
                        };
                    };
                };
            };
        };
        id: {
            type: string;
            pattern: string;
        };
        title: {
            type: string;
            additionalProperties: boolean;
            required: string[];
            properties: {
                zh: {
                    type: string;
                    minLength: number;
                    pattern: string;
                };
                en: {
                    type: string;
                    minLength: number;
                    pattern: string;
                };
            };
        };
        base_commit: {
            type: string;
            pattern: string;
        };
        scope: {
            minItems: number;
            type: string;
            items: {
                type: string;
                maxLength: number;
                pattern: string;
            };
            uniqueItems: boolean;
        };
        requirement_ids: {
            minItems: number;
            type: string;
            items: {
                type: string;
                minLength: number;
                pattern: string;
            };
            uniqueItems: boolean;
        };
        together: {
            type: string;
            items: {
                minItems: number;
                type: string;
                items: {
                    type: string;
                    maxLength: number;
                    pattern: string;
                };
                uniqueItems: boolean;
            };
        };
    };
};
/** 宿主固定的只读 Git 边界；库不取得提交、分支或执行权限。 */
export type BranchGitReader = (repoRoot: string, args: readonly string[]) => Promise<string>;
export declare function readBranchPlan(dataDir: string): Promise<{
    ok: boolean;
    errors: Diagnostic[];
    warnings: never[];
    plan: null;
    digest: string;
} | {
    ok: boolean;
    errors: never[];
    warnings: never[];
    plan: BranchPlan;
    digest: string;
}>;
export declare function validateBranchPlan(dataDir: string, raw: unknown, repoRoot: string, requireBilingual: boolean): Promise<{
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    plan: BranchPlan;
    graph_digest: string;
    units: DerivedBranchUnit[];
} | {
    ok: boolean;
    errors: Diagnostic[];
    warnings: never[];
    plan: null;
    graph_digest: string;
    units: never[];
}>;
export declare function putBranchPlan(dataDir: string, raw: unknown, repoRoot: string, requireBilingual: boolean, expected: string): Promise<{
    ok: boolean;
    errors: Diagnostic[];
    warnings: never[];
    digest: string;
    plan: null;
    graph_digest: string;
    units: never[];
} | {
    digest: string;
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    plan: BranchPlan;
    graph_digest: string;
    units: DerivedBranchUnit[];
}>;
export declare function deleteBranchPlan(dataDir: string, expected: string): Promise<{
    ok: boolean;
    errors: Diagnostic[];
    warnings: never[];
    digest: string;
    deleted: boolean;
}>;
/** 基于真实共享文件及 together 的连通分量；不猜业务验收和依赖实现顺序。 */
export declare function suggestBranchPlan(dataDir: string, input: unknown, repoRoot: string, requireBilingual: boolean): Promise<{
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    plan: null;
    graph_digest: string;
    units: never[];
} | {
    ok: boolean;
    errors: Diagnostic[];
    ready: boolean;
    readiness: {
        ok: boolean;
        errors: Diagnostic[];
    };
    warnings: Diagnostic[];
    plan: BranchPlan;
    graph_digest: string;
    units: DerivedBranchUnit[];
}>;
export declare function branchPacket(dataDir: string, unitId: string, repoRoot: string, requireBilingual: boolean): Promise<{
    packet: null;
    ok: boolean;
    errors: Diagnostic[];
    graph_digest: string;
    units: never[];
    warnings: never[];
    plan: null;
    digest: string;
} | {
    packet: null;
    digest: string;
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    plan: BranchPlan;
    graph_digest: string;
    units: DerivedBranchUnit[];
} | {
    packet: BranchPacket;
    digest: string;
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    plan: BranchPlan;
    graph_digest: string;
    units: DerivedBranchUnit[];
}>;
export declare function branchPackets(dataDir: string, repoRoot: string, requireBilingual: boolean, readGit?: BranchGitReader): Promise<{
    packets: never[];
    ok: boolean;
    errors: Diagnostic[];
    graph_digest: string;
    units: never[];
    warnings: never[];
    plan: null;
    digest: string;
} | {
    packets: BranchPacket[];
    digest: string;
    ok: boolean;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    plan: BranchPlan;
    graph_digest: string;
    units: DerivedBranchUnit[];
}>;
