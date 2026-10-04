import type { Locator, Page } from '@playwright/test';
import { optionOrder } from '../demo/course/examAttempt';
import { EXAM_LEVELS } from '../demo/course/examLevels';
import { EXAM_QUESTIONS } from '../demo/course/examQuestions';
import { expect, test } from './fixtures/harness';
import type { DemoPage } from './pages/DemoPage';

/**
 * TC-323 to TC-329 — the final test is taken after studying, cannot be passed
 * from the position of an option, shows what was chosen and what was right,
 * and keeps the attempt while the learner goes to a lesson and comes back.
 *
 * Learners with no IT background all passed the earlier test, mostly by
 * recognising sentences: the questions sat beside the study list, the options
 * never moved, and after marking the result was off-screen, the chosen option
 * unmarked, and a lesson opened from the test had no way back to it.
 */
async function useJapanese(page: Page, theme?: 'light' | 'dark') {
  await page.addInitScript((mode) => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
      if (mode) window.localStorage.setItem('netlab-theme-mode', mode);
    } catch {
      /* the test is still usable in English, in the dark theme */
    }
  }, theme);
}

async function startExam(page: Page, demoPage: DemoPage, route = '/course/exam') {
  await demoPage.goto(route);
  await page.getByTestId('exam-start').click();
  await expect(page.getByTestId('exam-question-1')).toBeVisible();
}

async function answerAllNotLearnedAndMark(page: Page) {
  for (let n = 1; n <= 10; n += 1) await page.getByTestId(`exam-option-${n}-x`).check();
  await page.getByTestId('exam-submit').click();
  await expect(page.getByTestId('exam-score')).toHaveAttribute('data-score', '0');
}

/** The radios of one question, as test ids, in the order they are displayed. */
async function displayedOptions(page: Page, n: number): Promise<string[]> {
  return page
    .getByTestId(`exam-question-${n}`)
    .getByTestId(new RegExp(`^exam-option-${n}-`))
    .evaluateAll((radios) => radios.map((radio) => radio.getAttribute('data-testid') ?? ''));
}

