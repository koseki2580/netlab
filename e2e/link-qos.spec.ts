import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('link QoS demo records deterministic link annotations', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/link-qos');

  await page.getByRole('button', { name: /send qos burst/i }).click();

  await expect(page.getByText(/enqueued q=1/i)).toBeVisible();
  await expect(page.getByText(/dequeued q=0/i)).toBeVisible();
  await expect(page.getByText(/arrived 32ms/i)).toBeVisible();

  await page.getByLabel('Loss percent').fill('50');
  await page.getByRole('button', { name: /^apply$/i }).click();
  await page.getByRole('button', { name: /send qos burst/i }).click();

  await expect(page.getByText('LINK QOS', { exact: true })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);
});
