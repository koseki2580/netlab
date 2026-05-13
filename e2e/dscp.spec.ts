import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('DSCP demo records shaper annotations', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/dscp');

  await page.getByRole('button', { name: /send shaped packets/i }).click();

  await expect(page.getByText(/shaper:classified be dscp 0/i)).toBeVisible();
  await expect(page.getByText(/shaper:classified ef dscp 46/i)).toBeVisible();
  await expect(page.getByText(/dequeued ef/i).first()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);
});
