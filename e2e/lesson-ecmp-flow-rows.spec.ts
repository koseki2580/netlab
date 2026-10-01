import { expect, test } from './fixtures/harness';

/**
 * TC-262 — every ECMP decision row names its flow and its source port.
 *
 * The rows were unnumbered and showed no port, so finding flows 3, 5 and 8
 * meant counting up to 16 rows by hand.
 */
const SEND = 'ecmp-send';
const row = (n: number) => `ecmp-decision-${n}`;
const VIA_SPINE_2 = new Set([3, 5, 8]);

test('ECMP decision rows are numbered per burst and show the source port', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/ecmp');

  for (const burst of [0, 1]) {
    await page.getByTestId(SEND).click();
    await expect(page.getByTestId(row(burst * 8 + 8))).toBeVisible();

    for (let flow = 1; flow <= 8; flow += 1) {
      const nextHop = VIA_SPINE_2.has(flow) ? '10.0.13.2' : '10.0.12.2';
      const bucket = VIA_SPINE_2.has(flow) ? 2 : 1;
      await expect(page.getByTestId(row(burst * 8 + flow))).toHaveText(
        `flow ${flow} · source port ${49151 + flow} · bucket ${bucket}/2 via ${nextHop}`,
      );
    }
  }
});

test('ECMP decision rows are in Japanese for a Japanese learner', async ({ page, demoPage }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* the lesson still renders; the Japanese text below would then fail */
    }
  });
  await demoPage.goto('/networking/ecmp');

  await page.getByTestId(SEND).click();
  await expect(page.getByTestId(row(3))).toHaveText(
    'フロー 3 · 送信元ポート 49154 · バケット 2/2 → 次ホップ 10.0.13.2',
  );
});
