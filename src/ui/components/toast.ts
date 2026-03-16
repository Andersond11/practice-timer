import type { ThemeColors } from '../../types';
import { el } from '../dom-helpers';

export function renderToast(msg: string, C: ThemeColors): HTMLElement {
  return el('div', {
    style: {
      position: 'fixed', bottom: '22px', left: '50%', transform: 'translateX(-50%)',
      background: '#252018', color: C.text, borderRadius: '8px',
      padding: '9px 18px', fontSize: '13px', border: `1px solid ${C.border}`,
      whiteSpace: 'nowrap', zIndex: '100', pointerEvents: 'none',
    },
  }, msg);
}
