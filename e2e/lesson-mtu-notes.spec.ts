import { expect, test } from './fixtures/harness';

/**
 * TC-222, TC-223 — the MTU lesson's slider and notes say what they show.
 *
 * The slider moves in 8-byte steps from 300, so it cannot hold the 600 its
 * label claimed: it opened at 604 while the label read 600. The notes called
 * the fragment count 「分割が起きたホップ」, and said 「再組み立て: 未完了」 — a
 * failure — when there was nothing to reassemble.
 */
test('the MTU slider opens at the value its label shows, and the notes count fragments', async ({
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
  await demoPage.goto('/networking/mtu-fragmentation');

  const slider = page.getByTestId('mtu-tunnel-slider');
  // TC-222
  await expect(slider).toHaveValue('604');
  await expect(page.getByTestId('mtu-tunnel-value')).toHaveText('トンネル MTU: 604 バイト');

  // TC-223
  const notes = page.getByTestId('mtu-trace-notes');
  await page.getByTestId('demo-primary-action').click();
  await expect(notes).toContainText('断片の数: 3');
  await expect(notes).toContainText('再組み立て: 完了 (断片 3 個)');
  await expect(notes).not.toContainText('分割が起きたホップ');

  await slider.fill('1228');
  await expect(page.getByTestId('mtu-tunnel-value')).toHaveText('トンネル MTU: 1228 バイト');
  await page.getByTestId('demo-primary-action').click();
  await expect(notes).toContainText('断片の数: 0');
  await expect(notes).toContainText('再組み立て: 不要');
  await expect(notes).not.toContainText('未完了');
});
