import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-170 — a reader who has said nothing is read as a learner.
 *
 * The brief holds the best teaching this lesson has: the goal in plain words,
 * what to watch for at which step, and a control to start. It was reaching
 * nobody — the audience defaulted to `pro`, which folds the brief into a strip,
 * so a first-time learner met a truncated chip and an unlabelled pill.
 */
test('a first visit opens the brief in full, and pro still folds it', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem('netlab-audience');
    } catch {
      /* no storage means no stored choice, which is this test's case anyway */
    }
  });

  await demoPage.goto('/routing/ospf-convergence');
  await expect(
    page.getByTestId(SEL.brief.fullCard),
    'the brief opens in full for someone who has chosen nothing',
  ).toBeVisible();
  await expect(page.getByTestId(SEL.brief.start)).toBeVisible();

  // Naming the audience still wins, and it is what folds the brief away.
  await page.goto('/?audience=pro#/routing/ospf-convergence');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.brief.strip)).toBeVisible();
  await expect(page.getByTestId(SEL.brief.fullCard)).toHaveCount(0);
});
