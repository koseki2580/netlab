import { NetlabError } from '../errors';
import { SimulationEngine } from '../simulation/SimulationEngine';
import type { TraceDetailLevel } from '../simulation/TraceRecorder';
import type { ProtocolParameterSet, SandboxMode, SimulationSnapshot } from './types';
import { CheckpointLadder } from './checkpoints/ladder';
import { incrementalRerun } from './checkpoints/incremental-rerun';
import { EditSession } from './EditSession';
import { fromEngine, toEngine } from './SimulationSnapshot';

type Listener = () => void;

export class BranchedSimulationEngine {
  readonly checkpoints: CheckpointLadder;
  private readonly rootSnapshot: SimulationSnapshot;
  private currentMode: SandboxMode;
  private baselineEngine: SimulationEngine | null;
  private whatIfEngine: SimulationEngine;
  private currentSnapshot: SimulationSnapshot;
  private listeners = new Set<Listener>();
  private disposed = false;
  private currentParameters: ProtocolParameterSet;
  private lastSession: EditSession = EditSession.empty();
  private traceDetailLevel: TraceDetailLevel;

  constructor(
    base: SimulationSnapshot,
    opts: {
      mode?: SandboxMode;
      checkpointEvery?: number;
      traceDetailLevel?: TraceDetailLevel;
    } = {},
  ) {
    this.checkpoints = new CheckpointLadder(
      opts.checkpointEvery === undefined ? {} : { interval: opts.checkpointEvery },
    );
    this.rootSnapshot = base;
    this.currentSnapshot = base;
    this.currentParameters = base.parameters;
    this.currentMode = opts.mode ?? 'alpha';
    this.traceDetailLevel = opts.traceDetailLevel ?? 'full';
    this.whatIfEngine = this.toEngine(base);
    this.baselineEngine = this.currentMode === 'beta' ? this.toEngine(base) : null;
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

  get snapshot(): SimulationSnapshot {
    return this.currentSnapshot;
  }

  get root(): SimulationSnapshot {
    return this.rootSnapshot;
  }

  get parameters(): ProtocolParameterSet {
    return this.currentParameters;
  }

  get detailLevel(): TraceDetailLevel {
    return this.traceDetailLevel;
  }

  applyEdits(session: EditSession): void {
    if (!isPrefixPreserving(this.lastSession, session)) {
      this.checkpoints.clear();
    }
    this.checkpoints.pruneAfter(session.head);

    const nextSnapshot = incrementalRerun(this.rootSnapshot, session, this.checkpoints);
    const previousWhatIf = this.whatIfEngine;
    this.currentSnapshot = nextSnapshot;
    this.currentParameters = nextSnapshot.parameters;
    this.whatIfEngine = this.toEngine(nextSnapshot);
    previousWhatIf.dispose();
    this.checkpoints.onPush(session.head, nextSnapshot);
    this.lastSession = session;
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
      const snapshot = {
        ...fromEngine(this.whatIfEngine, this.currentParameters),
        annotations: this.currentSnapshot.annotations,
      };
      const previousWhatIf = this.whatIfEngine;
      this.currentSnapshot = snapshot;
      this.baselineEngine = this.toEngine(snapshot);
      this.whatIfEngine = this.toEngine(snapshot);
      previousWhatIf.dispose();
    } else {
      this.baselineEngine?.dispose();
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
    this.baselineEngine?.dispose();
    this.whatIfEngine.dispose();
    this.baselineEngine = null;
    this.currentMode = 'alpha';
  }

  setTraceDetailLevel(detailLevel: TraceDetailLevel): void {
    if (this.traceDetailLevel === detailLevel) {
      return;
    }

    const whatIfSnapshot = {
      ...fromEngine(this.whatIfEngine, this.currentParameters),
      annotations: this.currentSnapshot.annotations,
    };
    const baselineSnapshot = this.baselineEngine
      ? fromEngine(this.baselineEngine, this.currentParameters)
      : null;
    const previousWhatIf = this.whatIfEngine;
    const previousBaseline = this.baselineEngine;

    this.traceDetailLevel = detailLevel;
    this.currentSnapshot = whatIfSnapshot;
    this.whatIfEngine = this.toEngine(whatIfSnapshot);
    this.baselineEngine = baselineSnapshot ? this.toEngine(baselineSnapshot) : null;
    previousWhatIf.dispose();
    previousBaseline?.dispose();
    this.notify();
  }

  private toEngine(snapshot: SimulationSnapshot): SimulationEngine {
    return toEngine(snapshot, { traceDetailLevel: this.traceDetailLevel });
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

function isPrefixPreserving(previous: EditSession, next: EditSession): boolean {
  const commonLength = Math.min(previous.head, next.head);

  for (let index = 0; index < commonLength; index += 1) {
    if (previous.backing[index] !== next.backing[index]) {
      return false;
    }
  }

  return next.head <= previous.head || commonLength === previous.head;
}
