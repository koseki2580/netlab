import { readFile } from 'node:fs/promises';
import { expect, test } from './fixtures/harness';

test('sandbox authoring exports edited state as scenario TypeScript', async ({
  page,
  sandboxPage,
}, testInfo) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(sandboxPage.panel()).toBeVisible();

  await sandboxPage.applyMtuEdit('R1', '500');
  await sandboxPage.clickTab('parameters');
  await sandboxPage.paramMaxTtl().fill('32');
  await sandboxPage.clickTab('traffic');
  await sandboxPage.launchTraffic();
  await sandboxPage.expectEditsCount(3);

  await sandboxPage.openExportScenario();
  await expect(sandboxPage.exportScenarioDialog()).toBeVisible();
  await sandboxPage.exportScenarioId().fill('e2e-sandbox-authoring');
  await sandboxPage.exportScenarioTitle().fill('E2E Sandbox Authoring');
  await sandboxPage.exportScenarioSummary().fill('Generated from an edited MTU sandbox.');
  await sandboxPage.exportScenarioPreseed().check();
  await expect(sandboxPage.exportScenarioPreview()).toContainText('e2e-sandbox-authoring');

  const downloadPromise = page.waitForEvent('download');
  await sandboxPage.downloadScenarioTypescript();
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
