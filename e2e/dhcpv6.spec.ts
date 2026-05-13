import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('DHCPv6 SLAAC demo switches M/O flag behavior', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/dhcpv6');

  await expect(page.getByText('DHCPv6 And Stateful SLAAC').first()).toBeVisible();
  await expect(page.getByTestId('slaac-mode')).toContainText('DHCPv6 address');
  await expect(page.getByTestId('host-dns')).toContainText('2001:db8::53');

  await page.getByRole('button', { name: /m=0 o=1/i }).click();
  await expect(page.getByTestId('slaac-mode')).toContainText('slaac-with-dhcpv6-other');
  await expect(page.getByTestId('host-dns')).toContainText('2001:db8::53');

  await page.getByRole('button', { name: /m=0 o=0/i }).click();
  await expect(page.getByTestId('slaac-mode')).toContainText('slaac-only');
  await expect(page.getByTestId('host-dns')).toContainText('none');
});
