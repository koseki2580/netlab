/**
 * The dedicated worker that runs a learner's server app (see appSandbox.ts, which owns it).
 *
 * Before any learner code is evaluated, the network, storage and worker-spawning APIs of the worker
 * scope are removed. This is defence in depth for a learning tool, NOT a security boundary claim:
 * dynamic import() is syntax and cannot be shadowed, the code is the viewer's own, kept only in
 * their browser, and the worker is terminated on stop or timeout.
 */
import { createAppHost, type SandboxRequest } from './serverApp';

const scope = globalThis as unknown as Record<string, unknown> & {
  onmessage: ((event: { data: SandboxRequest }) => void) | null;
  postMessage: (message: unknown) => void;
};

for (const name of [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'EventSource',
  'importScripts',
  'indexedDB',
  'caches',
  'Worker',
  'SharedWorker',
  'WebTransport',
  'BroadcastChannel',
]) {
  try {
    // Many of these live on the prototype, so shadow them on the scope itself and lock that in.
    Object.defineProperty(scope, name, { value: undefined, writable: false, configurable: false });
  } catch {
    try {
      delete scope[name];
    } catch {
      // Nothing more can be done for this name; the others are still removed.
    }
  }
}

// navigator.storage (the Storage API) lives on WorkerNavigator's prototype; shadow it on the instance.
const nav = scope['navigator'];
if (typeof nav === 'object' && nav !== null && 'storage' in nav) {
  try {
    Object.defineProperty(nav, 'storage', {
      value: undefined,
      writable: false,
      configurable: false,
    });
  } catch {
    // Left as it is; the APIs above are still removed.
  }
}

const host = createAppHost();
const post = scope.postMessage.bind(scope);

scope.onmessage = (event) => {
  void host(event.data).then(post);
};
