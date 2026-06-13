import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SwitchForwarder } from '../../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../../registry/LayerRegistry';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { JOURNEY_FLOWS, buildJourney, journeyProbe } from './journey';
import { buildJourneyTopology } from './topology';

// The engine resolves forwarders through the layer registry (see L006).
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

async function journeyFor(flowId: string) {
  const topology = buildJourneyTopology();
  const engine = new SimulationEngine(topology, new HookEngine());
  const flow = JOURNEY_FLOWS.find((candidate) => candidate.id === flowId);
  if (!flow) throw new Error(`unknown flow ${flowId}`);
  const trace = await engine.precompute(journeyProbe(flow));
  return buildJourney(flow, trace, topology);
}

describe('packet journey against the live engine', () => {
  it('via-lpm: the specific route beats the default and delivers through R2', async () => {
    const journey = await journeyFor('via-lpm');
    expect(journey.outcome).toBe('delivered');
    expect(journey.steps.map((step) => `${step.nodeId}→${step.correctNodeId}`)).toEqual([
      'c1→r1',
      'r1→r2',
      'r2→server-a',
    ]);
    // R1's branch decision is a real choice with both branches on offer …
    const r1 = journey.steps.find((step) => step.nodeId === 'r1');
    expect(r1?.options).toEqual(expect.arrayContaining(['r2', 'r3', 'c1']));
    // … and the engine explains it (the drill surfaces this line verbatim).
    expect(r1?.hop.routingDecision?.explanation).toContain('10.2.0.0/24');
  });

  it('via-default: an unknown destination rides the default route through R3', async () => {
    const journey = await journeyFor('via-default');
    expect(journey.outcome).toBe('delivered');
    expect(journey.steps.map((step) => step.correctNodeId)).toEqual(['r1', 'r3', 'server-b']);
    const r1 = journey.steps.find((step) => step.nodeId === 'r1');
    expect(r1?.hop.routingDecision?.explanation).toContain('0.0.0.0/0');
  });

  it('dropped: R3 has no matching route, so the packet dies there with no-route', async () => {
    const journey = await journeyFor('dropped');
    expect(journey.outcome).toBe('dropped');
    expect(journey.dropReason).toBe('no-route');
    // The learner still predicts up to R3; the drop is the journey outcome.
    expect(journey.steps.map((step) => step.correctNodeId)).toEqual(['r1', 'r3']);
  });
});
