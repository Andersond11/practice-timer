import type { AudioCue } from './types';

/** Manages Web Audio API tones for practice timer notifications. */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private _muted = false;

  get muted(): boolean { return this._muted; }
  set muted(v: boolean) { this._muted = v; }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /** Play a single tone. */
  tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.22, delay = 0): void {
    if (this._muted) return;
    try {
      const c = this.getCtx();
      const t = c.currentTime + delay;
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.connect(g);
      g.connect(c.destination);
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch { /* audio errors are non-critical */ }
  }

  /** Play a named audio cue. */
  play(cue: AudioCue): void {
    switch (cue) {
      case 'warn60':
        this.tone(660, 0.45, 'sine', 0.2);
        break;
      case 'warn10':
        [0, 0.17, 0.34].forEach(d => this.tone(900, 0.1, 'square', 0.18, d));
        break;
      case 'advance':
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.65, 'sine', 0.2, i * 0.09));
        break;
      case 'breakIn':
        this.tone(440, 0.65, 'sine', 0.16);
        this.tone(528, 0.5, 'sine', 0.12, 0.32);
        break;
      case 'finish':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 1.1, 'sine', 0.17, i * 0.13));
        this.tone(1568, 1.5, 'sine', 0.12, 0.65);
        break;
    }
  }
}
