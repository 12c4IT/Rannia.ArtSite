# Bolt setup for Rannia

Joe-facing runbook. Sets up Bolt.new so Rannia can author content in her browser and have it commit back to Azure DevOps → auto-deploy on Netlify. She never has to touch git, VS Code, or a terminal.

This is a one-time setup. Once done, hand her `docs/RANNIA_AUTHORING.md` and she can start.

---

## What you're wiring up

```
Rannia's browser ──▶ Bolt.new (Claude + editor)
                         │
                         │ commits
                         ▼
                 Azure DevOps repo
                         │
                         │ webhook
                         ▼
                 Netlify (rannia-art-review)
                         │
                         ▼
                 rannia-art-review.netlify.app
                (updates within ~90 seconds)
```

Bolt is a browser IDE that runs Claude Code under the hood. It clones the repo into an in-browser VM, and any commit Claude makes gets pushed back to the linked git remote. When it pushes, Netlify picks up the change and rebuilds.

## Step 1 — Get a Bolt account

Go to `https://bolt.new` and sign up (or use your existing StackBlitz account — Bolt is by StackBlitz). Choose a paid tier if her volume warrants it; the free tier is fine to start.

Add Rannia's email as a team member on Bolt so she can log in to *the same* Bolt project you'll set up in step 3, rather than starting a fresh unrelated one.

## Step 2 — Generate an Azure DevOps Personal Access Token for Rannia

Bolt commits back to Azure DevOps using a PAT. **Do NOT use your own PAT** — if she authors under your identity, her commits look like yours in `git log` and you lose the audit trail.

- Log into `https://dev.azure.com/intelliconsulting` as Rannia (or ask her to do this and share the PAT with you privately).
- User Settings → Personal Access Tokens → New Token.
- Name: `bolt-rannia-art-site`.
- Scopes: **Code (Read & Write)** only. Nothing else.
- Expiry: 1 year (renew calendar reminder — expiry breaks Bolt silently).
- Save the token string in your password manager AND drop it into Bolt in step 3.

## Step 3 — Import the repo into Bolt

