import { expect, test } from './fixtures/harness';

/** REQ-405 — route redistribution: predict AD, predict R2's path, apply a fix (TC-2096..TC-2097). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2096: the static route wins on AD, and removing it hands the route to the cheaper OSPF path', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/redistribution');
  await expect(page.getByTestId('redist-ad-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('redist-ad-table')).toHaveCount(0);
  await page.getByTestId('redist-ad-guess-rip-r9').click();
  await page.getByTestId('redist-ad-reveal-button').click();
  await expect(page.getByTestId('redist-ad-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('redist-ad-chosen')).toHaveAttribute('data-chosen', 'static');
  await page.getByTestId('redist-source-static').click();
  await expect(page.getByTestId('redist-ad-chosen')).toHaveAttribute('data-chosen', 'ospf-r8');
});

test('TC-2097: without a fix R2 goes the long way through OSPF; tags and a filter make it go direct', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/redistribution');
  await expect(page.getByTestId('redist-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('redist-tables')).toHaveCount(0);
  await page.getByTestId('redist-guess-direct').click();
  await page.getByTestId('redist-reveal-button').click();
  await expect(page.getByTestId('redist-reveal')).toHaveAttribute('data-right', 'false');
  const path = page.getByTestId('redist-path');
  await expect(path).toHaveAttribute('data-path', 'R2-O2-O1-R1-RA');
  await expect(path).toHaveAttribute('data-hops', '4');
  await expect(page.getByTestId('redist-row-R2-ospf')).toHaveAttribute('data-installed', 'true');
  await expect(page.getByTestId('redist-row-R2-rip')).toHaveAttribute('data-installed', 'false');
  await page.getByTestId('redist-fix-tag').click();
  await expect(path).toHaveAttribute('data-path', 'R2-RA');
  await expect(path).toHaveAttribute('data-hops', '1');
  await expect(page.getByTestId('redist-row-R2-rip')).toHaveAttribute('data-installed', 'true');
  await page.getByTestId('redist-fix-distance').click();
  await expect(page.getByTestId('redist-row-R2-ospf')).toHaveAttribute('data-ad', '125');
  await expect(path).toHaveAttribute('data-hops', '1');
});
