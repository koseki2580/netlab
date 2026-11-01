// @vitest-environment node
/**
 * The final-test questions written for the first wave of deeper basics:
 * each right answer is what the simulator does, run here on the question's
 * own scenario, and each question reads like the others (four options of
 * similar length, the right one not the longest), in English and Japanese.
 */

import { describe, expect, it } from 'vitest';
import type { InFlightPacket } from '../../src/types/packets';
import { ipToMulticastMac } from '../../src/utils/multicastMac';
import { withEngine } from '../exercises/grade/engineRun';
import { prepare, routesOf } from '../exercises/grade/prepare';
import { applyChanges } from '../exercises/model/settings';
import { bgpExitsFixture } from '../exercises/templates/shared/bgp';
import { EXAM_WAVE1, IGMP_SCENARIO, STATEFUL_SCENARIO } from './examWave1';

const byId = (id: string) => {
  const found = EXAM_WAVE1.find((question) => question.id === id);
  if (!found) throw new Error(`no question ${id}`);
  return found;
};

interface Sent {
  readonly status: string;
  readonly hops: readonly {
    readonly nodeId: string;
    readonly event: string;
    readonly reason?: string;
  }[];
}

/** Send packets in one engine, in order, and return each one's trace. */
async function sendAll(
  topology: Parameters<typeof prepare>[0],
  packets: readonly InFlightPacket[],
  setUp?: (engine: {
    addMulticastMembership(nodeId: string, vlan: number, mac: string, portId: string): void;
    addJoinedGroup(nodeId: string, group: string): void;
  }) => void,
): Promise<Sent[]> {
  return withEngine(prepare(topology), async (engine) => {
    setUp?.(engine as never);
    const out: Sent[] = [];
    for (const packet of packets) {
      await engine.send(packet);
      const traces = engine.getState().traces;
      const trace = traces[traces.length - 1];
      out.push({ status: trace?.status ?? '', hops: trace?.hops ?? [] });
    }
    return out;
  });
}

// TC-991
describe('each right answer is what the simulator does', () => {
  it('BGP: with LOCAL_PREF 150 from the provider with the longer AS_PATH, traffic leaves by it', () => {
    const fixture = bgpExitsFixture();
    const nextHopTo = (topology: typeof fixture.topology) =>
      routesOf(prepare(topology), 'r1').find((route) => route.destination === fixture.farCidr)
        ?.nextHop;
    // Before: the shorter AS_PATH (provider A) wins on equal LOCAL_PREF.
    expect(nextHopTo(fixture.topology)).toBe(fixture.neighbour.A);
    const raised = applyChanges(fixture.topology, [
      { kind: 'bgp-local-pref', nodeId: 'r1', neighbor: fixture.neighbour.B, localPref: 150 },
    ]);
    expect(nextHopTo(raised)).toBe(fixture.neighbour.B);
    expect(byId('bgp-local-pref-exit').options[byId('bgp-local-pref-exit').answer].en).toMatch(
      /provider B/,
    );
  });

  it('IGMP snooping: the joined group goes to the member port only, the other group floods', async () => {
    const { topology, member, others, joined, unjoined, packet } = IGMP_SCENARIO;
    const reached = async (group: string) => {
      const traces = await sendAll(
        topology,
        [member, ...others].map((to) => packet(to, group)),
        (engine) => {
          engine.addMulticastMembership('sw', 10, ipToMulticastMac(joined), 'p3');
          engine.addJoinedGroup(member, joined);
        },
      );
      // A port the switch sends the stream out of: its hop toward that host is a forward.
      return [member, ...others].filter(
        (_, index) => traces[index]?.hops.find((hop) => hop.nodeId === 'sw')?.event === 'forward',
      );
    };
    expect(await reached(joined)).toEqual([member]);
    expect(await reached(unjoined)).toEqual([member, ...others]);
  });

  it('stateful firewall: the reply on the 443 connection comes in, a new connection to 22 does not', async () => {
    const { topology, outbound, reply, unsolicited } = STATEFUL_SCENARIO;
    const [out, back, fresh] = await sendAll(topology(true), [outbound, reply, unsolicited]);
    expect(out?.status).toBe('delivered');
    expect(back?.status).toBe('delivered');
    expect(fresh?.status).toBe('dropped');
    expect(fresh?.hops[fresh.hops.length - 1]?.reason).toBe('acl-deny');
    // Without the flag the same list refuses the reply too: the flag is what lets it in.
    const [, unflagged] = await sendAll(topology(false), [outbound, reply]);
    expect(unflagged?.status).toBe('dropped');
  });
});

// TC-992
describe('the questions read like the others', () => {
  it.each(['en', 'ja'] as const)(
    'four options of similar length, the right one not the longest (%s)',
    (locale) => {
      for (const question of EXAM_WAVE1) {
        const lengths = question.options.map((option) => option[locale].length);
        const right = lengths[question.answer] ?? 0;
        const others = lengths.filter((_, index) => index !== question.answer);
        expect(right, `${question.id}: the right option stands out by length`).toBeLessThan(
          Math.max(...others),
        );
        expect(Math.max(...lengths), question.id).toBeLessThanOrEqual(2 * Math.min(...lengths));
      }
    },
  );

  it('is written in both languages, with an explanation and a lesson', () => {
    for (const question of EXAM_WAVE1) {
      for (const text of [question.prompt, question.explanation, ...question.options]) {
        expect(text.en.trim().length, question.id).toBeGreaterThan(0);
        expect(text.ja, question.id).toMatch(/[぀-ヿ一-龯]/);
      }
      expect(question.lesson, question.id).toMatch(/^\//);
    }
  });

  it('does not put the right answer in the same place every time', () => {
    expect(new Set(EXAM_WAVE1.map((question) => question.answer)).size).toBeGreaterThan(1);
  });
});
