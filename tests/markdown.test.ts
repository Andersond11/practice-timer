import { describe, it, expect } from 'vitest';
import { buildMd, parseItems, applyDone, parseFrontmatter, setFrontmatterKey, buildFrontmatter } from '../src/markdown';

describe('buildMd', () => {
  it('builds markdown with header, blank line, items, trailing newline', () => {
    const items = [
      { name: 'Scales', seconds: 600 },
      { name: 'Break', seconds: 300 },
    ];
    const result = buildMd(items, '2025-03-15');
    expect(result).toBe(
      '# Practice — 2025-03-15\n\n- [ ] Scales (10)\n- [ ] Break (5)\n'
    );
  });

  it('handles empty items', () => {
    const result = buildMd([], '2025-01-01');
    expect(result).toBe('# Practice — 2025-01-01\n\n');
  });

  it('formats sub-minute durations with s suffix', () => {
    const items = [{ name: 'Quick drill', seconds: 30 }];
    const result = buildMd(items, '2025-01-01');
    expect(result).toContain('- [ ] Quick drill (30s)');
  });

  it('formats compound durations', () => {
    const items = [{ name: 'Exercise', seconds: 90 }];
    const result = buildMd(items, '2025-01-01');
    expect(result).toContain('- [ ] Exercise (1m 30s)');
  });

  it('includes full frontmatter when provided', () => {
    const items = [{ name: 'Scales', seconds: 600 }];
    const result = buildMd(items, '2025-03-15', {
      type: 'practice-log',
      date: '2025-03-15',
      planned_duration: 10,
      actual_duration: null,
      tags: ['music/practice'],
    });
    expect(result).toContain('---');
    expect(result).toContain('type: practice-log');
    expect(result).toContain('date: 2025-03-15');
    expect(result).toContain('planned_duration: 10');
    expect(result).toContain('actual_duration:');
    expect(result).toContain('  - music/practice');
    expect(result).toContain('# Practice — 2025-03-15');
  });

  it('omits frontmatter when not provided', () => {
    const items = [{ name: 'Scales', seconds: 600 }];
    const result = buildMd(items, '2025-03-15');
    expect(result).not.toContain('---');
  });
});

describe('buildFrontmatter', () => {
  it('generates full practice-log frontmatter', () => {
    const fm = buildFrontmatter({
      type: 'practice-log',
      date: '2025-03-15',
      planned_duration: 80,
      actual_duration: null,
      standard: '[[Autumn Leaves]]',
      transcription: '',
      energy: null,
      tags: ['music/practice'],
      autocontinue: true,
    });
    expect(fm).toContain('type: practice-log');
    expect(fm).toContain('date: 2025-03-15');
    expect(fm).toContain('planned_duration: 80');
    expect(fm).toContain('actual_duration:');
    expect(fm).toContain('standard: "[[Autumn Leaves]]"');
    expect(fm).toContain('transcription:');
    expect(fm).toContain('energy:');
    expect(fm).toContain('autocontinue: true');
    expect(fm).toContain('  - music/practice');
    expect(fm).toMatch(/^---\n/);
    expect(fm).toMatch(/\n---$/);
  });

  it('includes only provided fields', () => {
    const fm = buildFrontmatter({ autocontinue: true });
    expect(fm).toBe('---\nautocontinue: true\n---');
    expect(fm).not.toContain('type');
  });
});

describe('parseFrontmatter', () => {
  it('parses all practice-log fields', () => {
    const text = [
      '---',
      'type: practice-log',
      'date: 2025-03-15',
      'planned_duration: 80   # total minutes from template',
      'actual_duration:       # filled by app on completion',
      'standard: "[[Autumn Leaves]]"',
      'transcription:',
      'energy:                 # 1-5, filled by you post-session',
      'autocontinue: true',
      'tags:',
      '  - music/practice',
      '---',
      '',
      '# Practice — 2025-03-15',
    ].join('\n');

    const fm = parseFrontmatter(text);
    expect(fm.type).toBe('practice-log');
    expect(fm.date).toBe('2025-03-15');
    expect(fm.planned_duration).toBe(80);
    expect(fm.actual_duration).toBeNull();
    expect(fm.standard).toBe('[[Autumn Leaves]]');
    expect(fm.transcription).toBe('');
    expect(fm.energy).toBeNull();
    expect(fm.autocontinue).toBe(true);
    expect(fm.tags).toEqual(['music/practice']);
  });

  it('parses filled actual_duration and energy', () => {
    const text = '---\nactual_duration: 75\nenergy: 4\n---\n';
    const fm = parseFrontmatter(text);
    expect(fm.actual_duration).toBe(75);
    expect(fm.energy).toBe(4);
  });

  it('parses autocontinue false', () => {
    const text = '---\nautocontinue: false\n---\n\n# Practice\n';
    expect(parseFrontmatter(text).autocontinue).toBe(false);
  });

  it('returns empty object when no frontmatter', () => {
    const text = '# Practice\n\n- [ ] Scales (10)\n';
    expect(parseFrontmatter(text)).toEqual({});
  });

  it('parses multiple tags', () => {
    const text = '---\ntags:\n  - music/practice\n  - jazz\n---\n';
    expect(parseFrontmatter(text).tags).toEqual(['music/practice', 'jazz']);
  });

  it('handles standard without quotes', () => {
    const text = '---\nstandard: Autumn Leaves\n---\n';
    expect(parseFrontmatter(text).standard).toBe('Autumn Leaves');
  });
});

