/** Zero-pad a number to 2 digits. */
export const pad = (n: number): string => String(n).padStart(2, '0');

/** Today's date as YYYY-MM-DD. */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today's practice filename. */
export const todayFname = (): string => `Practice - ${todayStr()}.md`;

/** Whether an item name represents a break. */
export const isBreak = (name: string): boolean => /break/i.test(name);

/** Format seconds as M:SS. */
export const fmt = (s: number): string => `${Math.floor(s / 60)}:${pad(s % 60)}`;
