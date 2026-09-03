// Anthropic tool definition — the only structure the model can return.
//
// Under patch mode:
//   - `update` requires `edits`, each with old_str + new_str.
//   - `create` requires full `content` for the new file.
//   - No `delete` action. No binary handling — images ride in the multipart
//     request body outside the model's view.
//
// The Worker enforces `tool_choice: {type: "tool", name: "write_files"}` so
// the model cannot return free text.

export const WRITE_FILES_TOOL = {
  name: 'write_files',
  description:
    'Propose changes to fulfil the owner\'s request. To modify an existing file, use action=update with edits[] — each edit\'s old_str must appear exactly once in the current file, and everything outside those old_str spans is preserved byte-identically. To create a new file, use action=create with full content. Binary files (images) are handled outside this tool — the owner has uploaded them and you have been told their final on-disk paths. Reference those paths in markdown; do not include their content.',
  input_schema: {
    type: 'object' as const,
    properties: {
      commit_message: {
        type: 'string' as const,
        description: 'One-line conventional-commit message. Under 72 characters.',
      },
      explanation: {
        type: 'string' as const,
        description:
          'One paragraph in plain English that the owner will see. Explain what you changed and why in her terms.',
      },
      files: {
        type: 'array' as const,
        minItems: 1,
        maxItems: 20,
        items: {
          oneOf: [
            {
              type: 'object' as const,
              required: ['path', 'action', 'edits'],
              properties: {
                path: { type: 'string' as const },
                action: { type: 'string' as const, enum: ['update'] },
                edits: {
                  type: 'array' as const,
                  minItems: 1,
                  maxItems: 10,
                  items: {
                    type: 'object' as const,
                    required: ['old_str', 'new_str'],
                    properties: {
                      old_str: {
                        type: 'string' as const,
                        description:
                          'MUST match exactly once in the current file. Include enough surrounding context to disambiguate — three to five lines is usually right. Whitespace and indentation are significant.',
                      },
                      new_str: {
                        type: 'string' as const,
                        description:
                          'The replacement. Use an empty string to delete the matched span.',
                      },
                    },
                  },
                },
              },
            },
            {
              type: 'object' as const,
              required: ['path', 'action', 'content'],
              properties: {
                path: { type: 'string' as const },
                action: { type: 'string' as const, enum: ['create'] },
                content: {
                  type: 'string' as const,
                  description:
                    'Full file content for a new file. Text only. Frontmatter must satisfy the collection schema; the status field must be omitted or set to "draft".',
                },
              },
            },
          ],
        },
      },
    },
    required: ['commit_message', 'explanation', 'files'],
  },
} as const;

export const TOOL_CHOICE = {
  type: 'tool' as const,
  name: 'write_files' as const,
};

// ─── Types for the returned tool_use block ────────────────────────────

export interface UpdateFile {
  path: string;
  action: 'update';
  edits: { old_str: string; new_str: string }[];
}

export interface CreateFile {
  path: string;
  action: 'create';
  content: string;
}

export type WrittenFile = UpdateFile | CreateFile;

export interface WriteFilesInput {
  commit_message: string;
  explanation: string;
  files: WrittenFile[];
}

/**
 * Type-guard + shape check on Anthropic's returned tool_use input. Anthropic
 * sends us JSON that structurally SHOULD match `WriteFilesInput` — but we
 * verify defensively before trusting.
 */
export function parseWriteFilesInput(raw: unknown): WriteFilesInput | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r['commit_message'] !== 'string') return null;
  if (typeof r['explanation'] !== 'string') return null;
  if (!Array.isArray(r['files'])) return null;

  const files: WrittenFile[] = [];
  for (const f of r['files']) {
    if (!f || typeof f !== 'object') return null;
    const fr = f as Record<string, unknown>;
    if (typeof fr['path'] !== 'string') return null;
    const action = fr['action'];
    if (action === 'update') {
      if (!Array.isArray(fr['edits'])) return null;
      const edits: { old_str: string; new_str: string }[] = [];
      for (const e of fr['edits']) {
        if (!e || typeof e !== 'object') return null;
        const er = e as Record<string, unknown>;
        if (typeof er['old_str'] !== 'string' || typeof er['new_str'] !== 'string') return null;
        edits.push({ old_str: er['old_str'], new_str: er['new_str'] });
      }
      files.push({ path: fr['path'], action: 'update', edits });
    } else if (action === 'create') {
      if (typeof fr['content'] !== 'string') return null;
      files.push({ path: fr['path'], action: 'create', content: fr['content'] });
    } else {
      return null;
    }
  }

  return {
    commit_message: r['commit_message'],
    explanation: r['explanation'],
    files,
  };
}
