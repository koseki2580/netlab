import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('wireless demo shows RSSI loss, WPA2 messages, and hidden-node collision', async ({
  page,
}) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/wireless');

  await expect(page.getByText('Wireless 802.11').first()).toBeVisible();
  await expect(page.getByTestId('wireless-association')).toContainText('connected');
  await expect(page.getByTestId('wpa-messages')).toContainText('M1 M2 M3 M4');

  const before = await page.getByTestId('wireless-loss').textContent();
  await page.getByLabel('Station distance').fill('300');
  await expect(page.getByTestId('wireless-loss')).not.toHaveText(before ?? '');

  await page.getByRole('button', { name: /enable hidden node/i }).click();
  await expect(page.getByTestId('hidden-node')).toContainText('Collision: sta-a, sta-b');
});
