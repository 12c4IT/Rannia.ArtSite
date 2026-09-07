# AI Editor — Guide for Rannia

You edit the site through one browser page: **`https://hscvisualarts.com.au/edit`**. Bookmark it.

You type what you'd like changed, in plain English. An AI drafts the change and shows you exactly what it's proposing. You approve or start over. Approved changes go live within about 90 seconds.

There's no software to install. There's no GitHub account to manage. There's no separate app to open.

---

## Signing in

Visit `hscvisualarts.com.au/edit`. First time each day (roughly — sessions last 24 hours), you'll see a Cloudflare login page:

1. Enter your email (`r.katrib90@gmail.com` — the address you gave Joe).
2. A **6-digit PIN** arrives in your inbox within a minute. Check spam if it's slow — Cloudflare's sender is `no-reply@notify.cloudflare.com`.
3. Type the PIN → you're in.

Only you and Joe are on the allowlist. Anyone else who finds the URL bounces off the login without getting in.

---

## Making an edit

The `/edit` page has three things: a prompt box, an optional image drop area, and a "Draft the change" button.

**The prompt is plain English.** Describe what you want. Examples of prompts that work well:

- *"On the About page, change the tagline from 'a study resource' to 'a study & practice resource'."*
- *"Add a new glossary term for 'appropriation'. Definition: the deliberate re-use of a pre-existing image or work inside a new one. Related frames: postmodern, cultural."*
- *"In the Bourgeois case study, in the third paragraph of the Cultural frame reading, rewrite the sentence about second-wave feminism — it's too generalising. Make it more specific: name the specific movements and dates."*
- *"In the Moffatt case study, the frame readings are all marked as AI drafts. Rewrite the Cultural frame reading for Something More #1 — here's the version I want: [paste your paragraph]."*

**Prompts that don't work as well:**

- *"Make the site better."* — too vague; the AI needs to know what specifically.
- *"Change all the case studies."* — too broad; it'll reject on batch-size limits. Do them one at a time.
- *"Publish the Bourgeois case study."* — the AI can't change `status` fields (that's locked to prevent AI-drafted content from being published without human review). Under the current model this doesn't matter — see "How publishing actually works" below.

**Image uploads:** drop up to 4 images at a time, 5 MB each, PNG/JPEG/WebP only. Mention them in your prompt ("use the file `bourgeois-cell.jpg` I uploaded as the new hero image for Bourgeois") and the AI will reference them in the markdown. All uploaded images go to `public/uploads/` on the site — accessible at `hscvisualarts.com.au/uploads/<filename>`.

---

## What happens after you click "Draft the change"

Live progress fills a panel below the button:

1. **Drafting…** — a stream of stages appears (loading context, calling the AI, validating). This can take 15–60 seconds depending on how much reading the AI has to do.
2. **Proposed changes** — a DiffViewer shows exactly which file(s) will change, and for each file, exactly which characters. Every edit is a `Was → Now` pair. **Read these carefully — this is your review moment.** Nothing outside these named spans changes; the AI is byte-constrained to just what it shows you.
3. **Going live** — the AI commits the change to the site's main branch. Netlify starts a rebuild.
4. **Your change is live** — a link appears. Click it to see the change on the site.

The whole loop is usually 2–3 minutes end-to-end.

---

## How publishing actually works

**Every edit goes live automatically.** There is no separate "publish" button. The site's `main` branch IS the live site.

That means the review moment is when you're looking at the DiffViewer — the moment you click "Draft the change" a second time (or type a corrective prompt), you're committing to what you see. If it's wrong, don't submit; retype your prompt.

**Why there's no publish gate:** you're the only editor, and the URL isn't shared with students yet. Once you're ready to share `hscvisualarts.com.au` with students, we may add a separate publish gate — for now, this model is simpler.

**Rollback if something goes wrong:**

- Ask Joe to `git revert` the specific commit — takes him 30 seconds. Every AI edit is one commit with a full timestamp and prompt trail.
- Or Netlify has a "Deploys" tab that lists every prior build. Any of them can be republished with one click. Joe knows how.

---

## Fixing your own mistakes

If you look at the DiffViewer and realise it changed something you didn't mean, don't click anything to "revert" — the change is on its way live. Instead:

1. Follow up with a corrective prompt: *"Undo the last change to the Bourgeois file — restore the old wording of the paragraph you just changed."*
2. The AI reads the current file, undoes the specific edit, commits again.

Two commits total. Both preserved in the history. No panic needed.

---

## When to hand off to Joe

For anything the `/edit` page can't do:

- **New case study from scratch** — the AI is locked out of `create` on case studies (they need image sourcing and rights clearance you and Joe do together).
- **Deleting an entry** — the AI has no delete action. Ask Joe.
- **Changing site structure or design** — code, not content. Joe.
- **A published case study you want to un-publish** — the AI can't change `status` fields. Ask Joe.

For anything that fails inside `/edit`:

- **"Your change is being drafted…" runs forever** — Anthropic call is slow. Give it 90 seconds. If nothing after that, refresh and retry.
- **"Something went wrong" with an error message** — copy the exact text and send to Joe.
- **The email PIN never arrives** — check spam, click Resend. If still nothing after 5 minutes, tell Joe (probably a Cloudflare Access config issue).

---

## What the AI is not allowed to touch

You can't accidentally break the site from `/edit`. The AI is blocked at the server side from writing to:

- Any code files (page templates, components, layouts, styles)
- Any config files (Astro config, package.json, deploy config, environment secrets)
- The schema definitions
- Real HSC past questions (verbatim-from-NESA rule — Rannia transcribes those manually)
- Body-of-Works entries (consent-gated — Rannia authors those manually)
- Locked frontmatter fields: `status`, `sources`, image `rightsBasis`/`sourceUrl`, artist biographical facts

If a prompt asks the AI to change one of these, the AI will either refuse or the server will reject the write. Either way, nothing bad happens.

---

## Seeing what you've done

Every edit becomes a Git commit. Joe can show you the full history at `github.com/12c4IT/Rannia.ArtSite/commits/main` — filtered by your email, it's a running log of every change you've made through `/edit`, with the diff visible per commit.

We may add a "recent edits" panel inside `/edit` itself in a future update — for now, ask Joe if you want to see the log.

---

## Costs — for reference

Each edit costs about 1–5¢ in AI tokens (Joe's Anthropic account). A month of active use is roughly $2–5. There's a hard monthly cap set on the Anthropic side, so runaway costs aren't possible.

Cloudflare hosts the editor backend at $5/month flat. Netlify hosts the site at $0/month.

Nothing you do on `/edit` costs you anything or requires you to manage any subscriptions.
