import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// Config for building the demo as a static site for GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: '/netlab/',
  resolve: {
    alias: {
      netlab: resolve(__dirname, 'src/index.ts'),
    },
  },
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
  },
});
