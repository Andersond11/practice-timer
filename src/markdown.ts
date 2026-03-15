import type { TemplateItem, SessionItem } from './types';

/** Build a practice markdown file from template items and a date string. */
export function buildMd(items: TemplateItem[], dateStr: string): string {
  return [
    `# Practice — ${dateStr}`,
    '',
    ...items.map(i => `- [ ] ${i.name} (${i.minutes})`),
    '',
  ].join('\n');
}

/** Parse session items from a practice markdown file. */
export function parseItems(text: string): SessionItem[] {
  return text.split('\n').flatMap(line => {
    const m = line.match(/^- \[([ x])\] (.+?) \((\d+)\)\s*$/);
    return m ? [{ name: m[2], minutes: +m[3], done: m[1] === 'x' }] : [];
  });
}

/** Mark a specific item index as done in the markdown text. */
export function applyDone(text: string, idx: number): string {
  let n = 0;
  return text
    .split('\n')
    .map(line => {
      if (/^- \[([ x])\] .+? \(\d+\)\s*$/.test(line)) {
        if (n++ === idx) return line.replace('- [ ]', '- [x]');
      }
      return line;
    })
    .join('\n');
}
