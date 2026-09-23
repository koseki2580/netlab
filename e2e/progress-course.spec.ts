import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-184 — a learner's progress is kept, from the first visit.
 *
 * Progress was recorded only when a link carried `?learnerId=`, so a learner
 * who simply opened the app recorded nothing: the gallery showed "0 / 52" and
 * a "continue" button beside it on a first visit, and still 0 after finishing
 * the whole course. The app now keeps an id for this browser, and the course
 * reports each step it finishes.
 */
const IDS = {
  done: 'learning-map-done',
  resume: 'learning-resume',
  courseSend: 'course-send',
  courseOutcome: 'course-outcome',
} as const;

test('finishing a course step shows up in the gallery, and nothing is offered to resume before', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto('/#/');
  await expect(page.getByTestId(SEL.gallery.heading)).toBeVisible();
  await expect(page.getByTestId(IDS.done)).toHaveAttribute('data-done', '0');
  await expect(
    page.getByTestId(IDS.resume),
    'there is nothing to continue on a first visit',
  ).toHaveCount(0);

  await page.goto('/#/course');
  await page.getByTestId(IDS.courseSend).click();
  await expect(page.getByTestId(IDS.courseOutcome)).toBeVisible();

  await page.goto('/#/');
  await expect(page.getByTestId(SEL.gallery.heading)).toBeVisible();
  await expect(page.getByTestId(IDS.done), 'the finished step is counted').toHaveAttribute(
    'data-done',
    '1',
  );
  await expect(
    page.getByTestId(IDS.resume),
    'and now there is something to continue',
  ).toBeVisible();
});
