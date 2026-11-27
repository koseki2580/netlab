import { expect, test } from './fixtures/harness';

/** REQ-443 — PON: predict the shared speed, the splitter loss and how the upstream is shared (TC-2557, TC-2558). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2557: 32 busy homes get 311.04 Mb/s each, a 1:32 splitter loses 17.5 dB, and 1:64 over 20 km leaves class N1', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/pon');
  await expect(page.getByTestId('pn-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('pn-share')).toHaveCount(0);
  await page.getByTestId('pn-guess-line-rate').click();
  await page.getByTestId('pn-reveal-button').click();
  await expect(page.getByTestId('pn-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('pn-reveal')).toHaveAttribute('data-down', '311.04');
  await page.getByTestId('pn-tech-gpon').click();
  await expect(page.getByTestId('pn-share')).toHaveAttribute('data-down', '77.76');
  await expect(page.getByTestId('pn-share')).toHaveAttribute('data-up', '38.88');
  await page.getByTestId('pn-busy').fill('4');
  await expect(page.getByTestId('pn-share')).toHaveAttribute('data-down', '622.08');

  await expect(page.getByTestId('pn-loss-reveal-button')).toBeDisabled();
  await page.getByTestId('pn-loss-guess-tiny').click();
  await page.getByTestId('pn-loss-reveal-button').click();
  await expect(page.getByTestId('pn-loss-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('pn-loss-reveal')).toHaveAttribute('data-loss', '17.5');
  await expect(page.getByTestId('pn-budget')).toHaveAttribute('data-total', '26.5');
  await expect(page.getByTestId('pn-budget')).toHaveAttribute('data-verdict', 'ok');
  await page.getByTestId('pn-split-64').click();
  await expect(page.getByTestId('pn-budget')).toHaveAttribute('data-margin', '-1');
  await expect(page.getByTestId('pn-budget')).toHaveAttribute('data-verdict', 'over');
  await page.getByTestId('pn-class-N2').click();
  await expect(page.getByTestId('pn-budget')).toHaveAttribute('data-verdict', 'ok');
});

test('TC-2558: the OLT grants upstream time; over capacity the small demand is met and the rest share equally', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/pon');
  await expect(page.getByTestId('pn-up-reveal-button')).toBeDisabled();
  await page.getByTestId('pn-up-guess-listen').click();
  await page.getByTestId('pn-up-reveal-button').click();
  await expect(page.getByTestId('pn-up-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('pn-grant-1')).toHaveAttribute('data-grant', '3151.09');
  await expect(page.getByTestId('pn-grant-2')).toHaveAttribute('data-grant', '500');
  await page.getByTestId('pn-onu1').fill('1000');
  await expect(page.getByTestId('pn-grant-1')).toHaveAttribute('data-grant', '1000');
  await expect(page.getByTestId('pn-grant-3')).toHaveAttribute('data-grant', '4000');
});

test('TC-2657: after the loss reveal, 1:64 with two connectors over 20 km reaches the first challenge', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/pon');
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('pn-loss-guess-stages').click();
  await page.getByTestId('pn-loss-reveal-button').click();
  const first = page.getByTestId('challenge-split-64');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-split-64-hint')).toHaveCount(0);
  await page.getByTestId('challenge-split-64-hint-button').click();
  await expect(page.getByTestId('challenge-split-64-hint')).toBeVisible();
  await page.getByTestId('pn-split-64').click();
  await expect(first).toHaveAttribute('data-reached', 'false');
  await page.getByTestId('pn-connectors').fill('2');
  await expect(page.getByTestId('pn-budget')).toHaveAttribute('data-total', '29');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-split-64-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
