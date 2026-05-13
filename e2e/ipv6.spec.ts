import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('IPv6 demo delivers ICMPv6 echo through dual-stack routing', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/ipv6');

  await page.getByRole('button', { name: /send ipv6 echo/i }).click();

  await expect(page.getByText(/icmpv6 hops/i)).toBeVisible();
  await expect(page.getByText(/server deliver/i).first()).toBeVisible();
  await expect(page.getByText(/2001:db8:2::20/i).first()).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .exclude('.react-flow__renderer')
    .exclude('.react-flow__attribution')
    .analyze();
  expect(results.violations).toEqual([]);
});
