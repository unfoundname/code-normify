import { lstat, mkdir, open, readFile, realpath, readdir, rm } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

/** 配置根由宿主绑定；路径语法与真实文件边界使用同一规则。 */
export class WorkspaceError extends Error {
    constructor(public code: string, message: string) { super(message); this.name = 'WorkspaceError'; }
}

export function relativePath(value: string): string {
    if (!value || isAbsolute(value) || /[\\:\x00-\x1f]/.test(value) || value.split('/').some(part => part === '' || part === '.' || part === '..'))
        throw new WorkspaceError('workspace/path-invalid', '必须使用无盘符、反斜杠或 .. 的工作区相对路径：' + value);
    return value;
}

export async function canonicalPath(path: string): Promise<string> {
    try { return await realpath(path); }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        const parent = dirname(path);
        if (parent === path) throw error;
        return join(await canonicalPath(parent), relative(parent, path));
    }
}

export async function boundPath(root: string, path: string): Promise<string> {
    relativePath(path);
    const absolute = resolve(root, path);
    const canonicalRoot = await canonicalPath(resolve(root));
    const target = await canonicalPath(absolute);
    const rel = relative(canonicalRoot, target);
    if (isAbsolute(rel) || rel === '..' || rel.startsWith('..' + sep))
        throw new WorkspaceError('workspace/path-outside', '路径越过宿主绑定的工作区：' + path);
    return absolute;
}

/** 结构源数据不接受链接；目录扫描只在绑定的数据目录内进行。 */
export async function assertDataDirectory(path: string): Promise<void> {
    let stat;
    try { stat = await lstat(path); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
    if (stat.isSymbolicLink()) throw new WorkspaceError('workspace/data-link', '结构数据不能包含符号链接或目录联接：' + path);
    if (!stat.isDirectory()) return;
    for (const entry of await readdir(path, { withFileTypes: true })) {
        const child = join(path, entry.name);
        if (entry.isSymbolicLink()) throw new WorkspaceError('workspace/data-link', '结构数据不能包含符号链接或目录联接：' + child);
        if (entry.isDirectory()) await assertDataDirectory(child);
    }
}

/** 多个受管 MCP 进程共享同一个文件锁，时间经过不代表所有权已经释放。 */
export async function withProjectLock<T>(dataDir: string, operation: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    signal?.throwIfAborted();
    const lockDir = join(dirname(dataDir), '.' + dataDir.split(/[\\/]/).pop() + '.lock');
    const token = randomUUID();
    const deadline = Date.now() + 60_000;
    await mkdir(dirname(dataDir), { recursive: true });
    for (;;) {
        signal?.throwIfAborted();
        try { await mkdir(lockDir); break; }
        catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
            let owner: { pid: number; token: string };
            try { owner = JSON.parse(await readFile(join(lockDir, 'owner.json'), 'utf8')); }
            catch (readError) {
                if ((readError as NodeJS.ErrnoException).code !== 'ENOENT') throw new WorkspaceError('workspace/lock-invalid', '项目锁所有权记录损坏，不能强行接管');
                if (Date.now() >= deadline) throw new WorkspaceError('workspace/lock-timeout', '项目锁初始化未确认，不能强行接管');
                await delay(50, undefined, { signal }); continue;
            }
            if (!Number.isSafeInteger(owner.pid) || owner.pid < 1 || typeof owner.token !== 'string')
                throw new WorkspaceError('workspace/lock-invalid', '项目锁缺少有效的进程所有者');
            try { process.kill(owner.pid, 0); }
            catch (probeError) {
                if ((probeError as NodeJS.ErrnoException).code === 'ESRCH')
                    throw new WorkspaceError('workspace/interrupted-operation', '上次工具进程已退出，项目锁保留了中断证据；请宿主核对数据并移除 ' + lockDir);
                if ((probeError as NodeJS.ErrnoException).code !== 'EPERM') throw probeError;
            }
            if (Date.now() >= deadline) throw new WorkspaceError('workspace/lock-timeout', '项目正在被其他工具调用使用，等待锁超时');
            await delay(50, undefined, { signal });
        }
    }
    try {
        const ownerFile = await open(join(lockDir, 'owner.json'), 'wx');
        try { await ownerFile.writeFile(JSON.stringify({ pid: process.pid, token }), 'utf8'); }
        finally { await ownerFile.close(); }
        signal?.throwIfAborted();
        return await operation();
    } finally {
        const owner = JSON.parse(await readFile(join(lockDir, 'owner.json'), 'utf8')) as { token: string };
        if (owner.token !== token) throw new WorkspaceError('workspace/lock-owner', '项目锁所有者变更，不能释放其他调用的锁');
        await rm(lockDir, { recursive: true });
    }
}
