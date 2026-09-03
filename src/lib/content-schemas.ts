// Content-collection schemas, extracted from src/content.config.ts so they
// can be imported by the site's Astro build. The AI editor Worker has its
// own duplicate at `edit-worker/src/schemas.ts` — the two files must stay
// in sync when either is edited. See docs/ai-editor/PLAN.md §"Schema
// extraction" for why we split rather than share: Astro 6 bundles zod v4
// internally and exposes it via `astro:schema`, while the Worker runtime
// uses plain zod. Mixing versions inside Astro's collection loader breaks
// with `keyValidator._parse is not a function`. Duplicating the ~250-line
// schema is cheaper than debugging cross-runtime zod version drift on
// every future edit.

import { z } from 'astro:schema';

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
  accessed: z.date().optional(),
  notes: z.string().optional(),
});

/**
 * Image validator factory type. At the site, this is Astro's real `image()`
 * which validates the file exists at build time and returns an ImageMetadata
 * shape. At the Worker, this is a stub that just checks the string is
 * non-empty — the Worker can't reach the file system.
 */
export type ImageValidator = () => z.ZodType<unknown>;

export const makeImageBlock = (image: ImageValidator) =>
  z.object({
    src: image(),
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

export const makeArtwork = (image: ImageValidator) =>
  z.object({
    title: z.string(),
    year: z.union([z.number(), z.string()]),
    medium: z.string(),
    dimensions: z.string().optional(),
    collection: z.string().optional(),
    image: makeImageBlock(image),
    annotations: z.array(AnnotationSchema).default([]),
    frames: FrameReadingsSchema,
    notes: z.string().optional(),
  });

// ─── Collection schema factories ──────────────────────────────────────

export const makeCaseStudySchema = (image: ImageValidator) =>
  z.object({
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
    artworks: z.tuple([makeArtwork(image), makeArtwork(image)]),
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
    lastReviewed: z.date(),
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
  lastReviewed: z.date(),
  reviewedBy: z.string(),
});

export const makeQuestionsSchema = (image: ImageValidator) =>
  z.object({
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
        plateImage: makeImageBlock(image).optional(),
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
    lastReviewed: z.date(),
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
  lastReviewed: z.date().optional(),
});

export const makeBodyOfWorksSchema = (image: ImageValidator) =>
  z.object({
    title: z.string(),
    studentDisplayName: z.string(),
    yearGraduated: z.number().int().min(2000).max(2100),
    medium: BowMedium,
    band: z.number().int().min(1).max(6).optional(),
    shortPitch: z.string().min(40).max(280),
    heroImage: makeImageBlock(image),
    additionalImages: z.array(makeImageBlock(image)).default([]),
    concept: z.string(),
    materials: z.array(z.string()).default([]),
    frames: z.array(Frame).default([]),
    practice: z.string(),
    whyScoredHighly: z.string(),
    thingsToLearn: z.array(z.string()).default([]),
    consent: z.object({
      onFile: z.boolean(),
      signedBy: z.string(),
      dateSigned: z.date(),
      allowsFullName: z.boolean().default(false),
      notes: z.string().optional(),
    }),
    sources: z.array(SourceSchema).default([]),
    status: Status.default('draft'),
    lastReviewed: z.date(),
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
  lastReviewed: z.date(),
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
  lastReviewed: z.date(),
  reviewedBy: z.string(),
});

/**
 * Convenience: map from collection id to schema factory (or plain schema).
 * The Worker uses this to look up the right validator by collection name.
 * Non-image collections have a `schema` property; image ones have `make`.
 */
export const SCHEMAS = {
  'case-studies': { make: makeCaseStudySchema },
  lessons: { schema: lessonsSchema },
  questions: { make: makeQuestionsSchema },
  glossary: { schema: glossarySchema },
  pages: { schema: pagesSchema },
  'body-of-works': { make: makeBodyOfWorksSchema },
  'practice-questions': { schema: practiceQuestionsSchema },
  'command-words': { schema: commandWordsSchema },
} as const;

export type CollectionId = keyof typeof SCHEMAS;
