/** The `segrouting` concept deck: each right answer is what the segment-routing lesson gives on the simulator. */
import { describe, expect, it } from 'vitest';
import { segrouting as en } from '../../src/i18n/locales/en/concept/decks/segrouting';
import { segrouting as ja } from '../../src/i18n/locales/ja/concept/decks/segrouting';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { DECK } from '../../src/learning/concept-check/lessonDecks/segrouting';
import { MainThreadEngine } from '../../src/simulation/worker/MainThreadEngine';
import { POLICIES, readSrPath, srTopology, type SrPolicy } from './srLesson';

const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];

async function path(policy: SrPolicy) {
  const engine = new MainThreadEngine(enrichTopology(srTopology(policy)), new HookEngine());
  return readSrPath(await engine.ping('h1', '10.4.0.10'));
}

describe('TC-2320: segrouting deck: the right answers hold on the simulator', () => {
  it('q1 (c): with one SID, R2 forwards 16004 unchanged toward R4, and R4 pops it', async () => {
    expect(answer('q1')).toBe('c');
    expect(POLICIES.shortest).toEqual([16004]);
    expect(await path('shortest')).toEqual({
      delivered: true,
      routers: ['R1', 'R2', 'R4'],
      labels: ['R1: push — → 16004', 'R2: swap 16004 → 16004', 'R4: pop 16004 → —'],
    });
  });
  it('q2 (a): with 16003 | 16004, R3 pops its own SID and 16004 takes the packet on to R4', async () => {
    expect(answer('q2')).toBe('a');
    expect(POLICIES['via-r3']).toEqual([16003, 16004]);
    expect(await path('via-r3')).toEqual({
      delivered: true,
      routers: ['R1', 'R3', 'R4'],
      labels: ['R1: push — → 16003 | 16004', 'R3: pop 16003 | 16004 → 16004', 'R4: pop 16004 → —'],
    });
  });
  it('q3 (b): R2, R3 and R4 have the same tables whichever path R1 chooses', () => {
    expect(answer('q3')).toBe('b');
    const core = (policy: SrPolicy) =>
      srTopology(policy)
        .nodes.filter((node) => ['r2', 'r3', 'r4'].includes(node.id))
        .map((node) => node.data.mpls);
    expect(core('via-r3')).toEqual(core('shortest'));
  });
});

describe('segrouting deck: the options give nothing away', () => {
  it('every key exists in both locales; the right option is at most 1.6× the longest wrong one', () => {
    for (const catalog of [en, ja]) {
      for (const [question, right] of DECK.answers) {
        const text = (key: string) => catalog[`learning.concept.segrouting.${question}.${key}`];
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
