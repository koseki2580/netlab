/** The `loadbalancer` concept deck: each right answer is what the load-balancer lesson model says. */
import { describe, expect, it } from 'vitest';
import { loadbalancer as en } from '../../src/i18n/locales/en/concept/decks/loadbalancer';
import { loadbalancer as ja } from '../../src/i18n/locales/ja/concept/decks/loadbalancer';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { DECK } from '../../src/learning/concept-check/lessonDecks/loadbalancer';
import { MainThreadEngine } from '../../src/simulation/worker/MainThreadEngine';
import { REQUESTS, SERVER_IPS, VIP, assign, lbTopology, peakOpen, synToVip } from './loadBalancer';

const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];

describe('TC-2307: loadbalancer deck: the right answers hold in the lesson model', () => {
  it('q1 (b): round robin gives four requests each, but web1 gets every long one and peaks highest', () => {
    expect(answer('q1')).toBe('b');
    const assignments = assign('round-robin', REQUESTS);
    const counts = [0, 1, 2].map((s) => assignments.filter((a) => a.server === s).length);
    expect(counts).toEqual([4, 4, 4]);
    const long = assignments.filter((a) => a.request.duration > 2).map((a) => a.server);
    expect(new Set(long)).toEqual(new Set([0]));
    expect(peakOpen(assignments)).toEqual([3, 1, 1]);
  });
  it('q2 (c): least connections picks the fewest open and peaks at 2, below round robin’s 3', () => {
    expect(answer('q2')).toBe('c');
    const assignments = assign('least-connections', REQUESTS);
    expect(assignments).toHaveLength(REQUESTS.length);
    for (const { server, openBefore } of assignments)
      expect(openBefore[server]).toBe(Math.min(...openBefore));
    expect(Math.max(...peakOpen(assignments))).toBe(2);
  });
  it('q3 (a): with web3 out of the hash, clients that were on web1 or web2 move as well', () => {
    expect(answer('q3')).toBe('a');
    const all = assign('source-hash', REQUESTS).map((a) => a.server);
    const fewer = assign('source-hash', REQUESTS, [true, true, false]).map((a) => a.server);
    expect(fewer).not.toContain(2);
    expect(fewer.some((server, index) => all[index] !== 2 && server !== all[index])).toBe(true);
  });
  it('q4 (b): the SYN for the VIP reaches web2 addressed to 10.0.0.12', async () => {
    expect(answer('q4')).toBe('b');
    const engine = new MainThreadEngine(enrichTopology(lbTopology(1)), new HookEngine());
    const packet = synToVip(1, 50000);
    await engine.send(packet);
    const trace = engine.getState().traces.find((candidate) => candidate.packetId === packet.id)!;
    expect(trace.hops.find((hop) => hop.natTranslation)?.natTranslation).toMatchObject({
      type: 'dnat',
      preDstIp: VIP,
      postDstIp: '10.0.0.12',
    });
    expect(trace.hops[trace.hops.length - 1]).toMatchObject({
      nodeId: 'web2',
      event: 'deliver',
      dstIp: SERVER_IPS[1],
    });
  });
});

describe('loadbalancer deck: the options give nothing away', () => {
  it('every key exists in both locales; the right option is at most 1.6× the longest wrong one', () => {
    for (const catalog of [en, ja]) {
      for (const [question, right] of DECK.answers) {
        const text = (key: string) => catalog[`learning.concept.loadbalancer.${question}.${key}`];
        const wrong = (['a', 'b', 'c'] as const).filter((letter) => letter !== right);
        for (const key of ['prompt', 'why', 'a', 'b', 'c', ...wrong.map((l) => `${l}.why`)])
          expect(text(key), `${question}.${key}`).toBeTruthy();
        const longestWrong = Math.max(...wrong.map((letter) => text(letter)!.length));
        expect(text(right)!.length / longestWrong, question).toBeLessThanOrEqual(1.6);
      }
    }
  });
  it('the right answer is not always the same letter', () => {
    expect(new Set(DECK.answers.map(([, letter]) => letter)).size).toBeGreaterThan(1);
  });
});
