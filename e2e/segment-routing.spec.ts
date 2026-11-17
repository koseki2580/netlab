import { expect, test } from './fixtures/harness';

/** REQ-375 — the SID stack R1 pushes is the path (TC-1813). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1813: one SID takes R2, two SIDs steer through R3; each prediction is checked', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/segment-routing');
  await expect(page.getByTestId('sr-sids')).toContainText('16004');
  await expect(page.getByTestId('sr-send-shortest')).toBeDisabled();
  await page.getByTestId('sr-guess-shortest-R1R2R4').click();
  await page.getByTestId('sr-send-shortest').click();
  await expect(page.getByTestId('sr-result-shortest')).toHaveAttribute('data-path', 'R1, R2, R4');
  await expect(page.getByTestId('sr-result-shortest')).toHaveAttribute('data-right', 'true');

  await page.getByTestId('sr-policy-via-r3').click();
  // Predicting the shortest path again: wrong on purpose.
  await page.getByTestId('sr-guess-via-r3-R1R2R4').click();
  await page.getByTestId('sr-send-via-r3').click();
  const result = page.getByTestId('sr-result-via-r3');
  await expect(result).toHaveAttribute('data-path', 'R1, R3, R4');
  await expect(result).toHaveAttribute('data-right', 'false');
  await expect(result).toContainText('R3: pop 16003 | 16004 → 16004');
});
