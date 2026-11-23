/** The `vpc` concept deck: each right answer is what the VPC lesson gives on the simulator. */
import { describe, expect, it } from 'vitest';
import { vpc as en } from '../../src/i18n/locales/en/concept/decks/vpc';
import { vpc as ja } from '../../src/i18n/locales/ja/concept/decks/vpc';
import { enrichTopology } from '../../src/cli/runtime';
import { HookEngine } from '../../src/hooks/HookEngine';
import { DECK } from '../../src/learning/concept-check/lessonDecks/vpc';
import { MainThreadEngine } from '../../src/simulation/worker/MainThreadEngine';
import { VPC_CASES, readVpcTrace, vpcSyn, vpcTopology } from './vpcLesson';

const answer = (id: string) => DECK.answers.find(([question]) => question === id)?.[1];

async function run(id: string) {
  const engine = new MainThreadEngine(enrichTopology(vpcTopology()), new HookEngine());
  const packet = vpcSyn(VPC_CASES.find((candidate) => candidate.id === id)!);
  await engine.send(packet);
  return readVpcTrace(engine.getState().traces.find((trace) => trace.packetId === packet.id)!);
}

describe('TC-2324: vpc deck: the right answers hold on the simulator', () => {
  it('q1 (b): HTTP to the public address reaches web, the destination rewritten to 10.0.1.10', async () => {
    expect(answer('q1')).toBe('b');
    expect(await run('web-in')).toMatchObject({
      arrived: true,
      endedAt: 'web',
      rewrites: ['internet GW: 198.51.100.1 → 10.0.1.10'],
    });
  });
  it('q2 (a): db gets out, its source rewritten by the NAT gateway and then the internet gateway', async () => {
    expect(answer('q2')).toBe('a');
    expect(await run('db-out')).toMatchObject({
      arrived: true,
      rewrites: ['NAT GW: 10.0.2.10 → 10.0.1.30', 'internet GW: 10.0.1.30 → 198.51.100.1'],
    });
  });
  it('q3 (c): straight to db’s private address, on an allowed port, stops at the internet gateway: no mapping', async () => {
    expect(answer('q3')).toBe('c');
    expect(VPC_CASES.find((entry) => entry.id === 'db-in')?.port).toBe(80);
    expect(await run('db-in')).toMatchObject({
      arrived: false,
      endedAt: 'internet GW',
      reason: 'no-nat-entry',
    });
  });
  it('q4 (b): SSH to the public address is mapped to web but the security group drops it first', async () => {
    expect(answer('q4')).toBe('b');
    const rules = vpcTopology().nodes.find((node) => node.id === 'igw')?.data.portForwardingRules;
    expect(rules?.some((rule) => rule.externalPort === 22 && rule.internalIp === '10.0.1.10')).toBe(
      true,
    );
    expect(await run('ssh-in')).toMatchObject({
      arrived: false,
      endedAt: 'internet GW',
      reason: 'acl-deny',
    });
  });
});

describe('vpc deck: the options give nothing away', () => {
  it('every key exists in both locales; the right option is at most 1.6× the longest wrong one', () => {
    for (const catalog of [en, ja]) {
      for (const [question, right] of DECK.answers) {
        const text = (key: string) => catalog[`learning.concept.vpc.${question}.${key}`];
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
