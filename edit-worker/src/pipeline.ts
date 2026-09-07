// Orchestrator for the /edit request.
//
// Wires guardrails, current-file loads, Anthropic, validation, patch
// application, and the GitHub commit. Emits progress events to a channel
// so index.ts can relay them as SSE to the browser.

import type { Env } from './env';
import { CONFIG } from './config';
import { checkPatchOverlap, matchAllow, matchDeny, normalisePath, applyPatches } from './guardrails';
import type { AllowMatchResult, PatchEdit } from './types';
import { collectionForPath } from './schemas';
import type { CollectionId } from './schemas';
import { extractFrontmatter } from './frontmatter';
import { checkLockedFields, validateFrontmatter } from './validators';
import type { ParsedImage } from './multipart';
import { buildSystemPrompt } from './system-prompt';
import type { AnthropicMessage, AnthropicResponse, ProgressEvent } from './anthropic';
import { callAnthropic } from './anthropic';
import type { WriteFilesInput, WrittenFile } from './tool-schema';
import type { CommitPayload, GitHubConfig } from './github';
import { commitToMain, getBaseRef, getFiles, groupByEntry } from './github';

export type PipelineEvent =
  | ProgressEvent
  | { type: 'stage'; stage: string; detail?: string }
  | { type: 'validation-failure'; issues: readonly unknown[]; retryable: boolean }
  | { type: 'success'; commits: string[]; explanation: string; diff: DiffSummary[] }
  | { type: 'fatal'; code: string; detail?: string };

export interface DiffSummary {
  path: string;
  action: 'create' | 'update';
  edits?: { old_str: string; new_str: string }[];
  contentPreview?: string;
}

interface PipelineInputs {
  env: Env;
  userEmail: string;
  prompt: string;
  images: ParsedImage[];
}

/**
 * Async generator so the HTTP handler can pipe events into an SSE stream
 * as they happen. Yields terminal events (`success` or `fatal`) at the end
 * of any path.
 */
