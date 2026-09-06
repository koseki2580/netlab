import { expect, test } from './fixtures/harness';
import { COURSE_STEPS } from '../demo/course/courseSteps';
import { SEL } from './selectors';

/**
 * The gallery lists fifty-two lessons behind a category filter, which answers
 * "what can this show me" and not "what do I do first". These walk the course
 * that answers the second question, the way a beginner meets it.
 */
async function walk(page: import('@playwright/test').Page) {
  for (const step of COURSE_STEPS) {
    await expect(page.getByTestId(SEL.course.title)).toBeVisible();
    if (step.expect === 'drop') {
      // A packet that is meant to fail says so before it is sent. Otherwise a
      // beginner reads the failure as the tool being broken.
      await expect(page.getByTestId(SEL.course.warning)).toBeVisible();
    }
    await page.getByTestId(SEL.course.send).click();
    const outcome = page.getByTestId(SEL.course.outcome);
    await expect(outcome).toBeVisible();
    await expect(outcome).toHaveAttribute('data-arrived', step.expect === 'deliver' ? 'yes' : 'no');
    await page.getByTestId(SEL.course.next).click();
  }
  await expect(page.getByTestId(SEL.course.finished)).toBeVisible();
}

/** TC-125 — every step does what it predicted, and the course finishes. */
test('a beginner can walk the whole course', async ({ page, demoPage }) => {
  test.setTimeout(180_000);
  const complaints: string[] = [];
  page.on('pageerror', (error) => complaints.push(error.message));
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem('netlab-course-step');
    } catch {
      /* a first visit has nothing stored anyway */
    }
  });
  await demoPage.goto('/course');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();

  await walk(page);

  expect(complaints, 'the course runs without complaint').toEqual([]);
});

/** TC-126 — and reads it in Japanese, having chosen Japanese in the gallery. */
test('the course speaks the language the learner chose', async ({ page, demoPage }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
      window.localStorage.removeItem('netlab-course-step');
    } catch {
      /* the default is English, which this test would then catch */
    }
  });
  await demoPage.goto('/course');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();

  for (const field of [SEL.course.title, SEL.course.goal, SEL.course.task]) {
    await expect(page.getByTestId(field)).toHaveText(/[ぁ-んァ-ヶ一-龯]/);
  }
  await expect(page.getByTestId(SEL.course.send)).toHaveText(/[ぁ-んァ-ヶ一-龯]/);
});

/** TC-127 — the course is offered from the gallery, not hidden behind a URL. */
test('the gallery offers the course before anything else', async ({ page, galleryPage }) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await galleryPage.goto();

  const banner = page.getByTestId(SEL.course.banner);
  await expect(banner).toBeVisible();
  await banner.click();

  await expect(page.getByTestId(SEL.course.title)).toBeVisible();
  await expect(page.getByTestId(SEL.course.progress)).toContainText('1');
});
