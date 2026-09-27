import { expect, test } from './fixtures/harness';

/**
 * TC-LESSON-ROUTE-ROW — the route table shows the row the router used.
 *
 * The client-server lesson says R-1 "finds the row that matches 203.0.113.10",
 * but nothing marked it. When the current hop is R-1's forwarding decision, the
 * row it used is marked and the decision is stated under the table.
 */
const TID = {
  send: 'demo-primary-action',
  row: 'route-table-row',
  verdict: 'route-table-verdict',
};

test('stepping onto R-1 marks the 203.0.113.0/24 row and says why', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/client-server');
  await page.getByTestId(TID.send).first().click();

  const used = page.locator(`[data-testid="${TID.row}"][data-used="true"]`);
  await expect(used).toHaveCount(0);

  // The step button is the transport button whose aria-label is the step label.
  const step = page.locator('button[title="Step Forward"], button[title="1ステップ進む"]').first();
  await expect(async () => {
    if ((await used.count()) === 0 && (await step.isEnabled())) await step.click();
    await expect(used).toHaveCount(1, { timeout: 500 });
  }).toPass({ timeout: 20_000 });

  await expect(used).toContainText('203.0.113.0/24');
  await expect(page.getByTestId(TID.verdict)).toContainText('203.0.113.10');
  await expect(page.getByTestId(TID.verdict)).toContainText('203.0.113.0/24');
});
