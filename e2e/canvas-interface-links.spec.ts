import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-105 (regression) — links survive naming a router interface.
 *
 * A netlab link says which interface it leaves and enters by (`to-r3`, `lan1`);
 * the simulation reads those to forward a packet. React Flow read the same
 * fields as ids of DOM anchors inside the device, found none, and refused to
 * create the edge — so the OSPF convergence lesson drew six routers and not one
 * cable between them, with only a console warning to say so. The backup path is
 * the entire lesson.
 */
test('draws every link in a topology whose links name router interfaces', async ({ page }) => {
  await page.goto('/?sandbox=1&sandboxTab=node#/routing/ospf-convergence');

  const devices = page.getByTestId(SEL.canvas.node);
  await expect(devices.first()).toBeVisible();
  expect(await devices.count(), 'the lesson draws its routers').toBeGreaterThan(4);

  // One drawn link per link in the topology. Counting them is the point: the
  // defect drew every device and no cable at all.
  const links = page.locator(`[data-testid="${SEL.canvas.root}"] .netlab-edge`);
  expect(await links.count(), 'every link is drawn').toBeGreaterThanOrEqual(await devices.count());
});
