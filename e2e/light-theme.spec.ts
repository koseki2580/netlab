import AxeBuilder from '@axe-core/playwright';
import { CATEGORIES, expect, test } from './fixtures/harness';
import { excludingCanvasInternals } from './axe';
import { SEL } from './selectors';

/**
 * TC-041 — every lesson is readable in the light theme.
 *
 * The Light setting existed, and until it started reaching the lessons nobody
 * had opened one in it. The first scan found 66 contrast failures across 22
 * lessons: the light palette's amber read 3.04:1 as label text, its faint text
 * 2.08:1, and dozens of panels were painted in fixed slate that never changed
 * with the theme at all.
 *
 * Dark has always been scanned by `a11y.spec.ts`. This is the other half.
 */
async function chooseLightThenOpen(page: import('@playwright/test').Page, path: string) {
  await page.goto('/#/');
  await expect(page.getByTestId(SEL.gallery.heading)).toBeVisible();
  // Dark first: the gallery opens light, and a setting is only remembered once
  // it changes, so choosing Light alone would leave nothing stored.
  await page.getByTestId(SEL.gallery.themeMode('dark')).click();
  await page.waitForTimeout(120);
  await page.getByTestId(SEL.gallery.themeMode('light')).click();
  await page.waitForTimeout(220);
  await page.goto(`/#${path}`);
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
}

for (const category of CATEGORIES) {
  for (const demo of category.demos) {
    test(`light a11y: ${category.id}/${demo.title}`, async ({ page }) => {
      await page.setViewportSize({ width: 1600, height: 1000 });
      await chooseLightThenOpen(page, demo.path);

      const results = await excludingCanvasInternals(
        new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']),
      ).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}
