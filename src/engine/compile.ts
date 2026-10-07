import { join } from 'node:path';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { apiKey, depthOf, treeOf } from './ids.js';
import { sha256Text } from './store.js';
import type { Api, DataType, Dep, Diagnostic, LayoutData, LocalizedText, ModuleState, SourceRef } from './types.js';
import { validateProject, type ValidateOptions, type ValidateOutput } from './validate.js';
import { diag } from './diag.js';
import { graphDigest } from './manifest.js';
import { typeRefUri } from './contracts.js';
export interface BuildOptions extends ValidateOptions {
}
export interface BuildOutput {
    ok: boolean;
    receipt: Record<string, unknown> | null;
    errors: Diagnostic[];
    warnings: Diagnostic[];
    validate: ValidateOutput | null;
}
/** tree.json 里的单个模块摘要（编译期归一化后的结构数据）。 */
interface ModuleSummary {
    uid: string;
    id: string;
    parent: string | null;
    tree: string;
    depth: number;
    state?: ModuleState;
    replacement?: string;
    tags?: string[];
    name: LocalizedText;
    description: LocalizedText;
    source: SourceRef[];
    revision: string;
    updated_at: string;
    fingerprint: string;
    repository?: string;
    apis?: Array<Api & { key: string }>;
    types?: DataType[];
    deps?: Array<Dep & { cross_tree: boolean }>;
    aggregate: {
        descendant_count: number;
        own_api_count: number;
        inherited_api_count: number;
        dep_out: number;
        dep_in: number;
    };
}
/** tree.json 里的单条依赖边（带跨树标记）。 */
interface TreeEdge {
    from: string;
    from_api: string | undefined;
    to: string;
    to_api: string | undefined;
    kind: string;
    cross_tree: boolean;
    label: LocalizedText | undefined;
}
function oneLine(desc: string, max = 100): string {
    const line = desc.split(/\r?\n/)[0]?.trim() ?? '';
    return line.length > max ? line.slice(0, max) + '…' : line;
}
function outlineText(slug: string, v: ValidateOutput): string {
    const files = [...v.files].sort((a, b) => a.module.id.localeCompare(b.module.id));
    const byId = new Map(files.map(f => [f.module.id, f.module]));
    const roots = files.filter(f => f.module.parent === null).sort((a, b) => a.module.id.localeCompare(b.module.id));
    const descendantMemo = new Map<string, number>();
    const countDesc = (id: string): number => {
        const hit = descendantMemo.get(id);
        if (hit !== undefined)
            return hit;
        const kids = v.childrenOf.get(id) ?? [];
        let total = kids.length;
        for (const k of kids)
            total += countDesc(k);
        descendantMemo.set(id, total);
        return total;
    };
    const apiCount = (id: string): number => {
        const kids = v.childrenOf.get(id) ?? [];
        let total = 0;
        for (const k of kids) {
            const m = byId.get(k);
            total += (m !== undefined && m.apis !== undefined ? m.apis.length : 0) + apiCount(k);
        }
        return total;
    };
    const lines: string[] = [];
    lines.push('# ' + slug + ' · Normify Outline');
    lines.push('');
    lines.push('> 派生索引（每次 normify_build 重建）。AI 导航入口：先广度后深度。');
    lines.push('');
    const walk = (id: string, indent: number): void => {
        const m = byId.get(id);
        if (m === undefined)
            return;
        const modules = countDesc(id) + 1;
        const apis = (m.apis?.length ?? 0) + apiCount(id);
        lines.push('  '.repeat(indent) + '- ' + id
            + (m.state === 'planned' ? ' [计划]' : m.state === 'deprecated' ? ' [废弃]' : '')
            + ' — ' + m.name.zh + ' / ' + m.name.en
            + ' — ' + oneLine(m.description.zh, 80)
            + ' — [模块 ' + modules + ' · API ' + apis + ']');
        for (const k of v.childrenOf.get(id) ?? [])
            walk(k, indent + 1);
    };
    for (const r of roots) {
        const m = r.module;
        lines.push('## ' + m.id + (m.repository !== undefined ? '（' + m.repository + '）' : ''));
        lines.push('');
        walk(m.id, 0);
        lines.push('');
    }
    return lines.join('\n') + '\n';
}
/**
 * 产物发布：先把四份产物各自写进同目录的临时文件，全部成功后再逐个 rename 就位。
 * 任一 rename 失败（目标被目录顶住、权限、并发删除等）时，把已经就位的那些还原回调用前的字节，
 * 并清掉剩余临时文件——保证「build 失败 ⇒ 磁盘上的产物集与调用前逐字节一致」（SPEC §4.3 fail-closed）。
 * 临时文件与目标同目录，rename 才是同卷原子操作。
 */
