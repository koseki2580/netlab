import { expect, test } from './fixtures/harness';

/** REQ-412 — HTTP caching: predict no-cache, then follow the browser and CDN over time (TC-2169). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2169: no-cache revalidates to a 304, the CDN answers the image itself, and a deploy reaches only revalidated files', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/http-cache');
  await expect(page.getByTestId('cache-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('cache-timeline')).toHaveCount(0);
  await page.getByTestId('cache-guess-download').click();
  await page.getByTestId('cache-reveal-button').click();
  await expect(page.getByTestId('cache-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('cache-reveal')).toHaveAttribute('data-status', '304');

  await expect(page.getByTestId('cache-policy-image')).toHaveAttribute('data-cdn-ttl', '86400');
  await expect(page.getByTestId('cache-policy-image')).toHaveAttribute('data-browser-ttl', '60');
  await expect(page.getByTestId('cache-policy-account')).toHaveAttribute('data-cdn-store', 'false');

  await expect(page.getByTestId('cache-totals')).toHaveAttribute('data-origin-hits', '5');
  await page.getByTestId('cache-time-120').click();
  await expect(page.getByTestId('cache-row-image')).toHaveAttribute('data-cdn', 'hit');
  await expect(page.getByTestId('cache-row-image')).toHaveAttribute('data-origin', 'false');
  await expect(page.getByTestId('cache-row-index')).toHaveAttribute('data-status', '304');
  await expect(page.getByTestId('cache-totals')).toHaveAttribute('data-origin-hits', '3');

  await page.getByTestId('cache-deploy').click();
  await expect(page.getByTestId('cache-row-index')).toHaveAttribute('data-status', '200');
  await expect(page.getByTestId('cache-row-index')).toHaveAttribute('data-version', '2');
  await expect(page.getByTestId('cache-row-style')).toHaveAttribute('data-browser', 'fresh');
  await expect(page.getByTestId('cache-row-style')).toHaveAttribute('data-version', '1');
});

test('TC-2689: after the reveal, deploying and moving the last visit to 60 min reaches the first challenge', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/http-cache');
  await expect(page.getByTestId('challenges')).toHaveCount(0);
  await page.getByTestId('cache-guess-revalidate').click();
  await page.getByTestId('cache-reveal-button').click();
  const first = page.getByTestId('challenge-new-style');
  await expect(first).toHaveAttribute('data-reached', 'false');
  await expect(page.getByTestId('challenge-new-style-hint')).toHaveCount(0);
  await page.getByTestId('challenge-new-style-hint-button').click();
  await expect(page.getByTestId('challenge-new-style-hint')).toBeVisible();
  await page.getByTestId('cache-deploy').click();
  await page.getByTestId('cache-last-visit').fill('3600');
  await page.getByTestId('cache-time-last').click();
  await expect(page.getByTestId('cache-row-style')).toHaveAttribute('data-version', '2');
  await expect(first).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenge-new-style-why')).toBeVisible();
  // A copy an hour old is also revalidated by the browser and answered by the CDN,
  // so the same load reaches cdn-304 too: the count counts both.
  await expect(page.getByTestId('challenge-cdn-304')).toHaveAttribute('data-reached', 'true');
  await expect(page.getByTestId('challenges-count')).toHaveAttribute('data-reached', '2');
});
