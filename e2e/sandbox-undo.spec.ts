import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';

async function applyMtuEdit(page: Page, value: string) {
  await page.locator('.react-flow__node').filter({ hasText: 'R1' }).first().click({
    button: 'right',
    force: true,
  });
  await page.getByLabel('MTU bytes').fill(value);
  await page.getByRole('button', { name: 'Apply MTU' }).click();
}

test('sandbox undo, redo, per-entry revert, and reset all', async ({ page }) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();

  await applyMtuEdit(page, '500');
  await page.getByRole('tab', { name: /Edits \(1\)/ }).click();
  await expect(page.locator('[role="tabpanel"]')).toContainText('interface.mtu');
  await expect.poll(() => page.url()).toContain('sandboxState=');

  await page.keyboard.press('Control+Z');
  await expect(page.getByRole('tab', { name: /Edits \(0\)/ })).toBeVisible();
  await expect(page.locator('[data-testid="edit-list-item"]').first()).toContainText('Redo');
  await expect.poll(() => page.url()).not.toContain('sandboxState=');

  await page.keyboard.press('Control+Shift+Z');
  await expect(page.getByRole('tab', { name: /Edits \(1\)/ })).toBeVisible();
  await expect.poll(() => page.url()).toContain('sandboxState=');

  await page.getByRole('tab', { name: 'Node' }).click();
  await applyMtuEdit(page, '600');
  await page.getByRole('tab', { name: /Edits \(2\)/ }).click();
  await page.getByRole('button', { name: 'Revert edit 2' }).click();
  await expect(page.getByRole('tab', { name: /Edits \(1\)/ })).toBeVisible();
  await expect(page.locator('[data-testid="edit-list-item"]')).toHaveCount(1);

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe('This removes all 1 edits.');
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Reset all edits' }).click();
  await expect(page.getByRole('tab', { name: /Edits \(0\)/ })).toBeVisible();
  await expect(page.locator('[role="tabpanel"]')).toContainText('No edits yet');
  await expect.poll(() => page.url()).not.toContain('sandboxState=');

  const results = await new AxeBuilder({ page }).include('[data-testid="sandbox-panel"]').analyze();
  expect(results.violations).toEqual([]);
});
