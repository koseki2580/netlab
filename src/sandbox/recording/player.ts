import { reduceEdit } from '../edits';
import { snapshotEquals } from '../SimulationSnapshot';
import type { Edit } from '../edits';
import type { SimulationSnapshot } from '../types';
import type { RecordedEvent, RecordedSession } from './types';

export type ReplayStatus = 'idle' | 'paused' | 'playing' | 'finished' | 'desynced';
export type ReplaySpeed = 1 | 2 | 4 | 8;

export type DesyncOracle = (
  replayed: SimulationSnapshot,
  expectedId: string,
  event: RecordedEvent,
) => boolean;

export interface ReplayPlayerOptions {
  readonly initialSpeed?: ReplaySpeed;
  readonly tickIntervalMs?: number;
  readonly schedule?: (handler: () => void, delayMs: number) => () => void;
  readonly desyncOracle?: DesyncOracle;
}

export function defaultStructuralDesyncOracle(
  replayed: SimulationSnapshot,
  _expectedId: string,
  event: RecordedEvent,
): boolean {
  if (!event.resultingSnapshot) return false;
  return !snapshotEquals(replayed, event.resultingSnapshot);
}

interface ApplyOutcome {
  readonly snapshot: SimulationSnapshot;
  readonly desync: boolean;
}

const BASE_TICK_MS = 250;

function defaultSchedule(handler: () => void, delayMs: number): () => void {
  const timer = setInterval(handler, delayMs);
  return () => clearInterval(timer);
}

export class ReplayPlayer {
  readonly recording: RecordedSession;
  private readonly schedule: NonNullable<ReplayPlayerOptions['schedule']>;
  private readonly tickIntervalMs: number;
  private readonly desyncOracle: NonNullable<ReplayPlayerOptions['desyncOracle']>;
  private currentSnapshotState: SimulationSnapshot;
  private currentSeqState = -1;
  private statusState: ReplayStatus = 'paused';
  private speedState: ReplaySpeed = 1;
  private cancelTimer: (() => void) | null = null;
  private listeners = new Set<() => void>();
  private desyncListeners = new Set<(event: RecordedEvent) => void>();
  private desyncEvent: RecordedEvent | null = null;
  private disposed = false;

  constructor(recording: RecordedSession, options: ReplayPlayerOptions = {}) {
    this.recording = recording;
    this.schedule = options.schedule ?? defaultSchedule;
    this.tickIntervalMs = options.tickIntervalMs ?? BASE_TICK_MS;
    this.speedState = options.initialSpeed ?? 1;
    this.currentSnapshotState = recording.initialSnapshot;
    // Structural oracle: if the recording carries a resultingSnapshot for the current event,
    // compare structurally via snapshotEquals (id is excluded; metadata not compared).
    this.desyncOracle = options.desyncOracle ?? defaultStructuralDesyncOracle;
  }

  get status(): ReplayStatus {
    return this.statusState;
  }

  get currentSeq(): number {
    return this.currentSeqState;
  }

  get currentSnapshot(): SimulationSnapshot {
    return this.currentSnapshotState;
  }

  get totalEvents(): number {
    return this.recording.events.length;
  }

  get speed(): ReplaySpeed {
    return this.speedState;
  }

