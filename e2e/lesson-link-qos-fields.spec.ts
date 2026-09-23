import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/** Lesson-local test ids; the shared selector file belongs to another change. */
const QOS = {
  burst: 'link-qos-burst',
  burstResult: 'link-qos-burst-result',
  loss: 'link-qos-loss',
  lossValue: 'link-qos-loss-value',
  apply: 'link-qos-apply',
  classWeight: (index: number) => `link-qos-class-${index}-weight`,
  applyClasses: 'link-qos-apply-classes',
} as const;

/**
 * The link QoS lesson reports what happened to the packet right under the
 * button, shows the loss slider's value, and edits classes through labelled
 * fields that refuse a set of weights that does not add up.
 */
test('the link QoS lesson answers its button and labels its settings', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/networking/link-qos');
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await page.getByTestId(QOS.burst).click();
  await expect(page.getByTestId(QOS.burstResult)).toHaveText(
    'Delivered — 32 ms to cross the link.',
  );

  await expect(page.getByTestId(QOS.lossValue)).toHaveText('5%');
  await page.getByTestId(QOS.loss).fill('20');
  await expect(page.getByTestId(QOS.lossValue)).toHaveText('20%');

  await page.getByTestId(QOS.classWeight(0)).fill('70');
  await expect(page.getByTestId(QOS.applyClasses)).toBeDisabled();
  await page.getByTestId(QOS.classWeight(0)).fill('80');
  await expect(page.getByTestId(QOS.applyClasses)).toBeEnabled();
});
