import type {
  AppState, AppActions, RenderFn, PlatformAdapter,
  DirectoryHandle, TemplateItem,
} from './types';
import { DEFAULT_TEMPLATE } from './constants';
import { todayStr, todayFname, isBreak } from './helpers';
import type { Frontmatter } from './types';
import { buildMd, parseItems, applyDone, parseFrontmatter, setFrontmatterKey } from './markdown';
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
    };
  }

  /** Initialize: load saved template, then render. */
  async init(): Promise<void> {
    const saved = await this.platform.loadSetting<TemplateItem[]>('pt_template');
    if (saved) this.state = applyPatch(this.state, { template: saved });
    this.render();
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
      });
    } else {
      this.setState({ items, screen: 'done', autoContinue: fm.autocontinue ?? false });
    }
  }

  private async writeback(content: string): Promise<void> {
    if (!this.dirHandle) return;
    const fname = todayFname();
    await this.platform.writeFile(this.dirHandle, fname, content);
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

  // ── New session ────────────────────────────────────────────────────────────

  private newSession(): void {
    this.dirHandle = null;
    this.currentMd = '';
    this.setState({
      screen: 'connect', items: [], curIdx: null,
      timeLeft: 0, running: false,
    });
  }
}
