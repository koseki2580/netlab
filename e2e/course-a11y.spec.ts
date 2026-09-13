import AxeBuilder from '@axe-core/playwright';
import { excludingCanvasInternals } from './axe';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * The accessibility sweeps walk the gallery's categories, and the course is
 * not one of them — it is reached from a banner. So the page a beginner is now
 * told to start with was the one page neither sweep looked at.
 *
 * Both themes, because the light palette is where the contrast failures were:
 * the first light-theme scan found sixty-six across twenty-two lessons.
 */
async function scan(page: import('@playwright/test').Page) {
  const results = await excludingCanvasInternals(new AxeBuilder({ page }))
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  return results.violations;
}

/** TC-136 — the course is usable in the dark theme it opens in. */
test('the course has no accessibility violations', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem('netlab-course-step');
    } catch {
      /* a first visit has nothing stored anyway */
    }
  });
  await demoPage.goto('/course');
  await expect(page.getByTestId(SEL.course.title)).toBeVisible();

  expect(await scan(page)).toEqual([]);

  // The result panel is half the page and only exists after a run, so scanning
  // before pressing would miss it entirely.
  await page.getByTestId(SEL.course.send).click();
  await expect(page.getByTestId(SEL.course.outcome)).toBeVisible();

  expect(await scan(page)).toEqual([]);
});

/** TC-137 — and in the light theme, where the contrast failures live. */
test('the course has no accessibility violations in light', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto('/#/');
  await expect(page.getByTestId(SEL.gallery.heading)).toBeVisible();
  // Dark first: the gallery opens light, and a setting is only remembered once
  // it changes, so choosing Light alone would leave nothing stored.
  await page.getByTestId(SEL.gallery.themeMode('dark')).click();
  await page.waitForTimeout(120);
  await page.getByTestId(SEL.gallery.themeMode('light')).click();
  await page.waitForTimeout(220);

  await page.goto('/#/course');
  await expect(page.getByTestId(SEL.course.title)).toBeVisible();

  expect(await scan(page)).toEqual([]);
});

/**
 * TC-138 — the finished course is a page of its own, and the last thing a
 * beginner sees.
 */
test('the finished course has no accessibility violations', async ({ page, demoPage }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem('netlab-course-step');
    } catch {
      /* a first visit has nothing stored anyway */
    }
  });
  await demoPage.goto('/course');
  await expect(page.getByTestId(SEL.course.title)).toBeVisible();

  while ((await page.getByTestId(SEL.course.finished).count()) === 0) {
    await page.getByTestId(SEL.course.send).click();
    await expect(page.getByTestId(SEL.course.next)).toBeVisible();
    await page.getByTestId(SEL.course.next).click();
  }

  expect(await scan(page)).toEqual([]);
});