async function publishArtifacts(projectDir: string, pending: { name: string; text: string }[]): Promise<void> {
    const stamp = randomUUID();
    const staged: { name: string; tmp: string; target: string; before: Buffer | null }[] = [];
    try {
        for (const item of pending) {
            const target = join(projectDir, item.name);
            const tmp = join(projectDir, '.' + item.name + '.' + stamp + '.tmp');
            await writeFile(tmp, item.text, 'utf8');
            staged.push({ name: item.name, tmp, target, before: await readArtifact(target) });
        }
    }
    catch (error) {
        for (const item of staged)
            await rm(item.tmp, { force: true });
        throw error;
    }
    const published: typeof staged = [];
    try {
        for (const item of staged) {
            await rename(item.tmp, item.target);
            published.push(item);
        }
    }
    catch (error) {
        for (const item of published) {
            if (item.before === null)
                await rm(item.target, { force: true });
            else
                await writeFile(item.target, item.before);
        }
        for (const item of staged.slice(published.length))
            await rm(item.tmp, { force: true });
        throw error;
    }
}
/** 读现有产物字节；不存在返回 null（其余错误照旧抛出，避免把权限问题当成「之前没有」）。 */
async function readArtifact(path: string): Promise<Buffer | null> {
    try {
        return await readFile(path);
    }
    catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT')
            return null;
        throw error;
    }
}
/** L3：校验通过后编译 tree.json / outline.md / api-index.json / receipt.json（冻结）。 */
export async function buildProject(projectDir: string, opts: BuildOptions): Promise<BuildOutput> {
    const v = await validateProject(projectDir, opts);
    if (!v.ok) {
        return { ok: false, receipt: null, errors: v.errors, warnings: v.warnings, validate: v };
    }
    const slug = projectDir.split(/[\\\/]/).pop() ?? 'project';
    const files = [...v.files].sort((a, b) => a.module.id.localeCompare(b.module.id));
    const byId = new Map(files.map(f => [f.module.id, f.module]));
    const roots = files.filter(f => f.module.parent === null).sort((a, b) => a.module.id.localeCompare(b.module.id));
    const descendantMemo = new Map<string, number>();
    const countDesc = (id: string): number => {
        const hit = descendantMemo.get(id);
        if (hit !== undefined)
            return hit;
        const kids = v.childrenOf.get(id) ?? [];
        let total = kids.length;
        for (const k of kids)
            total += countDesc(k);
        descendantMemo.set(id, total);
        return total;
    };
    const apiBelow = (id: string): number => {
        let total = 0;
        for (const k of v.childrenOf.get(id) ?? []) {
            const m = byId.get(k);
            total += (m !== undefined && m.apis !== undefined ? m.apis.length : 0) + apiBelow(k);
        }
        return total;
    };
    const depIn = new Map<string, number>();
    let depCount = 0;
    let crossTreeDepCount = 0;
    const edges: TreeEdge[] = [];
    for (const f of files) {
        const m = f.module;
        if (m.deps === undefined)
            continue;
        for (const d of m.deps) {
            depCount++;
            depIn.set(d.to, (depIn.get(d.to) ?? 0) + 1);
            const cross = treeOf(d.to) !== treeOf(m.id);
            if (cross)
                crossTreeDepCount++;
            edges.push({
                from: m.id,
                from_api: d.from_api,
                to: d.to,
                to_api: d.to_api,
                kind: d.kind,
                cross_tree: cross,
                label: d.label,
            });
        }
    }
    edges.sort((a, b) => String(a.from).localeCompare(String(b.from)) || String(a.to).localeCompare(String(b.to)));
    const modules: Record<string, ModuleSummary> = {};
    let apiCount = 0;
    let typeCount = 0;
    let leafCount = 0;
    let maxDepth = 0;
    let plannedCount = 0;
    let deprecatedCount = 0;
    for (const f of files) {
        const m = f.module;
        const ownApis = m.apis ?? [];
        apiCount += ownApis.length;
        typeCount += m.types?.length ?? 0;
        const isLeaf = m.parent !== null && !v.childrenOf.has(m.id);
        if (isLeaf)
            leafCount++;
        maxDepth = Math.max(maxDepth, depthOf(m.id));
        if (m.state === 'planned')
            plannedCount++;
        if (m.state === 'deprecated')
            deprecatedCount++;
        modules[m.id] = {
            uid: m.uid,
            id: m.id,
            parent: m.parent,
            tree: treeOf(m.id),
            depth: depthOf(m.id),
            ...(m.state !== undefined ? { state: m.state } : {}),
            ...(m.replacement !== undefined ? { replacement: m.replacement } : {}),
            ...(m.tags !== undefined ? { tags: m.tags } : {}),
            name: m.name,
            description: m.description,
            source: m.source,
            revision: m.revision,
            updated_at: m.updated_at,
            fingerprint: m.fingerprint,
            ...(m.repository !== undefined ? { repository: m.repository } : {}),
            ...(ownApis.length > 0 ? { apis: ownApis.map(a => ({ ...a, key: apiKey(a) })) } : {}),
            ...(m.types !== undefined ? { types: m.types } : {}),
            ...(m.deps !== undefined && m.deps.length > 0 ? { deps: m.deps.map(d => ({ ...d, cross_tree: treeOf(d.to) !== treeOf(m.id) })) } : {}),
            aggregate: {
                descendant_count: countDesc(m.id),
                own_api_count: ownApis.length,
                inherited_api_count: apiBelow(m.id),
                dep_out: m.deps?.length ?? 0,
                dep_in: depIn.get(m.id) ?? 0,
            },
        };
    }
    const apiIndex: Record<string, string> = {};
    const apiContracts: Record<string, Api & { module: string }> = {};
    const typeContracts: Record<string, DataType & { module: string }> = {};
    for (const f of files) {
        const m = f.module;
        for (const a of m.apis ?? []) {
            apiIndex[apiKey(a)] = m.id;
            apiContracts[apiKey(a)] = { module: m.id, ...a };
        }
        for (const type of m.types ?? [])
            typeContracts[typeRefUri({ module: m.id, name: type.name })] = { module: m.id, ...type };
    }
    const compiledAt = new Date().toISOString();
    const sourceDigest = await graphDigest(projectDir);
    const layouts: Record<string, LayoutData | undefined> = {};
    for (const id of [...v.layouts.keys()].sort())
        layouts[id] = v.layouts.get(id);
    const treeJson = {
        schema_version: 1,
        project: {
            name: slug,
            trees: roots.map(r => ({
                tree_id: r.module.id,
                root_uid: r.module.uid,
                ...(r.module.repository !== undefined ? { repository: r.module.repository } : {}),
            })),
            compiled_at: compiledAt,
            source_digest: sourceDigest,
            stats: {
                tree_count: roots.length,
                module_count: files.length,
                leaf_count: leafCount,
                api_count: apiCount,
                type_count: typeCount,
                dep_count: depCount,
                cross_tree_dep_count: crossTreeDepCount,
                max_depth: maxDepth,
                layout_count: v.layouts.size,
                planned_count: plannedCount,
                deprecated_count: deprecatedCount,
                policy_rule_count: v.policy === null ? 0 : v.policy.rules.length,
                change_count: v.changes.length,
                open_change_count: v.changes.filter(c => c.status === 'proposed' || c.status === 'in_progress').length,
            },
        },
        modules,
        api_index: Object.fromEntries(Object.entries(apiIndex).sort(([a], [b]) => a.localeCompare(b))),
        edges,
        layouts,
        policy: v.policy,
        changes: v.changes.map(c => ({ id: c.id, status: c.status, title: c.title, updated_at: c.updated_at })),
    };
    try {
        const treeText = JSON.stringify(treeJson, null, 2) + '\n';
        const outline = outlineText(slug, v);
        const apiIndexText = JSON.stringify({
            schema_version: 2,
            apis: Object.fromEntries(Object.entries(apiContracts).sort(([a], [b]) => a.localeCompare(b))),
            types: Object.fromEntries(Object.entries(typeContracts).sort(([a], [b]) => a.localeCompare(b))),
        }, null, 2) + '\n';
        const warningSummary: Record<string, number> = {};
        for (const w of v.warnings)
            warningSummary[w.code] = (warningSummary[w.code] ?? 0) + 1;
        const artifacts: Record<string, { sha256: string; bytes: number }> = {
            'tree.json': { sha256: sha256Text(treeText), bytes: Buffer.byteLength(treeText, 'utf8') },
            'outline.md': { sha256: sha256Text(outline), bytes: Buffer.byteLength(outline, 'utf8') },
            'api-index.json': { sha256: sha256Text(apiIndexText), bytes: Buffer.byteLength(apiIndexText, 'utf8') },
        };
        const receipt = {
            schema_version: 1,
            ok: true,
            project: slug,
            compiled_at: compiledAt,
            source_digest: sourceDigest,
            stats: treeJson.project && typeof treeJson.project === 'object'
                ? treeJson.project.stats
                : {},
            warnings: warningSummary,
            artifacts,
        };
        const receiptText = JSON.stringify(receipt, null, 2) + '\n';
        // SPEC §4.3「存在 error 时 MUST NOT 产出任何产物（fail-closed），旧产物保持原样」：
        // 逐个直写会让中途失败留下「新 tree.json + 旧 receipt.json」这种撕裂产物集，
        // 而 build 已经返回 ok:false（= error）。所以先全部落临时文件，再逐个 rename 发布；
        // 发布途中仍有失败就把已发布的还原回旧字节，最终失败时四份产物与调用前逐字节一致。
        const pending: { name: string; text: string }[] = [
            { name: 'tree.json', text: treeText },
            { name: 'outline.md', text: outline },
            { name: 'api-index.json', text: apiIndexText },
            { name: 'receipt.json', text: receiptText },
        ];
        await publishArtifacts(projectDir, pending);
        return { ok: true, receipt, errors: [], warnings: v.warnings, validate: v };
    }
    catch (error) {
        return {
            ok: false,
            receipt: null,
            errors: [diag('error', 'build/write-failed', '编译产物写入失败：' + String(error), {}, {}, [])],
            warnings: v.warnings,
            validate: v,
        };
    }
}
