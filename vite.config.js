import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  server: { host: '127.0.0.1', port: 5179 },
  build: { target: 'es2020', chunkSizeWarningLimit: 1200 }
})
