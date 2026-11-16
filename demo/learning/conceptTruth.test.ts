/**
 * REQ-370 — the new ICMP and addressing questions agree with what the
 * lessons compute and the simulator does (TC-1772).
 */
import { describe, expect, it } from 'vitest';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { conceptCheck as en } from '../../src/i18n/locales/en/conceptCheck';
import { CONCEPT_DECKS } from '../../src/learning/concept-check/decks';
import { MainThreadEngine } from '../../src/simulation/worker/MainThreadEngine';
import {
  ICMP_SENDER,
  ICMP_UNROUTED_IP,
  icmpTopology,
  readIcmpOutcome,
} from '../networking/icmpLesson';
import { buildEchoPacket } from '../networking/pmtud';
import { answerOf } from './bits';
import { smallestPrefixFor, usableHosts } from './vlsm';

const strings = en as Record<string, string>;
const right = (deck: string, question: string) => {
  const found = CONCEPT_DECKS.find((d) => d.id === deck)?.questions.find((q) => q.id === question);
  const option = found?.options.find((o) => o.correct);
  return option ? (strings[option.key] ?? '') : '';
};

describe('TC-1772: the new questions agree with the lessons and the simulator', () => {
  it('ICMP: the router with no route answers; fragmentation needed is code 4 with MTU 1400', async () => {
    const topology = enrichTopology(icmpTopology());
    const engine = new MainThreadEngine(topology, new HookEngine());
    const noRoute = readIcmpOutcome(await engine.ping(ICMP_SENDER, ICMP_UNROUTED_IP), ICMP_SENDER);
    expect(noRoute.fromDevice).toBe('R2');
    expect(right('icmp', 'q4')).toContain('R2');
    const tooBig = readIcmpOutcome(
      await engine.precompute(buildEchoPacket(topology, true, 1472)!),
      ICMP_SENDER,
    );
    expect([tooBig.code, tooBig.mtu]).toEqual([4, 1400]);
    expect(right('icmp', 'q5')).toContain('code 4');
    expect(right('icmp', 'q5')).toContain('1400');
  });

  it('addressing: 50 hosts fit a /26 of 62; 11000000 is 192', () => {
    expect(smallestPrefixFor(50)).toBe(26);
    expect(right('addressing', 'q7')).toContain(`/26, which holds ${usableHosts(26)}`);
    expect(answerOf({ kind: 'to-decimal', value: 0b11000000 })).toBe('192');
    expect(right('addressing', 'q9')).toContain('192');
  });
});
