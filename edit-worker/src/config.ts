// Per-site AI editor config for Rannia.ArtSite.
//
// When this pattern productises across other clients, everything except the
// literals here (patterns, emails, limits, field rules) becomes generic. This
// file becomes the per-site override that each client repo ships alongside
// the Worker code.

import type { AllowRule, DenyPattern } from './types';

export interface FieldRules {
  /**
   * Frontmatter fields the AI can never change. On update, must equal
   * current value. On create, must equal the schema default (which for
   * every `status` in this repo is `'draft'` — enforcing the create-only
   * draft rule without a separate force-draft step).
   *
   * Dotted paths supported: `artworks.0.image.src`, `consent.onFile`.
   * Bracket-wildcard: `artworks[*].image.rightsBasis`.
   */
  locked: readonly string[];
  /** Optional per-field minimums, e.g. `{ 'artworks[*].image.alt': 20 }`. */
  minLen?: Record<string, number>;
}

export interface EditorConfig {
  /** Repo the Worker writes to. */
  repo: string;
  /** Base branch for reads. Edits branch from here. */
  baseBranch: string;
  /** Publish branch. Reviewed edits merge here (v1: manual). */
  liveBranch: string;

  allow: readonly AllowRule[];
  deny: readonly DenyPattern[];

  fieldRules: Record<string, FieldRules>;

  limits: {
    /** Hard cap on Anthropic output tokens per call. */
    perRequestOutputTokens: number;
    /** Per-session-per-day. Keyed by JWT subject. */
    perSessionRequests: number;
    /** Reject any single text file larger than this. */
    perFileBytes: number;
    /** Reject a batch with more files than this. */
    perBatchFiles: number;
    /** Reject a single image larger than this. */
    perImageBytes: number;
    /** Reject a request with more images than this. */
    perRequestImages: number;
  };

  /** Anthropic model id. */
  model: string;
}

export const CONFIG: EditorConfig = {
  repo: '12c4IT/Rannia.ArtSite',
  baseBranch: 'main',
  liveBranch: 'live',

  allow: [
    { pattern: 'src/content/pages/**/*.md',                                actions: ['create', 'update'] },
    { pattern: 'src/content/case-studies/*/index.mdx',                     actions: ['update'] },
    { pattern: 'src/content/case-studies/*/images/*.{png,jpg,jpeg,webp}',  actions: ['create', 'update'], maxBytes: 5_000_000 },
    { pattern: 'src/content/lessons/**/*.mdx',                             actions: ['create', 'update'] },
    { pattern: 'src/content/glossary/*.md',                                actions: ['create', 'update'] },
    { pattern: 'src/content/practice-questions/*.md',                      actions: ['create', 'update'] },
    { pattern: 'src/content/command-words/*.md',                           actions: ['update'] },
    { pattern: 'public/uploads/*.{png,jpg,jpeg,webp}',                     actions: ['create', 'update'], maxBytes: 5_000_000 },
  ],

  deny: [
    'src/pages/**',
    'src/components/**',
    'src/layouts/**',
    'src/styles/**',
    'src/content.config.ts',
    'src/lib/**',
    'src/env.d.ts',
    'astro.config.*',
    'tailwind.config.*',
    'tsconfig.json',
    'package.json',
    'package-lock.json',
    'netlify.toml',
    '.github/**',
    '.env*',
    'docs/**',
    'tasks/**',
    'ai-editor.config.ts',
    'edit-worker/**',
    // Real HSC questions — HUMAN-ONLY (verbatim rule).
    'src/content/questions/**',
    // BOW bodies — HUMAN-ONLY (consent records, real students).
    // Image writes to BOW image folders are blocked implicitly (no allow rule
    // for them either — no accidental widening later).
    'src/content/body-of-works/**/*.mdx',
    'src/content/body-of-works/**/*.md',
  ],

  fieldRules: {
    'case-studies': {
      locked: [
        'status',
        'lastReviewed',
        'reviewedBy',
        'sources',
        'artist.name',
        'artist.nationality',
        'artist.birthYear',
        'artist.deathYear',
        'artworks[*].title',
        'artworks[*].year',
        'artworks[*].medium',
        'artworks[*].dimensions',
        'artworks[*].collection',
        'artworks[*].image.src',
        'artworks[*].image.rightsBasis',
        'artworks[*].image.sourceUrl',
      ],
      minLen: { 'artworks[*].image.alt': 20 },
    },
    lessons: {
      locked: ['status', 'lastReviewed', 'reviewedBy', 'sources'],
    },
    glossary: {
      locked: ['slug', 'status'],
    },
    pages: {
      locked: ['status', 'lastReviewed'],
    },
    'practice-questions': {
      locked: ['id', 'status', 'lastReviewed', 'reviewedBy'],
    },
    'command-words': {
      locked: [
        'term',
        'slug',
        'alarmsRung',
        'definition',
        'sources',
        'status',
        'lastReviewed',
        'reviewedBy',
      ],
    },
  },

  limits: {
    perRequestOutputTokens: 2_000,
    perSessionRequests: 50,
    perFileBytes: 200_000,
    perBatchFiles: 20,
    perImageBytes: 5_000_000,
    perRequestImages: 4,
  },

  model: 'claude-sonnet-5',
};
