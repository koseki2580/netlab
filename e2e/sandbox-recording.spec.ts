import { expect, test } from './fixtures/harness';

// Plan/70 ships the recording primitives (provider, player, scrubber, metadata editor,
// desync detection, property tests). The end-to-end demo integration — wiring the
// "Record session" button into SandboxPanel and exposing a `?recording=1` query
// flag — lands in a follow-up integration plan that opts the MTU/TCP demos into
// SandboxRecorderProvider.
//
// Until that integration ships these specs are skipped. The unit suites under
// src/sandbox/recording and src/components/sandbox/recording cover format,
// determinism, scrubber, metadata editor, and desync detection.

test.skip('sandbox recording: edit MTU, save, and download a valid .netlabrec.json (pending demo wiring)', async ({
  page,
}) => {
  await page.goto('/?sandbox=1&recording=1#/networking/mtu-fragmentation');
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();
  await page.getByRole('button', { name: /Record session/ }).click();
  // Make an edit, then stop+save and assert a valid recording was downloaded.
});
