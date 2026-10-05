import { standaloneExecution } from '../execution.js';
import { diag } from './diag.js';
import { gitHead, loadAllModules as loadAllModulesForClose } from './store.js';
import { refreshModules } from './edit.js';
import { validateProject } from './validate.js';
import { buildProject } from './compile.js';
import { renderProject } from './render.js';
import { l1ValidateChange, loadChangeFile, writeChangeFile } from './changes.js';
import { apiKey } from './ids.js';
/**
 * 关闭开发变更（伴随开发收尾）：刷新指纹/激活 planned → validate（0 error 强制）→ build（可选 render）
 * → 标记 verified 并记录 revision.after。任何一步失败都不关闭，变更保持原状态。
 */
export async function closeChange(projectDir, id, opts, execution = standaloneExecution) {
    const { change, error } = await loadChangeFile(projectDir, id);
    if (error !== null)
        return { ok: false, phase: 'load', errors: [error], warnings: [] };
    if (change === null)
        return { ok: false, phase: 'load', errors: [diag('error', 'change/not-found', '变更不存在：' + id, { change: id }, {}, [])], warnings: [] };
    if (change.status === 'verified')
        return { ok: false, phase: 'load', errors: [diag('error', 'change/closed', '变更已关闭：' + id, { change: id }, {}, [])], warnings: [] };
    if (change.status === 'abandoned')
        return { ok: false, phase: 'load', errors: [diag('error', 'change/abandoned', '变更已放弃，不能再关闭：' + id, { change: id }, {}, [])], warnings: [] };
    // 变更清单是操作意图；在关闭边界检查完成状态，而非用 L2 阻止操作本身。
    const current = await loadAllModulesForClose(projectDir);
    const currentById = new Map(current.files.map(file => [file.module.id, file.module]));
    const landingErrors = [...current.errors];
    for (const target of change.modules.delete ?? []) {
        if (currentById.has(target))
            landingErrors.push(diag('error', 'change/delete-not-landed', '变更要求删除的模块仍然存在', { change: id, module: target }, {}, ['删除该模块及其子树后再关闭变更']));
    }
    for (const ref of change.modules.api_remove ?? []) {
        const target = currentById.get(ref.module);
        if ((target?.apis ?? []).some(api => apiKey(api) === ref.key))
            landingErrors.push(diag('error', 'change/api-remove-not-landed', '变更要求移除的 API 仍然存在', { change: id, module: ref.module, api: ref.key }, {}, ['移除该 API 并迁移引用方后再关闭变更']));
    }
    for (const ref of change.modules.api_add ?? []) {
        const target = currentById.get(ref.module);
        if (!(target?.apis ?? []).some(api => apiKey(api) === ref.key))
            landingErrors.push(diag('error', 'change/api-add-not-landed', '变更要求新增的 API 尚未定义', { change: id, module: ref.module, api: ref.key }, {}, ['在目标模块声明该 API 并完成实现后再关闭变更']));
    }
    if (landingErrors.length > 0)
        return { ok: false, phase: 'landing', errors: landingErrors, warnings: current.warnings, change, hint: '完成变更清单中的删除与接口增删后再关闭。' };
    const repoRoot = opts.repoRoot !== undefined && opts.repoRoot.trim() !== '' ? opts.repoRoot : undefined;
    let refresh = null;
    if (repoRoot !== undefined) {
        const targets = [...new Set([...(change.modules.create ?? []), ...(change.modules.modify ?? []), ...(change.modules.api_add ?? []).map(ref => ref.module)])];
        if (targets.length > 0) {
            const rr = await refreshModules(projectDir, { ids: targets, repoRoot, activate: opts.activate !== false }, execution);
            if (!rr.ok) {
                return { ok: false, phase: 'refresh', errors: rr.errors, warnings: rr.warnings, change, hint: '先修正 refresh 报错（源码落地/路径/指纹），再关闭变更。' };
            }
            refresh = { refreshed: rr.refreshed, missing: rr.missing };
        }
    }
    // create 清单必须全部落地（active）：叶子必须有源码；容器随子树落地
    if (repoRoot !== undefined) {
        const after = (await loadAllModulesForClose(projectDir)).files;
        const notDone = (change.modules.create ?? []).filter(id => {
            const hit = after.find(f => f.module.id === id);
            return hit !== undefined && (hit.module.state ?? 'active') === 'planned';
        });
        if (notDone.length > 0) {
            return {
                ok: false,
                phase: 'landing',
                errors: [diag('error', 'change/create-not-landed', '变更 create 清单中仍有 planned 模块：' + notDone.join(', '), { change: change.id }, { modules: notDone }, ['实现 source 后用 normify_module_refresh({ ids, activate: true }) 落地'])],
                warnings: [],
                change,
                hint: 'close 要求 create 模块全部落地（0 error 强制）。',
            };
        }
        const apiNotDone = (change.modules.api_add ?? []).filter(ref => after.some(file => file.module.id === ref.module && (file.module.state ?? 'active') === 'planned'));
        if (apiNotDone.length > 0)
            return { ok: false, phase: 'landing', errors: [diag('error', 'change/api-add-not-landed', '新增 API 所属模块仍为 planned，尚未完成实现', { change: id }, { apis: apiNotDone }, ['实现对应 source 并激活模块后再关闭'])], warnings: [], change };
    }
    const v = await validateProject(projectDir, { repoRoot, requireBilingual: opts.requireBilingual });
    if (!v.ok) {
        return {
            ok: false,
            phase: 'validate',
            errors: v.errors,
            warnings: v.warnings,
            change,
            message: 'close 被拒绝：必须 0 error（0 error 强制）',
            hint: '按 supportedFixes 修复后重试；变更保持 ' + change.status + '。',
        };
    }
    const b = await buildProject(projectDir, { repoRoot, requireBilingual: opts.requireBilingual });
    if (!b.ok)
        return { ok: false, phase: 'build', errors: b.errors, warnings: v.warnings, change };
    let render = null;
    const now = new Date().toISOString();
    const head = repoRoot !== undefined ? await gitHead(repoRoot, execution) : { sha: null };
    const updated = {
        ...change,
        status: 'verified',
        closed_at: now,
        updated_at: now,
        revision: { before: change.revision.before ?? null, after: head.sha ?? change.revision.after ?? null },
        ...(opts.note !== undefined && opts.note !== '' ? { note: (change.note !== undefined && change.note !== '' ? change.note + '\n' : '') + opts.note } : {}),
    };
    const r = l1ValidateChange(updated, change.id, 'close:' + change.id);
    if (r.change === null)
        return { ok: false, phase: 'change-write', errors: r.errors, warnings: r.warnings, change };
    const file = await writeChangeFile(projectDir, r.change);
    // 变更状态落盘后重建一次产物，让 tree.json/receipt 反映 change_count / open_change_count
    const rebuilt = await buildProject(projectDir, { repoRoot, requireBilingual: opts.requireBilingual });
    if (!rebuilt.ok)
        return { ok: false, phase: 'rebuild', errors: rebuilt.errors, warnings: rebuilt.warnings, change: r.change };
    // HTML 必须使用 verified 状态写入之后的最终 tree/receipt。
    if (opts.render === true) {
        const rendered = await renderProject(projectDir, {});
        if (!rendered.ok)
            return { ok: false, phase: 'render', errors: rendered.errors, warnings: rebuilt.warnings, change: r.change };
        render = { html: rendered.htmlPath, bytes: rendered.bytes, sha256: rendered.sha256 };
    }
    return {
        ok: true,
        phase: 'verified',
        errors: [],
        warnings: v.warnings,
        change: r.change,
        file,
        refresh,
        build: (rebuilt.receipt?.stats ?? b.receipt?.stats ?? null),
        render,
        revision: r.change.revision,
        hint: '变更已关闭并冻结。继续下一个变更：normify_change_open。',
    };
}
//# sourceMappingURL=companion.js.map