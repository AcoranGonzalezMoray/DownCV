import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(process.cwd(), './src')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    css: true,
    setupFiles: ['./vitest.setup.mjs']
  }
});
