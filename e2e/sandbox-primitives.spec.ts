import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
test('sandbox primitives mount, switch mode, and pass axe checks', async ({ page }) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();

  await expect(page.getByRole('tab', { name: 'Packet' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Node' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Parameters' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Traffic' })).toBeVisible();
  await expect(page.locator('[role="tabpanel"]')).toContainText(
    'Right-click a node or link on the canvas',
  );

  await page.locator('.react-flow__node').filter({ hasText: 'R1' }).first().click({
    button: 'right',
    force: true,
  });
  await page.getByLabel('MTU bytes').fill('500');
  await page.getByRole('button', { name: 'Apply MTU' }).click();
  await expect.poll(() => page.url()).toContain('sandboxState=');

  await page.reload();
  await expect(page.locator('[role="tabpanel"]')).toContainText('Interface MTU');
  await expect(page.locator('[role="tabpanel"]')).toContainText('1');
  await page.getByRole('tab', { name: 'Parameters' }).click();
  await expect(page.locator('[role="tabpanel"]')).toContainText('TCP initial window');

  await expect(page.locator('.react-flow')).toHaveCount(1);
  await page.getByRole('button', { name: 'Switch sandbox mode' }).click();
  await expect(page.getByRole('button', { name: 'Switch sandbox mode' })).toContainText('Compare');
  await expect(page.locator('.react-flow')).toHaveCount(2);
  await page.getByRole('button', { name: 'Switch sandbox mode' }).click();
  await expect(page.getByRole('button', { name: 'Switch sandbox mode' })).toContainText('Live');
  await expect(page.locator('.react-flow')).toHaveCount(1);

  const results = await new AxeBuilder({ page }).include('[data-testid="sandbox-panel"]').analyze();
  expect(results.violations).toEqual([]);
});
