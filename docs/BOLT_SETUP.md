# Bolt setup for Rannia

Joe-facing runbook. Sets up Bolt.new so Rannia can author content in her browser and have it commit back automatically → Netlify auto-deploys.

**⚠️  Bolt requires GitHub.** Bolt (and StackBlitz's other browser IDEs) only integrate natively with GitHub. Azure DevOps clone URLs are not supported — the only non-GitHub path Bolt offers is a manual ZIP export, which breaks the auto-commit chain. So step 0 below is a one-time migration from Azure DevOps to GitHub.

Once done, hand Rannia `docs/RANNIA_AUTHORING.md` and she can start.

---

## What you're wiring up

```
Rannia's browser ──▶ Bolt.new (Claude + editor)
                         │
                         │ auto-commits
                         ▼
                   GitHub repo
                (<your-github-username>/Rannia.ArtSite)
                         │
                         │ webhook
                         ▼
                 Netlify (rannia-art-review)
                         │
                         ▼
                 rannia-art-review.netlify.app
                (updates within ~90 seconds)
```

Bolt is a browser IDE that runs Claude Code under the hood. It clones the GitHub repo into an in-browser VM, and any commit Claude makes pushes back to GitHub. Netlify's GitHub integration then triggers a rebuild.

## Bolt UI is a moving target

Bolt is under active development. Menu labels and screen layouts may not match these instructions exactly. When in doubt, check bolt.new's own docs at `https://support.bolt.new`. The *shape* of what you're doing is stable even if the button names shift.

---

## Step 0 — Migrate the repo from Azure DevOps to GitHub

**Skip this if you've already migrated.** The current commit history and all Netlify config transfers cleanly; nothing about the site changes.

### 0.1 Create the GitHub repo

- Log into your personal GitHub account.
- New repo → name `Rannia.ArtSite`, **private**, no README/license/gitignore (we already have those).
- Copy the repo's HTTPS URL: `https://github.com/<your-github-username>/Rannia.ArtSite.git`.

### 0.2 Push the full Azure DevOps history to GitHub

From this working tree (do NOT prepend `cd`; you're already in the project dir):

```bash
git remote add github https://github.com/<your-github-username>/Rannia.ArtSite.git
git push github main:master --force-with-lease
git push github --tags
```

Notes:
- The local branch is `main` but Azure DevOps tracks `master`. GitHub can use either — I'd suggest keeping `master` as the default branch on GitHub to match Netlify's current config, or renaming both sides to `main` (a bit more work; do it later).
- `--force-with-lease` is safe here because the GitHub remote is brand new (empty). Do not repeat this against a shared branch later.

### 0.3 Verify

```bash
git ls-remote github
```

Should list your commits. Cross-check the tip SHA against `git log -1 --oneline`.

### 0.4 Repoint Netlify

- Netlify → the `rannia-art-review` site → **Site settings → Build & deploy → Continuous deployment → Manage repository**.
- **Link a different repository** → pick **GitHub** (not Azure DevOps this time).
- Authenticate with GitHub if needed. Netlify may ask you to install its GitHub App on your account — install it only for the specific repo.
- Pick `<your-github-username>/Rannia.ArtSite`.
- Branch to deploy: `master` (match the branch you pushed in step 0.2).
- Build command: `npm run build` (unchanged).
- Publish directory: `dist` (unchanged).
- Save. Netlify triggers a fresh build immediately.

### 0.5 Update your local `origin`

Optional but cleaner. Point `origin` at GitHub going forward:

```bash
git remote set-url origin https://github.com/<your-github-username>/Rannia.ArtSite.git
git remote -v
```

Keep the Azure DevOps repo as a read-only backup. **Do not delete it** for at least 3 months — history-of-record fallback.

---

## Step 1 — Rannia gets a GitHub account and collaborator access

Attribution in git commits is based on the author identity. If she uses your GitHub account, her commits show up as yours in `git log` — you lose the audit trail. She needs her own.

### 1.1 Rannia signs up

- She creates a free GitHub account at `github.com` (or uses one she has).
- She sets her display name and commit email to something recognisable (e.g. "Rannia [Surname]" and a work email).

### 1.2 Add her as a collaborator

- Your GitHub repo → **Settings → Collaborators → Add people**.
- Enter her GitHub username or email.
- Role: **Write** (she can push commits, cannot delete the repo or change settings).
- She'll receive an invite email; she accepts it before she can push.

### 1.3 Verify

Ask her to make a trivial commit via GitHub's web editor (edit README.md, add a space, commit with her account). Confirm the commit shows her name/avatar in `git log --format="%an %s"` and on GitHub's UI.

---

## Step 2 — Get Rannia signed up on Bolt

- Rannia goes to `https://bolt.new` and signs up **using her GitHub account** (Sign in with GitHub). This links her Bolt identity to her GitHub identity so commits Bolt makes are attributed to her.
- The free tier lets her try it. You'll want to bump to the paid tier once she's actively authoring (context and prompt limits are the usual reason).
- If you want a shared team plan (both of you on it), StackBlitz's team tier exists — worth doing once Rannia is settled.

---

## Step 3 — Import the repo into Bolt

Rannia does this from her Bolt account:

- In Bolt: choose **Import from GitHub** (or the current label for the GitHub import path).
- Grant Bolt the "read + write to this specific repo" permission when GitHub prompts. Do NOT grant "all repos" — least-privilege.
- Select `<your-github-username>/Rannia.ArtSite`.
- Wait for the clone. First clone can take 30–60 seconds.

Once imported, Rannia has an in-browser IDE with the full repo loaded, an integrated Claude conversation, and (by default) auto-commit + auto-push to the linked branch.

---

## Step 4 — Paste the system prompt into Bolt's project instructions

Bolt has a project-level "instructions" or "system prompt" field. This is where you bind Claude's behaviour to the site's rules.

Bolt project → Settings → Instructions (or equivalent current label) → paste the block below.

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

---

## Step 5 — Bolt project settings to check

- **Auto-commit**: ON — Bolt should push each meaningful conversation as a commit. If it's off, Rannia has to click "commit" manually.
- **Auto-push**: ON — pushes to GitHub `master` automatically, which triggers the Netlify rebuild.
- **Model**: whichever Claude model Bolt offers as its top tier. Rannia's writing benefits from strong drafting quality — accept the token cost.
- **Auto-branch**: OFF — commits go direct to `master`. She's the sole content author; a review branch adds friction without safety (the `status: draft` gate is the safety).
- **File watchers / edit scope**: if Bolt supports "restrict edits to `src/content/**`", turn it on. Otherwise the system prompt above holds the line.

Bolt may not surface all of these as toggles. Ask Bolt's own Claude to tell you the current defaults if the UI is unclear.

---

## Step 6 — Test with a throwaway edit before handoff

Before you tell Rannia she's live:

1. Open Bolt as Rannia (or ask her to do this while you watch).
2. Chat: `Add "Test entry — please delete" as a paragraph at the bottom of src/content/pages/about.md. Do not touch anything else.`
3. Confirm Claude only changes about.md (no code files touched).
4. Confirm the commit appears in the GitHub commits view within 10–20 seconds.
5. Confirm Netlify picks up the build within ~90 seconds.
6. Confirm `rannia-art-review.netlify.app/about` shows the test paragraph.
7. Chat: `Remove the "Test entry — please delete" paragraph you just added. Commit with message "content: remove test paragraph".`
8. Confirm removal deploys.

If any step fails, don't hand off yet — fix the pipeline first.

---

## Step 7 — Hand off to Rannia

Send her:

- Her Bolt project URL.
- `docs/RANNIA_AUTHORING.md` (the user-facing guide with copyable prompts).
- The `rannia-art-review.netlify.app` URL so she can watch her work go live.

Tell her:

- Everything she edits stays `draft` and hidden from the (eventual) public site until she flips it.
- She can't break the site — the schema catches missing fields and the build refuses to complete. Netlify shows the last-good deploy if the current build fails.
- Ask Claude anything. If Claude tries to touch code files, remind it that only Joe does that.
- Joe (you) is on call for anything that needs a schema change, a new content type, or a deploy issue.

---

## Troubleshooting

**"Bolt says it can't push to GitHub."**
Rannia's GitHub OAuth to Bolt may need re-authorising, or she hasn't accepted the collaborator invite yet. Confirm she can push a trivial change via GitHub's web editor first (step 1.3 test), then re-link Bolt.

**"Netlify isn't picking up commits."**
Check Netlify's linked repo (Site settings → Build & deploy → Continuous deployment). Should point at `<your-github-username>/Rannia.ArtSite`, not the old Azure DevOps repo. Auto-publish should be on. If the Netlify GitHub App was uninstalled, reinstall it for this repo.

**"Claude in Bolt is editing files outside src/content/."**
The project instructions (step 4) aren't loaded or Claude is overriding them. Re-paste, confirm they're saved, ask Rannia to start a new conversation (project instructions apply per-conversation).

**"The build fails on Netlify but works locally."**
Node version mismatch. Netlify should be on Node 22 — set in Netlify site config → Environment → `NODE_VERSION=22`. Also check that Rannia hasn't accidentally deleted a required frontmatter field — the schema will surface this in the Netlify build log.

**"Bolt made a commit under Joe's GitHub identity, not Rannia's."**
She's authenticated to Bolt as you, not as herself. She needs to sign into Bolt with her own GitHub account. Sign out, sign back in with her account.

**"Rannia doesn't want to use Bolt."**
Fallback: she drafts in Word/email, forwards to you, you paste into Claude here and Claude drafts the MDX. Slower (bottlenecked on you) but works.

---

## Cost check

Bolt on a paid tier (as of authoring) is ~USD $20/month per seat. Cheaper than the hour of your time it saves per week. Also: token usage counts against StackBlitz's plan, not Anthropic's — no separate API key management.

If usage grows, StackBlitz has team plans with shared pools. Revisit at 6 months.

---

## Deferred: repo migration timing

Rannia is reviewing the current Netlify site first (still deployed from the Azure DevOps → Netlify chain). This document's step 0 migration happens **after** her review, before you set up Bolt. If she asks for big content changes off the review, you can drive those from your local machine against Azure DevOps and defer the migration until she's happy with the site shape.
