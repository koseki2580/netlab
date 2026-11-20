/** REQ-398 — anycast and CDN steering (TC-2020..TC-2026). */
import { describe, expect, it } from 'vitest';
import { USERS, bgpRoutes, dnsSteer, lowestLatency, routeFor, type SiteId } from './anycast';

const summary = (live?: readonly SiteId[]) =>
  Object.fromEntries(
    USERS.map((user) => {
      const route = routeFor(user, live);
      return [user, route ? `${route.site} ${route.rttMs}` : 'none'];
    }),
  );

describe('TC-2020: with all three sites up, each user follows its shortest AS path', () => {
  it('Osaka reaches Tokyo, Singapore Frankfurt, London Frankfurt, Chicago New York', () => {
    expect(summary()).toEqual({
      'isp-osaka': 'site-tyo 12',
      'isp-sg': 'site-fra 162',
      'isp-london': 'site-fra 18',
      'isp-chicago': 'site-nyc 22',
    });
  });
  it('the AS path each user receives ends in the CDN’s AS', () => {
    expect(routeFor('isp-sg')!.asPath).toEqual([64540, 64500]);
    expect(routeFor('isp-osaka')!.asPath).toEqual([64530, 64500]);
  });
});

describe('TC-2021: anycast follows routing, not geography', () => {
  it('Singapore reaches Frankfurt (2 AS hops, 162 ms) though Tokyo is 74 ms away over 3 hops', () => {
    const chosen = routeFor('isp-sg')!;
    const nearest = lowestLatency('isp-sg')!;
    expect([chosen.site, chosen.asPath.length, chosen.rttMs]).toEqual(['site-fra', 2, 162]);
    expect([nearest.site, nearest.asPath.length, nearest.rttMs]).toEqual(['site-tyo', 3, 74]);
  });
  it('for the other users the BGP choice is also the lowest-latency site', () => {
    for (const user of ['isp-osaka', 'isp-london', 'isp-chicago'] as const) {
      expect(routeFor(user)!.rttMs).toBe(lowestLatency(user)!.rttMs);
    }
  });
});

describe('TC-2022: equal AS paths are broken by the lowest neighbour AS number', () => {
  it('without Frankfurt, the European transit hears Tokyo and New York at equal length and picks New York via AS 64510', () => {
    const transit = bgpRoutes(['site-tyo', 'site-nyc'])['t-euro']!;
    expect(transit.site).toBe('site-nyc');
    expect(transit.asPath).toEqual([64510, 64500]);
  });
});

describe('TC-2023: withdrawing a site moves its users to the next-best announcement', () => {
  it('Tokyo withdrawn: Osaka moves to New York (172 ms); the rest stay', () => {
    expect(summary(['site-fra', 'site-nyc'])).toEqual({
      'isp-osaka': 'site-nyc 172',
      'isp-sg': 'site-fra 162',
      'isp-london': 'site-fra 18',
      'isp-chicago': 'site-nyc 22',
    });
  });
  it('Frankfurt withdrawn: Singapore moves to Tokyo (74 ms, faster) and London to New York (102 ms)', () => {
    expect(summary(['site-tyo', 'site-nyc'])).toEqual({
      'isp-osaka': 'site-tyo 12',
      'isp-sg': 'site-tyo 74',
      'isp-london': 'site-nyc 102',
      'isp-chicago': 'site-nyc 22',
    });
  });
  it('New York withdrawn: Chicago moves to Frankfurt (106 ms)', () => {
    expect(summary(['site-tyo', 'site-fra'])['isp-chicago']).toBe('site-fra 106');
  });
});

describe('TC-2024: with no site announcing, the prefix is unreachable', () => {
  it('every user has no route', () => {
    expect(summary([])).toEqual({
      'isp-osaka': 'none',
      'isp-sg': 'none',
      'isp-london': 'none',
      'isp-chicago': 'none',
    });
  });
});

describe('TC-2025: DNS steering answers for where the resolver is', () => {
  it('through a public resolver in London, Osaka and Chicago are both sent to Frankfurt', () => {
    const osaka = dnsSteer('isp-osaka', 'public-london');
    const chicago = dnsSteer('isp-chicago', 'public-london');
    expect([osaka.server, osaka.address, osaka.rttMs]).toEqual(['site-fra', '198.51.100.20', 252]);
    expect([chicago.server, chicago.rttMs]).toEqual(['site-fra', 106]);
  });
});

describe('TC-2026: their own resolver, or ECS, steers by the client’s own network', () => {
  it('Osaka gets Tokyo (12 ms) and Chicago New York (22 ms), as anycast gives them', () => {
    for (const resolver of ['own', 'public-london-ecs'] as const) {
      expect(dnsSteer('isp-osaka', resolver)).toMatchObject({ server: 'site-tyo', rttMs: 12 });
      expect(dnsSteer('isp-chicago', resolver)).toMatchObject({ server: 'site-nyc', rttMs: 22 });
    }
    expect(routeFor('isp-osaka')!.rttMs).toBe(12);
    expect(routeFor('isp-chicago')!.rttMs).toBe(22);
  });
});
