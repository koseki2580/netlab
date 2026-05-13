import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('GRE demo shows outer header, GRE key, and inner IP packet', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/tunneling/gre');

  await expect(page.getByText('GRE Tunnel').first()).toBeVisible();
  await expect(page.getByTestId('gre-outer')).toContainText('proto 47');
  await expect(page.getByTestId('gre-shim')).toContainText('100');
  await expect(page.getByTestId('gre-inner')).toContainText('10.0.0.10');

  await page.getByRole('button', { name: /change tunnel key/i }).click();
  await expect(page.getByTestId('gre-status')).toContainText('isolated');
});
