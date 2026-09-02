// Types shared across guardrails, allowlist matching, and patch application.
// Kept minimal on purpose — anything richer belongs in ai-editor.config.ts.

export type Action = 'create' | 'update';

export interface AllowRule {
  /** Glob pattern, e.g. `src/content/pages/**\/*.md` */
  pattern: string;
  /** Which actions the pattern permits. */
  actions: readonly Action[];
  /** Maximum permitted file size in bytes (mainly for images). */
  maxBytes?: number;
}

/** Deny patterns are actions-agnostic — a match forbids all actions on the path. */
export type DenyPattern = string;

export interface PatchEdit {
  /** Substring that must appear exactly once in the ORIGINAL file. */
  old_str: string;
  /** Replacement text. Empty string deletes the match. */
  new_str: string;
}

export interface NormaliseResult {
  ok: boolean;
  /** The normalised path when `ok` is true. */
  path?: string;
  /** Machine-readable rejection code when `ok` is false. */
  reason?:
    | 'empty'
    | 'absolute'
    | 'backslash'
    | 'null-byte'
    | 'control-char'
    | 'traversal'
    | 'empty-segment'
    | 'disallowed-char'
    | 'dot-lookalike';
}

export interface AllowMatchResult {
  ok: boolean;
  rule?: AllowRule;
  reason?: 'no-match' | 'action-not-permitted' | 'over-max-bytes';
}

export interface OverlapCheckResult {
  ok: boolean;
  /** When ok=true, the sorted match ranges (start, end) for each edit in input order. */
  ranges?: readonly { start: number; end: number; editIndex: number }[];
  /** Populated on failure. */
  reason?:
    | { kind: 'not-found'; editIndex: number }
    | { kind: 'multiple-matches'; editIndex: number; matchCount: number }
    | { kind: 'overlap'; editIndexA: number; editIndexB: number };
}
