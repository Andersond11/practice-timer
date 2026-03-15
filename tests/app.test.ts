import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PracticeTimerApp } from '../src/app';
import type { PlatformAdapter, AppState, AppActions } from '../src/types';

// ── Mock platform adapter ──────────────────────────────────────────────────

function createMockPlatform(overrides: Partial<PlatformAdapter> = {}): PlatformAdapter {
  return {
    pickDirectory: vi.fn().mockResolvedValue('mock-dir'),
    readFile: vi.fn().mockResolvedValue(null),
    writeFile: vi.fn().mockResolvedValue(undefined),
    createFile: vi.fn().mockResolvedValue(undefined),
    loadSetting: vi.fn().mockResolvedValue(null),
    saveSetting: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Creates an app, captures state snapshots via the render function. */
function setup(platformOverrides: Partial<PlatformAdapter> = {}) {
  const platform = createMockPlatform(platformOverrides);
  const states: AppState[] = [];
  let lastActions: AppActions | null = null;

  const render = vi.fn((s: AppState, a: AppActions) => {
    states.push({ ...s });
    lastActions = a;
  });

  const app = new PracticeTimerApp({ platform, render });

  return {
    app, platform, render, states,
    /** The most recently rendered state. */
    s(): AppState { return states[states.length - 1]; },
    a(): AppActions { return lastActions!; },
  };
}

/** A simple markdown session file with two items. */
const TWO_ITEM_MD = [
  '---',
  'type: practice-log',
  'date: 2026-01-15',
  'planned_duration: 5',
  'actual_duration:',
  'standard: ""',
  'transcription: ""',
  'energy:',
  'tags: [music/practice]',
  '---',
  '',
  '## Practice — 2026-01-15',
  '',
  '- [ ] Scales (2)',
  '- [ ] Break (3)',
  '',
].join('\n');

const ALL_DONE_MD = TWO_ITEM_MD
  .replace('- [ ] Scales', '- [x] Scales')
  .replace('- [ ] Break', '- [x] Break');

// ── Tests ───────────────────────────────────────────────────────────────────

describe('PracticeTimerApp', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── init ──────────────────────────────────────────────────────────────────

  describe('init', () => {
    it('renders the connect screen on init with no saved template', async () => {
      const ctx = setup();
      await ctx.app.init();
      expect(ctx.render).toHaveBeenCalled();
      expect(ctx.s().screen).toBe('connect');
    });

    it('loads a saved template from settings', async () => {
      const saved = [{ name: 'Warm-up', seconds: 300 }];
      const ctx = setup({ loadSetting: vi.fn().mockResolvedValue(saved) });
      await ctx.app.init();
      expect(ctx.s().template).toEqual(saved);
    });
  });

  // ── connectVault ─────────────────────────────────────────────────────────

  describe('connectVault', () => {
    it('creates a new file when none exists and transitions to session', async () => {
      const ctx = setup();
      await ctx.app.init();
      await ctx.a().connectVault();

      expect(ctx.platform.pickDirectory).toHaveBeenCalled();
      expect(ctx.platform.createFile).toHaveBeenCalled();
      expect(ctx.s().screen).toBe('session');
      expect(ctx.s().curIdx).toBe(0);
      expect(ctx.s().busy).toBe(false);
    });

    it('loads existing file and resumes at first unchecked item', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();

      expect(ctx.s().screen).toBe('session');
      expect(ctx.s().items).toHaveLength(2);
      expect(ctx.s().curIdx).toBe(0);
      expect(ctx.s().items[0].name).toBe('Scales');
      expect(ctx.s().timeLeft).toBe(120);
    });

    it('goes to done screen when all items are done', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(ALL_DONE_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();
      expect(ctx.s().screen).toBe('done');
    });

    it('aborts when user cancels the picker', async () => {
      const ctx = setup({ pickDirectory: vi.fn().mockResolvedValue(null) });
      await ctx.app.init();
      await ctx.a().connectVault();

      expect(ctx.s().screen).toBe('connect');
      expect(ctx.s().busy).toBe(false);
    });

    it('shows toast on error', async () => {
      const ctx = setup({ pickDirectory: vi.fn().mockRejectedValue(new Error('fail')) });
      await ctx.app.init();
      await ctx.a().connectVault();

      expect(ctx.s().toast).toBe('Could not open vault folder');
      expect(ctx.s().busy).toBe(false);
    });
  });

  // ── openDirectory ────────────────────────────────────────────────────────

  describe('openDirectory', () => {
    it('opens a directory directly (Obsidian path)', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.app.openDirectory('obsidian-dir');

      expect(ctx.s().screen).toBe('session');
      expect(ctx.s().busy).toBe(false);
    });

    it('shows toast on error', async () => {
      const ctx = setup({ readFile: vi.fn().mockRejectedValue(new Error('fail')) });
      await ctx.app.init();
      await ctx.app.openDirectory('bad-dir');

      expect(ctx.s().toast).toBe('Could not open folder');
      expect(ctx.s().busy).toBe(false);
    });
  });

  // ── setTemplate ──────────────────────────────────────────────────────────

  describe('setTemplate', () => {
    it('replaces the template used when creating a new file', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(null) });
      await ctx.app.init();
      ctx.app.setTemplate([{ name: 'Custom', seconds: 90 }]);
      await ctx.a().connectVault();

      expect(ctx.s().items[0].name).toBe('Custom');
      expect(ctx.s().items[0].seconds).toBe(90);
    });
  });

  // ── toggleRun ────────────────────────────────────────────────────────────

  describe('toggleRun', () => {
    it('starts the timer when paused', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();
      expect(ctx.s().running).toBe(false);

      ctx.a().toggleRun();
      expect(ctx.s().running).toBe(true);
    });

    it('pauses the timer when running', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();

      ctx.a().toggleRun();
      expect(ctx.s().running).toBe(true);
      ctx.a().toggleRun();
      expect(ctx.s().running).toBe(false);
    });

    it('does nothing when curIdx is null', async () => {
      const ctx = setup();
      await ctx.app.init();
      ctx.a().toggleRun();
      expect(ctx.s().running).toBe(false);
    });
  });

  // ── reset ────────────────────────────────────────────────────────────────

  describe('reset', () => {
    it('resets time to the current item duration', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();

      ctx.a().toggleRun();
      vi.advanceTimersByTime(5000);
      expect(ctx.s().timeLeft).toBeLessThan(120);

      ctx.a().reset();
      expect(ctx.s().running).toBe(false);
      expect(ctx.s().timeLeft).toBe(120);
    });

    it('does nothing when curIdx is null', async () => {
      const ctx = setup();
      await ctx.app.init();
      const countBefore = ctx.render.mock.calls.length;
      ctx.a().reset();
      expect(ctx.render.mock.calls.length).toBe(countBefore);
    });
  });

  // ── skip ─────────────────────────────────────────────────────────────────

  describe('skip', () => {
    it('advances to the next item', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();
      expect(ctx.s().curIdx).toBe(0);

      await ctx.a().skip();
      expect(ctx.s().curIdx).toBe(1);
      expect(ctx.s().items[0].done).toBe(true);
      expect(ctx.platform.writeFile).toHaveBeenCalled();
    });

    it('goes to done screen when skipping the last item', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();

      await ctx.a().skip();
      await ctx.a().skip();
      expect(ctx.s().screen).toBe('done');
      expect(ctx.s().curIdx).toBeNull();
    });

    it('writes actual_duration when session completes', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();

      await ctx.a().skip();
      await ctx.a().skip();

      const lastWrite = (ctx.platform.writeFile as any).mock.calls.at(-1);
      expect(lastWrite[2]).toContain('actual_duration:');
    });
  });

  // ── toggleMute ───────────────────────────────────────────────────────────

  describe('toggleMute', () => {
    it('toggles the muted state', async () => {
      const ctx = setup();
      await ctx.app.init();
      expect(ctx.s().muted).toBe(false);

      ctx.a().toggleMute();
      expect(ctx.s().muted).toBe(true);

      ctx.a().toggleMute();
      expect(ctx.s().muted).toBe(false);
    });
  });

  // ── toggleAutoContinue ───────────────────────────────────────────────────

  describe('toggleAutoContinue', () => {
    it('toggles auto-continue and persists to frontmatter', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();
      expect(ctx.s().autoContinue).toBe(false);

      await ctx.a().toggleAutoContinue();
      expect(ctx.s().autoContinue).toBe(true);
      expect(ctx.platform.writeFile).toHaveBeenCalled();
    });
  });

  // ── template editing ─────────────────────────────────────────────────────

  describe('template editing', () => {
    it('openTemplate transitions to template screen', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();
      const prevScreen = ctx.s().screen;

      ctx.a().openTemplate();
      expect(ctx.s().screen).toBe('template');
      expect(ctx.s().tplDraft).toBeTruthy();

      ctx.a().cancelTemplate();
      expect(ctx.s().screen).toBe(prevScreen);
    });

    it('saveTemplate persists valid template', async () => {
      const ctx = setup();
      await ctx.app.init();
      ctx.a().openTemplate();

      ctx.a().updateTplDraft('Warm-up (5)\nDrill (10)');
      await ctx.a().saveTemplate();

      expect(ctx.platform.saveSetting).toHaveBeenCalledWith('pt_template', expect.any(Array));
      expect(ctx.s().toast).toBe('Template saved');
    });

    it('saveTemplate shows error for invalid template', async () => {
      const ctx = setup();
      await ctx.app.init();
      ctx.a().openTemplate();

      ctx.a().updateTplDraft('Bad line without parens');
      await ctx.a().saveTemplate();

      expect(ctx.s().tplErr).toBeTruthy();
      expect(ctx.s().screen).toBe('template');
    });
  });

  // ── reloadFile ───────────────────────────────────────────────────────────

  describe('reloadFile', () => {
    it('reloads and parses file from disk', async () => {
      const readFile = vi.fn()
        .mockResolvedValueOnce(TWO_ITEM_MD)
        .mockResolvedValueOnce(ALL_DONE_MD);
      const ctx = setup({ readFile });
      await ctx.app.init();
      await ctx.a().connectVault();
      expect(ctx.s().screen).toBe('session');

      await ctx.a().reloadFile();
      expect(ctx.s().screen).toBe('done');
      expect(ctx.s().toast).toBe('Reloaded from file');
    });

    it('shows toast when file not found', async () => {
      const readFile = vi.fn()
        .mockResolvedValueOnce(TWO_ITEM_MD)
        .mockResolvedValueOnce(null);
      const ctx = setup({ readFile });
      await ctx.app.init();
      await ctx.a().connectVault();

      await ctx.a().reloadFile();
      expect(ctx.s().toast).toBe('File not found');
    });

    it('does nothing when no directory is connected', async () => {
      const ctx = setup();
      await ctx.app.init();
      await ctx.a().reloadFile();
      expect(ctx.platform.readFile).not.toHaveBeenCalled();
    });
  });

  // ── updateFrontmatterField ───────────────────────────────────────────────

  describe('updateFrontmatterField', () => {
    it('updates a frontmatter field and writes back', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();

      await ctx.a().updateFrontmatterField('energy', '7');
      expect(ctx.s().frontmatter.energy).toBe(7);
      expect(ctx.platform.writeFile).toHaveBeenCalled();
    });
  });

  // ── newSession ───────────────────────────────────────────────────────────

  describe('newSession', () => {
    it('resets to connect screen', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();
      expect(ctx.s().screen).toBe('session');

      ctx.a().newSession();
      expect(ctx.s().screen).toBe('connect');
      expect(ctx.s().items).toEqual([]);
      expect(ctx.s().curIdx).toBeNull();
      expect(ctx.s().running).toBe(false);
    });
  });

  // ── Quick session ────────────────────────────────────────────────────────

  describe('quick session', () => {
    it('starts a quick session after picking a directory', async () => {
      const ctx = setup();
      await ctx.app.init();
      await ctx.a().startQuickSession();

      expect(ctx.s().screen).toBe('quick');
      expect(ctx.s().quickItems).toEqual([]);
      expect(ctx.s().running).toBe(true);
      expect(ctx.s().busy).toBe(false);
    });

    it('reuses existing dirHandle without prompting', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();
      (ctx.platform.pickDirectory as any).mockClear();

      await ctx.a().startQuickSession();
      expect(ctx.platform.pickDirectory).not.toHaveBeenCalled();
      expect(ctx.s().screen).toBe('quick');
    });

    it('aborts when user cancels the picker', async () => {
      const ctx = setup({ pickDirectory: vi.fn().mockResolvedValue(null) });
      await ctx.app.init();
      await ctx.a().startQuickSession();

      expect(ctx.s().screen).toBe('connect');
      expect(ctx.s().busy).toBe(false);
    });

    it('stopQuickItem pauses and prompts for name', async () => {
      const ctx = setup();
      await ctx.app.init();
      await ctx.a().startQuickSession();
      vi.advanceTimersByTime(5000);

      ctx.a().stopQuickItem();
      expect(ctx.s().running).toBe(false);
      expect(ctx.s().quickPrompting).toBe(true);
    });

    it('recordQuickItem records the item and resets elapsed', async () => {
      const ctx = setup();
      await ctx.app.init();
      await ctx.a().startQuickSession();
      vi.advanceTimersByTime(10000);

      ctx.a().stopQuickItem();
      ctx.a().recordQuickItem('Scales');

      expect(ctx.s().quickItems).toHaveLength(1);
      expect(ctx.s().quickItems[0].name).toBe('Scales');
      expect(ctx.s().quickItems[0].seconds).toBe(10);
      expect(ctx.s().quickItems[0].done).toBe(true);
      expect(ctx.s().quickPrompting).toBe(false);
      expect(ctx.s().elapsed).toBe(0);
    });

    it('recordQuickItem ignores empty names', async () => {
      const ctx = setup();
      await ctx.app.init();
      await ctx.a().startQuickSession();
      vi.advanceTimersByTime(5000);
      ctx.a().stopQuickItem();

      ctx.a().recordQuickItem('   ');
      expect(ctx.s().quickItems).toHaveLength(0);
    });

    it('startAnotherQuick restarts the timer', async () => {
      const ctx = setup();
      await ctx.app.init();
      await ctx.a().startQuickSession();
      vi.advanceTimersByTime(5000);
      ctx.a().stopQuickItem();
      ctx.a().recordQuickItem('Scales');

      ctx.a().startAnotherQuick();
      expect(ctx.s().running).toBe(true);
      expect(ctx.s().elapsed).toBe(0);
    });

    it('endQuickSession writes file and goes to done', async () => {
      const ctx = setup();
      await ctx.app.init();
      await ctx.a().startQuickSession();

      vi.advanceTimersByTime(5000);
      ctx.a().stopQuickItem();
      ctx.a().recordQuickItem('Scales');
      ctx.a().startAnotherQuick();
      vi.advanceTimersByTime(3000);
      ctx.a().stopQuickItem();
      ctx.a().recordQuickItem('Arpeggios');

      await ctx.a().endQuickSession();

      expect(ctx.platform.createFile).toHaveBeenCalled();
      expect(ctx.s().screen).toBe('done');
      expect(ctx.s().items).toHaveLength(2);
      expect(ctx.s().curIdx).toBeNull();
    });

    it('endQuickSession with no items returns to connect', async () => {
      const ctx = setup();
      await ctx.app.init();
      await ctx.a().startQuickSession();

      await ctx.a().endQuickSession();
      expect(ctx.s().screen).toBe('connect');
    });

    it('shows toast on picker error', async () => {
      const ctx = setup({ pickDirectory: vi.fn().mockRejectedValue(new Error('fail')) });
      await ctx.app.init();
      await ctx.a().startQuickSession();

      expect(ctx.s().toast).toBe('Could not open vault folder');
      expect(ctx.s().busy).toBe(false);
    });
  });

  // ── Timer integration (advance via timeout) ──────────────────────────────

  describe('timer integration', () => {
    it('advances automatically when timer completes', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();
      expect(ctx.s().curIdx).toBe(0);

      ctx.a().toggleRun();
      vi.advanceTimersByTime(120_000);
      await vi.advanceTimersByTimeAsync(100);

      expect(ctx.s().items[0].done).toBe(true);
      expect(ctx.s().curIdx).toBe(1);
      expect(ctx.platform.writeFile).toHaveBeenCalled();
    });

    it('auto-continue starts next item automatically', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(TWO_ITEM_MD) });
      await ctx.app.init();
      await ctx.a().connectVault();
      await ctx.a().toggleAutoContinue();

      ctx.a().toggleRun();
      vi.advanceTimersByTime(120_000);
      await vi.advanceTimersByTimeAsync(100);

      expect(ctx.s().curIdx).toBe(1);
      expect(ctx.s().running).toBe(true);
    });
  });

  // ── Toast lifecycle ──────────────────────────────────────────────────────

  describe('toast', () => {
    it('clears after 2800ms', async () => {
      const ctx = setup({ readFile: vi.fn().mockResolvedValue(null) });
      await ctx.app.init();
      await ctx.a().connectVault();
      expect(ctx.s().toast).toBeTruthy();

      vi.advanceTimersByTime(2800);
      expect(ctx.s().toast).toBeNull();
    });
  });
});
