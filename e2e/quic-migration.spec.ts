import { expect, test } from './fixtures/harness';

/** REQ-393 — QUIC connection migration and 0-RTT (TC-1977, TC-1978). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1977: after a wrong guess, TCP is reopened (180 ms) while QUIC keeps its connection (60 ms)', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/quic-migration');
  await expect(page.getByTestId('qm-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('qm-table')).toHaveCount(0);
  await page.getByTestId('qm-guess-both-continue').click();
  await page.getByTestId('qm-reveal-button').click();
  await expect(page.getByTestId('qm-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('qm-lookup-tcp')).toHaveAttribute('data-matched', 'false');
  await expect(page.getByTestId('qm-lookup-quic')).toHaveAttribute('data-matched', 'true');
  await expect(page.getByTestId('qm-row-tcp-new-network')).toHaveAttribute('data-ms', '180');
  await expect(page.getByTestId('qm-row-quic-new-network')).toHaveAttribute('data-ms', '60');
  await expect(page.getByTestId('qm-row-tcp-port-only')).toHaveAttribute('data-ms', '80');
  await expect(page.getByTestId('qm-row-quic-port-only')).toHaveAttribute('data-survives', 'true');
});

test('TC-1978: time to first byte follows the RTT, and POST gets no 0-RTT gain', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/quic-migration');
  await page.getByTestId('qm-guess-tcp-breaks').click();
  await page.getByTestId('qm-reveal-button').click();
  await expect(page.getByTestId('qm-reveal')).toHaveAttribute('data-right', 'true');
  await expect(page.getByTestId('qm-ttfb-tcp-tls')).toHaveAttribute('data-ms', '180');
  await expect(page.getByTestId('qm-ttfb-quic')).toHaveAttribute('data-ms', '120');
  await expect(page.getByTestId('qm-ttfb-quic-0rtt')).toHaveAttribute('data-ms', '60');
  await page.getByTestId('qm-rtt').fill('100');
  await expect(page.getByTestId('qm-ttfb-tcp-tls')).toHaveAttribute('data-ms', '300');
  await expect(page.getByTestId('qm-ttfb-quic-0rtt')).toHaveAttribute('data-ms', '100');
  await page.getByTestId('qm-method-POST').click();
  await expect(page.getByTestId('qm-ttfb-quic-0rtt')).toHaveAttribute('data-ms', '200');
  await expect(page.getByTestId('qm-method-note')).toHaveAttribute('data-zero-rtt', 'false');
});
