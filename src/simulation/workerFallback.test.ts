/** TC-1168: an environment that cannot start the module worker falls back to the main thread (REQ-312). */
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import type { NetworkTopology } from '../types/topology';
import { SimulationEngine } from './SimulationEngine';

const topology = {
  nodes: [
    {
      id: 'a',
      type: 'client',
      position: { x: 0, y: 0 },
      data: { label: 'a', role: 'client', layerId: 'l7', ip: '10.0.0.1' },
    },
    {
      id: 'b',
      type: 'server',
      position: { x: 0, y: 0 },
      data: { label: 'b', role: 'server', layerId: 'l7', ip: '10.0.0.2' },
    },
  ],
  edges: [{ id: 'e', source: 'a', target: 'b' }],
  areas: [],
  routeTables: new Map(),
} as unknown as NetworkTopology;

describe('when the module worker cannot start (TC-1168)', () => {
  it('runs the engine on the main thread instead of throwing', async () => {
    const engine = new SimulationEngine(topology, new HookEngine(), {
      createWorker: () => {
        throw new TypeError('Invalid URL');
      },
    });
    expect(engine.pipeline).toBeDefined();
    const trace = await engine.ping('a', '10.0.0.2');
    expect(trace.status).toBe('delivered');
  });
});
