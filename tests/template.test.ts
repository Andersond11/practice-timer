import { describe, it, expect } from 'vitest';
import { parseTemplateDraft, serializeTemplate } from '../src/template';

describe('parseTemplateDraft', () => {
  it('parses valid lines', () => {
    const draft = 'Scales (15)\nBreak (5)\nImprov (20)';
    const result = parseTemplateDraft(draft);
    expect(result).toEqual({
      ok: true,
      items: [
        { name: 'Scales', minutes: 15 },
        { name: 'Break', minutes: 5 },
        { name: 'Improv', minutes: 20 },
      ],
    });
  });

  it('skips blank lines', () => {
    const draft = 'Scales (15)\n\n\nBreak (5)\n';
    const result = parseTemplateDraft(draft);
    expect(result).toEqual({
      ok: true,
      items: [
        { name: 'Scales', minutes: 15 },
        { name: 'Break', minutes: 5 },
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

  it('returns error for non-numeric minutes', () => {
    const draft = 'Scales (abc)';
    const result = parseTemplateDraft(draft);
    expect(result.ok).toBe(false);
  });

  it('handles items with special characters', () => {
    const draft = 'Standard — head & changes (20)';
    const result = parseTemplateDraft(draft);
    expect(result).toEqual({
      ok: true,
      items: [{ name: 'Standard — head & changes', minutes: 20 }],
    });
  });
});

describe('serializeTemplate', () => {
  it('serializes items to Name (minutes) format', () => {
    const items = [
      { name: 'Scales', minutes: 15 },
      { name: 'Break', minutes: 5 },
    ];
    expect(serializeTemplate(items)).toBe('Scales (15)\nBreak (5)');
  });
});

describe('round-trip', () => {
  it('serializeTemplate then parseTemplateDraft recovers items', () => {
    const items = [
      { name: 'Tone work — flute', minutes: 10 },
      { name: 'Break', minutes: 5 },
    ];
    const result = parseTemplateDraft(serializeTemplate(items));
    expect(result).toEqual({ ok: true, items });
  });
});
