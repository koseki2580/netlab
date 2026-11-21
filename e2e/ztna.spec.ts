import { expect, test } from './fixtures/harness';

/** REQ-415 — from VPN to ZTNA: predict the contractor's reach, compare per user, fix posture (TC-2198, TC-2199). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2198: the contractor’s laptop reaches 5 apps over the VPN but only 1 through ZTNA', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/ztna');
  await expect(page.getByTestId('ztna-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('ztna-compare')).toHaveCount(0);
  await page.getByTestId('ztna-guess-1-1').click();
  await page.getByTestId('ztna-reveal-button').click();
  await expect(page.getByTestId('ztna-reveal')).toHaveAttribute('data-right', 'false');
  const exposure = page.getByTestId('ztna-exposure');
  await expect(exposure).toHaveAttribute('data-vpn-apps', '5');
  await expect(exposure).toHaveAttribute('data-ztna-apps', '1');
  await expect(exposure).toHaveAttribute('data-vpn-addresses', '16777216');
  await expect(exposure).toHaveAttribute('data-ztna-addresses', '0');
  await expect(page.getByTestId('ztna-row-code-repo')).toHaveAttribute('data-ztna', 'true');
  await expect(page.getByTestId('ztna-row-finance-db')).toHaveAttribute('data-vpn', 'true');
  await expect(page.getByTestId('ztna-row-finance-db')).toHaveAttribute('data-ztna', 'false');
});

test('TC-2199: a laptop failing posture is denied everything until its OS is updated', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/ztna');
  await page.getByTestId('ztna-guess-5-1').click();
  await page.getByTestId('ztna-reveal-button').click();
  await expect(page.getByTestId('ztna-reveal')).toHaveAttribute('data-right', 'true');
  await page.getByTestId('ztna-user-engineer-stale').click();
  const exposure = page.getByTestId('ztna-exposure');
  await expect(exposure).toHaveAttribute('data-vpn-apps', '5');
  await expect(exposure).toHaveAttribute('data-ztna-apps', '0');
  await page.getByTestId('ztna-os-toggle').click();
  await expect(exposure).toHaveAttribute('data-ztna-apps', '3');
  await expect(page.getByTestId('ztna-row-hr')).toHaveAttribute('data-ztna', 'true');
});
