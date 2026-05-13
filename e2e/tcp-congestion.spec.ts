import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('tcp congestion demo renders deterministic phase transitions', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/simulation/tcp-congestion');

  await expect(page.locator('.react-flow').first()).toBeAttached();
  await expect(page.getByRole('img', { name: /tcp congestion window timeline/i })).toBeVisible();
  await expect(page.getByText('RTO', { exact: true })).toBeVisible();
  await expect(page.getByText('step 9: fast-retransmit', { exact: true })).toBeVisible();
  await expect(page.getByText('step 12: rto-fire', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /reset/i }).click();
  await expect(page.getByText('No congestion events')).toBeVisible();

  await page.getByRole('button', { name: /run trace/i }).click();
  await expect(page.getByText('step 9: fast-retransmit', { exact: true })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);
});
