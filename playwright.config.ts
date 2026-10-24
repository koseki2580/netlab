import { defineConfig } from '@playwright/test';

/**
 * The suite runs against a prebuilt demo by default: `npm run build:e2e` bundles
 * it once with the test hooks compiled in (`VITE_E2E=true`), and `vite preview`
 * serves the files. Every page then loads finished chunks, so no test waits on
 * a module being transformed on first touch, which was the source of every
 * timeout seen against the dev server.
 *
 * `E2E_DEV=1` runs against the dev server instead, for debugging a change
 * without rebuilding. `E2E_PORT` picks the port (default 5173), so a second
 * checkout or a second run can have its own.
 */
const port = Number(process.env.E2E_PORT ?? 5173);
const devServer = process.env.E2E_DEV === '1';
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  // Against the dev server the first test to touch a lazily imported chunk
  // paid for its transform, and under a parallel run that repeatedly exceeded
  // Playwright's defaults; the generous limits are kept for that mode. The
  // prebuilt bundle has no such cost, so it runs closer to the defaults, still
  // with room for firefox and webkit on a busy machine.
  timeout: devServer ? 60_000 : 30_000,
  expect: { timeout: devServer ? 15_000 : 10_000 },
  fullyParallel: true,
  retries: 0,
  // CI keeps an HTML report and a JUnit file for every run (see the e2e jobs in
  // .github/workflows). Sharded nightly runs override this with --reporter=blob.
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // Always boot a server with the test hooks (VITE_E2E=true) on a port of its
    // own, rather than reusing whatever is listening there.
    command: devServer
      ? `VITE_E2E=true npx vite --port ${port} --strictPort`
      : `npm run build:e2e && npx vite preview --config vite.demo.config.ts --base / --outDir dist-e2e --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: devServer ? 60_000 : 180_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
