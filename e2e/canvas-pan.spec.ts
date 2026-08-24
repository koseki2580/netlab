import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-031 — dragging the canvas moves the diagram.
 *
 * Panning is how a learner follows a topology that is larger than the frame,
 * and it is the gesture they try first. It is also the one that leaves no
 * trace when it stops working: the canvas simply does not respond, and every
 * other test still passes.
 */
test('dragging an empty part of the canvas pans the topology', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1400, height: 900 });
  await demoPage.goto('/routing/client-server');

  const canvas = page.getByTestId(SEL.canvas.root).first();
  const device = page.getByTestId(SEL.canvas.node).first();
  await expect(device).toBeVisible();

  const frame = (await canvas.boundingBox())!;
  const before = (await device.boundingBox())!;

  // Low and centre: the topology sits across the middle band and the overlay
  // panels sit in the corners, so this starts on canvas rather than on either.
  const startX = frame.x + frame.width / 2;
  const startY = frame.y + frame.height - 90;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 180, startY - 140, { steps: 14 });
  await page.mouse.up();
  await page.waitForTimeout(400);

  const after = (await device.boundingBox())!;
  expect(
    Math.abs(after.x - before.x) + Math.abs(after.y - before.y),
    'the diagram moved',
  ).toBeGreaterThan(40);
});
