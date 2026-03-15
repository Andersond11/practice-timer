import type { AppState, ThemeColors } from '../../types';
import { el } from '../dom-helpers';

export function renderProgressBar(state: AppState, C: ThemeColors): HTMLElement {
  const sessionPct = state.items.length
    ? state.items.filter(i => i.done).reduce((a, i) => a + i.seconds, 0) /
      state.items.reduce((a, i) => a + i.seconds, 0)
    : 0;

  return el('div', { style: { width: '100%', maxWidth: '440px', padding: '8px 20px 0' } },
    el('div', { style: { height: '2px', background: C.border, borderRadius: '1px' } },
      el('div', {
        style: {
          height: '100%', borderRadius: '1px',
          width: `${sessionPct * 100}%`, background: C.accent,
          transition: 'width 0.6s ease',
        },
      }),
    ),
  );
}
