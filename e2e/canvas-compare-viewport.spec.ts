import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-022 — the two canvases in compare mode stay locked together.
 *
 * Comparing a topology before and after an edit only works if both sides show
 * the same part of it at the same size; a learner who zooms one and finds the
 * other unchanged is comparing two different pictures. The lock is the host
 * driving both canvases from one viewport, so it is a canvas contract rather
 * than anything the graph engine offers.
 */
test('zooming one compare canvas zooms the other', async ({ page, sandboxPage }) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/networking/mtu-fragmentation');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await sandboxPage.toggleMode();
  const canvases = page.getByTestId(SEL.canvas.root);
  await expect(canvases).toHaveCount(2);

  const deviceIn = (index: number) => canvases.nth(index).getByTestId(SEL.canvas.node).first();
  await expect(deviceIn(1)).toBeVisible();

  const widthOf = async (index: number) => (await deviceIn(index).boundingBox())?.width ?? 0;
  const beforeLeft = await widthOf(0);
  const beforeRight = await widthOf(1);
  expect(beforeLeft, 'both canvases start at the same zoom').toBeCloseTo(beforeRight, 0);

  await deviceIn(0).hover();
  for (let i = 0; i < 3; i += 1) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(200);
  }

  const afterLeft = await widthOf(0);
  const afterRight = await widthOf(1);
  expect(afterLeft, 'the canvas under the pointer zoomed out').toBeLessThan(beforeLeft - 1);
  expect(afterRight, 'the other canvas followed it').toBeCloseTo(afterLeft, 0);
});
