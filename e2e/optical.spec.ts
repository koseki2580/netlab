import { expect, test } from './fixtures/harness';

/** REQ-437 — optical link budget and the DWDM grid (TC-2485, TC-2486). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2485: 30 km at 1310 nm comes up with only 2 dB of margin, 1550 nm leaves 5 dB, and 40 km goes down', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/optical');
  await expect(page.getByTestId('op-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('op-budget')).toHaveCount(0);
  await page.getByTestId('op-guess-down').click();
  await page.getByTestId('op-reveal-button').click();
  await expect(page.getByTestId('op-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('op-reveal')).toHaveAttribute('data-margin', '2');
  await expect(page.getByTestId('op-reveal')).toHaveAttribute('data-rx', '-12');
  await expect(page.getByTestId('op-result')).toHaveAttribute('data-verdict', 'thin');
  await page.getByTestId('op-fibre-smf-1550').click();
  await expect(page.getByTestId('op-result')).toHaveAttribute('data-margin', '5');
  await expect(page.getByTestId('op-result')).toHaveAttribute('data-verdict', 'comfortable');
  await page.getByTestId('op-fibre-smf-1310').click();
  await page.getByTestId('op-km').fill('40');
  await expect(page.getByTestId('op-result')).toHaveAttribute('data-margin', '-1.7');
  await expect(page.getByTestId('op-result')).toHaveAttribute('data-limit', 'loss');
  await page.getByTestId('op-fibre-mmf-850').click();
  await page.getByTestId('op-km').fill('0.5');
  await expect(page.getByTestId('op-result')).toHaveAttribute('data-limit', 'reach');
});

test('TC-2486: 44 channels fit the C-band on the 100 GHz grid, 87 on the 50 GHz grid', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/optical');
  await expect(page.getByTestId('op-dwdm-reveal-button')).toBeDisabled();
  await page.getByTestId('op-dwdm-guess-about-400').click();
  await page.getByTestId('op-dwdm-reveal-button').click();
  await expect(page.getByTestId('op-dwdm-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('op-dwdm-reveal')).toHaveAttribute('data-count', '44');
  await expect(page.getByTestId('op-grid')).toHaveAttribute('data-count', '44');
  await page.getByTestId('op-spacing-50').click();
  await expect(page.getByTestId('op-grid')).toHaveAttribute('data-count', '87');
});

test('TC-2631: after the reveal, changing only the fibre to 1550 nm reaches the first challenge', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/optical');
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('op-guess-thin').click();
  await page.getByTestId('op-reveal-button').click();
  const first = page.getByTestId('challenge-fibre-only');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-fibre-only-hint')).toHaveCount(0);
  await page.getByTestId('challenge-fibre-only-hint-button').click();
  await expect(page.getByTestId('challenge-fibre-only-hint')).toBeVisible();
  await page.getByTestId('op-fibre-smf-1550').click();
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-fibre-only-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
