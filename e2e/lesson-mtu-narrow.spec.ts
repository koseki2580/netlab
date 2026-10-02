import { expect, test } from './fixtures/harness';

/**
 * TC-296, TC-297 — the MTU lesson can be read on a phone.
 *
 * At 390px the panel kept its 460px desktop width beside a canvas squeezed to
 * nothing: the notes ran off the right edge and no device could be seen.
 */
test('at phone width the MTU lesson stacks the canvas above a panel that fits the screen', async ({
  page,
  demoPage,
}) => {
  const width = 390;
  await page.setViewportSize({ width, height: 844 });
  await demoPage.goto('/networking/mtu-fragmentation');

  const ping = page.getByTestId('demo-primary-action');
  const working = page.getByTestId('mtu-fragment-working');
  const canvas = page.getByTestId('netlab-canvas');

  // TC-297: the canvas keeps a usable size and the devices are drawn inside it.
  const canvasBox = await canvas.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(canvasBox!.width).toBeGreaterThanOrEqual(width - 1);
  expect(canvasBox!.height).toBeGreaterThanOrEqual(240);
  const nodes = page.getByTestId('topology-node');
  await expect(nodes).toHaveCount(4);
  for (const node of await nodes.all()) {
    const box = await node.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(canvasBox!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(canvasBox!.x + canvasBox!.width);
  }

  // TC-296: the button and the working it produces lie inside the screen.
  await ping.scrollIntoViewIfNeeded();
  const pingBox = await ping.boundingBox();
  expect(pingBox).not.toBeNull();
  expect(pingBox!.x).toBeGreaterThanOrEqual(0);
  expect(pingBox!.x + pingBox!.width).toBeLessThanOrEqual(width);
  await ping.click();

  await expect(working).toContainText('1208 = 2 × 584 + 40, so 3 fragments');
  await working.scrollIntoViewIfNeeded();
  const workingBox = await working.boundingBox();
  expect(workingBox).not.toBeNull();
  expect(workingBox!.x).toBeGreaterThanOrEqual(0);
  expect(workingBox!.x + workingBox!.width).toBeLessThanOrEqual(width);

  const scroll = await page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement;
    return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
  });
  expect(scroll.scrollWidth).toBeLessThanOrEqual(scroll.clientWidth);
});
