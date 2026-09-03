// Worker-side copy of the site's content-collection schemas.
//
// KEEP IN SYNC WITH src/lib/content-schemas.ts in the parent repo.
//
// Why duplicate: Astro 6 bundles its own zod (v4) internally and exposes it
// via `astro:schema`. That import doesn't exist in a Cloudflare Worker.
// Trying to reuse the site's schemas by installing zod at the repo root
// then importing from both places causes cross-version schema breakage
// (`keyValidator._parse is not a function` at Astro's collection loader).
// The Worker gets its own copy using plain zod. If either file changes,
// the other must too — the two-file test suite in worker/schemas.test.ts
// (TODO) will catch shape drift when it lands.
//
// See docs/ai-editor/PLAN.md §"Schema extraction" for full context.

import { z } from 'zod';

// ─── Shared enums ─────────────────────────────────────────────────────

export const Frame = z.enum(['subjective', 'cultural', 'structural', 'postmodern']);

export const ContentArea = z.enum([
  'the-body',
  'place',
  'identity',
  'time',
  'memory',
  'objects',
  'nature',
  'technology',
  'spirituality',
  'the-everyday',
  'other',
]);

export const QuestionType = z.enum([
  'short-answer',
  'extended-response',
  'plate-based-short',
  'plate-based-extended',
]);

export const PracticeType = z.enum(['artmaking', 'art-criticism', 'art-history']);

export const BowMedium = z.enum([
  'painting',
  'drawing',
  'sculpture',
  'ceramics',
  'photography',
  'time-based',
  'digital',
  'collection-of-works',
]);

export const AlarmsRung = z.enum([
  'name-and-identify',
  'describe',
  'explain',
  'analyse',
  'evaluate',
]);

export const PracticeQuestionSource = z.enum([
  'trial-paper',
  'practice-generator-5',
  'practice-generator-8',
  'practice-generator-10',
  'daily-short-answer',
  'other',
]);

export const RightsBasis = z.enum([
  'public-domain',
  'cc-by',
  'cc-by-sa',
  'cc-by-nc',
  'cc0',
  'wikimedia-commons',
  'institutional-open-access',
  'educational-fair-dealing',
  'licensed',
]);

export const Status = z.enum(['draft', 'review', 'published']);

// ─── Reusable shapes ──────────────────────────────────────────────────

export const SourceSchema = z.object({
  id: z.string(),
  type: z.enum([
    'gallery-catalogue',
    'museum-page',
    'artist-statement',
    'interview',
    'book',
    'journal-article',
    'news-article',
    'nesa-paper',
    'nesa-marking-guide',
    'documentary',
    'other',
  ]),
  title: z.string(),
  author: z.string(),
  publisher: z.string().optional(),
  year: z.union([z.number(), z.string()]),
  url: z.string().url().optional(),
  pages: z.string().optional(),
  // Dates come out of YAML as strings on the Worker side. Coerce so the
  // schema accepts either a Date or an ISO/YYYY-MM-DD string.
  accessed: z.coerce.date().optional(),
  notes: z.string().optional(),
});

// The image() call in Astro validates a filesystem path and returns an
// ImageMetadata object. The Worker can't reach the filesystem, so the image
// field is just a non-empty string ('./images/foo.jpg' or 'src/content/...').
// Downstream: the worker verifies the path exists in the same commit's
// tree (either just-uploaded via multipart, or already in the repo).
const imageStub = () => z.string().min(1);

export const ImageBlock = z.object({
  src: imageStub(),
  alt: z.string().min(20, 'Alt text must describe artist, title, year, medium'),
  caption: z.string(),
  artist: z.string(),
  title: z.string(),
  year: z.union([z.number(), z.string()]),
  medium: z.string(),
  dimensions: z.string().optional(),
  collection: z.string().optional(),
  photoCredit: z.string(),
  rightsBasis: RightsBasis,
  rightsNotes: z.string().optional(),
  sourceUrl: z.string().url(),
});

