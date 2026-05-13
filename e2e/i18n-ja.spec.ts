import { expect, test } from '@playwright/test';

test('Gallery locale toggle switches to Japanese and persists', async ({ page }) => {
  await page.goto('/#/');
  await expect(page.getByText('Demo gallery')).toBeVisible();

  await page.getByRole('button', { name: '日本語' }).click();
  await expect(page.getByText('デモギャラリー')).toBeVisible();

  await page.reload();
  await expect(page.getByText('デモギャラリー')).toBeVisible();
});
