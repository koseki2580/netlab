import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { DemoPage } from './pages/DemoPage';

test('HTTPS demo shows TLS handshake annotations and ALPN alert path', async ({ page }) => {
  const demoPage = new DemoPage(page);
  await demoPage.goto('/networking/https');

  await page.getByRole('button', { name: /run https handshake/i }).click();
  await expect(page.getByText(/tls:client-hello/i).first()).toBeVisible();
  await expect(page.getByText(/tls:finished/i).nth(1)).toBeVisible();
  await expect(page.getByText(/ALPN: http\/1\.1/i)).toBeVisible();

  await page.getByRole('button', { name: /force alpn mismatch/i }).click();
  await expect(page.getByText(/tls:alert \(no_application_protocol\)/i)).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);
});
