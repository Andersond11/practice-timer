/** Zero-pad a number to 2 digits. */
export const pad = (n: number): string => String(n).padStart(2, '0');

/** Today's date as YYYY-MM-DD. */
export function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Today's practice filename. */
export const todayFname = (): string => `${todayStr()}.md`;

/** Whether an item name represents a break. */
export const isBreak = (name: string): boolean => /break/i.test(name);

/** Format seconds as M:SS. */
export const fmt = (s: number): string => `${Math.floor(s / 60)}:${pad(s % 60)}`;

/**
 * Parse a duration string into total seconds.
 * Supports: "10m", "30s", "1m 30s", "10" (bare number = minutes).
 */
export function parseDuration(str: string): number | null {
  const s = str.trim();
  // Compound: "1m 30s" or "1m30s"
  const compound = s.match(/^(\d+)\s*m\s*(\d+)\s*s$/i);
  if (compound) return (+compound[1]) * 60 + (+compound[2]);
  // Minutes only: "10m"
  const mins = s.match(/^(\d+)\s*m$/i);
  if (mins) return (+mins[1]) * 60;
  // Seconds only: "30s"
  const secs = s.match(/^(\d+)\s*s$/i);
  if (secs) return +secs[1];
  // Bare number: treat as minutes (backward compat)
  const bare = s.match(/^(\d+)$/);
  if (bare) return (+bare[1]) * 60;
  return null;
}

/** Format total seconds as a human-readable duration for display in lists. */
export function formatDuration(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  if (s === 0) return `${m}m`;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

/** Format total seconds for use in markdown/template files. */
export function formatDurationTag(totalSecs: number): string {
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  if (s === 0) return `${m}`;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}
