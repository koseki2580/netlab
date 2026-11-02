/**
 * The size gate's two rules beyond size-limit (docs/dev/size-gate.md):
 * - `withoutLazyChunks`: an eager check counts what a consumer downloads up front,
 *   so a dynamic `import()` stays out of the bundle being measured.
 * - `findLearnTierLeaks`: a pack's learn tier is never in an eager closure. Every
 *   learn tier carries `LEARN_TIER_MARKER`, which also catches one inlined into the
 *   worker, a single file with nothing to walk.
 */
import { readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const LEARN_TIER_MARKER = '__netlab_learn_tier__';

export function withoutLazyChunks(config) {
  return {
    ...config,
    plugins: [
      ...(config.plugins ?? []),
      {
        name: 'without-lazy-chunks',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) =>
            args.kind === 'dynamic-import' ? { path: args.path, external: true } : undefined,
          );
        },
      },
    ],
  };
}

const STATIC_IMPORT = /(?:\bimport|\bexport)\s*(?:[\w$*{}\s,]*?\bfrom\s*)?["'](\.[^"']+)["']/g;

/** A built file and everything it statically imports from relative paths. */
export function eagerClosure(entry) {
  const seen = new Set();
  const visit = (file) => {
    if (seen.has(file) || !statSync(file, { throwIfNoEntry: false })?.isFile()) return;
    seen.add(file);
    for (const match of readFileSync(file, 'utf8').matchAll(STATIC_IMPORT)) {
      visit(resolve(dirname(file), match[1]));
    }
  };
  visit(resolve(entry));
  return [...seen];
}

export function findLearnTierLeaks(entries) {
  return entries.flatMap((entry) =>
    eagerClosure(entry)
      .filter((file) => readFileSync(file, 'utf8').includes(LEARN_TIER_MARKER))
      .map((chunk) => ({ entry, chunk })),
  );
}