  get desync(): RecordedEvent | null {
    return this.desyncEvent;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onDesync(listener: (event: RecordedEvent) => void): () => void {
    this.desyncListeners.add(listener);
    return () => this.desyncListeners.delete(listener);
  }

  setSpeed(speed: ReplaySpeed): void {
    if (this.speedState === speed) return;
    this.speedState = speed;
    if (this.statusState === 'playing') {
      this.stopTimer();
      this.startTimer();
    }
    this.notify();
  }

  seek(seq: number): void {
    if (this.disposed) return;
    const max = this.recording.events.length - 1;
    const clamped = Math.max(-1, Math.min(seq, max));
    if (clamped === this.currentSeqState && this.statusState !== 'desynced') {
      return;
    }

    let snapshot: SimulationSnapshot = this.recording.initialSnapshot;
    let desyncedAt: RecordedEvent | null = null;
    for (let i = 0; i <= clamped; i += 1) {
      const event = this.recording.events[i];
      if (!event) break;
      const outcome = this.applyEvent(snapshot, event);
      snapshot = outcome.snapshot;
      if (outcome.desync) {
        desyncedAt = event;
        break;
      }
    }

    this.currentSeqState = clamped;
    this.currentSnapshotState = snapshot;

    if (desyncedAt) {
      this.statusState = 'desynced';
      this.desyncEvent = desyncedAt;
      this.stopTimer();
      this.notifyDesync(desyncedAt);
    } else if (clamped >= max) {
      this.statusState = this.statusState === 'playing' ? 'finished' : this.statusState;
      if (this.statusState !== 'finished' && this.statusState !== 'desynced') {
        this.statusState = 'paused';
      }
    } else if (this.statusState !== 'playing') {
      this.statusState = 'paused';
    }

    this.notify();
  }

  stepForward(): void {
    if (this.statusState === 'desynced') return;
    this.seek(this.currentSeqState + 1);
  }

  stepBackward(): void {
    if (this.statusState === 'desynced') return;
    this.seek(this.currentSeqState - 1);
  }

  play(): void {
    this.playFromHere();
  }

  playFromHere(): void {
    if (this.disposed) return;
    if (this.statusState === 'desynced') return;
    if (this.currentSeqState >= this.recording.events.length - 1) {
      this.statusState = 'finished';
      this.notify();
      return;
    }
    this.statusState = 'playing';
    this.startTimer();
    this.notify();
  }

  pause(): void {
    if (this.statusState !== 'playing') return;
    this.statusState = 'paused';
    this.stopTimer();
    this.notify();
  }

  fork(): SimulationSnapshot {
    return this.currentSnapshotState;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.stopTimer();
    this.listeners.clear();
    this.desyncListeners.clear();
  }

  private applyEvent(base: SimulationSnapshot, event: RecordedEvent): ApplyOutcome {
    if (event.kind !== 'edit') {
      return { snapshot: base, desync: false };
    }
    const payload = event.payload as { edit: Edit };
    const next = reduceEdit(base, payload.edit);
    const desync = this.desyncOracle(next, event.resultingSnapshotId, event);
    return { snapshot: next, desync };
  }

  private startTimer(): void {
    this.stopTimer();
    const intervalMs = Math.max(1, Math.floor(this.tickIntervalMs / this.speedState));
    this.cancelTimer = this.schedule(() => {
      this.advanceTick();
    }, intervalMs);
  }

  private stopTimer(): void {
    if (this.cancelTimer) {
      this.cancelTimer();
      this.cancelTimer = null;
    }
  }

  private advanceTick(): void {
    if (this.statusState !== 'playing') return;
    if (this.currentSeqState >= this.recording.events.length - 1) {
      this.statusState = 'finished';
      this.stopTimer();
      this.notify();
      return;
    }
    this.seek(this.currentSeqState + 1);
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  private notifyDesync(event: RecordedEvent): void {
    for (const listener of this.desyncListeners) listener(event);
  }
}

export function buildSnapshotChain(recording: RecordedSession): readonly SimulationSnapshot[] {
  const chain: SimulationSnapshot[] = [recording.initialSnapshot];
  let current = recording.initialSnapshot;
  for (const event of recording.events) {
    if (event.kind === 'edit') {
      const payload = event.payload as { edit: Edit };
      current = reduceEdit(current, payload.edit);
    }
    chain.push(current);
  }
  return chain;
}

export function snapshotsEquivalent(a: SimulationSnapshot, b: SimulationSnapshot): boolean {
  return snapshotEquals(a, b);
}
