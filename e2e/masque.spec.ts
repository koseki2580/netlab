import { expect, test } from './fixtures/harness';

/** REQ-379 — MASQUE: predict who links you and the site, then compare setups (TC-1853). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1853: with two relays nobody links you to the site; with one proxy the proxy does', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/masque');
  await expect(page.getByTestId('masque-reveal-button')).toBeDisabled();
  await page.getByTestId('masque-guess-relay2').click();
  await page.getByTestId('masque-reveal-button').click();
  await expect(page.getByTestId('masque-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('masque-relay1-clientIp')).toHaveAttribute('data-known', 'true');
  await expect(page.getByTestId('masque-relay1-site')).toHaveAttribute('data-known', 'false');
  await expect(page.getByTestId('masque-relay2-clientIp')).toHaveAttribute('data-known', 'false');
  await expect(page.getByTestId('masque-links')).toContainText('両方を知る者はいません');
  await expect(page.getByTestId('masque-segments')).toContainText('192.0.2.10 → 198.51.100.7');
  await page.getByTestId('masque-setup-one-proxy').click();
  await expect(page.getByTestId('masque-relay2-clientIp')).toHaveAttribute('data-known', 'true');
  await expect(page.getByTestId('masque-links')).toContainText('出口リレー');
  await page.getByTestId('masque-setup-direct').click();
  await expect(page.getByTestId('masque-wifi-site')).toHaveAttribute('data-known', 'true');
});
