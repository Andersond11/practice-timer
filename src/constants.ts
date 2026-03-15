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
  { name: 'Tone work — flute', minutes: 10 },
  { name: 'Tone work — sax', minutes: 10 },
  { name: 'Major scales', minutes: 15 },
  { name: 'Break', minutes: 5 },
  { name: 'Standard — head & changes', minutes: 20 },
  { name: 'Break', minutes: 5 },
  { name: 'Free improv', minutes: 15 },
];

/** SVG circle radius for the timer ring. */
export const CIRCLE_RADIUS = 96;

/** Circumference of the timer ring. */
export const CIRCLE_CIRCUMFERENCE = Math.PI * 2 * CIRCLE_RADIUS;
