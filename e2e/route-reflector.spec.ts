import { expect, test } from './fixtures/harness';

/** REQ-432 — iBGP scaling and route reflectors: count the mesh, then follow a reflected route (TC-2437, TC-2438). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2437: 10 routers need 45 sessions in a full mesh, 9 with one RR, 17 with two, and the counts follow n', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/route-reflector');
  await expect(page.getByTestId('rr-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('rr-counts')).toHaveCount(0);
  await page.getByTestId('rr-guess-ordered').click();
  await page.getByTestId('rr-reveal-button').click();
  await expect(page.getByTestId('rr-reveal')).toHaveAttribute('data-right', 'false');
  const count = page.getByTestId('rr-count');
  await expect(count).toHaveAttribute('data-full', '45');
  await expect(count).toHaveAttribute('data-one', '9');
  await expect(count).toHaveAttribute('data-two', '17');
  await page.getByTestId('rr-n').fill('50');
  await expect(count).toHaveAttribute('data-full', '1225');
  await expect(count).toHaveAttribute('data-one', '49');
});

test('TC-2438: C hears A’s route only through a reflector, and the loop checks drop the reflections that come back', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/route-reflector');
  await page.getByTestId('rr-guess-pairs').click();
  await page.getByTestId('rr-reveal-button').click();
  await expect(page.getByTestId('rr-prop-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('rr-prop')).toHaveCount(0);
  await page.getByTestId('rr-prop-guess-both').click();
  await page.getByTestId('rr-prop-reveal-button').click();
  await expect(page.getByTestId('rr-prop-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('rr-c-result')).toHaveAttribute('data-reaches', 'true');
  await page.getByTestId('rr-scenario-plain').click();
  await expect(page.getByTestId('rr-c-result')).toHaveAttribute('data-reaches', 'false');
  await page.getByTestId('rr-scenario-two-rr-same').click();
  await expect(page.locator('[data-verdict="cluster-list"]')).toHaveCount(2);
  await page.getByTestId('rr-scenario-two-rr-split').click();
  await expect(page.locator('[data-to="A"][data-verdict="originator-id"]')).toHaveCount(2);
});
