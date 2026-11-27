/**
 * Wave D (TC-2600, TC-2602 to TC-2613): each new question sits in its stage's
 * test, and its right option is what its lesson's model gives.
 */
import { describe, expect, it } from 'vitest';
import { blocksPerAddress, FIRST_PORT, LAST_PORT } from '../networking/cgnat';
import { simulateLease } from '../networking/dhcpLease';
import { DELEGATED, lanPrefix, subnetCount } from '../networking/ipv6Addressing';
import { simulate } from '../networking/losslessDc';
import { AGEING_TIME_S, movedScene } from '../networking/macLearning';
import { changed, handover, SESSION } from '../networking/mobileCore';
import { ASKED_LINK, budget, FIBRES } from '../networking/optical';
import { ASKED_PATH_MTU, classic, LINK_MTU } from '../networking/plpmtud';
import { EBGP_NEXT_HOP, propagate, reachesC, SCENARIOS } from '../networking/routeReflector';
import { cubicRecovery, renoRecovery, windowPackets } from '../networking/tcpCubic';
import { ASYMMETRIC, measure } from '../networking/timeSync';
import { REQUESTS, retry } from '../networking/websocket';
import { examLevel } from './examLevels';
import { POOL_D } from './examPoolD';

const question = (id: string) => [...POOL_D.values()].flat().find((entry) => entry.id === id)!;
const right = (id: string) => question(id).options[question(id).answer]!.en;

// TC-2600: wave D joins the slots of its stage's tests and asks about the lesson it is taught by.
describe('wave D sits in the slots of its stage’s tests (TC-2600)', () => {
  const LEVEL_OF: Record<string, number> = {
    'mac-learning': 6,
    optical: 6,
    plpmtud: 7,
    'dhcp-lease': 1,
    cgnat: 1,
    websocket: 1,
    'time-sync': 2,
    'ipv6-addressing': 2,
    'route-reflector': 4,
    'lossless-dc': 4,
    'tcp-cubic': 8,
    'mobile-core': 8,
  };

  it('each question is in the slot it is keyed by, after that slot’s three, on its stage’s level', () => {
    for (const [key, questions] of POOL_D) {
      for (const q of questions) {
        const level = examLevel(LEVEL_OF[q.taughtBy]!)!;
        const slot = level.slots!.find((s) => s[0]!.id === key)!;
        expect(slot, `${q.id} in ${key}`).toBeDefined();
        expect(slot.indexOf(q), q.id).toBeGreaterThanOrEqual(3);
        expect(level.path.find((stop) => stop.id === q.taughtBy)!.path, q.id).toBe(
          `/networking/${q.taughtBy}`,
        );
      }
    }
    const lessons = [...POOL_D.values()].flat().map((q) => q.taughtBy);
    expect(lessons.sort()).toEqual(Object.keys(LEVEL_OF).sort());
  });
});

// TC-2602 to TC-2604: stages 2 and 3.
describe('stages 2 and 3: the LAN and IP lessons (TC-2602, TC-2603, TC-2604)', () => {
  it('TC-2602 MAC learning: a host moved without sending is still sought on its old port', () => {
    const [first] = movedScene();
    expect(first).toMatchObject({ src: 'B', dst: 'A', kind: 'forward', egress: [1] });
    expect(first!.delivered).toBe(false);
    expect(first!.atS - 3).toBeLessThan(AGEING_TIME_S);
    expect(AGEING_TIME_S).toBe(300);
    expect(right('s2-mac-moved-silent')).toBe('Port 1 only; A misses it');
  });

  it('TC-2603 optical: 30 km at 1310 nm with two connectors comes up with 2 dB of margin', () => {
    expect(ASKED_LINK).toEqual({ fibre: 'smf-1310', km: 30, connectors: 2 });
    expect(FIBRES['smf-1310']).toMatchObject({ dbPerKm: 0.35, txDbm: 0, sensitivityDbm: -14 });
    expect(budget(ASKED_LINK)).toMatchObject({
      splices: 5,
      totalLossDb: 12,
      rxDbm: -12,
      marginDb: 2,
      limit: null,
    });
    expect(right('s2-optical-margin')).toBe('Yes, with 2 dB to spare');
  });

  it('TC-2604 PLPMTUD: with Packet Too Big filtered, classic PMTUD never delivers full size', () => {
    expect(ASKED_PATH_MTU).toBe(1400);
    expect(LINK_MTU).toBe(1500);
    expect(classic(ASKED_PATH_MTU, false)).toMatchObject({ delivers: false, learnedMtu: null });
    expect(classic(ASKED_PATH_MTU, true)).toMatchObject({ delivers: true, learnedMtu: 1400 });
    expect(right('s3-pmtud-black-hole')).toBe('They are lost, again and again');
  });
});

