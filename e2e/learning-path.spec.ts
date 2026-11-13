import type { Page } from '@playwright/test';
import { COURSE_STEPS, courseProgressId } from '../demo/course/courseSteps';
import { drawQuestions } from '../demo/course/examDraw';
import { examLevel } from '../demo/course/examLevels';
import { expect, test } from './fixtures/harness';

/**
 * TC-957..TC-960 — the learning path: seven stages, each passed by its
 * checkpoints or its test, the next thing to do first, nothing locked from
 * reading.
 */
const P = {
  page: 'path-page',
  next: 'path-next-link',
  allPassed: 'path-all-passed',
  stage: (n: number) => `path-stage-${n}`,
  title: (n: number) => `path-stage-${n}-title`,
  lock: (n: number) => `path-stage-${n}-lock`,
  lesson: (n: number) => `path-stage-${n}-lesson`,
  checkpoint: (n: number) => `path-stage-${n}-checkpoint`,
  coming: (n: number) => `path-stage-${n}-coming`,
  galleryLink: 'gallery-path-link',
  hubLink: 'exercises-path-link',
} as const;

const LEARNER = 'learner-path-e2e';

/** Open the path as a learner whose progress record holds `completions`. */
async function openPath(page: Page, completions: readonly string[] = []) {
  await page.addInitScript(
    ({ learner, ids }) => {
      const now = new Date().toISOString();
      window.localStorage.setItem(
        `netlab-progress:v1:${learner}`,
        JSON.stringify({
          schemaVersion: 1,
          learnerId: learner,
          completions: ids.map((id) => ({ kind: 'tutorial', id, completedAt: now })),
          updatedAt: now,
        }),
      );
    },
    { learner: LEARNER, ids: [...completions] },
  );
  await page.goto(`/#/path?learnerId=${LEARNER}`);
  await expect(page.getByTestId(P.page)).toBeVisible();
}

