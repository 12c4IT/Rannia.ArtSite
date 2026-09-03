// Content validation for AI-written files.
//
// Runs after guardrails (path already normalised + allow/deny checked) and
// after patch application (for `update`). Two layers:
//   1. Zod schema — the same shape rules the site's build uses. Rejects
//      malformed frontmatter, missing required fields, wrong types.
//   2. LOCKED-field check — even if Zod passes, certain fields cannot be
//      changed by AI. `status`, `sources`, `artist.name`, image rights.
//      This is the fabrication protection: without it a plausible-sounding
//      but wrong quote can be laundered through a valid-shaped edit.

import type { ZodType } from 'zod';
import type { CollectionId } from './schemas';
import { SCHEMAS, collectionForPath } from './schemas';
import type { FieldRules } from './config';

// ─── Zod validation ───────────────────────────────────────────────────

export type ZodResult =
  | { ok: true; data: Record<string, unknown> }
  | { ok: false; issues: readonly { path: string; message: string }[] };

/**
 * Validate parsed frontmatter against the collection's schema.
 * Returns the parsed (and default-filled) data on success.
 */
export function validateFrontmatter(
  collection: CollectionId,
  raw: Record<string, unknown>,
): ZodResult {
  const schema = SCHEMAS[collection] as ZodType<Record<string, unknown>>;
  const parsed = schema.safeParse(raw);
  if (parsed.success) {
    return { ok: true, data: parsed.data };
  }
  return {
    ok: false,
    issues: parsed.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    })),
  };
}

// ─── Field path resolution ────────────────────────────────────────────

/**
 * Resolve a dotted-path with `[*]` wildcards against an object into a list
 * of concrete leaf-value pairs. Examples:
 *   `status`                          → [['status', <value>]]
 *   `artist.birthYear`                → [['artist.birthYear', <value>]]
 *   `artworks[*].image.rightsBasis`   → [['artworks.0.image.rightsBasis', v0], ['artworks.1.image.rightsBasis', v1]]
 *   `sources`                         → [['sources', <array>]]  — whole subtree
 */
export function resolveFieldPath(
  obj: Record<string, unknown>,
  path: string,
): { path: string; value: unknown }[] {
  const parts = path.split('.');
  return expandParts(obj, parts, []);
}

function expandParts(
  cursor: unknown,
  remaining: string[],
  acc: string[],
): { path: string; value: unknown }[] {
  if (remaining.length === 0) {
    return [{ path: acc.join('.'), value: cursor }];
  }
  const head = remaining[0]!;
  const rest = remaining.slice(1);

  // Wildcard array index: `foo[*]` splits into `foo` then a wildcard step.
  const wildcardMatch = head.match(/^(.*)\[\*\]$/);
  if (wildcardMatch) {
    const arrayKey = wildcardMatch[1]!;
    const arrayVal = arrayKey === '' ? cursor : (cursor as Record<string, unknown> | null)?.[arrayKey];
    if (!Array.isArray(arrayVal)) return [];
    const prefix = arrayKey === '' ? acc : [...acc, arrayKey];
    return arrayVal.flatMap((item, idx) =>
      expandParts(item, rest, [...prefix, String(idx)]),
    );
  }

  if (cursor == null || typeof cursor !== 'object') return [];
  const next = (cursor as Record<string, unknown>)[head];
  return expandParts(next, rest, [...acc, head]);
}

// ─── LOCKED-field diff ────────────────────────────────────────────────

export type LockedResult =
  | { ok: true }
  | {
      ok: false;
      issues: readonly {
        path: string;
        rule: 'must-equal-current' | 'must-equal-default' | 'below-min-length';
        current?: unknown;
        proposed: unknown;
      }[];
    };

/**
 * On UPDATE: assert every LOCKED field in the proposed frontmatter equals
 * the same field in the current file's frontmatter.
 *
 * On CREATE: assert every LOCKED field equals its schema default (which
 * for every `status` in this repo is `'draft'`, so the classic force-draft
 * rule falls out automatically).
 */
export function checkLockedFields(
  action: 'update' | 'create',
  proposed: Record<string, unknown>,
  currentOrDefaults: Record<string, unknown>,
  rules: FieldRules,
): LockedResult {
  const issues: {
    path: string;
    rule: 'must-equal-current' | 'must-equal-default' | 'below-min-length';
    current?: unknown;
    proposed: unknown;
  }[] = [];

  for (const lockedPath of rules.locked) {
    const proposedLeaves = resolveFieldPath(proposed, lockedPath);
    const currentLeaves = resolveFieldPath(currentOrDefaults, lockedPath);

    // Build a map by concrete path for comparison.
    const proposedByPath = new Map(proposedLeaves.map((l) => [l.path, l.value]));
    const currentByPath = new Map(currentLeaves.map((l) => [l.path, l.value]));

    const allPaths = new Set([...proposedByPath.keys(), ...currentByPath.keys()]);
    for (const p of allPaths) {
      const propV = proposedByPath.get(p);
      const currV = currentByPath.get(p);
      if (!deepEqual(propV, currV)) {
        issues.push({
          path: p,
          rule: action === 'update' ? 'must-equal-current' : 'must-equal-default',
          current: currV,
          proposed: propV,
        });
      }
    }
  }

  // Min-length checks (e.g. alt text ≥ 20).
  if (rules.minLen) {
    for (const [pathPattern, min] of Object.entries(rules.minLen)) {
      const leaves = resolveFieldPath(proposed, pathPattern);
      for (const { path, value } of leaves) {
        if (typeof value === 'string' && value.length < min) {
          issues.push({
            path,
            rule: 'below-min-length',
            proposed: value,
          });
        }
      }
    }
  }

  return issues.length === 0 ? { ok: true } : { ok: false, issues };
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a as Record<string, unknown>);
    const kb = Object.keys(b as Record<string, unknown>);
    if (ka.length !== kb.length) return false;
    return ka.every((k) =>
      deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      ),
    );
  }
  return false;
}

export { collectionForPath };
