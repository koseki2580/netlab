import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';
import { SandboxPage } from './pages/SandboxPage';

async function openSandboxMtu(page: Page, sandboxPage: SandboxPage) {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await sandboxPage.expectMounted();
}

test('narration region is present with aria-live=polite', async ({ page, sandboxPage }) => {
  await openSandboxMtu(page, sandboxPage);

  const region = sandboxPage.narrationRegion();
  await expect(region).toHaveAttribute('aria-live', 'polite');
});

test('narration region announces MTU edit within 1 second', async ({ page, sandboxPage }) => {
  await openSandboxMtu(page, sandboxPage);

  await sandboxPage.applyMtuEdit('R1', '500');

  await expect
    .poll(async () => await sandboxPage.narrationRegion().textContent(), { timeout: 1500 })
    .toContain('MTU set to 500');
});

test('narration region announces compare mode change', async ({ page, sandboxPage }) => {
  await openSandboxMtu(page, sandboxPage);

  await sandboxPage.toggleMode();

  await expect
    .poll(async () => await sandboxPage.narrationRegion().textContent(), { timeout: 1500 })
    .toContain('Compare mode enabled');
});

test('narration region announces reset-all', async ({ page, sandboxPage }) => {
  await openSandboxMtu(page, sandboxPage);

  await sandboxPage.applyMtuEdit('R1', '500');

  await sandboxPage.clickTab('edits');
  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });
  await sandboxPage.resetAllEdits();

  await expect
    .poll(async () => await sandboxPage.narrationRegion().textContent(), { timeout: 1500 })
    .toContain('All edits reset');
});

test('narration region announces undo and redo', async ({ page, sandboxPage }) => {
  await openSandboxMtu(page, sandboxPage);

  await sandboxPage.applyMtuEdit('R1', '500');

  await page.keyboard.press('Control+Z');

  await expect
    .poll(async () => await sandboxPage.narrationRegion().textContent(), { timeout: 1500 })
    .toContain('Undone');

  await page.keyboard.press('Control+Shift+Z');

  await expect
    .poll(async () => await sandboxPage.narrationRegion().textContent(), { timeout: 1500 })
    .toContain('Redone');
});
