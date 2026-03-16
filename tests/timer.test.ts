import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimerController } from '../src/timer';

describe('TimerController', () => {
  let timer: TimerController;
  let onTick: ReturnType<typeof vi.fn>;
  let onWarn60: ReturnType<typeof vi.fn>;
  let onWarn10: ReturnType<typeof vi.fn>;
  let onComplete: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    timer = new TimerController();
    onTick = vi.fn();
    onWarn60 = vi.fn();
    onWarn10 = vi.fn();
    onComplete = vi.fn();
  });

  afterEach(() => {
    timer.stop();
    vi.useRealTimers();
  });

  const callbacks = () => ({ onTick, onWarn60, onWarn10, onComplete });

  it('ticks down each second', () => {
    timer.start(5, callbacks());
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(4);
    vi.advanceTimersByTime(1000);
    expect(onTick).toHaveBeenCalledWith(3);
  });

  it('fires onComplete when time reaches 0', () => {
    timer.start(3, callbacks());
    vi.advanceTimersByTime(3000);
    expect(onComplete).toHaveBeenCalledTimes(1);
    // Should not tick further
    vi.advanceTimersByTime(1000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('fires onWarn60 at exactly 60 seconds remaining', () => {
    timer.start(62, callbacks());
    vi.advanceTimersByTime(1000); // 61 left
    expect(onWarn60).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000); // 60 left
    expect(onWarn60).toHaveBeenCalledTimes(1);
  });

  it('fires onWarn10 at exactly 10 seconds remaining', () => {
    timer.start(12, callbacks());
    vi.advanceTimersByTime(1000); // 11 left
    expect(onWarn10).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000); // 10 left
    expect(onWarn10).toHaveBeenCalledTimes(1);
  });

  it('stop() halts ticking', () => {
    timer.start(10, callbacks());
    vi.advanceTimersByTime(2000);
    expect(onTick).toHaveBeenCalledTimes(2);
    timer.stop();
    vi.advanceTimersByTime(3000);
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('isRunning() reflects state', () => {
    expect(timer.isRunning()).toBe(false);
    timer.start(10, callbacks());
    expect(timer.isRunning()).toBe(true);
    timer.stop();
    expect(timer.isRunning()).toBe(false);
  });

  it('reset() stops and sets new duration', () => {
    timer.start(10, callbacks());
    vi.advanceTimersByTime(2000);
    timer.reset(30);
    expect(timer.isRunning()).toBe(false);
    // Starting again with same callbacks should use new internal state
    vi.advanceTimersByTime(5000);
    // No further ticks after reset
    expect(onTick).toHaveBeenCalledTimes(2);
  });

  it('double-start clears previous interval', () => {
    timer.start(10, callbacks());
    vi.advanceTimersByTime(2000); // 2 ticks
    timer.start(5, callbacks());
    vi.advanceTimersByTime(5000); // 5 ticks from second start
    // Should have completed, total ticks = 2 (first) + 4 (second, since 5th is onComplete)
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
