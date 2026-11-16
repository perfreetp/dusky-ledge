import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * workspace 包源码内部使用 ESM 规范的 `.js` 后缀（编译到 dist 后正确），
 * 但浏览器构建直接消费 `.ts` 源码。Rollup 不会像 dev 那样自动改写后缀，
 * 此插件把 packages/* 源码里、存在同名 .ts 的 `.js` 相对导入重写到 `.ts`。
 */
function resolveWorkspaceTs(): Plugin {
  return {
    name: 'pg-resolve-workspace-ts',
    enforce: 'pre',
    resolveId(source, importer) {
      if (!importer || !importer.includes('packages') || !source.startsWith('.')) return null;
      if (!source.endsWith('.js')) return null;
      const importerPath = importer.startsWith('file:') ? fileURLToPath(importer) : importer;
      const candidate = resolve(dirname(importerPath), source.replace(/\.js$/, '.ts'));
      if (existsSync(candidate)) return candidate;
      return null;
    },
  };
}

export default defineConfig({
  plugins: [vue(), resolveWorkspaceTs()],
  resolve: {
    // 浏览器端统一直接消费 workspace 包的 TS 源码（dev 与 build 行为一致）；
    // Node/Nest 端则走 package.json 的 main → CJS dist。
    alias: {
      '@pg/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
      '@pg/geom-kernel': fileURLToPath(
        new URL('../../packages/geom-kernel/src/index.ts', import.meta.url),
      ),
      '@pg/robot': fileURLToPath(new URL('../../packages/robot/src/index.ts', import.meta.url)),
      '@pg/export': fileURLToPath(new URL('../../packages/export/src/index.ts', import.meta.url)),
    },
  },
  // three/webgpu 含顶层 await，需要 ES2022 目标
  build: {
    target: 'es2022',
  },
  optimizeDeps: {
    esbuildOptions: { target: 'es2022' },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
  },
});
