import type { AppState, AppActions, ThemeColors } from '../../types';
import { el } from '../dom-helpers';

export function renderTopBar(state: AppState, actions: AppActions, C: ThemeColors): HTMLElement {
  return el('div', {
    style: {
      width: '100%', maxWidth: '440px', display: 'flex',
      justifyContent: 'space-between', alignItems: 'center',
      padding: '14px 20px 0',
    },
  },
    el('span', {
      style: { fontSize: '12px', color: C.muted, fontFamily: 'monospace', letterSpacing: '0.3px' },
    }, state.fileLabel || 'practice timer'),
    el('div', { style: { display: 'flex', gap: '8px' } },
      state.fileLabel ? el('button', {
        style: {
          background: C.surface, border: `1px solid ${C.border}`, color: C.muted,
          borderRadius: '7px', padding: '5px 10px', fontSize: '13px',
        },
        title: 'Reload file from disk',
        onclick: actions.reloadFile,
      }, '↻') : null,
      (state.screen === 'session') ? el('button', {
        style: {
          background: C.surface, border: `1px solid ${C.border}`, color: C.accent,
          borderRadius: '7px', padding: '5px 10px', fontSize: '12px', fontWeight: '600',
        },
        title: 'Start a quick session',
        onclick: actions.startQuickSession,
      }, '⚡') : null,
      el('button', {
        style: {
          background: C.surface, border: `1px solid ${C.border}`,
          color: state.autoContinue ? C.accent : C.muted,
          borderRadius: '7px', padding: '5px 10px', fontSize: '13px',
        },
        title: state.autoContinue ? 'Auto-continue on' : 'Auto-continue off',
        onclick: actions.toggleAutoContinue,
      }, '▶▶'),
      el('button', {
        style: {
          background: C.surface, border: `1px solid ${C.border}`,
          color: state.muted ? C.brk : C.muted,
          borderRadius: '7px', padding: '5px 10px', fontSize: '15px',
        },
        title: state.muted ? 'Unmute' : 'Mute',
        onclick: actions.toggleMute,
      }, state.muted ? '♪̶' : '♪'),
      el('button', {
        style: {
          background: C.surface, border: `1px solid ${C.border}`, color: C.muted,
          borderRadius: '7px', padding: '5px 10px', fontSize: '14px',
        },
        title: 'Edit template',
        onclick: actions.openTemplate,
      }, '⚙'),
    ),
  );
}