/** WCAG contrast of an element's text against everything painted behind it. */
async function contrastOf(link: Locator): Promise<number> {
  return link.evaluate((element) => {
    const parse = (colour: string): [number, number, number, number] => {
      const match = /rgba?\(([^)]+)\)/.exec(colour);
      if (!match?.[1]) throw new Error(`cannot read the colour ${colour}`);
      const [r = 0, g = 0, b = 0, a = 1] = match[1]
        .split(/[\s,/]+/)
        .filter(Boolean)
        .map(Number);
      return [r, g, b, a];
    };
    const layers: [number, number, number, number][] = [];
    for (let node: Element | null = element; node; node = node.parentElement) {
      layers.unshift(parse(getComputedStyle(node).backgroundColor));
    }
    let behind: [number, number, number] = [255, 255, 255];
    for (const [r, g, b, a] of layers) {
      behind = [
        r * a + behind[0] * (1 - a),
        g * a + behind[1] * (1 - a),
        b * a + behind[2] * (1 - a),
      ];
    }
    const luminance = ([r, g, b]: readonly number[]) => {
      const channel = (value = 0) => {
        const unit = value / 255;
        return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const text = luminance(parse(getComputedStyle(element).color));
    const ground = luminance(behind);
    return (Math.max(text, ground) + 0.05) / (Math.min(text, ground) + 0.05);
  });
}

test('TC-323: the questions are hidden until the test is started', async ({ page, demoPage }) => {
  await useJapanese(page);
  await demoPage.goto('/course/exam');

  await expect(page.getByTestId('exam-path')).toBeVisible();
  await expect(page.getByTestId('exam-start-note')).toContainText('テストを始める');
  await expect(page.getByTestId('exam-question-1')).toHaveCount(0);
  await expect(page.getByTestId('exam-submit')).toHaveCount(0);

  await page.getByTestId('exam-start').click();
  await expect(page.getByTestId('exam-question-1')).toBeVisible();
  await expect(page.getByTestId('exam-question-10')).toBeVisible();
  await expect(page.getByTestId('exam-start')).toHaveCount(0);
});

test('TC-324: each attempt shows the options in a new order, "not learned" last', async ({
  page,
  demoPage,
}) => {
  await useJapanese(page);
  await startExam(page, demoPage, '/course/exam?examSeed=1');

  const expected = (seed: number, n: number) => [
    ...optionOrder(seed, n - 1).map((k) => `exam-option-${n}-${k + 1}`),
    `exam-option-${n}-x`,
  ];
  const first: string[][] = [];
  for (let n = 1; n <= 10; n += 1) {
    const shown = await displayedOptions(page, n);
    expect(shown, `question ${n}, seed 1`).toEqual(expected(1, n));
    first.push(shown);
  }

  // An option keeps the text of its original position wherever it is shown.
  for (const [index, question] of EXAM_QUESTIONS.entries()) {
    for (const [k, option] of question.options.entries()) {
      await expect(page.getByTestId(`exam-option-row-${index + 1}-${k + 1}`)).toContainText(
        option.ja,
      );
    }
  }

  // "Try again" is the next attempt: with a named seed, the next whole number.
  await page.getByTestId('exam-submit').click();
  await page.getByTestId('exam-retry').click();
  await expect(page.getByTestId('exam-score')).toHaveCount(0);
  const second: string[][] = [];
  for (let n = 1; n <= 10; n += 1) {
    const shown = await displayedOptions(page, n);
    expect(shown, `question ${n}, seed 2`).toEqual(expected(2, n));
    second.push(shown);
  }
  expect(second).not.toEqual(first);
});

test('TC-325: after marking, the score is in view and each answer is named in words', async ({
  page,
  demoPage,
}) => {
  await useJapanese(page);
  await startExam(page, demoPage);

  const [one, two, three] = EXAM_QUESTIONS;
  const wrong = ((two!.answer + 1) % 4) + 1;
  await page.getByTestId(`exam-option-1-${one!.answer + 1}`).check();
  await page.getByTestId(`exam-option-2-${wrong}`).check();
  for (let n = 3; n <= 10; n += 1) await page.getByTestId(`exam-option-${n}-x`).check();
  await page.getByTestId('exam-submit').click();

  const score = page.getByTestId('exam-score');
  await expect(score).toHaveAttribute('data-score', '1');
  await expect(score).toBeInViewport();
  await expect(score).toBeFocused();

  // Answered right: the chosen option is named, and nothing else is.
  await expect(
    page.getByTestId(`exam-option-row-1-${one!.answer + 1}`).getByTestId('exam-your-answer-1'),
  ).toContainText('あなたの答え');
  await expect(page.getByTestId('exam-correct-answer-1')).toHaveCount(0);

  // Answered wrong: the chosen option and the right one are both named.
  await expect(
    page.getByTestId(`exam-option-row-2-${wrong}`).getByTestId('exam-your-answer-2'),
  ).toContainText('あなたの答え');
  await expect(
    page.getByTestId(`exam-option-row-2-${two!.answer + 1}`).getByTestId('exam-correct-answer-2'),
  ).toContainText('正解');

  // "Not learned": that row is the learner's answer, and the right one is shown.
  await expect(
    page.getByTestId('exam-option-row-3-x').getByTestId('exam-your-answer-3'),
  ).toBeVisible();
  await expect(
    page.getByTestId(`exam-option-row-3-${three!.answer + 1}`).getByTestId('exam-correct-answer-3'),
  ).toBeVisible();
});

test('TC-326: the attempt survives a reload and a visit to a lesson, until "try again"', async ({
  page,
  demoPage,
}) => {
  await useJapanese(page);
  await startExam(page, demoPage);
  await answerAllNotLearnedAndMark(page);

  await page.reload();
  await expect(page.getByTestId('exam-score')).toHaveAttribute('data-score', '0');
  await expect(page.getByTestId('exam-option-4-x')).toBeChecked();

  await page.getByTestId('exam-review-5').click();
  await expect(page).toHaveURL(/#\/networking\/arp/);
  await page.getByTestId('demo-shell-back-to-exam').click();
  await expect(page).toHaveURL(/#\/course\/exam$/);
  await expect(page.getByTestId('exam-score')).toHaveAttribute('data-score', '0');
  await expect(page.getByTestId('exam-score')).toBeInViewport();
  await expect(page.getByTestId('exam-option-4-x')).toBeChecked();
  await expect(page.getByTestId('exam-review-5')).toBeVisible();

  await page.getByTestId('exam-retry').click();
  await expect(page.getByTestId('exam-score')).toHaveCount(0);
  await expect(page.getByTestId('exam-option-4-x')).not.toBeChecked();
  await page.reload();
  await expect(page.getByTestId('exam-question-1')).toBeVisible();
  await expect(page.getByTestId('exam-score')).toHaveCount(0);
  await expect(page.getByTestId('exam-option-4-x')).not.toBeChecked();
});

test('TC-327: a lesson opened from the test offers the way back to it', async ({
  page,
  demoPage,
}) => {
  await useJapanese(page);
  await demoPage.goto('/course/exam');
  await page.getByTestId('exam-path-arp').click();
  await expect(page).toHaveURL(/#\/networking\/arp/);
  await expect(page.getByTestId('demo-shell-back-to-exam')).toContainText('テストに戻る');

  // The gallery button is still there and still opens the gallery.
  await page.getByTestId('demo-shell-back').click();
  await expect(page).toHaveURL(/#\/$/);

  // Opened by its own address, the lesson offers only the gallery.
  await demoPage.goto('/networking/arp');
  await expect(page.getByTestId('demo-shell-back')).toBeVisible();
  await expect(page.getByTestId('demo-shell-back-to-exam')).toHaveCount(0);

  // From another level, the way back leads to that level.
  await demoPage.goto('/course/exam/2');
  await page.getByTestId(`exam-path-${EXAM_LEVELS[1]!.path[0]!.id}`).click();
  await page.getByTestId('demo-shell-back-to-exam').click();
  await expect(page).toHaveURL(/#\/course\/exam\/2$/);
  await expect(page.getByTestId('exam-path')).toHaveAttribute('data-level', '2');
});

for (const theme of ['dark', 'light'] as const) {
  test(`TC-328: links on the test are readable in the ${theme} theme`, async ({
    page,
    demoPage,
  }) => {
    await useJapanese(page, theme);
    await startExam(page, demoPage);
    await answerAllNotLearnedAndMark(page);

    for (const id of ['exam-path-course', 'exam-path-arp', 'exam-review-1', 'exam-review-10']) {
      expect(await contrastOf(page.getByTestId(id)), `${id} in ${theme}`).toBeGreaterThanOrEqual(
        4.5,
      );
    }
  });
}

test('TC-328: a review link is a comfortable tap target on a phone', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await useJapanese(page);
  await startExam(page, demoPage);
  await answerAllNotLearnedAndMark(page);

  for (const n of [1, 5, 10]) {
    const box = await page.getByTestId(`exam-review-${n}`).boundingBox();
    expect(box?.height ?? 0, `review link ${n}`).toBeGreaterThanOrEqual(44);
  }
});

test('TC-329: each level keeps its own attempt behind its own start button', async ({
  page,
  demoPage,
}) => {
  await useJapanese(page);
  await startExam(page, demoPage);
  await page.getByTestId('exam-option-1-x').check();

  await page.getByTestId('exam-level-2').click();
  await expect(page.getByTestId('exam-path')).toHaveAttribute('data-level', '2');
  await expect(page.getByTestId('exam-start')).toBeVisible();
  await expect(page.getByTestId('exam-question-1')).toHaveCount(0);
  await page.getByTestId('exam-start').click();
  await expect(page.getByTestId('exam-option-1-x')).not.toBeChecked();

  await page.getByTestId('exam-level-1').click();
  await expect(page.getByTestId('exam-path')).toHaveAttribute('data-level', '1');
  await expect(page.getByTestId('exam-option-1-x')).toBeChecked();
});
