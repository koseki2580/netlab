import { expect, test } from './fixtures/harness';

/** REQ-435 — lossless data-centre Ethernet: predict PFC's effect, compare three switches, size the headroom (TC-2467, TC-2468). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2467: plain Ethernet drops 257 frames, PFC none but V is held back, ECN keeps PFC quiet', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/lossless-dc');
  await expect(page.getByTestId('ll-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('ll-results')).toHaveCount(0);
  await page.getByTestId('ll-guess-unaffected').click();
  await page.getByTestId('ll-reveal-button').click();
  await expect(page.getByTestId('ll-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('ll-row-plain')).toHaveAttribute('data-drops', '257');
  const pfc = page.getByTestId('ll-row-pfc');
  await expect(pfc).toHaveAttribute('data-drops', '0');
  await expect(pfc).toHaveAttribute('data-innocent', '174');
  const ecn = page.getByTestId('ll-row-pfc-ecn');
  await expect(ecn).toHaveAttribute('data-pauses', '1');
  await expect(ecn).toHaveAttribute('data-marks', '309');
  await page.getByTestId('ll-show-pfc-ecn').click();
  await expect(page.getByTestId('ll-chart')).toHaveAttribute('data-mode', 'pfc-ecn');
});

test('TC-2468: too little headroom for the cable drops frames even with PFC', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/lossless-dc');
  await page.getByTestId('ll-guess-slowed').click();
  await page.getByTestId('ll-reveal-button').click();
  await expect(page.getByTestId('ll-reveal')).toHaveAttribute('data-right', 'true');
  const tuned = page.getByTestId('ll-tuned');
  await expect(tuned).toHaveAttribute('data-needed', '10');
  await expect(tuned).toHaveAttribute('data-drops', '0');
  await page.getByTestId('ll-headroom').fill('6');
  await expect(tuned).toHaveAttribute('data-drops', '13');
  await page.getByTestId('ll-headroom').fill('10');
  await page.getByTestId('ll-cable').fill('192');
  await expect(tuned).toHaveAttribute('data-needed', '18');
  await expect(tuned).toHaveAttribute('data-drops', '65');
});

test('TC-2633: after the reveal, the smallest headroom that loses nothing at 192 m reaches the first challenge', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/lossless-dc');
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('ll-guess-slowed').click();
  await page.getByTestId('ll-reveal-button').click();
  const first = page.getByTestId('challenge-smallest-headroom');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-smallest-headroom-hint')).toHaveCount(0);
  await page.getByTestId('challenge-smallest-headroom-hint-button').click();
  await expect(page.getByTestId('challenge-smallest-headroom-hint')).toBeVisible();
  await page.getByTestId('ll-cable').fill('192');
  await page.getByTestId('ll-headroom').fill('12');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await page.getByTestId('ll-headroom').fill('13');
  await expect(page.getByTestId('ll-tuned')).toHaveAttribute('data-drops', '0');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-smallest-headroom-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
