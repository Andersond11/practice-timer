import { describe, it, expect } from 'vitest';
import { buildMd, parseItems, applyDone, parseFrontmatter, setFrontmatterKey } from '../src/markdown';

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

  it('includes frontmatter when provided', () => {
    const items = [{ name: 'Scales', seconds: 600 }];
    const result = buildMd(items, '2025-03-15', { autocontinue: true });
    expect(result).toBe(
      '---\nautocontinue: true\n---\n\n# Practice — 2025-03-15\n\n- [ ] Scales (10)\n'
    );
  });

  it('omits frontmatter when not provided', () => {
    const items = [{ name: 'Scales', seconds: 600 }];
    const result = buildMd(items, '2025-03-15');
    expect(result).not.toContain('---');
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

  it('parses mixed checked/unchecked', () => {
    const text = '- [x] Done item (5)\n- [ ] Pending item (15)\n';
    const items = parseItems(text);
    expect(items[0].done).toBe(true);
    expect(items[1].done).toBe(false);
  });

  it('skips malformed lines', () => {
    const text = '# Practice — 2025-03-15\n\nsome random text\n- [ ] Scales (10)\n';
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

  it('marks items with compound duration as done', () => {
    const text = '- [ ] A (1m 30s)\n- [ ] B (2m 15s)\n';
    const result = applyDone(text, 0);
    expect(result).toContain('- [x] A (1m 30s)');
  });

  it('preserves non-item lines', () => {
    const result = applyDone(text, 0);
    expect(result).toContain('# Practice');
  });
});

describe('parseFrontmatter', () => {
  it('parses autocontinue from frontmatter', () => {
    const text = '---\nautocontinue: true\n---\n\n# Practice\n';
    expect(parseFrontmatter(text)).toEqual({ autocontinue: true });
  });

  it('parses autocontinue false', () => {
    const text = '---\nautocontinue: false\n---\n\n# Practice\n';
    expect(parseFrontmatter(text)).toEqual({ autocontinue: false });
  });

  it('returns empty object when no frontmatter', () => {
    const text = '# Practice\n\n- [ ] Scales (10)\n';
    expect(parseFrontmatter(text)).toEqual({});
  });

  it('ignores unknown keys', () => {
    const text = '---\nunknown: value\nautocontinue: true\n---\n';
    expect(parseFrontmatter(text)).toEqual({ autocontinue: true });
  });
});

describe('setFrontmatterKey', () => {
  it('updates an existing key', () => {
    const text = '---\nautocontinue: false\n---\n\n# Practice\n';
    const result = setFrontmatterKey(text, 'autocontinue', 'true');
    expect(result).toContain('autocontinue: true');
    expect(result).toContain('# Practice');
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

  it('round-trips compound durations', () => {
    const items = [{ name: 'Exercise', seconds: 90 }];
    const parsed = parseItems(buildMd(items, '2025-01-01'));
    expect(parsed).toEqual([{ name: 'Exercise', seconds: 90, done: false }]);
  });
});
