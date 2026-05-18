import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('sandbox intro guides the learner through the MTU flow', async ({ page, sandboxPage }) => {
  await page.goto(
    '/?sandbox=1&sandboxTab=node&intro=sandbox-intro-mtu#/networking/mtu-fragmentation',
  );
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(sandboxPage.introOverlay()).toBeVisible();

  const introA11y = await new AxeBuilder({ page })
    .include(`[data-testid="${SEL.sandbox.introOverlay}"]`)
    .analyze();
  expect(introA11y.violations).toEqual([]);

  await sandboxPage.startIntro();
  await expect(sandboxPage.introStepPanel()).toHaveAttribute('data-intro-status', 'active');

  await sandboxPage.clickTab('node');
  await sandboxPage.applyMtuEdit('R1', '500');

  await sandboxPage.clickTab('traffic');
  await sandboxPage.launchTraffic();

  await sandboxPage.toggleMode();
  await expect(page.locator('.react-flow')).toHaveCount(2);

  await sandboxPage.toggleMode();
  await expect(page.locator('.react-flow')).toHaveCount(1);
  await expect(sandboxPage.introOverlay()).toHaveCount(0);
});
