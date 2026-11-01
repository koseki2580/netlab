import { describe, expect, it } from 'vitest';
import type { PacketHop } from '../../types/simulation';
import { floodCopiesLabel, floodCopiesText, floodNote } from './floodWords';

const copied: PacketHop = {
  step: 1,
  nodeId: 'sw',
  nodeLabel: 'Switch',
  srcIp: '10.0.0.10',
  dstIp: '10.0.0.20',
  ttl: 64,
  protocol: 'ICMP',
  event: 'forward',
  timestamp: 0,
  flood: {
    copies: [
      { fromNodeId: 'sw', toNodeId: 'sw2', edgeId: 'e1', egressPort: 'p3', outcome: 'flooded' },
      {
        fromNodeId: 'sw2',
        toNodeId: 'by',
        edgeId: 'e2',
        egressPort: 'p2',
        outcome: 'discarded',
        reason: 'not-for-me',
      },
    ],
  },
};
const labels: Record<string, string> = { sw2: 'Switch 2', by: 'Bystander' };
const label = (id: string) => labels[id] ?? id;

// TC-868: a hop at which a switch copied the frame says so, in both languages.
describe('TC-868: a copied hop in the timeline and in its details', () => {
  it('in English', () => {
    const t = 'en';
    expect(floodCopiesLabel(t)).toBe('Copies');
    expect(floodNote(copied, t)).toBe('copied to 2 more');
    expect(floodCopiesText(copied, label, t)).toBe(
      'Switch 2: copied it on, Bystander: not for it, discarded',
    );
  });

  it('in Japanese', () => {
    const t = 'ja';
    expect(floodCopiesLabel(t)).toBe('コピー');
    expect(floodNote(copied, t)).toBe('ほかに 2 か所へコピー');
    expect(floodCopiesText(copied, label, t)).toBe(
      'Switch 2: さらにコピーした, Bystander: 自分あてでないので捨てた',
    );
  });

  it('says nothing for a hop that copied nothing', () => {
    const t = 'en';
    const plain: PacketHop = { ...copied };
    delete plain.flood;
    expect(floodNote(plain, t)).toBeNull();
    expect(floodCopiesText(plain, label, t)).toBeNull();
  });
});
