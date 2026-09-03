// Astro content collection definitions.
//
// Schemas themselves live in src/lib/content-schemas.ts as factories that
// take Astro's `image()` helper as a parameter. This file wires them into
// Astro's collection loader (glob() with the underscore-prefix exclusion
// for template files).
//
// The AI editor Worker has a parallel copy at `edit-worker/src/schemas.ts`
// using plain `zod` — the two files must stay in sync. See PLAN.md for why
// we duplicated instead of sharing (Astro 6 bundles zod v4 internally,
// which conflicts with the top-level zod install).
//
// Run `npx astro sync` after any change here to regenerate types.

import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  commandWordsSchema,
  glossarySchema,
  lessonsSchema,
  makeBodyOfWorksSchema,
  makeCaseStudySchema,
  makeQuestionsSchema,
  pagesSchema,
  practiceQuestionsSchema,
} from './lib/content-schemas';

// Re-export the enums for use elsewhere in the app (badges, page filters).
export {
  AlarmsRung,
  BowMedium,
  ContentArea,
  Frame,
  PracticeQuestionSource,
  PracticeType,
  QuestionType,
  RightsBasis,
  Status,
} from './lib/content-schemas';

// Exclude files/dirs whose name starts with `_` (templates) from every glob.
const NOT_UNDERSCORED = '**/[!_]*.{md,mdx}';

// ─── Collections ──────────────────────────────────────────────────────

const caseStudies = defineCollection({
  loader: glob({
    pattern: NOT_UNDERSCORED,
    base: './src/content/case-studies',
    generateId: ({ entry }) => entry.replace(/\.mdx?$/, '').replace(/\/index$/, ''),
  }),
  // Adapt Astro's `image()` (returns an ImageMetadata Zod type) to the
  // ImageValidator shape the shared schema expects. The shared type is
  // deliberately loose (`z.ZodType<unknown>`) so it accepts either the real
  // image helper here or a plain string stub in the Worker.
  schema: ({ image }) => makeCaseStudySchema(() => image()),
});

const lessons = defineCollection({
  loader: glob({ pattern: NOT_UNDERSCORED, base: './src/content/lessons' }),
  schema: lessonsSchema,
});

const questions = defineCollection({
  loader: glob({ pattern: NOT_UNDERSCORED, base: './src/content/questions' }),
  schema: ({ image }) => makeQuestionsSchema(() => image()),
});

const glossary = defineCollection({
  loader: glob({ pattern: NOT_UNDERSCORED, base: './src/content/glossary' }),
  schema: glossarySchema,
});

const pages = defineCollection({
  loader: glob({ pattern: NOT_UNDERSCORED, base: './src/content/pages' }),
  schema: pagesSchema,
});

const bodyOfWorks = defineCollection({
  loader: glob({
    pattern: NOT_UNDERSCORED,
    base: './src/content/body-of-works',
    generateId: ({ entry }) => entry.replace(/\.mdx?$/, '').replace(/\/index$/, ''),
  }),
  schema: ({ image }) => makeBodyOfWorksSchema(() => image()),
});

const practiceQuestions = defineCollection({
  loader: glob({ pattern: NOT_UNDERSCORED, base: './src/content/practice-questions' }),
  schema: practiceQuestionsSchema,
});

const commandWords = defineCollection({
  loader: glob({ pattern: NOT_UNDERSCORED, base: './src/content/command-words' }),
  schema: commandWordsSchema,
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
