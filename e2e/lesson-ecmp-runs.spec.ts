import { expect, test } from './fixtures/harness';

/**
 * TC-293 — each press of "Send ECMP flows" is its own run in the list.
 *
 * Two presses used to leave 16 rows with nothing between them, so seeing that
 * the second run repeated the first meant comparing rows 1–8 with 9–16 by eye.
 */
const SEND = 'ecmp-send';
const row = (n: number) => `ecmp-decision-${n}`;

test('each press is a headed run with a tally, and a repeat is called a repeat', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/ecmp');

  await page.getByTestId(SEND).click();
  await expect(page.getByTestId(row(8))).toBeVisible();
  await expect(page.getByTestId('ecmp-run-1-heading')).toHaveText('Run 1');
  await expect(page.getByTestId('ecmp-run-1-tally')).toHaveText(
    'via 10.0.12.2: 5 · via 10.0.13.2: 3',
  );
  await expect(page.getByTestId('ecmp-run-1-repeat')).toHaveCount(0);
  await expect(page.getByTestId('ecmp-run-2-heading')).toHaveCount(0);

  await page.getByTestId(SEND).click();
  await expect(page.getByTestId(row(16))).toBeVisible();
  await expect(page.getByTestId('ecmp-run-2-heading')).toHaveText('Run 2');
  await expect(page.getByTestId('ecmp-run-2-tally')).toHaveText(
    'via 10.0.12.2: 5 · via 10.0.13.2: 3',
  );
  await expect(page.getByTestId('ecmp-run-2-repeat')).toHaveText(
    'Identical to run 1: the same flow always hashes to the same path.',
  );
  // Each run holds its own eight rows.
  await expect(page.getByTestId('ecmp-run-1').getByTestId(row(8))).toBeVisible();
  await expect(page.getByTestId('ecmp-run-2').getByTestId(row(9))).toBeVisible();
});

test('the runs, tally and repeat line are in Japanese for a Japanese learner', async ({
  page,
  demoPage,
}) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* the lesson still renders; the Japanese text below would then fail */
    }
  });
  await demoPage.goto('/networking/ecmp');

  await page.getByTestId(SEND).click();
  await expect(page.getByTestId(row(8))).toBeVisible();
  await page.getByTestId(SEND).click();
  await expect(page.getByTestId(row(16))).toBeVisible();

  await expect(page.getByTestId('ecmp-run-1-heading')).toHaveText('1 回目');
  await expect(page.getByTestId('ecmp-run-2-heading')).toHaveText('2 回目');
  await expect(page.getByTestId('ecmp-run-2-tally')).toHaveText(
    '10.0.12.2 経由: 5 · 10.0.13.2 経由: 3',
  );
  await expect(page.getByTestId('ecmp-run-2-repeat')).toHaveText(
    '1 回目とまったく同じです。同じフローは、ハッシュ値が変わらないので必ず同じ経路を通ります。',
  );
});
