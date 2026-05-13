import { CATEGORIES, expect, test } from './fixtures/harness';

const NON_CANVAS_DEMO_PATHS = new Set([
  '/networking/https',
  '/networking/http2',
  '/networking/http3',
]);

for (const category of CATEGORIES) {
  for (const demo of category.demos) {
    test(`${category.id}/${demo.title} mounts`, async ({ demoPage, page }) => {
      await demoPage.goto(demo.path);
      await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();
      if (!NON_CANVAS_DEMO_PATHS.has(demo.path)) {
        await expect(page.locator('.react-flow').first()).toBeAttached();
      }
    });
  }
}
