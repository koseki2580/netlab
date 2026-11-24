import { expect, test } from './fixtures/harness';

/** REQ-439 — Real-time web: predict short polling's cost, compare three ways, then which requests may be resent (TC-2508). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2508: short polling sends 12 requests and waits 2.5 s on average, a WebSocket 1 handshake; only idempotent requests are safe to resend', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/websocket');

  await expect(page.getByTestId('ws-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('ws-results')).toHaveCount(0);
  await page.getByTestId('ws-guess-events-full').click();
  await page.getByTestId('ws-reveal-button').click();
  await expect(page.getByTestId('ws-reveal')).toHaveAttribute('data-right', 'false');
  const short = page.getByTestId('ws-row-short');
  await expect(short).toHaveAttribute('data-requests', '12');
  await expect(short).toHaveAttribute('data-delay', '2525');
  await expect(page.getByTestId('ws-row-long')).toHaveAttribute('data-requests', '6');
  await expect(page.getByTestId('ws-row-websocket')).toHaveAttribute('data-bytes', '1254');
  await page.getByTestId('ws-poll').fill('1');
  await expect(short).toHaveAttribute('data-requests', '60');
  await expect(short).toHaveAttribute('data-delay', '525');
  await page.getByTestId('ws-from-client').click();
  await expect(page.getByTestId('ws-header')).toHaveAttribute('data-bytes', '6');

  await expect(page.getByTestId('idem-reveal-button')).toBeDisabled();
  for (const id of ['get-feed', 'put-name', 'delete-item', 'post-order', 'patch-points']) {
    await page.getByTestId(`idem-guess-${id}-yes`).click();
  }
  await page.getByTestId('idem-reveal-button').click();
  await expect(page.getByTestId('idem-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('idem-row-put-name')).toHaveAttribute('data-same', 'true');
  await expect(page.getByTestId('idem-row-post-order')).toHaveAttribute('data-same', 'false');
});
