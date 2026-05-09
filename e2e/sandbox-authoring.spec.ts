import { readFile } from 'node:fs/promises';
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

test('sandbox authoring exports edited state as scenario TypeScript', async ({
  page,
}, testInfo) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();

  await applyMtuEdit(page, '500');
  await page.getByRole('tab', { name: 'Parameters' }).click();
  await page.getByLabel('Max TTL').fill('32');
  await page.getByRole('tab', { name: 'Traffic' }).click();
  await page.getByRole('button', { name: 'Launch traffic' }).click();
  await expect(page.getByRole('tab', { name: /Edits \(3\)/ })).toBeVisible();

  await page.getByRole('button', { name: 'Export as scenario' }).click();
  await expect(page.getByRole('dialog', { name: 'Export scenario' })).toBeVisible();
  await page.getByLabel('Scenario id').fill('e2e-sandbox-authoring');
  await page.getByLabel('Scenario title').fill('E2E Sandbox Authoring');
  await page.getByLabel('Scenario summary').fill('Generated from an edited MTU sandbox.');
  await page.getByLabel('Export as preseed edit delta').check();
  await expect(page.getByLabel('Scenario TypeScript preview')).toContainText(
    'e2e-sandbox-authoring',
  );

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download scenario TypeScript' }).click();
  const download = await downloadPromise;
  const scenarioPath = testInfo.outputPath('e2e-sandbox-authoring.ts');
  await download.saveAs(scenarioPath);
  const source = await readFile(scenarioPath, 'utf8');

  expect(download.suggestedFilename()).toBe('e2e-sandbox-authoring.ts');
  expect(source).toContain("id: 'e2e-sandbox-authoring'");
  expect(source).toContain("kind: 'interface.mtu'");
  expect(source).toContain("kind: 'param.set'");
  expect(source).toContain("kind: 'traffic.launch'");
});
