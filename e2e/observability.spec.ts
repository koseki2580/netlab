import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { excludingCanvasInternals } from './axe';
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

  const results = await excludingCanvasInternals(new AxeBuilder({ page }))
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});

// TC-242: the router's flow cache keeps counting the same flow across sends.
test('observability demo accumulates the NetFlow record across sends', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/observability');
  const traceLog = page.getByTestId(SEL.demo.traceLog).first();

  await page.getByTestId(SEL.demo.observabilityFlow).click();
  await expect(traceLog).toContainText('netflow update 1 packets 37 bytes');

  await page.getByTestId(SEL.demo.observabilityFlow).click();
  await expect(traceLog).toContainText('netflow update 2 packets 74 bytes');
});
