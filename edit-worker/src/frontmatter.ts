// Minimal frontmatter split + YAML parse for validating written files.
//
// We deliberately DO NOT re-serialise frontmatter on write — the patch-mode
// tool contract is that the model produces the exact bytes we commit. This
// module only reads. A `create` action's full content is parsed to validate
// the new frontmatter matches the collection's Zod schema; an `update` after
// patch application is parsed to check LOCKED-field equality against the
// current file.

import { parse as parseYaml } from 'yaml';

export interface FrontmatterSplit {
  ok: true;
  frontmatterRaw: string;
  body: string;
}

export type FrontmatterSplitResult =
  | FrontmatterSplit
  | { ok: false; reason: 'no-opening-fence' | 'no-closing-fence' };

/**
 * Split `---\n<yaml>\n---\n<body>` into its parts. Preserves line breaks
 * inside the YAML. Accepts either `\n` or `\r\n` line endings for the
 * fences (writes may go through editors that add CRLF).
 */
export function splitFrontmatter(content: string): FrontmatterSplitResult {
  // Accept optional BOM.
  const stripped = content.startsWith('﻿') ? content.slice(1) : content;

  // First fence must be `---` on its own line at the very top.
  const openMatch = stripped.match(/^---(\r?\n)/);
  if (!openMatch) return { ok: false, reason: 'no-opening-fence' };
  const afterOpen = openMatch[0].length;

  // Find closing fence.
  const closeMatch = stripped.slice(afterOpen).match(/\r?\n---\r?\n/);
  if (!closeMatch || closeMatch.index === undefined) {
    return { ok: false, reason: 'no-closing-fence' };
  }

  const frontmatterRaw = stripped.slice(afterOpen, afterOpen + closeMatch.index);
  const body = stripped.slice(afterOpen + closeMatch.index + closeMatch[0].length);

  return { ok: true, frontmatterRaw, body };
}

/**
 * Parse a raw YAML string into a plain JS object. Wraps errors so callers
 * can distinguish "malformed YAML" from downstream schema failures.
 */
export function parseFrontmatterYaml(raw: string): { ok: true; data: unknown } | { ok: false; reason: string } {
  try {
    const parsed = parseYaml(raw);
    return { ok: true, data: parsed };
  } catch (err) {
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * One-shot helper: split, parse, return the frontmatter object OR an error
 * label with a machine-readable code.
 */
export function extractFrontmatter(
  content: string,
): { ok: true; data: Record<string, unknown>; body: string } | { ok: false; code: string; detail?: string } {
  const split = splitFrontmatter(content);
  if (!split.ok) return { ok: false, code: split.reason };
  const parsed = parseFrontmatterYaml(split.frontmatterRaw);
  if (!parsed.ok) return { ok: false, code: 'yaml-parse-error', detail: parsed.reason };
  if (parsed.data == null || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) {
    return { ok: false, code: 'frontmatter-not-object' };
  }
  return { ok: true, data: parsed.data as Record<string, unknown>, body: split.body };
}
