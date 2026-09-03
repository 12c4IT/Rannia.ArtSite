// Cloudflare Access JWT verification.
//
// Access sits in front of the Worker at the edge. It authenticates the user
// (email one-time PIN), issues a signed JWT, and injects it as a header on
// every proxied request:
//
//   Cf-Access-Jwt-Assertion: <JWT>
//
// The Worker verifies the JWT against the team's public JWKS endpoint AND
// checks the `email` claim against ALLOWED_EMAILS — belt-and-braces in case
// the Access policy is accidentally widened.
//
// Docs: https://developers.cloudflare.com/cloudflare-one/identity/authorization-cookie/validating-json/

import type { Env } from './env';

export interface AuthResult {
  ok: true;
  email: string;
  /** Stable per-user identifier used as the KV rate-limit key. */
  subject: string;
}

export interface AuthFailure {
  ok: false;
  status: 401 | 403;
  reason: string;
}

interface JwtHeader {
  kid: string;
  alg: string;
}

interface JwtClaims {
  iss: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nbf?: number;
  email?: string;
  sub?: string;
  identity_nonce?: string;
}

interface Jwk {
  kid: string;
  kty: string;
  n: string;
  e: string;
  alg?: string;
  use?: string;
}

interface JwksResponse {
  keys: Jwk[];
}

// Cache the JWKS in-memory per isolate. Access rotates keys occasionally,
// so we refetch on unknown `kid`. TTL is a soft ceiling of 24h even for
// hits to catch key retirement.
let jwksCache: { keys: Map<string, CryptoKey>; fetchedAt: number } | null = null;
const JWKS_TTL_MS = 24 * 60 * 60 * 1000;

export async function verifyAccessJwt(
  request: Request,
  env: Env,
): Promise<AuthResult | AuthFailure> {
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) {
    return { ok: false, status: 401, reason: 'no-access-jwt' };
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return { ok: false, status: 401, reason: 'malformed-jwt' };
  }

  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  let header: JwtHeader;
  let claims: JwtClaims;
  try {
    header = JSON.parse(base64UrlDecodeToString(headerB64)) as JwtHeader;
    claims = JSON.parse(base64UrlDecodeToString(payloadB64)) as JwtClaims;
  } catch {
    return { ok: false, status: 401, reason: 'jwt-decode-failed' };
  }

  if (header.alg !== 'RS256') {
    return { ok: false, status: 401, reason: 'unexpected-alg' };
  }

  // Claim checks that don't require the key.
  const now = Math.floor(Date.now() / 1000);
  if (claims.exp <= now) return { ok: false, status: 401, reason: 'expired' };
  if (claims.nbf !== undefined && claims.nbf > now) {
    return { ok: false, status: 401, reason: 'not-yet-valid' };
  }
  const expectedIss = `https://${env.CF_ACCESS_TEAM}`;
  if (claims.iss !== expectedIss) {
    return { ok: false, status: 401, reason: 'wrong-issuer' };
  }
  const auds = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!auds.includes(env.CF_ACCESS_AUD)) {
    return { ok: false, status: 401, reason: 'wrong-aud' };
  }

  const key = await getVerificationKey(header.kid, env);
  if (!key) {
    return { ok: false, status: 401, reason: 'unknown-key' };
  }

  const signature = base64UrlDecodeToBytes(signatureB64);
  const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const verified = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    signature,
    signedData,
  );
  if (!verified) {
    return { ok: false, status: 401, reason: 'bad-signature' };
  }

  if (!claims.email) {
    return { ok: false, status: 403, reason: 'no-email-claim' };
  }
  const allowlisted = env.ALLOWED_EMAILS.split(',').map((e) => e.trim().toLowerCase());
  if (!allowlisted.includes(claims.email.toLowerCase())) {
    return { ok: false, status: 403, reason: 'email-not-allowlisted' };
  }

  return {
    ok: true,
    email: claims.email,
    subject: claims.sub ?? claims.email,
  };
}

async function getVerificationKey(kid: string, env: Env): Promise<CryptoKey | null> {
  const cached = jwksCache?.keys.get(kid);
  const stillFresh = jwksCache && Date.now() - jwksCache.fetchedAt < JWKS_TTL_MS;
  if (cached && stillFresh) return cached;

  // Refresh JWKS.
  const res = await fetch(`https://${env.CF_ACCESS_TEAM}/cdn-cgi/access/certs`);
  if (!res.ok) return null;
  const { keys } = (await res.json()) as JwksResponse;

  const map = new Map<string, CryptoKey>();
  for (const jwk of keys) {
    try {
      const key = await crypto.subtle.importKey(
        'jwk',
        jwk as unknown as JsonWebKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      map.set(jwk.kid, key);
    } catch {
      // Skip unimportable keys — don't fail the whole JWKS refresh.
    }
  }
  jwksCache = { keys: map, fetchedAt: Date.now() };
  return map.get(kid) ?? null;
}

// ─── Base64URL helpers ────────────────────────────────────────────────

function base64UrlDecodeToString(input: string): string {
  return new TextDecoder().decode(base64UrlDecodeToBytes(input));
}

function base64UrlDecodeToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
