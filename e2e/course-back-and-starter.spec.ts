import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

async function inJapanese(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
      window.localStorage.removeItem('netlab-course-step');
    } catch {
      /* the pages still work */
    }
  });
}

/**
 * TC-200 — a learner can go back to a step they have passed.
 *
 * The course only went forward, and a reload resumed at the furthest step, so
 * a result a learner clicked past could not be read again.
 */
test('the course steps back to the previous step', async ({ page }) => {
  await inJapanese(page);
  await page.goto('/#/course');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  const firstTitle = await page.getByTestId('course-title').textContent();
  await expect(page.getByTestId('course-back'), 'nothing to go back to on step 1').toHaveCount(0);

  await page.getByTestId('course-send').click();
  await page.getByTestId('course-next').click();
  await expect(page.getByTestId('course-title')).not.toHaveText(firstTitle ?? '');

  await page.getByTestId('course-back').click();
  await expect(page.getByTestId('course-title'), 'back on step 1').toHaveText(firstTitle ?? '');
});

/**
 * TC-201 — the subnetting page opens on its plain rule, not on arithmetic.
 *
 * A trial learner who presses first and reads second never met the starter
 * card; it has to be what the page shows before anything is scrolled.
 */
test('the subnetting page shows its starter card on the first screen', async ({ page }) => {
  await inJapanese(page);
  await page.goto('/#/learning/subnetting');
  const starter = page.getByTestId('subnet-starter');
  await expect(starter).toBeVisible();
  await expect(starter).toBeInViewport();
});
