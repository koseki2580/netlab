import { expect, test } from './fixtures/harness';

/** REQ-382 — streaming telemetry: predict the poll's peak, then compare (TC-1863). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1863: the poll shows 20.7 % where the stream shows 100 %, and misses the outage ON_CHANGE reports', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/telemetry');
  await expect(page.getByTestId('telemetry-subscription')).toContainText('ON_CHANGE');
  await expect(page.getByTestId('telemetry-reveal-button')).toBeDisabled();
  await page.getByTestId('telemetry-guess-full').click();
  await page.getByTestId('telemetry-reveal-button').click();
  await expect(page.getByTestId('telemetry-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('telemetry-poll')).toHaveAttribute('data-peak', '20.7');
  await expect(page.getByTestId('telemetry-stream')).toHaveAttribute('data-peak', '100');
  await expect(page.getByTestId('telemetry-polled')).toHaveText('5:00 UP, 10:00 UP');
  await expect(page.getByTestId('telemetry-changes')).toHaveText('6:40 DOWN, 7:10 UP');
});
