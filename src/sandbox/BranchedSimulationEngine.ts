import { NetlabError } from '../errors';
import { SimulationEngine } from '../simulation/SimulationEngine';
import type { ProtocolParameterSet, SandboxMode, SimulationSnapshot } from './types';
import { EditSession } from './EditSession';
import { fromEngine, toEngine } from './SimulationSnapshot';

type Listener = () => void;

export class BranchedSimulationEngine {
  private readonly rootSnapshot: SimulationSnapshot;
  private currentMode: SandboxMode;
  private baselineEngine: SimulationEngine | null;
  private whatIfEngine: SimulationEngine;
  private listeners = new Set<Listener>();
  private disposed = false;
  private currentParameters: ProtocolParameterSet;

  constructor(base: SimulationSnapshot, opts: { mode?: SandboxMode } = {}) {
    this.rootSnapshot = base;
    this.currentParameters = base.parameters;
    this.currentMode = opts.mode ?? 'alpha';
    this.whatIfEngine = toEngine(base);
    this.baselineEngine = this.currentMode === 'beta' ? toEngine(base) : null;
  }

  get mode(): SandboxMode {
    return this.currentMode;
  }

  get baseline(): SimulationEngine | null {
    return this.baselineEngine;
  }

  get whatIf(): SimulationEngine {
    return this.whatIfEngine;
  }

  get parameters(): ProtocolParameterSet {
    return this.currentParameters;
  }

  applyEdits(session: EditSession): void {
    const nextSnapshot = session.apply(this.rootSnapshot);
    this.currentParameters = nextSnapshot.parameters;
    this.whatIfEngine = toEngine(nextSnapshot);
    this.notify();
  }

  step(): void {
    if (this.currentMode === 'beta') {
      this.baselineEngine?.step();
      this.whatIfEngine.step();
      this.assertLockstep();
    } else {
      this.whatIfEngine.step();
    }

    this.notify();
  }

  switchMode(mode: SandboxMode): void {
    if (this.currentMode === mode) {
      return;
    }

    if (mode === 'beta') {
      const snapshot = fromEngine(this.whatIfEngine, this.currentParameters);
      this.baselineEngine = toEngine(snapshot);
      this.whatIfEngine = toEngine(snapshot);
    } else {
      this.baselineEngine = null;
    }

    this.currentMode = mode;
    this.notify();
  }

  subscribe(fn: Listener): () => void {
    if (this.disposed) {
      return () => undefined;
    }

    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  dispose(): void {
    this.disposed = true;
    this.listeners.clear();
    this.baselineEngine?.clear();
    this.whatIfEngine.clear();
    this.baselineEngine = null;
    this.currentMode = 'alpha';
  }

  private assertLockstep(): void {
    const baselineStep = this.baselineEngine?.getState().currentStep;
    const whatIfStep = this.whatIfEngine.getState().currentStep;

    if (baselineStep === undefined || baselineStep === whatIfStep) {
      return;
    }

    throw new NetlabError({
      code: 'sandbox/branch-desync',
      message: '[netlab] sandbox branches desynchronized',
      context: {
        baselineStep,
        whatIfStep,
      },
    });
  }

  private notify(): void {
    if (this.disposed) {
      return;
    }

    this.listeners.forEach((listener) => listener());
  }
}
