import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-117 — the gallery's first lesson delivers its packet.
 *
 * "Send Packet" produced a routing loop: client → switch → router → back to
 * the switch → back to the client. Both of the router's routes are `direct`
 * and both of its neighbours are switches, and any switch was accepted for a
 * direct route, so the first one listed won — the one the packet had just come
 * from. The lesson a learner opens first showed them a loop and called it a
 * packet flow.
 *
 * The trace is what the lesson teaches, so this reads the whole of it: the
 * router resolving the server's address, and the packet arriving.
 */
test('the client-server lesson delivers the packet to the server', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/routing/client-server');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await page.getByTestId(SEL.demo.primaryAction).first().click();

  const hops = page.getByTestId(SEL.traceFilter.hop);
  await expect(hops.filter({ hasText: 'DELIVER' })).toHaveCount(1);
  await expect(hops.filter({ hasText: 'DROP' })).toHaveCount(0);
  // The router has to learn where the server is before it can send anything
  // there, and that exchange is half of what this lesson shows.
  await expect(hops.filter({ hasText: 'ARP' }).first()).toBeVisible();
});
