# HSC Visual Arts — Site Plan

A student-facing resource site for NSW Stage 6 Visual Arts (Preliminary + HSC), aligned to the current syllabus. Stage 1 is a **brochure/booklet site** — read-only, no login. Stage 2 (future) adds authenticated student accounts.

---

## 1. Goals

- A single, reliable resource where students can study fully-detailed, verified case studies analysed through the **Conceptual Framework**, **the Frames**, and **Practice**.
- Each case study contains **two artworks** with deep formal/contextual analysis.
- Real **HSC exam questions** (from past NESA papers) attached to each case study, plus a dedicated questions library indexed by frame, content area, year, and question type.
- **Lessons** for every case study, structured with WALT (Learning Intentions), WILF (Success Criteria), and **question scaffolds**.
- **100% verified content**, every claim cited, every image rights-cleared, every case study reviewed by Joe before publication.

## 2. Non-goals (Stage 1)

- No user accounts, progress tracking, comments, or submissions.
- No teacher dashboard.
- No AI-generated artist content presented as fact.
- No paid hosting tier — must run cheaply.

## 3. Audience

- Year 11 (Preliminary) and Year 12 (HSC) Visual Arts students.
- Mobile-first (students study on phones), but readable on desktop.
- Secondary: Joe (author/teacher) authoring and reviewing content.

## 4. Tech stack

| Concern | Choice | Rationale |
|---|---|---|
| Framework | **Astro 6** | Content-first, MDX support, fast static output, easy Markdown authoring, component islands when needed. Content Layer API (`glob()` loaders) for collections. |
| Language | TypeScript | Type-safe content schemas via Astro Content Collections |
| Styling | Tailwind CSS 4 | Utility-first, fast iteration, easy to keep typography editorial |
| Content | MDX (case studies, lessons) + Markdown (pages, questions) | MDX lets us embed analysis components (frame breakdowns, artwork blocks) inside prose |
| Search | Pagefind | Fully static, no backend, indexes at build time |
| Images | `astro:assets` (built-in, sharp) | Auto-optimised, responsive `srcset`, lazy loading. (`@astrojs/image` was removed; `astro:assets` replaces it.) Case-study images co-locate with each entry and are validated via the schema `image()` helper. |
| Hosting | **Azure Static Web Apps** | Fits Joe's existing Azure stack; free tier covers this; clean CI/CD from GitHub |
| Source control | GitHub | Content changes flow through PRs for review |
| Domain | TBC (suggest a memorable name, e.g. `hscvisualarts.com.au`) | |

**Why not ASP.NET Core for v1?** A static site is dramatically simpler for a content-only brochure: no servers, no database, no auth, sub-second page loads, $0 hosting. The migration path to v2 (dynamic + auth) is well-trodden: keep the content model identical, swap the renderer for ASP.NET Core 9 + Razor Pages + PostgreSQL when logins are added. Content lives as Markdown either way.

## 5. Site map

```
/                          Home — what this site is, how to use it
/conceptual-framework      Explainer: artist, artwork, world, audience
/frames                    Explainer: subjective, cultural, structural, postmodern
  /frames/subjective
  /frames/cultural
  /frames/structural
  /frames/postmodern
/practice                  Explainer: artmaking, art criticism, art history practice
/case-studies              Index of all case studies (filterable)
  /case-studies/[slug]     Individual case study (the core page)
/lessons                   Index of all lessons
  /lessons/[slug]          Individual lesson (WALT/WILF/scaffolds)
/questions                 HSC questions library (index)
  /questions/by-frame/[frame]
  /questions/by-content-area/[area]
  /questions/by-year/[year]
  /questions/by-type/[type]
  /questions/[id]          Individual question with scaffold + exemplar structure
/glossary                  Art terminology (linked from MDX content)
/references                Master bibliography and image credits
/about                     About the site, editorial policy, who Joe is
```

