import { SimulationWorkerRuntime } from './worker-engine-impl';

interface WorkerLikeScope {
  postMessage(message: unknown): void;
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
}

const workerScope = globalThis as unknown as WorkerLikeScope;
const runtime = new SimulationWorkerRuntime((event) => workerScope.postMessage(event));

workerScope.onmessage = (event: MessageEvent<unknown>) => {
  void runtime.handle(event.data);
};
