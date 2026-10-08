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
  // The questions stay hidden until the learner starts the test (TC-323).
  await page.getByTestId('exam-start').click();
  await expect(page.getByTestId('exam-question-1')).toBeVisible();
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

/**
 * TC-552, TC-553 — one miss out of ten: the score card says it is a pass with
 * something to check, names the question, and takes the learner to it.
 */
test('nine right answers pass, and the score card names the one missed and leads to it', async ({
  page,
}) => {
  await openExam(page);
  for (const [index, question] of EXAM_QUESTIONS.entries()) {
    const suffix = index === 4 ? 'x' : question.answer + 1;
    await page.getByTestId(`exam-option-${index + 1}-${suffix}`).check();
  }
  await page.getByTestId('exam-submit').click();
  await expect(page.getByTestId('exam-score')).toHaveAttribute('data-score', '9');
  await expect(page.getByTestId('exam-score')).toHaveAttribute('data-passed', 'yes');
  await expect(page.getByTestId('exam-verdict')).toHaveText(
    '合格です。まちがえた 1 問は、下で確かめましょう。',
  );
  await expect(page.getByTestId('exam-missed-summary')).toHaveText('まちがえたのは 問 5 です');
  await expect(page.getByTestId('exam-missed-review-5')).toBeVisible();
  await expect(page.getByTestId('exam-missed-4')).toHaveCount(0);

  await expect(page.getByTestId('exam-feedback-5')).not.toBeInViewport();
  await page.getByTestId('exam-missed-5').click();
  await expect(page.getByTestId('exam-question-5')).toBeInViewport();
  await expect(page.getByTestId('exam-question-5')).toBeFocused();
});

test('ten right answers pass', async ({ page }) => {
  await openExam(page);
  for (const [index, question] of EXAM_QUESTIONS.entries()) {
    await page.getByTestId(`exam-option-${index + 1}-${question.answer + 1}`).check();
  }
  await page.getByTestId('exam-submit').click();
  await expect(page.getByTestId('exam-score')).toHaveAttribute('data-score', '10');
  await expect(page.getByTestId('exam-score')).toHaveAttribute('data-passed', 'yes');
  await expect(page.getByTestId('exam-verdict')).toContainText('満点です');
  await expect(page.getByTestId('exam-missed')).toHaveCount(0);
  await expect(page.getByTestId('exam-review-1')).toHaveCount(0);
});
