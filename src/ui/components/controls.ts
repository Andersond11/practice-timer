import type { AppActions, ThemeColors } from '../../types';
import { C as Colors } from '../../constants';
import { el } from '../dom-helpers';

export function renderControls(running: boolean, actions: AppActions, C: ThemeColors): HTMLElement {
  const resetBtn = el('button', {
    onclick: actions.reset,
    style: {
      width: '44px', height: '44px', borderRadius: '50%', background: C.surface,
      border: `1px solid ${C.border}`, color: C.muted, fontSize: '17px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
  }, '↺');

  const playBtn = el('button', {
    onclick: actions.toggleRun,
    class: running ? '' : 'pulse',
    style: {
      width: '64px', height: '64px', borderRadius: '50%',
      background: running ? '#383430' : C.accent,
      border: 'none', color: '#fff', fontSize: '22px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'background .2s',
    },
  }, running ? '⏸' : '▶');

  const skipBtn = el('button', {
    onclick: actions.skip,
    style: {
      width: '44px', height: '44px', borderRadius: '50%', background: C.surface,
      border: `1px solid ${C.border}`, color: C.muted, fontSize: '17px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
  }, '⏭');

  return el('div', {
    style: { display: 'flex', gap: '14px', alignItems: 'center' },
  }, resetBtn, playBtn, skipBtn);
}
