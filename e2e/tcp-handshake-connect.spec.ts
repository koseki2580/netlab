import { expect, test } from './fixtures/harness';
import { SEL } from './selectors';

/**
 * TC-134 — the handshake lesson completes a handshake.
 *
 * Its SYN — the first of the three segments the whole lesson exists to show —
 * was dropped at the router as "no route". The router in that scenario carries
 * an address on each side and no `staticRoutes`, and nothing derived the routes
 * a router has by virtue of its own interfaces, so it had no route to either of
 * the two subnets it was sitting on.
 */
test('the TCP lesson reaches ESTABLISHED on both ends', async ({ page, demoPage }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/simulation/tcp-handshake');
  await expect(page.getByTestId(SEL.app.root)).toBeVisible();
  await expect(page.getByTestId(SEL.canvas.node).first()).toBeVisible();

  await expect(page.getByTestId(SEL.tcp.clientState)).toContainText('CLOSED');

  await page.getByTestId(SEL.tcp.connect).click();

  // Both ends reaching ESTABLISHED means all three segments were delivered:
  // the client's SYN, the server's SYN-ACK, and the client's ACK.
  await expect(page.getByTestId(SEL.tcp.clientState)).toContainText('ESTABLISHED');
  await expect(page.getByTestId(SEL.tcp.serverState)).toContainText('ESTABLISHED');
});
