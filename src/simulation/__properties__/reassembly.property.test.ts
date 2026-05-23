/**
 * @property-seed 0x5a4b12 P-TS-1 IPv4 reassembly order and eviction properties.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fragmentSetArb, type FragmentSet } from '../../testing/properties/arbitraries';
import { PROPERTY_NUM_RUNS_DEFAULT, PROPERTY_SEED_DEFAULT } from '../../testing/seeds';
import type { IpPacket } from '../../types/packets';
import { buildTransportBytes } from '../../utils/packetLayout';
import { Reassembler } from '../Reassembler';

function reassemble(fragments: readonly IpPacket[]): IpPacket | null {
  const reassembler = new Reassembler();
  let result: IpPacket | null = null;

  for (const fragment of fragments) {
    result = reassembler.accept(fragment);
  }

  return result;
}

function transportBytes(packet: IpPacket): number[] {
  return Array.from(buildTransportBytes(packet.payload));
}

function keyFor(fragment: IpPacket): string {
  return `${fragment.srcIp}|${fragment.dstIp}|${fragment.identification ?? 0}|${fragment.protocol}`;
}

function remapFragments(
  set: FragmentSet,
  overrides: Pick<IpPacket, 'srcIp' | 'dstIp' | 'identification'>,
): FragmentSet {
  return {
    ...set,
    original: { ...set.original, ...overrides },
    fragments: set.fragments.map((fragment) => ({ ...fragment, ...overrides })),
  };
}

describe('reassembly properties', () => {
  it('produces byte-equivalent payloads for in-order and out-of-order fragments', () => {
    fc.assert(
      fc.property(
        fragmentSetArb().chain((set) =>
          fc
            .shuffledSubarray([...set.fragments], {
              minLength: set.fragments.length,
              maxLength: set.fragments.length,
            })
            .map((shuffled) => ({ set, shuffled })),
        ),
        ({ set, shuffled }) => {
          const inOrder = reassemble(set.fragments);
          const outOfOrder = reassemble(shuffled);

          expect(inOrder).not.toBeNull();
          expect(outOfOrder).not.toBeNull();
          if (!inOrder || !outOfOrder) return;

          expect(transportBytes(outOfOrder)).toEqual(transportBytes(inOrder));
          expect(transportBytes(outOfOrder)).toEqual(transportBytes(set.original));
        },
      ),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });

  it('evicts exactly the cleared pending stream while surviving streams still reassemble', () => {
    fc.assert(
      fc.property(fragmentSetArb(), (generated) => {
        const expired = generated;
        const surviving = remapFragments(generated, {
          srcIp: '10.0.0.3',
          dstIp: '10.0.0.4',
          identification: generated.identification,
        });
        const reassembler = new Reassembler();
        const expiredFirst = expired.fragments[0];
        const survivingFirst = surviving.fragments[0];
        if (!expiredFirst || !survivingFirst) return;

        expect(reassembler.accept(expiredFirst)).toBeNull();
        expect(reassembler.accept(survivingFirst)).toBeNull();
        expect(reassembler.size()).toBe(2);

        reassembler.clear(keyFor(expiredFirst));
        expect(reassembler.size()).toBe(1);

        for (const fragment of expired.fragments.slice(1)) {
          expect(reassembler.accept(fragment)).toBeNull();
        }

        let result: IpPacket | null = null;
        for (const fragment of surviving.fragments.slice(1)) {
          result = reassembler.accept(fragment);
        }

        expect(result).not.toBeNull();
        if (!result) return;
        expect(transportBytes(result)).toEqual(transportBytes(surviving.original));
      }),
      { seed: PROPERTY_SEED_DEFAULT, numRuns: PROPERTY_NUM_RUNS_DEFAULT },
    );
  });
});
