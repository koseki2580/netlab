import { CATEGORIES, expect, test } from './fixtures/harness';

for (const category of CATEGORIES) {
  for (const demo of category.demos) {
    test(`${category.id}/${demo.title} mounts`, async ({ demoPage, page }) => {
      await demoPage.goto(demo.path);
      await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
      await expect(page.locator('.react-flow').first()).toBeAttached();
    });
  }
}
