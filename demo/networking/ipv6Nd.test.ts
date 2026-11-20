/** REQ-403 — IPv6 Neighbor Discovery: NUD, SLAAC with EUI-64, DAD (TC-2070..TC-2078). */
import { describe, expect, it } from 'vitest';
import {
  dad,
  eui64Steps,
  lessonScenario,
  nudTimeline,
  slaacAddress,
  stateAt,
  stateSpans,
  type NdEvent,
} from './ipv6Nd';

const brief = (events: readonly NdEvent[]) =>
  events.map((event) => `${event.atMs} ${event.kind} ${event.state}`);

describe('TC-2070: the first packet resolves B with a multicast NS and an NA', () => {
  it('the entry is created INCOMPLETE and becomes REACHABLE when B answers', () => {
    const events = nudTimeline(lessonScenario(false));
    expect(brief(events.slice(0, 3))).toEqual([
      '0 send INCOMPLETE',
      '0 ns-multicast INCOMPLETE',
      '0 na REACHABLE',
    ]);
  });
});

describe('TC-2071: REACHABLE turns STALE after ReachableTime without confirmation', () => {
  it('still REACHABLE at 29.999 s, STALE at 30 s', () => {
    const events = nudTimeline(lessonScenario(false));
    expect(stateAt(events, 29_999)).toBe('REACHABLE');
    expect(stateAt(events, 30_000)).toBe('STALE');
  });
});

describe('TC-2072: a packet to a STALE entry goes out, then DELAY → PROBE → REACHABLE', () => {
  it('DELAY at 40 s, PROBE with one unicast NS at 45 s, REACHABLE again at once', () => {
    const events = nudTimeline(lessonScenario(false));
    expect(brief(events.slice(3))).toEqual([
      '30000 reachable-expired STALE',
      '40000 send DELAY',
      '45000 delay-expired PROBE',
      '45000 ns-unicast PROBE',
      '45000 na REACHABLE',
      '75000 reachable-expired STALE',
    ]);
    expect(stateAt(events, 44_999)).toBe('DELAY');
  });
});

describe('TC-2073: when B is gone, A probes three times, 1 s apart, then deletes the entry', () => {
  it('unicast NS at 45, 46 and 47 s; deleted at 48 s; never INCOMPLETE again', () => {
    const events = nudTimeline(lessonScenario(true));
    expect(brief(events.slice(3))).toEqual([
      '30000 reachable-expired STALE',
      '40000 send DELAY',
      '45000 delay-expired PROBE',
      '45000 ns-unicast PROBE',
      '46000 ns-unicast PROBE',
      '47000 ns-unicast PROBE',
      '48000 deleted NONE',
    ]);
    expect(events.filter((event) => event.kind === 'ns-unicast').map((e) => e.solicit)).toEqual([
      1, 2, 3,
    ]);
    expect(stateAt(events, 47_999)).toBe('PROBE');
    expect(stateAt(events, 48_000)).toBe('NONE');
    expect(stateSpans(events, 80_000).map((span) => [span.state, span.fromMs, span.toMs])).toEqual([
      ['REACHABLE', 0, 30_000],
      ['STALE', 30_000, 40_000],
      ['DELAY', 40_000, 45_000],
      ['PROBE', 45_000, 48_000],
      ['NONE', 48_000, 80_000],
    ]);
  });
});

describe('TC-2074: resolving a neighbour that never answers fails after three multicast NS', () => {
  it('NS at 0, 1 and 2 s; the entry is deleted at 3 s', () => {
    const events = nudTimeline({ sendsAtMs: [0], bGoneAtMs: 0, untilMs: 10_000 });
    expect(brief(events)).toEqual([
      '0 send INCOMPLETE',
      '0 ns-multicast INCOMPLETE',
      '1000 ns-multicast INCOMPLETE',
      '2000 ns-multicast INCOMPLETE',
      '3000 deleted NONE',
    ]);
  });
});

describe('TC-2075: DAD with no answer: tentative, then preferred after RetransTimer', () => {
  it('probes from :: to the solicited-node group of the new address', () => {
    const outcome = dad('2001:db8:1:0:21a:2bff:fe3c:4d5e', false);
    expect(outcome.probe).toEqual({
      source: '::',
      destination: 'ff02::1:ff3c:4d5e',
      target: '2001:db8:1:0:21a:2bff:fe3c:4d5e',
    });
    expect(outcome.events).toEqual([
      { atMs: 0, state: 'tentative' },
      { atMs: 1000, state: 'preferred' },
    ]);
    expect(outcome.usable).toBe(true);
  });
});

describe('TC-2076: DAD when another node already has the address', () => {
  it('its NA marks the address duplicate and it is never used', () => {
    const outcome = dad('2001:db8:1:0:21a:2bff:fe3c:4d5e', true);
    expect(outcome.events[outcome.events.length - 1]).toEqual({ atMs: 0, state: 'duplicate' });
    expect(outcome.usable).toBe(false);
  });
});

describe('TC-2077: EUI-64 inserts ff:fe and flips the U/L bit', () => {
  it.each([
    ['00:1a:2b:3c:4d:5e', '00:1a:2b:ff:fe:3c:4d:5e', 0x02, '21a:2bff:fe3c:4d5e'],
    ['02:00:5e:10:00:01', '02:00:5e:ff:fe:10:00:01', 0x00, '0:5eff:fe10:1'],
    ['3C:22:FB:7A:01:9C', '3c:22:fb:ff:fe:7a:01:9c', 0x3e, '3e22:fbff:fe7a:19c'],
  ])('%s → %s → %s', (mac, withFffe, firstByteAfter, interfaceId) => {
    const steps = eui64Steps(mac);
    expect(steps.withFffe).toBe(withFffe);
    expect(steps.firstByteAfter).toBe(firstByteAfter);
    expect(steps.interfaceId).toBe(interfaceId);
  });
});

describe('TC-2078: SLAAC joins the /64 prefix and the interface ID', () => {
  it('2001:db8:1::/64 with 00:1a:2b:3c:4d:5e is 2001:db8:1:0:21a:2bff:fe3c:4d5e (RFC 5952: one zero hextet is not shortened to ::)', () => {
    expect(slaacAddress('2001:db8:1::/64', '00:1a:2b:3c:4d:5e')).toBe(
      '2001:db8:1:0:21a:2bff:fe3c:4d5e',
    );
    expect(slaacAddress('2001:db8:1:7::/64', '02:00:5e:10:00:01')).toBe(
      '2001:db8:1:7:0:5eff:fe10:1',
    );
  });
  it('a prefix that is not /64 forms no address', () => {
    expect(slaacAddress('2001:db8:1::/56', '00:1a:2b:3c:4d:5e')).toBeNull();
  });
});
