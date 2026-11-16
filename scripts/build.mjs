import { build, context } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const watch = process.argv.includes('--watch');

/** @type {import('esbuild').BuildOptions} */
const options = {
  entryPoints: [path.join(root, 'src/main.ts')],
  outfile: path.join(root, 'dist/app.js'),
  bundle: true,
  format: 'iife',
  target: ['es2022'],
  platform: 'browser',
  sourcemap: true,
  legalComments: 'none',
  minify: !watch,
  logLevel: 'info',
};

if (watch) {
  const ctx = await context(options);
  await ctx.watch();
  console.log('[build] watching…');
} else {
  await build(options);
  console.log('[build] dist/app.js ready');
}
