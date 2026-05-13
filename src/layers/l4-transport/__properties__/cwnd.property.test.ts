/**
 * @property-seed 0x7c0c01 plan/53 congestion-window properties.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT } from '../../../testing/seeds';
import { TcpCongestionControl } from '../TcpCongestionControl';

const PLAN_53_SEED = 0x7c0c01;

describe('TCP congestion-window properties', () => {
  it('slow start grows by at least one MSS and by no more than 2x per ACK round', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 256, max: 1460 }),
        fc.integer({ min: 1, max: 8 }),
        (mss, ackRounds) => {
          const control = new TcpCongestionControl({
            mss,
            initialSsthresh: mss * 64,
          });

          for (let round = 0; round < ackRounds; round += 1) {
            const before = control.state.cwnd;
            const seq = 1 + round * mss;
            control.onSegmentSent(seq, mss, round * 2 + 1);
            control.onAckReceived(seq + mss, 100, round * 2 + 2);
            const after = control.state.cwnd;

            expect(after).toBeGreaterThanOrEqual(before + mss);
            expect(after).toBeLessThanOrEqual(before * 2);
          }
        },
      ),
      { seed: PLAN_53_SEED, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('congestion avoidance uses additive MSS-sized growth', () => {
    fc.assert(
      fc.property(fc.integer({ min: 256, max: 1460 }), (mss) => {
        const control = new TcpCongestionControl({ mss, initialSsthresh: mss });
        const before = control.state.cwnd;

        control.onAckReceived(1 + mss, 100, 1);

        expect(control.state.phase).toBe('congestion-avoidance');
        expect(control.state.cwnd - before).toBeGreaterThanOrEqual(mss * 0.9);
        expect(control.state.cwnd - before).toBeLessThanOrEqual(mss * 1.1);
      }),
      { seed: PLAN_53_SEED, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('keeps ssthresh at or above 2 MSS after loss reactions', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 256, max: 1460 }),
        fc.integer({ min: 1, max: 12 }),
        (mss, segmentsInFlight) => {
          const control = new TcpCongestionControl({ mss });
          control.onSegmentSent(1001, segmentsInFlight * mss, 1);

          control.onRto(1001, 2);

          expect(control.state.ssthresh).toBeGreaterThanOrEqual(2 * mss);
        },
      ),
      { seed: PLAN_53_SEED, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
