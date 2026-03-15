import { describe, it, expect, vi, afterEach } from 'vitest';
import { pad, todayStr, todayFname, isBreak, fmt } from '../src/helpers';

describe('pad', () => {
  it('pads single digits', () => {
    expect(pad(0)).toBe('00');
    expect(pad(5)).toBe('05');
    expect(pad(9)).toBe('09');
  });

  it('leaves double digits unchanged', () => {
    expect(pad(10)).toBe('10');
    expect(pad(99)).toBe('99');
  });
});

describe('todayStr', () => {
  afterEach(() => vi.useRealTimers());

  it('returns YYYY-MM-DD format', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 7)); // Jan 7 2025
    expect(todayStr()).toBe('2025-01-07');
  });

  it('handles double-digit months and days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 11, 25)); // Dec 25 2025
    expect(todayStr()).toBe('2025-12-25');
  });
});

describe('todayFname', () => {
  afterEach(() => vi.useRealTimers());

  it('returns a Practice markdown filename with date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 2, 15));
    expect(todayFname()).toBe('Practice - 2025-03-15.md');
  });
});

describe('isBreak', () => {
  it('matches "Break" case-insensitively', () => {
    expect(isBreak('Break')).toBe(true);
    expect(isBreak('break')).toBe(true);
    expect(isBreak('BREAK')).toBe(true);
    expect(isBreak('15-min break')).toBe(true);
  });

  it('does not match non-break items', () => {
    expect(isBreak('Major scales')).toBe(false);
    expect(isBreak('Tone work')).toBe(false);
  });
});

describe('fmt', () => {
  it('formats 0 seconds', () => {
    expect(fmt(0)).toBe('0:00');
  });

  it('formats seconds < 60', () => {
    expect(fmt(59)).toBe('0:59');
  });

  it('formats exact minutes', () => {
    expect(fmt(60)).toBe('1:00');
    expect(fmt(600)).toBe('10:00');
  });

  it('formats mixed minutes and seconds', () => {
    expect(fmt(90)).toBe('1:30');
    expect(fmt(3661)).toBe('61:01');
  });
});
