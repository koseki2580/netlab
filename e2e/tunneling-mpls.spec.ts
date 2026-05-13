import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('MPLS L3VPN demo shows LDP, VPNv4, and PHP state', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/tunneling/mpls-l3vpn');

  await expect(page.getByText('MPLS L3VPN').first()).toBeVisible();
  await expect(page.getByTestId('mpls-ldp')).toContainText('converged');
  await expect(page.getByTestId('vpnv4-route')).toContainText('10.0.2.0/24');
  await expect(page.getByTestId('mpls-stack')).toContainText('3 / 24010');

  await page.getByRole('button', { name: /disable php/i }).click();
  await expect(page.getByTestId('mpls-php')).toContainText('disabled');
});
