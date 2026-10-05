/** 配置根由宿主绑定；路径语法与真实文件边界使用同一规则。 */
export declare class WorkspaceError extends Error {
    code: string;
    constructor(code: string, message: string);
}
export declare function canonicalPath(path: string): Promise<string>;
export declare function boundPath(root: string, path: string): Promise<string>;
/** 结构源数据不接受链接；目录扫描只在绑定的数据目录内进行。 */
export declare function assertDataDirectory(path: string): Promise<void>;
/** 多个受管 MCP 进程共享同一个文件锁，时间经过不代表所有权已经释放。 */
export declare function withProjectLock<T>(dataDir: string, operation: () => Promise<T>, signal?: AbortSignal, check?: () => void): Promise<T>;
