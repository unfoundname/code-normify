import { createHash } from 'node:crypto';
import { snapshotProject } from './edit.js';
/** 只冻结源数据，编译产物不能反过来参与自己的输入摘要。 */
export const SOURCE_ROOTS = ['modules', 'renders', 'policy.yml', 'changes'];
export const BUILD_ARTIFACTS = ['tree.json', 'outline.md', 'api-index.json', 'receipt.json', 'normify.html'];
export async function graphDigest(dataDir) {
    const snapshot = await snapshotProject(dataDir, SOURCE_ROOTS);
    const hash = createHash('sha256');
    for (const [path, bytes] of [...snapshot.files].sort(([a], [b]) => a.localeCompare(b))) {
        hash.update(path);
        hash.update('\0');
        hash.update(bytes);
        hash.update('\0');
    }
    return hash.digest('hex');
}
//# sourceMappingURL=manifest.js.map