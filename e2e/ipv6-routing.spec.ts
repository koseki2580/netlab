import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('IPv6 routing demo shows OSPFv3 ECMP and recomputes after failure', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/ipv6-routing');

  await expect(page.getByText('IPv6 Routing Ecosystem').first()).toBeVisible();
  await expect(page.getByTestId('ospfv3-ecmp')).toContainText('2 active next hops');
  await expect(page.getByTestId('mp-bgp-route')).toContainText('2001:db8:2::/64');

  await page.getByRole('button', { name: /fail r1-r2 ospfv3 link/i }).click();
  await expect(page.getByTestId('ospfv3-ecmp')).toContainText('1 active next hop');
});
