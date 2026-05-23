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
          exclude: [
            'src/**/*.test.ts',
            'src/**/*.test.tsx',
            'src/**/*.spec.ts',
            'src/**/*.spec.tsx',
            'src/**/*.stories.ts',
            'src/**/*.stories.tsx',
            'src/**/__tests__/**',
            'src/**/__properties__/**',
          ],
          outDir: 'dist',
          insertTypesEntry: true,
        }),
      ],
      build: {
        lib: {
          entry: {
            netlab: resolve(__dirname, 'src/index.ts'),
            'layers/l1-physical/index': resolve(__dirname, 'src/layers/l1-physical/index.ts'),
            'layers/l2-datalink/index': resolve(__dirname, 'src/layers/l2-datalink/index.ts'),
            'layers/l3-network/index': resolve(__dirname, 'src/layers/l3-network/index.ts'),
            'layers/l4-transport/index': resolve(__dirname, 'src/layers/l4-transport/index.ts'),
            'layers/l7-application/index': resolve(__dirname, 'src/layers/l7-application/index.ts'),
            'protocols/tls/index': resolve(__dirname, 'src/protocols/tls/index.ts'),
            'protocols/quic/index': resolve(__dirname, 'src/protocols/quic/index.ts'),
            'protocols/http2/index': resolve(__dirname, 'src/protocols/http2/index.ts'),
            'protocols/http3/index': resolve(__dirname, 'src/protocols/http3/index.ts'),
          },
          name: 'Netlab',
          formats: ['es', 'cjs'],
          fileName: (format, entryName) => {
            if (entryName === 'netlab') {
              return `netlab.${format === 'es' ? 'es' : 'cjs'}.js`;
            }
            return `${entryName}.${format === 'es' ? 'js' : 'cjs.js'}`;
          },
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