- In Bolt, choose "Import project" → "From Git URL".
- URL: `https://dev.azure.com/intelliconsulting/Rannia.ArtSite/_git/Rannia.ArtSite`.
- Auth: paste Rannia's PAT (step 2).
- Branch: `master` (that's what Netlify tracks — see the git config note in commit fc9bb91).
- Wait for the clone. First clone can take 30–60 seconds.

Once imported, share the Bolt project URL with Rannia. She'll see the project and can start conversations with Claude inside it.

## Step 4 — Paste the system prompt into Bolt's project instructions

Bolt supports project-level Claude instructions. This is where you bind Claude's behaviour to the rules for this site.

Bolt → Project Settings → Instructions → paste the block below.

```markdown
You are helping Rannia author content for a static educational site for
NSW Stage 6 Visual Arts students. Tech stack is Astro with content
collections; every piece of content is markdown/MDX with typed frontmatter.

**Your job is to draft. Rannia's job is to review and publish.**

Rules you MUST follow:

1. Never set `status: published` on any content entry. New entries and
   drafts stay `status: draft`. Only Rannia flips to `published`, in her
   own commits.

2. Never invent citations, quotes, or sources. If Rannia has not supplied
   a source for a claim, either ask her for one or mark the claim with
   `{/* TODO: source needed */}` and leave the citation empty. This is
   non-negotiable — the whole point of the site is that every claim is
   verified.

3. Never touch files outside `src/content/` without Rannia's explicit
   permission. In particular, do not modify `src/content.config.ts`
   (the schema), any file under `src/components/`, `src/pages/`,
   `src/layouts/`, or `astro.config.mjs`. Schema and code changes
   belong to Joe (the developer). If Rannia asks for a new content
   field, tell her Joe needs to add it to the schema first.

4. Follow the templates. The `_TEMPLATE.mdx` / `_TEMPLATE.md` file in
   each content folder shows the exact frontmatter shape. Copy from it.
   Do not omit required fields (the build will fail).

5. Australian English. "Colour", "centre", "analyse", "practise" (verb)
   / "practice" (noun).

6. HSC questions are verbatim from NESA. Never paraphrase question text.
   If Rannia has not supplied the exact text, ask her for it.

7. Image rights. Never embed an image without recording its `rightsBasis`
   (public-domain, cc-by, cc-by-sa, educational-fair-dealing, licensed)
   and `sourceUrl` in the frontmatter. If Rannia has not confirmed
   rights, do not include the image — insert a
   `{/* TODO: image + rights */}` placeholder instead.

8. Commit messages use conventional commit prefixes: `content:` for
   new/edited content, `fix:` for corrections. Keep messages short and
   specific.

9. When you're unsure, ask Rannia. Especially about syllabus
   interpretation, source reliability, or whether a claim is defensible.
   Guessing produces exactly the failure mode this site is built to avoid.

Read the following files for context before starting any conversation:
- `CLAUDE.md` at the repo root (project rules and role split).
- `docs/RANNIA_AUTHORING.md` (Rannia's authoring guide — the user's
  reference).
- `PLAN.md` §5 sitemap and §7 content model.
- `src/content.config.ts` (schema — for structure reference only, never
  edit).
- The `_TEMPLATE.mdx` / `_TEMPLATE.md` file in whichever content folder
  you're helping Rannia author into.
```

## Step 5 — Bolt project settings to check

- **Auto-commit**: ON — otherwise every change requires Rannia to click "commit" manually. Bolt should push each meaningful conversation as a commit.
- **Auto-push**: ON — pushes to Azure DevOps `master` automatically, which triggers the Netlify rebuild.
- **Model**: Claude Opus 4.7 or Sonnet 4.7 (whichever is available in Bolt) — Rannia's writing benefits from strong drafting quality.
- **Auto-branch**: OFF — commits should go direct to `master`. She's the sole content author; a review branch adds friction without safety (the `status: draft` gate is the safety).
- **File watchers**: if Bolt supports "restrict edits to `src/content/**`", turn it on. Otherwise the system prompt above holds the line.

## Step 6 — Test with a throwaway edit

Before handing off to Rannia:

1. Open Bolt as Rannia's account (or ask her to do this).
2. Chat: `Add "Test entry — please delete" as a paragraph at the bottom of src/content/pages/about.md. Do not touch anything else.`
3. Confirm Claude makes only that change (no code files touched).
4. Confirm the commit appears in Azure DevOps within 10 seconds.
5. Confirm Netlify picks up the build within ~90 seconds.
6. Confirm `rannia-art-review.netlify.app/about` shows the test paragraph.
7. Chat: `Remove the "Test entry — please delete" paragraph you just added. Commit with message "content: remove test paragraph".`
8. Confirm removal deploys.

If any of the above fails, don't hand off to Rannia yet — fix the pipeline first.

## Step 7 — Hand off to Rannia

Send her:

- Bolt project URL (from step 3).
- Her login credentials for Bolt.
- `docs/RANNIA_AUTHORING.md` (the user-facing guide with copyable prompts).
- The `rannia-art-review.netlify.app` URL so she can watch her work go live.

Tell her:

- Everything she edits stays `draft` and hidden from the (eventual) public site until she flips it.
- She can't break the site — the schema catches missing fields and the build refuses to complete. Netlify shows the last-good deploy if the current build fails.
- Ask Claude anything. If Claude tries to touch code files, remind it that only Joe does that.
- Joe (you) is on call for anything that needs a schema change, a new content type, or a deploy issue.

## Troubleshooting

**"Bolt says it can't push to Azure DevOps."**
PAT expired or scoped wrong. Regenerate with `Code (Read & Write)` scope only.

**"Netlify isn't picking up commits."**
Check the Netlify site's connected repo (Site settings → Build & deploy → Continuous deployment). Should be Azure DevOps → Rannia.ArtSite → master. Auto-publish should be on.

**"Claude in Bolt is editing files outside src/content/."**
The project instructions (step 4) aren't loaded or Claude is overriding them. Re-paste, confirm they're saved, ask Rannia to start a new conversation (project instructions apply per-conversation).

**"The build fails on Netlify but works locally."**
Node version mismatch. Netlify should be on Node 22 (see `Environment` → `NODE_VERSION` in Netlify config). Also check that Rannia hasn't accidentally deleted a required frontmatter field — the schema will surface this in the Netlify build log.

**"Rannia doesn't want to use Bolt."**
Fallback: she drafts in Word/email, forwards to you, you paste into Claude here and Claude drafts the MDX. Slower (bottlenecked on you) but works.

## What Bolt cost me to consider

Bolt on the paid tier (as of writing) is ~USD $20/month per seat. Cheaper than the hour of your time it saves per week. Also: token usage on Bolt counts against StackBlitz's plan, not Anthropic's — no separate API key management.

If usage grows, StackBlitz has team plans with shared usage pools. Revisit at 6 months.
