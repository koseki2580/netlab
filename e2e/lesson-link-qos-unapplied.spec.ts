import { expect, test } from './fixtures/harness';

/**
 * TC-309, TC-310, TC-311 — the Per-Link QoS lesson shows which settings are
 * not on the link yet, and which settings a result was measured with.
 *
 * A field takes effect only once its apply button is pressed. A learner who
 * edited a field and sent a packet read a result for the old settings with
 * nothing on screen to say so.
 */
const QOS = {
  burst: 'link-qos-burst',
  burstResult: 'link-qos-burst-result',
  breakdown: 'link-qos-burst-breakdown',
  settings: 'link-qos-burst-settings',
  bandwidth: 'link-qos-bandwidth',
  loss: 'link-qos-loss',
  apply: 'link-qos-apply',
  unapplied: 'link-qos-unapplied',
  classWeight: (index: number) => `link-qos-class-${index}-weight`,
  applyClasses: 'link-qos-apply-classes',
  classesUnapplied: 'link-qos-classes-unapplied',
} as const;

test('the link QoS lesson marks unapplied settings and names the ones it measured with', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/link-qos');
  await expect(page.getByTestId(QOS.unapplied)).toHaveCount(0);
  await expect(page.getByTestId(QOS.classesUnapplied)).toHaveCount(0);

  // Edited but not applied: the result is still the old link's, and says so.
  await page.getByTestId(QOS.loss).fill('0');
  await page.getByTestId(QOS.bandwidth).fill('400000');
  await expect(page.getByTestId(QOS.unapplied)).toHaveText(
    'Not applied yet: the link still has the earlier settings.',
  );
  await expect(page.getByTestId(QOS.unapplied)).toHaveAttribute('role', 'status');
  await page.getByTestId(QOS.burst).click();
  await expect(page.getByTestId(QOS.breakdown)).toHaveText(
    'sending 12 ms + propagation 20 ms = 32 ms',
  );
  await expect(page.getByTestId(QOS.settings)).toHaveText(
    'Measured at 1,000,000 bps, 20 ms delay, 5% loss.',
  );
  await expect(page.getByTestId(QOS.unapplied)).toBeVisible();

  // Applied: the marker goes, and the next result names the new settings.
  await page.getByTestId(QOS.apply).click();
  await expect(page.getByTestId(QOS.unapplied)).toHaveCount(0);
  await expect(page.getByTestId(QOS.bandwidth)).toHaveValue('400000');
  await page.getByTestId(QOS.burst).click();
  await expect(page.getByTestId(QOS.burstResult)).toHaveText(
    'Delivered — 50 ms to cross the link.',
  );
  await expect(page.getByTestId(QOS.breakdown)).toHaveText(
    'sending 30 ms + propagation 20 ms = 50 ms',
  );
  await expect(page.getByTestId(QOS.settings)).toHaveText(
    'Measured at 400,000 bps, 20 ms delay, 0% loss.',
  );

  // The classes have their own apply button and their own marker.
  await page.getByTestId(QOS.classWeight(0)).fill('70');
  await page.getByTestId(QOS.classWeight(1)).fill('30');
  await expect(page.getByTestId(QOS.classesUnapplied)).toHaveText(
    'Not applied yet: the link still has the earlier classes.',
  );
  await expect(page.getByTestId(QOS.unapplied)).toHaveCount(0);
  await page.getByTestId(QOS.applyClasses).click();
  await expect(page.getByTestId(QOS.classesUnapplied)).toHaveCount(0);
  await expect(page.getByTestId(QOS.classWeight(0))).toHaveValue('70');

  // Sending straight after applying the classes still reports a result.
  await page.getByTestId(QOS.burst).click();
  await expect(page.getByTestId(QOS.breakdown)).toHaveText(
    'sending 30 ms + propagation 20 ms = 50 ms',
  );
});

test('the link QoS markers are in Japanese for a Japanese learner', async ({ page, demoPage }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* the lesson still renders; the Japanese text below would then fail */
    }
  });
  await demoPage.goto('/networking/link-qos');

  await page.getByTestId(QOS.loss).fill('0');
  await page.getByTestId(QOS.bandwidth).fill('400000');
  await expect(page.getByTestId(QOS.unapplied)).toHaveText(
    '未適用: リンクはまだ前の設定のままです。',
  );
  await page.getByTestId(QOS.apply).click();
  await expect(page.getByTestId(QOS.unapplied)).toHaveCount(0);
  await page.getByTestId(QOS.burst).click();
  await expect(page.getByTestId(QOS.breakdown)).toHaveText('送り出し 30 ms ＋ 伝搬 20 ms ＝ 50 ms');
  await expect(page.getByTestId(QOS.settings)).toHaveText(
    '測定時の設定: 帯域 400,000 bps、伝搬遅延 20 ms、損失率 0%',
  );

  await page.getByTestId(QOS.classWeight(0)).fill('70');
  await expect(page.getByTestId(QOS.classesUnapplied)).toHaveText(
    '未適用: リンクはまだ前のクラスのままです。',
  );
});
