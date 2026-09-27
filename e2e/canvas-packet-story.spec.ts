import { expect, test } from './fixtures/harness';

/**
 * The diagram tells the packet's story on its own: a marker that travels to
 * the device of the hop being shown, each host's IP address under its name,
 * and what happened at a device — the ARP question and answer, a NAT rewrite —
 * said in words beside it.
 *
 * A learner who learns from pictures saw nothing move and had to open side
 * panels to learn any of this.
 */
const IDS = {
  primaryAction: 'demo-primary-action',
  traceHop: 'trace-hop',
  packet: 'canvas-packet',
  bubble: 'canvas-hop-bubble',
  nodeIp: 'topology-node-ip',
  natSendClientA: 'nat-send-client-a',
} as const;

test('the packet marker follows the hops of the client-server lesson', async ({
  page,
  demoPage,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await demoPage.goto('/routing/client-server');
  await demoPage.dismissBrief();
  await page.getByTestId(IDS.primaryAction).first().click();

  const marker = page.getByTestId(IDS.packet);
  // Sent and not stepped: the packet makes the whole journey and rests where it arrived.
  await expect(marker).toHaveAttribute('data-at', 'server-1');

  await demoPage.waitForTraceCount(1);
  const [trace] = await demoPage.traces();
  const hops = page.getByTestId(IDS.traceHop);
  await expect(hops).toHaveCount(trace!.hops.length);
  for (const [index, hop] of trace!.hops.entries()) {
    await hops.nth(index).click();
    await expect(marker, `hop ${index}`).toHaveAttribute('data-at', hop.nodeId);
  }
  await expect(marker).toHaveAttribute('data-moving', 'false');
});

test('a host shows its IP address on the diagram', async ({ page, demoPage }) => {
  await demoPage.goto('/routing/client-server');
  await demoPage.dismissBrief();
  const addresses = page.getByTestId(IDS.nodeIp);
  await expect(addresses.first()).toBeVisible();
  const shown = await addresses.allTextContents();
  expect(shown).toContain('10.0.0.10');
  expect(shown).toContain('203.0.113.10');
});

test('the ARP question appears on the diagram at the asking device', async ({ page, demoPage }) => {
  await demoPage.goto('/networking/arp');
  await demoPage.dismissBrief();
  await page.getByTestId(IDS.primaryAction).click();

  await page.getByTestId(IDS.traceHop).filter({ hasText: 'ARP-REQ' }).first().click();
  const bubble = page.getByTestId(IDS.bubble);
  await expect(bubble).toHaveAttribute('data-kind', 'arpRequest');
  await expect(bubble).toContainText('203.0.113.10');
  // Words, not the timeline's code.
  await expect(bubble).not.toContainText('ARP-REQ');
});

test('the NAT rewrite appears on the diagram at the NAT router', async ({ page, demoPage }) => {
  await demoPage.goto('/simulation/nat');
  await demoPage.dismissBrief();
  await page.getByTestId(IDS.natSendClientA).click();

  const bubble = page.getByTestId(IDS.bubble);
  await expect(bubble).toHaveAttribute('data-kind', 'nat');
  await expect(bubble).toContainText('192.168.1.10');
  await expect(bubble).toContainText('203.0.113.1');
});

test('under reduced motion the packet is placed without moving', async ({ page, demoPage }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await demoPage.goto('/routing/client-server');
  await demoPage.dismissBrief();
  await page.getByTestId(IDS.primaryAction).first().click();

  const marker = page.getByTestId(IDS.packet);
  await expect(marker).toHaveAttribute('data-at', 'server-1');
  await expect(marker).toHaveAttribute('data-moving', 'false');
  expect(await marker.evaluate((element) => element.getAnimations().length)).toBe(0);
});
