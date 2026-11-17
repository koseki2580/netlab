/** REQ-385 — spine-leaf fabrics: counted paths, hops and capacity (TC-1890, TC-1891). */
import { describe, expect, it } from 'vitest';
import {
  capacityLeftPct,
  leafToLeafHops,
  leafToLeafPaths,
  links,
  oversubscription,
  uplinkGbps,
} from './spineLeaf';

describe('TC-1890: any two leaves are three switches apart, however large the fabric', () => {
  it('2×2, 8×4 and 32×6 fabrics: three hops; one path per spine; leaves × spines links', () => {
    for (const [leaves, spines] of [
      [2, 2],
      [8, 4],
      [32, 6],
    ] as const) {
      const fabric = { leaves, spines, failed: 0 };
      expect(leafToLeafHops(fabric)).toBe(3);
      expect(leafToLeafPaths(fabric)).toBe(spines);
      expect(links(fabric)).toBe(leaves * spines);
    }
  });
});

describe('TC-1891: a failed spine takes a share of capacity, not connectivity', () => {
  it('one of four spines down: 75 % left, 300 Gbit/s, oversubscription 3:1 becomes 4:1', () => {
    const healthy = { leaves: 8, spines: 4, failed: 0 };
    const hurt = { ...healthy, failed: 1 };
    expect(oversubscription(healthy)).toBe(3);
    expect(capacityLeftPct(hurt)).toBe(75);
    expect(uplinkGbps(hurt)).toBe(300);
    expect(oversubscription(hurt)).toBe(4);
    expect(leafToLeafHops(hurt)).toBe(3);
    expect(leafToLeafPaths(hurt)).toBe(3);
  });
  it('with every spine down the leaves are cut off', () => {
    expect(leafToLeafHops({ leaves: 8, spines: 2, failed: 2 })).toBeNull();
  });
});