export const FrameReadingsSchema = z.object({
  subjective: z.string(),
  cultural: z.string(),
  structural: z.string(),
  postmodern: z.string(),
});

export const AnnotationSchema = z.object({
  label: z.string(),
  note: z.string(),
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
});

export const Artwork = z.object({
  title: z.string(),
  year: z.union([z.number(), z.string()]),
  medium: z.string(),
  dimensions: z.string().optional(),
  collection: z.string().optional(),
  image: ImageBlock,
  annotations: z.array(AnnotationSchema).default([]),
  frames: FrameReadingsSchema,
  notes: z.string().optional(),
});

// ─── Collection schemas ──────────────────────────────────────────────

export const caseStudiesSchema = z.object({
  title: z.string(),
  artist: z.object({
    name: z.string(),
    nationality: z.string(),
    birthYear: z.number(),
    deathYear: z.number().nullable(),
    pronouns: z.string().optional(),
  }),
  primaryFrame: Frame,
  secondaryFrames: z.array(Frame).default([]),
  contentAreas: z.array(ContentArea),
  practiceType: PracticeType.default('artmaking'),
  shortPitch: z.string().min(40).max(280),
  heroImageRef: z.string(),
  artworks: z.tuple([Artwork, Artwork]),
  conceptualFramework: z.object({
    artist: z.string(),
    artwork: z.string(),
    world: z.string(),
    audience: z.string(),
  }),
  themes: z.array(z.string()).default([]),
  techniques: z.array(z.string()).default([]),
  sampleQuestionsAndAnswers: z
    .array(
      z.object({
        question: z.string(),
        markValue: z.number().int().positive().optional(),
        frames: z.array(Frame).default([]),
        workedAnswer: z.string(),
        markersNote: z.string().optional(),
        variantPrompt: z.string().optional(),
      })
    )
    .default([]),
  linkedQuestionIds: z.array(z.string()).default([]),
  linkedLessonSlugs: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).min(1, 'At least one source is required'),
  status: Status.default('draft'),
  lastReviewed: z.coerce.date(),
  reviewedBy: z.string(),
  contentWarnings: z.array(z.string()).optional(),
});

export const lessonsSchema = z.object({
  title: z.string(),
  yearLevel: z.union([z.literal(11), z.literal(12)]),
  durationMinutes: z.number(),
  walt: z.array(z.string()).min(1),
  wilf: z.array(z.string()).min(1),
  priorKnowledge: z.array(z.string()).default([]),
  vocabulary: z.array(z.string()).default([]),
  linkedCaseStudySlugs: z.array(z.string()).default([]),
  questionScaffolds: z
    .array(
      z.object({
        questionId: z.string(),
        additionalScaffold: z.string().optional(),
      })
    )
    .default([]),
  sources: z.array(SourceSchema).default([]),
  status: Status.default('draft'),
  lastReviewed: z.coerce.date(),
  reviewedBy: z.string(),
});

export const questionsSchema = z.object({
  id: z.string(),
  year: z.number().int().min(1990).max(2100),
  paper: z.literal('visual-arts'),
  section: z.enum(['I', 'II']),
  questionNumber: z.string(),
  marks: z.number().int().positive(),
  text: z.string(),
  stimulus: z
    .object({
      hasPlate: z.boolean(),
      plateDescription: z.string().optional(),
      plateImage: ImageBlock.optional(),
    })
    .optional(),
  frames: z.array(Frame).default([]),
  contentAreas: z.array(ContentArea).default([]),
  questionType: QuestionType,
  scaffold: z.object({
    decode: z.string(),
    plan: z.string(),
    sentenceStems: z.array(z.string()).default([]),
    markersView: z.string(),
    exemplarStructure: z.string(),
  }),
  linkedCaseStudySlugs: z.array(z.string()).default([]),
  source: z.object({
    url: z.string().url(),
    type: z.literal('nesa-paper'),
  }),
  status: Status.default('draft'),
  lastReviewed: z.coerce.date(),
  reviewedBy: z.string(),
});

