import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-033 — the editor opens with its topology framed.
 *
 * Opening a saved topology and finding it crammed into one corner of a large
 * canvas, at whatever scale it happened to be saved at, makes the learner pan
 * and zoom before they can read anything. The simulator canvas frames what it
 * draws; the editor did not, because framing would have moved the canvas away
 * from where the palette dropped new elements. It no longer drops them there.
 */
test('opening the editor centres the topology in the canvas', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await demoPage.goto('/editor');

  const canvas = page.getByTestId(SEL.editor.canvas);
  await expect(canvas).toBeVisible();
  const devices = page.getByTestId(SEL.canvas.node);
  await expect(devices.first()).toBeVisible();
  await page.waitForTimeout(800);

  const frame = (await canvas.boundingBox())!;
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  const count = await devices.count();
  for (let index = 0; index < count; index += 1) {
    const box = await devices.nth(index).boundingBox();
    if (!box) continue;
    left = Math.min(left, box.x);
    right = Math.max(right, box.x + box.width);
    top = Math.min(top, box.y);
    bottom = Math.max(bottom, box.y + box.height);
  }
  expect(Number.isFinite(left), 'devices were measured').toBe(true);

  const offCentreX = Math.abs((left + right) / 2 - (frame.x + frame.width / 2));
  const offCentreY = Math.abs((top + bottom) / 2 - (frame.y + frame.height / 2));
  expect(offCentreX, 'the topology is horizontally centred').toBeLessThan(frame.width * 0.12);
  expect(offCentreY, 'the topology is vertically centred').toBeLessThan(frame.height * 0.12);
});
