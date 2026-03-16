import { describe, it, expect } from 'vitest';
import { parseTemplateDraft, serializeTemplate } from '../src/template';

describe('parseTemplateDraft', () => {
  it('parses items with bare numbers as minutes', () => {
    const draft = 'Scales (15)\nBreak (5)\nImprov (20)';
    const result = parseTemplateDraft(draft);
    expect(result).toEqual({
      ok: true,
      items: [
        { name: 'Scales', seconds: 900 },
        { name: 'Break', seconds: 300 },
        { name: 'Improv', seconds: 1200 },
      ],
    });
  });

  it('parses items with m suffix', () => {
    const draft = 'Scales (15m)\nBreak (5m)';
    const result = parseTemplateDraft(draft);
    expect(result).toEqual({
      ok: true,
      items: [
        { name: 'Scales', seconds: 900 },
        { name: 'Break', seconds: 300 },
      ],
    });
  });

  it('parses items with s suffix', () => {
    const draft = 'Quick drill (30s)';
    const result = parseTemplateDraft(draft);
    expect(result).toEqual({
      ok: true,
      items: [{ name: 'Quick drill', seconds: 30 }],
    });
  });

  it('parses items with compound durations', () => {
    const draft = 'Exercise (1m 30s)';
    const result = parseTemplateDraft(draft);
    expect(result).toEqual({
      ok: true,
      items: [{ name: 'Exercise', seconds: 90 }],
    });
  });

  it('skips blank lines', () => {
    const draft = 'Scales (15)\n\n\nBreak (5)\n';
    const result = parseTemplateDraft(draft);
    expect(result).toEqual({
      ok: true,
      items: [
        { name: 'Scales', seconds: 900 },
        { name: 'Break', seconds: 300 },
      ],
    });
  });

  it('returns error for missing parentheses', () => {
    const draft = 'Scales 15';
    const result = parseTemplateDraft(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Scales 15');
    }
  });

  it('returns error for invalid duration', () => {
    const draft = 'Scales (abc)';
    const result = parseTemplateDraft(draft);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Invalid duration');
    }
  });

  it('handles items with special characters', () => {
    const draft = 'Standard — head & changes (20)';
    const result = parseTemplateDraft(draft);
    expect(result).toEqual({
      ok: true,
      items: [{ name: 'Standard — head & changes', seconds: 1200 }],
    });
  });
});

describe('serializeTemplate', () => {
  it('serializes minute items as bare numbers', () => {
    const items = [
      { name: 'Scales', seconds: 900 },
      { name: 'Break', seconds: 300 },
    ];
    expect(serializeTemplate(items)).toBe('Scales (15)\nBreak (5)');
  });

  it('serializes sub-minute items with s suffix', () => {
    const items = [{ name: 'Drill', seconds: 30 }];
    expect(serializeTemplate(items)).toBe('Drill (30s)');
  });

  it('serializes compound durations', () => {
    const items = [{ name: 'Exercise', seconds: 90 }];
    expect(serializeTemplate(items)).toBe('Exercise (1m 30s)');
  });
});

describe('round-trip', () => {
  it('serializeTemplate then parseTemplateDraft recovers items', () => {
    const items = [
      { name: 'Tone work — flute', seconds: 600 },
      { name: 'Break', seconds: 300 },
    ];
    const result = parseTemplateDraft(serializeTemplate(items));
    expect(result).toEqual({ ok: true, items });
  });

  it('round-trips compound durations', () => {
    const items = [{ name: 'Exercise', seconds: 90 }];
    const result = parseTemplateDraft(serializeTemplate(items));
    expect(result).toEqual({ ok: true, items });
  });
});
