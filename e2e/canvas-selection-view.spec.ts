import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-173 — opening a device keeps the rest of the network in view.
 *
 * The canvas recentred on whichever device was selected, so pressing the
 * rightmost one pushed three of five off the left edge — one of them under the
 * navigation rail, where it could not be pressed — and closing the panel did
 * not bring them back. A learner opens a device to read it, not to lose the
 * picture they were reading.
 */
test('opening a device does not push the other devices off the canvas', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await demoPage.goto('/routing/client-server');

  const devices = page.getByTestId(SEL.canvas.node);
  await expect(devices.first()).toBeVisible();
  const before = await devices.count();
  expect(before, 'the lesson draws several devices').toBeGreaterThan(2);

  async function onScreen(): Promise<number> {
    let visible = 0;
    for (let index = 0; index < before; index += 1) {
      const box = await devices.nth(index).boundingBox();
      if (box && box.x >= 0 && box.y >= 0 && box.x + box.width <= 1440) visible += 1;
    }
    return visible;
  }

  const startVisible = await onScreen();
  await devices.last().click();
  await expect(page.locator('[data-netlab-dp]')).toBeVisible();

  const afterVisible = await onScreen();
  expect(afterVisible, 'the devices that were on screen stay on screen').toBeGreaterThanOrEqual(
    startVisible - 1,
  );
});
