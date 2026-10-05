import type { Diagnostic } from './types.js';
export declare function diag(severity: 'error' | 'warning', code: string, message: string, subject?: Record<string, unknown>, evidence?: Record<string, unknown>, supportedFixes?: string[]): Diagnostic;
export declare function fmtDiag(d: Diagnostic): string;
