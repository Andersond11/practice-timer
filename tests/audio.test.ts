import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AudioManager } from '../src/audio';

// ── Mock Web Audio API ──────────────────────────────────────────────────────

function createMockOscillator() {
  return {
    connect: vi.fn(),
    type: 'sine' as OscillatorType,
    frequency: { value: 0 },
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function createMockGain() {
  return {
    connect: vi.fn(),
    gain: {
      value: 0,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  };
}

function mockAudioContext() {
  const oscillators: ReturnType<typeof createMockOscillator>[] = [];
  const gains: ReturnType<typeof createMockGain>[] = [];
  const ctx = {
    currentTime: 0,
    state: 'running' as AudioContextState,
    destination: {},
    resume: vi.fn(),
    createOscillator: vi.fn(() => {
      const osc = createMockOscillator();
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => {
      const g = createMockGain();
      gains.push(g);
      return g;
    }),
  };
  (globalThis as any).window = { AudioContext: vi.fn(() => ctx) };
  return { ctx, oscillators, gains };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('AudioManager', () => {
  let savedWindow: any;

  beforeEach(() => {
    savedWindow = (globalThis as any).window;
  });

  afterEach(() => {
    (globalThis as any).window = savedWindow;
  });

  describe('muted property', () => {
    it('defaults to false', () => {
      const audio = new AudioManager();
      expect(audio.muted).toBe(false);
    });

    it('can be set to true', () => {
      const audio = new AudioManager();
      audio.muted = true;
      expect(audio.muted).toBe(true);
    });
  });

  describe('tone()', () => {
    it('creates oscillator and gain nodes', () => {
      const { ctx, oscillators, gains } = mockAudioContext();
      const audio = new AudioManager();

      audio.tone(440, 0.5);

      expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
      expect(ctx.createGain).toHaveBeenCalledTimes(1);
      expect(oscillators[0].frequency.value).toBe(440);
      expect(oscillators[0].type).toBe('sine');
      expect(gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.22, 0);
      expect(oscillators[0].start).toHaveBeenCalled();
      expect(oscillators[0].stop).toHaveBeenCalled();
    });

    it('respects custom type and volume', () => {
      const { oscillators, gains } = mockAudioContext();
      const audio = new AudioManager();

      audio.tone(900, 0.1, 'square', 0.18, 0.5);

      expect(oscillators[0].type).toBe('square');
      expect(gains[0].gain.setValueAtTime).toHaveBeenCalledWith(0.18, 0.5);
    });

    it('does nothing when muted', () => {
      const { ctx } = mockAudioContext();
      const audio = new AudioManager();
      audio.muted = true;

      audio.tone(440, 0.5);

      expect(ctx.createOscillator).not.toHaveBeenCalled();
    });

    it('resumes suspended audio context', () => {
      const { ctx } = mockAudioContext();
      ctx.state = 'suspended' as AudioContextState;
      const audio = new AudioManager();

      audio.tone(440, 0.5);

      expect(ctx.resume).toHaveBeenCalled();
    });

    it('reuses the same audio context across calls', () => {
      mockAudioContext();
      const audio = new AudioManager();

      audio.tone(440, 0.5);
      audio.tone(880, 0.5);

      // AudioContext constructor should only be called once
      expect((globalThis as any).window.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('handles errors gracefully', () => {
      const { ctx } = mockAudioContext();
      ctx.createOscillator = vi.fn(() => { throw new Error('audio error'); });
      const audio = new AudioManager();

      // Should not throw
      expect(() => audio.tone(440, 0.5)).not.toThrow();
    });
  });

  describe('play()', () => {
    it('warn60 plays a single tone', () => {
      const { ctx } = mockAudioContext();
      const audio = new AudioManager();

      audio.play('warn60');

      expect(ctx.createOscillator).toHaveBeenCalledTimes(1);
    });

    it('warn10 plays three beeps', () => {
      const { ctx } = mockAudioContext();
      const audio = new AudioManager();

      audio.play('warn10');

      expect(ctx.createOscillator).toHaveBeenCalledTimes(3);
    });

    it('advance plays three ascending notes', () => {
      const { oscillators } = mockAudioContext();
      const audio = new AudioManager();

      audio.play('advance');

      expect(oscillators).toHaveLength(3);
      expect(oscillators[0].frequency.value).toBe(523);
      expect(oscillators[1].frequency.value).toBe(659);
      expect(oscillators[2].frequency.value).toBe(784);
    });

    it('breakIn plays two tones', () => {
      const { ctx } = mockAudioContext();
      const audio = new AudioManager();

      audio.play('breakIn');

      expect(ctx.createOscillator).toHaveBeenCalledTimes(2);
    });

    it('finish plays five tones', () => {
      const { oscillators } = mockAudioContext();
      const audio = new AudioManager();

      audio.play('finish');

      expect(oscillators).toHaveLength(5);
      // First four are ascending, last is the sustained high note
      expect(oscillators[0].frequency.value).toBe(523);
      expect(oscillators[4].frequency.value).toBe(1568);
    });

    it('does nothing when muted', () => {
      const { ctx } = mockAudioContext();
      const audio = new AudioManager();
      audio.muted = true;

      audio.play('advance');

      expect(ctx.createOscillator).not.toHaveBeenCalled();
    });
  });
});
