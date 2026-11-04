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
  // The simulation worker is an ES module, as in the library (REQ-312).
  worker: { format: 'es' },
  build: {
    outDir: 'dist-demo',
    emptyOutDir: true,
  },
});
