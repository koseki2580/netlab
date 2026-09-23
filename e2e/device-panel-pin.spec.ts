import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-172 — pinning the device panel keeps it on screen, and it comes back.
 *
 * Pinned mode was laid out in flow inside a block host, so the panel stacked
 * below a full-height canvas and left the viewport — measured at y=900 in a
 * 900px window. The mode is remembered, so from then on every device press
 * appeared to do nothing, in that browser, for good.
 */
test('a pinned device panel stays visible, and stays so on the next visit', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/client-server');

  await page.getByTestId(SEL.canvas.node).first().click();
  const panel = page.locator('[data-netlab-dp]');
  await expect(panel).toBeVisible();

  await page.locator('[data-netlab-dp-mode-toggle]').click();
  await expect(panel).toHaveAttribute('data-dp-mode', 'pinned');
  await expect(panel, 'the pinned panel is still on screen').toBeVisible();

  const box = await panel.boundingBox();
  expect(box, 'the pinned panel has a box').not.toBeNull();
  expect(box!.y, 'it sits inside the window, not below it').toBeLessThan(900);
  expect(box!.y + box!.height, 'and its top half is visible').toBeGreaterThan(0);

  // The mode is remembered; a learner who pinned it once must still get a panel.
  await demoPage.goto('/routing/client-server');
  await page.getByTestId(SEL.canvas.node).first().click();
  const again = page.locator('[data-netlab-dp]');
  await expect(again).toHaveAttribute('data-dp-mode', 'pinned');
  await expect(again, 'a remembered pin still opens a visible panel').toBeVisible();
});
