import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * Area level-of-detail on the simulator canvas.
 *
 * A learner reading a large topology needs its shape before its detail, so
 * zooming out collapses an area into one cluster. Every unit test of this
 * canvas mocks the graph engine, so the collapse can only be observed here —
 * and this is the behaviour a canvas-engine migration is most likely to lose.
 */

/** TC-013 / TC-014 — areas collapse when zoomed out and expand again. */
test('collapses an area into a cluster when zoomed out, and restores it on expand', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/areas/dmz');

  const devices = page.locator('[data-node-kind]');
  const clusters = page.getByTestId(SEL.canvas.areaCluster);
  await expect(devices.first()).toBeVisible();
  const detailed = await devices.count();
  expect(detailed, 'the demo starts showing individual devices').toBeGreaterThan(0);
  await expect(clusters).toHaveCount(0);

  // Zoom out by scrolling over the canvas — the gesture a learner actually
  // uses, and the one the Zoom Out button cannot stand in for here: the second
  // press lands mid zoom-transition and never settles.
  await devices.first().hover();
  for (let i = 0; i < 6; i += 1) {
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(250);
  }

  await expect(clusters.first()).toBeVisible();
  // Collapsing is the point: the cluster stands in for its members.
  expect(await devices.count()).toBeLessThan(detailed);

  // Zooming out can push some clusters off-screen; expand one the learner can
  // actually reach.
  const count = await clusters.count();
  let expanded = false;
  for (let i = 0; i < count; i += 1) {
    const cluster = clusters.nth(i);
    if (await cluster.isVisible()) {
      await cluster.click();
      expanded = true;
      break;
    }
  }
  expect(expanded, 'at least one cluster is on screen to expand').toBe(true);
  // Expanding restores the devices this cluster stood in for.
  await expect(devices.first()).toBeVisible();
  expect(await devices.count()).toBeGreaterThan(1);
});

/** TC-015 — an illustration canvas leaves the page's scroll alone. */
test('a mid-page illustration canvas lets the page scroll under the pointer', async ({
  page,
  demoPage,
}) => {
  await demoPage.goto('/learning/packet-journey');
  const canvas = page.locator('[data-node-kind]').first();
  await expect(canvas).toBeVisible();

  const before = await page.evaluate(() => window.scrollY);
  await canvas.hover();
  await page.mouse.wheel(0, 600);
  const after = await page.evaluate(() => window.scrollY);

  // Either the page moved, or it had nothing to scroll — what must never happen
  // is the wheel being swallowed while the page still had somewhere to go.
  const scrollable = await page.evaluate(
    () => document.documentElement.scrollHeight > window.innerHeight,
  );
  if (scrollable) expect(after).toBeGreaterThan(before);
});
