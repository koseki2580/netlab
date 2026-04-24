import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';

test('sandbox popovers and compare flow remain accessible', async ({ page }) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();

  const routedNode = page.locator('.react-flow__node').filter({ hasText: 'R1' }).first();
  await routedNode.click({ button: 'right', force: true });

  const popover = page.getByRole('dialog');
  await expect(popover).toBeVisible();
  await expect(popover).toContainText('Edit in sandbox');

  const popoverA11y = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(popoverA11y.violations).toEqual([]);

  await page.getByLabel('MTU bytes').fill('500');
  await page.getByRole('button', { name: 'Apply MTU' }).click();
  await expect(popover).toHaveCount(0);

  await page.getByRole('button', { name: 'Switch sandbox mode' }).click();
  await expect(page.locator('.react-flow')).toHaveCount(2);

  const compareA11y = await new AxeBuilder({ page })
    .include('[data-testid="sandbox-panel"]')
    .analyze();
  expect(compareA11y.violations).toEqual([]);

  await page.getByRole('button', { name: 'Switch sandbox mode' }).click();
  await expect(page.locator('.react-flow')).toHaveCount(1);
});
