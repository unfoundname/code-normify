/** 只冻结源数据，编译产物不能反过来参与自己的输入摘要。 */
export declare const SOURCE_ROOTS: string[];
export declare const BUILD_ARTIFACTS: string[];
export declare function graphDigest(dataDir: string): Promise<string>;