export async function* runPipeline(inputs: PipelineInputs): AsyncGenerator<PipelineEvent> {
  const gh: GitHubConfig = {
    token: inputs.env.GITHUB_TOKEN,
    repo: CONFIG.repo,
    baseBranch: CONFIG.baseBranch,
  };

  yield { type: 'stage', stage: 'load-base-ref' };

  let baseRef;
  try {
    baseRef = await getBaseRef(gh);
  } catch (err) {
    yield { type: 'fatal', code: 'github-base-ref-failed', detail: String(err) };
    return;
  }

  // We don't know which paths the model will edit yet, but for a common
  // case (owner references a specific case study in her prompt) we could
  // pre-load. In v1, we do the loads AFTER the first Anthropic response —
  // simpler control flow, and the LOCKED-field diff needs current content
  // anyway which happens post-validation. So we send an empty context on
  // turn 1 and let the tool call name paths, then load them for the
  // validation pass.
  //
  // Trade-off: the model authors patches without seeing current file
  // bytes, which is bad for patch mode. So we DO pre-load — but we need
  // to know which files. Approach: heuristically extract slugs mentioned
  // in the prompt, load matching case-study MDX and glossary entries.
  // v1: load ALL page files (small — 4 files, ~2K tokens) and any case
  // study whose slug appears literally in the prompt.
  const preloadPaths = derivePreloadPaths(inputs.prompt);
  yield { type: 'stage', stage: 'preload-context', detail: `${preloadPaths.length} files` };
  const context = await getFiles(gh, preloadPaths, baseRef.sha);
  const contextFiles = [...context.entries()]
    .filter(([, c]) => c !== null)
    .map(([path, content]) => ({ path, content: content! }));

  // Build the system prompt.
  const systemPrompt = buildSystemPrompt({
    prompt: inputs.prompt,
    contextFiles,
    uploadedImages: inputs.images.map((img) => ({ path: img.path, filename: img.filename })),
  });

  const messages: AnthropicMessage[] = [
    { role: 'user', content: [{ type: 'text', text: inputs.prompt }] },
  ];

  // First Anthropic turn.
  yield { type: 'stage', stage: 'call-anthropic' };
  const first = await callAnthropicWithProgress(inputs.env, systemPrompt, messages);
  for (const evt of first.events) yield evt;
  if (!first.result) return;
  if (!first.result.ok) {
    yield yieldAnthropicError(first.result);
    return;
  }

  // Validate the first attempt.
  const firstValidation = await validateAllFiles(
    first.result.toolUse.input.files,
    gh,
    baseRef.sha,
    inputs.images,
  );

  if (firstValidation.ok) {
    yield* commitAndFinalise({
      env: inputs.env,
      gh,
      baseRef,
      files: first.result.toolUse.input,
      resolved: firstValidation.resolved,
      images: inputs.images,
      userEmail: inputs.userEmail,
      requestId: first.result.requestId,
    });
    return;
  }

  // Retry once — only if the failure is a patch mismatch. Other failures
  // (path denied, schema violation, LOCKED-field mismatch) are not
  // recoverable by asking the model again.
  if (!firstValidation.retryable) {
    yield { type: 'validation-failure', issues: firstValidation.issues, retryable: false };
    yield { type: 'fatal', code: 'validation-failed' };
    return;
  }
  yield { type: 'validation-failure', issues: firstValidation.issues, retryable: true };

  // Compose the retry message: send the failing edits + counts back as a
  // tool_result with is_error:true. Model returns a new write_files.
  const retryUserMessage: AnthropicMessage = {
    role: 'user',
    content: [
      {
        type: 'tool_result',
        tool_use_id: first.result.toolUse.id,
        is_error: true,
        content: formatRetryHint(firstValidation.issues),
      },
    ],
  };
  const assistantEcho: AnthropicMessage = {
    role: 'assistant',
    content: [
      {
        type: 'tool_use',
        id: first.result.toolUse.id,
        name: 'write_files',
        input: first.result.toolUse.input,
      },
    ],
  };
  const retryMessages: AnthropicMessage[] = [...messages, assistantEcho, retryUserMessage];

  yield { type: 'stage', stage: 'retry-anthropic' };
  const second = await callAnthropicWithProgress(inputs.env, systemPrompt, retryMessages);
  for (const evt of second.events) yield evt;
  if (!second.result) return;
  if (!second.result.ok) {
    yield yieldAnthropicError(second.result);
    return;
  }

  const secondValidation = await validateAllFiles(
    second.result.toolUse.input.files,
    gh,
    baseRef.sha,
    inputs.images,
  );
  if (!secondValidation.ok) {
    yield { type: 'validation-failure', issues: secondValidation.issues, retryable: false };
    yield { type: 'fatal', code: 'validation-failed-after-retry' };
    return;
  }

  yield* commitAndFinalise({
    env: inputs.env,
    gh,
    baseRef,
    files: second.result.toolUse.input,
    resolved: secondValidation.resolved,
    images: inputs.images,
    userEmail: inputs.userEmail,
    requestId: second.result.requestId,
  });
}

// ─── Sub-steps ─────────────────────────────────────────────────────────

/**
 * Look at the prompt for literal slugs — case-study or glossary — and
 * pre-load those files as context. Also always load the small pages
 * collection since edits there are common and the total is <2KB.
 */
function derivePreloadPaths(prompt: string): string[] {
  const paths = new Set<string>([
    'src/content/pages/about.md',
    'src/content/pages/conceptual-framework.md',
    'src/content/pages/frames.md',
    'src/content/pages/practice.md',
  ]);
  // Add case studies mentioned by slug.
  const slugRe = /[a-z]+(?:-[a-z]+)+/g;
  const KNOWN_SLUGS = ['bourgeois-louise'];
  const matches = prompt.toLowerCase().match(slugRe) ?? [];
  for (const m of matches) {
    if (KNOWN_SLUGS.includes(m)) {
      paths.add(`src/content/case-studies/${m}/index.mdx`);
    }
  }
  return [...paths];
}

interface CallResult {
  events: PipelineEvent[];
  result: Awaited<ReturnType<typeof callAnthropic>> | null;
}

async function callAnthropicWithProgress(
  env: Env,
  systemPrompt: string,
  messages: AnthropicMessage[],
): Promise<CallResult> {
  const events: PipelineEvent[] = [];
  const result = await callAnthropic(
    {
      apiKey: env.ANTHROPIC_API_KEY,
      model: CONFIG.model,
      systemPrompt,
      messages,
      maxOutputTokens: CONFIG.limits.perRequestOutputTokens,
    },
    (evt) => events.push(evt),
  );
  return { events, result };
}

