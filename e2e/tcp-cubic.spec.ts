import { expect, test } from './fixtures/harness';

/** REQ-436 — CUBIC and RACK-TLP: predict Reno's recovery and a tail-loss repair, compare, change the path (TC-2478). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2478: Reno needs about 69 min where CUBIC needs 39.7 s, and TLP resends a lost tail at 150 ms instead of 1,050 ms', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/tcp-cubic');

  await expect(page.getByTestId('cubic-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('cubic-results')).toHaveCount(0);
  await page.getByTestId('cubic-guess-minute').click();
  await page.getByTestId('cubic-reveal-button').click();
  await expect(page.getByTestId('cubic-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('cubic-row-reno')).toHaveAttribute('data-ms', '4166650');
  await expect(page.getByTestId('cubic-row-cubic')).toHaveAttribute('data-ms', '39685');
  await page.getByTestId('cubic-rtt').fill('200');
  await expect(page.getByTestId('cubic-row-reno')).toHaveAttribute('data-ms', '16666700');

  await expect(page.getByTestId('tlp-reveal-button')).toBeDisabled();
  await page.getByTestId('tlp-guess-never').click();
  await page.getByTestId('tlp-reveal-button').click();
  await expect(page.getByTestId('tlp-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('tlp-row-tlp')).toHaveAttribute('data-first', '150');
  await expect(page.getByTestId('tlp-row-rto')).toHaveAttribute('data-first', '1050');
  await page.getByTestId('tlp-lost').fill('1');
  await expect(page.getByTestId('tlp-row-tlp')).toHaveAttribute('data-first', '350');
});

test('TC-2641: a challenge is reached by choosing a small, short path where Reno is back first', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/tcp-cubic');
  await page.getByTestId('cubic-guess-hour').click();
  await page.getByTestId('cubic-reveal-button').click();
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('tlp-guess-few-rtts').click();
  await page.getByTestId('tlp-reveal-button').click();

  const first = page.getByTestId('challenge-reno-first');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-reno-first-hint')).toHaveCount(0);
  await page.getByTestId('challenge-reno-first-hint-button').click();
  await expect(page.getByTestId('challenge-reno-first-hint')).toBeVisible();

  await page.getByTestId('cubic-speed-100000000').click();
  await page.getByTestId('cubic-rtt').fill('30');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-reno-first-why')).toBeVisible();
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '1');
});
