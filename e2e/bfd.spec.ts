import { expect, test } from './fixtures/harness';

/** REQ-387 — BFD: predict the outage with default OSPF timers, compare, tune (TC-1913). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1913: default OSPF loses 40.2 s of traffic, BFD 50 ms × 3 only 350 ms, and the timers can be set', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/bfd');
  await expect(page.getByTestId('bfd-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('bfd-table')).toHaveCount(0);
  await page.getByTestId('bfd-guess-ten-seconds').click();
  await page.getByTestId('bfd-reveal-button').click();
  await expect(page.getByTestId('bfd-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('bfd-row-ospf-default')).toHaveAttribute('data-outage', '40200');
  await expect(page.getByTestId('bfd-row-bfd-50')).toHaveAttribute('data-outage', '350');
  await expect(page.getByTestId('bfd-custom')).toHaveAttribute('data-detect', '900');
  await page.getByTestId('bfd-multiplier').fill('5');
  await expect(page.getByTestId('bfd-custom')).toHaveAttribute('data-detect', '1500');
});

test('TC-2669: after the reveal, 100 ms × 3 reaches the first challenge and 150 ms × 3 does not', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/bfd');
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('bfd-guess-forty-seconds').click();
  await page.getByTestId('bfd-reveal-button').click();
  const first = page.getByTestId('challenge-loss-limit');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-loss-limit-hint')).toHaveCount(0);
  await page.getByTestId('challenge-loss-limit-hint-button').click();
  await expect(page.getByTestId('challenge-loss-limit-hint')).toBeVisible();
  await page.getByTestId('bfd-interval').fill('150');
  await expect(page.getByTestId('bfd-custom')).toHaveAttribute('data-detect', '450');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await page.getByTestId('bfd-interval').fill('100');
  await expect(page.getByTestId('bfd-custom')).toHaveAttribute('data-detect', '300');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-loss-limit-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
