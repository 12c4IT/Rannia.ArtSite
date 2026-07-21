# Authoring guide for Rannia

You are the pedagogical author of this site. Joe built the site; you write it.

This document has two audiences:
1. **You**, when you sit down to add or edit content.
2. **Claude in Bolt**, when it helps you draft. Paste the "System prompt for Bolt" section below into Bolt's project instructions so it behaves properly on every conversation.

---

## Where things live

Everything you author lives under `src/content/`. There's a folder for each type of thing:

| Folder | What goes here | Template file |
|---|---|---|
| `src/content/case-studies/` | Full case studies (an artist + two artworks + all four frames) | `_TEMPLATE.mdx` |
| `src/content/questions/` | Real past HSC questions (verbatim from NESA papers) | `_TEMPLATE.md` |
| `src/content/practice-questions/` | Teacher-authored practice questions (5/8/10 mark, trial, daily) | `_TEMPLATE.md` |
| `src/content/lessons/` | Lessons tied to case studies (WALT/WILF/scaffolds) | `_TEMPLATE.mdx` |
| `src/content/body-of-works/` | Student BOW examples (with signed consent) | `_TEMPLATE.mdx` |
| `src/content/command-words/` | ALARMS matrix directive verbs (Analyse, Explain, etc.) | `_TEMPLATE.md` |
| `src/content/glossary/` | Art terminology | `_TEMPLATE.md` |
| `src/content/pages/` | Explainer pages (frames, conceptual framework, practice) | *(no template — plain markdown)* |

**How to add something new:** copy the template file (never edit it directly — it starts with `_`), rename it to your entry's slug, fill it in. Claude in Bolt can do the copy-and-fill for you if you ask.

## The publish gate — this matters

Every content entry has a `status:` field in its frontmatter, with three values:

- `draft` — the default. **Not visible on the live site.** Safe to iterate on.
- `review` — you've drafted it and want a second pair of eyes before it goes live. Also not visible.
- `published` — live. Anyone with the URL can see it.

**Only you set `status: published`.** Not Claude, not Joe, not Bolt. This is the safety net that keeps unreviewed AI drafts off the live site.

The build process automatically excludes anything not `published` from the production output. So as long as things stay `draft`, nothing goes live.

## The workflow

1. Open the project in Bolt (Joe will send you the link).
2. Chat with Claude to draft something — see the prompts below.
3. Claude edits the files. You can see the diff in Bolt before saving.
4. When you're happy with a draft, tell Claude to save + commit.
5. Netlify picks up the commit and rebuilds the site within ~90 seconds.
6. Draft entries are still hidden from the live site. Only `published` ones show up.
7. To publish: change `status: draft` to `status: published` in the file's frontmatter, save + commit.

## Prompts you can use

Copy-paste these into Bolt. Fill in the [square-bracketed] bits.

### Draft a new case study

```
Draft a case study on [artist name]. Sources I want you to work from:

- [paste URL, PDF link, or "here's an excerpt: …"]
- [more sources]

Follow src/content/case-studies/_TEMPLATE.mdx exactly. Create a folder
src/content/case-studies/[surname-firstname]/ with index.mdx inside.
Every factual claim needs a [^source-id] citation matching the sources
block. If you can't find a source for something, mark it {/* TODO:
source needed */} — do not invent citations.

Leave status: draft. Do not touch any file outside src/content/.
```

### Add a past HSC question

```
Add an HSC question. Details:

- Year: [YYYY]
- Section: [I or II]
- Question number: [e.g. 5, 9(a), etc.]
- Marks: [n]
- NESA PDF URL: [paste]
- Text of the question (I've pasted it below verbatim — do not paraphrase):

[paste the exact question text]

Follow src/content/questions/_TEMPLATE.md. Draft the scaffold (decode /
plan / sentence stems / marker's view / exemplar structure) at Band 6
level. Leave status: draft.
```

### Add a student BOW example

```
Add a BOW gallery entry for [student pseudonym or first name].
Consent details:
- Signed by: [full name — for the record, not for display]
- Date signed: [YYYY-MM-DD]
- Allow full name display? [yes/no]

Medium: [painting / drawing / sculpture / ceramics / photography /
time-based / digital / collection-of-works]
Band: [1–6, optional]

Follow src/content/body-of-works/_TEMPLATE.mdx. I'll upload images
separately. Leave status: draft and consent.onFile: false until I
confirm the paperwork is filed.
```

### Publish a draft

```
Set status: published on src/content/[type]/[slug]/index.mdx. Update
lastReviewed to today's date. Then commit with message:
"content: publish [slug]".
```

### Fix a small thing

```
In [filename], change [what] to [what]. Commit with message:
"content: [short summary]".
```

## Rules for Claude in Bolt (system prompt)

> **Paste this block into Bolt's project instructions.**

> You are helping Rannia author content for a static educational site for NSW Stage 6 Visual Arts students. The tech stack is Astro with content collections; every piece of content is markdown/MDX with typed frontmatter.
>
> **Your job is to draft. Rannia's job is to review and publish.**
>
> Rules you must follow:
>
> 1. **Never set `status: published`** on any content entry. New entries and drafts stay `status: draft`. Only Rannia flips to `published`, in her own commits.
> 2. **Never invent citations, quotes, or sources.** If Rannia hasn't supplied a source for a claim, either ask her for one or mark the claim with `{/* TODO: source needed */}` and leave the citation empty. This is non-negotiable — the whole point of the site is that every claim is verified.
> 3. **Never touch files outside `src/content/`** without Rannia's explicit permission. In particular, do not modify `src/content.config.ts` (the schema), any file under `src/components/`, `src/pages/`, `src/layouts/`, or `astro.config.mjs`. Schema and code changes belong to Joe. If Rannia asks for a new content field, tell her Joe needs to add it to the schema first.
> 4. **Follow the templates.** The `_TEMPLATE.mdx` / `_TEMPLATE.md` file in each content folder shows the exact frontmatter shape. Copy from it. Do not omit required fields (the build will fail).
> 5. **Australian English.** "Colour", "centre", "analyse", "practise" (verb) / "practice" (noun).
> 6. **HSC questions are verbatim from NESA.** Never paraphrase question text. If Rannia hasn't supplied the exact text, ask her for it.
> 7. **Image rights.** Never embed an image without recording its `rightsBasis` (public-domain, cc-by, cc-by-sa, educational-fair-dealing, licensed) and `sourceUrl` in the frontmatter. If Rannia hasn't confirmed rights, do not include the image — insert a `{/* TODO: image + rights */}` placeholder instead.
> 8. **Commit messages** use conventional commit prefixes: `content:` for new/edited content, `fix:` for corrections. Keep messages short and specific.
> 9. **When you're unsure, ask Rannia.** Especially about syllabus interpretation, source reliability, or whether a claim is defensible. Guessing produces exactly the failure mode this site is built to avoid.

## What to do when something goes wrong

**"The site won't build."** — Bolt will show a red error. Most likely a required frontmatter field is missing. Tell Claude "the build is failing, here's the error: [paste]" and it'll fix it.

**"I published something and it's wrong."** — Change `status: published` back to `status: draft`, commit, wait ~90 seconds. It's off the live site.

**"I want to change the site structure / add a new type of content."** — Joe. This is code territory, not content.

**"Claude wants to touch code."** — Say no. Tell Claude to stay in `src/content/`. If a genuine schema change is needed, message Joe.
