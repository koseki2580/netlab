# Size Gate

`npm run size` builds the library, runs [`size-limit`](https://github.com/ai/size-limit) with
[`.size-limit.mjs`](../../.size-limit.mjs), then runs
[`scripts/size-gate-check.mjs`](../../scripts/size-gate-check.mjs). No dependency beyond
`size-limit` and its `esbuild` and `file` plugins, which the project already had.

## What is measured

| Check        | Measures                                                                                       |
| ------------ | ---------------------------------------------------------------------------------------------- |
| Eager checks | What a consumer downloads up front: the entry and all it statically imports, npm packages too. |
| `pack:<id>`  | One lazily loaded learn chunk (`dist/pack-<id>-*.mjs`) on its own. Limit: 3 kB gzipped.        |

`size-limit` bundles a check with esbuild and no code splitting, so without help a dynamic
`import()` is inlined and counted in the entry that reaches it. `withoutLazyChunks`
([`scripts/size-gate.mjs`](../../scripts/size-gate.mjs)) keeps dynamic imports out of each check.

The worker is an ES module: its check counts the entry and the chunks it imports statically,
not a wire tier it loads on first use (GRE, NTP).

## The learn-tier guard

A pack's learn tier ([protocol packs](../core/protocol-packs.md)) carries the string
`__netlab_learn_tier__`. `size-gate-check` walks the static imports of every eager entry in `dist`
and fails, naming the entry and the chunk, if the string appears in the closure. That also catches
a tier inlined into the worker, where there is nothing to walk.

## The locale guard

The Japanese catalog is its own entry, `dist/locales/ja.js` (`locale:ja`, 25 kB), loaded on demand
by `I18nProvider` (REQ-356). `size-gate-check` fails, naming the entry and the file, if any other
eager entry's static imports reach a `dist/locales/*` file.

## The xterm.js guard

xterm.js is the demo's terminal (REQ-361). `size-gate-check` fails if an eager entry's closure
contains xterm.js's `xterm-helper-textarea`. The terminal's commands are their own chunk,
`ui:terminal` (7 kB).

## Adding a pack

Add a `pack('<id>', '3 kB')` line to `.size-limit.mjs`, name the learn file `pack-<id>.ts`, and
add its loader to `src/protocols/packLearn.ts`. Only UI code may import that module.

## Why the limits look loose

The eager limits were set under the old measure, which counted every lazy chunk. They were kept as
they were, so most now sit far above their figures. Lowering them is a separate decision.
