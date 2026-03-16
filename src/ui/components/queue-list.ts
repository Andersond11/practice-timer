import type { SessionItem, ThemeColors } from '../../types';
import { isBreak, formatDuration } from '../../helpers';
import { el } from '../dom-helpers';

export function renderQueueList(
  items: SessionItem[],
  curIdx: number | null,
  C: ThemeColors,
): HTMLElement {
  const rows = items.map((item, i) => {
    const isCur = i === curIdx;
    const dotColor = item.done ? C.done : isCur ? C.accent : C.border;

    return el('div', {
      style: {
        display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
        background: isCur ? `${C.accent}18` : 'transparent',
        borderBottom: i < items.length - 1 ? `1px solid ${C.border}` : 'none',
        opacity: item.done ? '0.38' : '1',
        transition: 'opacity .3s,background .3s',
      },
    },
      el('div', {
        style: {
          width: '22px', height: '22px', borderRadius: '50%', flexShrink: '0',
          background: dotColor, color: '#fff', fontSize: '11px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background .3s',
        },
      }, item.done ? '✓' : isCur ? '▶' : ''),
      el('div', {
        style: { flex: '1', fontSize: '14px', color: isBreak(item.name) ? C.brk : C.text },
      }, item.name),
      el('div', { style: { fontSize: '12px', color: C.muted } }, formatDuration(item.seconds)),
    );
  });

  return el('div', {
    style: {
      width: '100%', background: C.surface, borderRadius: '12px',
      border: `1px solid ${C.border}`, overflow: 'hidden',
    },
  }, ...rows);
}
