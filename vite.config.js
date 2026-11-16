import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  server: {
    port: 5173,
    host: true,
    watch: { ignored: ['**/smoke/**'] },
  },
  build: { target: 'es2020' },
});
