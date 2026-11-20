/** REQ-396 — BGP best-path selection and communities (TC-2000..TC-2008). */
import { describe, expect, it } from 'vitest';
import {
  BASE_PATHS,
  decide,
  propagate,
  routerIdValue,
  withChange,
  type BgpPath,
  type StepId,
} from './bgpPolicy';

/** Two eBGP paths from the same neighbouring AS that tie on everything but the router ID. */
const pathX: BgpPath = {
  id: 'isp-a',
  weight: 0,
  localPref: 100,
  asPath: [64501, 64510],
  origin: 'igp',
  med: 10,
  session: 'ebgp',
  igpMetric: 5,
  routerId: '192.0.2.20',
};
const pathY: BgpPath = { ...pathX, id: 'isp-b', routerId: '192.0.2.30' };

const holders = (community: Parameters<typeof propagate>[0]) =>
  propagate(community)
    .filter((router) => router.holds)
    .map((router) => router.id);

describe('TC-2000: in the base case ISP-B wins at the eBGP-over-iBGP step', () => {
  it('everything ties down to MED, MED removes ISP-A (beaten by the iBGP path from the same AS), then eBGP beats iBGP', () => {
    const decision = decide(BASE_PATHS);
    expect(decision.winner).toBe('isp-b');
    expect(decision.decidedBy).toBe('ebgp');
    expect(decision.steps.map((step) => [step.step, step.removed])).toEqual([
      ['weight', []],
      ['local-pref', []],
      ['as-path', []],
      ['origin', []],
      ['med', ['isp-a']],
      ['ebgp', ['ibgp']],
    ]);
  });
});

describe('TC-2001: each step decides when every earlier step ties', () => {
  const cases: readonly [StepId, Partial<BgpPath>][] = [
    ['weight', { weight: 200 }],
    ['local-pref', { localPref: 150 }],
    ['as-path', { asPath: [64501] }],
    ['origin', { origin: 'igp' }],
    ['med', { med: 5 }],
    ['igp-metric', { igpMetric: 1 }],
  ];
  for (const [step, better] of cases) {
    it(`a better ${step} on the second path makes it win at ${step}`, () => {
      // The first path is worse only in this attribute (origin: incomplete vs igp).
      const worse: BgpPath = step === 'origin' ? { ...pathX, origin: 'incomplete' } : pathX;
      const decision = decide([worse, { ...pathY, ...better }]);
      expect(decision).toMatchObject({ winner: 'isp-b', decidedBy: step });
    });
  }
  it('with everything else equal, the lowest router ID wins', () => {
    expect(decide([pathY, pathX])).toMatchObject({ winner: 'isp-a', decidedBy: 'router-id' });
  });
  it('a later attribute cannot overturn an earlier one: higher LOCAL_PREF beats a shorter AS_PATH', () => {
    const decision = decide([
      { ...pathX, localPref: 200 },
      { ...pathY, asPath: [64501] },
    ]);
    expect(decision).toMatchObject({ winner: 'isp-a', decidedBy: 'local-pref' });
  });
});

describe('TC-2002: MED is compared only between paths from the same neighbouring AS', () => {
  const fromB: BgpPath = { ...pathY, asPath: [64502, 64510], med: 0 };
  it('a lower MED from a different AS does not decide; the router ID does', () => {
    expect(decide([pathX, fromB])).toMatchObject({ winner: 'isp-a', decidedBy: 'router-id' });
  });
  it('with always-compare-med, the lower MED wins at the MED step', () => {
    expect(decide([pathX, fromB], { alwaysCompareMed: true })).toMatchObject({
      winner: 'isp-b',
      decidedBy: 'med',
    });
  });
});

describe('TC-2003: ISP-A lowering its MED to 0 does not take the traffic from ISP-B', () => {
  const lowered = withChange('isp-a', { med: 0 });
  it('ISP-A now survives MED but ties ISP-B until the router ID, which ISP-B wins', () => {
    const decision = decide(lowered);
    expect(decision).toMatchObject({ winner: 'isp-b', decidedBy: 'router-id' });
    expect(decision.steps.find((step) => step.step === 'med')?.removed).toEqual(['ibgp']);
  });
  it('with always-compare-med, ISP-A wins at the MED step', () => {
    expect(decide(lowered, { alwaysCompareMed: true })).toMatchObject({
      winner: 'isp-a',
      decidedBy: 'med',
    });
  });
});

describe('TC-2004: an eBGP path beats an iBGP path even when the iBGP path is better later on', () => {
  it('the iBGP path with lower IGP cost and lower router ID still loses', () => {
    const ibgp: BgpPath = {
      ...pathY,
      id: 'ibgp',
      session: 'ibgp',
      igpMetric: 0,
      routerId: '10.0.0.1',
    };
    expect(decide([pathX, ibgp])).toMatchObject({ winner: 'isp-a', decidedBy: 'ebgp' });
  });
  it('when every path is iBGP the step removes nothing and the IGP cost decides', () => {
    const one: BgpPath = { ...pathX, session: 'ibgp', igpMetric: 20 };
    const two: BgpPath = { ...pathY, session: 'ibgp', igpMetric: 10 };
    expect(decide([one, two])).toMatchObject({ winner: 'isp-b', decidedBy: 'igp-metric' });
  });
});

describe('TC-2005: router IDs are compared as 32-bit numbers, not as text', () => {
  it('9.0.0.1 is lower than 10.0.0.10', () => {
    expect(routerIdValue('9.0.0.1')).toBeLessThan(routerIdValue('10.0.0.10'));
    const decision = decide([
      { ...pathX, routerId: '10.0.0.10' },
      { ...pathY, routerId: '9.0.0.1' },
    ]);
    expect(decision).toMatchObject({ winner: 'isp-b', decidedBy: 'router-id' });
  });
});

describe('TC-2006: NO_EXPORT keeps the route inside AS65001', () => {
  it('all three AS65001 routers hold it; E2 does not send it to AS65002', () => {
    expect(holders('no-export')).toEqual(['cust', 'e1', 'c1', 'e2']);
    const e2 = propagate('no-export').find((router) => router.id === 'e2')!;
    expect(e2.advertisesTo).toEqual([]);
  });
});

describe('TC-2007: NO_ADVERTISE stops at the first router that receives it', () => {
  it('E1 holds and uses the route but sends it to no peer', () => {
    expect(holders('no-advertise')).toEqual(['cust', 'e1']);
    expect(propagate('no-advertise').find((router) => router.id === 'e1')!.advertisesTo).toEqual(
      [],
    );
  });
});

describe('TC-2008: without a community the route goes everywhere; 65001:80 lowers LOCAL_PREF only inside AS65001', () => {
  it('untagged: every router holds it, AS65001 at LOCAL_PREF 100, iBGP-learned routes not passed to other iBGP peers', () => {
    const states = propagate('none');
    expect(states.every((router) => router.holds)).toBe(true);
    expect(states.map((router) => router.localPref)).toEqual([null, 100, 100, 100, 100]);
    expect(states.find((router) => router.id === 'c1')!.advertisesTo).toEqual([]);
    expect(states.find((router) => router.id === 'e2')!.advertisesTo).toEqual(['peer']);
  });
  it('65001:80: every router still holds it; AS65001 sets LOCAL_PREF 80, AS65002 starts again at its own 100', () => {
    const states = propagate('lp-80');
    expect(states.every((router) => router.holds)).toBe(true);
    expect(states.map((router) => router.localPref)).toEqual([null, 80, 80, 80, 100]);
  });
});
