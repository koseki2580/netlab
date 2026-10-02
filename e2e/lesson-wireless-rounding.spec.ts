import { expect, test } from './fixtures/harness';

/**
 * TC-291 — the wireless lesson says its readings are rounded.
 *
 * At 200 m the page reads −66.2 dBm and 5%, while the stated rule (4 points per
 * dB below −65 dBm) gives 4.8%; without a word on rounding the rule looked wrong.
 */
const WIFI = {
  note: 'wireless-radio-model-note',
  distance: 'wireless-distance-input',
  rssi: 'wireless-rssi',
  loss: 'wireless-loss',
} as const;

test('the wireless note explains the rounded reading at 200 m', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/wireless');

  const note = page.getByTestId(WIFI.note);
  await expect(note).toContainText('RSSI to one decimal place and loss to a whole percent');
  await expect(note).toContainText('1.2 × 4 = 4.8%, shown as 5%');

  await page.getByTestId(WIFI.distance).fill('200');
  await expect(page.getByTestId(WIFI.rssi)).toHaveText('RSSI: -66.2 dBm');
  await expect(page.getByTestId(WIFI.loss)).toHaveText('Loss: 5%');
});

test('the wireless rounding note is in Japanese for a Japanese learner', async ({
  page,
  demoPage,
}) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* the lesson still renders; the Japanese text below would then fail */
    }
  });
  await demoPage.goto('/networking/wireless');

  const note = page.getByTestId(WIFI.note);
  await expect(note).toContainText('RSSI は小数第 1 位まで、損失率は整数のパーセント');
  await expect(note).toContainText('1.2 × 4 ＝ 4.8% になり、表示は 5% です');

  await page.getByTestId(WIFI.distance).fill('200');
  await expect(page.getByTestId(WIFI.loss)).toHaveText('損失率: 5%');
});
