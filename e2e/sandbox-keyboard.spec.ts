import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';
import { SandboxPage } from './pages/SandboxPage';
import { SEL } from './selectors';

async function openSandboxMtu(page: Page, sandboxPage: SandboxPage) {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await sandboxPage.expectMounted();
}

test('? key opens the shortcuts help modal', async ({ page, sandboxPage }) => {
  await openSandboxMtu(page, sandboxPage);

  await page.keyboard.press('?');
  const dialog = sandboxPage.shortcutsDialog();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Key');
  await expect(dialog).toContainText('Action');
});

test('shortcuts help modal lists built-in shortcuts', async ({ page, sandboxPage }) => {
  await openSandboxMtu(page, sandboxPage);

  await page.keyboard.press('?');
  const dialog = sandboxPage.shortcutsDialog();
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('Escape');
  await expect(dialog).toContainText('Cmd+Z');
});

test('Escape closes the shortcuts help modal', async ({ page, sandboxPage }) => {
  await openSandboxMtu(page, sandboxPage);

  await page.keyboard.press('?');
  await expect(sandboxPage.shortcutsDialog()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sandboxPage.shortcutsDialog()).toHaveCount(0);
});

test('? button in sandbox panel header opens the shortcuts modal', async ({
  page,
  sandboxPage,
}) => {
  await openSandboxMtu(page, sandboxPage);

  await sandboxPage.shortcutsHelpBtn().click();
  await expect(sandboxPage.shortcutsDialog()).toBeVisible();
});

test('shortcuts help modal is axe-core accessible', async ({ page, sandboxPage }) => {
  await openSandboxMtu(page, sandboxPage);

  await page.keyboard.press('?');
  await expect(sandboxPage.shortcutsDialog()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .include(`[data-testid="${SEL.sandbox.shortcutsDialog}"]`)
    .analyze();
  expect(results.violations).toEqual([]);
});

test('Shift+S keyboard shortcut toggles sandbox panel visibility', async ({
  page,
  sandboxPage,
}) => {
  await openSandboxMtu(page, sandboxPage);

  await expect(sandboxPage.panel()).toBeVisible();
  await page.keyboard.press('Shift+S');
  await expect(sandboxPage.panel()).toHaveCount(0);
  await page.keyboard.press('Shift+S');
  await expect(sandboxPage.panel()).toBeVisible();
});

test('Shift+C toggles sandbox into compare mode', async ({ page, sandboxPage }) => {
  await openSandboxMtu(page, sandboxPage);

  await expect(page.locator('.react-flow')).toHaveCount(1);
  await page.keyboard.press('Shift+C');
  await expect(page.locator('.react-flow')).toHaveCount(2);
  await page.keyboard.press('Shift+C');
  await expect(page.locator('.react-flow')).toHaveCount(1);
});

test('keyboard-only complete an edit flow (Cmd+Z to undo)', async ({ page, sandboxPage }) => {
  await openSandboxMtu(page, sandboxPage);

  await sandboxPage.applyMtuEdit('R1', '500');
  await sandboxPage.expectEditsCount(1);

  await page.keyboard.press('Control+Z');
  await sandboxPage.expectEditsCount(0);

  await page.keyboard.press('Control+Shift+Z');
  await sandboxPage.expectEditsCount(1);
});
