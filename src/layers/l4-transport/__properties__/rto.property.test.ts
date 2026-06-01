/**
 * @property-seed 0x7c0c01 RTO properties.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT } from '../../../testing/seeds';
import { TcpCongestionControl } from '../TcpCongestionControl';
import { TcpRttEstimator } from '../TcpRttEstimator';

const PLAN_53_SEED = 0x7c0c01;

describe('TCP RTO properties', () => {
  it('keeps estimator RTO inside the educational clamp bounds', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 1, max: 120000 }), { minLength: 1, maxLength: 20 }),
        (samples) => {
          const estimator = new TcpRttEstimator();

          for (const sample of samples) {
            estimator.update(sample);
            expect(estimator.getRtoMs()).toBeGreaterThanOrEqual(1000);
            expect(estimator.getRtoMs()).toBeLessThanOrEqual(60000);
          }
        },
      ),
      { seed: PLAN_53_SEED, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('RTO loss reaction resets cwnd to one MSS and preserves ssthresh floor', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 256, max: 1460 }),
        fc.integer({ min: 1, max: 16 }),
        (mss, segmentsInFlight) => {
          const control = new TcpCongestionControl({ mss });
          control.onSegmentSent(1001, segmentsInFlight * mss, 1);

          control.onRto(1001, 2);

          expect(control.state.cwnd).toBe(mss);
          expect(control.state.ssthresh).toBeGreaterThanOrEqual(2 * mss);
        },
      ),
      { seed: PLAN_53_SEED, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
