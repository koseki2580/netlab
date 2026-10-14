import { describe, expect, it } from 'vitest';
import type { PacketHop, PacketTrace } from '../../src/types/simulation';
import { isNatLessonRow } from './NatDemo';

describe('the rows the NAT lesson lists', () => {
  /** TC-628 — the router's ARP lookup repeats on every send and is the ARP lesson's subject. */
  it('leaves the ARP question and answer out, and keeps every other row', () => {
    const hop = (event: PacketHop['event']) => ({ step: 0, event }) as PacketHop;
    expect(isNatLessonRow(hop('arp-request'))).toBe(false);
    expect(isNatLessonRow(hop('arp-reply'))).toBe(false);
    for (const event of ['create', 'forward', 'deliver', 'drop'] as const) {
      expect(isNatLessonRow(hop(event)), event).toBe(true);
    }
  });

  it('never hides a whole send', () => {
    expect(isNatLessonRow({ packetId: 'p', hops: [] } as unknown as PacketTrace)).toBe(true);
  });
});
