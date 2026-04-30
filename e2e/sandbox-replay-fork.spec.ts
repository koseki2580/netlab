import { expect, test } from './fixtures/harness';

// Pending the demo wiring described in e2e/sandbox-recording.spec.ts. The replay
// player, scrubber, and fork transition are exercised by RTL specs under
// src/sandbox/recording and src/components/sandbox/recording.

test.skip('sandbox replay: load fixture, scrub, fork at mid-point (pending demo wiring)', async ({
  page,
}) => {
  await page.goto(
    '/?sandbox=1&replay=/fixtures/sandbox-replay-demo.netlabrec.json#/networking/mtu-fragmentation',
  );
  await expect(page.locator('[data-testid="sandbox-replay-scrubber"]')).toBeVisible();
  await page.getByRole('button', { name: /Fork from here/ }).click();
});
