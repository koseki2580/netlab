# npm Publishing — what ships and what doesn't

This document is the source of truth for the **published-tarball contract**:
what files land in the npm tarball, what is intentionally excluded, and the
guardrails that enforce both.

## What ships

Allow-list declared in [`package.json`](../../package.json) under `files`:

| Pattern          | Purpose                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `dist/**/*.js`   | Compiled ES/CJS bundles, code-split chunks, and worker entry under `dist/assets/`.          |
| `dist/**/*.mjs`  | ESM chunk variants emitted alongside the `.cjs.js` files.                                   |
| `dist/**/*.css`  | Pre-built stylesheet (`netlab.css`).                                                        |
| `dist/**/*.d.ts` | Flat TypeScript declarations emitted by `vite-plugin-dts`. Top-level entry is `index.d.ts`. |
| `bin/*.mjs`      | CLI entry (`netlab-run`). Wired via the `bin` field.                                        |

The `files` field is an explicit allow-list (no top-level `dist` or `bin`
globs). Anything emitted under `dist/` that does not match an entry above is
silently excluded by npm. This protects the tarball from accidental bloat when
new build steps emit alongside the canonical outputs.

`package.json` also declares `sideEffects` for the published layer-registration
entries only:

- `./dist/layers/*/index.js`
- `./dist/layers/*/index.cjs.js`

The facade entry (`netlab`) remains tree-shakeable; importing a layer subpath is
what intentionally registers that layer.

The same field also includes source-only registration modules under `src/` so
the repository's own Vite/esbuild builds do not prune bare imports such as
`src/layers/registerAllLayers.ts`, `src/layers/registerForwarders.ts`, or the
sandbox edit reducer registry. It also keeps source registry aggregators such as
`src/scenarios/index.ts` and `src/tutorials/index.ts`, whose module bodies
register built-ins. Those source paths are not shipped in the npm tarball.

## What is intentionally excluded

The build configuration excludes these from declaration emission so they never
land in `dist/`:

- `src/**/*.test.{ts,tsx}` and `src/**/*.spec.{ts,tsx}`
- `src/**/*.stories.{ts,tsx}`
- `src/**/__tests__/**` and `src/**/__properties__/**`

Source maps (`*.d.ts.map`, `*.js.map`) are not emitted either:
`tsconfig.build.json` does not set `declarationMap`, and Vite's library build
does not produce `.js.map` for the public bundle.

Excluded by the `files` allow-list (would have been shipped otherwise):

- `*.ts` / `*.tsx` source files
- `*.map` files of any kind
- Anything outside `dist/` and `bin/` (e.g. `agents/`, `plan/`, `docs/`)

## Size budgets

Enforced by [`scripts/check-published-tarball.mjs`](../../scripts/check-published-tarball.mjs).

| Metric         | Budget      | Today (2026-05-20) |
| -------------- | ----------- | ------------------ |
| Packed bytes   | ≤ 1,572,864 | 620,274            |
| Unpacked bytes | ≤ 4,194,304 | 2,571,689          |
| Entry count    | ≤ 1,200     | 575                |

Budgets are intentionally above the current values — leave headroom for
new features without forcing every PR to re-baseline. Tighten only when a
regression forces a deliberate decision.

## Forbidden paths

The check script fails the build if any of these patterns appears in the
tarball:

- `dist/test/**`, `dist/temp/**`
- `dist/**/*.test.{js,mjs,d.ts}` — would indicate the build-config exclusion regressed
- `**/*.map`
- `.env*`
- `src/**` — published packages must never expose raw source

## Running the check locally

```bash
npm run build
npm run tarball:check
```

The script wraps `npm pack --dry-run --json` and asserts the budgets and the
forbidden-path list. It also verifies that every path declared by `main`,
`module`, `types`, `bin`, and `exports` is present in the packed artifact. CI
currently runs this as a non-blocking notice; promote it to a blocking gate
after the budget has been reviewed on at least one published artifact change.

## When to update this document

- Adding a new build artifact category (e.g. JSON manifest, sourcemaps, images)
  → extend the `files` allow-list and add a row to **What ships**.
- Loosening a budget → record the new ceiling and the justification in the same
  PR that loosens it.
- Adding a forbidden path category → add it to the **Forbidden paths** list and
  to `FORBIDDEN_PATH_PATTERNS` in the check script.
