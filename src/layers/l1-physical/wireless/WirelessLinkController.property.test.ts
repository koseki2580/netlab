import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../../testing/seeds';
import { WirelessLinkController } from './WirelessLinkController';

describe('WirelessLinkController properties', () => {
  it('does not improve loss as station distance increases', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 21, max: 200 }),
        (nearMeters, farMeters) => {
          const controller = new WirelessLinkController({
            ssid: 'netlab-wifi',
            channel: 6,
            bandMhz: 2437,
            txPowerDbm: 20,
            lossSeed: 12,
          });

          expect(controller.linkQosForDistance(farMeters).lossPct ?? 0).toBeGreaterThanOrEqual(
            controller.linkQosForDistance(nearMeters).lossPct ?? 0,
          );
        },
      ),
      { numRuns: PROPERTY_NUM_RUNS_DEFAULT, seed: PROPERTY_SEED_DEFAULT },
    );
  });
});
