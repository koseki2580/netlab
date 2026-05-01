import type { HookEngine } from '../../hooks/HookEngine';
import type { SimulationState } from '../../types/simulation';
import type { NetworkTopology } from '../../types/topology';
import { LocalSimulationEngine, type LocalSimulationEngineOptions } from '../LocalSimulationEngine';

export class MainThreadEngine extends LocalSimulationEngine {
  private readonly unsubscribers = new Set<() => void>();
  private disposed = false;

  constructor(
    topology: NetworkTopology,
    hookEngine: HookEngine,
    opts: LocalSimulationEngineOptions = {},
  ) {
    super(topology, hookEngine, opts);
  }

  override subscribe(listener: (state: SimulationState) => void): () => void {
    if (this.disposed) {
      return () => undefined;
    }

    const unsubscribe = super.subscribe(listener);
    const tracked = () => {
      this.unsubscribers.delete(tracked);
      unsubscribe();
    };
    this.unsubscribers.add(tracked);
    return tracked;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.unsubscribers.clear();
    this.clear();
  }
}
