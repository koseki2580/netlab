import { test, expect } from '@playwright/test';

test('assessment query opens a sandbox with assessment constraints active', async ({ page }) => {
  await page.goto(
    '/?assessment=ospf-convergence&sandbox=1&sandboxTab=assessment#/routing/ospf-convergence',
  );

  await expect(page.getByTestId('sandbox-panel')).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Assessment' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByText(/Avoid static routes/i)).toBeVisible();
});