test.describe('the learning path at 1440×900', () => {
  test.use({ viewportPreset: 'desktop' });

  test('TC-957: a new learner starts with the course; a locked stage still opens', async ({
    page,
  }) => {
    await openPath(page);
    for (let n = 1; n <= 7; n += 1) await expect(page.getByTestId(P.stage(n))).toBeVisible();
    await expect(page.getByTestId(P.stage(1))).toHaveAttribute('data-state', 'open');
    await expect(page.getByTestId(P.stage(2))).toHaveAttribute('data-state', 'locked');

    const next = page.getByTestId(P.next);
    await expect(next).toHaveAttribute('data-stage', '1');
    await expect(next).toHaveAttribute('data-kind', 'course');

    await expect(page.getByTestId(P.lock(2))).toContainText('stage 1');
    await expect(page.getByTestId(P.coming(7))).toBeVisible();

    // Locked is about passing only: a lesson of a locked stage opens.
    const lesson = page.getByTestId(P.lesson(2)).first();
    await expect(lesson).toHaveAttribute('href', /#\/basic\/three-tier$/);
    await lesson.click();
    await expect(page).toHaveURL(/#\/basic\/three-tier$/);
  });

  test('TC-958, TC-1427: a kept test pass leaves the stage open, and tests are named by stage', async ({
    page,
  }) => {
    // The old level 2 test is stage 5's: its pass is kept, the stage is not passed (REQ-114).
    await openPath(page, ['course:exam:2']);
    const kept = page.getByTestId(P.checkpoint(5)).filter({ hasText: 'Stage 5 test' });
    await expect(kept).toHaveAttribute('data-passed', 'yes');
    await expect(page.getByTestId(P.stage(5))).not.toHaveAttribute('data-state', 'passed');
    await expect(page.getByTestId('path-stage-5-test-kept')).toContainText('exercises');
    for (let n = 1; n <= 7; n += 1) {
      await expect(page.getByTestId(P.stage(n)), `stage ${n}`).not.toHaveAttribute(
        'data-state',
        'passed',
      );
    }
    const next = page.getByTestId(P.next);
    await expect(next).toHaveAttribute('data-stage', '1');

    // Every test on the path is named by its stage, not by a level.
    const words = await page
      .getByTestId(/^path-stage-\d-checkpoint$/)
      .filter({ hasText: /test/i })
      .allTextContents();
    expect(words.length).toBe(8);
    for (const word of words) expect(word).toMatch(/Stage \d test( [12])?$/);
    await expect(page.getByTestId(P.page)).not.toContainText(/Level \d/);

    // And on the test page.
    await page.goto(`/#/course/exam/2?learnerId=${LEARNER}`);
    await expect(page.getByTestId('exam-level-2')).toHaveText('Stage 5 test');
    await expect(page.getByTestId('exam-level-3')).toHaveText('Stage 6 test 1');
    await expect(page.getByTestId('exam-path')).toContainText('Stage 5 test');
  });

  test('TC-960: the gallery and the exercise hub lead to the path', async ({ page }) => {
    await page.goto('/#/');
    await page.getByTestId(P.galleryLink).click();
    await expect(page.getByTestId(P.page)).toBeVisible();

    await page.goto('/#/exercises');
    await page.getByTestId(P.hubLink).click();
    await expect(page.getByTestId(P.page)).toBeVisible();
  });
});

test.describe('the stage tests at 1440×900', () => {
  test.use({ viewportPreset: 'desktop' });

  test('TC-965: once the course is done, the next thing is the stage 1 test', async ({ page }) => {
    await openPath(
      page,
      COURSE_STEPS.map((step) => courseProgressId(step.id)),
    );
    const next = page.getByTestId(P.next);
    await expect(next).toHaveAttribute('data-stage', '1');
    await expect(next).toHaveAttribute('data-kind', 'exam');
    await expect(next).toHaveAttribute('href', /#\/course\/exam\/5$/);
  });

  test('TC-966: with the course done, passing the stage 1 test passes stage 1', async ({
    page,
  }) => {
    // The course is done: the record holds it once, and the test adds to it (REQ-112).
    await page.addInitScript(
      ({ learner, ids }) => {
        const key = `netlab-progress:v1:${learner}`;
        if (window.localStorage.getItem(key)) return;
        const now = new Date().toISOString();
        window.localStorage.setItem(
          key,
          JSON.stringify({
            schemaVersion: 1,
            learnerId: learner,
            completions: ids.map((id) => ({ kind: 'tutorial', id, completedAt: now })),
            updatedAt: now,
          }),
        );
      },
      { learner: LEARNER, ids: COURSE_STEPS.map((step) => courseProgressId(step.id)) },
    );
    // A named seed fixes the ten the stage 1 test draws from its pool (REQ-194).
    await page.goto(`/#/course/exam/5?learnerId=${LEARNER}&examSeed=3`);
    // The tests are listed in the order of the stages: stage 1's comes first.
    const order = await page
      .getByTestId(/^exam-level-\d+$/)
      .evaluateAll((links) => links.map((link) => link.getAttribute('data-testid')));
    expect(order.slice(0, 3)).toEqual(['exam-level-5', 'exam-level-6', 'exam-level-7']);
    await expect(page.getByTestId('exam-path')).toHaveAttribute('data-level', '5');

    await page.getByTestId('exam-start').click();
    for (const [index, question] of drawQuestions(examLevel(5)!, 3).entries()) {
      await page.getByTestId(`exam-option-${index + 1}-${question.answer + 1}`).check();
    }
    await page.getByTestId('exam-submit').click();
    await expect(page.getByTestId('exam-score')).toHaveAttribute('data-passed', 'yes');

    await page.goto(`/#/path?learnerId=${LEARNER}`);
    await expect(page.getByTestId(P.stage(1))).toHaveAttribute('data-state', 'passed');
    await expect(page.getByTestId(P.stage(2))).toHaveAttribute('data-state', 'open');
  });
});

test.describe('the learning path on a phone, in Japanese', () => {
  test.use({ viewportPreset: 'phone', appLocale: 'ja' });

  test('TC-959: the stages are named in Japanese, fit the screen, and every control takes a finger', async ({
    page,
  }) => {
    await openPath(page);
    const names = [
      '準備',
      'LAN',
      'IP',
      'トランスポートとサービス',
      '企業ネットワーク',
      '事業者とデータセンター',
      '最新とクラウド',
    ];
    for (const [index, name] of names.entries()) {
      await expect(page.getByTestId(P.title(index + 1))).toContainText(name);
    }
    await expect(page.getByTestId(P.next)).toContainText('入門コース');

    const sideways = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(sideways).toBeLessThanOrEqual(0);

    const small = await page
      .getByTestId(P.page)
      .evaluate(
        (root) =>
          [...root.querySelectorAll<HTMLElement>('a[href], button')]
            .map((el) => el.getBoundingClientRect())
            .filter((box) => box.width > 0 && (box.width < 43.5 || box.height < 43.5)).length,
      );
    expect(small).toBe(0);
  });
});
