import type { TemplateItem } from './types';
import { parseDuration, formatDurationTag } from './helpers';

export type ParseResult =
  | { ok: true; items: TemplateItem[] }
  | { ok: false; error: string };

/** Parse a template draft (one item per line, "Name (duration)" format). */
export function parseTemplateDraft(draft: string): ParseResult {
  const lines = draft.split('\n').filter(l => l.trim());
  const items: TemplateItem[] = [];
  for (const l of lines) {
    const m = l.trim().match(/^(.+?) \(([^)]+)\)\s*$/);
    if (!m) {
      return { ok: false, error: `Can't parse: "${l.trim()}" — use: Name (duration)` };
    }
    const secs = parseDuration(m[2]);
    if (secs === null) {
      return { ok: false, error: `Invalid duration: "${m[2]}" — use: 10m, 30s, or 1m 30s` };
    }
    items.push({ name: m[1], seconds: secs });
  }
  return { ok: true, items };
}

/** Serialize template items to the draft text format. */
export function serializeTemplate(items: TemplateItem[]): string {
  return items.map(i => `${i.name} (${formatDurationTag(i.seconds)})`).join('\n');
}
