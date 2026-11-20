/** REQ-405 — route redistribution and administrative distance (TC-2090..TC-2095). */
import { describe, expect, it } from 'vitest';
import { DEFAULT_AD, RIP_TAG, bestRoute, chooseSource, simulate } from './redistribution';

describe('TC-2090: the source with the lowest administrative distance is installed', () => {
  it('static (1) beats OSPF (110) and RIP (120)', () => {
    expect(chooseSource(['static', 'ospf-r7', 'ospf-r8', 'rip-r9'])).toBe('static');
  });
  it('without the static route OSPF wins; with only RIP, RIP is used', () => {
    expect(chooseSource(['ospf-r7', 'ospf-r8', 'rip-r9'])).toBe('ospf-r8');
    expect(chooseSource(['rip-r9'])).toBe('rip-r9');
    expect(chooseSource([])).toBeNull();
  });
});

describe('TC-2091: metrics are compared only within one protocol', () => {
  it('RIP’s metric of 2 does not beat OSPF’s cost of 20: the units differ, AD decides', () => {
    expect(chooseSource(['ospf-r8', 'rip-r9'])).toBe('ospf-r8');
  });
  it('between two OSPF routes the lower cost wins', () => {
    expect(chooseSource(['ospf-r7', 'ospf-r8'])).toBe('ospf-r8');
    expect(chooseSource(['ospf-r7'])).toBe('ospf-r7');
  });
  it('a lower metric does not override a lower distance even with equal-looking numbers', () => {
    const route = bestRoute([
      { protocol: 'ebgp', via: 'X', metric: 500, ad: DEFAULT_AD.ebgp },
      { protocol: 'ospf', via: 'Y', metric: 1, ad: DEFAULT_AD.ospf },
      { protocol: 'ibgp', via: 'Z', metric: 0, ad: DEFAULT_AD.ibgp },
    ]);
    expect(route?.protocol).toBe('ebgp');
  });
});

describe('TC-2092: without a fix, R1’s redistributed route comes back to R2 as OSPF and wins', () => {
  const outcome = simulate('none');
  it('R2 holds RIP (AD 120, 1 hop) and OSPF external (AD 110) and installs OSPF via O2', () => {
    const r2 = outcome.tables.R2;
    expect(r2.candidates.map((c) => [c.protocol, c.ad, c.via])).toEqual([
      ['rip', 120, 'RA'],
      ['ospf', 110, 'O2'],
    ]);
    expect(r2.installed).toMatchObject({ protocol: 'ospf', via: 'O2', ad: 110 });
  });
  it('R1 keeps its RIP route; only R1 puts the prefix into OSPF; R2 feeds it back into RIP', () => {
    expect(outcome.tables.R1.installed).toMatchObject({ protocol: 'rip', via: 'RA', metric: 1 });
    expect(outcome.ospfOrigins).toEqual([{ router: 'R1' }]);
    expect(outcome.ripInjections).toEqual(['R2']);
  });
});

describe('TC-2093: without a fix, R2 sends traffic for 10.5.0.0/16 the long way', () => {
  it('R2 → O2 → O1 → R1 → RA: 4 hops instead of 1, no loop', () => {
    expect(simulate('none').pathFromR2).toEqual({
      routers: ['R2', 'O2', 'O1', 'R1', 'RA'],
      hops: 4,
      loop: false,
      reached: true,
    });
  });
  it('the steps show R1 redistributing first and R2 then replacing its RIP route', () => {
    const kinds = simulate('none')
      .steps.filter((s) => s.router === 'R1' || s.router === 'R2')
      .map((s) => `${s.router}:${s.kind}${s.kind === 'install' ? `:${s.route.protocol}` : ''}`);
    expect(kinds).toEqual([
      'R1:install:rip',
      'R2:install:rip',
      'R1:to-ospf',
      'R2:install:ospf',
      'R2:to-rip',
    ]);
  });
});

describe('TC-2094: with tags and a filter, R2 keeps its own RIP route', () => {
  const outcome = simulate('tag');
  it('the returning OSPF route carries the tag and is filtered; R2 installs RIP via RA', () => {
    const ospf = outcome.tables.R2.candidates.find((c) => c.protocol === 'ospf');
    expect(ospf).toMatchObject({ tag: RIP_TAG, filtered: true });
    expect(outcome.tables.R2.installed).toMatchObject({ protocol: 'rip', via: 'RA', ad: 120 });
  });
  it('R2 reaches RA directly in 1 hop; both border routers redistribute into OSPF with the tag', () => {
    expect(outcome.pathFromR2).toMatchObject({ routers: ['R2', 'RA'], hops: 1, reached: true });
    expect(outcome.ospfOrigins).toEqual([
      { router: 'R1', tag: RIP_TAG },
      { router: 'R2', tag: RIP_TAG },
    ]);
    expect(outcome.ripInjections).toEqual([]);
  });
  it('each OSPF router uses the nearer border router', () => {
    expect(outcome.tables.O1.installed?.via).toBe('R1');
    expect(outcome.tables.O2.installed?.via).toBe('R2');
  });
});

describe('TC-2095: raising the OSPF external distance above RIP’s also fixes it', () => {
  it('OSPF external at 125 loses to RIP at 120; R2 goes direct', () => {
    const outcome = simulate('distance');
    expect(outcome.tables.R2.candidates.find((c) => c.protocol === 'ospf')?.ad).toBe(125);
    expect(outcome.tables.R2.installed).toMatchObject({ protocol: 'rip', via: 'RA' });
    expect(outcome.tables.R1.installed).toMatchObject({ protocol: 'rip', via: 'RA' });
    expect(outcome.pathFromR2.hops).toBe(1);
  });
});
