import { describe, expect, it } from 'vitest';
import { HookEngine } from '../hooks/HookEngine';
import { directTopology } from './__fixtures__/topologies';
import { SimulationEngine } from './SimulationEngine';
import type { WorkerLike } from './worker/WorkerEngine';
import type { SimulationWorkerEvent } from './worker/protocol';

class CapturingWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<SimulationWorkerEvent>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;
  readonly messages: unknown[] = [];

  postMessage(message: unknown): void {
    this.messages.push(message);
  }

  terminate(): void {
    return undefined;
  }
}

describe('SimulationEngine worker facade dispatch', () => {
  it('uses the main-thread fallback when explicitly requested', async () => {
    const engine = new SimulationEngine(directTopology(), new HookEngine(), {
      useMainThread: true,
    });

    expect(engine.getState().currentStep).toBe(-1);
    engine.dispose();
  });

  it('constructs the worker proxy when a worker factory is provided', () => {
    const worker = new CapturingWorker();
    const engine = new SimulationEngine(directTopology(), new HookEngine(), {
      createWorker: () => worker,
      timeoutMs: 100,
    });

    expect(worker.messages).toContainEqual(expect.objectContaining({ type: 'seed' }));
    engine.dispose();
  });
});
