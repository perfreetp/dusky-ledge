import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outdir = path.join(root, '.test-build');
fs.rmSync(outdir, { recursive: true, force: true });

const entries = fs
  .readdirSync(path.join(root, 'test'))
  .filter((f) => f.endsWith('.test.ts'))
  .map((f) => path.join(root, 'test', f));

if (!entries.length) {
  console.error('no test files');
  process.exit(1);
}

await build({
  entryPoints: entries,
  outdir,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: ['node22'],
  sourcemap: 'inline',
  logLevel: 'warning',
});

const files = fs.readdirSync(outdir).filter((f) => f.endsWith('.js')).map((f) => path.join(outdir, f));
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
