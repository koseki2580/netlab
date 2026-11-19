import { expect, test } from './fixtures/harness';

/** REQ-384 — encrypted DNS: predict which method dodges a port block, then compare (TC-1882). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1882: a wrong prediction is marked; only plain DNS is readable, only DoH dodges a port block', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/encrypted-dns');
  await expect(page.getByTestId('edns-reveal-button')).toBeDisabled();
  await page.getByTestId('edns-guess-dot').click();
  await page.getByTestId('edns-reveal-button').click();
  await expect(page.getByTestId('edns-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('edns-do53-readName')).toHaveAttribute('data-can', 'true');
  await expect(page.getByTestId('edns-doh-readName')).toHaveAttribute('data-can', 'false');
  await expect(page.getByTestId('edns-doq-blockByPortAlone')).toHaveAttribute('data-can', 'true');
  await expect(page.getByTestId('edns-doh-blockByPortAlone')).toHaveAttribute('data-can', 'false');
  await expect(page.getByTestId('edns-table')).toContainText('UDP 853');
  await expect(page.getByTestId('edns-table')).toContainText('RFC 9250');
  await expect(page.getByTestId('edns-limits')).toContainText('ECH');
});
