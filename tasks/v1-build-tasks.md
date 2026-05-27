# v1 Build Tasks

Ordered list for Claude Code. Tick items off as you go. Stop and ask Joe if any task is ambiguous.

Before starting **any** task: read `CLAUDE.md`, `PLAN.md`, and `CONTENT_GUIDELINES.md`. Confirm you understand the editorial constraints.

---

## Task 1 — Initialise Astro project

- [ ] `npm create astro@latest .` — choose: Empty, TypeScript Strict, install dependencies, **don't** initialise git (this repo already exists).
- [ ] `npx astro add tailwind` — install Tailwind CSS 4 integration.
- [ ] `npx astro add mdx` — install MDX integration.
- [ ] `npx astro add sitemap` — install sitemap integration.
- [ ] Install dev deps: `pagefind`, `@astrojs/check`, `prettier`, `prettier-plugin-astro`, `prettier-plugin-tailwindcss`.
- [ ] Move `schemas/content-config.ts` to `src/content/config.ts`. Delete `schemas/` folder (it was for the planning package).
- [ ] Set `output: 'static'` in `astro.config.mjs`. Configure site URL.
- [ ] Set `compilerOptions.strict: true` in `tsconfig.json` (Astro template already does this; verify).
- [ ] Add `npm` scripts: `dev`, `build`, `preview`, `lint`, `format`, `search` (runs Pagefind on `dist/`), and a `postbuild` that runs `search`.
- [ ] Commit: `feat: initialise astro project`.

## Task 2 — Move planning content into place

- [ ] Move `content/case-studies/_TEMPLATE.mdx` → `src/content/case-studies/_TEMPLATE.mdx`.
- [ ] Move `content/lessons/_TEMPLATE.mdx` → `src/content/lessons/_TEMPLATE.mdx`.
- [ ] Move `content/hsc-questions/_TEMPLATE.md` → `src/content/questions/_TEMPLATE.md`.
- [ ] Move `content/pages/*.md` → `src/content/pages/*.md`.
- [ ] Delete the now-empty top-level `content/` folder.
- [ ] Configure the content collection to **exclude files starting with `_`** so templates don't generate routes.
- [ ] `npx astro sync` — generates the content collection types. Verify no schema errors.
- [ ] Commit: `feat: add content collections and templates`.

## Task 3 — Design system foundation

- [ ] Pick fonts per the `frontend-design` skill. Distinctive serif display + refined sans body. **Not Inter, not Roboto, not system-ui.** Suggestions: Fraunces / Source Serif Pro for display; Söhne / IBM Plex Sans / Inter Tight (no, not Inter family) — choose one and commit.
- [ ] Self-host fonts in `public/fonts/` using subsetted woff2 files. Add `@font-face` declarations in `src/styles/global.css`.
- [ ] Define CSS custom properties for the design tokens:
  - Colour: `--ink`, `--paper`, `--accent`, `--frame-subjective`, `--frame-cultural`, `--frame-structural`, `--frame-postmodern`, etc.
  - Type scale: fluid `clamp()`-based.
  - Spacing scale.
  - Radii, shadows.
- [ ] Add a dark mode via `prefers-color-scheme` and a manual toggle persisted in `localStorage`.
- [ ] Build a `<BaseLayout>` Astro component: `<head>`, header, footer, slot. Include semantic landmarks, skip link, theme toggle.
- [ ] Build header: logo wordmark, primary nav (Case Studies, Frames, Questions, Lessons, Glossary), search input.
- [ ] Build footer: AI disclosure, takedown contact link, last-built timestamp.
- [ ] Commit: `feat: design system foundation`.

## Task 4 — Build the explainer pages

- [ ] Build `src/pages/index.astro` — home. Hero, intro, four-frame cards, featured case study slot (placeholder until content exists).
- [ ] Build `src/pages/conceptual-framework.astro` reading the `pages` collection entry.
- [ ] Build `src/pages/frames/index.astro` and `src/pages/frames/[frame].astro`.
- [ ] Build `src/pages/practice.astro`.
- [ ] Build `src/pages/about.astro`.
- [ ] Commit: `feat: explainer pages`.

