import type { AppState, AppActions, ThemeColors } from '../../types';
import { formatDuration } from '../../helpers';
import { el } from '../dom-helpers';

function fieldRow(
  label: string, key: string, value: string,
  actions: AppActions, C: ThemeColors,
  opts?: { placeholder?: string; type?: string },
): HTMLElement {
  const input = el('input', {
    type: opts?.type ?? 'text',
    value: value,
    placeholder: opts?.placeholder ?? '',
    style: {
      flex: '1', background: C.bg, color: C.text,
      border: `1px solid ${C.border}`, borderRadius: '6px',
      padding: '6px 10px', fontSize: '13px', fontFamily: 'inherit',
    },
    onchange: (e: Event) => {
      actions.updateFrontmatterField(key, (e.target as HTMLInputElement).value);
    },
  });

  return el('div', {
    style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0' },
  },
    el('label', {
      style: { fontSize: '12px', color: C.muted, width: '90px', textAlign: 'right', flexShrink: '0' },
    }, label),
    input,
  );
}

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
      el('span', { style: { fontSize: '12px', color: C.muted } }, formatDuration(item.seconds)),
    )
  );

  const fm = state.frontmatter;

  const fields = el('div', {
    style: {
      width: '100%', background: C.surface, borderRadius: '12px',
      border: `1px solid ${C.border}`, padding: '12px 14px', marginTop: '6px',
    },
  },
    el('div', {
      style: { fontSize: '12px', color: C.muted, marginBottom: '8px', fontWeight: '600' },
    }, 'Session notes'),
    fieldRow('Standard', 'standard', fm.standard ?? '', actions, C, { placeholder: '[[Autumn Leaves]]' }),
    fieldRow('Transcription', 'transcription', fm.transcription ?? '', actions, C, { placeholder: 'transcription source' }),
    fieldRow('Energy', 'energy', fm.energy != null ? String(fm.energy) : '', actions, C, { placeholder: '1–5', type: 'number' }),
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
    fields,
    el('div', { style: { display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' } },
      el('button', {
        onclick: actions.reloadFile,
        style: {
          background: C.surface, color: C.muted,
          border: `1px solid ${C.border}`, borderRadius: '8px',
          padding: '10px 18px', fontSize: '14px',
        },
        title: 'Reload markdown from file',
      }, '↻ Reload'),
      el('button', {
        onclick: actions.startQuickSession,
        style: {
          background: C.accent, color: '#fff', border: 'none', borderRadius: '8px',
          padding: '10px 22px', fontSize: '14px', fontWeight: '600',
        },
      }, 'Quick Session'),
      el('button', {
        onclick: actions.newSession,
        style: {
          background: C.surface, color: C.text,
          border: `1px solid ${C.border}`, borderRadius: '8px',
          padding: '10px 22px', fontSize: '14px',
        },
      }, 'New session'),
    ),
  );
}
