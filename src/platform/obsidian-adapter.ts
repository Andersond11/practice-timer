import type { App, Plugin } from 'obsidian';
import { FuzzySuggestModal } from 'obsidian';
import type { PlatformAdapter, DirectoryHandle } from '../types';

/** Modal for picking a folder within the vault. */
class FolderPickerModal extends FuzzySuggestModal<string> {
  private folderPaths: string[];
  private onChoose: (path: string | null) => void;
  private chosen = false;

  constructor(app: App, onChoose: (path: string | null) => void) {
    super(app);
    this.onChoose = onChoose;
    this.folderPaths = this.collectFolderPaths();
    this.setPlaceholder('Pick a folder for practice logs…');
  }

  private collectFolderPaths(): string[] {
    const paths: string[] = [''];  // vault root
    const allFiles = this.app.vault.getAllLoadedFiles();
    for (const f of allFiles) {
      if ('children' in f) {
        paths.push(f.path);
      }
    }
    return paths.sort();
  }

  getItems(): string[] {
    return this.folderPaths;
  }

  getItemText(path: string): string {
    return path || '/ (vault root)';
  }

  onChooseItem(path: string): void {
    this.chosen = true;
    this.onChoose(path);
  }

  onClose(): void {
    if (!this.chosen) {
      setTimeout(() => this.onChoose(null), 0);
    }
  }
}

/**
 * Obsidian platform adapter.
 * DirectoryHandle is the folder path string (e.g., "Practice" or "").
 */
export class ObsidianAdapter implements PlatformAdapter {
  private app: App;
  private plugin: Plugin;

  constructor(app: App, plugin: Plugin) {
    this.app = app;
    this.plugin = plugin;
  }

  async pickDirectory(): Promise<DirectoryHandle | null> {
    return new Promise<DirectoryHandle | null>((resolve) => {
      let resolved = false;
      const modal = new FolderPickerModal(this.app, (path) => {
        if (resolved) return;
        resolved = true;
        resolve(path !== null ? (path as DirectoryHandle) : null);
      });
      modal.open();
    });
  }

  async readFile(dir: DirectoryHandle, filename: string): Promise<string | null> {
    const path = this.buildPath(dir as string, filename);
    const file = this.app.vault.getFileByPath(path);
    if (!file) return null;
    return this.app.vault.read(file);
  }

  async writeFile(dir: DirectoryHandle, filename: string, content: string): Promise<void> {
    const path = this.buildPath(dir as string, filename);
    const file = this.app.vault.getFileByPath(path);
    if (file) {
      await this.app.vault.modify(file, content);
    }
  }

  async createFile(dir: DirectoryHandle, filename: string, content: string): Promise<void> {
    const path = this.buildPath(dir as string, filename);
    await this.app.vault.create(path, content);
  }

  async loadSetting<T>(key: string): Promise<T | null> {
    const data = await this.plugin.loadData();
    if (data && key in data) return data[key] as T;
    return null;
  }

  async saveSetting<T>(key: string, value: T): Promise<void> {
    const data = (await this.plugin.loadData()) ?? {};
    data[key] = value;
    await this.plugin.saveData(data);
  }

  /**
   * Register a callback for when the active practice file is modified externally.
   * Returns an unregister function.
   */
  onFileChange(dir: DirectoryHandle, filename: string, cb: () => void): () => void {
    const path = this.buildPath(dir as string, filename);
    const ref = this.app.vault.on('modify', (file) => {
      if (file.path === path) cb();
    });
    return () => this.app.vault.offref(ref);
  }

  private buildPath(dir: string, filename: string): string {
    return dir ? `${dir}/${filename}` : filename;
  }
}
