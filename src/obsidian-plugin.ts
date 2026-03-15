import { Plugin, ItemView, WorkspaceLeaf } from 'obsidian';
import { PracticeTimerApp } from './app';
import { ObsidianAdapter } from './platform/obsidian-adapter';
import { createDomRenderer } from './ui/renderer';

const VIEW_TYPE = 'practice-timer';

class PracticeTimerView extends ItemView {
  private timerApp: PracticeTimerApp;

  constructor(leaf: WorkspaceLeaf, plugin: PracticeTimerPlugin) {
    super(leaf);
    const adapter = new ObsidianAdapter(this.app, plugin);
    this.timerApp = new PracticeTimerApp({
      platform: adapter,
      render: createDomRenderer(this.contentEl),
    });
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Practice Timer';
  }

  getIcon(): string {
    return 'timer';
  }

  async onOpen(): Promise<void> {
    this.contentEl.addClass('practice-timer-root');
    await this.timerApp.init();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }
}

export default class PracticeTimerPlugin extends Plugin {
  async onload(): Promise<void> {
    this.registerView(VIEW_TYPE, (leaf) => {
      return new PracticeTimerView(leaf, this);
    });

    this.addRibbonIcon('timer', 'Practice Timer', () => {
      this.activateView();
    });

    this.addCommand({
      id: 'open-practice-timer',
      name: 'Open Practice Timer',
      callback: () => this.activateView(),
    });
  }

  async onunload(): Promise<void> {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE);
  }

  private async activateView(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getRightLeaf(false);
    if (leaf) {
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
      this.app.workspace.revealLeaf(leaf);
    }
  }
}
