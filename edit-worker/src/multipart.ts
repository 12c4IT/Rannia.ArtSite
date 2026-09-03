// Multipart request parser for the /edit endpoint.
//
// Expected form fields:
//   prompt       — text
//   image-<n>    — binary file (optional, up to CONFIG.limits.perRequestImages)
//   target-<n>   — text: the target-slug for image-<n>, e.g.
//                  `case-studies/bourgeois-louise` (so the final on-disk path
//                  is `src/content/case-studies/bourgeois-louise/images/<filename>`)
//                  or `public/uploads` for site-wide images.
//
// Images are magic-byte sniffed — the browser's `type` attribute is a hint,
// never trusted for security decisions.

import { CONFIG } from './config';

export interface ParsedImage {
  /** Final repo-relative path this image will be committed to. */
  path: string;
  /** Original filename supplied by the browser. */
  filename: string;
  /** Sniffed content type — mismatched files rejected before this runs. */
  contentType: 'image/png' | 'image/jpeg' | 'image/webp';
  bytes: Uint8Array;
}

export type ParseResult =
  | { ok: true; prompt: string; images: ParsedImage[] }
  | { ok: false; status: 400; reason: string; detail?: string };

const IMAGE_TARGET_ALLOWED = new Set([
  // Any slug under case-studies/ — validated by the allow-rule later.
  'case-studies',
  // Public uploads bucket.
  'public',
]);

export async function parseEditRequest(request: Request): Promise<ParseResult> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.startsWith('multipart/form-data')) {
    return { ok: false, status: 400, reason: 'expected-multipart' };
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    return {
      ok: false,
      status: 400,
      reason: 'multipart-parse-error',
      detail: err instanceof Error ? err.message : String(err),
    };
  }

  const prompt = form.get('prompt');
  if (typeof prompt !== 'string' || prompt.length === 0) {
    return { ok: false, status: 400, reason: 'prompt-required' };
  }
  if (prompt.length > 4096) {
    return { ok: false, status: 400, reason: 'prompt-too-long' };
  }

  const images: ParsedImage[] = [];
  for (let i = 0; i < CONFIG.limits.perRequestImages; i++) {
    const file = form.get(`image-${i}`);
    if (!file) continue;
    // FormData entries are `FormDataEntryValue = File | string`. The Worker's
    // File type isn't a global class token — duck-type on the essential API.
    if (typeof file === 'string' || typeof (file as { arrayBuffer?: unknown }).arrayBuffer !== 'function') {
      return { ok: false, status: 400, reason: `image-${i}-not-a-file` };
    }
    const asFile = file as { name: string; size: number; arrayBuffer(): Promise<ArrayBuffer> };
    const target = form.get(`target-${i}`);
    if (typeof target !== 'string') {
      return { ok: false, status: 400, reason: `target-${i}-required` };
    }
    const targetCheck = validateImageTarget(target, asFile.name);
    if (!targetCheck.ok) {
      return { ok: false, status: 400, reason: targetCheck.reason };
    }

    if (asFile.size > CONFIG.limits.perImageBytes) {
      return { ok: false, status: 400, reason: `image-${i}-over-limit` };
    }
    const bytes = new Uint8Array(await asFile.arrayBuffer());
    const sniffed = sniffImage(bytes);
    if (!sniffed) {
      return { ok: false, status: 400, reason: `image-${i}-unrecognised-format` };
    }

    images.push({
      path: targetCheck.path,
      filename: asFile.name,
      contentType: sniffed,
      bytes,
    });
  }

  // If image-N exists for N > 0 but N-1 doesn't, the client sent a sparse
  // form. Not fatal but the caller relies on contiguous indices — the loop
  // above ignores gaps, which is fine.

  return { ok: true, prompt, images };
}

function validateImageTarget(
  target: string,
  filename: string,
): { ok: true; path: string } | { ok: false; reason: string } {
  if (target.length === 0) return { ok: false, reason: 'empty-target' };
  if (!/^[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(target)) {
    return { ok: false, reason: 'target-shape-invalid' };
  }
  const [head] = target.split('/');
  if (head === undefined || !IMAGE_TARGET_ALLOWED.has(head)) {
    return { ok: false, reason: 'target-not-permitted' };
  }
  if (!/^[a-z0-9._-]+$/i.test(filename)) {
    return { ok: false, reason: 'filename-shape-invalid' };
  }
  if (filename.length > 96) {
    return { ok: false, reason: 'filename-too-long' };
  }

  // Compose final on-disk path.
  const path =
    head === 'public'
      ? `public/uploads/${filename}`
      : `src/content/${target}/images/${filename}`;
  return { ok: true, path };
}

/**
 * Sniff image bytes by magic-number. Returns the MIME type or null.
 * Deliberately narrow: only formats astro:assets processes cleanly on the
 * site, and only formats that don't carry XML+script attack surface.
 * SVG is intentionally excluded.
 */
function sniffImage(bytes: Uint8Array): 'image/png' | 'image/jpeg' | 'image/webp' | null {
  if (bytes.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF ...
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  // WEBP: RIFF....WEBP
  if (
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return 'image/webp';
  }

  return null;
}
