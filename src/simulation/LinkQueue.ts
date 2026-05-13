import type { LinkQosConfig, LinkQosDropReason } from '../types/link';
import { normalizeLinkQos } from '../types/link';
import { drawAt } from '../utils/prng';
import { LinkShaper, type LinkShaperDrainResult, type LinkShaperState } from './LinkShaper';

export interface LinkSegment {
  readonly id: string;
  readonly byteLength: number;
}

export interface QueuedSegment {
  readonly segment: LinkSegment;
  readonly enqueuedAtStep: number;
  readonly seq: number;
}

export interface LinkQueueCounters {
  readonly enqueued: number;
  readonly dequeued: number;
  readonly dropped: number;
  readonly queueFull: number;
  readonly lossDropped: number;
  readonly linkFailed: number;
}

export interface LinkQueueState {
  readonly queue: readonly QueuedSegment[];
  readonly shaper?: LinkShaperState;
  readonly txInProgress: { readonly queued: QueuedSegment; readonly finishesAtStep: number } | null;
  readonly inFlight: readonly {
    readonly queued: QueuedSegment;
    readonly arrivesAtStep: number;
  }[];
  readonly counters: LinkQueueCounters;
  readonly seqCounter: number;
}

export type EnqueueResult =
  | {
      readonly status: 'enqueued';
      readonly segSeq: number;
      readonly queueDepth: number;
      readonly classId?: string;
    }
  | {
      readonly status: 'dropped';
      readonly reason: LinkQosDropReason;
      readonly segSeq: number;
      readonly queueDepth: number;
      readonly classId?: string;
    };

export interface LinkQueueTickResult {
  readonly dequeued: readonly {
    readonly queued: QueuedSegment;
    readonly txStartAtStep: number;
    readonly txEndAtStep: number;
    readonly classId?: string;
    readonly deficit?: number;
  }[];
  readonly dropped: readonly {
    readonly queued: QueuedSegment;
    readonly reason: LinkQosDropReason;
  }[];
  readonly arrived: readonly {
    readonly segment: LinkSegment;
    readonly queued: QueuedSegment;
    readonly totalLatencySteps: number;
  }[];
}

function mutableCounters(): LinkQueueCounters {
  return {
    enqueued: 0,
    dequeued: 0,
    dropped: 0,
    queueFull: 0,
    lossDropped: 0,
    linkFailed: 0,
  };
}

export function stepsToTransmit(segmentBytes: number, bandwidthBps: number | undefined): number {
  if (!bandwidthBps || !Number.isFinite(bandwidthBps)) return 0;
  return Math.ceil((segmentBytes * 8 * 1000) / bandwidthBps);
}

export function stepsToPropagate(propagationDelayMs: number | undefined): number {
  return Math.ceil(Math.max(0, propagationDelayMs ?? 0));
}

export class LinkQueue {
  private queue: QueuedSegment[] = [];
  private txInProgress: { queued: QueuedSegment; finishesAtStep: number } | null = null;
  private inFlight: { queued: QueuedSegment; arrivesAtStep: number }[] = [];
  private counters = mutableCounters();
  private seqCounter = 0;
  private readonly shaper: LinkShaper | null;

  constructor(readonly cfg: LinkQosConfig) {
    this.shaper = cfg.shaper ? new LinkShaper(cfg.shaper) : null;
  }

  enqueue(segment: LinkSegment, atStep: number, packetDscp = 0): EnqueueResult {
    const cfg = normalizeLinkQos(this.cfg);
    this.seqCounter += 1;
    const queued: QueuedSegment = {
      segment,
      enqueuedAtStep: atStep,
      seq: this.seqCounter,
    };

    if (this.shaper) {
      const result = this.shaper.enqueue(queued, packetDscp, atStep);
      if (result.status === 'dropped') {
        this.counters = {
          ...this.counters,
          dropped: this.counters.dropped + 1,
          queueFull: this.counters.queueFull + 1,
        };
        return {
          status: 'dropped',
          reason: result.reason,
          segSeq: queued.seq,
          queueDepth: result.queueDepth,
          classId: result.classId,
        };
      }
      this.counters = { ...this.counters, enqueued: this.counters.enqueued + 1 };
      return {
        status: 'enqueued',
        segSeq: queued.seq,
        queueDepth: result.queueDepth,
        classId: result.classId,
      };
    }

    if (this.queue.length >= cfg.queueDepthSegments) {
      this.counters = {
        ...this.counters,
        dropped: this.counters.dropped + 1,
        queueFull: this.counters.queueFull + 1,
      };
      return {
        status: 'dropped',
        reason: 'queue-full',
        segSeq: queued.seq,
        queueDepth: this.queue.length,
      };
    }

    this.queue.push(queued);
    this.counters = { ...this.counters, enqueued: this.counters.enqueued + 1 };
    return { status: 'enqueued', segSeq: queued.seq, queueDepth: this.queue.length };
  }

