// Anthropic Messages API client for the edit Worker.
//
// Uses fetch directly rather than the official SDK — the SDK's runtime
// checks aren't Workers-friendly and we only need one endpoint. Streaming
// is on by default so the browser can render progress; a non-streaming
// mode falls out if we ever need to drop SSE per PLAN.md's "compression
// lever" note.
//
// The Anthropic SSE format is documented at:
// https://docs.anthropic.com/en/api/messages-streaming

import type { WriteFilesInput } from './tool-schema';
import { parseWriteFilesInput, TOOL_CHOICE, WRITE_FILES_TOOL } from './tool-schema';

export interface AnthropicRequest {
  apiKey: string;
  model: string;
  systemPrompt: string;
  messages: AnthropicMessage[];
  maxOutputTokens: number;
}

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: MessageContent[];
}

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface AnthropicResponse {
  ok: true;
  toolUse: { id: string; input: WriteFilesInput };
  stopReason: string;
  usage: { input_tokens: number; output_tokens: number };
  requestId: string;
}

export type AnthropicError =
  | { ok: false; kind: 'no-tool-use'; requestId: string; stopReason: string; assistantText?: string }
  | { ok: false; kind: 'max-tokens'; requestId: string }
  | { ok: false; kind: 'malformed-tool-input'; requestId: string }
  | { ok: false; kind: 'http-error'; status: number; body: string; requestId: string | null }
  | { ok: false; kind: 'sse-parse-error'; detail: string; requestId: string | null };

/**
 * Call Anthropic in streaming mode, forwarding each token-delta event to
 * `onProgress` for SSE-relay to the browser. Buffers the tool_use block and
 * returns it once `message_stop` arrives.
 */
export async function callAnthropic(
  req: AnthropicRequest,
  onProgress?: (event: ProgressEvent) => void,
): Promise<AnthropicResponse | AnthropicError> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': req.apiKey,
      'Anthropic-Version': '2023-06-01',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({
      model: req.model,
      max_tokens: req.maxOutputTokens,
      system: req.systemPrompt,
      messages: req.messages,
      tools: [WRITE_FILES_TOOL],
      tool_choice: TOOL_CHOICE,
      stream: true,
    }),
  });

  const requestId = res.headers.get('request-id') ?? res.headers.get('x-request-id');

  if (!res.ok) {
    const body = await res.text();
    return { ok: false, kind: 'http-error', status: res.status, body, requestId };
  }

  if (!res.body) {
    return {
      ok: false,
      kind: 'sse-parse-error',
      detail: 'no-response-body',
      requestId,
    };
  }

  const state = {
    toolUseId: null as string | null,
    toolUseInputRaw: '' as string,
    assistantText: '' as string,
    stopReason: '' as string,
    usage: { input_tokens: 0, output_tokens: 0 },
  };

  try {
    for await (const evt of parseSseStream(res.body)) {
      dispatchEvent(evt, state, onProgress);
    }
  } catch (err) {
    return {
      ok: false,
      kind: 'sse-parse-error',
      detail: err instanceof Error ? err.message : String(err),
      requestId,
    };
  }

  if (state.stopReason === 'max_tokens') {
    return { ok: false, kind: 'max-tokens', requestId: requestId ?? '' };
  }
  if (state.toolUseId == null || state.toolUseInputRaw === '') {
    return {
      ok: false,
      kind: 'no-tool-use',
      requestId: requestId ?? '',
      stopReason: state.stopReason,
      assistantText: state.assistantText || undefined,
    };
  }

  let inputJson: unknown;
  try {
    inputJson = JSON.parse(state.toolUseInputRaw);
  } catch {
    return { ok: false, kind: 'malformed-tool-input', requestId: requestId ?? '' };
  }
  const parsed = parseWriteFilesInput(inputJson);
  if (!parsed) {
    return { ok: false, kind: 'malformed-tool-input', requestId: requestId ?? '' };
  }

  return {
    ok: true,
    toolUse: { id: state.toolUseId, input: parsed },
    stopReason: state.stopReason,
    usage: state.usage,
    requestId: requestId ?? '',
  };
}

// ─── Progress events forwarded to the browser via SSE ─────────────────

export type ProgressEvent =
  | { type: 'assistant-text'; text: string }
  | { type: 'tool-input-delta'; text: string }
  | { type: 'usage'; input_tokens: number; output_tokens: number };

interface SseEvent {
  type: string;
  data: Record<string, unknown>;
}

async function* parseSseStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const chunk = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        const evt = parseSseChunk(chunk);
        if (evt) yield evt;
      }
    }
    if (buffer.length > 0) {
      const evt = parseSseChunk(buffer);
      if (evt) yield evt;
    }
  } finally {
    reader.releaseLock();
  }
}

function parseSseChunk(chunk: string): SseEvent | null {
  let eventName = 'message';
  let dataStr = '';
  for (const line of chunk.split('\n')) {
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    else if (line.startsWith('data:')) dataStr += line.slice(5).trim();
  }
  if (dataStr === '') return null;
  try {
    return { type: eventName, data: JSON.parse(dataStr) };
  } catch {
    return null;
  }
}

function dispatchEvent(
  evt: SseEvent,
  state: {
    toolUseId: string | null;
    toolUseInputRaw: string;
    assistantText: string;
    stopReason: string;
    usage: { input_tokens: number; output_tokens: number };
  },
  onProgress?: (event: ProgressEvent) => void,
): void {
  switch (evt.type) {
    case 'content_block_start': {
      const cb = (evt.data['content_block'] as Record<string, unknown> | undefined) ?? {};
      if (cb['type'] === 'tool_use') {
        state.toolUseId = String(cb['id'] ?? '');
      }
      break;
    }
    case 'content_block_delta': {
      const delta = (evt.data['delta'] as Record<string, unknown> | undefined) ?? {};
      if (delta['type'] === 'text_delta' && typeof delta['text'] === 'string') {
        state.assistantText += delta['text'];
        onProgress?.({ type: 'assistant-text', text: delta['text'] });
      } else if (delta['type'] === 'input_json_delta' && typeof delta['partial_json'] === 'string') {
        state.toolUseInputRaw += delta['partial_json'];
        onProgress?.({ type: 'tool-input-delta', text: delta['partial_json'] });
      }
      break;
    }
    case 'message_delta': {
      const delta = (evt.data['delta'] as Record<string, unknown> | undefined) ?? {};
      if (typeof delta['stop_reason'] === 'string') {
        state.stopReason = delta['stop_reason'];
      }
      const usage = evt.data['usage'] as Record<string, unknown> | undefined;
      if (usage) {
        state.usage.output_tokens = Number(usage['output_tokens'] ?? state.usage.output_tokens);
        onProgress?.({
          type: 'usage',
          input_tokens: state.usage.input_tokens,
          output_tokens: state.usage.output_tokens,
        });
      }
      break;
    }
    case 'message_start': {
      const msg = evt.data['message'] as Record<string, unknown> | undefined;
      const usage = msg?.['usage'] as Record<string, unknown> | undefined;
      if (usage) {
        state.usage.input_tokens = Number(usage['input_tokens'] ?? 0);
        state.usage.output_tokens = Number(usage['output_tokens'] ?? 0);
      }
      break;
    }
    case 'message_stop':
    case 'ping':
    case 'content_block_stop':
      break;
    default:
      // Unknown event types are safe to ignore — Anthropic adds new ones.
      break;
  }
}
