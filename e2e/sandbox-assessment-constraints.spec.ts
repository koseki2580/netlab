import { test, expect } from './fixtures/harness';

test('assessment query opens a sandbox with assessment constraints active', async ({
  page,
  sandboxPage,
}) => {
  await page.goto(
    '/?assessment=ospf-convergence&sandbox=1&sandboxTab=assessment#/routing/ospf-convergence',
  );

  await expect(sandboxPage.panel()).toBeVisible();
  await expect(sandboxPage.tab('assessment')).toHaveAttribute('aria-selected', 'true');
  await expect(sandboxPage.tabpanel()).toContainText('Avoid static routes');
});
