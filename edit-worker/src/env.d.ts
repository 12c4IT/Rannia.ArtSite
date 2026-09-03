// Cloudflare Worker environment bindings.
//
// Populated by wrangler.toml (KV bindings + vars) and by
// `wrangler secret put` (ANTHROPIC_API_KEY, GITHUB_TOKEN).

export interface Env {
  // ─── Secrets (wrangler secret put) ───
  /** Anthropic API key. Monthly spend cap set on the Anthropic side. */
  ANTHROPIC_API_KEY: string;
  /**
   * GitHub fine-grained PAT scoped to CONFIG.repo only. Permissions:
   * contents:write + pull-requests:write. Rotate on a 90-day cadence.
   */
  GITHUB_TOKEN: string;
  /**
   * Netlify personal access token, read-only site scope. Only used by the
   * Worker to poll deploy status of an edit branch's preview build so the
   * UI can surface the URL once ready.
   */
  NETLIFY_API_TOKEN: string;

  // ─── Vars (wrangler.toml [vars]) ───
  /** Cloudflare Access team domain, e.g. `intelli.cloudflareaccess.com`. */
  CF_ACCESS_TEAM: string;
  /** Access application AUD tag. */
  CF_ACCESS_AUD: string;
  /**
   * Comma-separated list of emails permitted to use the editor. Enforced
   * in the Worker on top of the Cloudflare Access policy — defence in
   * depth in case the policy is loosened accidentally.
   */
  ALLOWED_EMAILS: string;
  /** Netlify site id for the review Netlify site (edit-branch previews). */
  NETLIFY_SITE_ID: string;

  // ─── Bindings (wrangler.toml [[kv_namespaces]]) ───
  /**
   * KV namespace holding per-session request counters.
   * Keys: `session:${jwtSub}:${YYYYMMDD}` → integer request count.
   * TTL: expiring 48h after write, so the day rolls over cleanly.
   */
  EDITOR_SESSIONS: KVNamespace;
}
