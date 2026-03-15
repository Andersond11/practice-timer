import type {
  AppState, AppActions, RenderFn, PlatformAdapter,
  DirectoryHandle, TemplateItem,
} from './types';
import { DEFAULT_TEMPLATE } from './constants';
import { todayStr, todayFname, timestampedFname, isBreak } from './helpers';
import type { Frontmatter } from './types';
import { buildMd, buildQuickMd, parseItems, applyDone, parseFrontmatter, setFrontmatterKey } from './markdown';
import { parseTemplateDraft, serializeTemplate } from './template';
import { createInitialState, applyPatch, StatePatch } from './state';
import { TimerController } from './timer';
import { AudioManager } from './audio';

export class PracticeTimerApp {
  private state: AppState;
  private timer: TimerController;
  private audio: AudioManager;
  private platform: PlatformAdapter;
  private renderFn: RenderFn;

  private dirHandle: DirectoryHandle | null = null;
  private currentMd = '';
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private quickIntervalId: ReturnType<typeof setInterval> | null = null;
  private quickFname = '';

  readonly actions: AppActions;

  constructor(opts: {
    platform: PlatformAdapter;
    render: RenderFn;
  }) {
    this.platform = opts.platform;
    this.renderFn = opts.render;
    this.timer = new TimerController();
    this.audio = new AudioManager();
    this.state = createInitialState([...DEFAULT_TEMPLATE]);

    this.actions = {
      connectVault: () => this.connectVault(),
      toggleRun: () => this.toggleRun(),
      reset: () => this.reset(),
      skip: () => this.skip(),
      toggleMute: () => this.toggleMute(),
      toggleAutoContinue: () => this.toggleAutoContinue(),
      openTemplate: () => this.openTemplate(),
      saveTemplate: () => this.saveTemplate(),
      updateTplDraft: (t: string) => this.updateTplDraft(t),
      cancelTemplate: () => this.cancelTemplate(),
      newSession: () => this.newSession(),
      reloadFile: () => this.reloadFile(),
      updateFrontmatterField: (key: string, value: string) => this.updateFrontmatterField(key, value),
      startQuickSession: () => this.startQuickSession(),
      stopQuickItem: () => this.stopQuickItem(),
      recordQuickItem: (name: string) => this.recordQuickItem(name),
      startAnotherQuick: () => this.startAnotherQuick(),
      endQuickSession: () => this.endQuickSession(),
    };
  }

  /** Initialize: load saved template, then render. */
  async init(): Promise<void> {
    const saved = await this.platform.loadSetting<TemplateItem[]>('pt_template');
    if (saved) this.state = applyPatch(this.state, { template: saved });
    this.render();
  }

  /** Open a directory directly, skipping the picker. Used by Obsidian plugin. */
  async openDirectory(dir: DirectoryHandle): Promise<void> {
    this.setState({ busy: true });
    try {
      await this.openOrCreate(dir);
    } catch {
      this.showToast('Could not open folder');
    }
    this.setState({ busy: false });
  }

  /** Replace the current template. Used when settings provide a template externally. */
  setTemplate(template: TemplateItem[]): void {
    this.state = applyPatch(this.state, { template: [...template] });
  }

  // ── State & rendering ──────────────────────────────────────────────────────

  private setState(patch: StatePatch): void {
    this.state = applyPatch(this.state, patch);
    this.render();
  }

  private render(): void {
    this.renderFn(this.state, this.actions);
  }

  private showToast(msg: string): void {
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.setState({ toast: msg });
    this.toastTimer = setTimeout(() => this.setState({ toast: null }), 2800);
  }

  // ── Vault connection ───────────────────────────────────────────────────────

  private async connectVault(): Promise<void> {
    this.setState({ busy: true });
    try {
      const dir = await this.platform.pickDirectory();
      if (!dir) {
        this.setState({ busy: false });
        return;
      }
      await this.openOrCreate(dir);
    } catch {
      this.showToast('Could not open vault folder');
    }
    this.setState({ busy: false });
  }

