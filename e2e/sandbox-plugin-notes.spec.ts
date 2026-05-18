import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

test('sandbox notes plugin registers an editor and persists a custom edit', async ({
  page,
  sandboxPage,
}) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(sandboxPage.panel()).toBeVisible();

  await sandboxPage.rightClickNodeByLabel('R1');
  await expect(sandboxPage.editPopover()).toContainText('Node note');

  await sandboxPage.popoverNodeNote().fill('Investigate R1 after MTU change');
  await sandboxPage.popoverApplyNote();

  await sandboxPage.clickTab('edits');
  await sandboxPage.expectEditsCount(1);
  await expect(page.getByTestId(SEL.sandbox.edits.list)).toContainText('plugin:example.notes');
  await expect(page.getByTestId(SEL.sandbox.edits.list)).toContainText(
    'Note on router-r1: Investigate R1 after MTU change',
  );
  await expect.poll(() => page.url()).toContain('sandboxState=');

  await page.reload();
  await expect(sandboxPage.panel()).toBeVisible();
  await sandboxPage.clickTab('edits');
  await expect(page.getByTestId(SEL.sandbox.edits.list)).toContainText(
    'Investigate R1 after MTU change',
  );
});
