import { expect, test } from './fixtures/harness';

/**
 * TC-260 — the wireless lesson states its radio model.
 *
 * The page showed RSSI and loss with no rule behind them, so a learner left
 * believing −66 dBm means loss on any Wi-Fi. The note gives the path-loss rule
 * and the loss rule with the model's constants, and says the loss line is the
 * lesson's simplification.
 */
const NOTE = 'wireless-radio-model-note';

test('the wireless lesson states its radio model and its limits', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/wireless');

  const note = page.getByTestId(NOTE);
  await expect(note).toContainText('transmit power (20 dBm)');
  await expect(note).toContainText('free-space path loss at 2437 MHz');
  await expect(note).toContainText('20 dB weaker for every tenfold distance');
  await expect(note).toContainText('0% down to −65 dBm');
  await expect(note).toContainText('100% at −90 dBm');
  await expect(note).toContainText('this lesson’s simplification');
  await expect(note).toContainText('−66 dBm is a healthy signal');

  // The numbers on the page follow the stated rule: 20 m is far above −65 dBm.
  await expect(page.getByTestId('wireless-rssi')).toHaveText('RSSI: -46.2 dBm');
  await expect(page.getByTestId('wireless-loss')).toHaveText('Loss: 0%');
});

test('the wireless radio-model note is in Japanese for a Japanese learner', async ({
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

  const note = page.getByTestId(NOTE);
  await expect(note).toContainText('距離が 10 倍になるごとに 20 dB 弱く');
  await expect(note).toContainText('−65 dBm までは 0%');
  await expect(note).toContainText('−90 dBm で 100%');
  await expect(note).toContainText('このレッスンだけの単純化');
  await expect(note).toContainText('−66 dBm は十分に強い電波');
});