describe('setFrontmatterKey', () => {
  it('updates an existing key', () => {
    const text = '---\nautocontinue: false\n---\n\n# Practice\n';
    const result = setFrontmatterKey(text, 'autocontinue', 'true');
    expect(result).toContain('autocontinue: true');
    expect(result).toContain('# Practice');
  });

  it('preserves inline comments when updating', () => {
    const text = '---\nactual_duration:       # filled by app on completion\n---\n';
    const result = setFrontmatterKey(text, 'actual_duration', '75');
    expect(result).toContain('actual_duration: 75');
    expect(result).toContain('# filled by app on completion');
  });

  it('adds a new key to existing frontmatter', () => {
    const text = '---\nother: value\n---\n\n# Practice\n';
    const result = setFrontmatterKey(text, 'autocontinue', 'true');
    expect(result).toContain('autocontinue: true');
    expect(result).toContain('other: value');
  });

  it('creates frontmatter when none exists', () => {
    const text = '# Practice\n\n- [ ] Scales (10)\n';
    const result = setFrontmatterKey(text, 'autocontinue', 'true');
    expect(result).toMatch(/^---\nautocontinue: true\n---/);
    expect(result).toContain('# Practice');
  });
});

describe('parseItems', () => {
  it('parses items with bare numbers as minutes', () => {
    const text = '- [ ] Scales (10)\n- [ ] Break (5)\n';
    expect(parseItems(text)).toEqual([
      { name: 'Scales', seconds: 600, done: false },
      { name: 'Break', seconds: 300, done: false },
    ]);
  });

  it('parses items with m suffix', () => {
    const text = '- [ ] Scales (10m)\n';
    expect(parseItems(text)).toEqual([
      { name: 'Scales', seconds: 600, done: false },
    ]);
  });

  it('parses items with s suffix', () => {
    const text = '- [ ] Drill (30s)\n';
    expect(parseItems(text)).toEqual([
      { name: 'Drill', seconds: 30, done: false },
    ]);
  });

  it('parses items with compound durations', () => {
    const text = '- [ ] Exercise (1m 30s)\n';
    expect(parseItems(text)).toEqual([
      { name: 'Exercise', seconds: 90, done: false },
    ]);
  });

  it('parses checked items', () => {
    const text = '- [x] Scales (10)\n';
    expect(parseItems(text)).toEqual([
      { name: 'Scales', seconds: 600, done: true },
    ]);
  });

  it('skips malformed lines and frontmatter', () => {
    const text = '---\ntype: practice-log\n---\n\n# Practice\n\n- [ ] Scales (10)\n';
    expect(parseItems(text)).toEqual([
      { name: 'Scales', seconds: 600, done: false },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(parseItems('')).toEqual([]);
  });

  it('handles items with special characters in names', () => {
    const text = '- [ ] Standard — head & changes (20)\n';
    expect(parseItems(text)).toEqual([
      { name: 'Standard — head & changes', seconds: 1200, done: false },
    ]);
  });

  it('handles items with trailing metadata after duration', () => {
    const text = '- [ ] Tone — flute (10s) | category: tone\n- [ ] Stretch — neck & shoulders (12s) | category: stretch\n';
    expect(parseItems(text)).toEqual([
      { name: 'Tone — flute', seconds: 10, done: false },
      { name: 'Stretch — neck & shoulders', seconds: 12, done: false },
    ]);
  });
});

describe('applyDone', () => {
  const text = '# Practice\n\n- [ ] A (10)\n- [ ] B (5)\n- [ ] C (15)\n';

  it('marks the correct item as done', () => {
    const result = applyDone(text, 1);
    expect(result).toContain('- [x] B (5)');
    expect(result).toContain('- [ ] A (10)');
    expect(result).toContain('- [ ] C (15)');
  });

  it('marks the first item', () => {
    const result = applyDone(text, 0);
    expect(result).toContain('- [x] A (10)');
    expect(result).toContain('- [ ] B (5)');
  });

  it('marks items with s suffix as done', () => {
    const text = '# Practice\n\n- [ ] A (10s)\n- [ ] B (5s)\n';
    const result = applyDone(text, 1);
    expect(result).toContain('- [x] B (5s)');
    expect(result).toContain('- [ ] A (10s)');
  });

  it('preserves non-item lines', () => {
    const result = applyDone(text, 0);
    expect(result).toContain('# Practice');
  });
});

describe('round-trip', () => {
  it('parseItems(buildMd(items)) recovers items with done=false', () => {
    const items = [
      { name: 'Tone work — flute', seconds: 600 },
      { name: 'Break', seconds: 300 },
      { name: 'Free improv', seconds: 900 },
    ];
    const parsed = parseItems(buildMd(items, '2025-01-01'));
    expect(parsed).toEqual(items.map(i => ({ ...i, done: false })));
  });

  it('round-trips with frontmatter present', () => {
    const items = [{ name: 'Scales', seconds: 600 }];
    const fm = { type: 'practice-log' as const, date: '2025-01-01', tags: ['music/practice'] };
    const md = buildMd(items, '2025-01-01', fm);
    expect(parseItems(md)).toEqual([{ name: 'Scales', seconds: 600, done: false }]);
    expect(parseFrontmatter(md).type).toBe('practice-log');
    expect(parseFrontmatter(md).tags).toEqual(['music/practice']);
  });
});
