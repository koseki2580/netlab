import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('HTTP/3 demo keeps unaffected QUIC streams moving', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/http3');

  await expect(page.getByText(/HTTP\/3 over QUIC/i)).toBeVisible();
  await expect(page.getByText(/h3:frame\(SETTINGS\)/i)).toBeVisible();

  await page.getByRole('button', { name: /enable quic stream loss/i }).click();
  await expect(page.getByTestId('h3-stream-4')).toContainText('stalled');
  await expect(page.getByTestId('h3-stream-0')).toContainText('complete');
  await expect(page.getByTestId('h3-stream-8')).toContainText('complete');
});
