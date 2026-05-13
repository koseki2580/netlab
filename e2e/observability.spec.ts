import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('observability demo records NetFlow and sFlow annotations', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/observability');

  await page.getByRole('button', { name: /send observed flow/i }).click();

  await expect(page.getByText(/netflow:flow-update/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'sFlow' }).click();
  await expect(page.getByText(/sflow:sampled/i).first()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);
});
