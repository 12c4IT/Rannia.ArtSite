# v1 Build Tasks

Ordered list for Claude Code. Tick items off as you go. Stop and ask Joe if any task is ambiguous.

Before starting **any** task: read `CLAUDE.md`, `PLAN.md`, and `CONTENT_GUIDELINES.md`. Confirm you understand the editorial constraints.

---

## Task 1 — Initialise Astro project

- [x] `npm create astro@latest .` — Empty, TypeScript Strict, install deps, **don't** init git. (Non-empty-dir guard scaffolded into `./spiffy-shell`; hoisted to root.) Installed **Astro 6**.
- [x] `npx astro add tailwind` — Tailwind CSS 4 (via `@tailwindcss/vite`).
- [x] `npx astro add mdx` — MDX integration.
- [x] `npx astro add sitemap` — sitemap integration.
- [x] Install dev deps: `pagefind`, `@astrojs/check`, `prettier`, `prettier-plugin-astro`, `prettier-plugin-tailwindcss`.
- [x] Migrate `schemas/content-config.ts` → `src/content.config.ts`, rewritten for the Content Layer API (`glob()` loaders, `image()` refs). `npx astro sync` clean.
- [x] **Deleted `schemas/` folder** (superseded by `src/content.config.ts`). Commit `chore: remove superseded planning schema`.
- [x] Set `output: 'static'` in `astro.config.mjs`. Configure site URL (placeholder `https://example.com`).
- [x] Verify `compilerOptions.strict` in `tsconfig.json` (extends `astro/tsconfigs/strict`).
- [x] Add `npm` scripts: `dev`, `build`, `preview`, `lint`, `format`, `search`, `postbuild`. (+`.prettierrc.mjs` so plugins load.)
- [x] Commit: `feat: initialise astro project` (preceded by `chore: add planning package baseline`).

## Task 2 — Move planning content into place

