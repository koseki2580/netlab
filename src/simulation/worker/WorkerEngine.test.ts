import { describe, expect, it, vi } from 'vitest';
import { HookEngine } from '../../hooks/HookEngine';
import { directTopology } from '../__fixtures__/topologies';
import { makePacket } from '../__fixtures__/helpers';
import type { SimulationWorkerEvent } from './protocol';
import { WorkerEngine, type WorkerLike } from './WorkerEngine';
import { SimulationWorkerRuntime } from './worker-engine-impl';

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
    await Promise.all(this.pending.splice(0));
  }
}

class SilentWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<SimulationWorkerEvent>) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onmessageerror: ((event: MessageEvent) => void) | null = null;

  postMessage(): void {
    // Intentionally left silent for timeout coverage.
  }

  terminate(): void {
    return undefined;
  }
}

describe('WorkerEngine', () => {
  it('correlates worker requests and mirrors state responses', async () => {
    const fakeWorker = new RuntimeBackedWorker();
    const engine = new WorkerEngine(directTopology(), new HookEngine(), {
      createWorker: () => fakeWorker,
      timeoutMs: 100,
    });
    await fakeWorker.flush();
    await engine.ready();

    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));
    await fakeWorker.flush();

    expect(engine.getState().traces).toHaveLength(1);
  });

  it('keeps synchronous step API while updating from worker state events', async () => {
    const fakeWorker = new RuntimeBackedWorker();
    const engine = new WorkerEngine(directTopology(), new HookEngine(), {
      createWorker: () => fakeWorker,
      timeoutMs: 100,
    });
    await fakeWorker.flush();
    await engine.ready();
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    engine.step();
    await fakeWorker.flush();

    expect(engine.getState().currentStep).toBe(0);
  });

  // TC-340 — play after a send walks the trace; it used to stay at the start.
  it('plays a sent trace through to its last hop, and pause holds it', async () => {
    vi.useFakeTimers();
    try {
      const fakeWorker = new RuntimeBackedWorker();
      const engine = new WorkerEngine(directTopology(), new HookEngine(), {
        createWorker: () => fakeWorker,
        timeoutMs: 100_000,
      });
      await fakeWorker.flush();
      await engine.ready();
      await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));
      await fakeWorker.flush();
      const hops = engine.getState().traces[0]?.hops.length ?? 0;
      expect(hops).toBeGreaterThan(1);

      engine.play(100);
      await fakeWorker.flush();
      expect(engine.getState().status).toBe('running');
      await vi.advanceTimersByTimeAsync(100);
      expect(engine.getState().currentStep).toBe(0);

      engine.pause();
      await fakeWorker.flush();
      await vi.advanceTimersByTimeAsync(1000);
      expect(engine.getState().currentStep).toBe(0);
      expect(engine.getState().status).toBe('paused');

      engine.play(100);
      await fakeWorker.flush();
      await vi.advanceTimersByTimeAsync(100 * hops);
      expect(engine.getState().currentStep).toBe(hops - 1);
      expect(engine.getState().status).toBe('done');
      engine.dispose();
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects requests that time out', async () => {
    const engine = new WorkerEngine(directTopology(), new HookEngine(), {
      createWorker: () => new SilentWorker(),
      timeoutMs: 5,
    });

    await expect(engine.ready()).rejects.toThrow(/timed out/);
  });

  it('replays worker hook events through the main-thread hook engine', async () => {
    const fakeWorker = new RuntimeBackedWorker();
    const hookEngine = new HookEngine();
    const onCreate = vi.fn(async (_ctx, next) => next());
    hookEngine.on('packet:create', onCreate);
    const engine = new WorkerEngine(directTopology(), hookEngine, {
      createWorker: () => fakeWorker,
      timeoutMs: 100,
    });
    await fakeWorker.flush();
    await engine.ready();
    await engine.send(makePacket('p1', 'client-1', 'server-1', '10.0.0.10', '203.0.113.10'));

    engine.step();
    await fakeWorker.flush();

    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ sourceNodeId: 'client-1' }),
      expect.any(Function),
    );
  });
});
