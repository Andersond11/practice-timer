import { describe, it, expect } from 'vitest';
import { buildMd, parseItems, applyDone } from '../src/markdown';

describe('buildMd', () => {
  it('builds markdown with header, blank line, items, trailing newline', () => {
    const items = [
      { name: 'Scales', minutes: 10 },
      { name: 'Break', minutes: 5 },
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
});

describe('parseItems', () => {
  it('parses unchecked items', () => {
    const text = '- [ ] Scales (10)\n- [ ] Break (5)\n';
    expect(parseItems(text)).toEqual([
      { name: 'Scales', minutes: 10, done: false },
      { name: 'Break', minutes: 5, done: false },
    ]);
  });

  it('parses checked items', () => {
    const text = '- [x] Scales (10)\n';
    expect(parseItems(text)).toEqual([
      { name: 'Scales', minutes: 10, done: true },
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
      { name: 'Scales', minutes: 10, done: false },
    ]);
  });

  it('returns empty array for empty input', () => {
    expect(parseItems('')).toEqual([]);
  });

  it('handles items with special characters in names', () => {
    const text = '- [ ] Standard — head & changes (20)\n';
    expect(parseItems(text)).toEqual([
      { name: 'Standard — head & changes', minutes: 20, done: false },
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

  it('leaves already-done items unchanged', () => {
    const withDone = '- [x] A (10)\n- [ ] B (5)\n';
    const result = applyDone(withDone, 0);
    // Index 0 is already done — replace still matches, but - [x] -> - [x] since
    // the replace only changes - [ ] to - [x]
    expect(result).toContain('- [x] A (10)');
  });

  it('preserves non-item lines', () => {
    const result = applyDone(text, 0);
    expect(result).toContain('# Practice');
  });
});

describe('round-trip', () => {
  it('parseItems(buildMd(items)) recovers items with done=false', () => {
    const items = [
      { name: 'Tone work — flute', minutes: 10 },
      { name: 'Break', minutes: 5 },
      { name: 'Free improv', minutes: 15 },
    ];
    const parsed = parseItems(buildMd(items, '2025-01-01'));
    expect(parsed).toEqual(items.map(i => ({ ...i, done: false })));
  });
});
