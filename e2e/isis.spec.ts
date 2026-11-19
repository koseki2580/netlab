import { expect, test } from './fixtures/harness';

/** REQ-392 — IS-IS: predict R1's path to R5's LAN, see adjacencies and ATT, change levels (TC-1969). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1969: two L1 routers in different areas form no adjacency, R1 defaults to R2, and L1/L2 on both ends opens the direct link', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/isis');
  await expect(page.getByTestId('isis-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('isis-adjacencies')).toHaveCount(0);
  await page.getByTestId('isis-guess-direct').click();
  await page.getByTestId('isis-reveal-button').click();
  await expect(page.getByTestId('isis-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('isis-adj-R1-R5')).toHaveAttribute('data-adj', 'none');
  await expect(page.getByTestId('isis-adj-R2-R4')).toHaveAttribute('data-adj', 'L2');
  await expect(page.getByTestId('isis-route-default')).toHaveAttribute('data-next-hop', 'R2');
  await expect(page.getByTestId('isis-route-default')).toHaveAttribute('data-metric', '10');
  await expect(page.getByTestId('isis-trace')).toHaveAttribute('data-hops', 'R1 R2 R4 R5');
  await expect(page.getByTestId('isis-trace')).toHaveAttribute('data-metric', '30');
  await page.getByTestId('isis-level-R1-L1L2').click();
  await page.getByTestId('isis-level-R5-L1L2').click();
  await expect(page.getByTestId('isis-adj-R1-R5')).toHaveAttribute('data-adj', 'L2');
  await expect(page.getByTestId('isis-trace')).toHaveAttribute('data-hops', 'R1 R5');
  await expect(page.getByTestId('isis-trace')).toHaveAttribute('data-metric', '10');
  await expect(page.getByTestId('isis-route-default')).toHaveCount(0);
});
