import type { TemplateItem, SessionItem } from './types';
import { parseDuration, formatDurationTag } from './helpers';

/** Regex matching a practice item line, capturing checkbox, name, and duration tag. */
const ITEM_RE = /^- \[([ x])\] (.+?) \(([^)]+)\)\s*$/;

/** Build a practice markdown file from template items and a date string. */
export function buildMd(items: TemplateItem[], dateStr: string): string {
  return [
    `# Practice — ${dateStr}`,
    '',
    ...items.map(i => `- [ ] ${i.name} (${formatDurationTag(i.seconds)})`),
    '',
  ].join('\n');
}

/** Parse session items from a practice markdown file. */
export function parseItems(text: string): SessionItem[] {
  return text.split('\n').flatMap(line => {
    const m = line.match(ITEM_RE);
    if (!m) return [];
    const secs = parseDuration(m[3]);
    if (secs === null) return [];
    return [{ name: m[2], seconds: secs, done: m[1] === 'x' }];
  });
}

/** Mark a specific item index as done in the markdown text. */
export function applyDone(text: string, idx: number): string {
  let n = 0;
  return text
    .split('\n')
    .map(line => {
      if (ITEM_RE.test(line)) {
        if (n++ === idx) return line.replace('- [ ]', '- [x]');
      }
      return line;
    })
    .join('\n');
}
