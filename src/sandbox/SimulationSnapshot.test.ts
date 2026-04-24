import { describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { directTopology } from '../simulation/__fixtures__/topologies';
import type { SimulationState } from '../types/simulation';
import type { NetworkTopology } from '../types/topology';
import { cloneSnapshot, fromEngine, snapshotEquals, toEngine } from './SimulationSnapshot';
import { DEFAULT_PARAMETERS, type ProtocolParameterSet } from './types';

function makeEngine(topology: NetworkTopology = directTopology()): SimulationEngine {
  return new SimulationEngine(topology, new HookEngine());
}

function customParameters(): ProtocolParameterSet {
  return {
    tcp: { initialWindow: 32768, mss: 1200, rto: 750 },
    ospf: { helloIntervalMs: 5000, deadIntervalMs: 20000 },
    arp: { cacheTtlMs: 60000 },
    engine: { tickMs: 50, maxTtl: 32 },
  };
}

describe('SimulationSnapshot', () => {
  it('captures engine state, topology, and default parameters', () => {
    const snapshot = fromEngine(makeEngine());

    expect(snapshot.state.currentStep).toBe(-1);
    expect(snapshot.capturedAt).toBe(-1);
    expect(snapshot.topology.nodes).toHaveLength(2);
    expect(snapshot.parameters).toEqual(DEFAULT_PARAMETERS);
  });

  it('accepts protocol parameter overrides', () => {
    const parameters = customParameters();

    expect(fromEngine(makeEngine(), parameters).parameters).toEqual(parameters);
  });

  it('round-trips through a fresh SimulationEngine', () => {
    const snapshot = fromEngine(makeEngine(), customParameters());

    expect(snapshotEquals(fromEngine(toEngine(snapshot), snapshot.parameters), snapshot)).toBe(
      true,
    );
  });

  it('creates independent engines on each toEngine call', () => {
    const snapshot = fromEngine(makeEngine());
    const first = toEngine(snapshot);
    const second = toEngine(snapshot);

    first.setState({ ...first.getState(), currentStep: 4 });

    expect(first.getState().currentStep).toBe(4);
    expect(second.getState().currentStep).toBe(-1);
  });

  it('keeps snapshots independent from later engine state changes', () => {
    const engine = makeEngine();
    const snapshot = fromEngine(engine);

    engine.setState({ ...engine.getState(), currentStep: 7 });

    expect(snapshot.state.currentStep).toBe(-1);
  });

  it('cloneSnapshot creates a structurally equal snapshot with independent references', () => {
    const snapshot = fromEngine(makeEngine());
    const cloned = cloneSnapshot(snapshot);

    expect(snapshotEquals(cloned, snapshot)).toBe(true);
    expect(cloned).not.toBe(snapshot);
    expect(cloned.state).not.toBe(snapshot.state);
    expect(cloned.topology).not.toBe(snapshot.topology);
  });

  it('snapshotEquals ignores ids for same structural input', () => {
    const first = fromEngine(makeEngine());
    const second = fromEngine(makeEngine());

    expect(first.id).not.toBe(second.id);
    expect(snapshotEquals(first, second)).toBe(true);
  });

  it('snapshotEquals detects differing step indexes', () => {
    const engine = makeEngine();
    const first = fromEngine(engine);

    engine.setState({ ...engine.getState(), currentStep: 1 });
    const second = fromEngine(engine);

    expect(snapshotEquals(first, second)).toBe(false);
  });

  it('snapshotEquals detects differing topology', () => {
    const base = fromEngine(makeEngine());
    const changedTopology = directTopology();
    const firstNode = changedTopology.nodes[0];
    expect(firstNode).toBeDefined();
    if (!firstNode) return;
    firstNode.data = { ...firstNode.data, label: 'Changed' };

    const changed = fromEngine(makeEngine(changedTopology));

    expect(snapshotEquals(base, changed)).toBe(false);
  });

  it('snapshotEquals detects differing parameters', () => {
    const engine = makeEngine();

    expect(snapshotEquals(fromEngine(engine), fromEngine(engine, customParameters()))).toBe(false);
  });

  it('freezes captured state, topology, and parameters', () => {
    const snapshot = fromEngine(makeEngine());

    expect(() => {
      snapshot.state.status = 'running';
    }).toThrow(TypeError);
    expect(() => {
      snapshot.topology.nodes.push({
        id: 'extra',
        type: 'client',
        position: { x: 0, y: 0 },
        data: { label: 'extra', layerId: 'l7', role: 'client' },
      });
    }).toThrow(TypeError);
    expect(() => {
      const tcp = snapshot.parameters.tcp as { mss: number };
      tcp.mss = 900;
    }).toThrow(TypeError);
  });

  it('setState clones incoming state before storing it', () => {
    const engine = makeEngine();
    const nextState: SimulationState = { ...engine.getState(), currentStep: 3 };

    engine.setState(nextState);
    nextState.currentStep = 9;

    expect(engine.getState().currentStep).toBe(3);
  });
});
