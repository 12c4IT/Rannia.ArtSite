# HSC Visual Arts

Student-facing resource site for NSW Stage 6 Visual Arts (Preliminary + HSC). Built with Astro, deployed as a static site.

## Quick start

```bash
# After Claude Code initialises the Astro project:
npm install
npm run dev          # local dev server at http://localhost:4321
npm run build        # production build to ./dist
npm run preview      # preview production build
npm run search       # rebuild Pagefind index (runs in postbuild)
```

## Project status

🚧 **In build.** The Astro project is scaffolded (Astro 6 + Tailwind 4 + MDX + sitemap, content schema migrated to the Content Layer API). Working through `tasks/v1-build-tasks.md`.

## What's here

| File | Purpose |
|---|---|
| `PLAN.md` | Master architectural plan — read this first |
| `CLAUDE.md` | Instructions for Claude Code, every session |
| `CONTENT_GUIDELINES.md` | **Binding** editorial policy — sourcing, citations, image rights |
| `ROADMAP.md` | v1 brochure → v2 logins migration path |
| `docs/` | Detailed design docs (site map, content model, page templates, proposed case studies) |
| `content/` | Content templates and starter content (will move to `src/content/` once Astro is initialised) |
| `src/content.config.ts` | Zod schemas for content collections — Content Layer API (canonical). Migrated from the planning package's legacy `schemas/content-config.ts`. |
| `tasks/v1-build-tasks.md` | Ordered task list for Claude Code to follow |

## Who this is for

NSW Stage 6 Visual Arts students. The course covers:

- **Conceptual Framework** — artist, artwork, world, audience
- **The Frames** — subjective, cultural, structural, postmodern
- **Practice** — artmaking practice, art criticism practice, art history practice

Every case study on this site analyses two artworks through all four frames and ties back to the conceptual framework.

## Working with Claude Code

```bash
# From the project root, after cloning:
claude
```

Then point it at `CLAUDE.md` and the current task list. Suggested first message:

> Read CLAUDE.md, then PLAN.md, then tasks/v1-build-tasks.md. Confirm you understand the editorial constraints before starting. Then begin task 1.

## Content authoring

Content lives in `src/content/`. Each entry has frontmatter (typed by Zod schemas) plus MDX/Markdown body. Workflow:

1. Branch from `main`.
2. Draft content with `status: draft`.
3. Open a PR. Claude Code may draft; Joe reviews.
4. Merge once `status: published` and all sources are verified.

## Deployment

Azure Static Web Apps. GitHub Actions workflow lives in `.github/workflows/azure-static-web-apps.yml` (Claude Code creates this in task 10).

## Licence

Site code: MIT. Site content: © Joe / authors of cited sources where applicable. Educational fair dealing claims documented per-image in `CONTENT_GUIDELINES.md`.
