import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { excludingCanvasInternals } from './axe';
import { SEL } from './selectors';

test('DSCP demo records shaper annotations', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/dscp');

  await page.getByTestId(SEL.demo.dscpSend).click();

  const traceLog = page.getByTestId(SEL.demo.traceLog).first();
  await expect(traceLog).toContainText('shaper:classified be dscp 0');
  await expect(traceLog).toContainText('shaper:classified ef dscp 46');
  await expect(traceLog).toContainText('dequeued ef');

  const results = await excludingCanvasInternals(new AxeBuilder({ page }))
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
