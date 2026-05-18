import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

interface NetlabTraceWindow extends Window {
  __NETLAB_TRACE__?: {
    lastStatus: string | null;
  };
}

test('real worker path keeps step simulation responsive enough for user input', async ({
  demoPage,
  page,
}) => {
  await demoPage.goto('/simulation/step');
  await demoPage.waitForTraceCount(1);

  const before = await page.evaluate(() => performance.now());
  await page.getByTestId(SEL.demo.primaryAction).first().click();
  await expect
    .poll(() =>
      page.evaluate(() => (window as NetlabTraceWindow).__NETLAB_TRACE__?.lastStatus ?? null),
    )
    .toMatch(/paused|done/);
  const elapsed = await page.evaluate((start) => performance.now() - start, before);

  expect(elapsed).toBeLessThan(1000);
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
});
