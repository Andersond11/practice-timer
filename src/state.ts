import type { AppState, TemplateItem } from './types';

export type StatePatch = Partial<AppState>;

/** Create the initial application state. */
export function createInitialState(template: TemplateItem[]): AppState {
  return {
    screen: 'connect',
    items: [],
    curIdx: null,
    timeLeft: 0,
    running: false,
    muted: false,
    autoContinue: false,
    template: [...template],
    tplDraft: '',
    tplErr: '',
    toast: null,
    busy: false,
    fileLabel: '',
    prevScreen: 'connect',
  };
}

/** Apply a partial patch to state, returning a new state object. */
export function applyPatch(state: AppState, patch: StatePatch): AppState {
  return { ...state, ...patch };
}
