import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures/harness';
import { SandboxPage } from './pages/SandboxPage';
import { NodeDetailPage } from './pages/NodeDetailPage';
import { SEL } from './selectors';

async function applyMtuEdit(
  sandboxPage: SandboxPage,
  nodeDetailPage: NodeDetailPage,
  value: string,
) {
  await sandboxPage.applyMtuEdit('R1', value);
  // Close the co-mounted NodeDetailPanel so subsequent right-clicks reach the
  // node instead of the overlay panel covering the canvas right band.
  await nodeDetailPage.close();
}

test('sandbox undo, redo, per-entry revert, and reset all', async ({
  page,
  sandboxPage,
  nodeDetailPage,
}) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await sandboxPage.expectMounted();

  await applyMtuEdit(sandboxPage, nodeDetailPage, '500');
  await sandboxPage.clickTab('edits');
  await expect(sandboxPage.tabpanel()).toContainText('interface.mtu');
  await expect.poll(() => page.url()).toContain('sandboxState=');

  await page.keyboard.press('Control+Z');
  await sandboxPage.expectEditsCount(0);
  await expect(sandboxPage.editListItems().first()).toContainText('Redo');
  await expect.poll(() => page.url()).not.toContain('sandboxState=');

  await page.keyboard.press('Control+Shift+Z');
  await sandboxPage.expectEditsCount(1);
  await expect.poll(() => page.url()).toContain('sandboxState=');

  await sandboxPage.clickTab('node');
  await applyMtuEdit(sandboxPage, nodeDetailPage, '600');
  await sandboxPage.clickTab('edits');
  await sandboxPage.revertEdit(2);
  await sandboxPage.expectEditsCount(1);
  await expect(sandboxPage.editListItems()).toHaveCount(1);

  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe('This removes all 1 edits.');
    await dialog.accept();
  });
  await sandboxPage.resetAllEdits();
  await sandboxPage.expectEditsCount(0);
  await expect(sandboxPage.tabpanel()).toContainText('No edits yet');
  await expect.poll(() => page.url()).not.toContain('sandboxState=');

  const results = await new AxeBuilder({ page })
    .include(`[data-testid="${SEL.sandbox.panel}"]`)
    .analyze();
  expect(results.violations).toEqual([]);
});
