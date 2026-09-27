import { describe, expect, it } from 'vitest';
import type { PacketHop, PacketTrace } from '../../src/types/simulation';
import { describeUdpSize, recordedPieces } from './UdpDemo';

describe('TC-LESSON-UDP-SIZE: the large UDP send is explained by size and pieces', () => {
  it('a 4000-byte payload is a 4028-byte IP packet, over the 1500-byte MTU, three fragments on a real link', () => {
    const size = describeUdpSize(4000);
    expect(size.udpBytes).toBe(4008);
    expect(size.ipBytes).toBe(4028);
    expect(size.overEthernetMtu).toBe(true);
    expect(size.realFragments).toEqual([1480, 1480, 1048]);
  });

  it('a small payload fits in one packet', () => {
    const size = describeUdpSize(5);
    expect(size.ipBytes).toBe(33);
    expect(size.overEthernetMtu).toBe(false);
    expect(size.realFragments).toEqual([]);
  });

  it('counts the pieces the recorded trace carried', () => {
    const hop = (step: number, extra: Partial<PacketHop> = {}) =>
      ({ step, event: 'forward', ...extra }) as PacketHop;
    const whole = { hops: [hop(0), hop(1)] } as PacketTrace;
    const split = {
      hops: [hop(0), hop(1, { fragmentIndex: 0, fragmentCount: 3 }), hop(2, { fragmentCount: 3 })],
    } as PacketTrace;
    expect(recordedPieces(whole)).toBe(1);
    expect(recordedPieces(split)).toBe(3);
  });
});
