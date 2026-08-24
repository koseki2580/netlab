import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Room for a test that waits on more than one first-touch chunk; see the
  // expect timeout below for why those waits can be slow here.
  timeout: 60_000,
  // The suite runs against the dev server, which transforms modules on demand.
  // The first test to touch a lazily-imported chunk pays for that transform, and
  // under a parallel run it repeatedly exceeded the 5s default -- every timeout
  // failure observed was module latency, never a product delay a user would see.
  // Raised rather than retried, so a genuinely broken assertion still fails.
  expect: { timeout: 15_000 },
  fullyParallel: true,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['html']] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'VITE_E2E=true npm run dev',
    url: 'http://localhost:5173',
    // Always boot an E2E server with VITE_E2E=true to avoid accidentally
    // reusing a regular dev server without test hooks.
    reuseExistingServer: false,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
});
