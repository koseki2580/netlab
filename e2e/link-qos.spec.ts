import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { excludingCanvasInternals } from './axe';
import { SEL } from './selectors';

test('link QoS demo records deterministic link annotations', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/link-qos');

  await page.getByTestId(SEL.demo.linkQosBurst).click();

  const traceLog = page.getByTestId(SEL.demo.traceLog).first();
  await expect(traceLog).toContainText('enqueued q=1');
  await expect(traceLog).toContainText('dequeued q=0');
  await expect(traceLog).toContainText('arrived 32ms');

  await page.getByTestId(SEL.sandbox.editPopover.lossPercent).fill('50');
  await page.getByTestId(SEL.sandbox.editPopover.linkApply).click();
  await page.getByTestId(SEL.demo.linkQosBurst).click();

  await expect(page.getByTestId(SEL.demo.linkQosSection)).toContainText('LINK QOS');

  const results = await excludingCanvasInternals(new AxeBuilder({ page }))
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
