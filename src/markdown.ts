import type { TemplateItem, SessionItem, Frontmatter } from './types';
import { parseDuration, formatDurationTag } from './helpers';

/** Regex matching a practice item line, capturing checkbox, name, and duration tag. */
const ITEM_RE = /^- \[([ x])\] (.+?) \(([^)]+)\)\s*$/;

/** Build a practice markdown file from template items, a date string, and frontmatter. */
export function buildMd(items: TemplateItem[], dateStr: string, frontmatter?: Frontmatter): string {
  const parts: string[] = [];

  if (frontmatter && Object.keys(frontmatter).length > 0) {
    parts.push('---');
    if (frontmatter.autocontinue !== undefined) {
      parts.push(`autocontinue: ${frontmatter.autocontinue}`);
    }
    parts.push('---');
    parts.push('');
  }

  parts.push(`# Practice — ${dateStr}`);
  parts.push('');
  parts.push(...items.map(i => `- [ ] ${i.name} (${formatDurationTag(i.seconds)})`));
  parts.push('');

  return parts.join('\n');
}

/** Parse YAML frontmatter from markdown text. */
export function parseFrontmatter(text: string): Frontmatter {
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm: Frontmatter = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      if (kv[1] === 'autocontinue') {
        fm.autocontinue = kv[2].trim() === 'true';
      }
    }
  }
  return fm;
}

/** Update or insert a frontmatter key in the markdown text. */
export function setFrontmatterKey(text: string, key: string, value: string): string {
  const fmMatch = text.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (fmMatch) {
    const lines = fmMatch[2].split('\n');
    const idx = lines.findIndex(l => l.startsWith(`${key}:`));
    if (idx >= 0) {
      lines[idx] = `${key}: ${value}`;
    } else {
      lines.push(`${key}: ${value}`);
    }
    return fmMatch[1] + lines.join('\n') + fmMatch[3] + text.slice(fmMatch[0].length);
  }
  // No frontmatter — prepend it
  return `---\n${key}: ${value}\n---\n\n` + text;
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
