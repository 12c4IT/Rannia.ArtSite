# Page Templates

Detailed wireframes and component breakdowns for the three core templates.

---

## Case Study (`/case-studies/[slug]`)

### Hero

Full-bleed featured artwork image (low-res blur-up, then sharp). Overlay:
- Artist name (display serif, large)
- Dates (1911–2010)
- Primary frame badge
- Secondary frame badges
- Short pitch (1–2 sentences)

Below the hero, a sticky thin nav bar on scroll with section anchors: Framework • Practice • Artwork 1 • Artwork 2 • Questions • References.

### Conceptual Framework summary

A four-panel grid (responsive: 1-col mobile, 2x2 tablet, 4-col desktop). Each panel:
- Agency name (Artist / Artwork / World / Audience)
- 2–4 sentences specific to this case study
- Optional pull-quote with citation

### Artist Practice

Long-form Markdown body. Subheadings allowed. Encouraged:
- Biography (concise, fact-led)
- Process and materials
- Conceptual concerns / recurring themes
- Career trajectory

### Artwork blocks (×2)

Each artwork is rendered by the `<ArtworkBlock>` component. Structure:

```
┌────────────────────────────────────────────────────────────┐
│ Image (responsive, max 1600px long edge)                   │
│ Caption: "Artist, 'Title' (Year). Medium. Dimensions.      │
│           Collection. Photo: credit. Rights: basis."        │
├────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐                          │
│  │ Subjective  │  │  Cultural   │                          │
│  └─────────────┘  └─────────────┘                          │
│  ┌─────────────┐  ┌─────────────┐                          │
│  │ Structural  │  │ Postmodern  │                          │
│  └─────────────┘  └─────────────┘                          │
│  (Tabbed on desktop, accordion on mobile)                  │
└────────────────────────────────────────────────────────────┘
```

The four frame readings are rendered as either tabs (desktop) or expandable accordions (mobile). Default open: primary frame for the case study.

### Linked HSC questions

A two-up or three-up card grid pulling from `linkedQuestionIds`. Each card:
- Year and marks badge
- Question type badge
- Question text (truncated with "Read more")
- "Scaffold" link to the full question page

### Linked lessons

Compact list with title, year level, duration, link.

### References + last reviewed

A two-column block:
- Left: Numbered list of sources for this case study.
- Right: "Last reviewed [date] by [name]. Image rights: see individual artwork captions."

---

## Lesson (`/lessons/[slug]`)

### Header

- Title
- Year level chip (11 or 12)
- Duration chip ("60 min")
- "For [Case Study Name]" link

### WALT / WILF block

Two side-by-side cards:

```
┌──────────────────────────────┐  ┌──────────────────────────────┐
│ Learning Intentions          │  │ Success Criteria             │
│ (WALT — We Are Learning To)  │  │ (WILF — What I'm Looking For)│
│                              │  │                              │
│ ◆ analyse a work using the   │  │ ◆ I can identify and explain │
│   cultural frame             │  │   2+ cultural signifiers     │
│ ◆ ...                        │  │ ◆ I can ...                  │
└──────────────────────────────┘  └──────────────────────────────┘
```

### Prior knowledge / vocabulary

Bulleted list, with glossary links auto-linked from `vocabulary:` frontmatter array.

### Lesson body

Markdown body. Suggested structure (not enforced):
1. Hook / starter
2. Direct teaching
3. Modelled analysis
4. Guided practice
5. Independent practice
6. Exit ticket

### Question scaffolds

Repeated `<QuestionScaffold>` component per linked question:

```
┌──────────────────────────────────────────────────────────┐
│ HSC 2019 Section II Q9  •  25 marks                      │
├──────────────────────────────────────────────────────────┤
│ [Verbatim question text]                                 │
├──────────────────────────────────────────────────────────┤
│ ▼ Decode the question                                    │
│   • Verb: "Analyse" — break into parts, show how they    │
│     work together                                        │
│   • Key term: "...                                       │
│                                                          │
│ ▼ Plan your response                                     │
│   • Para 1: ...                                          │
│   • Para 2: ...                                          │
│   • Para 3: ...                                          │
│                                                          │
│ ▼ Sentence stems                                         │
│   • "The structural frame reveals..."                    │
│   • "By recontextualising X, the artist..."              │
│                                                          │
│ ▼ Marker's view                                          │
│   Band 6: sustains argument, integrates frames,          │
│   uses precise art-historical language...                │
└──────────────────────────────────────────────────────────┘
```

### Linked case studies

Compact link card.

---

## HSC Question (`/questions/[id]`)

### Header

```
HSC 2019  •  Section II  •  Question 9  •  25 marks
[ Frame: Cultural ] [ Content: Identity ] [ Type: Extended Response ]
```

### Question text

In a prominent serif quote-style block. Verbatim. With NESA source link below ("View original paper on NESA →").

### Stimulus

If `stimulus.hasPlate`, either embed the plate (if rights allow) with full caption, or describe and link to the NESA PDF page.

### Scaffold (collapsible by default)

A "Show scaffold" toggle — encourages students to attempt the question first, then peek. When expanded: the same `<QuestionScaffold>` blocks as on the lesson page (decode, plan, sentence stems, marker's view, exemplar structure).

### Linked case studies

"Case studies that could anchor a response to this question":
- Card grid linking back to `/case-studies/[slug]`.

### Last reviewed metadata

Foot of page.

---

## Shared / cross-cutting components

### `<FrameBadge frame="cultural" />`

Small chip with frame name and frame's accent colour (one of four muted tones). Used everywhere.

### `<ContentAreaBadge area="identity" />`

Similar, separate palette.

### `<ImageBlock>`

Wraps `<picture>` with `srcset`, lazy loading, mandatory `alt`, mandatory caption with rights basis.

### `<SourceCite id="agnsw-bourgeois-spider" />`

Inline footnote marker rendered as a superscript link. Hover/tap reveals a popover with the full citation. Builds the References section automatically.

### `<GlossaryLink term="appropriation">appropriation</GlossaryLink>`

Auto-styled glossary link with hover definition.

### `<LastReviewed date="2026-05-17" by="Joe" />`

The standard footer block. Highlighted yellow if >18 months old.

### `<StatusBadge status="draft" />`

Rendered only in non-production builds. Big and obvious — there's no risk of confusing a draft for a published page.
