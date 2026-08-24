import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-024 — opening the same device twice leaves it in the same place.
 *
 * Opening a device pans the canvas so the device is not left under the detail
 * panel. That pan has to aim at an absolute position: nudging the viewport by
 * a panel-width each time drifts a little further with every selection, and
 * after a few the topology has wandered off the canvas — with nothing visibly
 * wrong until the learner cannot find their network any more.
 */
test('opening the same device repeatedly does not drift the canvas', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/arp');

  const canvas = page.getByTestId(SEL.canvas.root).first();
  const device = page.getByTestId(SEL.canvas.node).first();
  await expect(device).toBeVisible();

  const openAndMeasure = async () => {
    await device.click();
    await expect(page.getByTestId(SEL.nodeDetail.closePanel)).toBeVisible();
    await page.waitForTimeout(400);
    const box = (await device.boundingBox())!;
    // Clicking empty canvas clears the selection, which is how a learner
    // dismisses the panel without reaching for its close button.
    await canvas.click({ position: { x: 6, y: 6 } });
    await expect(page.getByTestId(SEL.nodeDetail.closePanel)).toHaveCount(0);
    return box;
  };

  const first = await openAndMeasure();
  const second = await openAndMeasure();
  const third = await openAndMeasure();

  expect(second.x, 'the second opening puts the device where the first did').toBeCloseTo(
    first.x,
    0,
  );
  expect(third.x, 'and so does the third').toBeCloseTo(first.x, 0);
  expect(third.y).toBeCloseTo(first.y, 0);

  const canvasBox = (await canvas.boundingBox())!;
  expect(third.x).toBeGreaterThanOrEqual(canvasBox.x - 1);
  expect(third.x + third.width).toBeLessThanOrEqual(canvasBox.x + canvasBox.width + 1);
});
