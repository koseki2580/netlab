/**
 * REQ-362 — a router sends what it originates with the TTL it set: only a
 * packet it forwards loses one (RFC 1812 §5.3.1; TC-1720, TC-1721).
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../cli/runtime';
import { HookEngine } from '../hooks/HookEngine';
import { terminalNetwork } from '../terminal/terminalNetwork';
import type { PacketTrace } from '../types/simulation';
import { MainThreadEngine } from './worker/MainThreadEngine';

const engine = () => new MainThreadEngine(enrichTopology(terminalNetwork()), new HookEngine());

/** The TTL the answer arrived at the client with. */
function arrivedTtl(trace: PacketTrace): number | undefined {
  const replyStart = trace.hops.findIndex((hop, index) => index > 0 && hop.event === 'create');
  return trace.hops
    .slice(replyStart)
    .find((hop) => hop.nodeId === 'client' && hop.event === 'deliver')?.ttl;
}

describe('TC-1720: the gateway answers a ping with TTL 64', () => {
  it('reaches the client on the same LAN with 64, as a server there does', async () => {
    const sim = engine();
    expect(arrivedTtl(await sim.ping('client', '10.0.1.1'))).toBe(64);
    expect(arrivedTtl(await sim.ping('client', '10.0.1.67'))).toBe(64);
  });

  it('a server one router away still answers with 63: the router forwarded it', async () => {
    expect(arrivedTtl(await engine().ping('client', '10.0.2.80'))).toBe(63);
  });
});

describe('TC-1721: a router’s ICMP error leaves it with the TTL it set', () => {
  it('time exceeded from the gateway reaches the client with 64', async () => {
    const [first] = await engine().traceroute('client', '10.0.2.80', 1);
    expect(first && arrivedTtl(first)).toBe(64);
  });
});
