import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';

async function openSandboxMtu(page: Page) {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();
}

function narrationRegion(page: Page) {
  return page.locator('[data-testid="sandbox-narration-region"]');
}

test('narration region is present with aria-live=polite', async ({ page }) => {
  await openSandboxMtu(page);

  const region = narrationRegion(page);
  await expect(region).toHaveAttribute('aria-live', 'polite');
});

test('narration region announces MTU edit within 1 second', async ({ page }) => {
  await openSandboxMtu(page);

  await page.locator('.react-flow__node').filter({ hasText: 'R1' }).first().click({
    button: 'right',
    force: true,
  });
  await page.getByLabel('MTU bytes').fill('500');
  await page.getByRole('button', { name: 'Apply MTU' }).click();

  await expect
    .poll(async () => await narrationRegion(page).textContent(), { timeout: 1500 })
    .toContain('MTU set to 500');
});

test('narration region announces compare mode change', async ({ page }) => {
  await openSandboxMtu(page);

  await page.getByRole('button', { name: 'Switch sandbox mode' }).click();

  await expect
    .poll(async () => await narrationRegion(page).textContent(), { timeout: 1500 })
    .toContain('Compare mode enabled');
});

test('narration region announces reset-all', async ({ page }) => {
  await openSandboxMtu(page);

  await page.locator('.react-flow__node').filter({ hasText: 'R1' }).first().click({
    button: 'right',
    force: true,
  });
  await page.getByLabel('MTU bytes').fill('500');
  await page.getByRole('button', { name: 'Apply MTU' }).click();

  await page.getByRole('tab', { name: /Edits/ }).click();
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Reset all edits' }).click();

  await expect
    .poll(async () => await narrationRegion(page).textContent(), { timeout: 1500 })
    .toContain('All edits reset');
});

test('narration region announces undo and redo', async ({ page }) => {
  await openSandboxMtu(page);

  await page.locator('.react-flow__node').filter({ hasText: 'R1' }).first().click({
    button: 'right',
    force: true,
  });
  await page.getByLabel('MTU bytes').fill('500');
  await page.getByRole('button', { name: 'Apply MTU' }).click();

  await page.keyboard.press('Control+Z');

  await expect
    .poll(async () => await narrationRegion(page).textContent(), { timeout: 1500 })
    .toContain('Undone');

  await page.keyboard.press('Control+Shift+Z');

  await expect
    .poll(async () => await narrationRegion(page).textContent(), { timeout: 1500 })
    .toContain('Redone');
});
