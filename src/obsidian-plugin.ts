import { Plugin, ItemView, WorkspaceLeaf, PluginSettingTab, Setting, AbstractInputSuggest, type App } from 'obsidian';
import { PracticeTimerApp } from './app';
import { ObsidianAdapter } from './platform/obsidian-adapter';
import { createDomRenderer } from './ui/renderer';
import { parseItems } from './markdown';
import type { DirectoryHandle } from './types';

const VIEW_TYPE = 'practice-timer';

interface PracticeTimerSettings {
  journalDirectory: string;
  templatePath: string;
}

const DEFAULT_SETTINGS: PracticeTimerSettings = {
  journalDirectory: '',
  templatePath: '',
};

// ── View ────────────────────────────────────────────────────────────────────

class PracticeTimerView extends ItemView {
  private timerApp: PracticeTimerApp;
  private plugin: PracticeTimerPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: PracticeTimerPlugin) {
    super(leaf);
    this.plugin = plugin;
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

    // Load template from vault file (after init, so it takes priority)
    const { templatePath, journalDirectory } = this.plugin.settings;
    if (templatePath) {
      const file = this.app.vault.getFileByPath(templatePath);
      if (file) {
        const content = await this.app.vault.read(file);
        const items = parseItems(content);
        if (items.length > 0) {
          this.timerApp.setTemplate(items.map(i => ({ name: i.name, seconds: i.seconds })));
        }
      }
    }

    // If journal directory is configured, skip the connect screen
    if (journalDirectory) {
      await this.timerApp.openDirectory(journalDirectory as DirectoryHandle);
    }
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }
}

// ── Input suggests ──────────────────────────────────────────────────────────

class FolderSuggest extends AbstractInputSuggest<string> {
  private onSelect_: (path: string) => void;

  constructor(app: App, inputEl: HTMLInputElement, onSelect: (path: string) => void) {
    super(app, inputEl);
    this.onSelect_ = onSelect;
  }

  getSuggestions(query: string): string[] {
    const lower = query.toLowerCase();
    const paths: string[] = [];
    for (const f of this.app.vault.getAllLoadedFiles()) {
      if ('children' in f) {
        const display = f.path || '/';
        if (display.toLowerCase().includes(lower)) {
          paths.push(f.path);
        }
      }
    }
    return paths.sort();
  }

  renderSuggestion(path: string, el: HTMLElement): void {
    el.setText(path || '/ (vault root)');
  }

  selectSuggestion(path: string): void {
    this.setValue(path);
    this.onSelect_(path);
    this.close();
  }
}

class FileSuggest extends AbstractInputSuggest<string> {
  private extension: string;
  private onSelect_: (path: string) => void;

  constructor(app: App, inputEl: HTMLInputElement, extension: string, onSelect: (path: string) => void) {
    super(app, inputEl);
    this.extension = extension;
    this.onSelect_ = onSelect;
  }

  getSuggestions(query: string): string[] {
    const lower = query.toLowerCase();
    const paths: string[] = [];
    for (const f of this.app.vault.getAllLoadedFiles()) {
      if (!('children' in f) && f.path.endsWith(this.extension)) {
        if (f.path.toLowerCase().includes(lower)) {
          paths.push(f.path);
        }
      }
    }
    return paths.sort();
  }

  renderSuggestion(path: string, el: HTMLElement): void {
    el.setText(path);
  }

  selectSuggestion(path: string): void {
    this.setValue(path);
    this.onSelect_(path);
    this.close();
  }
}

// ── Settings tab ────────────────────────────────────────────────────────────

class PracticeTimerSettingTab extends PluginSettingTab {
  plugin: PracticeTimerPlugin;

  constructor(app: App, plugin: PracticeTimerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Practice Timer Settings' });

    new Setting(containerEl)
      .setName('Journal directory')
      .setDesc(
        'Folder in your vault where practice logs are stored. ' +
        'Leave empty to be prompted each time.'
      )
      .addText(text => {
        text
          .setPlaceholder('e.g. Practice/Journal')
          .setValue(this.plugin.settings.journalDirectory);
        new FolderSuggest(this.app, text.inputEl, async (value) => {
          this.plugin.settings.journalDirectory = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Template file')
      .setDesc(
        'Path to a markdown file in your vault to use as the practice template. ' +
        'The file should contain checklist items like "- [ ] Scales (10)".'
      )
      .addText(text => {
        text
          .setPlaceholder('e.g. Templates/Practice.md')
          .setValue(this.plugin.settings.templatePath);
        new FileSuggest(this.app, text.inputEl, '.md', async (value) => {
          this.plugin.settings.templatePath = value;
          await this.plugin.saveSettings();
        });
      });
  }
}

// ── Plugin ──────────────────────────────────────────────────────────────────

export default class PracticeTimerPlugin extends Plugin {
  settings: PracticeTimerSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.registerView(VIEW_TYPE, (leaf) => {
      return new PracticeTimerView(leaf, this);
    });

    this.addSettingTab(new PracticeTimerSettingTab(this.app, this));

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

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
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
