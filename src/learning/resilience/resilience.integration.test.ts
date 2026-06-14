import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SwitchForwarder } from '../../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../../registry/LayerRegistry';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { journeyProbe } from '../packet-journey/journey';
import { RESILIENCE_SCENARIOS, resilienceOutcome } from './scenarios';
import { buildResilienceTopology } from './topology';

beforeAll(() => {
  layerRegistry.register({
    layerId: 'l3',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new RouterForwarder(nodeId, topology),
  });
  layerRegistry.register({
    layerId: 'l2',
    nodeTypes: {},
    forwarder: (nodeId, topology) => new SwitchForwarder(nodeId, topology),
  });
});

async function outcomeFor(scenarioId: string) {
  const topology = buildResilienceTopology();
  const engine = new SimulationEngine(topology, new HookEngine());
  const scenario = RESILIENCE_SCENARIOS.find((candidate) => candidate.id === scenarioId)!;
  const trace = await engine.precompute(journeyProbe(scenario.flow), scenario.failure);
  return resilienceOutcome(trace, topology);
}

describe('resilience scenarios against the live engine', () => {
  it('every healthy flow delivers before any failure is injected', async () => {
    for (const scenario of RESILIENCE_SCENARIOS) {
      const topology = buildResilienceTopology();
      const engine = new SimulationEngine(topology, new HookEngine());
      const trace = await engine.precompute(journeyProbe(scenario.flow));
      expect(trace.status).toBe('delivered');
    }
  });

  it('reroute-survives: the redundant link carries the packet around the break', async () => {
    const outcome = await outcomeFor('reroute-survives');
    expect(outcome.outcome).toBe('survived');
    expect(outcome.endNodeId).toBe('server-a');
    // It took the scenic route through R3, not the broken R1–R2 link.
    expect(outcome.traversedEdgeIds).toContain('e-r1-r3');
    expect(outcome.traversedEdgeIds).toContain('e-r2-r3');
    expect(outcome.traversedEdgeIds).not.toContain('e-r1-r2');
  });

  it('server-router-down: redundancy cannot save a server whose only router died', async () => {
    const outcome = await outcomeFor('server-router-down');
    expect(outcome.outcome).toBe('dropped');
    expect(outcome.endNodeId).toBe('r2');
    expect(outcome.dropReason).toBe('node-down');
  });

  it('no-usable-backup: a redundant link is useless when no route points over it', async () => {
    const outcome = await outcomeFor('no-usable-backup');
    expect(outcome.outcome).toBe('dropped');
    expect(outcome.endNodeId).toBe('r1');
    expect(outcome.dropReason).toBe('no-route');
  });
});
