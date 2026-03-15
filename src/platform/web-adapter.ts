import type { PlatformAdapter, DirectoryHandle } from './adapter';

/** Web platform adapter using File System Access API and window.storage. */
export class WebPlatformAdapter implements PlatformAdapter {
  async pickDirectory(): Promise<DirectoryHandle | null> {
    if (!(window as any).showDirectoryPicker) return null;
    try {
      return await (window as any).showDirectoryPicker({ mode: 'readwrite' });
    } catch (e: any) {
      if (e.name === 'AbortError') return null;
      throw e;
    }
  }

  async readFile(dir: DirectoryHandle, filename: string): Promise<string | null> {
    try {
      const d = dir as FileSystemDirectoryHandle;
      const fh = await d.getFileHandle(filename);
      return await (await fh.getFile()).text();
    } catch {
      return null;
    }
  }

  async writeFile(dir: DirectoryHandle, filename: string, content: string): Promise<void> {
    try {
      const d = dir as FileSystemDirectoryHandle;
      const fh = await d.getFileHandle(filename);
      const w = await fh.createWritable();
      await w.write(content);
      await w.close();
    } catch { /* write errors are non-critical */ }
  }

  async createFile(dir: DirectoryHandle, filename: string, content: string): Promise<void> {
    const d = dir as FileSystemDirectoryHandle;
    const fh = await d.getFileHandle(filename, { create: true });
    const w = await fh.createWritable();
    await w.write(content);
    await w.close();
  }

  async loadSetting<T>(key: string): Promise<T | null> {
    try {
      const r = await (window as any).storage.get(key);
      return r ? JSON.parse(r.value) as T : null;
    } catch {
      return null;
    }
  }

  async saveSetting<T>(key: string, value: T): Promise<void> {
    try {
      await (window as any).storage.set(key, JSON.stringify(value));
    } catch { /* storage errors are non-critical */ }
  }
}
