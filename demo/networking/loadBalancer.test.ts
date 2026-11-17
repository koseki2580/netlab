/** REQ-373 — load-balancing algorithms, health checks, and the VIP rewrite (TC-1790..TC-1793). */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { MainThreadEngine } from '../../src/simulation/worker/MainThreadEngine';
import { REQUESTS, SERVER_IPS, VIP, assign, lbTopology, peakOpen, synToVip } from './loadBalancer';

const servers = (algorithm: Parameters<typeof assign>[0], up?: boolean[]) =>
  assign(algorithm, REQUESTS, up).map((assignment) => assignment.server);

describe('TC-1790: round robin takes turns, and a health check takes a server out', () => {
  it('gives each server four requests, but every long one lands on web1', () => {
    expect(servers('round-robin')).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2]);
    const peaks = peakOpen(assign('round-robin', REQUESTS));
    expect(peaks[0]).toBeGreaterThan(peaks[1]!);
  });

  it('skips a server the health check marked down', () => {
    expect(servers('round-robin', [true, false, true])).not.toContain(1);
  });
});

describe('TC-1791: least connections evens out what is open', () => {
  it('sends each request to the server with fewest open connections, and peaks lower than round robin', () => {
    const assignments = assign('least-connections', REQUESTS);
    for (const { server, openBefore } of assignments) {
      expect(openBefore[server]).toBe(Math.min(...openBefore));
    }
    expect(Math.max(...peakOpen(assignments))).toBeLessThan(
      Math.max(...peakOpen(assign('round-robin', REQUESTS))),
    );
  });
});

describe('TC-1792: a source-IP hash keeps each client on one server, until the servers change', () => {
  it('maps a client the same way every time, and remaps some when a server is down', () => {
    const byClient = (list: number[]) => {
      const seen = new Map<string, Set<number>>();
      REQUESTS.forEach((request, index) =>
        seen.set(request.clientIp, (seen.get(request.clientIp) ?? new Set()).add(list[index]!)),
      );
      return seen;
    };
    for (const set of byClient(servers('source-hash')).values()) expect(set.size).toBe(1);
    const all = servers('source-hash');
    const fewer = servers('source-hash', [true, true, false]);
    expect(fewer).not.toContain(2);
    expect(fewer.some((server, index) => server !== all[index] && all[index] !== 2)).toBe(true);
  });
});

describe('TC-1793: on the simulator, the load balancer rewrites the VIP to the chosen server', () => {
  it('delivers a SYN for the VIP to web2 with the destination translated', async () => {
    const engine = new MainThreadEngine(enrichTopology(lbTopology(1)), new HookEngine());
    const packet = synToVip(1, 50000);
    await engine.send(packet);
    const trace = engine.getState().traces.find((candidate) => candidate.packetId === packet.id)!;
    expect(trace.status).toBe('delivered');
    const rewrite = trace.hops.find((hop) => hop.natTranslation)?.natTranslation;
    expect(rewrite).toMatchObject({
      type: 'dnat',
      preDstIp: VIP,
      postDstIp: SERVER_IPS[1],
      postDstPort: 80,
    });
    expect(trace.hops[trace.hops.length - 1]).toMatchObject({
      nodeId: 'web2',
      event: 'deliver',
      dstIp: SERVER_IPS[1],
    });
  });
});
