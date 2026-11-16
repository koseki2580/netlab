/**
 * REQ-371 — a router that asks by ARP for an address on one of its own LANs
 * and gets no answer drops the packet there and tells the sender Destination
 * Unreachable, host unreachable (RFC 1812 §5.2.7.1; TC-1773). It used to send
 * the packet on, and it came back to the sender as `routing-loop`.
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../cli/runtime';
import { HookEngine } from '../hooks/HookEngine';
import { terminalNetwork } from '../terminal/terminalNetwork';
import { MainThreadEngine } from './worker/MainThreadEngine';

describe('TC-1773: nobody on the router’s LAN has the address', () => {
  it('the router asks, gets no answer, drops it and answers host unreachable', async () => {
    const engine = new MainThreadEngine(enrichTopology(terminalNetwork()), new HookEngine());
    const trace = await engine.ping('client', '10.0.2.99');

    const ask = trace.hops.find((hop) => hop.event === 'arp-request' && hop.nodeId === 'router');
    expect(ask).toMatchObject({ srcIp: '10.0.2.1', dstIp: '10.0.2.99' });
    const drop = trace.hops.find((hop) => hop.event === 'drop');
    expect(drop).toMatchObject({ nodeId: 'router', reason: 'arp-no-reply', icmpGenerated: true });
    expect(trace.hops.some((hop) => hop.reason === 'routing-loop')).toBe(false);
    // The router's answer, from the address the ping came in on, reaches the client.
    const replyStart = trace.hops.findIndex(
      (hop, index) => index > 0 && hop.event === 'create' && hop.nodeId === 'router',
    );
    expect(trace.hops[replyStart]).toMatchObject({
      srcIp: '10.0.1.1',
      dstIp: '10.0.1.10',
      protocol: 'ICMP',
    });
    expect(
      trace.hops
        .slice(replyStart)
        .some((hop) => hop.nodeId === 'client' && hop.event === 'deliver'),
    ).toBe(true);
  });

  it('an address that is there is still reached', async () => {
    const engine = new MainThreadEngine(enrichTopology(terminalNetwork()), new HookEngine());
    expect((await engine.ping('client', '10.0.2.80')).status).toBe('delivered');
  });
});
