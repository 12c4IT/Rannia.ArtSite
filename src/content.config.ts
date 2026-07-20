// Astro content collection schemas — Content Layer API (Astro 6).
//
// Migrated from the planning package's `schemas/content-config.ts`, which was
// written against the legacy (Astro 4) collections API before the Content Layer
// shipped. The Zod shapes are unchanged; only the collection definitions now use
// `loader: glob(...)` and the `image()` helper for local image references.
//
// This file is the canonical schema. Run `npx astro sync` after any change to
// regenerate types.

import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
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

// Body of Works media categories — mirrors the tabs Rannia asked for in the
// student BOW gallery (Client note ①).
const BowMedium = z.enum([
  'painting',
  'drawing',
  'sculpture',
  'ceramics',
  'photography',
  'time-based',
  'digital',
  'collection-of-works',
]);

// ALARMS matrix rungs (Delany College taxonomy — Client note ③). Terms cluster
// by cognitive demand; the exact rung for each term is set per-entry once Joe
// supplies the Delany source.
const AlarmsRung = z.enum([
  'a-analyse',
  'l-locate',
  'a-apply',
  'r-relate',
  'm-monitor',
  's-synthesise',
]);

// Practice question source — kept separate from real past-HSC questions so the
// verbatim/citation rules on real HSC don't leak into synthesised practice.
const PracticeQuestionSource = z.enum([
  'trial-paper',
  'practice-generator-5',
  'practice-generator-8',
  'practice-generator-10',
  'daily-short-answer',
  'other',
]);

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

// Annotation of a single feature within an artwork image — a labelled
// observation students can hover/tap on. Coords are optional so we can render
// annotations as a captioned list even without hotspots (Client note: "add
// images for the artworks and annotations of them").
const AnnotationSchema = z.object({
  label: z.string(),
  note: z.string(),
  // Percentage coords into the source image, 0–100. Optional: entries without
  // coords render as a numbered list below the image.
  x: z.number().min(0).max(100).optional(),
  y: z.number().min(0).max(100).optional(),
});

const artwork = (image: ImageFn) =>
  z.object({
    title: z.string(),
    year: z.union([z.number(), z.string()]),
    medium: z.string(),
    dimensions: z.string().optional(),
    collection: z.string().optional(),
    image: imageBlock(image),
    annotations: z.array(AnnotationSchema).default([]),
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
      // Recurring subject matter across the practice (e.g. maternal body,
      // memory, place, cultural translation). Short phrases, not paragraphs.
      themes: z.array(z.string()).default([]),
      // Materials/processes/methods the artist is known for. Feeds the artist
      // page's Techniques section (Client note ④).
      techniques: z.array(z.string()).default([]),
      // Sample question + worked answer pairs specific to this artist. Kept
      // separate from real past-HSC questions in the `questions` collection;
      // these are teacher-authored practice tied to the case study
      // (Client note ④ — "Sample questions and [answers]").
      sampleQuestionsAndAnswers: z
        .array(
          z.object({
            question: z.string(),
            markValue: z.number().int().positive().optional(),
            frames: z.array(Frame).default([]),
            workedAnswer: z.string(),
            markersNote: z.string().optional(),
            // Optional prompt students can copy to their own LLM to generate
            // a variant question tailored to this artist. Keep self-contained
            // so it works standalone. Mirrors practice-questions.variantPrompt.
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

// ─── Body of Works — student BOW gallery (Client note ①) ───────────────
// Every entry MUST record explicit written consent from the student (and
// guardian if under 18) before it can move off draft. `consent.onFile`
// gates publication; the site build excludes drafts from production.
const bodyOfWorks = defineCollection({
  loader: glob({
    pattern: NOT_UNDERSCORED,
    base: './src/content/body-of-works',
    generateId: ({ entry }) => entry.replace(/\.mdx?$/, '').replace(/\/index$/, ''),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      studentDisplayName: z.string(), // pseudonym or first-name-only; never full name unless explicit consent
      yearGraduated: z.number().int().min(2000).max(2100),
      medium: BowMedium,
      // Marker-band context; optional because not every school-cleared example
      // will have a public band attached.
      band: z.number().int().min(1).max(6).optional(),
      shortPitch: z.string().min(40).max(280),
      heroImage: imageBlock(image),
      // Additional plates / process shots for the gallery entry.
      additionalImages: z.array(imageBlock(image)).default([]),
      concept: z.string(),
      materials: z.array(z.string()).default([]),
      frames: z.array(Frame).default([]),
      practice: z.string(),
      whyScoredHighly: z.string(),
      thingsToLearn: z.array(z.string()).default([]),
      // Consent record — required. Every field must be present before Joe
      // sets status: published.
      consent: z.object({
        onFile: z.boolean(),
        signedBy: z.string(), // student name (and guardian name if <18) — for the record, not for display
        dateSigned: z.date(),
        allowsFullName: z.boolean().default(false),
        notes: z.string().optional(),
      }),
      sources: z.array(SourceSchema).default([]),
      status: Status.default('draft'),
      lastReviewed: z.date(),
      reviewedBy: z.string(),
    }),
});

// ─── Practice questions (Client note ②) ─────────────────────────────────
// Distinct from the strict `questions` collection (real past HSC, verbatim
// only, must cite NESA). Practice questions are teacher-authored or
// generator-seeded and don't require a NESA source URL.
const practiceQuestions = defineCollection({
  loader: glob({ pattern: NOT_UNDERSCORED, base: './src/content/practice-questions' }),
  schema: z.object({
    id: z.string(),
    text: z.string(),
    marks: z.number().int().positive(),
    source: PracticeQuestionSource,
    frames: z.array(Frame).default([]),
    contentAreas: z.array(ContentArea).default([]),
    // Prompt students can copy to paste into their own LLM to generate a
    // fresh variant. Optional — populated when the entry is intended as a
    // generator seed rather than a fixed practice question.
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
  }),
});

// ─── Command words / ALARMS matrix (Client note ③) ─────────────────────
// One entry per directive verb (Analyse, Explain, Evaluate, Discuss,
// Account for, Justify, Compare, Assess). Content stays as `draft` until
// Joe supplies the Delany College source to transcribe from.
const commandWords = defineCollection({
  loader: glob({ pattern: NOT_UNDERSCORED, base: './src/content/command-words' }),
  schema: z.object({
    term: z.string(), // "Analyse", "Evaluate", …
    slug: z.string(), // kebab-case
    alarmsRung: AlarmsRung.optional(),
    definition: z.string(),
    // Plain-English gloss for students beyond the syllabus glossary line.
    studentGloss: z.string(),
    // Worked example: a real (or teacher-authored) question using this verb
    // and a model paragraph that answers it, with a marker's note.
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
  }),
});

export const collections = {
  'case-studies': caseStudies,
  lessons,
  questions,
  glossary,
  pages,
  'body-of-works': bodyOfWorks,
  'practice-questions': practiceQuestions,
  'command-words': commandWords,
};

// Re-export enums for use elsewhere in the app
export {
  Frame,
  ContentArea,
  QuestionType,
  PracticeType,
  RightsBasis,
  Status,
  BowMedium,
  AlarmsRung,
  PracticeQuestionSource,
};
