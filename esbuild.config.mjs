import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');
const target = process.argv.find(a => a === '--obsidian' || a === '--standalone') ?? '--all';

const standaloneOptions = {
  entryPoints: ['src/standalone.ts'],
  bundle: true,
  outfile: 'dist/standalone.js',
  format: 'iife',
  target: 'es2020',
  sourcemap: true,
};

const obsidianOptions = {
  entryPoints: ['src/obsidian-plugin.ts'],
  bundle: true,
  outfile: 'dist/main.js',
  format: 'cjs',
  target: 'es2020',
  sourcemap: 'inline',
  external: ['obsidian'],
};

const builds = [];
if (target === '--standalone' || target === '--all') builds.push(standaloneOptions);
if (target === '--obsidian' || target === '--all') builds.push(obsidianOptions);

if (watch) {
  for (const opts of builds) {
    const ctx = await esbuild.context(opts);
    await ctx.watch();
  }
  console.log('Watching for changes...');
} else {
  for (const opts of builds) {
    await esbuild.build(opts);
  }
  console.log('Build complete.');
}
