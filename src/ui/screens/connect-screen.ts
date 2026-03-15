import type { AppState, AppActions, ThemeColors } from '../../types';
import { el } from '../dom-helpers';

export function renderConnectScreen(state: AppState, actions: AppActions, C: ThemeColors): HTMLElement {
  return el('div', {
    style: {
      flex: '1', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: '20px', padding: '40px 32px', maxWidth: '380px', textAlign: 'center',
    },
  },
    el('div', { style: { fontSize: '52px', lineHeight: '1', color: C.accent } }, '♩'),
    el('div', {},
      el('div', { style: { fontSize: '22px', fontWeight: '600', marginBottom: '8px' } },
        'Practice Timer'),
      el('div', { style: { fontSize: '14px', color: C.muted, lineHeight: '1.65' } },
        'Points to your Obsidian vault. Loads or creates today\'s dated file from your template, then syncs checkbox state back as you go.'),
    ),
    el('button', {
      style: {
        background: C.accent, color: '#fff', border: 'none', borderRadius: '10px',
        padding: '12px 30px', fontSize: '15px', fontWeight: '600',
      },
      disabled: state.busy,
      onclick: actions.connectVault,
    }, state.busy ? 'Connecting…' : 'Planned Session'),
    el('button', {
      style: {
        background: C.surface, color: C.text, border: `1px solid ${C.border}`,
        borderRadius: '10px', padding: '10px 26px', fontSize: '14px', fontWeight: '500',
      },
      disabled: state.busy,
      onclick: actions.startQuickSession,
    }, 'Quick Session'),
    el('div', { style: { fontSize: '11px', color: C.muted } },
      'Chrome / Edge · File System Access API · vault is read+write'),
  );
}
