/**
 * Golden trace tests — asserts protocol invariants for a hand-picked set of demos.
 * Each test: navigate → trigger simulation → waitForTraceCount → assert.
 * No wall-clock sleeps; all waits are event-driven via window.__NETLAB_TRACE__.
 */
import { expect, test } from '@playwright/test';
import type { PacketTrace } from '../src/types/simulation';
import { DemoPage } from './pages/DemoPage';

/** Returns true if at least one hop across all traces satisfies the predicate. */
function anyHop(traces: PacketTrace[], pred: (h: PacketTrace['hops'][number]) => boolean): boolean {
  return traces.some((t) => t.hops.some(pred));
}

test.describe('golden traces', () => {
  test('routing/client-server — packet traverses router', async ({ page }) => {
    const demoPage = new DemoPage(page);
    await demoPage.goto('/routing/client-server');
    await demoPage.pressStart(); // ▶ Send Packet
    await demoPage.waitForTraceCount(1);
    const traces = await demoPage.traces();
    expect(traces.length).toBeGreaterThanOrEqual(1);
    expect(anyHop(traces, (h) => h.nodeId === 'router-1')).toBe(true);
  });

  test('networking/mtu-fragmentation — oversized ICMP is fragmented', async ({ page }) => {
    const demoPage = new DemoPage(page);
    await demoPage.goto('/networking/mtu-fragmentation');
    await demoPage.pressStart(); // ping A → B (1200-byte payload)
    await demoPage.waitForTraceCount(1);
    const traces = await demoPage.traces();
    expect(traces.length).toBeGreaterThanOrEqual(1);
    expect(anyHop(traces, (h) => h.protocol === 'ICMP')).toBe(true);
    expect(anyHop(traces, (h) => h.action === 'fragment')).toBe(true);
  });

  test('networking/udp — UDP datagram delivered end-to-end', async ({ page }) => {
    const demoPage = new DemoPage(page);
    await demoPage.goto('/networking/udp');
    await demoPage.pressStart(); // Send UDP → port N
    await demoPage.waitForTraceCount(1);
    const traces = await demoPage.traces();
    expect(traces.length).toBeGreaterThanOrEqual(1);
    expect(anyHop(traces, (h) => h.protocol === 'UDP')).toBe(true);
    expect(anyHop(traces, (h) => h.event === 'deliver')).toBe(true);
  });

  test('networking/multicast — multicast UDP traces present on mount', async ({ page }) => {
    const demoPage = new DemoPage(page);
    await demoPage.goto('/networking/multicast');
    // MulticastDemo auto-sends on first idle tick via useEffect — no button click needed
    await demoPage.waitForTraceCount(1);
    const traces = await demoPage.traces();
    expect(traces.length).toBeGreaterThanOrEqual(1);
    expect(anyHop(traces, (h) => h.protocol === 'UDP')).toBe(true);
  });

  test('services/dhcp-dns — DHCP 4-way exchange completes over UDP', async ({ page }) => {
    const demoPage = new DemoPage(page);
    await demoPage.goto('/services/dhcp-dns');
    await page.getByRole('button', { name: /run dhcp/i }).click();
    await demoPage.waitForTraceCount(4); // DISCOVER, OFFER, REQUEST, ACK
    const traces = await demoPage.traces();
    expect(traces.length).toBeGreaterThanOrEqual(4);
    expect(anyHop(traces, (h) => h.protocol === 'UDP')).toBe(true);
  });

  test('simulation/tcp-handshake — TCP SYN trace generated', async ({ page }) => {
    const demoPage = new DemoPage(page);
    await demoPage.goto('/simulation/tcp-handshake');
    await page.getByRole('button', { name: /connect \(tcp\)/i }).click();
    await demoPage.waitForTraceCount(1);
    const traces = await demoPage.traces();
    expect(traces.length).toBeGreaterThanOrEqual(1);
    expect(anyHop(traces, (h) => h.protocol === 'TCP')).toBe(true);
  });
});
