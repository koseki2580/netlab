import { expect, test } from './fixtures/harness';

test('sandbox intro guides the learner through the TCP packet edit flow', async ({ page }) => {
  await page.goto(
    '/?sandbox=1&sandboxTab=packet&intro=sandbox-intro-tcp#/simulation/tcp-handshake',
  );
  await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
  await expect(page.locator('[data-testid="sandbox-intro-overlay"]')).toBeVisible();

  await page.getByRole('button', { name: 'Start Intro' }).click();
  await page.getByRole('tab', { name: 'Packet' }).click();

  await page.getByRole('tab', { name: 'Traffic' }).click();
  await page.getByLabel('Protocol').selectOption('tcp');
  await page.getByRole('button', { name: 'Launch traffic' }).click();
  await page.getByRole('tab', { name: 'Packet' }).click();

  await page.getByLabel('TCP SYN flag').click();
  await page.getByLabel('TCP RST flag').click();
  await page.getByRole('button', { name: 'Apply TCP flags' }).click();

  await expect(page.locator('[data-testid="sandbox-intro-overlay"]')).toHaveCount(0);
});
