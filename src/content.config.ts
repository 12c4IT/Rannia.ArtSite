// Astro content collection schemas — Content Layer API (Astro 6).
//
// Migrated from the planning package's `schemas/content-config.ts`, which was
// written against the legacy (Astro 4) collections API before the Content Layer
// shipped. The Zod shapes are unchanged; only the collection definitions now use
// `loader: glob(...)` and the `image()` helper for local image references.
//
// This file is the canonical schema. Run `npx astro sync` after any change to
// regenerate types.

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import type { SchemaContext } from 'astro:content';

type ImageFn = SchemaContext['image'];

// ---------- Shared enums ----------

const Frame = z.enum(['subjective', 'cultural', 'structural', 'postmodern']);

const ContentArea = z.enum([
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

const QuestionType = z.enum([
  'short-answer',
  'extended-response',
  'plate-based-short',
  'plate-based-extended',
]);

const PracticeType = z.enum(['artmaking', 'art-criticism', 'art-history']);

const RightsBasis = z.enum([
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

const Status = z.enum(['draft', 'review', 'published']);

// ---------- Reusable shapes ----------

const SourceSchema = z.object({
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

// `image()` validates and transforms a local image reference (e.g. a path like
// `./images/maman.jpg` co-located with the entry) into an ImageMetadata object
// at build time. It is only available inside a collection's schema context, so
// shapes that embed an image are defined as factories taking the image helper.
const imageBlock = (image: ImageFn) =>
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

const FrameReadingsSchema = z.object({
  subjective: z.string(),
  cultural: z.string(),
  structural: z.string(),
  postmodern: z.string(),
});

const artwork = (image: ImageFn) =>
  z.object({
    title: z.string(),
    year: z.union([z.number(), z.string()]),
    medium: z.string(),
    dimensions: z.string().optional(),
    collection: z.string().optional(),
    image: imageBlock(image),
    frames: FrameReadingsSchema,
    notes: z.string().optional(),
  });

// Exclude files/dirs whose name starts with `_` (templates) from every glob so
// they never generate routes.
const NOT_UNDERSCORED = '**/[!_]*.{md,mdx}';

// ---------- Collections ----------

const caseStudies = defineCollection({
  // Folder-per-entry: src/content/case-studies/<slug>/index.mdx, with images
  // co-located under <slug>/images/. Map `<slug>/index` -> `<slug>`.
  loader: glob({
    pattern: NOT_UNDERSCORED,
    base: './src/content/case-studies',
    generateId: ({ entry }) => entry.replace(/\.mdx?$/, '').replace(/\/index$/, ''),
  }),
  schema: ({ image }) =>
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
      heroImageRef: z.string(), // 'artwork-1' | 'artwork-2' | 'custom'
      artworks: z.tuple([artwork(image), artwork(image)]),
      conceptualFramework: z.object({
        artist: z.string(),
        artwork: z.string(),
        world: z.string(),
        audience: z.string(),
      }),
      linkedQuestionIds: z.array(z.string()).default([]),
      linkedLessonSlugs: z.array(z.string()).default([]),
      sources: z.array(SourceSchema).min(1, 'At least one source is required'),
      status: Status.default('draft'),
      lastReviewed: z.date(),
      reviewedBy: z.string(),
      contentWarnings: z.array(z.string()).optional(),
    }),
});

const lessons = defineCollection({
  loader: glob({ pattern: NOT_UNDERSCORED, base: './src/content/lessons' }),
  schema: z.object({
    title: z.string(),
    yearLevel: z.union([z.literal(11), z.literal(12)]),
    durationMinutes: z.number(),
    walt: z.array(z.string()).min(1),
    wilf: z.array(z.string()).min(1),
    priorKnowledge: z.array(z.string()).default([]),
    vocabulary: z.array(z.string()).default([]), // glossary slugs
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
  }),
});

const questions = defineCollection({
  loader: glob({ pattern: NOT_UNDERSCORED, base: './src/content/questions' }),
  schema: ({ image }) =>
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
          plateImage: imageBlock(image).optional(),
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
    }),
});

const glossary = defineCollection({
  loader: glob({ pattern: NOT_UNDERSCORED, base: './src/content/glossary' }),
  schema: z.object({
    term: z.string(),
    slug: z.string(),
    shortDefinition: z.string(),
    relatedFrames: z.array(Frame).default([]),
    relatedTerms: z.array(z.string()).default([]),
    status: Status.default('draft'),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: NOT_UNDERSCORED, base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().optional(),
    status: Status.default('draft'),
    lastReviewed: z.date().optional(),
  }),
});

export const collections = {
  'case-studies': caseStudies,
  lessons,
  questions,
  glossary,
  pages,
};

// Re-export enums for use elsewhere in the app
export { Frame, ContentArea, QuestionType, PracticeType, RightsBasis, Status };
