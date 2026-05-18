import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('DSCP demo records shaper annotations', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/dscp');

  await page.getByTestId(SEL.demo.dscpSend).click();

  const traceLog = page.getByTestId(SEL.demo.traceLog).first();
  await expect(traceLog).toContainText('shaper:classified be dscp 0');
  await expect(traceLog).toContainText('shaper:classified ef dscp 46');
  await expect(traceLog).toContainText('dequeued ef');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);
});
