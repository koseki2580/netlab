/** REQ-392 — IS-IS levels, adjacencies, ATT and SPF (TC-1960..TC-1968). */
import { describe, expect, it } from 'vitest';
import {
  BASE_NETWORK,
  adjacency,
  nearestAttached,
  parseNet,
  routes,
  setsAttached,
  spf,
  trace,
  withLevels,
} from './isis';

const net = BASE_NETWORK;

describe('TC-1960: a NET splits into area, system ID and NSEL', () => {
  it('49.0001.0000.0000.0001.00 is area 49.0001, system ID 0000.0000.0001, NSEL 00', () => {
    expect(parseNet('49.0001.0000.0000.0001.00')).toEqual({
      area: '49.0001',
      afi: '49',
      systemId: '0000.0000.0001',
      nsel: '00',
    });
  });
  it('a longer area keeps every byte before the last seven', () => {
    expect(parseNet('49.0001.0002.1921.6800.1001.00')).toEqual({
      area: '49.0001.0002',
      afi: '49',
      systemId: '1921.6800.1001',
      nsel: '00',
    });
  });
  it('rejects a non-zero NSEL, a missing area, and non-hex text', () => {
    expect(parseNet('49.0001.0000.0000.0001.01')).toBeNull();
    expect(parseNet('0000.0000.0001.00')).toBeNull();
    expect(parseNet('hello')).toBeNull();
  });
});

describe('TC-1961: Level 1 adjacencies form only inside an area', () => {
  it('R1 (L1, 49.0001) and R5 (L1, 49.0002) share a link but form no adjacency', () => {
    expect(adjacency(net, 'R1', 'R5')).toBe('none');
  });
  it('an L1 router and an L1/L2 router of the same area form Level 1', () => {
    expect(adjacency(net, 'R1', 'R2')).toBe('L1');
    expect(adjacency(net, 'R4', 'R5')).toBe('L1');
  });
});

describe('TC-1962: Level 2 adjacencies form between any two routers running Level 2', () => {
  it('L1/L2 routers in different areas form Level 2 only; in the same area both levels', () => {
    expect(adjacency(net, 'R2', 'R4')).toBe('L2');
    expect(adjacency(net, 'R2', 'R3')).toBe('L1L2');
  });
  it('making both R1 and R5 L1/L2 turns their link into a Level 2 adjacency', () => {
    expect(adjacency(withLevels(net, { R1: 'L1L2', R5: 'L1L2' }), 'R1', 'R5')).toBe('L2');
    expect(adjacency(withLevels(net, { R1: 'L2' }), 'R1', 'R2')).toBe('L2');
  });
});

describe('TC-1963: L1/L2 routers set ATT, and an L1 router defaults to the nearest one', () => {
  it('R2, R3 and R4 set ATT; R1 and R5 do not', () => {
    expect(['R1', 'R2', 'R3', 'R4', 'R5'].map((id) => setsAttached(net, id as never))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
  });
  it('R1’s nearest attached router is R2 at metric 10 (R3 is 20 away)', () => {
    expect(nearestAttached(net, 'R1')).toEqual({ to: 'R2', metric: 10, path: ['R1', 'R2'] });
  });
});

describe('TC-1964: SPF runs separately on the Level 1 and Level 2 databases', () => {
  it('R1’s Level 1 SPF sees only its area, and reaches R3 more cheaply through R2', () => {
    expect(spf(net, 'R1', 'L1')).toEqual([
      { to: 'R1', metric: 0, path: ['R1'] },
      { to: 'R2', metric: 10, path: ['R1', 'R2'] },
      { to: 'R3', metric: 20, path: ['R1', 'R2', 'R3'] },
    ]);
    expect(spf(net, 'R1', 'L2')).toEqual([]);
  });
  it('R2’s Level 2 SPF sees only the Level 2 routers', () => {
    expect(spf(net, 'R2', 'L2')).toEqual([
      { to: 'R2', metric: 0, path: ['R2'] },
      { to: 'R3', metric: 10, path: ['R2', 'R3'] },
      { to: 'R4', metric: 10, path: ['R2', 'R4'] },
    ]);
  });
});

describe('TC-1965: routing tables hold the area, the Level 2 routes, and a default for L1 routers', () => {
  it('R1 has its area’s three prefixes and a default via R2, but no route to area 49.0002', () => {
    expect(routes(net, 'R1')).toEqual([
      { prefix: '10.0.1.0/24', source: 'connected', metric: 0, nextHop: null },
      { prefix: '10.0.2.0/24', source: 'L1', metric: 10, nextHop: 'R2' },
      { prefix: '10.0.3.0/24', source: 'L1', metric: 20, nextHop: 'R2' },
      { prefix: '0.0.0.0/0', source: 'L1-default', metric: 10, nextHop: 'R2' },
    ]);
  });
  it('R2 reaches R5’s LAN over Level 2 through R4, which carries its area’s prefixes into Level 2', () => {
    expect(routes(net, 'R2').find((r) => r.prefix === '10.0.5.0/24')).toEqual({
      prefix: '10.0.5.0/24',
      source: 'L2',
      metric: 20,
      nextHop: 'R4',
    });
    expect(routes(net, 'R2').find((r) => r.prefix === '10.0.3.0/24')?.source).toBe('L1');
  });
});

describe('TC-1966: R1’s packet to R5’s LAN goes R1 → R2 → R4 → R5, not over the direct link', () => {
  it('hop by hop: default to R2, Level 2 to R4, Level 1 to R5, metric 30', () => {
    expect(trace(net, 'R1', 'R5')).toEqual({
      reached: true,
      hops: ['R1', 'R2', 'R4', 'R5'],
      metric: 30,
    });
  });
});

describe('TC-1967: with Level 2 on both ends the direct link is used', () => {
  it('R1 and R5 both L1/L2: R1 → R5, metric 10', () => {
    expect(trace(withLevels(net, { R1: 'L1L2', R5: 'L1L2' }), 'R1', 'R5')).toEqual({
      reached: true,
      hops: ['R1', 'R5'],
      metric: 10,
    });
  });
  it('only R1 L1/L2: still no adjacency with R5, so the path stays at 30', () => {
    expect(trace(withLevels(net, { R1: 'L1L2' }), 'R1', 'R5').metric).toBe(30);
  });
});

describe('TC-1968: an area with no attached router cannot leave', () => {
  it('with R2 and R3 made L1, R1 has no default route and cannot reach R5', () => {
    const isolated = withLevels(net, { R2: 'L1', R3: 'L1' });
    expect(routes(isolated, 'R1').some((r) => r.prefix === '0.0.0.0/0')).toBe(false);
    expect(trace(isolated, 'R1', 'R5')).toEqual({ reached: false, hops: ['R1'], metric: 0 });
  });
});
