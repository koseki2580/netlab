import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';

test('arp tutorial completes through the guided happy path', async ({ page }) => {
  await page.goto('/?tutorial=arp-basics#/networking/arp');

  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="tutorial-overlay"]')).toBeVisible();
  await expect(page.locator('[data-testid="tutorial-step-panel"]')).toHaveAttribute(
    'data-tutorial-status',
    'pending',
  );

  const overlayA11y = await new AxeBuilder({ page })
    .include('[data-testid="tutorial-overlay"]')
    .analyze();

  expect(overlayA11y.violations).toEqual([]);

  await page.getByRole('button', { name: 'Start Tutorial' }).click();
  await expect(page.locator('[data-testid="tutorial-step-panel"]')).toHaveAttribute(
    'data-tutorial-status',
    'active',
  );

  await page.getByRole('button', { name: /ping client/i }).click();

  await expect(page.locator('[data-testid="tutorial-step-panel"]')).toHaveAttribute(
    'data-tutorial-status',
    'passed',
    { timeout: 15_000 },
  );
  await expect(page.locator('[data-testid="tutorial-step-panel"]')).toContainText(
    'All 3 steps passed',
  );
});
