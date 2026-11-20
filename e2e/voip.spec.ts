import { expect, test } from './fixtures/harness';

/** REQ-407 — voice over IP: predict the negotiated codec, then the jitter buffer (TC-2118, TC-2119). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2118: a G.711-only callee answers with G.711, RTP flows to the SDP ports, and no common codec gives 488', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/voip');
  await expect(page.getByTestId('voip-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('voip-ladder')).toHaveCount(0);
  await page.getByTestId('voip-guess-opus').click();
  await page.getByTestId('voip-reveal-button').click();
  await expect(page.getByTestId('voip-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('voip-chosen')).toHaveAttribute('data-codec', 'pcmu');
  await expect(page.getByTestId('voip-chosen')).toHaveAttribute('data-status', '200');
  await expect(page.getByTestId('voip-rtp')).toHaveAttribute(
    'data-caller-sends-to',
    '198.51.100.20:52000',
  );
  await expect(page.getByTestId('voip-rtp')).toHaveAttribute(
    'data-callee-sends-to',
    '192.0.2.10:49170',
  );
  await expect(page.getByTestId('voip-bw-pcmu')).toHaveAttribute('data-ip-kbps', '80');
  await page.getByTestId('voip-ptime-10').click();
  await expect(page.getByTestId('voip-bw-pcmu')).toHaveAttribute('data-ip-kbps', '96');
  await page.getByTestId('voip-callee-g722-only').click();
  await expect(page.getByTestId('voip-chosen')).toHaveAttribute('data-status', '488');
  await expect(page.getByTestId('voip-rtp')).toHaveCount(0);
});

test('TC-2119: a 60 ms jitter buffer is the smallest choice under 1 % loss, and the buffer can be set', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/voip');
  await page.getByTestId('voip-guess-pcmu').click();
  await page.getByTestId('voip-reveal-button').click();
  await expect(page.getByTestId('voip-buffer-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('voip-buffer-results')).toHaveCount(0);
  await page.getByTestId('voip-buffer-guess-40').click();
  await page.getByTestId('voip-buffer-reveal-button').click();
  await expect(page.getByTestId('voip-buffer-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('voip-buffer-row-20')).toHaveAttribute('data-loss', '22');
  await expect(page.getByTestId('voip-buffer-row-40')).toHaveAttribute('data-loss', '6');
  await expect(page.getByTestId('voip-buffer-row-60')).toHaveAttribute('data-loss', '0');
  await expect(page.getByTestId('voip-buffer-row-60')).toHaveAttribute('data-delay', '120');
  await expect(page.getByTestId('voip-buffer-custom')).toHaveAttribute('data-late', '3');
  await page.getByTestId('voip-buffer-slider').fill('52');
  await expect(page.getByTestId('voip-buffer-custom')).toHaveAttribute('data-late', '0');
  await expect(page.getByTestId('voip-buffer-custom')).toHaveAttribute('data-delay', '112');
});
