import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('HTTP/2 demo shows multiplexing and TCP transport HOL', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/http2');

  await expect(page.getByText(/HTTP\/2 Multiplexing/i)).toBeVisible();
  await expect(page.getByTestId('h2-data-frame').first()).toContainText('stream=1');

  await page.getByRole('button', { name: /enable tcp loss/i }).click();
  await expect(page.getByTestId('h2-stream-1')).toContainText('stalled');
  await expect(page.getByTestId('h2-stream-3')).toContainText('stalled');
  await expect(page.getByTestId('h2-stream-5')).toContainText('stalled');
  await expect(page.getByTestId('h2-stream-7')).toContainText('stalled');
});
