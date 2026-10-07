import { join } from 'node:path';
import { lstat, rename, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { apiKey, depthOf, treeOf } from './ids.js';
import { sha256Text } from './store.js';
import { validateProject } from './validate.js';
import { diag } from './diag.js';
import { graphDigest } from './manifest.js';
import { typeRefUri } from './contracts.js';
function oneLine(desc, max = 100) {
    const line = desc.split(/\r?\n/)[0]?.trim() ?? '';
    return line.length > max ? line.slice(0, max) + '…' : line;
}
function outlineText(slug, v) {
    const files = [...v.files].sort((a, b) => a.module.id.localeCompare(b.module.id));
    const byId = new Map(files.map(f => [f.module.id, f.module]));
    const roots = files.filter(f => f.module.parent === null).sort((a, b) => a.module.id.localeCompare(b.module.id));
    const descendantMemo = new Map();
    const countDesc = (id) => {
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
    const apiCount = (id) => {
        const kids = v.childrenOf.get(id) ?? [];
        let total = 0;
        for (const k of kids) {
            const m = byId.get(k);
            total += (m !== undefined && m.apis !== undefined ? m.apis.length : 0) + apiCount(k);
        }
        return total;
    };
    const lines = [];
    lines.push('# ' + slug + ' · Normify Outline');
    lines.push('');
    lines.push('> 派生索引（每次 normify_build 重建）。AI 导航入口：先广度后深度。');
    lines.push('');
    const walk = (id, indent) => {
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
 * 产物发布：先把四份产物各自写进同目录的临时文件，全部成功后再逐个「旧产物挪到 .bak、临时文件 rename 就位」。
 * 任一步失败（目标被同名目录顶住、权限、并发删除等）就把已经动过的目标还原：新字节删掉、.bak 挪回来，
 * 并清掉临时文件——保证「build 失败 ⇒ 磁盘上的产物集与调用前逐字节一致」（SPEC §4.3 fail-closed）。
 * 临时文件与 .bak 都和目标同目录，rename 才是同卷原子操作。
 *
 * 这里刻意不写 `Promise<void>` / `Buffer` 这类全局类型标注：符号级引用图在 `noLib` 下解析不到它们，
 * 每加一处就多一条「未解析」边，会被 check:impact 的棘轮判成新引入的破坏（见该门禁的 v1 口径）。
 */
async function publishArtifacts(projectDir, pending) {
    const stamp = randomUUID();
    const staged = [];
    for (const item of pending) {
        const tmp = join(projectDir, '.' + item.name + '.' + stamp + '.tmp');
        await writeFile(tmp, item.text, 'utf8');
        staged.push({ name: item.name, tmp, target: join(projectDir, item.name) });
    }
    const published = [];
    try {
        for (const item of staged) {
            if (await blockedByDirectory(item.target))
                throw new Error('编译产物目标被同名目录顶住：' + item.name);
            await shelve(item.target, stamp);
            await rename(item.tmp, item.target);
            published.push(item);
        }
    }
    catch (error) {
        for (const item of staged)
            await unshelve(item.target, stamp, published.includes(item));
        for (const item of staged)
            await rm(item.tmp, { force: true });
        throw error;
    }
    for (const item of staged)
        await rm(shelfName(item.target, stamp), { force: true });
}
function shelfName(target, stamp) {
    return target + '.' + stamp + '.bak';
}
/** 目标存在但不是普通文件（目录等）时不能直接覆盖：先判出来，别等 rename 才炸。 */
async function blockedByDirectory(target) {
    let info;
    try {
        info = await lstat(target);
    }
    catch (error) {
        if (error.code === 'ENOENT')
            return false;
        throw error;
    }
    return info.isDirectory();
}
/** 旧产物挪到 .bak；本来就没有产物时什么都不做（ENOENT 不是失败）。 */
async function shelve(target, stamp) {
    try {
        await rename(target, shelfName(target, stamp));
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
    }
}
/** 还原单份产物：本次发布写进去的字节删掉，旧产物（若已挪到 .bak）挪回来；从未动过的目标不碰。 */
async function unshelve(target, stamp, republished) {
    const shelf = shelfName(target, stamp);
    let hasShelf = false;
    try {
        await lstat(shelf);
        hasShelf = true;
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
    }
    if (!republished && !hasShelf)
        return;
    await rm(target, { force: true });
    if (hasShelf)
        await rename(shelf, target);
}
/** L3：校验通过后编译 tree.json / outline.md / api-index.json / receipt.json（冻结）。 */
export async function buildProject(projectDir, opts) {
    const v = await validateProject(projectDir, opts);
    if (!v.ok) {
        return { ok: false, receipt: null, errors: v.errors, warnings: v.warnings, validate: v };
    }
    const slug = projectDir.split(/[\\\/]/).pop() ?? 'project';
    const files = [...v.files].sort((a, b) => a.module.id.localeCompare(b.module.id));
    const byId = new Map(files.map(f => [f.module.id, f.module]));
    const roots = files.filter(f => f.module.parent === null).sort((a, b) => a.module.id.localeCompare(b.module.id));
    const descendantMemo = new Map();
    const countDesc = (id) => {
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
    const apiBelow = (id) => {
        let total = 0;
        for (const k of v.childrenOf.get(id) ?? []) {
            const m = byId.get(k);
            total += (m !== undefined && m.apis !== undefined ? m.apis.length : 0) + apiBelow(k);
        }
        return total;
    };
    const depIn = new Map();
    let depCount = 0;
    let crossTreeDepCount = 0;
    const edges = [];
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
    const modules = {};
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
    const apiIndex = {};
    const apiContracts = {};
    const typeContracts = {};
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
    const layouts = {};
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
        const warningSummary = {};
        for (const w of v.warnings)
            warningSummary[w.code] = (warningSummary[w.code] ?? 0) + 1;
        const artifacts = {
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
        const pending = [
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
//# sourceMappingURL=compile.js.map