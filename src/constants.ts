import type { ThemeColors, TemplateItem } from './types';

export const C: ThemeColors = {
  bg: '#0f0e0b',
  surface: '#1c1a16',
  border: '#302c26',
  accent: '#c47b2b',
  brk: '#5a8fa5',
  text: '#ede4d8',
  muted: '#7a6e62',
  done: '#5a9165',
};

export const DEFAULT_TEMPLATE: TemplateItem[] = [
  { name: 'Tone work — flute', seconds: 600 },
  { name: 'Tone work — sax', seconds: 600 },
  { name: 'Major scales', seconds: 900 },
  { name: 'Break', seconds: 300 },
  { name: 'Standard — head & changes', seconds: 1200 },
  { name: 'Break', seconds: 300 },
  { name: 'Free improv', seconds: 900 },
];

/** SVG circle radius for the timer ring. */
export const CIRCLE_RADIUS = 96;

/** Circumference of the timer ring. */
export const CIRCLE_CIRCUMFERENCE = Math.PI * 2 * CIRCLE_RADIUS;
