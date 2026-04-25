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

test('sandbox session export and import preserves an MTU edit', async ({ page }, testInfo) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();

  await applyMtuEdit(page, '500');
  await expect(page.getByRole('tab', { name: /Edits \(1\)/ })).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export sandbox session' }).click();
  const download = await downloadPromise;
  const sessionPath = testInfo.outputPath('sandbox-session.json');
  await download.saveAs(sessionPath);

  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.getByRole('tab', { name: /Edits \(0\)/ })).toBeVisible();

  await page.locator('input[aria-label="Import sandbox session file"]').setInputFiles(sessionPath);
  await expect(page.locator('[aria-label="Sandbox session import preview"]')).toContainText(
    'Import 1 edit from scenario fragmented-echo',
  );
  await page.getByRole('button', { name: 'Apply imported sandbox session' }).click();

  await page.getByRole('tab', { name: /Edits \(1\)/ }).click();
  await expect(page.locator('[data-testid="edit-list-item"]')).toContainText('interface.mtu');
  await expect(page.locator('[data-testid="edit-list-item"]')).toContainText('1500 -> 500');
});
