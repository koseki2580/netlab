import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';
import {
  LEARN_TIER_MARKER,
  eagerClosure,
  findLearnTierLeaks,
  withoutLazyChunks,
} from './size-gate.mjs';

function dir(files) {
  const root = mkdtempSync(join(tmpdir(), 'size-gate-'));
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(join(root, name, '..'), { recursive: true });
    writeFileSync(join(root, name), text);
  }
  return root;
}

describe('the eager size measure (TC-1120)', () => {
  it('counts a static import and leaves a dynamic chunk out', async () => {
    const root = dir({
      'entry.js': `import { a } from './static.js'; export const load = () => import('./lazy.js'); export { a };`,
      'static.js': `export const a = 'STATIC_BODY';`,
      'lazy.js': `export const b = 'LAZY_BODY';`,
    });
    const config = withoutLazyChunks({
      bundle: true,
      entryPoints: [join(root, 'entry.js')],
      write: false,
      format: 'esm',
      outdir: join(root, 'out'),
    });
    const { outputFiles } = await build(config);
    const text = outputFiles.map((file) => file.text).join('');
    expect(text).toContain('STATIC_BODY');
    expect(text).not.toContain('LAZY_BODY');
  });

  it('walks static imports of a built file and not dynamic ones', () => {
    const root = dir({
      'entry.mjs': `import{a}from"./shared-1.mjs";export*from"./other-2.mjs";const l=()=>import("./lazy-3.mjs");`,
      'shared-1.mjs': `import"./deep-4.mjs";export const a=1;`,
      'other-2.mjs': `import React from"react";export const b=2;`,
      'deep-4.mjs': `export{};`,
      'lazy-3.mjs': `export const c=3;`,
    });
    const names = eagerClosure(join(root, 'entry.mjs')).map((file) => file.slice(root.length + 1));
    expect(names.sort()).toEqual(['deep-4.mjs', 'entry.mjs', 'other-2.mjs', 'shared-1.mjs']);
  });
});

describe('a learn tier in an eager closure fails the gate (TC-1121)', () => {
  it('names the entry and the chunk that leaked', () => {
    const root = dir({
      'entry.mjs': `import"./pack-dns-1.mjs";`,
      'pack-dns-1.mjs': `export const tier="${LEARN_TIER_MARKER}";`,
    });
    expect(findLearnTierLeaks([join(root, 'entry.mjs')])).toEqual([
      { entry: join(root, 'entry.mjs'), chunk: join(root, 'pack-dns-1.mjs') },
    ]);
  });

  it('knows the marker every learn tier in the source carries', () => {
    for (const file of ['src/protocols/dns/pack-dns.ts', 'src/protocols/gre/pack-gre.ts']) {
      expect(readFileSync(file, 'utf8')).toContain(LEARN_TIER_MARKER);
    }
  });

  it('catches a tier inlined in a worker file, and passes a clean closure', () => {
    const root = dir({
      'worker.js': `(()=>{const t="${LEARN_TIER_MARKER}"})();`,
      'clean.mjs': `const l=()=>import("./pack-dns-1.mjs");`,
      'pack-dns-1.mjs': `export const tier="${LEARN_TIER_MARKER}";`,
    });
    expect(findLearnTierLeaks([join(root, 'worker.js')])).toHaveLength(1);
    expect(findLearnTierLeaks([join(root, 'clean.mjs')])).toEqual([]);
  });
});
