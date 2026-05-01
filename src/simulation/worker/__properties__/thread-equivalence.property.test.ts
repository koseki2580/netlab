import fc from 'fast-check';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../../../hooks/HookEngine';
import { makePacket } from '../../__fixtures__/helpers';
import { directTopology } from '../../__fixtures__/topologies';
import { MainThreadEngine } from '../MainThreadEngine';
import { WorkerEngine, type WorkerLike } from '../WorkerEngine';
import type { SimulationWorkerEvent } from '../protocol';
import { SimulationWorkerRuntime } from '../worker-engine-impl';

class RuntimeBackedWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<SimulationWorkerEvent>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  private readonly pending: Promise<void>[] = [];
  private readonly runtime = new SimulationWorkerRuntime((event) => {
    this.onmessage?.({ data: event } as MessageEvent<SimulationWorkerEvent>);
  });

  postMessage(message: unknown): void {
    this.pending.push(this.runtime.handle(message));
  }

  terminate(): void {
    this.pending.length = 0;
  }

  async flush(): Promise<void> {
    while (this.pending.length > 0) {
      await Promise.all(this.pending.splice(0));
    }
  }
}

describe('worker thread equivalence', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('matches main-thread state after deterministic send and step sequences', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 0, max: 4 }), async (steps) => {
        const topology = directTopology();
        const main = new MainThreadEngine(topology, new HookEngine());
        const worker = new RuntimeBackedWorker();
        const threaded = new WorkerEngine(topology, new HookEngine(), {
          createWorker: () => worker,
          timeoutMs: 100,
        });
        await worker.flush();
        await threaded.ready();
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-04-21T00:00:00.000Z'));

        const packet = {
          ...makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'),
          sessionId: 'session-1',
        };
        await main.send(packet);
        await threaded.send(packet);
        await worker.flush();

        for (let i = 0; i < steps; i += 1) {
          main.step();
          threaded.step();
          await worker.flush();
        }

        expect(threaded.getState()).toEqual(main.getState());
        threaded.dispose();
        main.dispose();
      }),
      { numRuns: 20, seed: 0x73 },
    );
  });
});
