import { describe, expect, it } from 'vitest';

import {
  buildForwardingTopology,
  createBaseline,
  evaluateBenchmark,
  formatForwardingReport,
} from './bench-forwarding.mjs';

describe('forwarding benchmark helpers', () => {
  it('creates a deterministic router-chain topology', () => {
    const topology = buildForwardingTopology(3);

    expect(topology.nodes.map((node) => node.id)).toEqual([
      'client-0',
      'router-0',
      'router-1',
      'router-2',
      'server-0',
    ]);
    expect(topology.edges).toHaveLength(4);
    expect(topology.routeTables.get('router-0')).toContainEqual(
      expect.objectContaining({ destination: '10.3.0.0/24', nextHop: '10.1.0.2' }),
    );
    expect(topology.routeTables.get('router-2')).toContainEqual(
      expect.objectContaining({ destination: '10.3.0.0/24', nextHop: 'direct' }),
    );
  });

  it('derives a throughput floor from the configured tolerance', () => {
    const baseline = createBaseline(
      {
        scenario: 'test',
        routerCount: 1,
        packetsPerSample: 10,
        samples: 3,
        warmupPackets: 1,
        medianOpsPerSecond: 1000,
      },
      0.15,
    );

    expect(baseline.minOpsPerSecond).toBe(850);
  });

  it('reports pass and fail against the baseline floor', () => {
    const baseline = { baselineOpsPerSecond: 1000, minOpsPerSecond: 850 };

    expect(evaluateBenchmark({ medianOpsPerSecond: 900 }, baseline).passed).toBe(true);
    expect(evaluateBenchmark({ medianOpsPerSecond: 800 }, baseline).passed).toBe(false);
  });

  it('prints the measured median and gate floor', () => {
    const report = formatForwardingReport(
      {
        scenario: 'test',
        medianOpsPerSecond: 900,
        sampleOpsPerSecond: [800, 900, 1000],
      },
      { baselineOpsPerSecond: 1000, minOpsPerSecond: 850 },
      { passed: true, deltaPercent: -10 },
    );

    expect(report).toContain('median: 900.00 packets/sec');
    expect(report).toContain('floor: 850.00 packets/sec');
    expect(report).toContain('status: pass');
  });
});
