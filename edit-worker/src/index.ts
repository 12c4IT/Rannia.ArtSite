// Cloudflare Worker HTTP entrypoint.
//
// Routes:
//   GET  /health   — sanity endpoint (no auth). Returns 200.
//   POST /edit     — the AI editor. Auth via Cloudflare Access, streams
//                    progress + result as Server-Sent Events.
//   OPTIONS *      — CORS preflight for the Netlify-hosted /edit UI.
//
// Everything else returns 404.

import { verifyAccessJwt } from './auth';
import type { Env } from './env';
import { parseEditRequest } from './multipart';
import { runPipeline } from './pipeline';
import { checkRateLimit, incrementRateLimit } from './rate-limit';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return corsPreflight(request);
    if (url.pathname === '/health' && request.method === 'GET') {
      return corsJson({ ok: true, ts: Date.now() });
    }
    if (url.pathname === '/edit' && request.method === 'POST') {
      return handleEdit(request, env);
    }
    return corsJson({ error: 'not-found' }, 404);
  },
};

async function handleEdit(request: Request, env: Env): Promise<Response> {
  // 1. Auth (Cloudflare Access JWT + email allowlist).
  const auth = await verifyAccessJwt(request, env);
  if (!auth.ok) return corsJson({ error: 'unauthorised', reason: auth.reason }, auth.status);

  // 2. Rate-limit peek (before we do the multipart parse — fast rejection).
  const rl = await checkRateLimit(auth.subject, env);
  if (!rl.ok) {
    return corsJson(
      { error: 'rate-limited', count: rl.count, retryAfterSeconds: rl.retryAfterSeconds },
      429,
    );
  }

  // 3. Parse the multipart body.
  const parsed = await parseEditRequest(request);
  if (!parsed.ok) {
    return corsJson({ error: parsed.reason, detail: parsed.detail }, parsed.status);
  }

  // 4. Open an SSE stream and run the pipeline into it.
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  (async () => {
    let successful = false;
    try {
      for await (const evt of runPipeline({
        env,
        userEmail: auth.email,
        prompt: parsed.prompt,
        images: parsed.images,
      })) {
        if (evt.type === 'success') successful = true;
        await writeSseEvent(writer, evt);
        if (evt.type === 'success' || evt.type === 'fatal') break;
      }
    } catch (err) {
      await writeSseEvent(writer, {
        type: 'fatal',
        code: 'unexpected-error',
        detail: err instanceof Error ? err.message : String(err),
      });
    } finally {
      // Only bump the counter on success — a rejected/errored request
      // shouldn't consume the daily budget.
      if (successful) {
        try { await incrementRateLimit(auth.subject, env); } catch { /* ignore */ }
      }
      try { await writer.close(); } catch { /* ignore */ }
    }
  })();

  return new Response(readable, {
    status: 200,
    headers: withCors({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    }, request),
  });
}

// ─── SSE writer ────────────────────────────────────────────────────────

async function writeSseEvent(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  event: unknown,
): Promise<void> {
  const line = `event: message\ndata: ${JSON.stringify(event)}\n\n`;
  await writer.write(new TextEncoder().encode(line));
}

// ─── CORS ──────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = new Set([
  'https://rannia-art-review.netlify.app',
  'http://localhost:4321', // Astro dev default
  'http://localhost:3000',
]);

function withCors(headers: Record<string, string>, request: Request): Record<string, string> {
  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  }
  return headers;
}

function corsPreflight(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: withCors(
      {
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Cf-Access-Jwt-Assertion',
        'Access-Control-Max-Age': '86400',
      },
      request,
    ),
  });
}

function corsJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // No Origin on this path — we don't know it. UI will re-request via
      // the /edit path where withCors runs.
      'Access-Control-Allow-Origin': '*',
    },
  });
}
