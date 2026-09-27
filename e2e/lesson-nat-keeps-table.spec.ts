import { expect, test } from './fixtures/harness';

/**
 * TC-LESSON-NAT-KEEP — replaying on the NAT lesson keeps the shared table.
 *
 * The shared 「▶ パケットを送る」 reset the engine, so after sending from Client
 * A and B the table dropped back to one row. The NAT lesson no longer offers
 * that generic send; stepping through the last send keeps both rows.
 */
const TID = {
  sendA: 'nat-send-client-a',
  sendB: 'nat-send-client-b',
  genericSend: 'demo-primary-action',
  insideGlobal: 'nat-inside-global',
  controlsNote: 'nat-controls-note',
};

test('both translations survive replaying the last send', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/simulation/nat');

  await expect(page.getByTestId(TID.genericSend)).toHaveCount(0);
  await expect(page.getByTestId(TID.controlsNote)).toBeVisible();

  await page.getByTestId(TID.sendA).click();
  await expect(page.getByTestId(TID.insideGlobal)).toHaveCount(1);
  await page.getByTestId(TID.sendB).click();
  await expect(page.getByTestId(TID.insideGlobal)).toHaveCount(2);

  const step = page.locator('button[title="Step Forward"], button[title="1ステップ進む"]').first();
  for (let i = 0; i < 3; i += 1) {
    await step.click();
  }
  await expect(page.getByTestId(TID.insideGlobal)).toHaveCount(2);
});
