import { describe, expect, it } from 'vitest';
import { detectHiddenNodeCollision, deterministicBackoffSlot } from './CsmaCa';

describe('CsmaCa', () => {
  it('chooses deterministic backoff slots for a station and step', () => {
    expect(deterministicBackoffSlot('02:00:00:00:bb:01', 16, 12)).toBe(
      deterministicBackoffSlot('02:00:00:00:bb:01', 16, 12),
    );
  });

  it('detects hidden-node collisions at the access point', () => {
    expect(
      detectHiddenNodeCollision({
        apId: 'ap-1',
        transmissions: [
          { stationId: 'sta-a', apReachable: true, peerReachableStationIds: [] },
          { stationId: 'sta-b', apReachable: true, peerReachableStationIds: [] },
        ],
      }),
    ).toEqual({ collidedStationIds: ['sta-a', 'sta-b'] });
  });
});