  private async openOrCreate(dir: DirectoryHandle): Promise<void> {
    const fname = todayFname();
    this.setState({ fileLabel: fname });
    this.dirHandle = dir;

    let content = await this.platform.readFile(dir, fname);
    if (content === null) {
      const dateStr = todayStr();
      const totalMinutes = Math.round(
        this.state.template.reduce((a, i) => a + i.seconds, 0) / 60
      );
      const fm: Frontmatter = {
        type: 'practice-log',
        date: dateStr,
        planned_duration: totalMinutes,
        actual_duration: null,
        standard: '',
        transcription: '',
        energy: null,
        tags: ['music/practice'],
        autocontinue: this.state.autoContinue || undefined,
      };
      content = buildMd(this.state.template, dateStr, fm);
      await this.platform.createFile(dir, fname, content);
      this.showToast(`Created ${fname}`);
    }

    this.currentMd = content;
    const fm = parseFrontmatter(content);
    const items = parseItems(content);
    const first = items.findIndex(i => !i.done);

    if (first >= 0) {
      this.setState({
        items, curIdx: first,
        timeLeft: items[first].seconds,
        screen: 'session', running: false,
        autoContinue: fm.autocontinue ?? false,
        frontmatter: fm,
      });
    } else {
      this.setState({ items, screen: 'done', autoContinue: fm.autocontinue ?? false, frontmatter: fm });
    }
  }

  private async writeback(content: string, fname?: string): Promise<void> {
    if (!this.dirHandle) return;
    await this.platform.writeFile(this.dirHandle, fname ?? todayFname(), content);
  }

  // ── Timer controls ─────────────────────────────────────────────────────────

  private startTimer(): void {
    this.setState({ running: true });
    this.timer.start(this.state.timeLeft, {
      onTick: (t) => this.setState({ timeLeft: t }),
      onWarn60: () => this.audio.play('warn60'),
      onWarn10: () => this.audio.play('warn10'),
      onComplete: () => {
        this.setState({ running: false, timeLeft: 0 });
        setTimeout(() => this.advance(), 80);
      },
    });
  }

  private toggleRun(): void {
    if (this.state.curIdx === null) return;
    if (this.state.running) {
      this.timer.stop();
      this.setState({ running: false });
    } else {
      this.startTimer();
    }
  }

  private reset(): void {
    if (this.state.curIdx === null) return;
    this.timer.stop();
    this.setState({
      running: false,
      timeLeft: this.state.items[this.state.curIdx].seconds,
    });
  }

  private async skip(): Promise<void> {
    this.timer.stop();
    this.setState({ running: false });
    await this.advance();
  }

  private async advance(): Promise<void> {
    const idx = this.state.curIdx;
    if (idx === null) return;

    const newMd = applyDone(this.currentMd, idx);
    this.currentMd = newMd;
    await this.writeback(newMd);

    const newItems = this.state.items.map((it, i) =>
      i === idx ? { ...it, done: true } : it
    );
    const next = newItems.findIndex((it, i) => i > idx && !it.done);

    if (next >= 0) {
      this.audio.play(isBreak(newItems[next].name) ? 'breakIn' : 'advance');
      this.setState({
        items: newItems, curIdx: next,
        timeLeft: newItems[next].seconds,
      });
      if (this.state.autoContinue) {
        this.startTimer();
      }
    } else {
      this.audio.play('finish');
      // Write actual_duration to frontmatter
      const actualMinutes = Math.round(
        newItems.filter(i => i.done).reduce((a, i) => a + i.seconds, 0) / 60
      );
      this.currentMd = setFrontmatterKey(
        this.currentMd, 'actual_duration', String(actualMinutes)
      );
      await this.writeback(this.currentMd);
      this.setState({ items: newItems, curIdx: null, screen: 'done' });
    }
  }

  // ── Mute ───────────────────────────────────────────────────────────────────

  private toggleMute(): void {
    const muted = !this.state.muted;
    this.audio.muted = muted;
    this.setState({ muted });
  }

  // ── Auto-continue ──────────────────────────────────────────────────────────

  private async toggleAutoContinue(): Promise<void> {
    const autoContinue = !this.state.autoContinue;
    this.setState({ autoContinue });
    // Persist to frontmatter in the markdown file
    this.currentMd = setFrontmatterKey(this.currentMd, 'autocontinue', String(autoContinue));
    await this.writeback(this.currentMd);
  }

  // ── Template ───────────────────────────────────────────────────────────────

  private openTemplate(): void {
    this.setState({
      prevScreen: this.state.screen,
      tplDraft: serializeTemplate(this.state.template),
      tplErr: '',
      screen: 'template',
    });
  }

  private async saveTemplate(): Promise<void> {
    const result = parseTemplateDraft(this.state.tplDraft);
    if (!result.ok) {
      this.setState({ tplErr: result.error });
      return;
    }
    this.state = applyPatch(this.state, { template: result.items });
    await this.platform.saveSetting('pt_template', result.items);
    this.showToast('Template saved');
    this.setState({ screen: this.state.prevScreen });
  }

