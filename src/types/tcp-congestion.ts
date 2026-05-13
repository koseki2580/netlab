export type TcpCongestionPhase = 'slow-start' | 'congestion-avoidance' | 'fast-recovery' | 'rto';

export interface TcpCongestionState {
  readonly phase: TcpCongestionPhase;
  readonly cwnd: number;
  readonly ssthresh: number;
  readonly mss: number;
  readonly inflight: number;
  readonly dupAckCount: number;
  readonly rttSmoothedMs: number;
  readonly rttVarMs: number;
  readonly rtoMs: number;
}

export type TcpCwndUpdateReason =
  | 'ss-increment'
  | 'ca-increment'
  | 'fast-retransmit'
  | 'fast-recovery-inflate'
  | 'fast-recovery-deflate'
  | 'rto-reset';

export type TcpCongestionEvent =
  | {
      readonly type: 'phase-change';
      readonly from: TcpCongestionPhase;
      readonly to: TcpCongestionPhase;
      readonly stepIndex: number;
    }
  | {
      readonly type: 'cwnd-update';
      readonly prev: number;
      readonly next: number;
      readonly reason: TcpCwndUpdateReason;
      readonly stepIndex: number;
    }
  | {
      readonly type: 'segment-sent';
      readonly seq: number;
      readonly bytes: number;
      readonly stepIndex: number;
    }
  | {
      readonly type: 'ack-received';
      readonly ackNo: number;
      readonly rttMs: number;
      readonly stepIndex: number;
    }
  | {
      readonly type: 'dup-ack';
      readonly ackNo: number;
      readonly count: number;
      readonly stepIndex: number;
    }
  | { readonly type: 'fast-retransmit'; readonly seq: number; readonly stepIndex: number }
  | { readonly type: 'rto-fire'; readonly seq: number; readonly stepIndex: number };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function hasNumber(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'number' && Number.isFinite(value[key]);
}

export function isPhaseChangeEvent(
  value: unknown,
): value is Extract<TcpCongestionEvent, { type: 'phase-change' }> {
  return isRecord(value) && value.type === 'phase-change' && hasNumber(value, 'stepIndex');
}

export function isCwndUpdateEvent(
  value: unknown,
): value is Extract<TcpCongestionEvent, { type: 'cwnd-update' }> {
  return (
    isRecord(value) &&
    value.type === 'cwnd-update' &&
    hasNumber(value, 'prev') &&
    hasNumber(value, 'next') &&
    hasNumber(value, 'stepIndex')
  );
}

export function isSegmentSentEvent(
  value: unknown,
): value is Extract<TcpCongestionEvent, { type: 'segment-sent' }> {
  return (
    isRecord(value) &&
    value.type === 'segment-sent' &&
    hasNumber(value, 'seq') &&
    hasNumber(value, 'bytes') &&
    hasNumber(value, 'stepIndex')
  );
}

export function isAckReceivedEvent(
  value: unknown,
): value is Extract<TcpCongestionEvent, { type: 'ack-received' }> {
  return (
    isRecord(value) &&
    value.type === 'ack-received' &&
    hasNumber(value, 'ackNo') &&
    hasNumber(value, 'rttMs') &&
    hasNumber(value, 'stepIndex')
  );
}

export function isDupAckEvent(
  value: unknown,
): value is Extract<TcpCongestionEvent, { type: 'dup-ack' }> {
  return (
    isRecord(value) &&
    value.type === 'dup-ack' &&
    hasNumber(value, 'ackNo') &&
    hasNumber(value, 'count') &&
    hasNumber(value, 'stepIndex')
  );
}

export function isFastRetransmitEvent(
  value: unknown,
): value is Extract<TcpCongestionEvent, { type: 'fast-retransmit' }> {
  return (
    isRecord(value) &&
    value.type === 'fast-retransmit' &&
    hasNumber(value, 'seq') &&
    hasNumber(value, 'stepIndex')
  );
}

export function isRtoFireEvent(
  value: unknown,
): value is Extract<TcpCongestionEvent, { type: 'rto-fire' }> {
  return (
    isRecord(value) &&
    value.type === 'rto-fire' &&
    hasNumber(value, 'seq') &&
    hasNumber(value, 'stepIndex')
  );
}

export function isTcpCongestionEvent(value: unknown): value is TcpCongestionEvent {
  return (
    isPhaseChangeEvent(value) ||
    isCwndUpdateEvent(value) ||
    isSegmentSentEvent(value) ||
    isAckReceivedEvent(value) ||
    isDupAckEvent(value) ||
    isFastRetransmitEvent(value) ||
    isRtoFireEvent(value)
  );
}