// TC-2605 to TC-2607: stage 4.
describe('stage 4: services (TC-2605, TC-2606, TC-2607)', () => {
  it('TC-2605 DHCP lease: 7 hours into an 8-hour lease the client broadcasts a rebind', () => {
    const hour = 3600;
    const outcome = simulateLease({ leaseS: 8 * hour, serverDownS: hour, serverB: false });
    expect(outcome.firstUnansweredS).toBe(4 * hour);
    expect(outcome.events.find((e) => e.atS === 7 * hour)).toMatchObject({ kind: 'rebind' });
    expect(outcome.addressLostS).toBe(8 * hour);
    expect(right('dhcp-lease-rebind')).toBe('Broadcasts a DHCPREQUEST');
  });

  it('TC-2606 CGNAT: ports 1024–65535 in blocks of 512 serve 126 subscribers', () => {
    expect([FIRST_PORT, LAST_PORT]).toEqual([1024, 65535]);
    expect(blocksPerAddress(512)).toEqual({ blocks: 126, unused: 0 });
    expect(right('cgnat-port-blocks')).toBe('126');
  });

  it('TC-2607 retries: of GET, PUT, DELETE and POST, only POST changes the server twice', () => {
    const asked = ['get-feed', 'put-name', 'delete-item', 'post-order'];
    const unsafe = REQUESTS.filter((r) => asked.includes(r.id) && !retry(r).sameAfterRetry);
    expect(unsafe.map((r) => r.method)).toEqual(['POST']);
    expect(right('http-retry-post')).toBe('POST');
  });
});

// TC-2608, TC-2609: stage 5.
describe('stage 5: time and IPv6 (TC-2608, TC-2609)', () => {
  it('TC-2608 NTP: the four timestamps give an offset of 30 ms, 5 ms from the true 25', () => {
    const result = measure(ASYMMETRIC);
    expect(result.timestamps).toEqual({ t1: 1000, t2: 1039, t3: 1044, t4: 1023 });
    expect(result).toMatchObject({ offset: 30, delay: 18, error: 5 });
    expect(right('ntp-offset')).toBe('30 ms ahead');
  });

  it('TC-2609 IPv6: a delegated /56 holds 256 LANs of /64', () => {
    expect(DELEGATED).toBe('2001:db8:1234:5600::/56');
    expect(subnetCount(56, 64)).toBe(256);
    expect(lanPrefix(DELEGATED, 256)).toBe('2001:db8:1234:56ff::/64');
    expect(lanPrefix(DELEGATED, 257)).toBeNull();
    expect(right('ipv6-lans-in-56')).toBe('256');
  });
});

// TC-2610, TC-2611: stage 6.
describe('stage 6: iBGP and the data centre (TC-2610, TC-2611)', () => {
  it('TC-2610 route reflector: without one, B keeps the route from C; as one, C gets it', () => {
    expect(SCENARIOS.plain.sessions).toEqual([
      ['A', 'B'],
      ['B', 'C'],
    ]);
    expect(reachesC('plain')).toBe(false);
    expect(propagate(SCENARIOS.plain).installed.has('B')).toBe(true);
    expect(propagate(SCENARIOS['one-rr']).installed.get('C')!.nextHop).toBe(EBGP_NEXT_HOP);
    expect(right('l4-ibgp-no-reflector')).toBe('No: B does not pass it on');
  });

  it('TC-2611 PFC: no drops, but the innocent flow on S1’s link is paused too', () => {
    const pfc = simulate('pfc');
    expect(pfc.drops).toBe(0);
    expect(pfc.innocentSent).toBeLessThan(pfc.innocentMax);
    expect([pfc.innocentSent, pfc.innocentMax]).toEqual([174, 350]);
    const plain = simulate('plain');
    expect(plain.innocentSent).toBe(plain.innocentMax);
    expect(plain.drops).toBeGreaterThan(0);
    expect(right('l4-pfc-innocent-flow')).toBe('It is paused along with S1');
  });
});

// TC-2612, TC-2613: stage 7.
describe('stage 7: congestion control and the mobile core (TC-2612, TC-2613)', () => {
  it('TC-2612 CUBIC: after one loss Reno takes about 70 minutes, CUBIC about 40 s', () => {
    const w = windowPackets(10e9, 100);
    expect(Math.round(w / 1000)).toBe(83);
    expect(Math.round(renoRecovery(w, 100).seconds / 60)).toBe(69);
    expect(Math.round(cubicRecovery(w, 100).seconds)).toBe(40);
    expect(right('s7-cubic-recovery')).toBe('Reno ~70 min, CUBIC ~40 s');
  });

  it('TC-2613 5G handover: only the gNB end of the N3 tunnel changes', () => {
    expect(changed(SESSION, handover(SESSION, 'gnb2'))).toEqual(['downlink']);
    expect(right('s7-5g-handover')).toBe('The N3 tunnel’s gNB end');
  });
});
