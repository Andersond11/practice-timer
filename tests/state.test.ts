import { describe, it, expect } from 'vitest';
import { createInitialState, applyPatch } from '../src/state';

describe('createInitialState', () => {
  it('returns a valid initial state', () => {
    const template = [{ name: 'Scales', seconds: 15 }];
    const state = createInitialState(template);
    expect(state.screen).toBe('connect');
    expect(state.items).toEqual([]);
    expect(state.curIdx).toBeNull();
    expect(state.timeLeft).toBe(0);
    expect(state.running).toBe(false);
    expect(state.muted).toBe(false);
    expect(state.autoContinue).toBe(false);
    expect(state.template).toEqual(template);
    expect(state.toast).toBeNull();
    expect(state.busy).toBe(false);
  });

  it('copies the template array (no shared reference)', () => {
    const template = [{ name: 'Scales', seconds: 15 }];
    const state = createInitialState(template);
    template.push({ name: 'Break', seconds: 5 });
    expect(state.template).toHaveLength(1);
  });
});

describe('applyPatch', () => {
  it('merges patch into state', () => {
    const template = [{ name: 'Scales', seconds: 15 }];
    const state = createInitialState(template);
    const next = applyPatch(state, { screen: 'session', running: true });
    expect(next.screen).toBe('session');
    expect(next.running).toBe(true);
    expect(next.template).toEqual(template);
  });

  it('does not mutate the original state', () => {
    const state = createInitialState([]);
    const next = applyPatch(state, { screen: 'done' });
    expect(state.screen).toBe('connect');
    expect(next.screen).toBe('done');
  });
});
