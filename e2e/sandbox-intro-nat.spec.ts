import { expect, test } from './fixtures/harness';

test('sandbox intro guides the learner through the NAT rule flow', async ({ page }) => {
  await page.goto('/?sandbox=1&sandboxTab=node&intro=sandbox-intro-nat#/simulation/nat');
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="sandbox-intro-overlay"]')).toBeVisible();

  await page.getByRole('button', { name: 'Start Intro' }).click();
  await page.getByRole('tab', { name: 'Node' }).click();

  await page.locator('.react-flow__node').filter({ hasText: 'R-Edge' }).first().click({
    button: 'right',
    force: true,
  });
  await page.getByLabel('NAT kind').selectOption('dnat');
  await page.getByLabel('Translate to').fill('192.168.1.10');
  await page.getByRole('button', { name: 'Add NAT rule' }).click();

  await page.getByRole('tab', { name: 'Traffic' }).click();
  await page.getByLabel('Source').selectOption({ label: 'Internet Host' });
  await page.getByLabel('Destination').selectOption({ label: 'R-Edge' });
  await page.getByRole('button', { name: 'Launch traffic' }).click();

  await page.getByRole('tab', { name: 'Node' }).click();
  await page.locator('.react-flow__node').filter({ hasText: 'R-Edge' }).first().click({
    button: 'right',
    force: true,
  });
  await page.getByLabel('NAT editor').getByRole('button', { name: 'Remove' }).click();

  await page.getByRole('tab', { name: 'Traffic' }).click();
  await page.getByLabel('Source').selectOption({ label: 'Internet Host' });
  await page.getByLabel('Destination').selectOption({ label: 'R-Edge' });
  await page.getByRole('button', { name: 'Launch traffic' }).click();

  await expect(page.locator('[data-testid="sandbox-intro-overlay"]')).toHaveCount(0);
});
