import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-032 — a new element appears where the learner is looking.
 *
 * The palette placed every new device at a fixed spot near the origin. Pan away
 * from there and the button still worked — the node count went up — but nothing
 * appeared on the canvas, which reads as a button that does nothing.
 */
async function visibleDevices(
  page: import('@playwright/test').Page,
  frame: { x: number; y: number; width: number; height: number },
): Promise<number> {
  const devices = page.getByTestId(SEL.canvas.node);
  const count = await devices.count();
  let visible = 0;
  for (let index = 0; index < count; index += 1) {
    const box = await devices.nth(index).boundingBox();
    if (
      box &&
      box.x >= frame.x &&
      box.y >= frame.y &&
      box.x + box.width <= frame.x + frame.width &&
      box.y + box.height <= frame.y + frame.height
    ) {
      visible += 1;
    }
  }
  return visible;
}

test('a device added after panning is drawn where the learner is looking', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await demoPage.goto('/editor');

  const canvas = page.getByTestId(SEL.editor.canvas);
  await expect(canvas).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();
  const frame = (await canvas.boundingBox())!;

  // Pan well away from where the palette used to drop things.
  const startX = frame.x + frame.width / 2;
  const startY = frame.y + frame.height - 120;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 900, startY - 400, { steps: 20 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const before = await visibleDevices(page, frame);
  await page.getByTestId(SEL.editor.paletteItem('router')).click();
  await expect(page.getByTestId(SEL.canvas.node)).toHaveCount(5);
  await page.waitForTimeout(400);
  const after = await visibleDevices(page, frame);

  expect(after, 'the new device is on screen, not back at the origin').toBe(before + 1);
});
