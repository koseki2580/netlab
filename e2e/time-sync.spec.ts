import { expect, test } from './fixtures/harness';

/** REQ-434 — Time sync: NTP's four timestamps, an uneven path, PTP's transparent clock (TC-2456, TC-2457). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2456: NTP computes offset +25 ms and delay 20 ms, and an uneven path leaves half its asymmetry', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/time-sync');
  await expect(page.getByTestId('ts-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('ts-reveal')).toHaveCount(0);
  await expect(page.getByTestId('ts-asym')).toHaveCount(0);
  await page.getByTestId('ts-guess-raw').click();
  await page.getByTestId('ts-reveal-button').click();
  await expect(page.getByTestId('ts-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('ts-reveal')).toHaveAttribute('data-offset', '25');
  await expect(page.getByTestId('ts-reveal')).toHaveAttribute('data-delay', '20');

  await expect(page.getByTestId('ts-asym-reveal-button')).toBeDisabled();
  await page.getByTestId('ts-asym-guess-none').click();
  await page.getByTestId('ts-asym-reveal-button').click();
  await expect(page.getByTestId('ts-asym-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('ts-asym-reveal')).toHaveAttribute('data-error', '5');
  await expect(page.getByTestId('ts-slid-error')).toHaveAttribute('data-error', '5');
  await page.getByTestId('ts-forward').fill('24');
  await expect(page.getByTestId('ts-slid-error')).toHaveAttribute('data-error', '10');
});

test('TC-2457: a transparent clock removes the queues, leaving half the fibre asymmetry', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/time-sync');
  await page.getByTestId('ts-guess-right').click();
  await page.getByTestId('ts-reveal-button').click();
  await page.getByTestId('ts-asym-guess-half').click();
  await page.getByTestId('ts-asym-reveal-button').click();
  await expect(page.getByTestId('ts-asym-reveal')).toHaveAttribute('data-right', 'true');

  await expect(page.getByTestId('ts-ptp-reveal-button')).toBeDisabled();
  await page.getByTestId('ts-ptp-guess-queues').click();
  await page.getByTestId('ts-ptp-reveal-button').click();
  await expect(page.getByTestId('ts-ptp-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('ts-ptp-reveal')).toHaveAttribute('data-error', '-50');
  await expect(page.getByTestId('ts-ptp-ordinary')).toHaveAttribute('data-error', '189950');
  await page.getByTestId('ts-sync-wait').fill('1000');
  await expect(page.getByTestId('ts-ptp-ordinary')).toHaveAttribute('data-error', '489950');
  await expect(page.getByTestId('ts-ptp-transparent')).toHaveAttribute('data-error', '-50');
});

test('TC-2639: a challenge is reached by making the request’s trip out as long as the trip back', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/time-sync');
  await page.getByTestId('ts-guess-right').click();
  await page.getByTestId('ts-reveal-button').click();
  await page.getByTestId('ts-asym-guess-half').click();
  await page.getByTestId('ts-asym-reveal-button').click();
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('ts-ptp-guess-fibre').click();
  await page.getByTestId('ts-ptp-reveal-button').click();

  const first = page.getByTestId('challenge-exact');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-exact-hint')).toHaveCount(0);
  await page.getByTestId('challenge-exact-hint-button').click();
  await expect(page.getByTestId('challenge-exact-hint')).toBeVisible();

  await page.getByTestId('ts-forward').fill('4');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-exact-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
