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

test.describe('on a phone', () => {
  test.use({ viewportPreset: 'phone', hasTouch: true });

  /**
   * TC-2340 — opening the check from the end of a lesson brings its first
   * question on screen; before, only the ▸ turned into ▾ and the panel opened
   * below the fold.
   */
  test('TC-2340: opening the check brings its first question on screen', async ({
    page,
    demoPage,
  }) => {
    await demoPage.goto('/networking/l4s');
    const open = page.getByTestId('lesson-concept-open');
    await open.scrollIntoViewIfNeeded();
    await open.tap();
    const title = page.getByTestId('concept-check-session-title');
    await expect(title).toBeVisible();
    await expect(title).toBeInViewport();
    await expect(page.getByTestId('concept-check-option-0')).toBeInViewport();
  });

  /**
   * TC-2341 — the bottom bar offers no button that does nothing: every item in
   * it leads somewhere when tapped.
   */
  test('TC-2341: every item of the bottom bar leads somewhere', async ({ page, demoPage }) => {
    await demoPage.goto('/networking/l4s');
    const rail = page.locator('[data-netlab-nav-rail]');
    await expect(rail).toBeVisible();
    const labels = await rail
      .locator('[data-netlab-rail-item]')
      .evaluateAll((items) => items.map((item) => item.getAttribute('aria-label') ?? ''));
    expect(labels).not.toContain('Run');
    expect(labels).not.toContain('実行');
  });
});
