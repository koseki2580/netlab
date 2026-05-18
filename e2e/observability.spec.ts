import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('observability demo records NetFlow and sFlow annotations', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/observability');

  await page.getByTestId(SEL.demo.observabilityFlow).click();

  const traceLog = page.getByTestId(SEL.demo.traceLog).first();
  await expect(traceLog).toContainText('netflow:flow-update');
  await page.getByTestId(SEL.demo.observabilitySflow).click();
  await expect(traceLog).toContainText('sflow:sampled');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);
});
