import type { TimerCallbacks } from './types';

/** Controls a countdown timer with warning callbacks. */
export class TimerController {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private timeLeft = 0;
  private callbacks: TimerCallbacks | null = null;

  /** Start counting down from the given number of seconds. */
  start(seconds: number, callbacks: TimerCallbacks): void {
    this.stop();
    this.timeLeft = seconds;
    this.callbacks = callbacks;
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  /** Stop the timer without firing onComplete. */
  stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /** Reset to a new duration without starting. */
  reset(seconds: number): void {
    this.stop();
    this.timeLeft = seconds;
  }

  /** Whether the timer is actively counting down. */
  isRunning(): boolean {
    return this.intervalId !== null;
  }

  private tick(): void {
    if (!this.callbacks) return;
    this.timeLeft -= 1;
    if (this.timeLeft === 60) this.callbacks.onWarn60();
    if (this.timeLeft === 10) this.callbacks.onWarn10();
    if (this.timeLeft <= 0) {
      this.stop();
      this.callbacks.onComplete();
      return;
    }
    this.callbacks.onTick(this.timeLeft);
  }
}
