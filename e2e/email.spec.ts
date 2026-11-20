import { expect, test } from './fixtures/harness';

/** REQ-408 — email: MX fallback, then predict DMARC for a forwarded message (TC-2129). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2129: mail falls back to mx2 when mx1 is down, and a forwarded message passes DMARC through DKIM', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/email');
  await expect(page.getByTestId('mail-delivered')).toHaveAttribute('data-host', 'mx1.example.org');
  await expect(page.getByTestId('mail-delivered')).toHaveAttribute('data-attempts', '1');
  await page.getByTestId('mail-mx-toggle-mx1').click();
  await expect(page.getByTestId('mail-delivered')).toHaveAttribute('data-host', 'mx2.example.org');
  await expect(page.getByTestId('mail-delivered')).toHaveAttribute('data-attempts', '2');
  await expect(page.getByTestId('mail-transcript')).toContainText('220 mx2.example.org ESMTP');

  await expect(page.getByTestId('mail-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('mail-cases')).toHaveCount(0);
  await page.getByTestId('mail-guess-fail').click();
  await page.getByTestId('mail-reveal-button').click();
  await expect(page.getByTestId('mail-reveal')).toHaveAttribute('data-right', 'false');

  const forwarded = page.getByTestId('mail-case-forwarded');
  await expect(forwarded).toHaveAttribute('data-spf', 'fail');
  await expect(forwarded).toHaveAttribute('data-dkim', 'pass');
  await expect(forwarded).toHaveAttribute('data-dmarc', 'pass');
  await expect(page.getByTestId('mail-case-direct')).toHaveAttribute('data-dmarc', 'pass');
  await expect(page.getByTestId('mail-case-list')).toHaveAttribute('data-dmarc', 'fail');
  await expect(page.getByTestId('mail-case-forged')).toHaveAttribute('data-action', 'reject');

  await page.getByTestId('mail-policy-quarantine').click();
  await expect(page.getByTestId('mail-case-forged')).toHaveAttribute('data-action', 'quarantine');
  await expect(forwarded).toHaveAttribute('data-action', 'deliver');
});