interface ValidationOk {
  ok: true;
  /** Final content per file after patch application. */
  resolved: { path: string; action: 'create' | 'update'; finalContent: string }[];
}

interface ValidationFailure {
  ok: false;
  retryable: boolean;
  issues: readonly ValidationIssue[];
}

export interface ValidationIssue {
  path?: string;
  code: string;
  detail?: string;
  editIndex?: number;
  matchCount?: number;
}

/**
 * Run every server-side check on a batch of files. Returns the final content
 * for each file when successful; a structured issue list on failure.
 */
async function validateAllFiles(
  files: WrittenFile[],
  gh: GitHubConfig,
  baseSha: string,
  images: ParsedImage[],
): Promise<ValidationOk | ValidationFailure> {
  const issues: ValidationIssue[] = [];
  const resolved: { path: string; action: 'create' | 'update'; finalContent: string }[] = [];

  if (files.length === 0) {
    return { ok: false, retryable: false, issues: [{ code: 'no-files' }] };
  }
  if (files.length > CONFIG.limits.perBatchFiles) {
    return { ok: false, retryable: false, issues: [{ code: 'too-many-files' }] };
  }

  // ─── Path checks (up front) ───
  const normalisedPaths: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i]!;
    const norm = normalisePath(f.path);
    if (!norm.ok) {
      issues.push({ path: f.path, code: `path-${norm.reason}` });
      continue;
    }
    normalisedPaths[i] = norm.path!;
    if (matchDeny(norm.path!, CONFIG.deny)) {
      issues.push({ path: norm.path!, code: 'path-denied' });
      continue;
    }
    const allow = matchAllow(norm.path!, f.action, CONFIG.allow, f.action === 'create' ? Buffer.byteLength(f.content) : undefined);
    if (!allow.ok) {
      issues.push({ path: norm.path!, code: `path-${allow.reason}` });
      continue;
    }
  }
  if (issues.length > 0) {
    return { ok: false, retryable: false, issues };
  }

  // ─── Batch-load current files for every update path ───
  const updatePaths = files
    .map((f, i) => (f.action === 'update' ? normalisedPaths[i]! : null))
    .filter((p): p is string => p !== null);
  const currentFiles = await getFiles(gh, updatePaths, baseSha);

  // ─── Per-file: patch apply → schema → LOCKED ───
  for (let i = 0; i < files.length; i++) {
    const f = files[i]!;
    const path = normalisedPaths[i]!;

    if (f.action === 'update') {
      const current = currentFiles.get(path);
      if (current == null) {
        issues.push({ path, code: 'update-target-missing' });
        continue;
      }
      const overlap = checkPatchOverlap(current, f.edits);
      if (!overlap.ok) {
        const reason = overlap.reason!;
        if (reason.kind === 'not-found' || reason.kind === 'multiple-matches') {
          issues.push({
            path,
            code: reason.kind,
            editIndex: reason.editIndex,
            matchCount: reason.kind === 'multiple-matches' ? reason.matchCount : undefined,
          });
        } else {
          issues.push({
            path,
            code: 'edit-overlap',
            detail: `edit ${reason.editIndexA} overlaps edit ${reason.editIndexB}`,
          });
        }
        continue;
      }
      const finalContent = applyPatches(current, f.edits as PatchEdit[], overlap.ranges!);
      const schemaOk = validateContent(path, 'update', finalContent, current);
      if (!schemaOk.ok) {
        issues.push(...schemaOk.issues.map((i2) => ({ path, ...i2 })));
        continue;
      }
      resolved.push({ path, action: 'update', finalContent });
    } else {
      // create
      const schemaOk = validateContent(path, 'create', f.content);
      if (!schemaOk.ok) {
        issues.push(...schemaOk.issues.map((i2) => ({ path, ...i2 })));
        continue;
      }
      resolved.push({ path, action: 'create', finalContent: f.content });
    }
  }

  if (issues.length > 0) {
    // Retryable if all issues are patch-mismatch style.
    const retryable = issues.every(
      (i) => i.code === 'not-found' || i.code === 'multiple-matches',
    );
    return { ok: false, retryable, issues };
  }

  // ─── Referenced-image existence check ───
  // Every image path the AI wrote in markdown that starts with `./images/`
  // (case-study convention) OR /uploads/ must appear either in the uploaded
  // images batch or in the current tree. v1: check only for uploaded images
  // in the batch matching one of the touched entries. Deeper validation
  // (grep the markdown for image references and match) is v1.1.
  void images; // TODO wire in for stricter check

  return { ok: true, resolved };
}

