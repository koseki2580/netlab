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

test.use({ viewportPreset: 'desktop' });

test('stepping onto R-1 marks the 203.0.113.0/24 row and says why', async ({
  page,
  lessonPage,
}) => {
  await lessonPage.open('/routing/client-server');
  await page.getByTestId(TID.send).first().click();

  const used = page.locator(`[data-testid="${TID.row}"][data-used="true"]`);
  await expect(used).toHaveCount(0);

  // The step button is the transport bar's step-forward button.
  const lesson = lessonPage.transport();
  await lesson.stepUntil(async () => (await used.count()) > 0);
  await expect(used).toHaveCount(1);

  await expect(used).toContainText('203.0.113.0/24');
  await expect(page.getByTestId(TID.verdict)).toContainText('203.0.113.10');
  await expect(page.getByTestId(TID.verdict)).toContainText('203.0.113.0/24');
});
