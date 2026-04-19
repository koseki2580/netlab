import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ command }) => {
  if (command === 'build') {
    return {
      plugins: [
        react(),
        dts({
          include: ['src'],
          outDir: 'dist',
          insertTypesEntry: true,
        }),
      ],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'Netlab',
          formats: ['es', 'cjs'],
          fileName: (format) => `netlab.${format === 'es' ? 'es' : 'cjs'}.js`,
        },
        rollupOptions: {
          external: ['react', 'react-dom', '@xyflow/react', 'zustand'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM',
              '@xyflow/react': 'ReactFlow',
              zustand: 'zustand',
            },
          },
        },
      },
    };
  }

  // dev server: serve the demo app
  return {
    plugins: [react()],
    resolve: {
      alias: {
        netlab: resolve(__dirname, 'src/index.ts'),
      },
    },
  };
});