  private updateTplDraft(text: string): void {
    // Direct mutation for perf — no re-render needed for keystrokes
    this.state.tplDraft = text;
    this.state.tplErr = '';
  }

  private cancelTemplate(): void {
    this.setState({ screen: this.state.prevScreen });
  }

  // ── Reload & edit ─────────────────────────────────────────────────────────

  private async reloadFile(): Promise<void> {
    if (!this.dirHandle) return;
    const fname = todayFname();
    const content = await this.platform.readFile(this.dirHandle, fname);
    if (content === null) {
      this.showToast('File not found');
      return;
    }
    this.currentMd = content;
    const fm = parseFrontmatter(content);
    const items = parseItems(content);
    const first = items.findIndex(i => !i.done);

    if (first >= 0) {
      this.setState({
        items, curIdx: first,
        timeLeft: items[first].seconds,
        screen: 'session', running: false,
        autoContinue: fm.autocontinue ?? false,
        frontmatter: fm,
      });
    } else {
      this.setState({ items, screen: 'done', autoContinue: fm.autocontinue ?? false, frontmatter: fm });
    }
    this.showToast('Reloaded from file');
  }

  private async updateFrontmatterField(key: string, value: string): Promise<void> {
    this.currentMd = setFrontmatterKey(this.currentMd, key, value);
    await this.writeback(this.currentMd);
    const fm = parseFrontmatter(this.currentMd);
    this.setState({ frontmatter: fm });
  }

  // ── New session ────────────────────────────────────────────────────────────

  private newSession(): void {
    this.stopQuickTimer();
    this.dirHandle = null;
    this.currentMd = '';
    this.setState({
      screen: 'connect', items: [], curIdx: null,
      timeLeft: 0, running: false,
      elapsed: 0, quickPrompting: false, quickItems: [],
    });
  }

  // ── Quick session ─────────────────────────────────────────────────────────

  private stopQuickTimer(): void {
    if (this.quickIntervalId !== null) {
      clearInterval(this.quickIntervalId);
      this.quickIntervalId = null;
    }
  }

  private startQuickTimer(): void {
    this.stopQuickTimer();
    this.setState({ elapsed: 0, running: true });
    this.quickIntervalId = setInterval(() => {
      this.setState({ elapsed: this.state.elapsed + 1 });
    }, 1000);
  }

  private async startQuickSession(): Promise<void> {
    this.setState({ busy: true });
    try {
      const dir = await this.platform.pickDirectory();
      if (!dir) {
        this.setState({ busy: false });
        return;
      }
      this.dirHandle = dir;
      this.quickFname = timestampedFname();
      this.setState({
        busy: false,
        screen: 'quick',
        fileLabel: this.quickFname,
        quickItems: [],
        quickPrompting: false,
      });
      this.startQuickTimer();
    } catch {
      this.showToast('Could not open vault folder');
      this.setState({ busy: false });
    }
  }

  private stopQuickItem(): void {
    this.stopQuickTimer();
    this.setState({ running: false, quickPrompting: true });
  }

  private recordQuickItem(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const item = { name: trimmed, seconds: this.state.elapsed, done: true };
    this.audio.play('advance');
    this.setState({
      quickItems: [...this.state.quickItems, item],
      quickPrompting: false,
      elapsed: 0,
      running: false,
    });
  }

  private startAnotherQuick(): void {
    this.startQuickTimer();
  }

  private async endQuickSession(): Promise<void> {
    this.stopQuickTimer();
    const items = this.state.quickItems;
    if (items.length === 0) {
      this.newSession();
      return;
    }
    const dateStr = todayStr();
    const totalMinutes = Math.round(items.reduce((a, i) => a + i.seconds, 0) / 60);
    const fm = {
      type: 'practice-log',
      date: dateStr,
      planned_duration: undefined as number | undefined,
      actual_duration: totalMinutes,
      standard: '',
      transcription: '',
      energy: null as number | null,
      tags: ['music/practice'],
    };
    const md = buildQuickMd(items, dateStr, fm);
    await this.platform.createFile(this.dirHandle!, this.quickFname, md);
    this.currentMd = md;
    this.audio.play('finish');
    this.showToast(`Saved ${this.quickFname}`);
    this.setState({
      screen: 'done',
      items,
      curIdx: null,
      running: false,
      frontmatter: parseFrontmatter(md),
    });
  }
}
