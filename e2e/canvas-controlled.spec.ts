import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-016 — a host-driven canvas draws what the host holds.
 *
 * The controlled demo owns the topology and publishes it as JSON beside the
 * canvas. If the two ever disagree, an embedding application is looking at a
 * picture of something other than its own state — and that is precisely the
 * property a canvas-engine swap could break without any unit test noticing,
 * since those mock the engine away.
 */
test('the canvas draws exactly the topology its host publishes', async ({ page, demoPage }) => {
  await demoPage.goto('/topology/controlled');

  const devices = page.locator('[data-node-kind]');
  await expect(devices.first()).toBeVisible();

  const published = await page.getByTestId(SEL.canvas.controlledJson).textContent();
  expect(published, 'the host publishes its topology').toBeTruthy();

  const host = JSON.parse(published!) as { nodeCount?: number; snapshot?: { nodes?: unknown[] } };
  const hostNodeCount = host.nodeCount ?? 0;
  expect(hostNodeCount, 'the published topology has nodes').toBeGreaterThan(0);
  // The host's own count and its snapshot must agree before comparing to the
  // picture, or a mismatch here would be blamed on the canvas.
  expect(host.snapshot?.nodes?.length).toBe(hostNodeCount);
  await expect(devices).toHaveCount(hostNodeCount);
});
