import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('VXLAN EVPN demo shows UDP/4789, EVPN routes, and ARP suppression', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/tunneling/vxlan-evpn');

  await expect(page.getByText('VXLAN EVPN').first()).toBeVisible();
  await expect(page.getByTestId('vxlan-outer')).toContainText('UDP/4789');
  await expect(page.getByTestId('evpn-type2')).toContainText('10.10.0.20');
  await expect(page.getByTestId('evpn-type5')).toContainText('10.10.0.0/24');
  await expect(page.getByTestId('arp-suppression')).toContainText('hit');

  await page.getByRole('button', { name: /disable arp suppression/i }).click();
  await expect(page.getByTestId('arp-suppression')).toContainText('flood');
});
