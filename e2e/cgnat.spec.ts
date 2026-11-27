import { expect, test } from './fixtures/harness';

/** REQ-433 — carrier-grade NAT: predict subscribers per address and the first refused flow (TC-2445). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2445: 1,024-port blocks serve 63 subscribers, flow 1,025 is refused, and a second block or MAP-E changes the numbers', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/cgnat');
  await expect(page.getByTestId('cgnat-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('cgnat-flows-predict')).toHaveCount(0);
  await page.getByTestId('cgnat-guess-64').click();
  await page.getByTestId('cgnat-reveal-button').click();
  await expect(page.getByTestId('cgnat-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('cgnat-reveal')).toHaveAttribute('data-subscribers', '63');

  await expect(page.getByTestId('cgnat-flows-reveal-button')).toBeDisabled();
  await page.getByTestId('cgnat-flows-guess-all-ok').click();
  await page.getByTestId('cgnat-flows-reveal-button').click();
  await expect(page.getByTestId('cgnat-flows-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('cgnat-flows-reveal')).toHaveAttribute(
    'data-first-refused',
    '1025',
  );

  const result = page.getByTestId('cgnat-result');
  await expect(result).toHaveAttribute('data-subscribers', '63');
  await page.getByTestId('cgnat-max-blocks').fill('2');
  await expect(result).toHaveAttribute('data-first-refused', 'none');
  await expect(result).toHaveAttribute('data-served', '62');
  await page.getByTestId('cgnat-block-2048').click();
  await expect(result).toHaveAttribute('data-subscribers', '31');
  await expect(result).toHaveAttribute('data-unused', '1024');

  await page.getByTestId('cgnat-view-map').click();
  await expect(page.getByTestId('cgnat-map-result')).toHaveAttribute('data-sharing', '64');
  await expect(page.getByTestId('cgnat-map-result')).toHaveAttribute('data-ports', '1008');
  await page.getByTestId('cgnat-psid-bits').fill('8');
  await expect(page.getByTestId('cgnat-map-result')).toHaveAttribute('data-ports', '252');
});

test('TC-2637: a challenge is reached by setting smaller blocks with a higher per-subscriber limit', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/cgnat');
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('cgnat-guess-63').click();
  await page.getByTestId('cgnat-reveal-button').click();
  await page.getByTestId('cgnat-flows-guess-from-1025').click();
  await page.getByTestId('cgnat-flows-reveal-button').click();

  const first = page.getByTestId('challenge-many-subscribers');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-many-subscribers-hint')).toHaveCount(0);
  await page.getByTestId('challenge-many-subscribers-hint-button').click();
  await expect(page.getByTestId('challenge-many-subscribers-hint')).toBeVisible();

  await page.getByTestId('cgnat-block-512').click();
  await page.getByTestId('cgnat-max-blocks').fill('3');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-many-subscribers-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
