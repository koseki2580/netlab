import { expect, test } from './fixtures/harness';

/** REQ-404 — MPLS TE: predict where CSPF places LSP 3, compare with IGP only, resize it, fast reroute (TC-2087..TC-2088). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-2087: CSPF puts the 4 Gbit/s LSP 3 back on A-B-Z, IGP only overloads A–B with 15 Gbit/s, and a bigger LSP 3 moves or is refused', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/mpls-te');
  await expect(page.getByTestId('te-reveal-button')).toBeDisabled();
  await expect(page.getByTestId('te-placement')).toHaveCount(0);
  await page.getByTestId('te-guess-A-C-Z').click();
  await page.getByTestId('te-reveal-button').click();
  await expect(page.getByTestId('te-reveal')).toHaveAttribute('data-right', 'false');
  await expect(page.getByTestId('te-lsp-lsp1')).toHaveAttribute('data-path', 'A-B-Z');
  await expect(page.getByTestId('te-lsp-lsp2')).toHaveAttribute('data-path', 'A-C-Z');
  await expect(page.getByTestId('te-lsp-lsp3')).toHaveAttribute('data-path', 'A-B-Z');
  await expect(page.getByTestId('te-igp-worst')).toHaveAttribute('data-load', '15');
  await expect(page.getByTestId('te-link-A-B')).toHaveAttribute('data-reserved', '10');
  await page.getByTestId('te-lsp3').fill('6');
  await expect(page.getByTestId('te-lsp-lsp3')).toHaveAttribute('data-path', 'A-E-Z');
  await page.getByTestId('te-lsp3').fill('7');
  await expect(page.getByTestId('te-lsp-lsp3')).toHaveAttribute('data-path', 'refused');
});

test('TC-2088: when B–Z fails, B bypasses over B-D-Z and A re-places LSP 1 on A-E-Z and LSP 3 on A-C-Z', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/mpls-te');
  await page.getByTestId('te-guess-A-B-Z').click();
  await page.getByTestId('te-reveal-button').click();
  await expect(page.getByTestId('te-reveal')).toHaveAttribute('data-right', 'true');
  await expect(page.getByTestId('te-protected')).toHaveAttribute('data-ids', 'lsp1,lsp3');
  await expect(page.getByTestId('te-bypass')).toHaveAttribute('data-path', 'B-D-Z');
  await expect(page.getByTestId('te-bypass-load')).toHaveAttribute('data-gbps', '10');
  await expect(page.getByTestId('te-after-lsp1')).toHaveAttribute('data-path', 'A-E-Z');
  await expect(page.getByTestId('te-after-lsp3')).toHaveAttribute('data-path', 'A-C-Z');
  await page.getByTestId('te-lsp3').fill('5');
  await expect(page.getByTestId('te-protected')).toHaveAttribute('data-ids', 'lsp1');
  await expect(page.getByTestId('te-bypass-load')).toHaveAttribute('data-gbps', '6');
});
