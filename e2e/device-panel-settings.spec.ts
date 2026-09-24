import type { Page } from '@playwright/test';
import { expect, test } from './fixtures/harness';

/**
 * A host's device panel reads like the IP settings screen a learner has typed
 * into for years: IP address, subnet mask, default gateway, DNS server — and a
 * DHCP lease names the mask it handed out.
 */
const T = {
  panel: '[data-netlab-dp]',
  overviewTab: '[data-netlab-dp-tab="overview"]',
  ip: 'dp-host-setting-ip',
  mask: 'dp-host-setting-mask',
  gateway: 'dp-host-setting-gateway',
  dns: 'dp-host-setting-dns',
  leaseMask: 'dp-dhcp-lease-mask',
  dhcpRun: 'dhcp-run',
  dhcpResult: 'dhcp-result',
} as const;

async function inJapanese(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* English is fine too */
    }
  });
}

async function openNode(page: Page, nodeId: string) {
  await page.locator(`[data-id="${nodeId}"]`).click();
  const panel = page.locator(T.panel);
  await expect(panel).toBeVisible();
  await panel.locator(T.overviewTab).click();
  return panel;
}

test('a static host shows its subnet mask and default gateway', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await inJapanese(page);
  await demoPage.goto('/routing/client-server');
  await demoPage.dismissBrief();

  const panel = await openNode(page, 'client-1');

  await expect(panel.getByTestId(T.ip)).toContainText('10.0.0.10');
  await expect(panel.getByTestId(T.mask)).toContainText('255.255.255.0');
  await expect(panel.getByTestId(T.mask)).toContainText('/24');
  await expect(panel.getByTestId(T.gateway)).toContainText('10.0.0.1');
});

test('after DHCP runs, the client shows the mask the lease handed out', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await inJapanese(page);
  await demoPage.goto('/services/dhcp-dns');
  await demoPage.dismissBrief();

  await page.getByTestId(T.dhcpRun).click();
  await expect(page.getByTestId(T.dhcpResult)).toContainText(/\d+\.\d+\.\d+\.\d+/);

  const panel = await openNode(page, 'dhcp-client');

  await expect(panel.getByTestId(T.leaseMask)).toContainText('255.255.255.0');
  await expect(panel.getByTestId(T.mask)).toContainText('255.255.255.0');
  await expect(panel.getByTestId(T.gateway)).toContainText('192.168.1.1');
});
