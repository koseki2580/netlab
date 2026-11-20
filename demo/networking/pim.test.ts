/** REQ-401 — PIM sparse mode, the switch to the source tree, RPF and SSM (TC-2050..TC-2056). */
import { describe, expect, it } from 'vitest';
import {
  rpfCheck,
  sharedTreeLinks,
  shortestPath,
  ssmTree,
  viaSharedTree,
  viaSourceTree,
} from './pim';

const delays = (result: ReturnType<typeof viaSharedTree>) =>
  Object.fromEntries(result.deliveries.map((d) => [d.receiver, d.delayMs]));

describe('TC-2050: the shared tree is the union of the receivers’ shortest paths to the RP', () => {
  it('with the RP on R3, each receiver joins straight towards R3', () => {
    expect(sharedTreeLinks('R3')).toEqual(['R3-R5', 'R3-R6', 'R3-R7']);
  });
  it('with the RP on R4, R6’s join goes R6 → R3 → R7 → R4', () => {
    expect(shortestPath('R6', 'R4')).toEqual(['R6', 'R3', 'R7', 'R4']);
    expect(sharedTreeLinks('R4')).toEqual(['R3-R6', 'R3-R7', 'R4-R5', 'R4-R7']);
  });
});

describe('TC-2051: before the switch, traffic goes source → RP → down the shared tree', () => {
  it('RP on R3: R5 gets it in 9 ms over R1 R2 R3 R5, R6 in 6 ms, R7 in 7 ms; 5 links cost 14', () => {
    const result = viaSharedTree('R3');
    expect(result.deliveries[0]!.path).toEqual(['R1', 'R2', 'R3', 'R5']);
    expect(delays(result)).toEqual({ R5: 9, R6: 6, R7: 7 });
    expect(result.deliveries.every((d) => d.viaRp)).toBe(true);
    expect(result.links).toEqual(['R1-R2', 'R2-R3', 'R3-R5', 'R3-R6', 'R3-R7']);
    expect(result.linkCost).toBe(14);
  });
  it('RP on R6: traffic for R5 goes up to R6 and back over the same link (13 ms)', () => {
    const result = viaSharedTree('R6');
    expect(result.deliveries[0]!.path).toEqual(['R1', 'R2', 'R3', 'R6', 'R3', 'R5']);
    expect(delays(result)).toEqual({ R5: 13, R6: 6, R7: 11 });
  });
});

describe('TC-2052: after the switch, each receiver gets the traffic on its shortest path from the source', () => {
  it('R5 5 ms and R7 6 ms bypass the RP on R3; R6 still passes R3 because R3 is on its shortest path', () => {
    const result = viaSourceTree('R3');
    expect(delays(result)).toEqual({ R5: 5, R6: 6, R7: 6 });
    expect(result.deliveries.map((d) => [d.receiver, d.viaRp])).toEqual([
      ['R5', false],
      ['R6', true],
      ['R7', false],
    ]);
    expect(result.links).toEqual(['R1-R2', 'R1-R4', 'R2-R3', 'R3-R6', 'R4-R5', 'R4-R7']);
    expect(result.linkCost).toBe(14);
  });
  it('the switch saves R5 4 ms with the RP on R3 and nothing with the RP on R4', () => {
    expect(delays(viaSharedTree('R3')).R5! - delays(viaSourceTree('R3')).R5!).toBe(4);
    expect(delays(viaSharedTree('R4')).R5! - delays(viaSourceTree('R4')).R5!).toBe(0);
  });
});

describe('TC-2053: the RPF check accepts a packet only from the neighbour towards the source', () => {
  it('on the source tree R5 accepts from R4 and drops a copy from R3', () => {
    expect(rpfCheck('R5', 'R4', { tree: 'source' })).toEqual({
      rpfNeighbour: 'R4',
      accepted: true,
    });
    expect(rpfCheck('R5', 'R3', { tree: 'source' })).toEqual({
      rpfNeighbour: 'R4',
      accepted: false,
    });
  });
});

describe('TC-2054: on the shared tree the RPF check looks towards the RP instead', () => {
  it('with the RP on R3, R5 accepts from R3 and drops from R4', () => {
    expect(rpfCheck('R5', 'R3', { tree: 'shared', rp: 'R3' })).toEqual({
      rpfNeighbour: 'R3',
      accepted: true,
    });
    expect(rpfCheck('R5', 'R4', { tree: 'shared', rp: 'R3' }).accepted).toBe(false);
  });
  it('R4 looks to R1 for the source but to R7 for an RP on R3', () => {
    expect(rpfCheck('R4', 'R1', { tree: 'source' }).accepted).toBe(true);
    expect(rpfCheck('R4', 'R7', { tree: 'shared', rp: 'R3' }).accepted).toBe(true);
  });
});

describe('TC-2055: SSM builds the source tree from the start, with no RP', () => {
  it('its links and delays equal the source tree, and no delivery passes an RP', () => {
    const ssm = ssmTree();
    const spt = viaSourceTree('R3');
    expect(ssm.links).toEqual(spt.links);
    expect(delays(ssm)).toEqual(delays(spt));
    expect(ssm.deliveries.some((d) => d.viaRp)).toBe(false);
  });
});

describe('TC-2056: only the receivers that joined are on a tree', () => {
  it('with R5 alone, the shared tree is one link and the source tree two', () => {
    expect(viaSharedTree('R3', ['R5']).links).toEqual(['R1-R2', 'R2-R3', 'R3-R5']);
    expect(viaSourceTree('R3', ['R5']).links).toEqual(['R1-R4', 'R4-R5']);
  });
});
