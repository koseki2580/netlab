import type {
  TcpCongestionEvent,
  TcpCongestionPhase,
  TcpCongestionState,
  TcpCwndUpdateReason,
} from '../../types/tcp-congestion';

interface TcpCongestionControlOptions {
  readonly mss: number;
  readonly iwSegments?: number;
  readonly initialSsthresh?: number;
}

interface OutstandingSegment {
  readonly seq: number;
  readonly bytes: number;
}

const DEFAULT_INITIAL_SSTHRESH_SEGMENTS = 64;
const MIN_SSTHRESH_SEGMENTS = 2;
const INITIAL_RTO_MS = 1000;

export class TcpCongestionControl {
  private currentState: TcpCongestionState;
  private receiverWindow = Number.POSITIVE_INFINITY;
  private outstandingSegments: OutstandingSegment[] = [];
  private lastDupAckNo: number | null = null;
  private fastRetransmitAckNo: number | null = null;
  private readonly eventLog: TcpCongestionEvent[] = [];

  constructor(options: TcpCongestionControlOptions) {
    if (!Number.isFinite(options.mss) || options.mss <= 0) {
      throw new Error('TCP congestion control requires a positive MSS');
    }

    const iwSegments = options.iwSegments ?? 1;
    if (!Number.isFinite(iwSegments) || iwSegments <= 0) {
      throw new Error('TCP congestion control requires a positive initial window');
    }

    const initialCwnd = options.mss * iwSegments;
    const initialSsthresh =
      options.initialSsthresh ?? options.mss * DEFAULT_INITIAL_SSTHRESH_SEGMENTS;

    this.currentState = {
      phase: 'slow-start',
      cwnd: initialCwnd,
      ssthresh: initialSsthresh,
      mss: options.mss,
      inflight: 0,
      dupAckCount: 0,
      rttSmoothedMs: 0,
      rttVarMs: 0,
      rtoMs: INITIAL_RTO_MS,
    };

    if (initialCwnd >= initialSsthresh) {
      this.setPhase('congestion-avoidance', 0);
    }
  }

  get state(): Readonly<TcpCongestionState> {
    return { ...this.currentState };
  }

  get events(): readonly TcpCongestionEvent[] {
    return this.eventLog;
  }

  allowedBytesToSend(): number {
    const congestionAllowance = Math.max(0, this.currentState.cwnd - this.currentState.inflight);
    return Math.max(0, Math.min(congestionAllowance, this.receiverWindow));
  }

  setRwnd(bytes: number): void {
    this.receiverWindow = Math.max(0, bytes);
  }

  onSegmentSent(seq: number, bytes: number, stepIndex: number): void {
    if (bytes <= 0) {
      return;
    }

    this.outstandingSegments = [...this.outstandingSegments, { seq, bytes }];
    this.updateState({
      inflight: this.currentState.inflight + bytes,
    });
    this.eventLog.push({ type: 'segment-sent', seq, bytes, stepIndex });
  }

  onAckReceived(ackNo: number, rttMs: number, stepIndex: number): void {
    const ackedBytes = this.removeAckedSegments(ackNo);
    this.eventLog.push({ type: 'ack-received', ackNo, rttMs, stepIndex });
    this.resetDuplicateAckState();
    this.updateRtt(rttMs);

    const nextInflight = Math.max(0, this.currentState.inflight - ackedBytes);
    this.updateState({ inflight: nextInflight });

    if (this.currentState.phase === 'fast-recovery') {
      this.setPhase('congestion-avoidance', stepIndex);
      this.updateCwnd(this.currentState.ssthresh, 'fast-recovery-deflate', stepIndex);
      this.fastRetransmitAckNo = null;
      return;
    }

    if (this.currentState.phase === 'slow-start') {
      const nextCwnd = this.currentState.cwnd + this.currentState.mss;
      if (nextCwnd >= this.currentState.ssthresh) {
        this.setPhase('congestion-avoidance', stepIndex);
      }
      this.updateCwnd(nextCwnd, 'ss-increment', stepIndex);
      return;
    }

    if (this.currentState.phase === 'congestion-avoidance') {
      this.updateCwnd(this.currentState.cwnd + this.currentState.mss, 'ca-increment', stepIndex);
    }
  }

