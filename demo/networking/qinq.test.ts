/** REQ-442 — Q-in-Q provider bridging (TC-2540..TC-2546). */
import { describe, expect, it } from 'vitest';
import { TPID, frameBytes, journey, maxPayload, vlanSpace } from './qinq';

describe('TC-2540: each tag adds 4 bytes to a full-size frame', () => {
  it('a 1500-byte payload is 1518 bytes untagged, 1522 with a C-tag, 1526 with an S-tag too', () => {
    expect([0, 1, 2].map((tags) => frameBytes(1500, tags))).toEqual([1518, 1522, 1526]);
  });
});

describe('TC-2541: a core that takes only 1522-byte frames shrinks the customer payload', () => {
  it('double-tagged, 1522 leaves 1496 bytes; 1526 leaves the full 1500', () => {
    expect(maxPayload(1522, 2)).toBe(1496);
    expect(maxPayload(1526, 2)).toBe(1500);
    expect(maxPayload(1522, 1)).toBe(1500);
  });
});

describe('TC-2542: PE1 pushes the S-tag outside the C-tag and PE2 pops it', () => {
  it('customer A: C10 at the edges, S100 then C10 in the core, with their TPIDs', () => {
    const trip = journey('A', 'qinq');
    expect(
      trip.hops.map((h) => `${h.from}>${h.to}:${h.tags.map((t) => t.kind + t.vid).join('/')}`),
    ).toEqual(['A1>PE1:C10', 'PE1>P:S100/C10', 'P>PE2:S100/C10', 'PE2>A2:C10']);
    expect(trip.hops[1]!.tags.map((t) => t.tpid)).toEqual([TPID.sTag, TPID.cTag]);
    expect(TPID.sTag).toBe(0x88a8);
    expect(TPID.cTag).toBe(0x8100);
  });
});

describe('TC-2543: two customers on the same C-VLAN 10 stay apart by S-VLAN', () => {
  it('A’s frame reaches only A2 and B’s only B2', () => {
    expect(journey('A', 'qinq').deliveredTo).toEqual(['A2']);
    expect(journey('B', 'qinq').deliveredTo).toEqual(['B2']);
    expect(journey('B', 'qinq').hops[1]!.tags[0]!.vid).toBe(200);
  });
});

describe('TC-2544: without an S-tag the shared VLAN 10 leaks between customers', () => {
  it('A’s frame reaches both A2 and B2, carried with one tag', () => {
    const trip = journey('A', 'shared-vlan');
    expect(trip.deliveredTo).toEqual(['A2', 'B2']);
    expect(trip.hops[1]!.tags).toHaveLength(1);
  });
});

describe('TC-2545: the two tags multiply the VLAN space', () => {
  it('one tag gives 4094 VLANs, an S-tag over a C-tag 4094 × 4094 = 16 760 836', () => {
    expect(vlanSpace(1)).toBe(4094);
    expect(vlanSpace(2)).toBe(16_760_836);
  });
});

describe('TC-2546: the size on each hop follows the payload', () => {
  it('a 1000-byte payload is 1022 bytes at the edges and 1026 in the core', () => {
    expect(journey('A', 'qinq', 1000).hops.map((h) => h.bytes)).toEqual([1022, 1026, 1026, 1022]);
  });
});
