import { describe, expect, it } from 'vitest';
import {
  applyPatches,
  checkPatchOverlap,
  globToRegex,
  matchAllow,
  matchDeny,
  normalisePath,
} from './guardrails';
import type { AllowRule } from './types';

// ═════════════════════════════════════════════════════════════════════════
// normalisePath — the security-critical entry point.
// Everything path-shaped that the AI emits comes through here first.
// If any of these tests fail, DO NOT WEAKEN the check — first understand
// why the input is rejected and whether the design should permit it.
// ═════════════════════════════════════════════════════════════════════════

describe('normalisePath — happy paths', () => {
  it('accepts a simple content path', () => {
    const r = normalisePath('src/content/pages/about.md');
    expect(r).toEqual({ ok: true, path: 'src/content/pages/about.md' });
  });

  it('accepts a folder-per-entry MDX path', () => {
    const r = normalisePath('src/content/case-studies/bourgeois-louise/index.mdx');
    expect(r).toEqual({
      ok: true,
      path: 'src/content/case-studies/bourgeois-louise/index.mdx',
    });
  });

  it('accepts an image path with hyphen and dot', () => {
    const r = normalisePath('src/content/case-studies/bourgeois-louise/images/maman.jpg');
    expect(r.ok).toBe(true);
  });

  it('collapses a leading `./` segment', () => {
    const r = normalisePath('./src/content/pages/about.md');
    expect(r).toEqual({ ok: true, path: 'src/content/pages/about.md' });
  });
});

