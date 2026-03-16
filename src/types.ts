/** An item in the reusable practice template. */
export interface TemplateItem {
  name: string;
  seconds: number;
}

/** A practice item during an active session. */
export interface SessionItem extends TemplateItem {
  done: boolean;
}

/** Application screen identifiers. */
export type Screen = 'connect' | 'session' | 'template' | 'done' | 'quick';

/** Settings stored as YAML frontmatter in the markdown file. */
export interface Frontmatter {
  type?: string;
  date?: string;
  planned_duration?: number;
  actual_duration?: number | null;
  standard?: string;
  transcription?: string;
  energy?: number | null;
  tags?: string[];
  autocontinue?: boolean;
}

/** Full application state. */
export interface AppState {
  screen: Screen;
  items: SessionItem[];
  curIdx: number | null;
  timeLeft: number;
  running: boolean;
  muted: boolean;
  autoContinue: boolean;
  template: TemplateItem[];
  tplDraft: string;
  tplErr: string;
  toast: string | null;
  busy: boolean;
  fileLabel: string;
  prevScreen: Screen;
  frontmatter: Frontmatter;
  /** Elapsed seconds for count-up timer in quick sessions. */
  elapsed: number;
  /** Whether the quick session is prompting for item name. */
  quickPrompting: boolean;
  /** Accumulated items recorded during a quick session. */
  quickItems: SessionItem[];
}

/** Theme color tokens. */
export interface ThemeColors {
  bg: string;
  surface: string;
  border: string;
  accent: string;
  brk: string;
  text: string;
  muted: string;
  done: string;
}

/** Audio notification cue names. */
export type AudioCue = 'warn60' | 'warn10' | 'advance' | 'breakIn' | 'finish';

/** Timer lifecycle callbacks. */
export interface TimerCallbacks {
  onTick: (timeLeft: number) => void;
  onWarn60: () => void;
  onWarn10: () => void;
  onComplete: () => void;
}

/**
 * Platform adapter — abstracts file I/O and settings persistence.
 * Implement for web (File System Access API) or Obsidian (vault API).
 */
export interface PlatformAdapter {
  pickDirectory(): Promise<DirectoryHandle | null>;
  readFile(dir: DirectoryHandle, filename: string): Promise<string | null>;
  writeFile(dir: DirectoryHandle, filename: string, content: string): Promise<void>;
  createFile(dir: DirectoryHandle, filename: string, content: string): Promise<void>;
  loadSetting<T>(key: string): Promise<T | null>;
  saveSetting<T>(key: string, value: T): Promise<void>;
}

/** Opaque directory handle — wraps platform-specific handle type. */
export type DirectoryHandle = unknown;

/** Actions exposed to the renderer. */
export interface AppActions {
  connectVault: () => Promise<void>;
  toggleRun: () => void;
  reset: () => void;
  skip: () => Promise<void>;
  toggleMute: () => void;
  toggleAutoContinue: () => void;
  openTemplate: () => void;
  saveTemplate: () => Promise<void>;
  updateTplDraft: (text: string) => void;
  cancelTemplate: () => void;
  newSession: () => void;
  reloadFile: () => Promise<void>;
  updateFrontmatterField: (key: string, value: string) => Promise<void>;
  /** Start a quick (one-off) session — pick vault then begin. */
  startQuickSession: () => Promise<void>;
  /** Stop the current quick-session timer and prompt for item name. */
  stopQuickItem: () => void;
  /** Record the item name for the just-timed quick item. */
  recordQuickItem: (name: string) => void;
  /** Start another timer within the current quick session. */
  startAnotherQuick: () => void;
  /** End the quick session and write the markdown file. */
  endQuickSession: () => Promise<void>;
}

/** Render function signature — receives state + actions on every update. */
export type RenderFn = (state: AppState, actions: AppActions) => void;
