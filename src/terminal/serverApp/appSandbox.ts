/**
 * The main-thread side of a learner's server app. It owns one dedicated Worker (created lazily, on
 * first use) that evaluates the code, and it enforces the hard time limit: a request (or the load)
 * that does not answer within `timeoutMs` terminates the worker, which is the only way to stop a
 * synchronous busy loop. A stopped sandbox stays stopped; create a new one to start again.
 */
import type {
  SandboxLoadResult,
  SandboxReply,
  SandboxRequest,
  ServerAppFailure,
  ServerAppResult,
} from './serverApp';

/** The part of a Worker the sandbox uses; tests inject a fake. */
export interface SandboxWorker {
  postMessage(request: SandboxRequest): void;
  terminate(): void;
  onmessage: ((event: { data: SandboxReply }) => void) | null;
  onerror: ((event: { message?: string }) => void) | null;
}

export interface AppSandboxOptions {
  /** How long the load and each request may take before the worker is terminated. */
  readonly timeoutMs?: number;
  readonly workerFactory?: () => SandboxWorker;
}

export interface StoppedResult {
  readonly ok: false;
  readonly kind: 'stopped';
  readonly message: string;
  readonly log: string[];
}

export type SandboxResult = ServerAppResult | StoppedResult;
export type SandboxStartResult = SandboxLoadResult | StoppedResult;

export interface AppSandbox {
  /** Loads the code in the worker; syntax and load-time errors stop the sandbox. */
  start(): Promise<SandboxStartResult>;
  /** Answers one raw HTTP/1.1 request (starting the app first if needed). */
  handle(raw: string): Promise<SandboxResult>;
  /** Terminates the worker; later requests answer `stopped`. */
  stop(): void;
  readonly running: boolean;
}

function defaultWorker(): SandboxWorker {
  // A real Worker fits SandboxWorker at runtime; its DOM event types are just wider.
  return new Worker(new URL('./sandbox.worker.ts', import.meta.url), {
    type: 'module',
  }) as unknown as SandboxWorker;
}

const STOPPED: StoppedResult = {
  ok: false,
  kind: 'stopped',
  message: 'the app is not running',
  log: [],
};

export function createAppSandbox(code: string, options: AppSandboxOptions = {}): AppSandbox {
  const timeoutMs = options.timeoutMs ?? 1000;
  const factory = options.workerFactory ?? defaultWorker;
  let running = true;
  let worker: SandboxWorker | undefined;
  let nextId = 1;
  let started: Promise<SandboxStartResult> | undefined;
  const pending = new Map<
    number,
    {
      resolve: (result: SandboxReply['result'] | ServerAppFailure) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  const shutDown = (reason: ServerAppFailure | StoppedResult) => {
    running = false;
    worker?.terminate();
    worker = undefined;
    for (const [id, entry] of pending) {
      clearTimeout(entry.timer);
      pending.delete(id);
      entry.resolve(reason as ServerAppFailure);
    }
  };

  const ensureWorker = (): SandboxWorker => {
    if (worker) return worker;
    const created = factory();
    created.onmessage = ({ data }) => {
      const entry = pending.get(data.id);
      if (!entry) return;
      clearTimeout(entry.timer);
      pending.delete(data.id);
      entry.resolve(data.result);
    };
    created.onerror = (event) => {
      shutDown({
        ok: false,
        kind: 'runtime',
        message: event.message ?? 'the sandbox worker failed',
        log: [],
      });
    };
    worker = created;
    return created;
  };

  const send = (raw?: string): Promise<SandboxReply['result'] | ServerAppFailure> =>
    new Promise((resolve) => {
      const id = nextId++;
      const timer = setTimeout(() => {
        shutDown({
          ok: false,
          kind: 'timeout',
          message: `the app did not answer within ${timeoutMs} ms; the sandbox was stopped`,
          log: [],
        });
      }, timeoutMs);
      pending.set(id, { resolve, timer });
      ensureWorker().postMessage(raw === undefined ? { id, code } : { id, code, raw });
    });

  const start = (): Promise<SandboxStartResult> => {
    if (!running) return Promise.resolve(STOPPED);
    started ??= send().then((result) => {
      if (!result.ok) shutDown(STOPPED);
      return result as SandboxStartResult;
    });
    return started;
  };

  return {
    start,
    async handle(raw) {
      const loaded = await start();
      if (!loaded.ok) return loaded;
      if (!running) return STOPPED;
      return (await send(raw)) as ServerAppResult;
    },
    stop() {
      shutDown(STOPPED);
    },
    get running() {
      return running;
    },
  };
}
