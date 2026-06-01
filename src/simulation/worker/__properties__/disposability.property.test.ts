/**
 * @property-seed 0x7301 worker-disposal counterexample seed.
 * @property-num-runs 20 keeps worker lifecycle allocation tests inside the unit-test budget.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { HookEngine } from '../../../hooks/HookEngine';
import { directTopology } from '../../__fixtures__/topologies';
import { WorkerEngine, type WorkerLike } from '../WorkerEngine';
import type { SimulationWorkerEvent } from '../protocol';

class CountingWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<SimulationWorkerEvent>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  postCount = 0;
  terminateCount = 0;

  postMessage(): void {
    this.postCount += 1;
  }

  terminate(): void {
    this.terminateCount += 1;
  }
}

describe('worker disposability', () => {
  it('terminates every worker exactly once when disposed repeatedly', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 25 }), (count) => {
        const workers: CountingWorker[] = [];

        for (let i = 0; i < count; i += 1) {
          const worker = new CountingWorker();
          workers.push(worker);
          const engine = new WorkerEngine(directTopology(), new HookEngine(), {
            createWorker: () => worker,
            timeoutMs: 5,
          });
          engine.dispose();
          engine.dispose();
        }

        expect(workers.every((worker) => worker.terminateCount === 1)).toBe(true);
      }),
      { numRuns: 20, seed: 0x7301 },
    );
  });
});
