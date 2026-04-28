import { expect, test } from './fixtures/harness';

test('sandbox notes plugin registers an editor and persists a custom edit', async ({ page }) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();

  await page.locator('.react-flow__node').filter({ hasText: 'R1' }).first().click({
    button: 'right',
    force: true,
  });
  await expect(page.getByRole('dialog')).toContainText('Node note');

  await page.getByLabel('Node note').fill('Investigate R1 after MTU change');
  await page.getByRole('button', { name: 'Apply note' }).click();

  await page.getByRole('tab', { name: /Edits \(1\)/ }).click();
  await expect(page.locator('[data-testid="edit-list-item"]')).toContainText(
    'plugin:example.notes',
  );
  await expect(page.locator('[data-testid="edit-list-item"]')).toContainText(
    'Note on router-r1: Investigate R1 after MTU change',
  );
  await expect.poll(() => page.url()).toContain('sandboxState=');

  await page.reload();
  await expect(page.locator('[data-testid="sandbox-panel"]')).toBeVisible();
  await page.getByRole('tab', { name: /Edits \(1\)/ }).click();
  await expect(page.locator('[data-testid="edit-list-item"]')).toContainText(
    'Investigate R1 after MTU change',
  );
});
