import { expect, test } from './fixtures/harness';

/** REQ-409 — TCP window scaling and SACK: predict, reveal, explore (TC-2138, TC-2139). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2138: without window scaling a 150 ms path gives 3.5 Mbit/s, shift 9 fills 1 Gbit/s, and stripping the option undoes it', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/tcp-options');
  await expect(page.getByTestId('tcpo-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('tcpo-table')).toHaveCount(0);
  await page.getByTestId('tcpo-guess-link').click();
  await page.getByTestId('tcpo-reveal-button').click();
  await expect(page.getByTestId('tcpo-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('tcpo-reveal')).toHaveAttribute('data-throughput', '3495200');
  await expect(page.getByTestId('tcpo-row-10')).toHaveAttribute('data-throughput', '52428000');
  await expect(page.getByTestId('tcpo-row-150')).toHaveAttribute('data-shift', '9');
  const path = page.getByTestId('tcpo-path');
  await expect(path).toHaveAttribute('data-bdp', '18750000');
  await expect(path).toHaveAttribute('data-throughput', '1000000000');
  await page.getByTestId('tcpo-rtt').fill('50');
  await expect(path).toHaveAttribute('data-shift', '7');
  await page.getByTestId('tcpo-strip-on').click();
  await expect(path).toHaveAttribute('data-throughput', '10485600');
});

test('TC-2139: three losses take 3 round trips without SACK and 1 with it, and the SACK blocks follow the losses', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/tcp-options');
  await page.getByTestId('tcpo-guess-few').click();
  await page.getByTestId('tcpo-reveal-button').click();
  await expect(page.getByTestId('tcpo-sack-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('tcpo-sack-result')).toHaveCount(0);
  await page.getByTestId('tcpo-sack-guess-one').click();
  await page.getByTestId('tcpo-sack-reveal-button').click();
  await expect(page.getByTestId('tcpo-sack-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('tcpo-ack')).toHaveAttribute('data-ack', '5');
  await expect(page.getByTestId('tcpo-block-1')).toHaveAttribute('data-left', '15');
  await expect(page.getByTestId('tcpo-block-1')).toHaveAttribute('data-right', '21');
  await expect(page.getByTestId('tcpo-block-3')).toHaveAttribute('data-left', '6');
  await expect(page.getByTestId('tcpo-block-3')).toHaveAttribute('data-right', '9');
  await expect(page.getByTestId('tcpo-recovery-newreno')).toHaveAttribute('data-rounds', '3');
  await expect(page.getByTestId('tcpo-recovery-sack')).toHaveAttribute('data-rounds', '1');
  await page.getByTestId('tcpo-seg-2').click();
  await expect(page.getByTestId('tcpo-ack')).toHaveAttribute('data-ack', '2');
  await expect(page.getByTestId('tcpo-recovery-newreno')).toHaveAttribute('data-rounds', '4');
  await expect(page.getByTestId('tcpo-recovery-sack')).toHaveAttribute('data-rounds', '1');
});
