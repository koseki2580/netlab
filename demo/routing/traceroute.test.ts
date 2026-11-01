import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { SimulationEngine } from '../../src/simulation/SimulationEngine';
import type { NetworkTopology } from '../../src/types/topology';
import { MULTI_HOP_DEMO_TOPOLOGY } from './MultiHopDemo';
import { tracerouteRows } from './traceroute';

async function runTraceroute(topology: NetworkTopology) {
  const engine = new SimulationEngine(enrichTopology(topology), new HookEngine(), {
    useMainThread: true,
  });
  const traces = await engine.traceroute('client-1', '203.0.113.10');
  engine.dispose();
  return tracerouteRows(traces, 'client-1');
}

// TC-981 — the multi-hop lesson's traceroute rows are the simulator's own.
describe('traceroute in the multi-hop lesson', () => {
  it('lists one row per probe: R-1 and R-2 with "time exceeded", then the server', async () => {
    expect(await runTraceroute(MULTI_HOP_DEMO_TOPOLOGY)).toEqual([
      { ttl: 1, device: 'R-1', address: '10.0.0.1', answer: 'time-exceeded' },
      { ttl: 2, device: 'R-2', address: '172.16.0.2', answer: 'time-exceeded' },
      { ttl: 3, device: 'Server', address: '203.0.113.10', answer: 'echo-reply' },
    ]);
  });

  it('shows a probe nobody answered as a row with no device', async () => {
    // R-2 loses its way back to the client, so its "time exceeded" and the
    // server's reply never arrive: only R-1 answers.
    const broken: NetworkTopology = {
      ...MULTI_HOP_DEMO_TOPOLOGY,
      nodes: MULTI_HOP_DEMO_TOPOLOGY.nodes.map((node) =>
        node.id === 'router-2'
          ? {
              ...node,
              data: {
                ...node.data,
                staticRoutes: (node.data.staticRoutes ?? []).filter(
                  (route) =>
                    route.destination !== '10.0.0.0/24' && route.destination !== '0.0.0.0/0',
                ),
              },
            }
          : node,
      ),
    };
    const rows = await runTraceroute(broken);
    expect(rows[0]).toEqual({
      ttl: 1,
      device: 'R-1',
      address: '10.0.0.1',
      answer: 'time-exceeded',
    });
    expect(rows[1]).toEqual({ ttl: 2, device: null, address: null, answer: 'none' });
  });
});
