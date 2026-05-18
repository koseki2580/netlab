import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('sandbox session export and import preserves an MTU edit', async ({
  page,
  sandboxPage,
}, testInfo) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(sandboxPage.panel()).toBeVisible();

  await sandboxPage.applyMtuEdit('R1', '500');
  await sandboxPage.expectEditsCount(1);

  const downloadPromise = page.waitForEvent('download');
  await sandboxPage.exportSession();
  const download = await downloadPromise;
  const sessionPath = testInfo.outputPath('sandbox-session.json');
  await download.saveAs(sessionPath);

  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await sandboxPage.expectEditsCount(0);

  await sandboxPage.importSessionInput().setInputFiles(sessionPath);
  await expect(sandboxPage.importSessionPreview()).toContainText(
    'Import 1 edit from scenario fragmented-echo',
  );
  await sandboxPage.applyImportedSession();

  await sandboxPage.clickTab('edits');
  await expect(page.getByTestId(SEL.sandbox.edits.list)).toContainText('interface.mtu');
  await expect(page.getByTestId(SEL.sandbox.edits.list)).toContainText('1500 -> 500');
});
