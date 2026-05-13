import { describe, expect, it } from 'vitest';
import { installEqualCostNextHops } from './ecmp';
import type { RouteEntry } from '../types/routing';

function route(nextHop: string, metric = 10): RouteEntry {
  return {
    destination: '203.0.113.0/24',
    nextHop,
    metric,
    protocol: 'static',
    adminDistance: 1,
    nodeId: 'r1',
  };
}

describe('installEqualCostNextHops', () => {
  it('collapses equal-cost candidates into one canonical route', () => {
    expect(installEqualCostNextHops([route('172.17.0.2'), route('172.16.0.2')])).toEqual([
      {
        ...route('172.16.0.2'),
        equalCostNextHops: [{ nextHop: '172.16.0.2' }, { nextHop: '172.17.0.2' }],
      },
    ]);
  });

  it('keeps only the lowest metric candidates', () => {
    expect(installEqualCostNextHops([route('172.16.0.2', 20), route('172.17.0.2', 10)])).toEqual([
      route('172.17.0.2', 10),
    ]);
  });
});