/**
 * Parse frontmatter, run Zod, check LOCKED fields.
 * Returns issue-list on failure — none of these are patch-retryable.
 */
function validateContent(
  path: string,
  action: 'create' | 'update',
  finalContent: string,
  currentContent?: string,
): { ok: true } | { ok: false; issues: ValidationIssue[] } {
  const collection = collectionForPath(path) as CollectionId | null;
  if (!collection) {
    // File outside any known collection — assume no frontmatter to check.
    return { ok: true };
  }

  const extracted = extractFrontmatter(finalContent);
  if (!extracted.ok) {
    return { ok: false, issues: [{ code: `frontmatter-${extracted.code}`, detail: extracted.detail }] };
  }
  const zodResult = validateFrontmatter(collection, extracted.data);
  if (!zodResult.ok) {
    return {
      ok: false,
      issues: zodResult.issues.map((i) => ({
        code: 'schema-violation',
        detail: `${i.path}: ${i.message}`,
      })),
    };
  }

  const rules = CONFIG.fieldRules[collection];
  if (rules) {
    let compareAgainst: Record<string, unknown>;
    if (action === 'update') {
      const currentExtracted = extractFrontmatter(currentContent ?? '');
      if (!currentExtracted.ok) {
        // Odd — current file's frontmatter shouldn't be malformed if the
        // site's build is green. Guard defensively.
        return { ok: false, issues: [{ code: 'current-frontmatter-malformed', detail: currentExtracted.code }] };
      }
      compareAgainst = currentExtracted.data;
    } else {
      // For create: compare against the schema defaults produced by Zod
      // parsing an "empty" object. But Zod's `.default('draft')` fires
      // only when the parsed value is undefined, which our extracted data
      // may not have as undefined. Simpler: compare against the parsed
      // data itself — schema will have coerced defaults in. For LOCKED,
      // that means AI's proposed value must equal Zod's parsed value,
      // which is only true if AI wrote the default. Correct behaviour.
      compareAgainst = zodResult.data;
    }
    const locked = checkLockedFields(action, zodResult.data, compareAgainst, rules);
    if (!locked.ok) {
      return {
        ok: false,
        issues: locked.issues.map((li) => ({
          code: 'locked-field-changed',
          detail: `${li.path} (rule: ${li.rule})`,
        })),
      };
    }
  }
  return { ok: true };
}

function formatRetryHint(issues: readonly ValidationIssue[]): string {
  const lines = ['Some edits could not be applied. Please fix them and return a corrected write_files.'];
  for (const i of issues) {
    if (i.code === 'not-found') {
      lines.push(
        `- ${i.path} edit #${i.editIndex}: old_str was not found in the current file. Include more surrounding context so it matches exactly once.`,
      );
    } else if (i.code === 'multiple-matches') {
      lines.push(
        `- ${i.path} edit #${i.editIndex}: old_str matched ${i.matchCount} times. Add surrounding context so it matches exactly once.`,
      );
    } else {
      lines.push(`- ${i.path}: ${i.code}${i.detail ? ' — ' + i.detail : ''}`);
    }
  }
  lines.push('Return a single corrected write_files call. Do not narrate — call the tool.');
  return lines.join('\n');
}

function yieldAnthropicError(err: Extract<AnthropicResponse | Awaited<ReturnType<typeof callAnthropic>>, { ok: false }>): PipelineEvent {
  if (err.kind === 'max-tokens') {
    return { type: 'fatal', code: 'output-too-long', detail: 'Try a smaller change.' };
  }
  if (err.kind === 'no-tool-use') {
    return { type: 'fatal', code: 'no-tool-use', detail: err.assistantText ?? '' };
  }
  if (err.kind === 'malformed-tool-input') {
    return { type: 'fatal', code: 'malformed-tool-input' };
  }
  if (err.kind === 'http-error') {
    return { type: 'fatal', code: `anthropic-${err.status}`, detail: err.body.slice(0, 500) };
  }
  return { type: 'fatal', code: 'anthropic-stream-error', detail: err.detail };
}

