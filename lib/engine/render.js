import { join } from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { sha256Text } from './store.js';
import { renderTemplate } from './template.js';
import { diag } from './diag.js';
import { graphDigest } from './manifest.js';
import { boundPath } from '../workspace.js';
/** 读取 tree.json → 注入查看器模板 → 输出单文件 HTML。 */
export async function renderProject(projectDir, opts) {
    const errors = [];
    const warnings = [];
    let treeText;
    try {
        treeText = await readFile(join(projectDir, 'tree.json'), 'utf8');
    }
    catch {
        return {
            ok: false,
            htmlPath: null,
            bytes: 0,
            sha256: null,
            summary: null,
            errors: [diag('error', 'render/no-build', '缺少 tree.json 编译产物', {}, {}, ['先运行 normify_build'])],
            warnings,
        };
    }
    let tree;
    try {
        tree = JSON.parse(treeText);
    }
    catch (error) {
        return {
            ok: false,
            htmlPath: null,
            bytes: 0,
            sha256: null,
            summary: null,
            errors: [diag('error', 'render/bad-tree', 'tree.json 解析失败：' + String(error), {}, {}, ['重新运行 normify_build'])],
            warnings,
        };
    }
    const project = (tree.project ?? {});
    const sourceDigest = await graphDigest(projectDir);
    if (project.source_digest !== sourceDigest)
        return {
            ok: false, htmlPath: null, bytes: 0, sha256: null, summary: null,
            errors: [diag('error', 'render/stale-tree', '架构源数据已改变或编译产物缺少源摘要，请先重新编译', {}, { expected: sourceDigest, compiled: project.source_digest }, ['运行 normify_build'])], warnings,
        };
    let frozen;
    try {
        frozen = JSON.parse(await readFile(join(projectDir, 'receipt.json'), 'utf8'));
    }
    catch (error) {
        return { ok: false, htmlPath: null, bytes: 0, sha256: null, summary: null,
            errors: [diag('error', 'render/receipt-unavailable', '编译回执缺失或损坏', {}, { reason: String(error) }, ['运行 normify_build'])], warnings };
    }
    if (frozen.source_digest !== sourceDigest || frozen.artifacts?.['tree.json']?.sha256 !== sha256Text(treeText))
        return {
            ok: false, htmlPath: null, bytes: 0, sha256: null, summary: null,
            errors: [diag('error', 'render/unfrozen-tree', 'tree.json 与编译回执不一致', {}, {}, ['运行 normify_build'])], warnings,
        };
    const stats = (project.stats ?? {});
    const name = String(project.name ?? 'project');
    const summary = {
        name,
        stats,
        compiledAt: String(project.compiled_at ?? ''),
        treeSha12: sha256Text(treeText).slice(0, 12),
        lang: opts.lang ?? '',
        theme: opts.theme ?? '',
    };
    const html = renderTemplate(treeText, { name, stats, compiledAt: summary.compiledAt, treeSha12: summary.treeSha12 });
    const out = await boundPath(projectDir, opts.out ?? 'normify.html');
    try {
        await writeFile(out, html, 'utf8');
    }
    catch (error) {
        return {
            ok: false,
            htmlPath: null,
            bytes: 0,
            sha256: null,
            summary,
            errors: [diag('error', 'render/write-failed', 'HTML 写入失败：' + String(error), { out }, {}, [])],
            warnings,
        };
    }
    return { ok: true, htmlPath: out, bytes: Buffer.byteLength(html, 'utf8'), sha256: sha256Text(html), summary, errors, warnings };
}
//# sourceMappingURL=render.js.map