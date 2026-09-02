// Path safety, allow/deny matching, and patch-overlap checking.
//
// This module is the safety boundary. Every write the Worker makes to the
// GitHub repo passes through here. The invariant we protect: paths that
// aren't explicitly permitted, or patches whose ranges collide in the
// original file, never reach the commit stage.
//
// All rules are enforced against the NORMALISED path, never the raw string.
// Deny wins ties with allow.

import type {
  AllowMatchResult,
  AllowRule,
  DenyPattern,
  NormaliseResult,
  OverlapCheckResult,
  PatchEdit,
} from './types';

// ─── Path normalisation ────────────────────────────────────────────────

/**
 * Normalise and validate a repo-relative path.
 *
 * Rejects: empty strings, absolute paths, backslashes, null bytes, other
 * control characters, `..` traversals, empty segments, characters outside a
 * strict allowlist, and unicode look-alikes of ASCII path characters (full-
 * width dots and slashes have been used in real path-traversal exploits).
 */
export function normalisePath(raw: string): NormaliseResult {
  if (typeof raw !== 'string' || raw.length === 0) {
    return { ok: false, reason: 'empty' };
  }

  // Reject before any transformation — we do NOT want to "clean" a hostile
  // input into looking safe.
  if (raw.includes('\0')) return { ok: false, reason: 'null-byte' };
  if (raw.includes('\\')) return { ok: false, reason: 'backslash' };

  // Any other ASCII control character (0-31, 127) is out. Whitespace inside
  // filenames is also out — YAML/MDX filenames in this repo never use it.
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code < 32 || code === 127) return { ok: false, reason: 'control-char' };
  }

  // Unicode dot / slash look-alikes. Real exploits have used these to slip
  // past ASCII-only traversal checks. If we see any codepoint above 0x7E
  // we reject — every path in this repo is pure ASCII.
  for (let i = 0; i < raw.length; i++) {
    const code = raw.charCodeAt(i);
    if (code > 0x7e) return { ok: false, reason: 'dot-lookalike' };
  }

  if (raw.startsWith('/')) return { ok: false, reason: 'absolute' };

  // Split, drop `.` segments, reject any `..` outright (do NOT resolve —
  // even a resolvable `..` earns rejection; the model has no reason to
  // emit one).
  const segments = raw.split('/');
  const clean: string[] = [];
  for (const seg of segments) {
    if (seg === '') return { ok: false, reason: 'empty-segment' };
    if (seg === '.') continue;
    if (seg === '..') return { ok: false, reason: 'traversal' };
    if (!SEGMENT_RE.test(seg)) return { ok: false, reason: 'disallowed-char' };
    clean.push(seg);
  }

  if (clean.length === 0) return { ok: false, reason: 'empty' };

  return { ok: true, path: clean.join('/') };
}

// Every path segment must match this — letters, digits, dot, underscore, hyphen.
// Deliberately narrow: no `@`, no `+`, no `:`, no `~`. If a real file needs
// one of those we widen this deliberately.
const SEGMENT_RE = /^[A-Za-z0-9._-]+$/;

// ─── Glob → regex ──────────────────────────────────────────────────────

/**
 * Convert a glob pattern to a regex.
 *
 * Supported syntax:
 *   `**`      — any number of segments (including zero)
 *   `*`       — one segment (no slashes)
 *   `?`       — one character within a segment
 *   `{a,b,c}` — alternation (extension groups)
 *
 * All patterns are anchored at both ends.
 *
 * The compiled regex is cached per input pattern to avoid recompiling on
 * every match call.
 */
export function globToRegex(pattern: string): RegExp {
  const cached = globCache.get(pattern);
  if (cached) return cached;

  let out = '';
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i]!;
    if (ch === '*') {
      if (pattern[i + 1] === '*') {
        // `**` — match any run of characters including slashes.
        // Consume an optional trailing slash so `foo/**\/bar` matches `foo/bar`.
        if (pattern[i + 2] === '/') {
          out += '(?:.*/)?';
          i += 3;
        } else {
          out += '.*';
          i += 2;
        }
      } else {
        // `*` — one segment.
        out += '[^/]*';
        i += 1;
      }
    } else if (ch === '?') {
      out += '[^/]';
      i += 1;
    } else if (ch === '{') {
      const closeIdx = pattern.indexOf('}', i + 1);
      if (closeIdx === -1) {
        // Unterminated alternation — treat as literal.
        out += '\\{';
        i += 1;
      } else {
        const inner = pattern.slice(i + 1, closeIdx);
        const alternatives = inner.split(',').map((a) => escapeRegex(a));
        out += `(?:${alternatives.join('|')})`;
        i = closeIdx + 1;
      }
    } else {
      out += escapeRegex(ch);
      i += 1;
    }
  }

  const re = new RegExp(`^${out}$`);
  globCache.set(pattern, re);
  return re;
}

