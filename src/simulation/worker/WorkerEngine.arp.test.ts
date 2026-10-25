import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import type { PacketTrace } from '../../types/simulation';
import type { NetlabNode, NetworkTopology } from '../../types/topology';
import type { ArpCacheMode } from '../types';
import type { SimulationWorkerEvent } from './protocol';
import { WorkerEngine, type WorkerLike } from './WorkerEngine';
import { SimulationWorkerRuntime } from './worker-engine-impl';

/** The worker runtime, run in this thread: what the real worker would do, message by message. */
class RuntimeBackedWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<SimulationWorkerEvent>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  private readonly runtime = new SimulationWorkerRuntime((event) => {
    this.onmessage?.({ data: event } as MessageEvent<SimulationWorkerEvent>);
  });

  postMessage(message: unknown): void {
    void this.runtime.handle(message);
  }

  terminate(): void {
    return undefined;
  }
}

const host = (id: string, ip: string): NetlabNode => ({
  id,
  type: 'client',
  position: { x: 0, y: 0 },
  data: { label: id, role: 'client', layerId: 'l7', ip },
});

/** Two hosts with no MAC written down, on one switch. */
function lan(): NetworkTopology {
  return {
    nodes: [
      host('pc', '10.0.0.10'),
      {
        id: 'sw',
        type: 'switch',
        position: { x: 0, y: 0 },
        data: {
          label: 'sw',
          role: 'switch',
          layerId: 'l2',
          ports: [0, 1].map((index) => ({
            id: `p${index}`,
            name: `fa0/${index}`,
            macAddress: `00:00:00:20:00:0${index}`,
          })),
        },
      },
      host('srv', '10.0.0.20'),
    ],
    edges: [
      { id: 'e-pc', source: 'pc', target: 'sw', targetHandle: 'p0' },
      { id: 'e-srv', source: 'sw', target: 'srv', sourceHandle: 'p1' },
    ],
    areas: [],
    routeTables: new Map(),
  };
}

const asksByArp = (trace: PacketTrace) => trace.hops.some((hop) => hop.event === 'arp-request');

async function twoPings(arpCache?: ArpCacheMode): Promise<boolean[]> {
  const engine = new WorkerEngine(lan(), new HookEngine(), {
    createWorker: () => new RuntimeBackedWorker(),
    timeoutMs: 2000,
    ...(arpCache ? { arpCache } : {}),
  });
  await engine.ready();
  const first = await engine.ping('pc', '10.0.0.20');
  const second = await engine.ping('pc', '10.0.0.20');
  engine.dispose();
  return [asksByArp(first), asksByArp(second)];
}

describe('the worker engine keeps what devices learn by ARP the same way', () => {
  it("TC-858: by default it asks once; with 'per-send' it asks on every ping", async () => {
    expect(await twoPings()).toEqual([true, false]);
    expect(await twoPings('per-send')).toEqual([true, true]);
  });
});
