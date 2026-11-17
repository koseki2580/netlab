import { expect, test } from './fixtures/harness';

/** REQ-372 — RSTP roles, the alternate port taking over, and MST instances (TC-1783). */
test.use({ appLocale: 'ja', viewportPreset: 'desktop' });

test('TC-1783: predict, cut A–C, see C’s alternate take over; each MST instance rests another link', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/networking/rstp');
  const roles = page.getByTestId('rstp-roles');
  await expect(roles.locator('[data-role="alternate"]')).toHaveCount(1);
  await expect(page.getByTestId('rstp-cut-link')).toBeDisabled();

  await page.getByTestId('rstp-guess-cb').click();
  await page.getByTestId('rstp-cut-link').click();
  const result = page.getByTestId('rstp-cut-result');
  await expect(result).toHaveAttribute('data-right', 'true');
  await expect(
    page.getByTestId('rstp-roles-after').locator('[data-port="switch-c:cb"]'),
  ).toHaveAttribute('data-role', 'root');
  await expect(result).toContainText('30〜50 秒');
  await page.getByTestId('rstp-restore').click();

  await page.getByTestId('rstp-mst-1').click();
  await expect(page.getByTestId('rstp-mst-blocked')).toContainText('B–C');
  await page.getByTestId('rstp-mst-2').click();
  await expect(page.getByTestId('rstp-mst-blocked')).toContainText('A–C');
});
