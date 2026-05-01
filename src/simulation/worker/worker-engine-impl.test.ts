import { describe, expect, it } from 'vitest';
import { directTopology } from '../__fixtures__/topologies';
import { makePacket } from '../__fixtures__/helpers';
import { INITIAL_SIMULATION_STATE } from './initialState';
import { SimulationWorkerRuntime } from './worker-engine-impl';
import type { SimulationWorkerEvent } from './protocol';

describe('SimulationWorkerRuntime', () => {
  it('seeds a local engine and publishes ready plus state events', async () => {
    const events: SimulationWorkerEvent[] = [];
    const runtime = new SimulationWorkerRuntime((event) => events.push(event));

    await runtime.handle({
      type: 'seed',
      id: 'req-1',
      topology: directTopology(),
      state: INITIAL_SIMULATION_STATE,
      playIntervalMs: 100,
    });

    expect(events.map((event) => event.type)).toContain('ready');
    expect(events.some((event) => event.type === 'state' && event.state.currentStep === -1)).toBe(
      true,
    );
  });

  it('dispatches send and step commands against the local engine', async () => {
    const events: SimulationWorkerEvent[] = [];
    const runtime = new SimulationWorkerRuntime((event) => events.push(event));
    await runtime.handle({
      type: 'seed',
      id: 'seed',
      topology: directTopology(),
      state: INITIAL_SIMULATION_STATE,
      playIntervalMs: 100,
    });

    await runtime.handle({
      type: 'send',
      id: 'send',
      packet: makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    });
    await runtime.handle({ type: 'step', id: 'step' });

    const states = events.filter((event) => event.type === 'state');
    expect(states[states.length - 1]?.state.currentStep).toBe(0);
    expect(events.some((event) => event.type === 'result' && event.id === 'send')).toBe(true);
  });

  it('rejects invalid commands without throwing out of the worker runtime', async () => {
    const events: SimulationWorkerEvent[] = [];
    const runtime = new SimulationWorkerRuntime((event) => events.push(event));

    await runtime.handle({ type: 'step' });

    expect(events).toEqual([
      {
        type: 'error',
        id: 'unknown',
        code: 'worker/invalid-command',
        detail: { type: 'step' },
      },
    ]);
  });

  it('emits serializable hook events when stepped packets cross hook points', async () => {
    const events: SimulationWorkerEvent[] = [];
    const runtime = new SimulationWorkerRuntime((event) => events.push(event));
    await runtime.handle({
      type: 'seed',
      id: 'seed',
      topology: directTopology(),
      state: INITIAL_SIMULATION_STATE,
      playIntervalMs: 100,
    });
    await runtime.handle({
      type: 'send',
      id: 'send',
      packet: makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
    });

    await runtime.handle({ type: 'step', id: 'step' });

    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'hook',
        id: 'hook',
        point: 'packet:create',
      }),
    );
  });
});
