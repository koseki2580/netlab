import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('arp tutorial completes through the guided happy path', async ({ page }) => {
  await page.goto('/?tutorial=arp-basics#/networking/arp');

  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.tutorial.overlay)).toBeVisible();
  await expect(page.getByTestId(SEL.tutorial.stepPanel)).toHaveAttribute(
    'data-tutorial-status',
    'pending',
  );

  const overlayA11y = await new AxeBuilder({ page })
    .include(`[data-testid="${SEL.tutorial.overlay}"]`)
    .analyze();

  expect(overlayA11y.violations).toEqual([]);

  await page.getByTestId(SEL.tutorial.start).click();
  await expect(page.getByTestId(SEL.tutorial.stepPanel)).toHaveAttribute(
    'data-tutorial-status',
    'active',
  );

  await page.getByTestId(SEL.demo.primaryAction).click();

  await expect(page.getByTestId(SEL.tutorial.stepPanel)).toHaveAttribute(
    'data-tutorial-status',
    'passed',
    { timeout: 15_000 },
  );
  await expect(page.getByTestId(SEL.tutorial.stepPanel)).toContainText('All 3 steps passed');
});
