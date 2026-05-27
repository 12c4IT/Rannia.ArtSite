# Content Model

Detailed reference for content collection schemas. Authoritative TypeScript definitions live in `schemas/content-config.ts` (and `src/content/config.ts` once Astro is initialised). This document explains the choices.

## Collections

| Collection | File location | File format | Routed at |
|---|---|---|---|
| `case-studies` | `src/content/case-studies/*.mdx` | MDX | `/case-studies/[slug]` |
| `lessons` | `src/content/lessons/*.mdx` | MDX | `/lessons/[slug]` |
| `questions` | `src/content/questions/*.md` | Markdown | `/questions/[id]` |
| `glossary` | `src/content/glossary/*.md` | Markdown | `/glossary#[term]` |
| `pages` | `src/content/pages/**/*.md` | Markdown | various |

## Shared enums

### `Frame`

`subjective | cultural | structural | postmodern`

These are the four frames as defined in the NSW Stage 6 Visual Arts syllabus. Order is conventional (subjective → cultural → structural → postmodern).

### `ContentArea`

`the-body | place | identity | time | memory | objects | nature | technology | spirituality | the-everyday | other`

The HSC paper Section II is structured around content areas. Final taxonomy is editorial — start with the above and add as required. Use `other` only with a `contentAreaNote:` explaining why.

### `QuestionType`

`short-answer | extended-response | plate-based-short | plate-based-extended`

`plate-based-short` and `plate-based-extended` flag questions that reference a stimulus plate in the NESA paper.

### `PracticeType`

`artmaking | art-criticism | art-history`

Currently only `artmaking` applies to case studies (since the case studies are of artists). Critic and historian practice case studies are out of scope for v1 but the schema accommodates them for v2.

### `RightsBasis`

`public-domain | cc-by | cc-by-sa | cc-by-nc | cc0 | wikimedia-commons | institutional-open-access | educational-fair-dealing | licensed`

See `CONTENT_GUIDELINES.md` §4 for usage rules.

### `Status`

`draft | review | published`

Production builds (NODE_ENV=production) filter out `draft` and `review`. Preview/dev shows all with a status badge.

## CaseStudy

```typescript
{
  title: string                      // "Louise Bourgeois: motherhood, memory and architecture"
  artist: {
    name: string                     // "Louise Bourgeois"
    nationality: string              // "French-American"
    birthYear: number                // 1911
    deathYear: number | null         // 2010 or null
    pronouns?: string
  }
  primaryFrame: Frame
  secondaryFrames: Frame[]
  contentAreas: ContentArea[]
  practiceType: PracticeType
  shortPitch: string                 // 1-2 sentence card description
  heroImageRef: string               // slug of the artwork to use for hero, or 'custom' with heroImage block
  artworks: [Artwork, Artwork]       // exactly two
  conceptualFramework: {
    artist: string                   // markdown
    artwork: string
    world: string
    audience: string
  }
  artistPractice: string             // markdown body
  linkedQuestionIds: string[]
  linkedLessonSlugs: string[]
  sources: Source[]
  status: Status
  lastReviewed: Date
  reviewedBy: string
  contentWarnings?: string[]         // 'nudity', 'sensitive-cultural-content', etc.
}
```

## Artwork (nested in CaseStudy)

```typescript
{
  title: string                      // verbatim, in inverted commas in display
  year: number | string              // string for ranges: "1994-1996"
  medium: string
  dimensions: string
  collection: string                 // "Art Gallery of New South Wales"
  image: ImageBlock
  frames: {
    subjective: string               // markdown
    cultural: string
    structural: string
    postmodern: string
  }
  notes?: string                     // markdown, freeform additional commentary
}
```

## ImageBlock

```typescript
{
  src: string                        // path to optimised image
  alt: string                        // full descriptive alt (artist, title, year, medium)
  caption: string                    // displayed caption
  photoCredit: string
  rightsBasis: RightsBasis
  rightsNotes?: string
  sourceUrl: string
}
```

## Question

```typescript
{
  id: string                         // 'hsc-2019-s2-q9' — stable, used in URL
  year: number
  paper: 'visual-arts'               // future-proofing
  section: 'I' | 'II'
  questionNumber: string             // '9', '9(a)', etc.
  marks: number
  text: string                       // verbatim from NESA
  stimulus?: {
    hasPlate: boolean
    plateDescription?: string
    plateImage?: ImageBlock
  }
  frames: Frame[]                    // which frames the question rewards
  contentAreas: ContentArea[]
  questionType: QuestionType
  scaffold: {
    decode: string                   // markdown - unpack verbs and key terms
    plan: string                     // markdown - paragraph structure
    sentenceStems: string[]
    markersView: string              // markdown - what earns marks
    exemplarStructure: string        // markdown - paragraph-by-paragraph outline
  }
  linkedCaseStudySlugs: string[]
  source: {
    url: string                      // link to NESA past paper
    type: 'nesa-paper'
  }
  status: Status
  lastReviewed: Date
  reviewedBy: string
}
```

## Lesson

```typescript
{
  title: string
  yearLevel: 11 | 12
  durationMinutes: number
  walt: string[]                     // learning intentions, one per bullet
  wilf: string[]                     // success criteria
  priorKnowledge: string[]           // dot points
  vocabulary: string[]               // glossary slugs
  body: string                       // markdown body of the lesson
  linkedCaseStudySlugs: string[]
  questionScaffolds: {
    questionId: string
    additionalScaffold?: string      // lesson-specific addenda to the question's own scaffold
  }[]
  sources: Source[]
  status: Status
  lastReviewed: Date
  reviewedBy: string
}
```

## Source

```typescript
{
  id: string                         // local id used in [^id] markers
  type: 'gallery-catalogue' | 'museum-page' | 'artist-statement' | 'interview' | 'book' | 'journal-article' | 'news-article' | 'nesa-paper' | 'nesa-marking-guide' | 'documentary' | 'other'
  title: string
  author: string
  publisher?: string
  year: number | string
  url?: string
  pages?: string                     // 'pp. 22–35'
  accessed?: Date                    // for URL sources
  notes?: string
}
```

## GlossaryTerm

```typescript
{
  term: string                       // 'appropriation'
  slug: string                       // 'appropriation'
  shortDefinition: string            // one sentence
  longDefinition: string             // markdown
  relatedFrames: Frame[]
  relatedTerms: string[]             // slugs
  examples?: string                  // markdown
}
```

## Indexes and filters

Three derived indexes are built at compile time (Astro `getStaticPaths`):

1. **Case studies by frame** — `/case-studies?frame=cultural` (client-side filter on the index page).
2. **Questions by `[frame|contentArea|year|type]`** — each gets its own `/questions/by-*/[x]` route.
3. **References master** — walks every collection's `sources` array, dedupes by `(title, author, year)`, sorts by author.
