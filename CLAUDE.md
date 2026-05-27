# CLAUDE.md

Instructions for Claude Code working on this project. Read this first, every session.

## What this project is

A static educational website for NSW Stage 6 Visual Arts students (Preliminary + HSC). Read `PLAN.md` for the full architectural plan. Read `CONTENT_GUIDELINES.md` for the editorial policy — that one is binding.

## Who you're working with

Joe, the author/teacher. He's a senior .NET developer (20 years) — speak technically, don't over-explain web basics. He uses Australian English. Default to clarifying questions before large changes per his stated preference.

## Hard rules

1. **Never publish AI-drafted content as fact.** Every case study entry has `status: draft | review | published` in its frontmatter. Default is `draft`. Only Joe sets `published`. The site build excludes `draft` content from production output.
2. **Every factual claim must cite a source.** When drafting case study content, include a `sources:` array in frontmatter and inline reference markers `[^1]` in MDX where claims are made. If you can't find a real source, say so — do not invent one.
3. **No fabricated quotes.** If you can't find a real quote with a citable source, don't include one.
4. **Images.** Never embed an image without recording its rights basis in the artwork's frontmatter (`rightsBasis: public-domain | cc-by | cc-by-sa | educational-fair-dealing | licensed`) and source URL.
5. **Australian English.** "Colour", "centre", "analyse", "practise" (verb) / "practice" (noun), etc.
6. **No tracking, no third-party scripts** without Joe's explicit say-so.

## Tech stack

- **Astro 5** (static site generator). Read the Astro docs if you need to — don't guess at the API.
- **TypeScript** strict mode.
- **Tailwind CSS 4**. Configure via `@import "tailwindcss"` in the global CSS; no `tailwind.config.js` unless plugins are needed.
- **Astro Content Collections** with Zod schemas defined in `src/content/config.ts`. Schemas are mirrored/derived from `schemas/content-config.ts` in the planning package.
- **MDX** for case studies and lessons. Plain Markdown for static pages and individual questions.
- **Pagefind** for search (built statically after Astro build).
- **Deploy target**: Azure Static Web Apps via GitHub Actions.

## Design direction

See `PLAN.md` §8 and consult your `frontend-design` skill. Editorial / gallery aesthetic. NOT generic edtech. Distinctive serif display font + refined sans body (NOT Inter, NOT Roboto). One accent colour. Image-led. Dark mode supported.

When making design choices, commit to them. Don't produce three variants of everything.

## File and folder layout (target, once Astro is initialised)

```
src/
├── content/
│   ├── config.ts                  # Zod schemas (from schemas/content-config.ts)
│   ├── case-studies/              # MDX case study files
│   ├── lessons/                   # MDX lesson files
│   ├── questions/                 # MD HSC question files (one per question)
│   ├── glossary/                  # MD glossary entries
│   └── pages/                     # MD for the explainer pages
├── components/
│   ├── layout/
│   ├── case-study/                # FrameAnalysis, ArtworkBlock, ConceptualFrameworkSummary
│   ├── lesson/                    # WaltWilf, QuestionScaffold
│   └── ui/
├── layouts/
├── pages/
└── styles/
public/
├── images/                        # case study images, organised by artist slug
└── fonts/                         # self-hosted fonts
```

## Conventions

- **Slugs**: kebab-case, artist surname first for case studies (e.g. `bourgeois-louise`). Lesson slugs: `[case-study-slug]-lesson-NN`.
- **Image filenames**: `[artwork-slug]-[size].webp` where size is one of `thumb`, `med`, `full`.
- **Commit messages**: conventional commits (`feat:`, `fix:`, `content:`, `docs:`).
- **PRs**: one case study per PR. Joe reviews and merges.
- **Branch protection**: `main` is protected; everything goes through a PR.

## Working with content

When Joe asks you to draft a case study:
1. Ask which sources he wants you to work from. **Do not start drafting from your training data alone** — that's exactly the failure mode this project is built to avoid.
2. Read the supplied sources (he'll point to URLs, PDFs, or paste excerpts).
3. Draft into `src/content/case-studies/[slug].mdx` with `status: draft` and `sources:` filled in.
4. Flag any claim you can't source with `{/* TODO: source needed */}` rather than guessing.
5. Open a PR. Don't merge.

When Joe asks you to add an HSC question:
1. Get the year, paper section, question number, marks from him or from the NESA PDF.
2. Transcribe the question text **verbatim** — no paraphrasing.
3. Add `source:` linking to the NESA past paper.
4. Draft a scaffold using the `QuestionScaffold` component fields (decode, plan, sentence stems, marker's view).

## Tasks

The `tasks/` folder contains ordered task lists. Start with `tasks/v1-build-tasks.md`. Tick items off as you complete them.

## When you're unsure

Ask. Don't guess. Especially:
- Image rights status
- Whether a source is reliable
- Whether a syllabus interpretation is current
- Whether a feature belongs in v1 or v2

## What not to do

- Don't add a database, API, or auth in v1.
- Don't add JavaScript-heavy interactive widgets unless they earn their keep pedagogically.
- Don't use Inter, Roboto, system fonts for body type, or purple-on-white gradients (per frontend-design skill — generic AI aesthetic).
- Don't paraphrase HSC questions. Verbatim only.
- Don't embed images you haven't sourced and rights-checked.
- Don't add analytics, fingerprinting, or third-party trackers.
- Don't break the content schema without updating `schemas/content-config.ts` and `src/content/config.ts` together.
