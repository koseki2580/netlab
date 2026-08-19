import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('observability demo records NetFlow and sFlow annotations', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/observability');

  await page.getByTestId(SEL.demo.observabilityFlow).click();

  const traceLog = page.getByTestId(SEL.demo.traceLog).first();
  // The timeline narrates for a learner rather than printing event kinds, so
  // assert what is actually on screen: a flow record with counters, and a
  // numbered sample.
  await expect(traceLog).toContainText('netflow update');
  await expect(traceLog).toContainText('packets');
  await page.getByTestId(SEL.demo.observabilitySflow).click();
  await expect(traceLog).toContainText('sflow sample #');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);
});
