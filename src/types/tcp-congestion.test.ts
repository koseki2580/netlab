import { describe, expect, it } from 'vitest';
import {
  isAckReceivedEvent,
  isCwndUpdateEvent,
  isDupAckEvent,
  isFastRetransmitEvent,
  isPhaseChangeEvent,
  isRtoFireEvent,
  isSegmentSentEvent,
  isTcpCongestionEvent,
  type TcpCongestionEvent,
} from './tcp-congestion';

describe('TCP congestion event predicates', () => {
  const events: TcpCongestionEvent[] = [
    { type: 'phase-change', from: 'slow-start', to: 'congestion-avoidance', stepIndex: 1 },
    { type: 'cwnd-update', prev: 1000, next: 2000, reason: 'ss-increment', stepIndex: 2 },
    { type: 'segment-sent', seq: 1, bytes: 1000, stepIndex: 3 },
    { type: 'ack-received', ackNo: 1001, rttMs: 100, stepIndex: 4 },
    { type: 'dup-ack', ackNo: 1001, count: 3, stepIndex: 5 },
    { type: 'fast-retransmit', seq: 1001, stepIndex: 6 },
    { type: 'rto-fire', seq: 1001, stepIndex: 7 },
  ];

  it('recognizes every supported event variant', () => {
    for (const event of events) {
      expect(isTcpCongestionEvent(event)).toBe(true);
    }
  });

  it('rejects malformed event objects', () => {
    expect(isTcpCongestionEvent({ type: 'missing' })).toBe(false);
  });

  it('narrows phase-change events', () => {
    expect(isPhaseChangeEvent(events[0])).toBe(true);
  });

  it('narrows cwnd-update events', () => {
    expect(isCwndUpdateEvent(events[1])).toBe(true);
  });

  it('narrows segment-sent events', () => {
    expect(isSegmentSentEvent(events[2])).toBe(true);
  });

  it('narrows ack-received events', () => {
    expect(isAckReceivedEvent(events[3])).toBe(true);
  });

  it('narrows duplicate ACK events', () => {
    expect(isDupAckEvent(events[4])).toBe(true);
  });

  it('narrows fast retransmit and RTO events', () => {
    expect(isFastRetransmitEvent(events[5])).toBe(true);
    expect(isRtoFireEvent(events[6])).toBe(true);
  });
});
