import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('ECMP demo hashes flows across equal-cost next hops', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/ecmp');

  await page.getByRole('button', { name: /send ecmp flows/i }).click();

  await expect(page.getByText(/ecmp bucket/i).first()).toBeVisible();
  await expect(page.getByText(/via 10\.0\.12\.2/i).first()).toBeVisible();
  await expect(page.getByText(/via 10\.0\.13\.2/i).first()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);
});
