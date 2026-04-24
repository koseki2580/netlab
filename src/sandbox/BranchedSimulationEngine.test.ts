import { describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { SimulationEngine } from '../simulation/SimulationEngine';
import { directTopology } from '../simulation/__fixtures__/topologies';
import type { PacketHop, PacketTrace, SimulationState } from '../types/simulation';
import { BranchedSimulationEngine } from './BranchedSimulationEngine';
import { EditSession } from './EditSession';
import { fromEngine } from './SimulationSnapshot';

function makeBaseState(hopCount = 4): SimulationState {
  const hops: PacketHop[] = Array.from({ length: hopCount }, (_, index) => ({
    step: index,
    nodeId: index % 2 === 0 ? 'client-1' : 'server-1',
    nodeLabel: index % 2 === 0 ? 'Client' : 'Server',
    srcIp: '10.0.0.10',
    dstIp: '10.0.0.20',
    ttl: 64 - index,
    protocol: 'ICMP',
    event: index === 0 ? 'create' : index === hopCount - 1 ? 'deliver' : 'forward',
    timestamp: index,
  }));
  const trace: PacketTrace = {
    packetId: 'trace-1',
    srcNodeId: 'client-1',
    dstNodeId: 'server-1',
    hops,
    status: 'delivered',
  };

  return {
    status: 'paused',
    traces: [trace],
    currentTraceId: trace.packetId,
    currentStep: -1,
    activeEdgeIds: [],
    activePathEdgeIds: [],
    highlightMode: 'path',
    traceColors: {},
    selectedHop: null,
    selectedPacket: null,
    nodeArpTables: {},
    natTables: [],
    connTrackTables: [],
  };
}

function makeSnapshot(hopCount = 4) {
  const engine = new SimulationEngine(directTopology(), new HookEngine());
  engine.setState(makeBaseState(hopCount));
  return fromEngine(engine);
}

describe('BranchedSimulationEngine', () => {
  it('constructs alpha mode with a null baseline', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'alpha' });

    expect(runner.mode).toBe('alpha');
    expect(runner.baseline).toBeNull();
    expect(runner.whatIf.getState().currentStep).toBe(-1);
  });

  it('constructs beta mode with baseline and what-if engines', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'beta' });

    expect(runner.mode).toBe('beta');
    expect(runner.baseline).toBeInstanceOf(SimulationEngine);
    expect(runner.whatIf).toBeInstanceOf(SimulationEngine);
    expect(runner.baseline).not.toBe(runner.whatIf);
  });

  it('preserves beta lockstep over 100 steps', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(120), { mode: 'beta' });

    for (let index = 0; index < 100; index += 1) {
      runner.step();
    }

    expect(runner.baseline?.getState().currentStep).toBe(runner.whatIf.getState().currentStep);
  });

  it('applyEdits in alpha replaces the what-if engine', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'alpha' });
    const before = runner.whatIf;

    runner.applyEdits(EditSession.empty().push({ kind: 'noop' }));

    expect(runner.whatIf).not.toBe(before);
    expect(runner.baseline).toBeNull();
  });

  it('applyEdits in beta leaves baseline untouched', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'beta' });
    const baseline = runner.baseline;
    const whatIf = runner.whatIf;

    runner.applyEdits(EditSession.empty().push({ kind: 'noop' }));

    expect(runner.baseline).toBe(baseline);
    expect(runner.whatIf).not.toBe(whatIf);
  });

  it('switches alpha to beta by capturing the current what-if as baseline', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'alpha' });
    runner.whatIf.setState({ ...runner.whatIf.getState(), currentStep: 2 });

    runner.switchMode('beta');

    expect(runner.mode).toBe('beta');
    expect(runner.baseline?.getState().currentStep).toBe(2);
    expect(runner.whatIf.getState().currentStep).toBe(2);
  });

  it('switches beta to alpha by dropping the baseline', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'beta' });

    runner.switchMode('alpha');

    expect(runner.mode).toBe('alpha');
    expect(runner.baseline).toBeNull();
  });

  it('does nothing when switching to the current mode', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'beta' });
    const baseline = runner.baseline;

    runner.switchMode('beta');

    expect(runner.baseline).toBe(baseline);
  });

  it('notifies subscribers on step', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'alpha' });
    const listener = vi.fn();
    runner.subscribe(listener);

    runner.step();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on applyEdits', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'alpha' });
    const listener = vi.fn();
    runner.subscribe(listener);

    runner.applyEdits(EditSession.empty());

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('notifies subscribers on mode switch', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'alpha' });
    const listener = vi.fn();
    runner.subscribe(listener);

    runner.switchMode('beta');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('unsubscribe removes a listener', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'alpha' });
    const listener = vi.fn();
    const unsubscribe = runner.subscribe(listener);

    unsubscribe();
    runner.step();

    expect(listener).not.toHaveBeenCalled();
  });

  it('dispose cancels subscriptions and clears engines', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'beta' });
    const listener = vi.fn();
    runner.subscribe(listener);

    runner.dispose();
    runner.switchMode('alpha');

    expect(listener).not.toHaveBeenCalled();
    expect(runner.whatIf.getState().traces).toEqual([]);
  });

  it('throws NetlabError on branch desync', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'beta' });
    const baseline = runner.baseline;
    expect(baseline).not.toBeNull();
    if (!baseline) return;

    baseline.setState({ ...baseline.getState(), currentStep: 3 });

    expect(() => runner.step()).toThrow(/desynchronized/);
  });

  it('throws desync detail with both step indexes', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot(), { mode: 'beta' });
    const baseline = runner.baseline;
    expect(baseline).not.toBeNull();
    if (!baseline) return;

    baseline.setState({ ...baseline.getState(), currentStep: 3 });

    try {
      runner.step();
    } catch (error) {
      expect(error).toMatchObject({
        code: 'sandbox/branch-desync',
        context: { baselineStep: 3, whatIfStep: 0 },
      });
    }
  });

  it('defaults to alpha mode when opts are omitted', () => {
    const runner = new BranchedSimulationEngine(makeSnapshot());

    expect(runner.mode).toBe('alpha');
  });
});
