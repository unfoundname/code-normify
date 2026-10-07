export function diag(severity, code, message, subject, evidence, supportedFixes) {
    const d = { code, severity, message };
    if (subject !== undefined)
        d.subject = subject;
    if (evidence !== undefined)
        d.evidence = evidence;
    if (supportedFixes !== undefined && supportedFixes.length > 0)
        d.supportedFixes = supportedFixes;
    return d;
}
export function fmtDiag(d) {
    const where = d.subject ? ' @ ' + JSON.stringify(d.subject) : '';
    const fix = d.supportedFixes && d.supportedFixes.length > 0 ? ' → 修复: ' + d.supportedFixes.join('; ') : '';
    return '[' + d.severity + '] ' + d.code + ': ' + d.message + where + fix;
}
/**
 * ISO 8601 时间谓词（引擎内唯一一份，与 diag 同住是因为四处校验器都只共用这一个文件）。
 *
 * 为什么必须唯一：layout / policy / changes / frontmatter 四处都在诊断里自称「必须为 ISO 8601 时间」，
 * 却各写各的松判据——`/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/` 只看前缀（`2026-99-99T99:99garbage` 直接通过），
 * `Date.parse` 连 `"1"`、`"30 Aug 2026"` 这类非 ISO 字符串也照收。判据散落四处就会再次各自漂移。
 *
 * 接受：`YYYY-MM-DDTHH:MM` 起头的时间，可选 `:SS`、可选小数秒、可选 `Z` / `±HH:MM` / `±HHMM`；
 *      秒允许 `60`（ISO 8601 的闰秒）；月/日/时/分/偏移都做真实范围校验（含闰年）。
 * 不接受：纯日期（无时间部分）、非 ISO 的自然语言或缩写形式、越界的月日时分。
 * 工具自身写入的时间来自 `new Date().toISOString()`，属于接受集。
 */
const ISO_8601 = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:?\d{2})?$/;
const ISO_MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export function isIso8601(value) {
    if (typeof value !== 'string')
        return false;
    const matched = ISO_8601.exec(value);
    if (matched === null)
        return false;
    const year = Number(matched[1]);
    const month = Number(matched[2]);
    const day = Number(matched[3]);
    const hour = Number(matched[4]);
    const minute = Number(matched[5]);
    const second = matched[6] === undefined ? 0 : Number(matched[6]);
    if (month < 1 || month > 12)
        return false;
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const maxDay = month === 2 && leap ? 29 : ISO_MONTH_DAYS[month - 1];
    if (day < 1 || day > maxDay)
        return false;
    if (hour > 23 || minute > 59 || second > 60)
        return false;
    const zone = matched[8];
    if (zone !== undefined && zone !== 'Z') {
        if (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(-2)) > 59)
            return false;
    }
    return true;
}
//# sourceMappingURL=diag.js.map