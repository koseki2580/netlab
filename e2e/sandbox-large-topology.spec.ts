import { expect, test } from './fixtures/harness';

test('Fast mode disables sandbox PCAP export and keeps parameter re-run responsive', async ({
  page,
  sandboxPage,
}) => {
  await page.goto('/?sandbox=1#/networking/mtu-fragmentation');
  await expect(sandboxPage.panel()).toBeVisible();

  await sandboxPage.enableFastMode();
  await expect(sandboxPage.pcapDownload()).toBeDisabled();

  await sandboxPage.clickTab('parameters');
  const before = await page.evaluate(() => performance.now());
  await sandboxPage.paramEngineTickMs().focus();
  await sandboxPage.paramEngineTickMs().press('ArrowRight');
  await sandboxPage.expectEditsCount(1);
  const elapsed = await page.evaluate((start) => performance.now() - start, before);

  expect(elapsed).toBeLessThan(2000);
});