## 6. Page templates (Stage 1)

### Case Study page (the hero template)

```
┌──────────────────────────────────────────────────────────┐
│  Hero: artist name, dates, primary frame badge, 1 image  │
├──────────────────────────────────────────────────────────┤
│  Quick-nav (sticky on mobile): jump to sections          │
├──────────────────────────────────────────────────────────┤
│  Conceptual Framework summary                            │
│   ▸ Artist  ▸ Artwork  ▸ World  ▸ Audience              │
├──────────────────────────────────────────────────────────┤
│  Artist Practice (biography → process → materials)       │
├──────────────────────────────────────────────────────────┤
│  Artwork 1 — analysed through all four frames            │
│   • Image (rights-cleared)                               │
│   • Subjective reading                                   │
│   • Cultural reading                                     │
│   • Structural reading                                   │
│   • Postmodern reading                                   │
├──────────────────────────────────────────────────────────┤
│  Artwork 2 — analysed through all four frames            │
│   (same structure)                                       │
├──────────────────────────────────────────────────────────┤
│  Linked HSC questions (2–4 real past questions)          │
├──────────────────────────────────────────────────────────┤
│  Linked lessons                                          │
├──────────────────────────────────────────────────────────┤
│  References + image credits + last reviewed date         │
└──────────────────────────────────────────────────────────┘
```

### Lesson page

```
┌──────────────────────────────────────────────────────────┐
│  Title, year level, duration                             │
├──────────────────────────────────────────────────────────┤
│  Learning Intentions (WALT — "We are learning to…")      │
├──────────────────────────────────────────────────────────┤
│  Success Criteria (WILF — "What I'm Looking For…")       │
├──────────────────────────────────────────────────────────┤
│  Prior knowledge / vocabulary                            │
├──────────────────────────────────────────────────────────┤
│  Lesson body (activities, prompts, MDX content)          │
├──────────────────────────────────────────────────────────┤
│  Question scaffolds                                      │
│   For each linked question:                              │
│    • Decode the question (verbs, key terms)              │
│    • Plan (paragraph structure, frame mapping)           │
│    • Sentence stems / exemplar openings                  │
│    • Marker's view (what earns marks at each band)       │
├──────────────────────────────────────────────────────────┤
│  Linked case studies                                     │
└──────────────────────────────────────────────────────────┘
```

### HSC Question page

```
┌──────────────────────────────────────────────────────────┐
│  Year, paper, section, question number, marks            │
├──────────────────────────────────────────────────────────┤
│  Question text (verbatim from NESA)                      │
├──────────────────────────────────────────────────────────┤
│  Tagged: frame(s), content area, question type           │
├──────────────────────────────────────────────────────────┤
│  Scaffold (collapsible — students try first, then peek)  │
├──────────────────────────────────────────────────────────┤
│  Linked case studies that could anchor the response      │
├──────────────────────────────────────────────────────────┤
│  Source: link to NESA past paper PDF                     │
└──────────────────────────────────────────────────────────┘
```

## 7. Content model

Defined via Astro Content Collections with Zod schemas (see `schemas/content-config.ts`). Summary:

- **CaseStudy** — artist metadata, two artwork sub-entries, primary/secondary frames, content areas, sources, review status
- **Artwork** (nested in case study) — title, year, medium, dimensions, location, image, four-frame analysis blocks
- **Question** — year, paper, section, marks, frame tags, content area tags, question type, scaffold, exemplar structure, source URL
- **Lesson** — year level, duration, WALT, WILF, linked case studies, linked questions, scaffolds
- **GlossaryTerm** — term, definition, related frame
- **Reference** — citation in a consistent format

Every content entry has: `status` (draft/review/published), `lastReviewed`, `reviewedBy`. Only `published` items render in production builds.

## 8. Design direction

