import type { NormifyTool } from './tools.js';
export interface PromptManagerOptions {
    repoRoot: string;
    dataDir: string;
    access: 'read' | 'write';
    execution: 'host' | 'standalone';
    requireBilingual?: boolean;
}
/** 一个服务实例绑定一个项目，模型参数不拥有改写绑定身份的能力。 */
export declare function createPromptManagerTools(options: PromptManagerOptions): Promise<NormifyTool[]>;
