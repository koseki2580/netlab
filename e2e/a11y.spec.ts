import AxeBuilder from '@axe-core/playwright';
import { CATEGORIES, expect, test } from './fixtures/harness';

for (const category of CATEGORIES) {
  for (const demo of category.demos) {
    test(`a11y: ${category.id}/${demo.title}`, async ({ demoPage, page }) => {
      await demoPage.goto(demo.path);
      await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('.react-flow__renderer') // React Flow canvas is role=application
        .exclude('.react-flow__attribution') // React Flow branding; out of scope
        .analyze();

      expect(results.violations).toEqual([]);
    });
  }
}
