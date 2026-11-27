import { expect, test } from './fixtures/harness';

/** REQ-377 — L4S: predict, run three senders, read the trade-off (TC-1833). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1833: a wrong prediction is marked; only L4S is both full and short-queued, and its chart stays low', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/l4s');
  await expect(page.getByTestId('l4s-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('l4s-results')).toHaveCount(0);
  await page.getByTestId('l4s-guess-classic-deep').click();
  await page.getByTestId('l4s-reveal-button').click();
  await expect(page.getByTestId('l4s-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('l4s-row-l4s')).toContainText('100 %');
  await expect(page.getByTestId('l4s-row-classic-deep')).toContainText('/ 20 ms');
  await expect(page.getByTestId('l4s-row-classic-shallow')).toContainText('85 %');
  await expect(page.getByTestId('l4s-chart')).toHaveAttribute('aria-label', /最大 20 ms/);
  await page.getByTestId('l4s-show-l4s').click();
  await expect(page.getByTestId('l4s-chart')).toHaveAttribute('aria-label', /最大 5.8 ms/);
});

test('TC-2667: after the reveal, a 120-packet classic buffer reaches the first challenge', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/l4s');
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('l4s-guess-l4s').click();
  await page.getByTestId('l4s-reveal-button').click();
  const first = page.getByTestId('challenge-classic-full');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-classic-full-hint')).toHaveCount(0);
  await page.getByTestId('challenge-classic-full-hint-button').click();
  await expect(page.getByTestId('challenge-classic-full-hint')).toBeVisible();
  await page.getByTestId('l4s-buffer').fill('110');
  await expect(page.getByTestId('l4s-mine')).toHaveAttribute('data-used', '98.4');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await page.getByTestId('l4s-buffer').fill('120');
  await expect(page.getByTestId('l4s-mine')).toHaveAttribute('data-used', '99.6');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-classic-full-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
