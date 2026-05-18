import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('ECMP demo hashes flows across equal-cost next hops', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/ecmp');

  await page.getByTestId(SEL.demo.ecmpSend).click();

  const traceLog = page.getByTestId(SEL.demo.traceLog).first();
  await expect(traceLog).toContainText('bucket');
  await expect(traceLog).toContainText('via 10.0.12.2');
  await expect(traceLog).toContainText('via 10.0.13.2');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);
});
