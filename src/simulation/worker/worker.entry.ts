import { protocolPacks } from '../../protocols/packs';
import { SimulationWorkerRuntime } from './worker-engine-impl';

interface WorkerLikeScope {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
}

const workerScope = globalThis as unknown as WorkerLikeScope;
const runtime = new SimulationWorkerRuntime((event) => workerScope.postMessage(event));

// IPv6 hops need ICMPv6 and ND bytes synchronously: load them before the first message
// (REQ-322). Every message waits on the same promise, so their order is kept.
const ready = protocolPacks.loadWire('icmpv6').catch(() => undefined);

workerScope.onmessage = (event: MessageEvent<unknown>) => {
  void ready.then(() => runtime.handle(event.data));
};
