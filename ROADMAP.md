# Roadmap

## v1 — Brochure (current scope)

A read-only, fast, static educational resource. No accounts. No tracking. Just content.

Delivery target: live site with the eight starting case studies, their lessons, and ~30 tagged HSC questions, hosted on Azure Static Web Apps.

## v1.5 — Polish (after v1 launches)

- Pagefind search refinement
- Glossary cross-linking from MDX
- Accessibility audit (WCAG 2.2 AA)
- Performance audit (Lighthouse 95+ all categories on mobile)
- Open Graph images per case study (auto-generated at build)
- RSS feed of new/updated case studies
- Print stylesheet (kids will want to print)

## v2 — Student accounts (future)

The migration plan, in rough order.

### Stage 1: Backend foundation

- New repo or `apps/web` workspace inside this one.
- **ASP.NET Core 9 + Razor Pages**. PostgreSQL on Azure Database for PostgreSQL Flexible Server. Identity for auth.
- **Content stays as Markdown/MDX**. Read it at build/runtime via a Markdown parser (Markdig in .NET). Same frontmatter schemas, mirrored as C# DTOs.
- Site renders server-side via Razor; static-like CDN caching for anonymous traffic via Azure Front Door.

### Stage 2: Identity

- Student accounts. School-email-only signup with allow-listed domains (or invite codes per class).
- No social logins initially.
- Two roles: `Student`, `Teacher`. (Joe is `Admin`.)

### Stage 3: Student features

- **Bookmarks** — save case studies and questions.
- **Highlights** — highlight passages in MDX content (range-based, stored against entry slug + character offsets).
- **Notes** — personal notes per case study.
- **Attempts** — student writes a response to a question; system stores the draft and the final.
- **Self-marking** — student checks own work against the scaffold and exemplar structure; marks themselves on the scaffold criteria.

### Stage 4: Teacher features

- **Class roster** — invite students by class code.
- **Set tasks** — teacher assigns questions or case studies to a class with a due date.
- **Marking** — teacher views student attempts, leaves comments per paragraph, returns marks against the scaffold criteria.
- **Class dashboard** — completion rates, common scaffold criteria missed.

### Stage 5: Author tooling

- Admin UI for Joe to author/edit case studies in the browser without leaving the site.
- Image upload with mandatory rights-basis form.
- Draft preview link he can share with a colleague before publishing.

### What stays the same

- The four frames, conceptual framework, practice — these are the spine.
- Markdown/MDX as the content format.
- Frontmatter schemas (extended, not rewritten).
- The editorial policy in `CONTENT_GUIDELINES.md`.

### What changes

- Renderer: Astro → ASP.NET Core / Razor.
- Hosting: Azure Static Web Apps → Azure App Service + Azure Database for PostgreSQL.
- Identity: none → ASP.NET Core Identity.
- Search: Pagefind → server-side (Postgres full-text search, or Meilisearch if scope grows).

### Cost shape (rough)

- v1: $0–$10/mo (Azure Static Web Apps free tier).
- v2: ~$30–$60/mo at low utilisation (App Service B1 + PG Flexible Burstable B1ms). Scales up if needed.

## v3 — Wishlist (no commitment)

- Body of Work portfolio module (image uploads, written rationale, mock submission).
- Spaced repetition for vocabulary/glossary terms.
- Practice exam timer with auto-saving response editor.
- LMS integration (Canvas, Google Classroom) via LTI.
- A mobile app wrapping the site (Capacitor or .NET MAUI).
