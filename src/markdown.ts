import type { TemplateItem, SessionItem, Frontmatter } from './types';
import { parseDuration, formatDurationTag } from './helpers';

/** Regex matching a practice item line, capturing checkbox, name, and duration tag. */
const ITEM_RE = /^- \[([ x])\] (.+?) \(([^)]+)\)\s*$/;

/** Build a YAML frontmatter block from a Frontmatter object. */
export function buildFrontmatter(fm: Frontmatter): string {
  const lines: string[] = ['---'];

  if (fm.type !== undefined) lines.push(`type: ${fm.type}`);
  if (fm.date !== undefined) lines.push(`date: ${fm.date}`);
  if (fm.planned_duration !== undefined) {
    lines.push(`planned_duration: ${fm.planned_duration}   # total minutes from template`);
  }
  // actual_duration: empty when null, numeric when set
  if ('actual_duration' in fm) {
    lines.push(`actual_duration: ${fm.actual_duration ?? ''}       # filled by app on completion`);
  }
  if (fm.standard !== undefined) lines.push(`standard: "${fm.standard}"`);
  if (fm.transcription !== undefined) lines.push(`transcription: ${fm.transcription || ''}`);
  if ('energy' in fm) {
    lines.push(`energy: ${fm.energy ?? ''}                 # 1-5, filled by you post-session`);
  }
  if (fm.autocontinue !== undefined) lines.push(`autocontinue: ${fm.autocontinue}`);
  if (fm.tags && fm.tags.length > 0) {
    lines.push('tags:');
    for (const tag of fm.tags) {
      lines.push(`  - ${tag}`);
    }
  }

  lines.push('---');
  return lines.join('\n');
}

/** Build a practice markdown file from template items, a date string, and frontmatter. */
export function buildMd(items: TemplateItem[], dateStr: string, frontmatter?: Frontmatter): string {
  const parts: string[] = [];

  if (frontmatter && Object.keys(frontmatter).length > 0) {
    parts.push(buildFrontmatter(frontmatter));
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
  const rawLines = m[1].split('\n');

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const kv = line.match(/^(\w[\w_]*):\s*(.*?)$/);
    if (!kv) continue;
    const [, key, rawVal] = kv;
    // Strip inline YAML comments: remove # and everything after,
    // unless the # is inside quotes
    const val = rawVal
      .replace(/^([^"']*?)\s+#.*$/, '$1')  // strip # outside quotes
      .replace(/^#.*$/, '')                  // strip leading # (empty value with comment)
      .trim();

    switch (key) {
      case 'type':
        fm.type = val || undefined;
        break;
      case 'date':
        fm.date = val || undefined;
        break;
      case 'planned_duration':
        fm.planned_duration = val ? +val : undefined;
        break;
      case 'actual_duration':
        fm.actual_duration = val ? +val : null;
        break;
      case 'standard':
        // Strip surrounding quotes
        fm.standard = val.replace(/^["']|["']$/g, '') || undefined;
        break;
      case 'transcription':
        fm.transcription = val || '';
        break;
      case 'energy':
        fm.energy = val ? +val : null;
        break;
      case 'autocontinue':
        fm.autocontinue = val === 'true';
        break;
      case 'tags':
        if (val) {
          // Inline list: tags: [a, b]
          fm.tags = val.replace(/^\[|\]$/g, '').split(',').map(s => s.trim()).filter(Boolean);
        } else {
          // Block list: following lines with "  - value"
          const tags: string[] = [];
          while (i + 1 < rawLines.length && rawLines[i + 1].match(/^\s+-\s+/)) {
            i++;
            const tagMatch = rawLines[i].match(/^\s+-\s+(.+)/);
            if (tagMatch) tags.push(tagMatch[1].trim());
          }
          fm.tags = tags.length > 0 ? tags : undefined;
        }
        break;
    }
  }
  return fm;
}

/** Update or insert a frontmatter key in the markdown text. */
export function setFrontmatterKey(text: string, key: string, value: string): string {
  const fmMatch = text.match(/^(---\n)([\s\S]*?)(\n---)/);
  if (fmMatch) {
    const lines = fmMatch[2].split('\n');
    const idx = lines.findIndex(l => l.match(new RegExp(`^${key}:`)));
    if (idx >= 0) {
      // Preserve any inline comment
      const commentMatch = lines[idx].match(/(\s+#.*)$/);
      const comment = commentMatch ? commentMatch[1] : '';
      lines[idx] = `${key}: ${value}${comment}`;
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
