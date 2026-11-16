import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  server: { host: true },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600
  }
});
