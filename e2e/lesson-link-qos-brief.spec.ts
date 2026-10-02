import { expect, test } from './fixtures/harness';

/**
 * TC-290 — the Per-Link QoS lesson says what its numbers mean.
 *
 * The page had only field labels: a learner had to infer the 1500-byte packet
 * from "12 ms at 1 Mbps", and could change a field without knowing it does
 * nothing until it is applied.
 */
const QOS = {
  brief: 'lesson-brief',
  burst: 'link-qos-burst',
  breakdown: 'link-qos-burst-breakdown',
  bandwidth: 'link-qos-bandwidth',
  loss: 'link-qos-loss',
  apply: 'link-qos-apply',
} as const;

test('the link QoS brief gives the formula the readings follow', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/link-qos');

  const brief = page.getByTestId(QOS.brief);
  await expect(brief).toContainText('the time to send its bits onto the wire (serialisation)');
  await expect(brief).toContainText('Sending time = packet size × 8 ÷ bandwidth');
  await expect(brief).toContainText('12,000 bits ÷ 1,000,000 bps = 12 ms');
  await expect(brief).toContainText('only after you press “Apply to the link”');
  await expect(brief).toContainText('IP packet only');
  await expect(brief).toContainText('A packet with no competition is not slowed by a low weight');

  // The readings are the ones the formula gives: 12,000 bits at 1 Mbps, then
  // at 400 kbps once the new bandwidth has been applied.
  await page.getByTestId(QOS.burst).click();
  await expect(page.getByTestId(QOS.breakdown)).toHaveText(
    'sending 12 ms + propagation 20 ms = 32 ms',
  );
  await page.getByTestId(QOS.loss).fill('0');
  await page.getByTestId(QOS.bandwidth).fill('400000');
  await page.getByTestId(QOS.apply).click();
  await page.getByTestId(QOS.burst).click();
  await expect(page.getByTestId(QOS.breakdown)).toHaveText(
    'sending 30 ms + propagation 20 ms = 50 ms',
  );
});

test('the link QoS brief is in Japanese for a Japanese learner', async ({ page, demoPage }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* the lesson still renders; the Japanese text below would then fail */
    }
  });
  await demoPage.goto('/networking/link-qos');

  const brief = page.getByTestId(QOS.brief);
  await expect(brief).toContainText('送り出し時間 ＝ パケットサイズ × 8 ÷ 帯域');
  await expect(brief).toContainText('12,000 ビット ÷ 1,000,000 bps ＝ 12 ms');
  await expect(brief).toContainText('「リンクに適用」を押して初めて');
  await expect(brief).toContainText('IP パケットだけ');
  await expect(brief).toContainText('重みが小さくても遅くなりません');
});
