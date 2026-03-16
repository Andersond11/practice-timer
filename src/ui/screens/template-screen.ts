import type { AppState, AppActions, ThemeColors } from '../../types';
import { el } from '../dom-helpers';

export function renderTemplateScreen(state: AppState, actions: AppActions, C: ThemeColors): HTMLElement {
  const ta = el('textarea', {
    style: {
      width: '100%', minHeight: '280px', background: C.surface, color: C.text,
      border: `1px solid ${C.border}`, borderRadius: '8px',
      padding: '12px', fontSize: '14px', lineHeight: '1.8',
      fontFamily: "'Courier New',Courier,monospace",
      resize: 'vertical',
    },
  }) as HTMLTextAreaElement;
  ta.value = state.tplDraft;
  ta.addEventListener('input', (e) => {
    actions.updateTplDraft((e.target as HTMLTextAreaElement).value);
  });

  return el('div', { style: { width: '100%', maxWidth: '440px', padding: '20px 20px 36px' } },
    el('div', { style: { fontSize: '16px', fontWeight: '600', marginBottom: '6px' } },
      'Practice template'),
    el('div', { style: { fontSize: '12px', color: C.muted, marginBottom: '14px', lineHeight: '1.7' } },
      'One item per line: ',
      el('code', {
        style: {
          background: C.surface, padding: '1px 6px', borderRadius: '4px',
          fontFamily: 'monospace', fontSize: '12px', color: C.accent,
        },
      }, 'Name (minutes)'),
      '. Use "Break" for rest items.'),
    ta,
    state.tplErr
      ? el('div', { style: { color: '#e06060', fontSize: '13px', marginTop: '8px' } }, state.tplErr)
      : null,
    el('div', { style: { display: 'flex', gap: '10px', marginTop: '14px' } },
      el('button', {
        onclick: actions.saveTemplate,
        style: {
          background: C.accent, color: '#fff', border: 'none',
          borderRadius: '8px', padding: '10px 22px', fontSize: '14px', fontWeight: '600',
        },
      }, 'Save'),
      el('button', {
        onclick: actions.cancelTemplate,
        style: {
          background: C.surface, color: C.muted,
          border: `1px solid ${C.border}`, borderRadius: '8px',
          padding: '10px 16px', fontSize: '14px',
        },
      }, 'Cancel'),
    ),
  );
}
