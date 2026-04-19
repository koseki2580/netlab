# CI/CD & Testing

> **Status**: ✅ Implemented

## Overview

This project uses GitHub Actions for automated testing and deployment.

| Workflow                    | Trigger                                | Purpose                               |
| --------------------------- | -------------------------------------- | ------------------------------------- |
| [Unit Tests](#unit-tests)   | Pull request to `main`                 | Run type checks and unit tests        |
| [Deploy Demo](#deploy-demo) | Push to `main` / PR merged into `main` | Build and deploy demo to GitHub Pages |

---

## Unit Tests

**File:** `.github/workflows/test.yml`

Triggered on every pull request targeting `main`. Runs:

1. `npm run typecheck` — TypeScript type check across the full codebase
2. `npm run test` — Vitest unit test suite

### Test files

| File                                            | What is tested                                                                   |
| ----------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/utils/cidr.test.ts`                        | `isInSubnet`, `parseCidr`, `prefixLength` — CIDR matching and parsing            |
| `src/routing/static/StaticProtocol.test.ts`     | Static route computation from topology nodes                                     |
| `src/layers/l3-network/RouterForwarder.test.ts` | IP forwarding: TTL decrement, longest-prefix match, default route, no-route drop |

### Running tests locally

```bash
npm test          # single run
npm run test:watch # watch mode
```

### Test framework

[Vitest](https://vitest.dev/) — zero-config when using Vite. Configuration is inherited from `vite.config.ts`.

---

## Deploy Demo

**File:** `.github/workflows/deploy.yml`

Triggered when:

- A commit is pushed directly to `main`, or
- A pull request targeting `main` is merged

Steps:

1. Install dependencies (`npm ci`)
2. Build the demo as a static site (`npm run build:demo`)
3. Push the output (`dist-demo/`) to the `gh-pages` branch using [peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages)

The deployed demo is accessible at:

```
https://koseki2580.github.io/netlab/
```

### Demo build configuration

**File:** `vite.demo.config.ts`

- Entry: `index.html` (project root)
- Output: `dist-demo/`
- Base URL: `/netlab/` (required for GitHub Pages sub-path hosting)
- `netlab` package alias resolves to `src/index.ts` so the demo builds from source

### Building locally

```bash
npm run build:demo
# Output in dist-demo/
```

### GitHub Pages setup (one-time)

In the GitHub repository: **Settings → Pages → Source**, select the `gh-pages` branch. The workflow will create this branch automatically on the first deploy.

---

## Permissions

The deploy workflow requires write access to push to the `gh-pages` branch. This is granted via the `permissions: contents: write` setting in the workflow file using the built-in `GITHUB_TOKEN` — no additional secrets are needed.