- [ ] Move `content/case-studies/_TEMPLATE.mdx` → `src/content/case-studies/_TEMPLATE.mdx`.
- [ ] Move `content/lessons/_TEMPLATE.mdx` → `src/content/lessons/_TEMPLATE.mdx`.
- [ ] Move `content/hsc-questions/_TEMPLATE.md` → `src/content/questions/_TEMPLATE.md`.
- [ ] Move `content/pages/*.md` → `src/content/pages/*.md`.
- [ ] Delete the now-empty top-level `content/` folder.
- [ ] Update the case study `_TEMPLATE.mdx` image paths to the co-located `./images/...` form (folder-per-entry per design decision #3).
- [ ] Confirm the content collection **excludes files starting with `_`** so templates don't generate routes (handled by the `glob()` pattern `**/[!_]*.{md,mdx}`).
- [ ] `npx astro sync` — generates the content collection types. Verify no schema errors.
- [ ] Commit: `feat: add content collections and templates`.

## Task 3 — Design system foundation

- [x] Pick fonts: **Newsreader** (display) + **Hanken Grotesk** (body) + **IBM Plex Mono** (labels). Joe-approved.
- [x] Self-host fonts in `public/fonts/` (subsetted woff2, latin + latin-ext, OFL-1.1 attributed). `@font-face` in `src/styles/global.css`.
- [x] Design tokens as CSS custom properties + Tailwind 4 `@theme`:
  - Colour: Palette A "Gallery" — `--paper`, `--ink`, `--accent`, four `--f-*` frame tones (light + dark).
  - Type scale: fluid `clamp()` headings, fixed 17px body.
  - Spacing: 4px grid (Tailwind default). Radius 2px; hairline rules over shadows.
- [x] Dark mode via `prefers-color-scheme` + manual toggle persisted in `localStorage` (no-FOUC inline script).
- [x] `<BaseLayout>` Astro component: `<head>`, header, footer, slot, skip link, landmarks.
- [x] Header: wordmark ("Visual Arts" placeholder), nav (no-JS disclosure on mobile / inline desktop), search placeholder, theme toggle, 1px `--rule` bottom rule.
- [x] Footer: AI disclosure, takedown contact link, last-built timestamp.
- [ ] Commit: `feat: design system foundation`.

## Task 4 — Design comp pass

**Purpose**: lock in the visual design before building Astro components. Iterate cheaply at the HTML stage.

**Gated on Joe.** Joe reviews each comp on phone and desktop. Do **not** proceed to building Astro pages (Task 5 onward) until Joe approves.

**Reference comp**: `docs/sample-preview.html` (the Bourgeois case study detail render) is the canonical aesthetic anchor — editorial / gallery, Fraunces + IBM Plex Sans (or the equivalent distinctive pair committed in Task 3), restrained palette, image-led, considered spacing. Re-read the `frontend-design` skill before starting.

Deliverables — one self-contained HTML file each, written to `docs/comps/`:

- [x] `docs/comps/home.html`
- [x] `docs/comps/case-studies-index.html` — filterable card grid
- [x] `docs/comps/frame-detail.html` — use `cultural` as the example frame
- [x] `docs/comps/lesson.html` — WALT/WILF block + one `QuestionScaffold`
- [x] `docs/comps/question-detail.html` — collapsible scaffold
- [x] `docs/comps/glossary.html`

Client-review additions (2026-07-20 — Rannia's handwritten notes):

- [ ] `docs/comps/body-of-works.html` — student BOW gallery landing, cards by medium (Client note ①)
- [ ] `docs/comps/practice.html` — practice hub with generator UI + copy-prompt buttons (Client note ②)
- [ ] `docs/comps/command-words.html` — ALARMS matrix landing + one worked-verb detail (Client note ③)
- [ ] `docs/comps/ai-tutor.html` — v1 static prompt library, v2 stub explanation (Client note ⑤)

Each comp must:

- Use the design tokens from Task 3 (CSS custom properties, **not** hard-coded values, so changes propagate when we componentise).
- Match `sample-preview.html`'s typography, palette, density and tone.
- Render mobile-readable (test at **380px** viewport) and desktop.
- Use the same image-placeholder pattern as `sample-preview.html` for any artwork imagery.
- Include realistic placeholder content (**not** Lorem Ipsum) so Joe can judge density and tone.

- [ ] Commit: `docs: design comps`.

## Task 5 — Build the explainer pages

- [ ] Build `src/pages/index.astro` — home. Hero, intro, four-frame cards, featured case study slot (placeholder until content exists).
- [ ] **REMOVE** the Task 3 shell-disclosure copy from `index.astro` (the `.shell-note` paragraph + its `TODO(Task 5)` comment) when building the real home.
- [ ] Build `src/pages/conceptual-framework.astro` reading the `pages` collection entry.
- [ ] Build `src/pages/frames/index.astro` and `src/pages/frames/[frame].astro`.
- [ ] Extend each `src/content/pages/frames/[frame].md` (or the equivalent per-frame content entry) with a **worked example** that answers the frame's guiding questions in the format Rannia asked for — question + Band 6 response + marker's note. Client note (2026-07-20): "In the frames section add more information format with a worked example that answers the questions".
- [ ] Build `src/pages/practice.astro`.
- [ ] Build `src/pages/about.astro`.
- [ ] Commit: `feat: explainer pages`.

## Task 6 — Case study template

- [ ] Build component `src/components/case-study/ConceptualFrameworkSummary.astro`.
- [ ] Build component `src/components/case-study/ArtworkBlock.astro` (image + caption + four-frame tabs/accordion + **annotations panel** with optional x/y hotspots).
- [ ] Build component `src/components/case-study/FrameBadge.astro`.
- [ ] Build component `src/components/case-study/ContentAreaBadge.astro`.
- [ ] Build component `src/components/case-study/ThemesTechniques.astro` — renders artist-page `themes` and `techniques` arrays (Client note ④).
- [ ] Build component `src/components/case-study/SampleQuestionsAndAnswers.astro` — collapsible per-question worked answer + marker's note (Client note ④).
- [ ] Build component `src/components/ui/SourceCite.astro` (inline `[^id]` rendered as superscript + popover).
- [ ] Build component `src/components/ui/LastReviewed.astro`.
- [ ] Build component `src/components/ui/StatusBadge.astro` (only renders in non-prod).
- [ ] Build `src/pages/case-studies/index.astro` — filterable index.
- [ ] Build `src/pages/case-studies/[slug].astro` — the flagship template.
- [ ] Commit: `feat: case study template`.

## Task 7 — Lesson and question templates

- [ ] Build component `src/components/lesson/WaltWilf.astro`.
- [ ] Build component `src/components/lesson/QuestionScaffold.astro`.
- [ ] Build `src/pages/lessons/index.astro` and `src/pages/lessons/[slug].astro`.
- [ ] Build `src/pages/questions/index.astro`.
- [ ] Build `src/pages/questions/by-frame/[frame].astro`.
- [ ] Build `src/pages/questions/by-content-area/[area].astro`.
- [ ] Build `src/pages/questions/by-year/[year].astro`.
- [ ] Build `src/pages/questions/by-type/[type].astro`.
- [ ] Build `src/pages/questions/[id].astro`.
- [ ] Commit: `feat: lesson and question templates`.

## Task 7a — Body of Works gallery (Client note ①)

Rannia supplies content + consent. This task builds the *shell*.

- [ ] Build `src/pages/body-of-works/index.astro` — landing page grouped by medium (painting, drawing, sculpture, ceramics, photography, time-based, digital, collection-of-works). Filter chips.
- [ ] Build `src/pages/body-of-works/[medium].astro` — medium-specific listing.
- [ ] Build `src/pages/body-of-works/[slug].astro` — individual student example. Renders concept, materials, frames, practice, whyScoredHighly, thingsToLearn, image gallery.
- [ ] Build component `src/components/bow/BowCard.astro`.
- [ ] Build component `src/components/bow/BowMediumBadge.astro`.
- [ ] Enforce publication gate: entries with `status: published` AND `consent.onFile: true` only.
- [ ] Commit: `feat: body of works gallery`.

## Task 7b — Practice hub (Client note ②)

Static, no LLM. `variantPrompt` field powers a copy-to-clipboard button for students to use in their own tools.

- [ ] Build `src/pages/practice/index.astro` — hub cards for daily / 5 / 8 / 10 / trial.
- [ ] Build `src/pages/practice/daily.astro` — one short-answer per day (deterministic per date, no JS shuffling needed).
- [ ] Build `src/pages/practice/generator/[marks].astro` — random-draw client-side from `practice-questions` filtered by marks (5, 8, or 10). "Re-roll" button.
- [ ] Build `src/pages/practice/trial.astro` — trial-paper questions listing.
- [ ] Build `src/pages/questions/by-topic.astro` — HSC questions grouped by content area (Rannia specifically called this out).
- [ ] Build component `src/components/practice/CopyPromptButton.astro` — clipboard button on any question with a `variantPrompt`.
- [ ] Commit: `feat: practice hub`.

## Task 7c — Command Words / ALARMS matrix (Client note ③)

**Gated on Joe supplying the Delany College ALARMS matrix source.** Build the shell now; transcribe content when Joe delivers.

- [ ] Build `src/pages/command-words/index.astro` — matrix landing. Grid of the eight verbs (Analyse, Explain, Evaluate, Discuss, Account for, Justify, Compare, Assess).
- [ ] Build `src/pages/command-words/[slug].astro` — individual verb page with definition, student gloss, worked example.
- [ ] Once Joe supplies the Delany matrix: create one draft entry per verb in `src/content/command-words/` using the template.
- [ ] Commit: `feat: command words page`.

## Task 7d — AI Art Tutor stub (Client note ⑤ — v2)

v1 ships a **static prompt library**. Live AI backend is deferred to v2 per CLAUDE.md.

- [ ] Build `src/pages/ai-tutor.astro` — explanation of what the v2 tutor will do, plus a static, copyable prompt library covering:
  - Paragraph feedback against HSC criteria
  - BOW photo critique (composition / technique / concept)
  - Practice question generation (with the disclaimer that guidance ≠ marking)
  - Band 6 response scaffolding
- [ ] Log v2 build ticket in `ROADMAP.md` for the live-backend version.
- [ ] Commit: `feat: ai tutor stub`.

## Task 8 — Glossary, references, 404

- [ ] Build `src/pages/glossary.astro` — aggregated alphabetised list from the `glossary` collection.
- [ ] Build `src/pages/references.astro` — walks every collection's `sources`, dedupes, sorts by author.
- [ ] Build `src/pages/404.astro` — friendly, with search.
- [ ] Commit: `feat: glossary and references`.

## Task 9 — Search

- [ ] Wire Pagefind into the layout: search input in header opens a modal with live results.
- [ ] Confirm `npm run build` produces a Pagefind index in `dist/pagefind/`.
- [ ] Verify search returns case studies, lessons, questions, and glossary entries.
- [ ] Commit: `feat: pagefind search`.

## Task 10 — Deploy

- [ ] Create `.github/workflows/azure-static-web-apps.yml` (use the Azure Static Web Apps GitHub action template; Joe will supply the deployment token as a repo secret).
- [ ] Verify build succeeds with zero published content (the production build should produce explainer pages only and exclude all `draft` entries).
- [ ] Joe deploys to a staging Static Web App. Verify it serves correctly.
- [ ] Commit: `chore: deployment workflow`.

## Task 11 — First case study (gated on Joe)

**Pause here.** Joe selects one artist from the proposed list (`docs/proposed-case-studies.md`) and supplies starting sources. Then:

- [ ] Read Joe's supplied sources thoroughly.
- [ ] Draft `src/content/case-studies/[artist-slug].mdx` from the template. `status: draft`.
- [ ] Source and add two images. Document rights basis for each.
- [ ] Draft 2–4 real past HSC questions (`src/content/questions/hsc-YYYY-sX-qN.md`) tied to the case study. Transcribe verbatim from NESA.
- [ ] Draft one lesson (`src/content/lessons/[artist-slug]-lesson-01.mdx`) with WALT/WILF/scaffolds.
- [ ] Open a PR. Joe reviews. Iterate.
- [ ] Merge when Joe sets `status: published` on all three.

## Task 12 — Polish (pre-launch)

- [ ] Accessibility audit with axe-core or similar. Fix issues. Target WCAG 2.2 AA.
- [ ] Lighthouse audit on mobile. Target 95+ all four categories.
- [ ] Print stylesheet for case studies and lessons.
- [ ] Open Graph image generation per case study at build time.
- [ ] RSS feed for case studies.
- [ ] Revisit the `npm audit` moderate advisories from the scaffold.
- [ ] Commit: `chore: polish for launch`.

## Task 13 — Repeat for remaining seven case studies

Each follows the Task 11 pattern. One PR per case study.

---

## Stop-and-ask triggers

Pause and ask Joe before proceeding when:

- A source can't be found for a factual claim.
- An image's rights status is unclear.
- The syllabus interpretation seems out of date.
- A feature you're considering isn't explicitly in `PLAN.md` or `tasks/v1-build-tasks.md`.
- You'd be adding a JavaScript framework, a database, an API, or auth.
- A case study's `status` would change.
