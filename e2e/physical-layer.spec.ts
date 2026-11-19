import { expect, test } from './fixtures/harness';

/** REQ-390 — the physical layer: duplex mismatch, PoE budget, LLDP (TC-1945..TC-1947). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1945: the auto side of a fixed full-duplex link falls back to half; errors grow with load', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/physical-layer');
  await expect(page.getByTestId('phy-reveal-button')).toBeDisabled();
  await page.getByTestId('phy-guess-100-full').click();
  await page.getByTestId('phy-reveal-button').click();
  await expect(page.getByTestId('phy-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('phy-a-result')).toHaveText('100 Mbit/s 全二重');
  await expect(page.getByTestId('phy-b-result')).toHaveText('100 Mbit/s 半二重');
  const late = page.getByTestId('phy-b-lateCollisions');
  const atHalf = Number(await late.textContent());
  expect(atHalf).toBeGreaterThan(0);
  expect(Number(await page.getByTestId('phy-a-fcsErrors').textContent())).toBe(atHalf);
  await expect(page.getByTestId('phy-a-lateCollisions')).toHaveText('0');
  await page.getByTestId('phy-load').fill('90');
  await expect.poll(async () => Number(await late.textContent())).toBeGreaterThan(atHalf);
  await page.getByTestId('phy-b-setting').selectOption('100-full');
  await expect(page.getByTestId('phy-b-lateCollisions')).toHaveText('0');
  await page.getByTestId('phy-b-setting').selectOption('10-full');
  await expect(page.getByTestId('phy-outcome')).toContainText('リンクしない');
});

test('TC-1946: allocated by class, port 24 stays off; negotiated over LLDP, every port powers up', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/physical-layer');
  await expect(page.getByTestId('phy-poe-reveal-button')).toBeDisabled();
  await page.getByTestId('phy-poe-guess-yes').click();
  await page.getByTestId('phy-poe-reveal-button').click();
  await expect(page.getByTestId('phy-poe-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('phy-poe-allocated')).toHaveText('355.6 W / 370 W');
  await expect(page.getByTestId('phy-poe-drawn')).toHaveText('214 W');
  await expect(page.getByTestId('phy-poe-denied')).toHaveText('24');
  await expect(page.getByTestId('phy-port-24')).toHaveAttribute('data-powered', 'false');
  await page.getByTestId('phy-poe-mode-lldp').click();
  await expect(page.getByTestId('phy-poe-allocated')).toHaveText('276 W / 370 W');
  await expect(page.getByTestId('phy-poe-denied')).toHaveText('なし');
  await expect(page.getByTestId('phy-port-24')).toHaveAttribute('data-powered', 'true');
});

test('TC-1947: each device lists only the devices at the other end of its own cables', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/physical-layer');
  const rows = page.getByTestId('phy-lldp-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText('access-1');
  await expect(rows.nth(0)).toContainText('Gi1/0/48');
  await expect(rows.nth(0)).toContainText('120 s');
  await expect(page.getByTestId('phy-lldp-table')).not.toContainText('ap-3f');
  await page.getByTestId('phy-lldp-ap-3f').click();
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText('access-2');
  await expect(rows.nth(0)).toContainText('Gi1/0/17');
});
