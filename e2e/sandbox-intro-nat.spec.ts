import { expect, test } from './fixtures/harness';

test('sandbox intro guides the learner through the NAT rule flow', async ({ page }) => {
  await page.goto('/?sandbox=1&sandboxTab=node&intro=sandbox-intro-nat#/simulation/nat');
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="sandbox-intro-overlay"]')).toBeVisible();

  await page.getByRole('button', { name: 'Start Intro' }).click();
  await page.getByRole('tab', { name: 'Node' }).click();

  const sandboxPopover = page.getByRole('dialog', { name: 'Edit in sandbox' });
  const openNodePopover = async () => {
    await page.locator('.react-flow__node').filter({ hasText: 'R-Edge' }).first().click({
      button: 'right',
      force: true,
    });
    await expect(sandboxPopover).toBeVisible();
  };

  await openNodePopover();
  await sandboxPopover.getByLabel('NAT kind').selectOption('dnat');
  await sandboxPopover.getByLabel('Translate to').fill('192.168.1.10');
  await sandboxPopover.getByRole('button', { name: 'Add NAT rule' }).click();
  // Close the co-mounted NodeDetailPanel so the next right-click reaches the
  // node instead of the overlay panel covering the canvas right band.
  await page.getByLabel('Close panel').click();

  await page.getByRole('tab', { name: 'Traffic' }).click();
  await page.getByLabel('Source').selectOption({ label: 'Internet Host' });
  await page.getByLabel('Destination').selectOption({ label: 'R-Edge' });
  await page.getByRole('button', { name: 'Launch traffic' }).click();

  await page.getByRole('tab', { name: 'Node' }).click();
  await openNodePopover();
  await sandboxPopover.getByLabel('NAT editor').getByRole('button', { name: 'Remove' }).click();

  await page.getByRole('tab', { name: 'Traffic' }).click();
  await page.getByLabel('Source').selectOption({ label: 'Internet Host' });
  await page.getByLabel('Destination').selectOption({ label: 'R-Edge' });
  await page.getByRole('button', { name: 'Launch traffic' }).click();

  await expect(page.locator('[data-testid="sandbox-intro-overlay"]')).toHaveCount(0);
});
