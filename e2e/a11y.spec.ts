import AxeBuilder from '@axe-core/playwright';
import { excludingCanvasInternals, undecidedContrastFailures } from './axe';
import { CATEGORIES, expect, test } from './fixtures/harness';

for (const category of CATEGORIES) {
  for (const demo of category.demos) {
    test(
      `a11y: ${category.id}/${demo.title}`, // One demo of the loop is enough for the smoke run.
      { tag: demo === CATEGORIES[0]?.demos[0] ? '@smoke' : [] },
      async ({ demoPage, page }) => {
        await demoPage.goto(demo.path);
        await expect(page.locator('[data-testid="netlab-root"]')).toBeVisible();

        const results = await excludingCanvasInternals(new AxeBuilder({ page }))
          .withTags(['wcag2a', 'wcag2aa'])
          .analyze();

        expect(results.violations).toEqual([]);
        // TC-162 — the contrast axe could not decide, measured directly.
        expect(await undecidedContrastFailures(page, results)).toEqual([]);
      },
    );
  }
}