**Editorial / gallery, not edtech.** Think exhibition catalogue meets scholarly resource: generous typography, considered negative space, image-led, restrained colour palette with one accent. Mobile-first responsive. Dark mode toggle (art often photographs better against dark backgrounds).

- **Type**: A distinctive serif for headings (e.g. Fraunces, EB Garamond, or similar), a refined sans for body (not Inter). Decided at build time per frontend-design skill.
- **Colour**: Off-white / deep ink default. One accent colour. Frame badges use four distinct muted tones (one per frame).
- **Imagery**: Centre stage. Captions always include artist, title, year, medium, dimensions, collection, photo credit.
- **Motion**: Subtle. Scroll-revealed images. No bouncing or sliding-in nonsense.

## 9. Editorial policy (binding)

See `CONTENT_GUIDELINES.md`. Headline rules:

1. **No fabrication.** Every factual claim cites a source. AI-drafted content is a starting point only; nothing publishes without Joe's review.
2. **Image rights.** Use only: public domain, Creative Commons (correctly attributed), images licensed for educational use, or images covered by Australian fair dealing for research/study (with full attribution and minimum necessary resolution).
3. **Quotes.** Verbatim, attributed, with page/URL.
4. **Last reviewed.** Visible on every case study.

## 10. Initial case study slate (proposed)

A spread across the four frames and across Australian / international artists. **All of these are well-documented in published gallery materials, artist statements, and scholarly sources** — easy to cite. Final list is Joe's call. See `docs/proposed-case-studies.md` for the longer rationale per artist.

Suggested starting eight (two per frame as primary):

- **Subjective** — Louise Bourgeois; Bill Henson
- **Cultural** — Tracey Moffatt; Brook Andrew
- **Structural** — Rosalie Gascoigne; Anish Kapoor
- **Postmodern** — Yasumasa Morimura; Imants Tillers

Eight is a sensible v1 launch number — meaningful coverage without drowning in authoring work. Aim for 16 by end of Year 12.

## 11. Build phases

**Phase 1 — Scaffold (1 session)**
- Initialise Astro project, Tailwind, content collections, schemas
- Build site shell: header, footer, layout, typography
- Empty index pages for case studies, questions, lessons
- Deploy to Azure Static Web Apps with GitHub Actions

**Phase 2 — Content templates (1 session)**
- Build the three core page templates (case study, lesson, question)
- Build the conceptual framework + frames + practice explainer pages
- Build the glossary and references pages

**Phase 3 — First case study end-to-end (1 session)**
- Joe selects one artist, supplies source material
- Author one full case study with both artworks
- Author one matching lesson with scaffolds
- Add 2–4 real past HSC questions tied to it

**Phase 4 — Fill the slate**
- Repeat Phase 3 across the eight starting artists

**Phase 5 — Polish**
- Pagefind search
- 404, sitemap, RSS for new case studies, OG images
- Accessibility audit (WCAG 2.2 AA)
- Performance audit (Lighthouse 95+)

## 12. v2 roadmap (future)

See `ROADMAP.md` for the full path. Headline: migrate the static renderer to ASP.NET Core 9 + Razor Pages + PostgreSQL on Azure, keeping the Markdown/MDX content unchanged. Add Identity for student accounts, then: bookmarks, highlights, practice attempts, teacher-set tasks, marking feedback.

## 13. Risks and mitigations

| Risk | Mitigation |
|---|---|
| AI-generated content presented as fact | `status: draft` by default; only `published` renders; Joe reviews every entry |
| Image copyright issues | Strict policy in `CONTENT_GUIDELINES.md`; prefer public domain / CC / institutional educational licences; document the rights basis on every image |
| Syllabus changes | Content is structured around stable syllabus concepts (frames, conceptual framework, practice) — these have been the spine of NSW VA syllabus for many years |
| Content authoring effort | Phased rollout (eight, not eighty); MDX components keep each case study repeatable |
| Hosting cost creep | Azure Static Web Apps free tier; no database in v1 |
