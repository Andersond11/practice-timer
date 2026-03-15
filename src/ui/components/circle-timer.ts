import type { SessionItem, ThemeColors } from '../../types';
import { CIRCLE_RADIUS, CIRCLE_CIRCUMFERENCE } from '../../constants';
import { isBreak, fmt, formatDuration } from '../../helpers';
import { el } from '../dom-helpers';
import { svg } from '../dom-helpers';

export function renderCircleTimer(
  timeLeft: number,
  currentItem: SessionItem | null,
  C: ThemeColors,
): HTMLElement {
  const totalSecs = currentItem ? currentItem.seconds : 0;
  const pct = totalSecs > 0 ? timeLeft / totalSecs : 0;
  const offset = CIRCLE_CIRCUMFERENCE * (1 - pct);
  const arcColor = currentItem && isBreak(currentItem.name) ? C.brk : C.accent;

  const circle = svg('svg', {
    width: '220', height: '220',
    style: 'transform:rotate(-90deg);display:block;',
  },
    svg('circle', {
      cx: '110', cy: '110', r: String(CIRCLE_RADIUS),
      fill: 'none', stroke: C.border, 'stroke-width': '7',
    }),
    svg('circle', {
      cx: '110', cy: '110', r: String(CIRCLE_RADIUS),
      fill: 'none', stroke: arcColor, 'stroke-width': '7',
      'stroke-linecap': 'round',
      'stroke-dasharray': String(CIRCLE_CIRCUMFERENCE),
      'stroke-dashoffset': String(offset),
      style: 'transition:stroke-dashoffset 1s linear,stroke .4s ease',
    }),
  );

  return el('div', {
    style: {
      position: 'relative', width: '220px', height: '220px',
      marginTop: '4px', flexShrink: '0',
    },
  },
    circle as unknown as HTMLElement,
    el('div', {
      style: {
        position: 'absolute', inset: '0', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      },
    },
      el('div', {
        style: {
          fontSize: '50px', fontWeight: '700',
          fontFamily: "'Courier New',Courier,monospace",
          letterSpacing: '-2px', color: C.text, lineHeight: '1',
        },
      }, fmt(timeLeft)),
      currentItem
        ? el('div', { style: { fontSize: '11px', color: C.muted, marginTop: '3px' } },
            formatDuration(currentItem.seconds))
        : null,
    ),
  );
}
