import type { AppState, AppActions, ThemeColors } from '../../types';
import { isBreak } from '../../helpers';
import { el } from '../dom-helpers';
import { renderCircleTimer } from '../components/circle-timer';
import { renderControls } from '../components/controls';
import { renderQueueList } from '../components/queue-list';

export function renderSessionScreen(state: AppState, actions: AppActions, C: ThemeColors): HTMLElement {
  const cur = state.curIdx !== null ? state.items[state.curIdx] : null;

  const timerWrap = renderCircleTimer(state.timeLeft, cur, C);

  const nameBlock = el('div', { style: { textAlign: 'center', minHeight: '40px' } },
    el('div', { style: { fontSize: '18px', fontWeight: '600', marginBottom: '4px' } },
      cur ? cur.name : '—'),
    (cur && isBreak(cur.name) && state.items[state.curIdx! + 1])
      ? el('div', { style: { fontSize: '12px', color: C.brk } },
          `up next · ${state.items[state.curIdx! + 1].name}`)
      : null,
  );

  const controls = renderControls(state.running, actions, C);
  const queue = renderQueueList(state.items, state.curIdx, C);

  return el('div', {
    style: {
      width: '100%', maxWidth: '440px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '14px 20px 32px', gap: '18px',
    },
  }, timerWrap, nameBlock, controls, queue);
}
