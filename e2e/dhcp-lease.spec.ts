import { expect, test } from './fixtures/harness';

/** REQ-431 — DHCP lease lifecycle: predict when the client notices, then follow its messages (TC-2425). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2425: the client first notices at T1 (4 h), loses the address at 8 h, and keeps it when server B answers the rebind', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/dhcp-lease');
  await expect(page.getByTestId('dhcp-lease-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('dhcp-lease-result')).toHaveCount(0);
  await page.getByTestId('dhcp-lease-guess-expiry').click();
  await page.getByTestId('dhcp-lease-reveal-button').click();
  await expect(page.getByTestId('dhcp-lease-reveal')).toHaveAttribute('data-right', 'false');

  const result = page.getByTestId('dhcp-lease-result');
  await expect(result).toHaveAttribute('data-first-unanswered', '14400');
  await expect(result).toHaveAttribute('data-address-lost', '28800');
  await expect(
    page.getByTestId('dhcp-lease-events').locator('tr[data-kind="discover"]'),
  ).toHaveAttribute('data-at', '28800');

  await page.getByTestId('dhcp-lease-with-b').click();
  await expect(result).toHaveAttribute('data-address-lost', 'none');
  await expect(result).toHaveAttribute('data-lease-from', 'B');

  await page.getByTestId('dhcp-lease-only-a').click();
  await page.getByTestId('dhcp-lease-length').fill('24');
  await expect(result).toHaveAttribute('data-first-unanswered', '43200');
  await expect(result).toHaveAttribute('data-address-lost', '86400');
});
