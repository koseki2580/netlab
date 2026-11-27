import { expect, test } from './fixtures/harness';

/** REQ-445 — BGP graceful restart: predict traffic loss in a restart and in a real failure (TC-2578). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2578: GR keeps traffic through a control-plane restart, but a C-bit-0 BFD lets it hide a dead router for the Restart Time', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/bgp-graceful-restart');
  await expect(page.getByTestId('bgpgr-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('bgpgr-cp')).toHaveCount(0);
  await page.getByTestId('bgpgr-guess-neither').click();
  await page.getByTestId('bgpgr-reveal-button').click();
  await expect(page.getByTestId('bgpgr-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('bgpgr-loss-nogr')).toHaveAttribute('data-loss-ms', '60000');
  await expect(page.getByTestId('bgpgr-loss-gr')).toHaveAttribute('data-loss-ms', '0');
  await page.getByTestId('bgpgr-cp-restart').fill('150000');
  await expect(page.getByTestId('bgpgr-loss-gr')).toHaveAttribute('data-loss-ms', '45000');

  await expect(page.getByTestId('bgpgr-dead-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('bgpgr-dead')).toHaveCount(0);
  await page.getByTestId('bgpgr-dead-guess-under-second').click();
  await page.getByTestId('bgpgr-dead-reveal-button').click();
  await expect(page.getByTestId('bgpgr-dead-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('bgpgr-row-gr-c0')).toHaveAttribute('data-loss-ms', '120900');
  await expect(page.getByTestId('bgpgr-row-gr-c1')).toHaveAttribute('data-loss-ms', '900');
  await expect(page.getByTestId('bgpgr-row-gr-nobfd')).toHaveAttribute('data-loss-ms', '210000');
  await page.getByTestId('bgpgr-restart-time').fill('60000');
  await expect(page.getByTestId('bgpgr-row-gr-c0')).toHaveAttribute('data-loss-ms', '60900');
});

test('TC-2663: after the reveal, a session back at 120 s is the longest that GR still covers', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/bgp-graceful-restart');
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('bgpgr-guess-both').click();
  await page.getByTestId('bgpgr-reveal-button').click();
  const first = page.getByTestId('challenge-longest-safe-restart');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-longest-safe-restart-hint')).toHaveCount(0);
  await page.getByTestId('challenge-longest-safe-restart-hint-button').click();
  await expect(page.getByTestId('challenge-longest-safe-restart-hint')).toBeVisible();
  await page.getByTestId('bgpgr-cp-restart').fill('120000');
  await expect(page.getByTestId('bgpgr-loss-gr')).toHaveAttribute('data-loss-ms', '0');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-longest-safe-restart-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