export const glossarySchema = z.object({
  term: z.string(),
  slug: z.string(),
  shortDefinition: z.string(),
  relatedFrames: z.array(Frame).default([]),
  relatedTerms: z.array(z.string()).default([]),
  status: Status.default('draft'),
});

export const pagesSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  order: z.number().optional(),
  status: Status.default('draft'),
  lastReviewed: z.coerce.date().optional(),
});

export const bodyOfWorksSchema = z.object({
  title: z.string(),
  studentDisplayName: z.string(),
  yearGraduated: z.number().int().min(2000).max(2100),
  medium: BowMedium,
  band: z.number().int().min(1).max(6).optional(),
  shortPitch: z.string().min(40).max(280),
  heroImage: ImageBlock,
  additionalImages: z.array(ImageBlock).default([]),
  concept: z.string(),
  materials: z.array(z.string()).default([]),
  frames: z.array(Frame).default([]),
  practice: z.string(),
  whyScoredHighly: z.string(),
  thingsToLearn: z.array(z.string()).default([]),
  consent: z.object({
    onFile: z.boolean(),
    signedBy: z.string(),
    dateSigned: z.coerce.date(),
    allowsFullName: z.boolean().default(false),
    notes: z.string().optional(),
  }),
  sources: z.array(SourceSchema).default([]),
  status: Status.default('draft'),
  lastReviewed: z.coerce.date(),
  reviewedBy: z.string(),
});

export const practiceQuestionsSchema = z.object({
  id: z.string(),
  text: z.string(),
  marks: z.number().int().positive(),
  source: PracticeQuestionSource,
  frames: z.array(Frame).default([]),
  contentAreas: z.array(ContentArea).default([]),
  variantPrompt: z.string().optional(),
  scaffold: z
    .object({
      decode: z.string(),
      plan: z.string(),
      sentenceStems: z.array(z.string()).default([]),
      markersView: z.string(),
    })
    .optional(),
  linkedCaseStudySlugs: z.array(z.string()).default([]),
  status: Status.default('draft'),
  lastReviewed: z.coerce.date(),
  reviewedBy: z.string(),
});

export const commandWordsSchema = z.object({
  term: z.string(),
  slug: z.string(),
  alarmsRung: AlarmsRung.optional(),
  definition: z.string(),
  studentGloss: z.string(),
  workedExample: z.object({
    question: z.string(),
    markValue: z.number().int().positive().optional(),
    response: z.string(),
    markersNote: z.string(),
  }),
  relatedTerms: z.array(z.string()).default([]),
  sources: z.array(SourceSchema).default([]),
  status: Status.default('draft'),
  lastReviewed: z.coerce.date(),
  reviewedBy: z.string(),
});

/**
 * Look up the schema for a collection by id. Used by the Worker's validator
 * to run the right Zod schema against the parsed frontmatter of a written
 * file.
 */
export const SCHEMAS = {
  'case-studies': caseStudiesSchema,
  lessons: lessonsSchema,
  questions: questionsSchema,
  glossary: glossarySchema,
  pages: pagesSchema,
  'body-of-works': bodyOfWorksSchema,
  'practice-questions': practiceQuestionsSchema,
  'command-words': commandWordsSchema,
} as const;

export type CollectionId = keyof typeof SCHEMAS;

/**
 * Given a repo-relative path, infer which collection it belongs to.
 * Returns null for paths outside any content collection.
 */
export function collectionForPath(path: string): CollectionId | null {
  const match = path.match(/^src\/content\/([a-z-]+)\//);
  if (!match) return null;
  const id = match[1] as CollectionId;
  return id in SCHEMAS ? id : null;
}
