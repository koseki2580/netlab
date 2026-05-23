#!/usr/bin/env node
import { build } from 'esbuild';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const bannedMarkers = ['BgpProtocol', 'TlsOrchestrator', 'VxlanEncap'];
const cacheDir = join(process.cwd(), '.cache');
await mkdir(cacheDir, { recursive: true });
const tempDir = await mkdtemp(join(cacheDir, 'netlab-tree-shake-'));
const entryPath = join(tempDir, 'consumer.mjs');
const bundlePath = join(tempDir, 'bundle.mjs');

await writeFile(
  entryPath,
  [
    "import { NetlabProvider, layerRegistry } from 'netlab';",
    'console.log(Boolean(NetlabProvider), layerRegistry.list().length);',
    '',
  ].join('\n'),
);

try {
  await build({
    entryPoints: [entryPath],
    outfile: bundlePath,
    bundle: true,
    format: 'esm',
    platform: 'browser',
    treeShaking: true,
    minify: false,
    external: ['react', 'react-dom', '@xyflow/react', 'zustand'],
    logLevel: 'silent',
  });

  const bundle = await readFile(bundlePath, 'utf8');
  const presentMarkers = bannedMarkers.filter((marker) => bundle.includes(marker));

  if (presentMarkers.length > 0) {
    console.error(
      `Root import bundle includes layer/protocol markers: ${presentMarkers.join(', ')}`,
    );
    process.exitCode = 1;
  } else {
    console.log('Root import bundle excludes layer/protocol markers.');
  }
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
