import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAppSandbox, type SandboxWorker } from './appSandbox';
import { createAppHost, type SandboxReply, type SandboxRequest } from './serverApp';

/** Answers like the real worker does, but in-process (vitest has no Worker). */
class InProcessWorker implements SandboxWorker {
  onmessage: ((event: { data: SandboxReply }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  terminated = false;
  private readonly host = createAppHost();
  postMessage(request: SandboxRequest): void {
    void this.host(request).then((reply) => {
      if (!this.terminated) this.onmessage?.({ data: reply });
    });
  }
  terminate(): void {
    this.terminated = true;
  }
}

/** A worker stuck in a busy loop: it never answers. */
class SilentWorker implements SandboxWorker {
  onmessage: ((event: { data: SandboxReply }) => void) | null = null;
  onerror: ((event: { message?: string }) => void) | null = null;
  terminated = false;
  postMessage(): void {}
  terminate(): void {
    this.terminated = true;
  }
}

const GET = (path: string) => `GET ${path} HTTP/1.1\r\nHost: www.example.test\r\n\r\n`;

afterEach(() => {
  vi.useRealTimers();
});

describe('TC-2209: the app sandbox answers requests, reports errors and stops on timeout', () => {
  it('answers a request through the worker and keeps app state between requests', async () => {
    const code = `let hits = 0; app.get('/count', (req, res) => res.send(String(++hits)));`;
    const sandbox = createAppSandbox(code, { workerFactory: () => new InProcessWorker() });
    expect(sandbox.running).toBe(true);
    const first = await sandbox.handle(GET('/count'));
    const second = await sandbox.handle(GET('/count'));
    expect(first.ok && first.response.body).toBe('1');
    expect(second.ok && second.response.body).toBe('2');
    expect(second.ok && second.raw.startsWith('HTTP/1.1 200 OK\r\n')).toBe(true);
  });

  it('reports a syntax error at start and is then not running', async () => {
    const sandbox = createAppSandbox(`app.get('/', (`, {
      workerFactory: () => new InProcessWorker(),
    });
    const started = await sandbox.start();
    expect(started.ok).toBe(false);
    expect(!started.ok && started.kind).toBe('syntax');
    expect(!started.ok && started.message).toBe("Unexpected token '}'");
    expect(sandbox.running).toBe(false);
  });

  it('reports a syntax error on the first request when start() was not called', async () => {
    const sandbox = createAppSandbox(`}{`, { workerFactory: () => new InProcessWorker() });
    const result = await sandbox.handle(GET('/'));
    expect(!result.ok && result.kind).toBe('syntax');
    expect(sandbox.running).toBe(false);
  });

  it('does not create the worker until it is first used', async () => {
    let created = 0;
    const sandbox = createAppSandbox(`app.get('/', (req, res) => res.send('ok'));`, {
      workerFactory: () => {
        created += 1;
        return new InProcessWorker();
      },
    });
    expect(created).toBe(0);
    await sandbox.handle(GET('/'));
    expect(created).toBe(1);
  });

  it('terminates a worker that does not answer within timeoutMs and stops', async () => {
    vi.useFakeTimers();
    const worker = new SilentWorker();
    const sandbox = createAppSandbox(`while (true) {}`, {
      timeoutMs: 1000,
      workerFactory: () => worker,
    });
    const pending = sandbox.handle(GET('/'));
    await vi.advanceTimersByTimeAsync(999);
    expect(sandbox.running).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    const result = await pending;
    expect(result.ok).toBe(false);
    expect(!result.ok && result.kind).toBe('timeout');
    expect(!result.ok && result.message).toMatch(/1000 ms/);
    expect(sandbox.running).toBe(false);
    // The busy worker itself is killed: that is the only way to stop a busy loop.
    expect(worker.terminated).toBe(true);
    const after = await sandbox.handle(GET('/'));
    expect(!after.ok && after.kind).toBe('stopped');
  });

  it('stop() ends the app: later requests are answered as stopped', async () => {
    const worker = new InProcessWorker();
    const sandbox = createAppSandbox(`app.get('/', (req, res) => res.send('ok'));`, {
      workerFactory: () => worker,
    });
    await sandbox.handle(GET('/'));
    sandbox.stop();
    expect(sandbox.running).toBe(false);
    expect(worker.terminated).toBe(true);
    const result = await sandbox.handle(GET('/'));
    expect(!result.ok && result.kind).toBe('stopped');
  });
});

/** A worker that posts `noise` before each real reply, as compromised learner code could. */
class NoisyWorker extends InProcessWorker {
  constructor(private readonly noise: (request: SandboxRequest) => unknown[]) {
    super();
  }
  override postMessage(request: SandboxRequest): void {
    for (const data of this.noise(request)) {
      this.onmessage?.({ data: data as SandboxReply });
    }
    super.postMessage(request);
  }
}

const OK_CODE = `app.get('/', (req, res) => res.send('real'));`;

describe('TC-2257: the sandbox accepts only well-formed replies to pending requests', () => {
  it('ignores replies with an unknown id or a bad shape and still answers with the real one', async () => {
    const forged = (id: number) => ({
      id,
      result: {
        ok: true,
        raw: 'HTTP/1.1 200 OK\r\n\r\nforged',
        response: { status: 200 },
        log: [],
      },
    });
    const worker = new NoisyWorker(({ id, raw }) => [
      forged(id + 100),
      null,
      'nonsense',
      { id, result: { ok: 'yes', raw: 'x', log: [] } },
      // A request reply without raw.
      ...(raw === undefined ? [] : [{ id, result: { ok: true, log: [] } }]),
      { id, result: { ok: true, raw: 42, response: { status: 200 }, log: [] } },
      { id, result: { ok: false, kind: 'syntax', message: 7, log: [] } },
    ]);
    const sandbox = createAppSandbox(OK_CODE, { workerFactory: () => worker });
    const result = await sandbox.handle(GET('/'));
    expect(result.ok && result.response.body).toBe('real');
    expect(sandbox.running).toBe(true);
  });
});

describe('TC-2258: more than 50 stray messages stop the sandbox', () => {
  it('terminates the worker and answers the waiting request as stopped', async () => {
    let flood = false;
    const worker = new NoisyWorker(({ id }) =>
      flood ? Array.from({ length: 51 }, () => ({ id: id + 1000, result: { ok: true } })) : [],
    );
    const sandbox = createAppSandbox(OK_CODE, { workerFactory: () => worker });
    expect((await sandbox.start()).ok).toBe(true);
    flood = true;
    const result = await sandbox.handle(GET('/'));
    expect(!result.ok && result.kind).toBe('stopped');
    expect(sandbox.running).toBe(false);
    expect(worker.terminated).toBe(true);
  });

  it('50 stray messages are tolerated', async () => {
    const worker = new NoisyWorker(({ id }) =>
      Array.from({ length: 25 }, () => ({ id: id + 1000, result: { ok: true } })),
    );
    const sandbox = createAppSandbox(OK_CODE, { workerFactory: () => worker });
    const result = await sandbox.handle(GET('/')); // start + request: 50 strays
    expect(result.ok && result.response.body).toBe('real');
    expect(sandbox.running).toBe(true);
  });
});
