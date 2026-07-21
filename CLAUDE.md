# CLAUDE.md

Instructions for Claude Code working on this project. Read this first, every session.

## What this project is

A static educational website for NSW Stage 6 Visual Arts students (Preliminary + HSC), built for Rannia. Read `PLAN.md` for the full architectural plan. Read `CONTENT_GUIDELINES.md` for the editorial policy — that one is binding.

## Who you're working with

Two roles, cleanly split:

- **Joe** — the developer. Senior .NET dev (20 years). Owns the schema, the site infrastructure, deploy config, and any code changes. Explicitly knows nothing about art content and should not be the reviewer on pedagogical claims. Speak technically; don't over-explain web basics. Australian English. Default to clarifying questions before large changes per his stated preference.
- **Rannia** — the teacher and pedagogical author. She owns the content — every case study, question, lesson, BOW entry, and command-word definition is hers to approve. She authors in-browser via a Bolt/Claude editing surface (see workflow below), not in a local IDE.

Content decisions (accuracy, syllabus interpretation, which sources to trust, when a case study is ready) belong to Rannia. Scope and infrastructure decisions (what features to build, what stack to use, deploy targets) belong to Joe.

## Hard rules

1. **Never publish AI-drafted content as fact.** Every case study entry has `status: draft | review | published` in its frontmatter. Default is `draft`. **Only Rannia sets `published`** — not Joe, not Claude, not Bolt. The site build excludes `draft` content from production output.
2. **Every factual claim must cite a source.** When drafting case study content, include a `sources:` array in frontmatter and inline reference markers `[^1]` in MDX where claims are made. If you can't find a real source, say so — do not invent one.
3. **No fabricated quotes.** If you can't find a real quote with a citable source, don't include one.
4. **Images.** Never embed an image without recording its rights basis in the artwork's frontmatter (`rightsBasis: public-domain | cc-by | cc-by-sa | educational-fair-dealing | licensed`) and source URL.
5. **Australian English.** "Colour", "centre", "analyse", "practise" (verb) / "practice" (noun), etc.
6. **No tracking, no third-party scripts** without Joe's explicit say-so.

## Tech stack

- **Astro 6** (static site generator). Read the Astro docs if you need to — don't guess at the API.
- **TypeScript** strict mode.
- **Tailwind CSS 4**. Configure via `@import "tailwindcss"` in the global CSS; no `tailwind.config.js` unless plugins are needed.
- **Astro Content Collections** (Content Layer API) with Zod schemas defined in `src/content.config.ts` — the canonical schema. It uses `glob()` loaders (underscore-prefixed files excluded so templates don't route) and the `image()` helper for co-located image refs. Migrated from the planning package's legacy-API `schemas/content-config.ts`, which is now superseded.
- **MDX** for case studies and lessons. Plain Markdown for static pages and individual questions.
- **Pagefind** for search (built statically after Astro build).
- **Deploy target**: Azure Static Web Apps via GitHub Actions.

## Design direction

See `PLAN.md` §8 and consult your `frontend-design` skill. Editorial / gallery aesthetic. NOT generic edtech. Distinctive serif display font + refined sans body (NOT Inter, NOT Roboto). One accent colour. Image-led. Dark mode supported.

When making design choices, commit to them. Don't produce three variants of everything.

## File and folder layout (target, once Astro is initialised)

```
src/
├── content.config.ts              # Zod schemas — Content Layer API (canonical)
├── content/
│   ├── case-studies/              # folder-per-entry: <slug>/index.mdx + images/
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
├── images/                        # global/site images only — case-study images co-locate under src/content/case-studies/<slug>/images/
└── fonts/                         # self-hosted fonts
```

## Conventions

- **Slugs**: kebab-case, artist surname first for case studies (e.g. `bourgeois-louise`). Lesson slugs: `[case-study-slug]-lesson-NN`.
- **Image filenames**: co-locate under the case study's `images/` folder, named by artwork slug (e.g. `maman.jpg`). `astro:assets` generates responsive `srcset`/formats at build — no manual `-thumb/-med/-full` variants.
- **Commit messages**: conventional commits (`feat:`, `fix:`, `content:`, `docs:`).
- **PRs**: one case study per PR. Joe reviews and merges.
- **Branch protection**: `main` is protected; everything goes through a PR.

## Working with content

Content requests will normally come from **Rannia**, either directly (if she's authoring via Bolt/Claude in-browser) or via Joe forwarding her ask.

When asked to draft a case study:
1. Ask which sources to work from. **Do not start drafting from your training data alone** — that's exactly the failure mode this project is built to avoid.
2. Read the supplied sources (URLs, PDFs, or pasted excerpts).
3. Draft into `src/content/case-studies/[slug]/index.mdx` with **`status: draft`** and `sources:` filled in. Set `reviewedBy: Rannia` (or the actual reviewer).
4. Flag any claim you can't source with `{/* TODO: source needed */}` rather than guessing.
5. Leave `status: draft`. **Rannia** flips it to `published` after review — not Joe, not you.

When asked to add an HSC question:
1. Get the year, paper section, question number, marks from the requester or from the NESA PDF.
2. Transcribe the question text **verbatim** — no paraphrasing.
3. Add `source:` linking to the NESA past paper.
4. Draft a scaffold using the `QuestionScaffold` component fields (decode, plan, sentence stems, marker's view).
5. Leave `status: draft`. Rannia reviews and publishes.

## Tasks

The `tasks/` folder contains ordered task lists. Start with `tasks/v1-build-tasks.md`. Tick items off as you complete them.

## When you're unsure

Ask. Don't guess. Especially:
- Image rights status → Rannia (she has the classroom / school licensing context)
- Whether a source is reliable → Rannia
- Whether a syllabus interpretation is current → Rannia
- Whether a feature belongs in v1 or v2 → Joe
- Any code / schema / deploy question → Joe

## What not to do

- Don't add a database, API, or auth in v1.
- Don't add JavaScript-heavy interactive widgets unless they earn their keep pedagogically.
- Don't use Inter, Roboto, system fonts for body type, or purple-on-white gradients (per frontend-design skill — generic AI aesthetic).
- Don't paraphrase HSC questions. Verbatim only.
- Don't embed images you haven't sourced and rights-checked.
- Don't add analytics, fingerprinting, or third-party trackers.
- Don't break the content schema without running `npx astro sync` to verify; `src/content.config.ts` is the canonical source.
