import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';

async function openSandboxMtu(page: Page) {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();
}

async function applyMtuEdit(page: Page, value: string) {
  await page.locator('.react-flow__node').filter({ hasText: 'R1' }).first().click({
    button: 'right',
    force: true,
  });
  await page.getByLabel('MTU bytes').fill(value);
  await page.getByRole('button', { name: 'Apply MTU' }).click();
}

test('? key opens the shortcuts help modal', async ({ page }) => {
  await openSandboxMtu(page);

  await page.keyboard.press('?');
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Key');
  await expect(dialog).toContainText('Action');
});

test('shortcuts help modal lists built-in shortcuts', async ({ page }) => {
  await openSandboxMtu(page);

  await page.keyboard.press('?');
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Escape');
  await expect(dialog).toContainText('Cmd+Z');
});

test('Escape closes the shortcuts help modal', async ({ page }) => {
  await openSandboxMtu(page);

  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveCount(0);
});

test('? button in sandbox panel header opens the shortcuts modal', async ({ page }) => {
  await openSandboxMtu(page);

  await page.getByLabel('Show keyboard shortcuts').click();
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();
});

test('shortcuts help modal is axe-core accessible', async ({ page }) => {
  await openSandboxMtu(page);

  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toBeVisible();

  const results = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
  expect(results.violations).toEqual([]);
});

test('Shift+S keyboard shortcut toggles sandbox panel visibility', async ({ page }) => {
  await openSandboxMtu(page);

  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();
  await page.keyboard.press('Shift+S');
  await expect(page.locator('[data-testid="sandbox-panel"]')).toHaveCount(0);
  await page.keyboard.press('Shift+S');
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();
});

test('Shift+C toggles sandbox into compare mode', async ({ page }) => {
  await openSandboxMtu(page);

  await expect(page.locator('.react-flow')).toHaveCount(1);
  await page.keyboard.press('Shift+C');
  await expect(page.locator('.react-flow')).toHaveCount(2);
  await page.keyboard.press('Shift+C');
  await expect(page.locator('.react-flow')).toHaveCount(1);
});

test('keyboard-only complete an edit flow (Cmd+Z to undo)', async ({ page }) => {
  await openSandboxMtu(page);

  await applyMtuEdit(page, '500');
  await expect(page.getByRole('tab', { name: /Edits \(1\)/ })).toBeVisible();

  await page.keyboard.press('Control+Z');
  await expect(page.getByRole('tab', { name: /Edits \(0\)/ })).toBeVisible();

  await page.keyboard.press('Control+Shift+Z');
  await expect(page.getByRole('tab', { name: /Edits \(1\)/ })).toBeVisible();
});
