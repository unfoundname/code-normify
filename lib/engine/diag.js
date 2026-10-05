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
//# sourceMappingURL=diag.js.map