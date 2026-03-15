import type { AppState, AppActions, ThemeColors } from '../../types';
import { el } from '../dom-helpers';

export function renderDoneScreen(state: AppState, actions: AppActions, C: ThemeColors): HTMLElement {
  const rows = state.items.map((item, i) =>
    el('div', {
      style: {
        display: 'flex', gap: '10px', padding: '9px 14px',
        borderBottom: i < state.items.length - 1 ? `1px solid ${C.border}` : 'none',
        alignItems: 'center',
      },
    },
      el('span', { style: { color: C.done, fontSize: '13px' } }, '✓'),
      el('span', { style: { fontSize: '14px', flex: '1' } }, item.name),
      el('span', { style: { fontSize: '12px', color: C.muted } }, `${item.minutes}m`),
    )
  );

  return el('div', {
    style: {
      flex: '1', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '14px', padding: '40px 20px', maxWidth: '440px', width: '100%',
    },
  },
    el('div', { style: { fontSize: '38px', color: C.done } }, '✓'),
    el('div', { style: { fontSize: '20px', fontWeight: '600' } }, 'Session complete'),
    el('div', { style: { fontSize: '13px', color: C.muted } }, state.fileLabel),
    el('div', {
      style: {
        width: '100%', background: C.surface, borderRadius: '12px',
        border: `1px solid ${C.border}`, overflow: 'hidden', marginTop: '6px',
      },
    }, ...rows),
    el('button', {
      onclick: actions.newSession,
      style: {
        marginTop: '6px', background: C.surface, color: C.text,
        border: `1px solid ${C.border}`, borderRadius: '8px',
        padding: '10px 22px', fontSize: '14px',
      },
    }, 'New session'),
  );
}
