import AxeBuilder from '@axe-core/playwright';
import { excludingCanvasInternals } from './axe';
import { CATEGORIES, expect, test } from './fixtures/harness';

for (const category of CATEGORIES) {
  for (const demo of category.demos) {
    test(`a11y: ${category.id}/${demo.title}`, async ({ demoPage, page }) => {
      await demoPage.goto(demo.path);
      await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();

      const results = await excludingCanvasInternals(new AxeBuilder({ page }))
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
}
