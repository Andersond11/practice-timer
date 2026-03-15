import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/standalone.ts'],
  bundle: true,
  outfile: 'dist/standalone.js',
  format: 'iife',
  target: 'es2020',
  sourcemap: true,
};

if (watch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log('Watching for changes...');
} else {
  await esbuild.build(buildOptions);
  console.log('Build complete.');
}
