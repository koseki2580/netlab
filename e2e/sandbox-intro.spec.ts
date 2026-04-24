import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';

test('sandbox intro guides the learner through the MTU flow', async ({ page }) => {
  await page.goto(
    '/?sandbox=1&sandboxTab=node&intro=sandbox-intro-mtu#/networking/mtu-fragmentation',
  );
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="sandbox-intro-overlay"]')).toBeVisible();

  const introA11y = await new AxeBuilder({ page })
    .include('[data-testid="sandbox-intro-overlay"]')
    .analyze();
  expect(introA11y.violations).toEqual([]);

  await page.getByRole('button', { name: 'Start Intro' }).click();
  await expect(page.locator('[data-testid="sandbox-intro-step-panel"]')).toHaveAttribute(
    'data-intro-status',
    'active',
  );

  await page.getByRole('tab', { name: 'Node' }).click();

  await page.locator('.react-flow__node').filter({ hasText: 'R1' }).first().click({
    button: 'right',
    force: true,
  });
  await page.getByLabel('MTU bytes').fill('500');
  await page.getByRole('button', { name: 'Apply MTU' }).click();

  await page.getByRole('tab', { name: 'Traffic' }).click();
  await page.getByRole('button', { name: 'Launch traffic' }).click();

  await page.getByRole('button', { name: 'Switch sandbox mode' }).click();
  await expect(page.locator('.react-flow')).toHaveCount(2);

  await page.getByRole('button', { name: 'Switch sandbox mode' }).click();
  await expect(page.locator('.react-flow')).toHaveCount(1);
  await expect(page.locator('[data-testid="sandbox-intro-overlay"]')).toHaveCount(0);
});
