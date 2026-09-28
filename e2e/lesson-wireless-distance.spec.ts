import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-224, TC-225 — the wireless lesson shows the distance it models, and its
 * association state in the learner's language.
 *
 * The distance slider had no value, tick or unit, so 200 m could not be set
 * on purpose; the state read 「状態: connected」.
 */
test('the wireless distance can be set to 200 m exactly and the state is localized', async ({
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
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/networking/wireless');

  // TC-224
  const readout = page.getByTestId('wireless-distance-value');
  await expect(readout).toHaveText('距離: 20 m');
  const rssiBefore = await page.getByTestId('wireless-rssi').textContent();
  await page.getByTestId('wireless-distance-input').fill('200');
  await expect(readout).toHaveText('距離: 200 m');
  await expect(page.getByTestId(SEL.demo.stationDistance)).toHaveValue('200');
  await expect(page.getByTestId('wireless-rssi')).not.toHaveText(rssiBefore ?? '');

  // Keyboard steps move the slider by one metre.
  await page.getByTestId(SEL.demo.stationDistance).focus();
  await page.keyboard.press('ArrowRight');
  await expect(readout).toHaveText('距離: 201 m');

  // TC-225
  await expect(page.getByTestId(SEL.demo.wirelessAssociation)).toHaveText('状態: 接続済み');
});
