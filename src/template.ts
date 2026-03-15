import type { TemplateItem } from './types';

export type ParseResult =
  | { ok: true; items: TemplateItem[] }
  | { ok: false; error: string };

/** Parse a template draft (one item per line, "Name (minutes)" format). */
export function parseTemplateDraft(draft: string): ParseResult {
  const lines = draft.split('\n').filter(l => l.trim());
  const items: TemplateItem[] = [];
  for (const l of lines) {
    const m = l.trim().match(/^(.+?) \((\d+)\)\s*$/);
    if (!m) {
      return { ok: false, error: `Can't parse: "${l.trim()}" — use: Name (minutes)` };
    }
    items.push({ name: m[1], minutes: +m[2] });
  }
  return { ok: true, items };
}

/** Serialize template items to the draft text format. */
export function serializeTemplate(items: TemplateItem[]): string {
  return items.map(i => `${i.name} (${i.minutes})`).join('\n');
}