describe('normalisePath — rejects hostile inputs', () => {
  it('rejects an empty string', () => {
    expect(normalisePath('')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects a null byte anywhere', () => {
    expect(normalisePath('src/pages/index.astro\0')).toEqual({
      ok: false,
      reason: 'null-byte',
    });
    expect(normalisePath('src\0/pages/index.astro')).toEqual({
      ok: false,
      reason: 'null-byte',
    });
  });

  it('rejects backslashes (Windows separators)', () => {
    expect(normalisePath('src\\pages\\index.astro')).toEqual({
      ok: false,
      reason: 'backslash',
    });
    expect(normalisePath('src/pages\\index.astro')).toEqual({
      ok: false,
      reason: 'backslash',
    });
  });

  it('rejects tab characters', () => {
    expect(normalisePath('src/pages/\tabout.md')).toEqual({
      ok: false,
      reason: 'control-char',
    });
  });

  it('rejects other ASCII control characters', () => {
    for (const code of [0x01, 0x02, 0x08, 0x0a, 0x0d, 0x1f, 0x7f]) {
      const bad = 'src/pages/foo' + String.fromCharCode(code) + '.md';
      expect(normalisePath(bad).ok).toBe(false);
    }
  });

  it('rejects absolute paths', () => {
    expect(normalisePath('/etc/passwd')).toEqual({ ok: false, reason: 'absolute' });
    expect(normalisePath('/src/pages/index.astro')).toEqual({
      ok: false,
      reason: 'absolute',
    });
  });

  it('rejects `..` as its own segment', () => {
    expect(normalisePath('..')).toEqual({ ok: false, reason: 'traversal' });
  });

  it('rejects `../` prefix even if a subsequent path would resolve inside root', () => {
    expect(normalisePath('../etc/passwd')).toEqual({
      ok: false,
      reason: 'traversal',
    });
    expect(normalisePath('../../src/content/pages/about.md')).toEqual({
      ok: false,
      reason: 'traversal',
    });
  });

  it('rejects `..` embedded mid-path', () => {
    expect(normalisePath('src/content/pages/../../../etc/passwd')).toEqual({
      ok: false,
      reason: 'traversal',
    });
  });

  it('rejects consecutive slashes (empty segments)', () => {
    expect(normalisePath('src//content/pages/about.md')).toEqual({
      ok: false,
      reason: 'empty-segment',
    });
  });

  it('rejects a trailing slash', () => {
    expect(normalisePath('src/pages/')).toEqual({
      ok: false,
      reason: 'empty-segment',
    });
  });

  it('rejects URL-encoded traversal', () => {
    // %2e is `.`; %2f is `/`. Our normaliser doesn't url-decode, and `%` isn't
    // in the SEGMENT_RE allowlist, so this should be a disallowed-char.
    expect(normalisePath('src/pages/%2e%2e/index.astro')).toEqual({
      ok: false,
      reason: 'disallowed-char',
    });
  });

  it('rejects unicode dot look-alikes (full-width dot, ideographic full stop)', () => {
    // U+FF0E FULLWIDTH FULL STOP renders like `.`
    expect(normalisePath('src/pages/．．/etc/passwd').ok).toBe(false);
    // U+3002 IDEOGRAPHIC FULL STOP
    expect(normalisePath('src/pages/。。/etc/passwd').ok).toBe(false);
  });

  it('rejects unicode slash look-alike (full-width solidus)', () => {
    // U+FF0F FULLWIDTH SOLIDUS
    expect(normalisePath('src／pages／index.astro').ok).toBe(false);
  });

  it('rejects paths with spaces', () => {
    expect(normalisePath('src/pages/my file.md')).toEqual({
      ok: false,
      reason: 'disallowed-char',
    });
  });

  it('rejects paths with `@`, `+`, `:`, `~`, `#`, `$`', () => {
    for (const ch of ['@', '+', ':', '~', '#', '$']) {
      expect(normalisePath(`src/pages/foo${ch}bar.md`).ok).toBe(false);
    }
  });

  it('rejects a single `.` segment as the whole path', () => {
    // Normalises to empty after dropping the `.`.
    expect(normalisePath('.')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects a path that is only `./`', () => {
    // Splits to ['.', ''] — the '' segment is empty.
    expect(normalisePath('./')).toEqual({ ok: false, reason: 'empty-segment' });
  });
});

// ═════════════════════════════════════════════════════════════════════════
// globToRegex — the pattern matcher underpinning allow / deny.
// ═════════════════════════════════════════════════════════════════════════

describe('globToRegex', () => {
  it('matches literal paths', () => {
    expect(globToRegex('src/content/pages/about.md').test('src/content/pages/about.md')).toBe(true);
    expect(globToRegex('src/content/pages/about.md').test('src/content/pages/other.md')).toBe(false);
  });

  it('matches `*` for a single segment', () => {
    const re = globToRegex('src/content/case-studies/*/index.mdx');
    expect(re.test('src/content/case-studies/bourgeois-louise/index.mdx')).toBe(true);
    expect(re.test('src/content/case-studies/nested/deep/index.mdx')).toBe(false);
    expect(re.test('src/content/case-studies/index.mdx')).toBe(false);
  });

  it('matches `**` for any number of segments', () => {
    const re = globToRegex('src/content/pages/**/*.md');
    expect(re.test('src/content/pages/about.md')).toBe(true);
    expect(re.test('src/content/pages/nested/deep.md')).toBe(true);
    expect(re.test('src/content/pages/a/b/c/d.md')).toBe(true);
    expect(re.test('src/content/other/about.md')).toBe(false);
    expect(re.test('src/content/pages/about.mdx')).toBe(false);
  });

  it('matches `**` at end for any subtree', () => {
    const re = globToRegex('src/pages/**');
    expect(re.test('src/pages/index.astro')).toBe(true);
    expect(re.test('src/pages/deep/nested.astro')).toBe(true);
    expect(re.test('src/other/thing.astro')).toBe(false);
  });

  it('matches `{a,b,c}` alternations', () => {
    const re = globToRegex('*.{png,jpg,jpeg,webp}');
    expect(re.test('foo.png')).toBe(true);
    expect(re.test('foo.jpg')).toBe(true);
    expect(re.test('foo.jpeg')).toBe(true);
    expect(re.test('foo.webp')).toBe(true);
    expect(re.test('foo.svg')).toBe(false);
    expect(re.test('foo.gif')).toBe(false);
  });

  it('caches compiled patterns (returns the same RegExp instance)', () => {
    const a = globToRegex('src/**/*.md');
    const b = globToRegex('src/**/*.md');
    expect(a).toBe(b);
  });

  it('escapes regex special characters in literals', () => {
    // A literal `.` shouldn't match arbitrary chars.
    expect(globToRegex('src/pages/about.md').test('src/pages/aboutXmd')).toBe(false);
    // Parens, plus etc. shouldn't get regex meaning.
    const re = globToRegex('src/foo+bar.md');
    expect(re.test('src/foo+bar.md')).toBe(true);
    expect(re.test('src/foobar.md')).toBe(false);
    expect(re.test('src/fooooobar.md')).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// matchAllow / matchDeny
// ═════════════════════════════════════════════════════════════════════════

const RULES: readonly AllowRule[] = [
  { pattern: 'src/content/pages/**/*.md', actions: ['create', 'update'] },
  { pattern: 'src/content/case-studies/*/index.mdx', actions: ['update'] },
  {
    pattern: 'src/content/case-studies/*/images/*.{png,jpg,jpeg,webp}',
    actions: ['create', 'update'],
    maxBytes: 5_000_000,
  },
];

describe('matchAllow', () => {
  it('permits a page create', () => {
    const r = matchAllow('src/content/pages/about.md', 'create', RULES);
    expect(r.ok).toBe(true);
    expect(r.rule?.pattern).toBe('src/content/pages/**/*.md');
  });

  it('permits a page update', () => {
    const r = matchAllow('src/content/pages/about.md', 'update', RULES);
    expect(r.ok).toBe(true);
  });

  it('permits a case-study update', () => {
    const r = matchAllow(
      'src/content/case-studies/bourgeois-louise/index.mdx',
      'update',
      RULES,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects a case-study create (action not permitted for that rule)', () => {
    const r = matchAllow(
      'src/content/case-studies/new-artist/index.mdx',
      'create',
      RULES,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('action-not-permitted');
  });

  it('rejects a path that no rule matches', () => {
    const r = matchAllow('src/pages/index.astro', 'update', RULES);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no-match');
  });

  it('permits an image within maxBytes', () => {
    const r = matchAllow(
      'src/content/case-studies/bourgeois-louise/images/maman.jpg',
      'create',
      RULES,
      1_000_000,
    );
    expect(r.ok).toBe(true);
  });

  it('rejects an image over maxBytes', () => {
    const r = matchAllow(
      'src/content/case-studies/bourgeois-louise/images/maman.jpg',
      'create',
      RULES,
      6_000_000,
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('over-max-bytes');
  });
});

describe('matchDeny', () => {
  const DENY = [
    'src/pages/**',
    'src/components/**',
    'src/content.config.ts',
    'astro.config.*',
    'package.json',
    '.github/**',
    '.env*',
  ];

  it('flags a route file', () => {
    expect(matchDeny('src/pages/index.astro', DENY)).toBe(true);
    expect(matchDeny('src/pages/case-studies/[slug].astro', DENY)).toBe(true);
  });

  it('flags a component', () => {
    expect(matchDeny('src/components/ui/StatusBadge.astro', DENY)).toBe(true);
  });

  it('flags the schema file', () => {
    expect(matchDeny('src/content.config.ts', DENY)).toBe(true);
  });

  it('flags astro config variants', () => {
    expect(matchDeny('astro.config.mjs', DENY)).toBe(true);
    expect(matchDeny('astro.config.ts', DENY)).toBe(true);
  });

  it('flags .env files', () => {
    expect(matchDeny('.env', DENY)).toBe(true);
    expect(matchDeny('.env.production', DENY)).toBe(true);
  });

  it('flags .github workflows', () => {
    expect(matchDeny('.github/workflows/deploy.yml', DENY)).toBe(true);
  });

  it('lets a page-collection path through', () => {
    expect(matchDeny('src/content/pages/about.md', DENY)).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════
// checkPatchOverlap
// ═════════════════════════════════════════════════════════════════════════

describe('checkPatchOverlap', () => {
  const FILE = 'The quick brown fox jumps over the lazy dog.\nLine two.\nLine three.';

  it('returns ok with empty ranges for zero edits', () => {
    expect(checkPatchOverlap(FILE, [])).toEqual({ ok: true, ranges: [] });
  });

  it('returns ok for a single unique match', () => {
    const r = checkPatchOverlap(FILE, [{ old_str: 'quick brown', new_str: 'slow red' }]);
    expect(r.ok).toBe(true);
    expect(r.ranges).toHaveLength(1);
    expect(r.ranges![0]!.start).toBe(4);
    expect(r.ranges![0]!.end).toBe(15);
  });

  it('reports not-found for a missing string', () => {
    const r = checkPatchOverlap(FILE, [
      { old_str: 'purple elephant', new_str: 'blue whale' },
    ]);
    expect(r.ok).toBe(false);
    expect(r.reason).toEqual({ kind: 'not-found', editIndex: 0 });
  });

  it('reports not-found for an empty old_str', () => {
    const r = checkPatchOverlap(FILE, [{ old_str: '', new_str: 'x' }]);
    expect(r.ok).toBe(false);
    expect(r.reason).toEqual({ kind: 'not-found', editIndex: 0 });
  });

  it('reports multiple-matches with the correct count', () => {
    const r = checkPatchOverlap(FILE, [{ old_str: 'Line', new_str: 'Row' }]);
    expect(r.ok).toBe(false);
    expect(r.reason).toEqual({ kind: 'multiple-matches', editIndex: 0, matchCount: 2 });
  });

  it('accepts two disjoint edits', () => {
    const r = checkPatchOverlap(FILE, [
      { old_str: 'quick brown fox', new_str: 'slow red fox' },
      { old_str: 'lazy dog', new_str: 'happy cat' },
    ]);
    expect(r.ok).toBe(true);
    expect(r.ranges).toHaveLength(2);
    // Sorted descending by start for back-to-front application.
    expect(r.ranges![0]!.start).toBeGreaterThan(r.ranges![1]!.start);
  });

  it('accepts two adjacent (touching) edits as non-overlapping', () => {
    // "ab" then "cd" in "abcd" — adjacent, not overlapping.
    const src = 'abcdef';
    const r = checkPatchOverlap(src, [
      { old_str: 'ab', new_str: 'AB' },
      { old_str: 'cd', new_str: 'CD' },
    ]);
    expect(r.ok).toBe(true);
  });

  it('rejects overlapping edits', () => {
    const src = 'the quick brown fox';
    const r = checkPatchOverlap(src, [
      { old_str: 'the quick brown', new_str: 'a slow red' },
      { old_str: 'quick brown fox', new_str: 'fast tan cat' },
    ]);
    expect(r.ok).toBe(false);
    expect(r.reason?.kind).toBe('overlap');
  });

  it('rejects fully-nested overlapping edits', () => {
    const src = 'the quick brown fox';
    const r = checkPatchOverlap(src, [
      { old_str: 'the quick brown fox', new_str: 'a slow red cat' },
      { old_str: 'quick', new_str: 'fast' },
    ]);
    expect(r.ok).toBe(false);
    expect(r.reason?.kind).toBe('overlap');
  });

  it('reports the correct edit index on the first failure', () => {
    const r = checkPatchOverlap(FILE, [
      { old_str: 'quick brown', new_str: 'slow red' },   // 0 ok
      { old_str: 'not present', new_str: 'x' },          // 1 fails
    ]);
    expect(r.ok).toBe(false);
    expect(r.reason).toEqual({ kind: 'not-found', editIndex: 1 });
  });
});

// ═════════════════════════════════════════════════════════════════════════
// applyPatches — verifies apply-back-to-front doesn't corrupt offsets
// ═════════════════════════════════════════════════════════════════════════

describe('applyPatches', () => {
  it('applies a single edit', () => {
    const src = 'the quick brown fox';
    const edits = [{ old_str: 'quick brown', new_str: 'slow red' }];
    const check = checkPatchOverlap(src, edits);
    expect(check.ok).toBe(true);
    expect(applyPatches(src, edits, check.ranges!)).toBe('the slow red fox');
  });

  it('applies two disjoint edits with different lengths correctly', () => {
    // The classic offset-shift trap. If we naively applied earliest-first
    // without recomputing offsets, edit 2 would land in the wrong place.
    const src = 'aaa BBB ccc DDD eee';
    const edits = [
      { old_str: 'BBB', new_str: 'B' },   // shrinks — earliest
      { old_str: 'DDD', new_str: 'DDDDDDDDDDDD' }, // grows — latest
    ];
    const check = checkPatchOverlap(src, edits);
    expect(check.ok).toBe(true);
    // Apply LAST-first so the earlier edit doesn't have its offset shift.
    expect(applyPatches(src, edits, check.ranges!)).toBe(
      'aaa B ccc DDDDDDDDDDDD eee',
    );
  });

  it('applies an empty-string replacement as a delete', () => {
    const src = 'the quick brown fox';
    const edits = [{ old_str: ' brown', new_str: '' }];
    const check = checkPatchOverlap(src, edits);
    expect(check.ok).toBe(true);
    expect(applyPatches(src, edits, check.ranges!)).toBe('the quick fox');
  });

  it('handles three interleaved edits', () => {
    const src = 'ONE two THREE four FIVE';
    const edits = [
      { old_str: 'ONE', new_str: '1' },
      { old_str: 'THREE', new_str: '3' },
      { old_str: 'FIVE', new_str: '5' },
    ];
    const check = checkPatchOverlap(src, edits);
    expect(check.ok).toBe(true);
    expect(applyPatches(src, edits, check.ranges!)).toBe('1 two 3 four 5');
  });

  it('leaves the file untouched when edits array is empty', () => {
    const src = 'nothing to change here';
    const check = checkPatchOverlap(src, []);
    expect(applyPatches(src, [], check.ranges!)).toBe(src);
  });
});
