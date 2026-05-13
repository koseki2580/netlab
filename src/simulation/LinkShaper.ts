import type { LinkQosDropReason, LinkShaperConfig } from '../types/link';
import { assertDscp } from '../types/packets';
import type { QueuedSegment } from './LinkQueue';

export interface LinkShaperClassState {
  readonly id: string;
  readonly queue: readonly QueuedSegment[];
  readonly deficit: number;
  readonly quantum: number;
  readonly enqueuedTotal: number;
  readonly droppedTotal: number;
}

export interface LinkShaperState {
  readonly classes: readonly LinkShaperClassState[];
  readonly activeIdx: number;
}

export type LinkShaperEnqueueResult =
  | { readonly status: 'enqueued'; readonly classId: string; readonly queueDepth: number }
  | {
      readonly status: 'dropped';
      readonly reason: LinkQosDropReason;
      readonly classId: string;
      readonly queueDepth: number;
    };

export interface LinkShaperDrainResult {
  readonly queued: QueuedSegment;
  readonly classId: string;
  readonly deficit: number;
}

interface MutableClassState {
  id: string;
  dscp: readonly number[];
  default: boolean;
  queue: QueuedSegment[];
  deficit: number;
  quantum: number;
  queueDepthSegments: number;
  enqueuedTotal: number;
  droppedTotal: number;
}

const DEFAULT_MTU_BYTES = 1500;
const QUANTUM_SCALE = 64;

function makeClassStates(cfg: LinkShaperConfig, mtuBytes: number): MutableClassState[] {
  return cfg.classes.map((klass) => ({
    id: klass.id,
    dscp: klass.dscp,
    default: klass.default === true,
    queue: [],
    deficit: 0,
    quantum: Math.max(1, Math.round((klass.weightPct * mtuBytes * QUANTUM_SCALE) / 100)),
    queueDepthSegments: klass.queueDepthSegments,
    enqueuedTotal: 0,
    droppedTotal: 0,
  }));
}

export class LinkShaper {
  private classes: MutableClassState[];
  private activeIdx = 0;

  constructor(
    readonly cfg: LinkShaperConfig,
    readonly mtuBytes = DEFAULT_MTU_BYTES,
  ) {
    this.classes = makeClassStates(cfg, mtuBytes);
  }

  enqueue(seg: QueuedSegment, packetDscp: number, _atStep: number): LinkShaperEnqueueResult {
    const classIndex = LinkShaper.classifyDscp(this.cfg, packetDscp);
    const klass = this.classes[classIndex];
    if (!klass) {
      throw new Error(`No shaper class for DSCP ${packetDscp}`);
    }

    if (klass.queue.length >= klass.queueDepthSegments) {
      klass.droppedTotal += 1;
      return {
        status: 'dropped',
        reason: 'class-queue-full',
        classId: klass.id,
        queueDepth: klass.queue.length,
      };
    }

    klass.queue.push(seg);
    klass.enqueuedTotal += 1;
    return { status: 'enqueued', classId: klass.id, queueDepth: klass.queue.length };
  }

  drainOneSlot(): LinkShaperDrainResult | null {
    if (this.classes.every((klass) => klass.queue.length === 0)) {
      return null;
    }

    for (let pass = 0; pass < 2; pass += 1) {
      for (let offset = 0; offset < this.classes.length; offset += 1) {
        const index = (this.activeIdx + offset) % this.classes.length;
        const klass = this.classes[index];
        if (!klass) continue;

        const head = klass.queue[0];
        if (!head) {
          klass.deficit = 0;
          continue;
        }

        if (klass.deficit < head.segment.byteLength) {
          klass.deficit += klass.quantum;
          if (klass.deficit < head.segment.byteLength) continue;
        }

        const queued = klass.queue.shift();
        if (!queued) continue;
        klass.deficit -= queued.segment.byteLength;
        const nextHead = klass.queue[0];
        this.activeIdx =
          nextHead && klass.deficit >= nextHead.segment.byteLength
            ? index
            : (index + 1) % this.classes.length;
        return { queued, classId: klass.id, deficit: klass.deficit };
      }
    }

    return null;
  }

  getState(): LinkShaperState {
    return {
      classes: this.classes.map((klass) => ({
        id: klass.id,
        queue: [...klass.queue],
        deficit: klass.deficit,
        quantum: klass.quantum,
        enqueuedTotal: klass.enqueuedTotal,
        droppedTotal: klass.droppedTotal,
      })),
      activeIdx: this.activeIdx,
    };
  }

  restoreFromState(state: LinkShaperState): void {
    this.classes = this.classes.map((klass) => {
      const snapshot = state.classes.find((candidate) => candidate.id === klass.id);
      return {
        ...klass,
        queue: [...(snapshot?.queue ?? [])],
        deficit: snapshot?.deficit ?? 0,
        enqueuedTotal: snapshot?.enqueuedTotal ?? 0,
        droppedTotal: snapshot?.droppedTotal ?? 0,
      };
    });
    this.activeIdx = state.activeIdx;
  }

  static classifyDscp(cfg: LinkShaperConfig, dscp: number): number {
    assertDscp(dscp);
    const explicit = cfg.classes.findIndex((klass) => klass.dscp.includes(dscp));
    if (explicit >= 0) {
      return explicit;
    }
    const fallback = cfg.classes.findIndex((klass) => klass.default === true);
    return fallback >= 0 ? fallback : 0;
  }
}