  private nextSegToTransmit():
    | (LinkShaperDrainResult & { fromShaper: true })
    | null
    | {
        readonly queued: QueuedSegment;
        readonly fromShaper: false;
      } {
    if (this.shaper) {
      const result = this.shaper.drainOneSlot();
      return result ? { ...result, fromShaper: true } : null;
    }
    const queued = this.queue.shift();
    return queued ? { queued, fromShaper: false } : null;
  }

  tickStep(atStep: number): LinkQueueTickResult {
    const cfg = normalizeLinkQos(this.cfg);
    const dequeued: {
      queued: QueuedSegment;
      txStartAtStep: number;
      txEndAtStep: number;
    }[] = [];
    const dropped: { queued: QueuedSegment; reason: LinkQosDropReason }[] = [];
    const arrived: {
      segment: LinkSegment;
      queued: QueuedSegment;
      totalLatencySteps: number;
    }[] = [];

    const hasQueuedWork = this.shaper
      ? this.shaper.getState().classes.some((klass) => klass.queue.length > 0)
      : this.queue.length > 0;
    if (this.txInProgress === null && hasQueuedWork) {
      const next = this.nextSegToTransmit();
      if (next) {
        const queued = next.queued;
        if (LinkQueue.shouldDrop(this.cfg, queued.seq)) {
          this.counters = {
            ...this.counters,
            dropped: this.counters.dropped + 1,
            lossDropped: this.counters.lossDropped + 1,
          };
          dropped.push({ queued, reason: 'loss' });
        } else {
          const txEndAtStep = atStep + stepsToTransmit(queued.segment.byteLength, cfg.bandwidthBps);
          this.txInProgress = { queued, finishesAtStep: txEndAtStep };
          dequeued.push({
            queued,
            txStartAtStep: atStep,
            txEndAtStep,
            ...(next.fromShaper ? { classId: next.classId, deficit: next.deficit } : {}),
          });
        }
      }
    }

    if (this.txInProgress !== null && atStep >= this.txInProgress.finishesAtStep) {
      this.inFlight.push({
        queued: this.txInProgress.queued,
        arrivesAtStep: atStep + stepsToPropagate(cfg.propagationDelayMs),
      });
      this.counters = { ...this.counters, dequeued: this.counters.dequeued + 1 };
      this.txInProgress = null;
    }

    const remainingInFlight: typeof this.inFlight = [];
    for (const entry of this.inFlight) {
      if (entry.arrivesAtStep <= atStep) {
        arrived.push({
          segment: entry.queued.segment,
          queued: entry.queued,
          totalLatencySteps: atStep - entry.queued.enqueuedAtStep,
        });
      } else {
        remainingInFlight.push(entry);
      }
    }
    this.inFlight = remainingInFlight;

    return { dequeued, dropped, arrived };
  }

  getState(): LinkQueueState {
    return {
      queue: [...this.queue],
      ...(this.shaper ? { shaper: this.shaper.getState() } : {}),
      txInProgress: this.txInProgress
        ? {
            queued: this.txInProgress.queued,
            finishesAtStep: this.txInProgress.finishesAtStep,
          }
        : null,
      inFlight: [...this.inFlight],
      counters: { ...this.counters },
      seqCounter: this.seqCounter,
    };
  }

  restoreFromState(state: LinkQueueState): void {
    this.queue = [...state.queue];
    this.txInProgress = state.txInProgress
      ? {
          queued: state.txInProgress.queued,
          finishesAtStep: state.txInProgress.finishesAtStep,
        }
      : null;
    this.inFlight = [...state.inFlight];
    this.counters = { ...state.counters };
    this.seqCounter = state.seqCounter;
    if (this.shaper && state.shaper) {
      this.shaper.restoreFromState(state.shaper);
    }
  }

  static shouldDrop(cfg: LinkQosConfig, seq: number): boolean {
    const normalized = normalizeLinkQos(cfg);
    if (normalized.lossPct <= 0) return false;
    if (normalized.lossPct >= 100) return true;
    if (normalized.lossSeed === undefined) return false;
    return drawAt(normalized.lossSeed, seq) < normalized.lossPct / 100;
  }
}
