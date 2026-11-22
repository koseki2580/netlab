/**
 * TC-2256: the worker scope hides network, storage and worker APIs from learner code before it runs.
 * Importing the worker module installs it on this test file's global scope (Vitest isolates files).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { SandboxReply, SandboxRequest } from './serverApp';

const scope = globalThis as unknown as Record<string, unknown> & {
  onmessage: ((event: { data: SandboxRequest }) => void) | null;
};
const replies: SandboxReply[] = [];
const NAMES = [
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
];

beforeAll(async () => {
  // Stand-ins for what a browser worker scope has and Node lacks.
  for (const name of NAMES) {
    if (!(name in scope)) {
      Object.defineProperty(scope, name, { value: () => {}, configurable: true, writable: true });
    }
  }
  Object.defineProperty(navigator, 'storage', { value: {}, configurable: true });
  scope.postMessage = (message: unknown) => replies.push(message as SandboxReply);
  await import('./sandbox.worker');
});

async function ask(request: SandboxRequest): Promise<SandboxReply> {
  const before = replies.length;
  scope.onmessage?.({ data: request });
  for (let i = 0; i < 50 && replies.length === before; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
  return replies[before] as SandboxReply;
}

describe('TC-2256: learner code in the worker sees no network, storage or worker APIs', () => {
  it('every shadowed name is undefined to the app, and navigator.storage too', async () => {
    const list = JSON.stringify(NAMES);
    const code = `app.get('/', (req, res) => res.json({
      types: ${list}.map((n) => typeof globalThis[n]),
      storage: typeof navigator.storage,
    }));`;
    const reply = await ask({ id: 1, code, raw: 'GET / HTTP/1.1\r\nHost: www\r\n\r\n' });
    expect(reply.result.ok).toBe(true);
    if (!reply.result.ok || !('raw' in reply.result)) return;
    expect(JSON.parse(reply.result.response.body)).toEqual({
      types: NAMES.map(() => 'undefined'),
      storage: 'undefined',
    });
  });
});
