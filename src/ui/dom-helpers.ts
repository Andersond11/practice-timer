type Attrs = Record<string, any> | null;
type Child = HTMLElement | string | number | null | false | Child[];

/** Create an HTML element with attributes and children. */
export function el(tag: string, attrs: Attrs, ...children: Child[]): HTMLElement {
  const e = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'style' && typeof v === 'object') {
        Object.assign(e.style, v);
      } else if (k.startsWith('on')) {
        e.addEventListener(k.slice(2).toLowerCase(), v);
      } else {
        e.setAttribute(k, v);
      }
    }
  }
  appendChildren(e, children);
  return e;
}

/** Create an SVG element with attributes and children. */
export function svg(tag: string, attrs: Attrs, ...children: (SVGElement | null)[]): SVGElement {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      e.setAttribute(k, v);
    }
  }
  for (const c of children) {
    if (c) e.appendChild(c);
  }
  return e;
}

function appendChildren(parent: HTMLElement, children: Child[]): void {
  const flat = (children as any[]).flat(Infinity);
  for (const c of flat) {
    if (c == null || c === false) continue;
    parent.appendChild(
      typeof c === 'string' || typeof c === 'number'
        ? document.createTextNode(String(c))
        : c as HTMLElement
    );
  }
}
