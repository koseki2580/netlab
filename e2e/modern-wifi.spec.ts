import { expect, test } from './fixtures/harness';

/** REQ-395 — modern Wi-Fi: predict OFDMA vs rate, measure airtime, channels, WPA3 (TC-1996). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1996: OFDMA needs 4 transmissions and 1346 µs for 30 phones, 6 GHz channels differ by country, SAE guessing is online', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/modern-wifi');
  await expect(page.getByTestId('wifi-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('wifi-airtime')).toHaveCount(0);
  await page.getByTestId('wifi-guess-faster').click();
  await page.getByTestId('wifi-reveal-button').click();
  await expect(page.getByTestId('wifi-reveal')).toHaveAttribute('data-right', 'false');

  const single = page.getByTestId('wifi-airtime-single');
  await expect(single).toHaveAttribute('data-us', '6480');
  await expect(single).toHaveAttribute('data-tx', '30');
  await expect(page.getByTestId('wifi-airtime-faster')).toHaveAttribute('data-us', '6240');
  const ofdma = page.getByTestId('wifi-airtime-ofdma');
  await expect(ofdma).toHaveAttribute('data-us', '1346');
  await expect(ofdma).toHaveAttribute('data-tx', '4');
  await page.getByTestId('wifi-clients').fill('9');
  await expect(ofdma).toHaveAttribute('data-tx', '1');
  await expect(ofdma).toHaveAttribute('data-us', '356');

  await expect(page.getByTestId('wifi-ch-2.4-20')).toHaveAttribute('data-count', '3');
  await expect(page.getByTestId('wifi-ch-5-20')).toHaveAttribute('data-dfs', '16');
  await expect(page.getByTestId('wifi-ch-6-320')).toHaveAttribute('data-count', '3');
  await page.getByTestId('wifi-region-jp').click();
  await expect(page.getByTestId('wifi-ch-6-320')).toHaveAttribute('data-count', '1');
  await expect(page.getByTestId('wifi-ch-6-20')).toHaveAttribute('data-count', '24');

  await expect(page.getByTestId('wifi-crack-offline')).toHaveAttribute('data-seconds', '0.01');
  await expect(page.getByTestId('wifi-crack-online')).toHaveAttribute('data-seconds', '10000');
  await page.getByTestId('wifi-words-100000000').click();
  await expect(page.getByTestId('wifi-crack-offline')).toHaveAttribute('data-seconds', '100');
});
