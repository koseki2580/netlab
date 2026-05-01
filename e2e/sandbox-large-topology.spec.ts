import { expect, test } from './fixtures/harness';

test('Fast mode disables sandbox PCAP export and keeps parameter re-run responsive', async ({
  page,
}) => {
  await page.goto('/?sandbox=1#/networking/mtu-fragmentation');
  const panel = page.locator('[data-testid="sandbox-panel"]');
  await expect(panel).toBeVisible();

  await panel.getByLabel('Use fast mode').check();
  await expect(
    panel.getByRole('button', { name: 'Download sandbox PCAP', exact: true }),
  ).toBeDisabled();

  await panel.getByRole('tab', { name: /Parameters/ }).click();
  const before = await page.evaluate(() => performance.now());
  await panel.getByLabel('Engine tick ms').focus();
  await panel.getByLabel('Engine tick ms').press('ArrowRight');
  await expect(panel.getByRole('tab', { name: /Edits \(1\)/ })).toBeVisible();
  const elapsed = await page.evaluate((start) => performance.now() - start, before);

  expect(elapsed).toBeLessThan(2000);
});