  onDupAck(ackNo: number, stepIndex: number): void {
    const nextCount = this.lastDupAckNo === ackNo ? this.currentState.dupAckCount + 1 : 1;
    this.lastDupAckNo = ackNo;
    this.updateState({ dupAckCount: nextCount });
    this.eventLog.push({ type: 'dup-ack', ackNo, count: nextCount, stepIndex });

    if (this.currentState.phase === 'fast-recovery') {
      this.updateCwnd(
        this.currentState.cwnd + this.currentState.mss,
        'fast-recovery-inflate',
        stepIndex,
      );
      return;
    }

    if (nextCount === 3 && this.fastRetransmitAckNo !== ackNo) {
      this.enterFastRecovery(ackNo, stepIndex);
    }
  }

  onRto(seq: number, stepIndex: number): void {
    const nextSsthresh = this.lossWindowThreshold();
    this.updateState({
      ssthresh: nextSsthresh,
      dupAckCount: 0,
    });
    this.resetDuplicateAckState();
    this.fastRetransmitAckNo = null;
    this.setPhase('rto', stepIndex);
    this.updateCwnd(this.currentState.mss, 'rto-reset', stepIndex);
    this.eventLog.push({ type: 'rto-fire', seq, stepIndex });
  }

  private enterFastRecovery(ackNo: number, stepIndex: number): void {
    const nextSsthresh = this.lossWindowThreshold();
    this.updateState({ ssthresh: nextSsthresh });
    this.setPhase('fast-recovery', stepIndex);
    this.updateCwnd(nextSsthresh + 3 * this.currentState.mss, 'fast-retransmit', stepIndex);
    this.fastRetransmitAckNo = ackNo;
    this.eventLog.push({ type: 'fast-retransmit', seq: ackNo, stepIndex });
  }

  private lossWindowThreshold(): number {
    const flightSize = Math.max(this.currentState.inflight, this.currentState.cwnd);
    return Math.max(MIN_SSTHRESH_SEGMENTS * this.currentState.mss, Math.floor(flightSize / 2));
  }

  private removeAckedSegments(ackNo: number): number {
    let ackedBytes = 0;
    const remaining: OutstandingSegment[] = [];

    for (const segment of this.outstandingSegments) {
      if (segment.seq + segment.bytes <= ackNo) {
        ackedBytes += segment.bytes;
      } else {
        remaining.push(segment);
      }
    }

    this.outstandingSegments = remaining;
    return ackedBytes;
  }

  private updateRtt(sampleMs: number): void {
    if (!Number.isFinite(sampleMs) || sampleMs <= 0) {
      return;
    }

    if (this.currentState.rttSmoothedMs === 0) {
      this.updateState({
        rttSmoothedMs: sampleMs,
        rttVarMs: sampleMs / 2,
        rtoMs: sampleMs + 4 * (sampleMs / 2),
      });
      return;
    }

    const rttVarMs =
      (3 / 4) * this.currentState.rttVarMs +
      (1 / 4) * Math.abs(this.currentState.rttSmoothedMs - sampleMs);
    const rttSmoothedMs = (7 / 8) * this.currentState.rttSmoothedMs + (1 / 8) * sampleMs;

    this.updateState({
      rttSmoothedMs,
      rttVarMs,
      rtoMs: rttSmoothedMs + 4 * rttVarMs,
    });
  }

  private updateCwnd(next: number, reason: TcpCwndUpdateReason, stepIndex: number): void {
    const prev = this.currentState.cwnd;
    if (prev === next) {
      return;
    }

    this.updateState({ cwnd: next });
    this.eventLog.push({ type: 'cwnd-update', prev, next, reason, stepIndex });
  }

  private setPhase(next: TcpCongestionPhase, stepIndex: number): void {
    const prev = this.currentState.phase;
    if (prev === next) {
      return;
    }

    this.updateState({ phase: next });
    this.eventLog.push({ type: 'phase-change', from: prev, to: next, stepIndex });
  }

  private resetDuplicateAckState(): void {
    this.lastDupAckNo = null;
    this.updateState({ dupAckCount: 0 });
  }

  private updateState(next: Partial<TcpCongestionState>): void {
    this.currentState = {
      ...this.currentState,
      ...next,
    };
  }
}
