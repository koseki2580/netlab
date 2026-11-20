import { expect, test } from './fixtures/harness';

/** REQ-397 — RPKI ROV: predict a more-specific's state, then see forwarding and maxLength (TC-2017, TC-2018). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2017: a mis-originated /25 is Invalid, and every announcement is classified', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/rpki');
  await expect(page.getByTestId('rpki-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('rpki-table')).toHaveCount(0);
  await page.getByTestId('rpki-guess-notfound').click();
  await page.getByTestId('rpki-reveal-button').click();
  await expect(page.getByTestId('rpki-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('rpki-reveal')).toHaveAttribute('data-state', 'Invalid');
  await expect(page.getByTestId('rpki-row-own-24')).toHaveAttribute('data-state', 'Valid');
  await expect(page.getByTestId('rpki-row-other-origin-24')).toHaveAttribute(
    'data-state',
    'Invalid',
  );
  await expect(page.getByTestId('rpki-row-within-max')).toHaveAttribute('data-state', 'Valid');
  await expect(page.getByTestId('rpki-row-beyond-max')).toHaveAttribute('data-state', 'Invalid');
  await expect(page.getByTestId('rpki-row-no-roa')).toHaveAttribute('data-state', 'NotFound');
});

test('TC-2018: dropping Invalid moves traffic from the /25 back to the /24, and maxLength moves the boundary', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/rpki');
  await page.getByTestId('rpki-guess-valid').click();
  await page.getByTestId('rpki-reveal-button').click();
  await expect(page.getByTestId('rpki-reveal')).toHaveAttribute('data-right', 'false');
  const chosen = page.getByTestId('rpki-chosen');
  await expect(chosen).toHaveAttribute('data-prefix', '192.0.2.0/25');
  await expect(chosen).toHaveAttribute('data-origin', '64511');
  await page.getByTestId('rpki-policy-drop-invalid').click();
  await expect(chosen).toHaveAttribute('data-prefix', '192.0.2.0/24');
  await expect(chosen).toHaveAttribute('data-origin', '64500');
  await expect(page.getByTestId('rpki-route-other-origin-25')).toHaveAttribute(
    'data-kept',
    'false',
  );
  await expect(page.getByTestId('rpki-probe-25')).toHaveAttribute('data-state', 'Invalid');
  await page.getByTestId('rpki-maxlength-input').fill('25');
  await expect(page.getByTestId('rpki-probe-25')).toHaveAttribute('data-state', 'Valid');
  await expect(page.getByTestId('rpki-probe-26')).toHaveAttribute('data-state', 'Invalid');
});
