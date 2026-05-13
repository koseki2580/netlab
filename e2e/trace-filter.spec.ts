import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('trace display filter narrows hops, persists through refresh, and clears with Escape', async ({
  page,
}) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/udp');
  await demoPage.pressStart();
  await demoPage.waitForTraceCount(1);

  const searchbox = page.getByRole('searchbox', { name: /trace display filter/i });
  const rows = page.getByRole('option');
  const initialCount = await rows.count();
  expect(initialCount).toBeGreaterThan(0);

  await searchbox.fill('protocol == tcp');
  await expect(page.getByText(`0 of ${initialCount} hops shown`)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => new URLSearchParams(window.location.search).get('trace_filter')),
    )
    .toBe('protocol == tcp');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);

  await page.reload();
  await page.locator('[data-testid="netlab-root"]').waitFor();
  await demoPage.pressStart();
  await demoPage.waitForTraceCount(1);
  await expect(page.getByRole('searchbox', { name: /trace display filter/i })).toHaveValue(
    'protocol == tcp',
  );
  await expect(page.getByText(`0 of ${initialCount} hops shown`)).toBeVisible();

  await page.getByRole('searchbox', { name: /trace display filter/i }).press('Escape');
  await expect(page.getByText(`${initialCount} of ${initialCount} hops shown`)).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => new URLSearchParams(window.location.search).get('trace_filter')),
    )
    .toBeNull();
});
