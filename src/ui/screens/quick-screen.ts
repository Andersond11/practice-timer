import type { AppState, AppActions, ThemeColors } from '../../types';
import { fmt, formatDuration } from '../../helpers';
import { CIRCLE_RADIUS, CIRCLE_CIRCUMFERENCE } from '../../constants';
import { el } from '../dom-helpers';
import { svg } from '../dom-helpers';

/** Render the count-up circle timer for quick sessions. */
function renderCountUpTimer(elapsed: number, running: boolean, C: ThemeColors): HTMLElement {
  // Animate the ring: fill up over 60s then reset, giving a visual pulse
  const pct = (elapsed % 60) / 60;
  const offset = CIRCLE_CIRCUMFERENCE * (1 - pct);

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
      fill: 'none', stroke: C.accent, 'stroke-width': '7',
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
      }, fmt(elapsed)),
      el('div', { style: { fontSize: '11px', color: C.muted, marginTop: '3px' } },
        running ? 'recording…' : 'paused'),
    ),
  );
}

/** Render a recorded item row. */
function itemRow(name: string, seconds: number, idx: number, total: number, C: ThemeColors): HTMLElement {
  return el('div', {
    style: {
      display: 'flex', gap: '10px', padding: '9px 14px',
      borderBottom: idx < total - 1 ? `1px solid ${C.border}` : 'none',
      alignItems: 'center',
    },
  },
    el('span', { style: { color: C.done, fontSize: '13px' } }, '✓'),
    el('span', { style: { fontSize: '14px', flex: '1' } }, name),
    el('span', { style: { fontSize: '12px', color: C.muted } }, formatDuration(seconds)),
  );
}

export function renderQuickScreen(state: AppState, actions: AppActions, C: ThemeColors): HTMLElement {
  const { running, elapsed, quickPrompting, quickItems } = state;

  // ── Timer running: show count-up timer + stop button ──
  if (running) {
    const timer = renderCountUpTimer(elapsed, true, C);
    const stopBtn = el('button', {
      onclick: actions.stopQuickItem,
      class: 'pulse',
      style: {
        width: '64px', height: '64px', borderRadius: '50%',
        background: '#a03030', border: 'none', color: '#fff', fontSize: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      },
    }, '⏹');

    const label = el('div', {
      style: { textAlign: 'center', fontSize: '16px', fontWeight: '600' },
    }, 'Practicing…');

    return el('div', {
      style: {
        width: '100%', maxWidth: '440px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '14px 20px 32px', gap: '18px',
      },
    }, timer, label, stopBtn,
      quickItems.length > 0
        ? el('div', {
            style: {
              width: '100%', background: C.surface, borderRadius: '12px',
              border: `1px solid ${C.border}`, overflow: 'hidden', marginTop: '6px',
            },
          }, ...quickItems.map((it, i) => itemRow(it.name, it.seconds, i, quickItems.length, C)))
        : null,
    );
  }

  // ── Prompting: ask what they worked on ──
  if (quickPrompting) {
    const timer = renderCountUpTimer(elapsed, false, C);

    let inputValue = '';
    const input = el('input', {
      type: 'text',
      placeholder: 'What did you work on?',
      style: {
        flex: '1', background: C.bg, color: C.text,
        border: `1px solid ${C.border}`, borderRadius: '8px',
        padding: '10px 14px', fontSize: '15px', fontFamily: 'inherit',
      },
      oninput: (e: Event) => { inputValue = (e.target as HTMLInputElement).value; },
      onkeydown: (e: KeyboardEvent) => {
        if (e.key === 'Enter' && inputValue.trim()) {
          actions.recordQuickItem(inputValue);
        }
      },
    });
    // Auto-focus the input after render
    setTimeout(() => (input as HTMLInputElement).focus(), 50);

    const recordBtn = el('button', {
      onclick: () => { if (inputValue.trim()) actions.recordQuickItem(inputValue); },
      style: {
        background: C.accent, color: '#fff', border: 'none', borderRadius: '8px',
        padding: '10px 18px', fontSize: '14px', fontWeight: '600', whiteSpace: 'nowrap',
      },
    }, 'Record');

    const timeLabel = el('div', {
      style: { fontSize: '14px', color: C.muted, textAlign: 'center' },
    }, `${formatDuration(elapsed)} elapsed`);

    return el('div', {
      style: {
        width: '100%', maxWidth: '440px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '14px 20px 32px', gap: '18px',
      },
    },
      timer,
      timeLabel,
      el('div', {
        style: { display: 'flex', gap: '8px', width: '100%' },
      }, input, recordBtn),
      quickItems.length > 0
        ? el('div', {
            style: {
              width: '100%', background: C.surface, borderRadius: '12px',
              border: `1px solid ${C.border}`, overflow: 'hidden', marginTop: '6px',
            },
          }, ...quickItems.map((it, i) => itemRow(it.name, it.seconds, i, quickItems.length, C)))
        : null,
    );
  }

  // ── Review: show recorded items + start another / end ──
  const hasItems = quickItems.length > 0;

  const startBtn = el('button', {
    onclick: actions.startAnotherQuick,
    class: 'pulse',
    style: {
      width: '64px', height: '64px', borderRadius: '50%',
      background: C.accent, border: 'none', color: '#fff', fontSize: '22px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    },
  }, '▶');

  const endBtn = el('button', {
    onclick: actions.endQuickSession,
    style: {
      background: C.surface, color: C.text,
      border: `1px solid ${C.border}`, borderRadius: '8px',
      padding: '10px 22px', fontSize: '14px',
    },
  }, 'End session');

  return el('div', {
    style: {
      width: '100%', maxWidth: '440px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '14px 20px 32px', gap: '18px',
    },
  },
    el('div', { style: { fontSize: '18px', fontWeight: '600', textAlign: 'center' } },
      hasItems ? 'Item recorded' : 'Quick Session'),
    hasItems
      ? el('div', {
          style: {
            width: '100%', background: C.surface, borderRadius: '12px',
            border: `1px solid ${C.border}`, overflow: 'hidden',
          },
        }, ...quickItems.map((it, i) => itemRow(it.name, it.seconds, i, quickItems.length, C)))
      : el('div', { style: { fontSize: '14px', color: C.muted, textAlign: 'center' } },
          'Press play to start timing'),
    el('div', { style: { textAlign: 'center', fontSize: '13px', color: C.muted } },
      'Start another timer or end the session'),
    startBtn,
    hasItems ? endBtn : null,
  );
}
