// Per-session request count, backed by Cloudflare KV.
//
// Not a distributed budget (Anthropic's own spend cap is that). This just
// prevents a runaway session — one browser tab hammering the endpoint —
// from consuming the daily Anthropic budget in seconds. Returns a fast
// 429 without ever calling Anthropic.
//
// TODO(productisation): KV is eventually consistent (~60s propagation),
// so a hot session can race and get slightly more than the cap. That's
// fine at one editor. When we support multiple concurrent editors on
// the same site, switch this to a Durable Object (strong consistency).

import type { Env } from './env';
import { CONFIG } from './config';

export interface RateLimitOk {
  ok: true;
  /** Requests used today after this one increments. */
  count: number;
  /** Remaining budget. */
  remaining: number;
}

export interface RateLimitBlocked {
  ok: false;
  /** Requests used today (already at cap). */
  count: number;
  /** Seconds until the day rolls over (UTC midnight). */
  retryAfterSeconds: number;
}

/** Peek without incrementing — early rejection before we do work. */
export async function checkRateLimit(
  subject: string,
  env: Env,
): Promise<RateLimitOk | RateLimitBlocked> {
  const key = makeKey(subject);
  const current = await readCount(env, key);
  if (current >= CONFIG.limits.perSessionRequests) {
    return {
      ok: false,
      count: current,
      retryAfterSeconds: secondsUntilUtcMidnight(),
    };
  }
  return {
    ok: true,
    count: current,
    remaining: CONFIG.limits.perSessionRequests - current,
  };
}

/**
 * Increment the counter. Call ONLY after a successful edit — a rejected
 * request that never reached Anthropic shouldn't cost against the budget.
 */
export async function incrementRateLimit(subject: string, env: Env): Promise<void> {
  const key = makeKey(subject);
  const current = await readCount(env, key);
  const expirationTtl = 48 * 60 * 60; // 48h — comfortably covers a day boundary
  await env.EDITOR_SESSIONS.put(key, String(current + 1), { expirationTtl });
}

function makeKey(subject: string): string {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `session:${subject}:${today}`;
}

async function readCount(env: Env, key: string): Promise<number> {
  const raw = await env.EDITOR_SESSIONS.get(key);
  if (raw == null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function secondsUntilUtcMidnight(): number {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0),
  );
  return Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}