const globCache = new Map<string, RegExp>();

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Allow / deny matching ────────────────────────────────────────────

/**
 * Match a normalised path against the allow list. Returns the first rule
 * whose pattern matches AND whose actions include the requested action.
 *
 * NOTE: this does NOT check the deny list — call `matchDeny` separately
 * and reject BEFORE evaluating allow. Deny always wins.
 */
export function matchAllow(
  normalisedPath: string,
  action: 'create' | 'update',
  rules: readonly AllowRule[],
  contentBytes?: number,
): AllowMatchResult {
  let matchedButActionForbidden = false;
  for (const rule of rules) {
    if (!globToRegex(rule.pattern).test(normalisedPath)) continue;
    if (!rule.actions.includes(action)) {
      matchedButActionForbidden = true;
      continue;
    }
    if (rule.maxBytes != null && contentBytes != null && contentBytes > rule.maxBytes) {
      return { ok: false, reason: 'over-max-bytes' };
    }
    return { ok: true, rule };
  }
  return { ok: false, reason: matchedButActionForbidden ? 'action-not-permitted' : 'no-match' };
}

/**
 * Return true if the normalised path matches any deny pattern.
 * Deny patterns are actions-agnostic — a match forbids all actions.
 */
export function matchDeny(
  normalisedPath: string,
  patterns: readonly DenyPattern[],
): boolean {
  for (const p of patterns) {
    if (globToRegex(p).test(normalisedPath)) return true;
  }
  return false;
}

// ─── Patch overlap check ──────────────────────────────────────────────

/**
 * Verify a batch of edits can be applied against the original file content
 * without collision.
 *
 * Rules:
 *   - Each `old_str` must appear EXACTLY once in the ORIGINAL content.
 *     (Zero matches or two-plus matches → reject; the model should retry
 *     with more context.)
 *   - No two edits' match ranges may overlap in the original.
 *
 * Applied edits are NOT computed here — the caller uses the returned
 * ranges (sorted by start, descending) to apply from the last position
 * backwards so earlier positions don't shift.
 */
export function checkPatchOverlap(
  original: string,
  edits: readonly PatchEdit[],
): OverlapCheckResult {
  if (edits.length === 0) {
    return { ok: true, ranges: [] };
  }

  const ranges: { start: number; end: number; editIndex: number }[] = [];

  for (let i = 0; i < edits.length; i++) {
    const edit = edits[i]!;
    if (edit.old_str.length === 0) {
      // Empty old_str would match every position — degenerate. Reject as
      // "not found" so the model must be explicit.
      return { ok: false, reason: { kind: 'not-found', editIndex: i } };
    }

    const first = original.indexOf(edit.old_str);
    if (first === -1) {
      return { ok: false, reason: { kind: 'not-found', editIndex: i } };
    }
    // Ensure exactly one occurrence.
    const second = original.indexOf(edit.old_str, first + 1);
    if (second !== -1) {
      // Count the rest for a useful error message.
      let count = 2;
      let searchFrom = second + 1;
      while (true) {
        const next = original.indexOf(edit.old_str, searchFrom);
        if (next === -1) break;
        count++;
        searchFrom = next + 1;
      }
      return {
        ok: false,
        reason: { kind: 'multiple-matches', editIndex: i, matchCount: count },
      };
    }

    ranges.push({ start: first, end: first + edit.old_str.length, editIndex: i });
  }

  // Check for overlaps. Sort ascending by start; if any range's start is
  // before the previous range's end, we overlap.
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (curr.start < prev.end) {
      return {
        ok: false,
        reason: {
          kind: 'overlap',
          editIndexA: prev.editIndex,
          editIndexB: curr.editIndex,
        },
      };
    }
  }

  // Return sorted-by-position-descending so the caller can apply from
  // end backwards without recomputing.
  const applyOrder = [...sorted].reverse();
  return { ok: true, ranges: applyOrder };
}

// ─── Applying validated patches ────────────────────────────────────────

/**
 * Apply a validated set of edits to the original content. Callers MUST run
 * `checkPatchOverlap` first and pass its ranges result (applying without
 * a prior overlap check would risk corruption). This function assumes the
 * ranges are sorted by start descending — that's what checkPatchOverlap
 * returns on success.
 */
export function applyPatches(
  original: string,
  edits: readonly PatchEdit[],
  ranges: readonly { start: number; end: number; editIndex: number }[],
): string {
  let out = original;
  for (const range of ranges) {
    const edit = edits[range.editIndex]!;
    out = out.slice(0, range.start) + edit.new_str + out.slice(range.end);
  }
  return out;
}
