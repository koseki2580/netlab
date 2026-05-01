import { describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { directTopology } from '../__fixtures__/topologies';
import { makePacket } from '../__fixtures__/helpers';
import { MainThreadEngine } from './MainThreadEngine';

describe('MainThreadEngine', () => {
  it('mirrors the local engine state and notifies subscribers after sends', async () => {
    const engine = new MainThreadEngine(directTopology(), new HookEngine());
    const listener = vi.fn();

    engine.subscribe(listener);
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    expect(engine.getState().traces).toHaveLength(1);
    expect(listener).toHaveBeenCalled();
  });

  it('preserves synchronous controls for fallback execution', async () => {
    const engine = new MainThreadEngine(directTopology(), new HookEngine());
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    engine.step();

    expect(engine.getState().currentStep).toBe(0);
  });

  it('disposes subscriptions and clears local state', async () => {
    const engine = new MainThreadEngine(directTopology(), new HookEngine());
    const listener = vi.fn();
    engine.subscribe(listener);
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    engine.dispose();
    engine.step();

    expect(engine.getState().traces).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