// ─── Commit + finalise ─────────────────────────────────────────────────

async function* commitAndFinalise(inputs: {
  env: Env;
  gh: GitHubConfig;
  baseRef: { sha: string; branch: string };
  files: WriteFilesInput;
  resolved: { path: string; action: 'create' | 'update'; finalContent: string }[];
  images: ParsedImage[];
  userEmail: string;
  requestId: string;
}): AsyncGenerator<PipelineEvent> {
  yield { type: 'stage', stage: 'compose-commits' };

  // Group by entry (folder-per-entry collections) so each entry gets its
  // own commit. Under the v5 direct-to-main model this doesn't buy the
  // cherry-pick-to-live granularity the v4 design assumed — but the clean
  // per-entry `git log` audit trail is worth keeping for rollback with
  // `git revert <sha>`.
  const groups = groupByEntry(inputs.files.files);
  const resolvedByPath = new Map(inputs.resolved.map((r) => [r.path, r]));

  const commits: CommitPayload[] = [];
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi]!;
    const groupImages = inputs.images.filter((img) =>
      group.some((f) => sameEntryPath(f.path, img.path)),
    );
    const textFiles = group.map((f) => {
      const resolved = resolvedByPath.get(f.path)!;
      return { path: resolved.path, content: resolved.finalContent };
    });
    const binaryFiles = groupImages.map((img) => ({
      path: img.path,
      base64: bytesToBase64(img.bytes),
    }));

    // Compose message. If the batch has multiple entries, prefix the message
    // with a subject that names this entry.
    const summary = summariseEntry(group, resolvedByPath);
    const message = groups.length > 1
      ? `content: ${summary}`
      : `content: ${inputs.files.commit_message.replace(/^content:\s*/i, '')}`;

    commits.push({
      message,
      textFiles,
      binaryFiles,
      trailer: {
        'AI-Edited-By': inputs.userEmail,
        'AI-Edited-At': new Date().toISOString(),
        'AI-Model': CONFIG.model,
        'Anthropic-Request-ID': inputs.requestId,
      },
      authorName: 'Site Owner via AI Editor',
      authorEmail: inputs.userEmail,
    });
  }

  yield { type: 'stage', stage: 'commit', detail: `${commits.length} commit(s) to ${inputs.gh.baseBranch}` };

  try {
    const commitResult = await commitToMain(inputs.gh, commits);
    const diff: DiffSummary[] = inputs.files.files.map((f) => {
      if (f.action === 'update') {
        return { path: f.path, action: 'update', edits: f.edits };
      }
      return {
        path: f.path,
        action: 'create',
        contentPreview: f.content.slice(0, 500),
      };
    });
    yield {
      type: 'success',
      commits: commitResult.commits,
      explanation: inputs.files.explanation,
      diff,
    };
  } catch (err) {
    yield { type: 'fatal', code: 'github-commit-failed', detail: String(err) };
  }
}

// ─── Small helpers ─────────────────────────────────────────────────────

function sameEntryPath(a: string, b: string): boolean {
  const keyA = a.match(/^(src\/content\/(?:case-studies|body-of-works)\/[^/]+)/);
  const keyB = b.match(/^(src\/content\/(?:case-studies|body-of-works)\/[^/]+)/);
  return Boolean(keyA && keyB && keyA[1] === keyB[1]);
}

function summariseEntry(group: WrittenFile[], resolved: Map<string, { path: string }>): string {
  const first = group[0]!;
  const path = resolved.get(first.path)?.path ?? first.path;
  const slug = path.replace(/^src\/content\/[^/]+\//, '').replace(/\/index\.mdx$/, '').replace(/\.md$/, '');
  return `${first.action} ${slug}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

// `Buffer` is provided by nodejs_compat in wrangler.toml.
declare const Buffer: { byteLength(s: string): number };
