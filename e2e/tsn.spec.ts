import { expect, test } from './fixtures/harness';

/** REQ-446 — TSN: strict priority vs the 802.1Qbv time-aware shaper (TC-2587, TC-2588). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2587: under strict priority the control frame waits a whole 12.304 µs frame, 12.976 µs in all', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/tsn');
  await expect(page.getByTestId('tsn-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('tsn-reveal')).toHaveCount(0);
  await expect(page.getByTestId('tsn-blocking-diagram')).toHaveCount(0);
  await page.getByTestId('tsn-guess-own').click();
  await page.getByTestId('tsn-reveal-button').click();
  await expect(page.getByTestId('tsn-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('tsn-reveal')).toHaveAttribute('data-worst', '12976');
  await expect(page.getByTestId('tsn-reveal')).toHaveAttribute('data-blocking', '12304');
  await expect(page.getByTestId('tsn-blocking-diagram')).toBeVisible();
});

test('TC-2588: 802.1Qbv bounds it to 0.672 µs, and hops, rate and preemption change the table', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/tsn');
  await page.getByTestId('tsn-guess-blocked').click();
  await page.getByTestId('tsn-reveal-button').click();
  await expect(page.getByTestId('tsn-reveal')).toHaveAttribute('data-right', 'true');

  await expect(page.getByTestId('tsn-qbv-reveal-button')).toBeDisabled();
  await page.getByTestId('tsn-qbv-guess-blocked').click();
  await page.getByTestId('tsn-qbv-reveal-button').click();
  await expect(page.getByTestId('tsn-qbv-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('tsn-qbv-reveal')).toHaveAttribute('data-worst', '672');
  await expect(page.getByTestId('tsn-qbv-reveal')).toHaveAttribute('data-guard', '12304');

  await expect(page.getByTestId('tsn-row-priority')).toHaveAttribute('data-worst', '12976');
  await page.getByTestId('tsn-hops').fill('5');
  await expect(page.getByTestId('tsn-row-priority')).toHaveAttribute('data-worst', '64880');
  await expect(page.getByTestId('tsn-row-qbv')).toHaveAttribute('data-worst', '3360');
  await expect(page.getByTestId('tsn-row-qbv-preempt')).toHaveAttribute(
    'data-guard-share',
    '0.004704',
  );
  await page.getByTestId('tsn-rate-100').click();
  await expect(page.getByTestId('tsn-row-qbv')).toHaveAttribute('data-guard-share', '0.49216');
});
