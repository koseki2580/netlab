import { expect, test } from './fixtures/harness';

/**
 * The subnetting drill's primer opens on the one rule a beginner needs — which
 * numbers are the network at /24 — before any bit-level arithmetic.
 */
test('the primer opens with the plain /24 rule', async ({ page }) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('netlab-locale', 'ja');
    } catch {
      /* English is fine too */
    }
  });
  await page.goto('/#/learning/subnetting');

  const primer = page.getByTestId('subnet-drill-concept');
  await primer.locator('summary').click();

  const rule = primer.getByTestId('subnet-drill-primer-rule');
  await expect(rule).toBeVisible();
  await expect(rule).toContainText(
    '/24（マスク 255.255.255.0）なら最初の 3 つの数がネットワーク、最後の数が機器',
  );
  await expect(rule).toContainText('ネットワークの部分が同じなら同じネットワーク');
});
