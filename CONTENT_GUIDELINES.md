# Content Guidelines

**This document is binding.** It governs every case study, lesson, question, image, and quote on the site. Claude Code is instructed in `CLAUDE.md` to follow it; Joe enforces it at PR review.

The site claims "100% real, fully verified" content. If we can't keep that promise on a single entry, we don't publish that entry.

---

## 1. Sourcing

### 1.1 Acceptable sources

In rough order of preference:

1. **Primary sources** — the artist's own writing, interviews, public statements, exhibition catalogues authored by or with the artist.
2. **Institutional sources** — major gallery and museum catalogue entries: AGNSW, MCA, NGA, NGV, AGSA, Tate, MoMA, Guggenheim, Museum of Contemporary Art Australia, etc. These are written by curators with subject expertise and a reputation to protect.
3. **Peer-reviewed scholarly sources** — books and journal articles from university presses and recognised art history journals.
4. **NESA materials** — past papers, marking guidelines, and exemplar responses are gold for HSC question content.
5. **Reputable journalism** — long-form art criticism in publications with editorial oversight (Frieze, Artforum, The Guardian, The Sydney Morning Herald arts section, The Saturday Paper, etc.).

### 1.2 Not acceptable as a primary source

- Wikipedia (use as a *navigation tool* to find better sources; never cite directly).
- Anonymous blogs, fan sites, or AI-generated summaries.
- Pinterest, Reddit, TikTok, Instagram (with rare exceptions for the artist's own verified account).
- LLM output, including Claude's own training-data recall. AI may help draft, but every factual claim must be verified against an acceptable source above.

### 1.3 Sourcing workflow when drafting a case study

1. Joe identifies the artist and provides starting sources (URLs, catalogue scans, book chapters).
2. Claude Code reads those sources before drafting anything.
3. Each section of the case study cites at least one source.
4. If Claude Code needs to extend beyond the supplied sources, it requests Joe's approval first.
5. Unsourceable claims are flagged with `{/* TODO: source needed */}` in MDX rather than guessed.

---

## 2. Citations

### 2.1 Format

Citations live in two places:

1. **Frontmatter `sources` array** — full reference per source, in this format:

   ```yaml
   sources:
     - id: agnsw-bourgeois-spider
       type: gallery-catalogue
       title: "Louise Bourgeois: Spider"
       author: "Art Gallery of New South Wales"
       year: 2022
       url: "https://www.artgallery.nsw.gov.au/collection/works/..."
       accessed: 2026-05-17
   ```

2. **Inline footnote markers** in MDX body — `[^source-id]` where `source-id` matches a frontmatter entry. The MDX renderer turns these into hover-cards and an ordered References section at the foot of the page.

### 2.2 Reference types

`gallery-catalogue`, `museum-page`, `artist-statement`, `interview`, `book`, `journal-article`, `news-article`, `nesa-paper`, `nesa-marking-guide`, `documentary`, `other` (with explanation in `notes:`).

### 2.3 What needs citing

- Biographical claims with specifics (dates, places, training, family events).
- Statements about the artist's intent, philosophy, or process.
- Quotes — always, no exceptions.
- Interpretive claims about a work that aren't your own (e.g. "critics have read this as...").
- Reception history ("the work was controversial when first shown...").
- Material/technical claims about how a work was made.

### 2.4 What doesn't need a per-claim citation

- Generic syllabus framework explanation (the four frames, the conceptual framework) — these are part of the NESA syllabus itself, which is referenced once on the relevant explainer page.
- Common-knowledge art history (e.g. "Cubism emerged in the early 20th century").

---

## 3. Quotes

- **Verbatim**. No silent edits, no paraphrasing-as-quote.
- **Attributed** with speaker, source, and year inline. Frontmatter source ID for the URL/page reference.
- **No quote without a citable source.** If we can't find one, we describe the idea in our own words and cite an interpretive source.
- Square brackets `[ ]` for any editorial insertion. Ellipses `…` for omission. Never to change meaning.

---

## 4. Image rights

The strict policy. Australian educational fair dealing (Copyright Act 1968, s 40) gives some latitude, but we apply it conservatively.

### 4.1 Acceptable bases

| `rightsBasis` value | When to use |
|---|---|
| `public-domain` | Artist died 70+ years ago (Australia) or work is otherwise PD. Verify per-work. |
| `cc-by` / `cc-by-sa` / `cc-by-nc` | Creative Commons. Record the licence and attribution string. |
| `wikimedia-commons` | Verify the underlying licence on each image's Commons page — Commons is a host, not a licence. |
| `institutional-open-access` | Many major museums (Met, AIC, Rijksmuseum, NGA Washington) release works as PD/CC0. Verify per-work. |
| `educational-fair-dealing` | Australian s 40 fair dealing for research/study/criticism. Use sparingly: low-res, with full attribution, only where no PD/CC option exists. |
| `licensed` | Joe has obtained a written licence. Record terms in the artwork's frontmatter. |

### 4.2 Recording rights per image

Every image has a frontmatter block:

```yaml
image:
  src: ./images/bourgeois-spider-1996-med.webp
  alt: "Louise Bourgeois, 'Spider', 1996. Bronze, marble, stainless steel."
  artist: "Louise Bourgeois"
  title: "Spider"
  year: 1996
  medium: "Bronze, marble, stainless steel"
  dimensions: "326 × 757 × 706 cm"
  collection: "Art Gallery of New South Wales"
  photoCredit: "© AGNSW / [photographer]"
  rightsBasis: educational-fair-dealing
  rightsNotes: "Used for educational research and study under Copyright Act 1968 s 40. Low-resolution reproduction with full attribution."
  sourceUrl: "https://www.artgallery.nsw.gov.au/..."
```

### 4.3 Resolution

- Display images at the smallest resolution that still allows formal analysis (typically max 1600px on the long edge).
- Never offer a "download original" link.

### 4.4 Takedown

A footer link `/contact` includes a takedown contact email. Any rights-holder complaint is honoured immediately while we review.

---

## 5. HSC questions

- **Verbatim** transcription from NESA past papers. No silent corrections.
- `source` frontmatter field links to the NESA past paper PDF on `educationstandards.nsw.edu.au`.
- Where the original includes a stimulus plate, indicate this in `stimulus:` and either reproduce the plate (if rights allow) or link out to the NESA paper.
- Scaffolds, marker's views, and exemplar structures are *our* educational content; they are not represented as NESA's own.

---

## 6. Status workflow

Every content entry has `status:`:

- `draft` — being written. Not built into production output.
- `review` — awaiting Joe's review.
- `published` — Joe has reviewed and approved. Renders in production.

The Astro content loader filters `draft` items out of production builds (NODE_ENV=production). Preview/dev builds show all statuses with a visible status badge.

---

## 7. Last reviewed

Every published case study, lesson, and question carries `lastReviewed: YYYY-MM-DD` and `reviewedBy:` in frontmatter. These render at the foot of the page. If an entry has not been re-reviewed in 18 months, a build warning fires.

---

## 8. Indigenous artists and cultural protocols

Several artists likely in scope are Aboriginal or Torres Strait Islander. Apply standard cultural protocols:

- Use the language nation/community name where the artist publicly uses it.
- Defer to the artist's own framing of their work and identity.
- Do not include culturally sensitive imagery (e.g. images of deceased persons in some communities) without consulting the artist's estate, representing gallery, or community.
- Cite Indigenous-authored sources where available.

When in doubt, ask. Don't publish.

---

## 9. AI disclosure

The site footer includes a disclosure: "Content on this site is researched and authored with editorial assistance from AI tooling. Please review the cited sources before relying on any claim."

This is honest, sets expectations, and protects integrity.
