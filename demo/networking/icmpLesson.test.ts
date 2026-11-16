/**
 * REQ-368 — the ICMP lesson's four situations bring back, on the simulator,
 * the message the lesson says they do (TC-1760).
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { MainThreadEngine } from '../../src/simulation/worker/MainThreadEngine';
import {
  ICMP_CASES,
  ICMP_SENDER,
  ICMP_TARGET_IP,
  ICMP_UNROUTED_IP,
  ICMP_ABSENT_IP,
  icmpTopology,
  readIcmpOutcome,
} from './icmpLesson';
import { buildEchoPacket } from './pmtud';

async function outcomes() {
  const topology = enrichTopology(icmpTopology());
  const engine = new MainThreadEngine(topology, new HookEngine());
  const tooBig = buildEchoPacket(topology, true, 1472)!;
  return {
    echo: readIcmpOutcome(await engine.ping(ICMP_SENDER, ICMP_TARGET_IP), ICMP_SENDER),
    ttl: readIcmpOutcome(await engine.ping(ICMP_SENDER, ICMP_TARGET_IP, { ttl: 1 }), ICMP_SENDER),
    'no-route': readIcmpOutcome(await engine.ping(ICMP_SENDER, ICMP_UNROUTED_IP), ICMP_SENDER),
    'no-host': readIcmpOutcome(await engine.ping(ICMP_SENDER, ICMP_ABSENT_IP), ICMP_SENDER),
    'too-big': readIcmpOutcome(await engine.precompute(tooBig), ICMP_SENDER),
  };
}

describe('TC-1760: each situation brings back its ICMP message', () => {
  it('is read from the trace with its type, code and sender', async () => {
    const seen = await outcomes();
    expect(seen.echo).toMatchObject({ kind: 'echo-reply', type: 0, code: 0, from: '203.0.113.10' });
    expect(seen.ttl).toMatchObject({
      kind: 'time-exceeded',
      type: 11,
      code: 0,
      from: '10.0.0.1',
      fromDevice: 'R1',
    });
    expect(seen['no-route']).toMatchObject({
      kind: 'net-unreachable',
      type: 3,
      code: 0,
      from: '10.0.1.2',
      fromDevice: 'R2',
    });
    expect(seen['no-host']).toMatchObject({
      kind: 'host-unreachable',
      type: 3,
      code: 1,
      from: '10.0.1.2',
      fromDevice: 'R2',
    });
    expect(seen['too-big']).toMatchObject({
      kind: 'frag-needed',
      type: 3,
      code: 4,
      fromDevice: 'R1',
      mtu: 1400,
    });
  });

  it('says for every situation the kind the simulator brings back', async () => {
    const seen = await outcomes();
    for (const situation of ICMP_CASES)
      expect(seen[situation.id].kind, situation.id).toBe(situation.expected);
  });
});
