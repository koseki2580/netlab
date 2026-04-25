import { expect, test } from './fixtures/harness';

test('sandbox intro guides the learner through the OSPF convergence flow', async ({ page }) => {
  await page.goto('/?sandbox=1&sandboxTab=node&intro=sandbox-intro-ospf#/routing/ospf-convergence');
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="sandbox-intro-overlay"]')).toBeVisible();

  await page.getByRole('button', { name: 'Start Intro' }).click();
  await page.getByRole('tab', { name: 'Node' }).click();

  await page.getByRole('button', { name: 'fail primary link' }).click({ force: true });

  await page.getByRole('tab', { name: 'Traffic' }).click();
  await page.getByLabel('Source').selectOption({ label: 'C1' });
  await page.getByLabel('Destination').selectOption({ label: 'C2' });
  await page.getByRole('button', { name: 'Launch traffic' }).click();

  await page.getByRole('tab', { name: 'Node' }).click();
  await page.locator('.react-flow__node').filter({ hasText: 'R1' }).first().click({
    button: 'right',
    force: true,
  });
  await page.locator('input').first().fill('10.4.0.0/24');
  await page.getByLabel('Next hop').fill('10.0.13.2');
  await page.getByLabel('Route interface').selectOption({ label: 'to-r3' });
  await page.getByRole('button', { name: 'Add route' }).click();

  await page.getByRole('tab', { name: 'Traffic' }).click();
  await page.getByLabel('Source').selectOption({ label: 'C1' });
  await page.getByLabel('Destination').selectOption({ label: 'C2' });
  await page.getByRole('button', { name: 'Launch traffic' }).click();

  await expect(page.locator('[data-testid="sandbox-intro-overlay"]')).toHaveCount(0);
});
