/**
 * REQ-369 — a packet caught in a routing loop goes round until its TTL runs
 * out, and the router where it does tells the sender Time Exceeded (RFC 1812
 * §5.3.1), as on a real network (TC-1770).
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../cli/runtime';
import { HookEngine } from '../hooks/HookEngine';
import { buildFragmentedEchoTopology } from '../scenarios/fragmented-echo';
import { MainThreadEngine } from './worker/MainThreadEngine';

describe('TC-1770: a routing loop ends when the TTL runs out', () => {
  it('R1 and R2 send an unrouted address to each other until a router drops it as ttl-exceeded and answers', async () => {
    // R1 and R2 each have a default route pointing at the other.
    const engine = new MainThreadEngine(
      enrichTopology(buildFragmentedEchoTopology(1400)),
      new HookEngine(),
    );
    const trace = await engine.ping('host-a', '192.0.2.99');

    const drop = trace.hops.find((hop) => hop.event === 'drop');
    expect(drop?.reason).toBe('ttl-exceeded');
    expect(['router-r1', 'router-r2']).toContain(drop?.nodeId);
    expect(drop?.icmpGenerated).toBe(true);
    // It went round: R1 and R2 forwarded it many times before the TTL ran out.
    const laps = trace.hops.filter((hop) => hop.event === 'forward' && hop.nodeId === 'router-r1');
    expect(laps.length).toBeGreaterThan(10);
    // The Time Exceeded reached Host A.
    const replyStart = trace.hops.findIndex((hop, index) => index > 0 && hop.event === 'create');
    expect(
      trace.hops
        .slice(replyStart)
        .some((hop) => hop.nodeId === 'host-a' && hop.event === 'deliver'),
    ).toBe(true);
  });
});
