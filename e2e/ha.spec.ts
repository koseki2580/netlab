import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('high availability demo fails over VRRP and rehashes LACP members', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/ha');

  await expect(page.getByText('Gateway HA And Link Aggregation').first()).toBeVisible();
  await expect(page.getByTestId('vrrp-master')).toContainText('R1');
  await expect(page.getByTestId('member-count')).toContainText('2 active member');

  await page.getByRole('button', { name: /fail r1 gateway/i }).click();
  await expect(page.getByTestId('vrrp-master')).toContainText('R2');

  await page.getByRole('button', { name: /fail lacp member/i }).click();
  await expect(page.getByTestId('member-count')).toContainText('1 active member');
  await expect(page.getByTestId('lacp-member')).toContainText('fa0/2');
});
