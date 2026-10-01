import { expect, test } from './fixtures/harness';

/**
 * TC-261 — the Per-Link QoS result shows what its total is made of.
 *
 * The result read only "32 ms to cross the link"; the learner had to derive
 * the 12 ms of sending (12,000 bits at 1,000,000 bps) and the 20 ms of
 * propagation from the input fields.
 */
const QOS = {
  burst: 'link-qos-burst',
  burstResult: 'link-qos-burst-result',
  breakdown: 'link-qos-burst-breakdown',
} as const;

test('the link QoS result splits its total into sending and propagation', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/link-qos');

  await page.getByTestId(QOS.burst).click();
  await expect(page.getByTestId(QOS.burstResult)).toHaveText(
    'Delivered — 32 ms to cross the link.',
  );
  await expect(page.getByTestId(QOS.breakdown)).toHaveText(
    'sending 12 ms + propagation 20 ms = 32 ms',
  );
});

test('the link QoS breakdown is in Japanese for a Japanese learner', async ({ page, demoPage }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* the lesson still renders; the Japanese text below would then fail */
    }
  });
  await demoPage.goto('/networking/link-qos');

  await page.getByTestId(QOS.burst).click();
  await expect(page.getByTestId(QOS.breakdown)).toHaveText('送り出し 12 ms ＋ 伝搬 20 ms ＝ 32 ms');
});
