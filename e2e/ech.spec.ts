import { expect, test } from './fixtures/harness';

/** REQ-378 — ECH: predict what an observer reads, then look at the bytes (TC-1843). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1843: without ECH the site is readable, with ECH only the public name is', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/ech');
  await expect(page.getByTestId('ech-reveal-button')).toBeDisabled();
  await page.getByTestId('ech-guess-plain-yes').click();
  await expect(page.getByTestId('ech-reveal-button')).toBeDisabled();
  // The second prediction is wrong on purpose.
  await page.getByTestId('ech-guess-ech-yes').click();
  await page.getByTestId('ech-reveal-button').click();
  await expect(page.getByTestId('ech-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('ech-readable')).toContainText('clinic.example');
  await page.getByTestId('ech-show-ech').click();
  await expect(page.getByTestId('ech-readable')).toContainText('cdn.example');
  await expect(page.getByTestId('ech-readable')).not.toContainText('clinic');
  await expect(page.getByTestId('ech-hex')).not.toBeEmpty();
  await expect(page.getByTestId('ech-limits')).toContainText('203.0.113.50');
});
