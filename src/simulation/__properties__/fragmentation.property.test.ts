/**
 * @property-seed 0x5a4b12 IPv4 fragmentation property.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import { fragmentsReassembleToOriginal } from '../../testing/properties/oracles';
import { fragment } from '../fragmentation';
import type { IpPacket } from '../../types/packets';

function packet(payload: Uint8Array): IpPacket {
  return {
    layer: 'L3',
    srcIp: '10.0.0.1',
    dstIp: '10.0.0.2',
    ttl: 64,
    protocol: 1,
    flags: { df: false, mf: false },
    payload: { layer: 'raw', data: String.fromCharCode(...payload) },
  };
}

describe('fragmentation properties', () => {
  it('reassembles generated fragments to the original payload', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 1, maxLength: 512 }),
        fc.integer({ min: 68, max: 1500 }),
        (payload, mtu) => {
          const fragments = fragment(packet(payload), mtu, 42);
          fragmentsReassembleToOriginal(payload, fragments);
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('emits ascending fragment offsets and marks only non-final fragments as MF', () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ minLength: 64, maxLength: 512 }),
        fc.integer({ min: 68, max: 180 }),
        (payload, mtu) => {
          const fragments = fragment(packet(payload), mtu, 42);
          let previousOffset = -1;
          for (const [index, current] of fragments.entries()) {
            expect(current.fragmentOffset ?? 0).toBeGreaterThan(previousOffset);
            previousOffset = current.fragmentOffset ?? 0;
            expect(current.flags?.mf ?? false).toBe(index < fragments.length - 1);
          }
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