## Task 5 — Case study template

- [ ] Build component `src/components/case-study/ConceptualFrameworkSummary.astro`.
- [ ] Build component `src/components/case-study/ArtworkBlock.astro` (image + caption + four-frame tabs/accordion).
- [ ] Build component `src/components/case-study/FrameBadge.astro`.
- [ ] Build component `src/components/case-study/ContentAreaBadge.astro`.
- [ ] Build component `src/components/ui/SourceCite.astro` (inline `[^id]` rendered as superscript + popover).
- [ ] Build component `src/components/ui/LastReviewed.astro`.
- [ ] Build component `src/components/ui/StatusBadge.astro` (only renders in non-prod).
- [ ] Build `src/pages/case-studies/index.astro` — filterable index.
- [ ] Build `src/pages/case-studies/[slug].astro` — the flagship template.
- [ ] Commit: `feat: case study template`.

## Task 6 — Lesson and question templates

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

## Task 7 — Glossary, references, 404

- [ ] Build `src/pages/glossary.astro` — aggregated alphabetised list from the `glossary` collection.
- [ ] Build `src/pages/references.astro` — walks every collection's `sources`, dedupes, sorts by author.
- [ ] Build `src/pages/404.astro` — friendly, with search.
- [ ] Commit: `feat: glossary and references`.

## Task 8 — Search

- [ ] Wire Pagefind into the layout: search input in header opens a modal with live results.
- [ ] Confirm `npm run build` produces a Pagefind index in `dist/pagefind/`.
- [ ] Verify search returns case studies, lessons, questions, and glossary entries.
- [ ] Commit: `feat: pagefind search`.

## Task 9 — Deploy

- [ ] Create `.github/workflows/azure-static-web-apps.yml` (use the Azure Static Web Apps GitHub action template; Joe will supply the deployment token as a repo secret).
- [ ] Verify build succeeds with zero published content (the production build should produce explainer pages only and exclude all `draft` entries).
- [ ] Joe deploys to a staging Static Web App. Verify it serves correctly.
- [ ] Commit: `chore: deployment workflow`.

## Task 10 — First case study (gated on Joe)

**Pause here.** Joe selects one artist from the proposed list (`docs/proposed-case-studies.md`) and supplies starting sources. Then:

- [ ] Read Joe's supplied sources thoroughly.
- [ ] Draft `src/content/case-studies/[artist-slug].mdx` from the template. `status: draft`.
- [ ] Source and add two images. Document rights basis for each.
- [ ] Draft 2–4 real past HSC questions (`src/content/questions/hsc-YYYY-sX-qN.md`) tied to the case study. Transcribe verbatim from NESA.
- [ ] Draft one lesson (`src/content/lessons/[artist-slug]-lesson-01.mdx`) with WALT/WILF/scaffolds.
- [ ] Open a PR. Joe reviews. Iterate.
- [ ] Merge when Joe sets `status: published` on all three.

## Task 11 — Polish (pre-launch)

- [ ] Accessibility audit with axe-core or similar. Fix issues. Target WCAG 2.2 AA.
- [ ] Lighthouse audit on mobile. Target 95+ all four categories.
- [ ] Print stylesheet for case studies and lessons.
- [ ] Open Graph image generation per case study at build time.
- [ ] RSS feed for case studies.
- [ ] Commit: `chore: polish for launch`.

## Task 12 — Repeat for remaining seven case studies

Each follows the Task 10 pattern. One PR per case study.

---

## Stop-and-ask triggers

Pause and ask Joe before proceeding when:

- A source can't be found for a factual claim.
- An image's rights status is unclear.
- The syllabus interpretation seems out of date.
- A feature you're considering isn't explicitly in `PLAN.md` or `tasks/v1-build-tasks.md`.
- You'd be adding a JavaScript framework, a database, an API, or auth.
- A case study's `status` would change.
