# Running the E2E suite

The Playwright suite in [`e2e/`](../../e2e/) runs against the demo app with its test hooks compiled
in (`VITE_E2E=true`: `window.__NETLAB_TRACE__`, the sandbox plugin and the other hooks in
[`demo/__e2e_hook.tsx`](../../demo/__e2e_hook.tsx)). There are two ways to serve it.
[`playwright.config.ts`](../../playwright.config.ts) starts the server itself; nothing needs to
be running beforehand.

## Modes

| Mode               | Command                                                | Server                                                      |
| ------------------ | ------------------------------------------------------ | ----------------------------------------------------------- |
| Prebuilt (default) | `npm run e2e`                                          | `npm run build:e2e`, then `vite preview` serves `dist-e2e/` |
| Dev server         | `npm run e2e:dev` (or `E2E_DEV=1 npx playwright test`) | `vite` dev server, modules transformed on demand            |
| Smoke              | `npm run e2e:smoke`                                    | Prebuilt; chromium only; only the tests tagged `@smoke`     |

**Prebuilt** is what CI runs and the one to use for a full run. The bundle is built once (a few
seconds), and every page then loads finished chunks. Against the dev server, the first test to
touch a lazily loaded chunk waits for it to be transformed, which under a parallel run was the
cause of every timeout seen there.

**Dev server** is for working on a change: no rebuild between runs, and a source edit shows up on
the next test. Its timeouts are longer for the transform wait described above.

**Smoke** is a quick check that every major surface still opens and works: about forty tests, one
per area (the canvas, the detail panel, the editor, the sandbox, lessons, exercises, the course,
locales, themes, phone layouts). Mark a test with `{ tag: '@smoke' }` to add it; keep it to one per
area. CI does not use this script: the PR job still runs the full chromium suite.

## Timeouts

| Mode       | Test timeout | `expect` timeout |
| ---------- | ------------ | ---------------- |
| Prebuilt   | 30 s         | 10 s             |
| Dev server | 60 s         | 15 s             |

The prebuilt limits are still well above what a chromium run needs, to leave room for firefox and
webkit (the nightly job) on a busy machine.

## Port

The server listens on `E2E_PORT`, 5173 by default. Another checkout, or a second run beside one
already going, sets its own:

```sh
E2E_PORT=5273 npm run e2e -- --project=chromium e2e/canvas-pan.spec.ts
```

The server is always started fresh (`reuseExistingServer: false`, `--strictPort`): a server that is
already listening on the port, perhaps one without the test hooks, makes the run stop rather than
being used.

## Notes

- The demo uses a hash router, so a deep link such as `/#/exercises/do/l1-host-address~0` needs no
  server-side rewrite under `vite preview`.
- `build:e2e` builds with `--base /` into `dist-e2e/` (ignored by git), so it never touches the
  GitHub Pages build (`build:demo`, base `/netlab/`, into `dist-demo/`).
- The prebuilt bundle is a production React build: no StrictMode double effects and no development
  warnings. A test that depends on either belongs in the unit suite.
