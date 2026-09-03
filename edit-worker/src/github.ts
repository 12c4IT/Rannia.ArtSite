// GitHub Data API wrapper for the edit Worker.
//
// Uses fetch directly, not Octokit. Fewer bytes shipped, no Node-only deps,
// and we only need a handful of endpoints:
//   - GET /repos/:owner/:repo/git/refs/heads/:branch
//   - GET /repos/:owner/:repo/contents/:path (for current-file reads)
//   - POST /repos/:owner/:repo/git/blobs
//   - POST /repos/:owner/:repo/git/trees
//   - POST /repos/:owner/:repo/git/commits
//   - POST /repos/:owner/:repo/git/refs
//
// Per-entry commits: when a batch touches multiple entries, we create N
// commits on the same edit branch (one per entry, in the order the model
// returned) so `git cherry-pick` at publish time can select entries
// individually.

import type { WrittenFile } from './tool-schema';

export interface GitHubConfig {
  token: string;
  repo: string; // "owner/name"
  baseBranch: string;
}

export interface RepoRef {
  sha: string;
  branch: string;
}

/** Fetch the latest commit SHA on the base branch. */
export async function getBaseRef(cfg: GitHubConfig): Promise<RepoRef> {
  const res = await gh(cfg, `/git/refs/heads/${cfg.baseBranch}`);
  const body = (await res.json()) as { object: { sha: string } };
  return { sha: body.object.sha, branch: cfg.baseBranch };
}

/** Read a single file's content from a specific ref. */
export async function getFile(
  cfg: GitHubConfig,
  path: string,
  ref: string,
): Promise<{ content: string; sha: string } | null> {
  const res = await ghRaw(cfg, `/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET contents ${path}: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { content: string; encoding: string; sha: string };
  if (body.encoding !== 'base64') {
    throw new Error(`GET contents ${path}: unexpected encoding ${body.encoding}`);
  }
  const bin = atob(body.content.replace(/\n/g, ''));
  return { content: new TextDecoder('utf-8').decode(bytesFromBinaryString(bin)), sha: body.sha };
}

/** Batch-read a set of files from the base ref. Missing files return null. */
export async function getFiles(
  cfg: GitHubConfig,
  paths: string[],
  ref: string,
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  const results = await Promise.all(
    paths.map(async (p) => {
      try {
        const f = await getFile(cfg, p, ref);
        return [p, f ? f.content : null] as const;
      } catch {
        return [p, null] as const;
      }
    }),
  );
  for (const [p, c] of results) out.set(p, c);
  return out;
}

// ─── Commit composition ────────────────────────────────────────────────

/** Files (text and binary) that go into a single commit. */
export interface CommitPayload {
  message: string;
  /** Text files. `null` content deletes the path (not used in v1). */
  textFiles: { path: string; content: string }[];
  /** Binary files, base64-encoded for the Git Data API. */
  binaryFiles: { path: string; base64: string }[];
  /** Trailer appended to the message body. */
  trailer: Record<string, string>;
  /** Author name/email to attribute the commit to. */
  authorName: string;
  authorEmail: string;
}

/** Create a branch from the base ref, then apply commits in sequence. */
export async function createBranchWithCommits(
  cfg: GitHubConfig,
  branchName: string,
  parentSha: string,
  commits: CommitPayload[],
): Promise<{ branch: string; commits: string[] }> {
  let parent = parentSha;
  const commitShas: string[] = [];

  for (const c of commits) {
    // 1. Create blobs for each file.
    const treeEntries: TreeEntry[] = [];
    for (const f of c.textFiles) {
      const blob = await postJson<{ sha: string }>(cfg, '/git/blobs', {
        content: f.content,
        encoding: 'utf-8',
      });
      treeEntries.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    for (const f of c.binaryFiles) {
      const blob = await postJson<{ sha: string }>(cfg, '/git/blobs', {
        content: f.base64,
        encoding: 'base64',
      });
      treeEntries.push({ path: f.path, mode: '100644', type: 'blob', sha: blob.sha });
    }

    // 2. Get the parent tree so our new tree layers on top of it.
    const parentCommit = await getJson<{ tree: { sha: string } }>(cfg, `/git/commits/${parent}`);

    // 3. Create the tree.
    const tree = await postJson<{ sha: string }>(cfg, '/git/trees', {
      base_tree: parentCommit.tree.sha,
      tree: treeEntries,
    });

    // 4. Create the commit.
    const messageWithTrailer = `${c.message}\n\n${formatTrailer(c.trailer)}`;
    const commit = await postJson<{ sha: string }>(cfg, '/git/commits', {
      message: messageWithTrailer,
      tree: tree.sha,
      parents: [parent],
      author: {
        name: c.authorName,
        email: c.authorEmail,
        date: new Date().toISOString(),
      },
    });

    commitShas.push(commit.sha);
    parent = commit.sha;
  }

  // 5. Create the branch ref pointing at the last commit.
  await postJson(cfg, '/git/refs', {
    ref: `refs/heads/${branchName}`,
    sha: parent,
  });

  return { branch: branchName, commits: commitShas };
}

interface TreeEntry {
  path: string;
  mode: '100644' | '100755' | '040000' | '160000' | '120000';
  type: 'blob' | 'tree' | 'commit';
  sha: string;
}

function formatTrailer(trailer: Record<string, string>): string {
  return Object.entries(trailer)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
}

/**
 * Given a batch of AI-written files, group by which "entry" they belong to.
 * A create/update for `src/content/case-studies/bourgeois-louise/index.mdx`
 * plus an image write to `src/content/case-studies/bourgeois-louise/images/x.jpg`
 * are one entry — same slug prefix. This gets one commit.
 *
 * A batch that touches two different case studies → two commits.
 */
export function groupByEntry(files: WrittenFile[]): WrittenFile[][] {
  const groups = new Map<string, WrittenFile[]>();
  for (const f of files) {
    const key = entryKey(f.path);
    const existing = groups.get(key);
    if (existing) existing.push(f);
    else groups.set(key, [f]);
  }
  return [...groups.values()];
}

/**
 * Derive an entry-key from a path. Folder-per-entry collections use the
 * folder as the key; flat collections use the file basename.
 */
function entryKey(path: string): string {
  // src/content/case-studies/<slug>/... → src/content/case-studies/<slug>
  const folderMatch = path.match(/^(src\/content\/(?:case-studies|body-of-works)\/[^/]+)/);
  if (folderMatch) return folderMatch[1]!;
  // Flat collection: whole path is the key.
  return path;
}

// ─── HTTP helpers ─────────────────────────────────────────────────────

function ghUrl(cfg: GitHubConfig, path: string): string {
  const [owner, name] = cfg.repo.split('/');
  return `https://api.github.com/repos/${owner}/${name}${path}`;
}

async function gh(cfg: GitHubConfig, path: string): Promise<Response> {
  return ghRaw(cfg, path);
}

async function ghRaw(cfg: GitHubConfig, path: string): Promise<Response> {
  return fetch(ghUrl(cfg, path), {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'User-Agent': 'rannia-artsite-edit-worker',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}

async function getJson<T>(cfg: GitHubConfig, path: string): Promise<T> {
  const res = await ghRaw(cfg, path);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

async function postJson<T>(cfg: GitHubConfig, path: string, body: unknown): Promise<T> {
  const res = await fetch(ghUrl(cfg, path), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'User-Agent': 'rannia-artsite-edit-worker',
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

function bytesFromBinaryString(bin: string): Uint8Array {
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
