import { getDeck } from '../src/learning/concept-check';
import { expect, test } from './fixtures/harness';

/**
 * TC-2292, TC-2293, TC-2294 — a lesson ends with a collapsed check in its own
 * deck; answering it schedules reviews, and none of them is due straight away.
 */
test('a lesson’s check is answered there, and nothing is due on the path afterwards', async ({
  page,
  demoPage,
}) => {
  const questions = getDeck('arp')!.questions.length;

  await demoPage.goto('/networking/arp');
  const open = page.getByTestId('lesson-concept-open');
  await expect(open).toHaveAttribute('aria-expanded', 'false');
  await open.click();
  await expect(page.getByTestId('concept-check-session-title')).toHaveText('ARP');

  // At least three questions, then the rest of the deck, whatever is chosen.
  expect(questions).toBeGreaterThanOrEqual(3);
  for (let index = 0; index < questions; index += 1) {
    await expect(page.getByTestId('concept-check-progress')).toContainText(
      `${index + 1} / ${questions}`,
    );
    await page.getByTestId('concept-check-option-0').click();
    await page.getByTestId('concept-check-next').click();
  }
  await expect(page.getByTestId('concept-check-summary')).toBeVisible();
  await expect(page.getByTestId('concept-check-again')).toBeVisible();

  // Just answered: scheduled, but not due yet.
  await demoPage.goto('/path');
  await expect(page.getByTestId('path-page')).toBeVisible();
  await expect(page.getByTestId('path-stage-2-review')).toHaveCount(0);
  await expect(page.locator('[data-testid^="path-stage-"][data-testid$="-review"]')).toHaveCount(0);
});
