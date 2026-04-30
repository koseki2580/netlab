import { test, expect } from '@playwright/test';

test('opens the OSPF backup-path assessment from the Gallery', async ({ page }) => {
  await page.goto('/');
  await page
    .getByRole('link', { name: /Start assessment/i })
    .first()
    .click();

  await expect(page.getByTestId('sandbox-panel')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Assessment' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText(/Make C1 reach C2 through the OSPF backup path/i)).toBeVisible();
});
