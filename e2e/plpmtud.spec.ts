import { expect, test } from './fixtures/harness';

/** REQ-440 — PLPMTUD: predict the probe search on a 1400-byte path with ICMP filtered (TC-2517, TC-2518). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2517: with ICMP filtered, 6 probe sizes settle at 1349 bytes while classic PMTUD black-holes', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/plpmtud');
  await expect(page.getByTestId('plpmtud-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('plpmtud-probes')).toHaveCount(0);
  await page.getByTestId('plpmtud-guess-ptb').click();
  await page.getByTestId('plpmtud-reveal-button').click();
  await expect(page.getByTestId('plpmtud-reveal')).toHaveAttribute('data-right', 'false');
  const result = page.getByTestId('plpmtud-result');
  await expect(result).toHaveAttribute('data-probes', '6');
  await expect(result).toHaveAttribute('data-plpmtu', '1349');
  await expect(result).toHaveAttribute('data-datagrams', '12');
  await expect(page.getByTestId('plpmtud-probe-1')).toHaveAttribute('data-size', '1452');
  await expect(page.getByTestId('plpmtud-probe-1')).toHaveAttribute('data-acked', 'false');
  await expect(page.getByTestId('plpmtud-row-classic-blocked')).toHaveAttribute(
    'data-delivers',
    'false',
  );
  await expect(page.getByTestId('plpmtud-row-bytewise')).toHaveAttribute('data-probes', '153');
});

test('TC-2518: the hidden path MTU slider re-runs the search', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/plpmtud');
  await page.getByTestId('plpmtud-guess-binary').click();
  await page.getByTestId('plpmtud-reveal-button').click();
  await expect(page.getByTestId('plpmtud-reveal')).toHaveAttribute('data-right', 'true');
  await page.getByTestId('plpmtud-path-mtu').fill('1500');
  await expect(page.getByTestId('plpmtud-result')).toHaveAttribute('data-probes', '1');
  await expect(page.getByTestId('plpmtud-result')).toHaveAttribute('data-plpmtu', '1452');
  await page.getByTestId('plpmtud-path-mtu').fill('1492');
  await expect(page.getByTestId('plpmtud-result')).toHaveAttribute('data-plpmtu', '1444');
});

test('TC-2635: after the reveal, a 1492-byte path makes the search land exactly and reaches the first challenge', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/plpmtud');
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('plpmtud-guess-binary').click();
  await page.getByTestId('plpmtud-reveal-button').click();
  const first = page.getByTestId('challenge-exact');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-exact-hint')).toHaveCount(0);
  await page.getByTestId('challenge-exact-hint-button').click();
  await expect(page.getByTestId('challenge-exact-hint')).toBeVisible();
  await page.getByTestId('plpmtud-path-mtu').fill('1492');
  await expect(page.getByTestId('plpmtud-result')).toHaveAttribute('data-plpmtu', '1444');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-exact-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
