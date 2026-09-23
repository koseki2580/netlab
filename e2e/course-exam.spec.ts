import { EXAM_QUESTIONS } from '../demo/course/examQuestions';
import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-197 — the final test marks honestly and sends each miss back to its lesson.
 *
 * The beginner path had no way to check what a learner had taken from it.
 * The test lists the path in order, asks ten questions, and after marking
 * explains each answer; every missed question links to the lesson that
 * teaches it, so "not yet" comes with where to go.
 */
async function openExam(page: import('@playwright/test').Page) {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* the test is still usable in English */
    }
  });
  await page.goto('/#/course/exam');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId('exam-path')).toBeVisible();
}

test('answering "not learned" throughout scores 0 and points to every lesson', async ({ page }) => {
  await openExam(page);
  for (let n = 1; n <= 10; n += 1) await page.getByTestId(`exam-option-${n}-x`).check();
  await page.getByTestId('exam-submit').click();

  await expect(page.getByTestId('exam-score')).toHaveAttribute('data-score', '0');
  await expect(page.getByTestId('exam-score')).toHaveAttribute('data-passed', 'no');
  for (let n = 1; n <= 10; n += 1) {
    await expect(
      page.getByTestId(`exam-review-${n}`),
      `question ${n} points to its lesson`,
    ).toBeVisible();
  }

  // A review link leads to the lesson.
  await page.getByTestId('exam-review-5').click();
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page).toHaveURL(/#\/networking\/arp/);
});

test('ten right answers pass', async ({ page }) => {
  await openExam(page);
  for (const [index, question] of EXAM_QUESTIONS.entries()) {
    await page.getByTestId(`exam-option-${index + 1}-${question.answer + 1}`).check();
  }
  await page.getByTestId('exam-submit').click();
  await expect(page.getByTestId('exam-score')).toHaveAttribute('data-score', '10');
  await expect(page.getByTestId('exam-score')).toHaveAttribute('data-passed', 'yes');
  await expect(page.getByTestId('exam-review-1')).toHaveCount(0);
});
