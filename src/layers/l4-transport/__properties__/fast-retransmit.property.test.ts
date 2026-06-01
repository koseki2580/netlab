/**
 * @property-seed 0x7c0c01 fast-retransmit properties.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT } from '../../../testing/seeds';
import { TcpCongestionControl } from '../TcpCongestionControl';

const PLAN_53_SEED = 0x7c0c01;

describe('TCP fast retransmit properties', () => {
  it('emits fast retransmit only when duplicate ACK count crosses from 2 to 3', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 256, max: 1460 }),
        fc.integer({ min: 3, max: 12 }),
        fc.integer({ min: 1, max: 10000 }),
        (mss, segmentsInFlight, ackNo) => {
          const control = new TcpCongestionControl({ mss });
          control.onSegmentSent(ackNo, segmentsInFlight * mss, 1);

          control.onDupAck(ackNo, 2);
          control.onDupAck(ackNo, 3);
          expect(control.events.filter((event) => event.type === 'fast-retransmit')).toHaveLength(
            0,
          );

          control.onDupAck(ackNo, 4);
          expect(control.events.filter((event) => event.type === 'fast-retransmit')).toHaveLength(
            1,
          );

          control.onDupAck(ackNo, 5);
          expect(control.events.filter((event) => event.type === 'fast-retransmit')).toHaveLength(
            1,
          );
        },
      ),
      { seed: PLAN_53_SEED, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('fast recovery exits on the full-window recovery ACK', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 256, max: 1460 }),
        fc.integer({ min: 3, max: 12 }),
        fc.integer({ min: 1, max: 10000 }),
        (mss, segmentsInFlight, seq) => {
          const control = new TcpCongestionControl({ mss });
          control.onSegmentSent(seq, segmentsInFlight * mss, 1);
          control.onDupAck(seq, 2);
          control.onDupAck(seq, 3);
          control.onDupAck(seq, 4);

          expect(control.state.phase).toBe('fast-recovery');

          control.onAckReceived(seq + segmentsInFlight * mss, 100, 5);

          expect(control.state.phase).toBe('congestion-avoidance');
        },
      ),
      { seed: PLAN_53_SEED, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
