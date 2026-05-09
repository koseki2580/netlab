import { chmod } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

await build({
  entryPoints: ['src/cli/main.ts'],
  outfile: 'bin/netlab-run.mjs',
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  banner: {
    js: '#!/usr/bin/env node',
  },
  define: {
    __NETLAB_VERSION__: JSON.stringify(version),
  },
  external: ['@xyflow/react', 'react', 'react-dom'],
});

await chmod('bin/netlab-run.mjs', 0o755);
