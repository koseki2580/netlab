import { CATEGORIES, expect, test } from './fixtures/harness';

/**
 * Demos that deliberately have no topology canvas.
 *
 * The protocol walkthroughs render byte-level views, and the three learning
 * drills below are exercises — a subnetting question, a multiple-choice deck, a
 * routing-table decision — none of which has a network to draw. Asserting a
 * canvas on them tests the harness, not the product.
 */
const NON_CANVAS_DEMO_PATHS = new Set([
  '/networking/https',
  '/networking/http2',
  '/networking/http3',
  '/learning/subnetting',
  '/learning/protocols',
  '/learning/routing-decision',
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
