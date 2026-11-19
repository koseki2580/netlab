import { expect, test } from './fixtures/harness';

/** REQ-386 — Happy Eyeballs and NAT64: predict, reveal the race, translate (TC-1903). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1903: with IPv6 silently broken the browser is on IPv4 at 280 ms, and DNS64 embeds the address', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/happy-eyeballs');
  await expect(page.getByTestId('he-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('he-table')).toHaveCount(0);
  await page.getByTestId('he-guess-v4-slow').click();
  await page.getByTestId('he-reveal-button').click();
  await expect(page.getByTestId('he-reveal')).toHaveAttribute('data-right', 'false');
  const broken = page.getByTestId('he-happy-v6-broken');
  await expect(broken).toHaveAttribute('data-family', 'IPv4');
  await expect(broken).toHaveAttribute('data-ms', '280');
  await expect(page.getByTestId('he-naive-v6-broken')).toHaveAttribute('data-ms', '21030');
  await expect(page.getByTestId('he-happy-v6-slow')).toHaveAttribute('data-family', 'IPv4');
  await expect(page.getByTestId('he-synth')).toHaveText('64:ff9b::c000:221');
  await page.getByTestId('he-site-198.51.100.7').click();
  await expect(page.getByTestId('he-synth')).toHaveText('64:ff9b::c633:6407');
  await expect(page.getByTestId('he-v4')).toHaveText('203.0.113.1 → 198.51.100.7');
});
