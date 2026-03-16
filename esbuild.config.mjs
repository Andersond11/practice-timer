import * as esbuild from 'esbuild';
import { cpSync, mkdirSync } from 'fs';

const watch = process.argv.includes('--watch');
const target = process.argv.find(a => a === '--obsidian' || a === '--standalone') ?? '--all';

const standaloneOptions = {
  entryPoints: ['src/standalone.ts'],
  bundle: true,
  outfile: 'dist/standalone/standalone.js',
  format: 'iife',
  target: 'es2020',
  sourcemap: true,
};

const obsidianOptions = {
  entryPoints: ['src/obsidian-plugin.ts'],
  bundle: true,
  outfile: 'dist/obsidian/main.js',
  format: 'cjs',
  target: 'es2020',
  sourcemap: 'inline',
  external: ['obsidian'],
};

const builds = [];
if (target === '--standalone' || target === '--all') builds.push('standalone');
if (target === '--obsidian' || target === '--all') builds.push('obsidian');

if (watch) {
  for (const name of builds) {
    const opts = name === 'standalone' ? standaloneOptions : obsidianOptions;
    const ctx = await esbuild.context(opts);
    await ctx.watch();
  }
  console.log('Watching for changes...');
} else {
  for (const name of builds) {
    const opts = name === 'standalone' ? standaloneOptions : obsidianOptions;
    await esbuild.build(opts);

    if (name === 'obsidian') {
      // Copy manifest.json and styles.css into dist/obsidian/
      cpSync('manifest.json', 'dist/obsidian/manifest.json');
      cpSync('styles.css', 'dist/obsidian/styles.css');
    }

    if (name === 'standalone') {
      // Copy the HTML page into dist/standalone/
      cpSync('practice_timer_app.html', 'dist/standalone/practice_timer_app.html');
    }
  }
  console.log('Build complete.');
}
