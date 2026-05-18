import { expect, test } from './fixtures/harness';

test('alpha mode: PCAP button downloads a libpcap file', async ({
  page,
  sandboxPage,
}, testInfo) => {
  await page.goto('/?sandbox=1#/networking/mtu-fragmentation');
  await expect(sandboxPage.panel()).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await sandboxPage.pcapDownload().click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^netlab-sandbox-fragmented-echo-\d{12}\.pcap$/);

  const pcapPath = testInfo.outputPath('sandbox-alpha.pcap');
  await download.saveAs(pcapPath);
  const { readFile } = await import('fs/promises');
  const bytes = new Uint8Array(await readFile(pcapPath));
  // libpcap magic number (LE)
  const magic = bytes[0]! | (bytes[1]! << 8) | (bytes[2]! << 16) | (bytes[3]! << 24);
  expect(magic >>> 0).toBe(0xa1b2c3d4);
});

test('beta mode: branch selector appears and baseline download works', async ({
  page,
  sandboxPage,
}, testInfo) => {
  await page.goto('/?sandbox=1#/networking/mtu-fragmentation');
  await expect(sandboxPage.panel()).toBeVisible();

  await sandboxPage.toggleMode();
  await expect(sandboxPage.modeSwitch()).toContainText('Compare');

  await expect(sandboxPage.pcapBranchSelect()).toBeVisible();

  await sandboxPage.pcapBranchSelect().selectOption('baseline');

  const downloadPromise = page.waitForEvent('download');
  await sandboxPage.pcapDownload().click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/baseline/);
  expect(download.suggestedFilename()).toMatch(/\.pcap$/);

  const pcapPath = testInfo.outputPath('sandbox-baseline.pcap');
  await download.saveAs(pcapPath);
  const { readFile } = await import('fs/promises');
  const bytes = new Uint8Array(await readFile(pcapPath));
  const magic = bytes[0]! | (bytes[1]! << 8) | (bytes[2]! << 16) | (bytes[3]! << 24);
  expect(magic >>> 0).toBe(0xa1b2c3d4);
});

test('beta mode: combined download produces a pcapng file', async ({
  page,
  sandboxPage,
}, testInfo) => {
  await page.goto('/?sandbox=1#/networking/mtu-fragmentation');
  await expect(sandboxPage.panel()).toBeVisible();

  await sandboxPage.toggleMode();
  await expect(sandboxPage.modeSwitch()).toContainText('Compare');

  await sandboxPage.pcapBranchSelect().selectOption('combined');

  const downloadPromise = page.waitForEvent('download');
  await sandboxPage.pcapDownload().click();
  const download = await downloadPromise;

  // combined mode produces either .pcapng or two .pcap files depending on browser
  const filename = download.suggestedFilename();
  expect(filename).toMatch(/\.(pcap|pcapng)$/);

  const outputPath = testInfo.outputPath(
    `sandbox-combined${filename.endsWith('.pcapng') ? '.pcapng' : '.pcap'}`,
  );
  await download.saveAs(outputPath);
  const { readFile } = await import('fs/promises');
  const bytes = new Uint8Array(await readFile(outputPath));

  if (filename.endsWith('.pcapng')) {
    // pcapng SHB magic
    const magic = bytes[0]! | (bytes[1]! << 8) | (bytes[2]! << 16) | (bytes[3]! << 24);
    expect(magic >>> 0).toBe(0x0a0d0d0a);
  } else {
    // classic libpcap magic (Safari fallback)
    const magic = bytes[0]! | (bytes[1]! << 8) | (bytes[2]! << 16) | (bytes[3]! << 24);
    expect(magic >>> 0).toBe(0xa1b2c3d4);
  }
});

test('diff timeline shows PCAP buttons for each branch', async ({ page, sandboxPage }) => {
  await page.goto('/?sandbox=1#/networking/mtu-fragmentation');
  await expect(sandboxPage.panel()).toBeVisible();

  await sandboxPage.toggleMode();
  await expect(sandboxPage.modeSwitch()).toContainText('Compare');

  await expect(sandboxPage.pcapDownloadBaseline()).toBeVisible();
  await expect(sandboxPage.pcapDownloadWhatif()).toBeVisible();
  await expect(sandboxPage.pcapDownloadCombined()).toBeVisible();
});
