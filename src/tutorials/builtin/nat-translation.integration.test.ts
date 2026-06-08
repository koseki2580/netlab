import { beforeAll, describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { SwitchForwarder } from '../../layers/l2-datalink/SwitchForwarder';
import { RouterForwarder } from '../../layers/l3-network/RouterForwarder';
import { layerRegistry } from '../../registry/LayerRegistry';
import { SimulationEngine } from '../../simulation/SimulationEngine';
import { makePacket } from '../../simulation/__fixtures__/helpers';
import { natTopology } from '../../simulation/__fixtures__/topologies';
import { TutorialRunner } from '../TutorialRunner';
import { natTranslation } from './nat-translation';

function snatPacket() {
  return makePacket(
    'nat-snat',
    'client-1',
    'server-1',
    '192.168.1.10',
    '198.51.100.10',
    64,
    54321,
    80,
  );
}

function dnatPacket() {
  return makePacket(
    'nat-dnat',
    'server-1',
    'client-1',
    '198.51.100.10',
    '203.0.113.1',
    64,
    55000,
    8080,
  );
}

// The engine resolves per-node forwarders through the layer registry; the NAT
// rewrite lives in the L3 RouterForwarder. Register the forwarders the demo
// relies on so the packets actually traverse (and translate) rather than drop.
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

/**
 * End-to-end check that the guided steps flip from false to true against the
 * REAL simulation engine — the same NAT inside/outside + port-forward topology
 * and the same two packets the NAT / PAT demo buttons emit. This proves the
 * predicates read live `state.natTables` and per-hop `natTranslation` correctly,
 * without needing a browser-driven tutorial run.
 */
const [snatStep, sessionStep, dnatStep] = natTranslation.steps;

function evaluate(engine: SimulationEngine) {
  const state = engine.getState();
  return {
    snat: snatStep?.predicate({ state, events: [] }),
    session: sessionStep?.predicate({ state, events: [] }),
    dnat: dnatStep?.predicate({ state, events: [] }),
  };
}

describe('natTranslation tutorial against the live engine', () => {
  it('passes each step as the demo SNAT then DNAT packets traverse the edge router', async () => {
    const engine = new SimulationEngine(natTopology(), new HookEngine());

    // Nothing sent yet — every step is still pending.
    expect(evaluate(engine)).toEqual({ snat: false, session: false, dnat: false });

    // "Client A -> Internet (SNAT)" button.
    await engine.send(snatPacket());

    const afterSnat = evaluate(engine);
    expect(afterSnat.snat).toBe(true);
    expect(afterSnat.session).toBe(true);
    expect(afterSnat.dnat).toBe(false);

    // "Internet -> Client A (DNAT 8080)" button.
    await engine.send(dnatPacket());

    expect(evaluate(engine)).toEqual({ snat: true, session: true, dnat: true });
  });

  it('drives the real TutorialRunner to passed across the two-button demo flow', async () => {
    const engine = new SimulationEngine(natTopology(), new HookEngine());
    const runner = new TutorialRunner(natTranslation);
    runner.start();
    expect(runner.state.status).toBe('active');
    expect(runner.state.currentStepIndex).toBe(0);

    // One SNAT action satisfies BOTH step 1 and step 2; the runner must cascade
    // through them in a single state update and stop waiting on the DNAT step.
    await engine.send(snatPacket());
    runner.onSimulationState(engine.getState());
    expect(runner.state.status).toBe('active');
    expect(runner.state.currentStepIndex).toBe(2);
    expect(runner.state.stepsCompleted).toBe(2);

    // The DNAT action completes the final step and the tutorial passes.
    await engine.send(dnatPacket());
    runner.onSimulationState(engine.getState());
    expect(runner.state.status).toBe('passed');
    expect(runner.state.stepsCompleted).toBe(3);
  });
});
