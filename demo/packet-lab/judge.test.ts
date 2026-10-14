// @vitest-environment node
/**
 * What the judge tells a learner for the classic mistakes, pinned on real
 * instances: the cause first, in everyday words, with fields named by their
 * form labels and devices by their diagram labels, and no answer value.
 *
 * TC ids are not allocated yet: the specification is outside this folder.
 */

import { describe, expect, it } from 'vitest';
import { judgeBuild, judgeFragment } from './judge';
import type { BuildExercise, FragmentExercise, PacketGrade } from './model';
import { p2FirstMac } from './templates/level2/p2-first-mac';
import { p2SmallestTtl } from './templates/level2/p2-smallest-ttl';
import { p3Df } from './templates/level3/p3-df';
import { p4Fragment } from './templates/level4/p4-fragment';
import { classicMistakes } from './mistakes';

const failing = (grade: PacketGrade) => grade.results.filter((entry) => !entry.passed);

describe('build-packet feedback', () => {
  it('TTL one short: which router, and the rule, without the number to use', async () => {
    // An instance that offers the value one short (the right one is not always the second lowest).
    const exercise = Array.from(
      { length: 40 },
      (_, seed) => p2SmallestTtl.generate(seed) as BuildExercise,
    ).find((entry) =>
      entry.fields[0]?.candidates?.some(
        (option) => option.why === `dies-at-r${Number(entry.reference.ttl) - 1}`,
      ),
    ) as BuildExercise;
    const routers = exercise.topology.nodes.filter((node) => node.data.role === 'router');
    const last = routers[routers.length - 1];
    const grade = await judgeBuild(exercise, { ttl: routers.length });
    const [result] = failing(grade);
    expect(result?.code).toBe('ttl-ran-out');
    expect(result?.message.ja).toBe(
      `TTL が足りず、${routers.length} 台目のルータ（${last?.data.label}）で捨てられました。ルータを 1 台越えるたびに 1 ずつ減ります。`,
    );
    expect(result?.evidence).toMatchObject({
      nodeId: last?.id,
      field: 'ttl',
      dropReason: 'ttl-exceeded',
    });
    expect(result?.evidence?.icmp?.type).toBe(11);
    expect(grade.trace).toBeDefined();
  });

  it("the server's MAC: whose it is, and why the first step goes to the gateway", async () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const exercise = p2FirstMac.generate(seed) as BuildExercise;
      const server = exercise.fields[0]?.candidates?.find((entry) => entry.why === 'destination');
      if (!server) continue;
      const [result] = failing(await judgeBuild(exercise, { dstMac: String(server.value) }));
      expect(result?.code).toBe('wrong-mac');
      expect(result?.evidence?.macOwner).toBe('destination');
      expect(result?.message.ja).toContain('自身の MAC アドレスです');
      expect(result?.message.ja).toContain('ゲートウェイ');
      expect(result?.message.ja).not.toContain(String(exercise.reference.dstMac));
      return;
    }
    throw new Error('no instance offers the server’s MAC');
  });

  it('DF the wrong way: the router cuts it silently instead of answering', async () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const exercise = p3Df.generate(seed) as BuildExercise;
      if (exercise.reference.df !== true) continue;
      const result = failing(await judgeBuild(exercise, {})).find(
        (entry) => entry.code === 'not-dropped',
      );
      expect(result?.message.ja).toBe(
        'ルータは黙ってパケットを分割して届け、知らせは返ってきませんでした。「分割しない」の印があると、ルータは分割できず、知らせを返します。',
      );
      return;
    }
    throw new Error('no "report" instance');
  });
});

describe('fragment feedback', () => {
  it('each classic mistake is told by its own message', async () => {
    const seen = new Map<string, string>();
    for (let seed = 0; seed < 40; seed += 1) {
      const exercise = p4Fragment.generate(seed) as FragmentExercise;
      for (const mistake of classicMistakes(exercise)) {
        const result = failing(await judgeFragment(exercise, { rows: mistake.rows })).find(
          (entry) => entry.code === mistake.code,
        );
        expect(result, `${exercise.id}: ${mistake.note}`).toBeDefined();
        if (result && !seen.has(mistake.code)) seen.set(mistake.code, result.message.ja);
      }
    }
    for (const [code, message] of seen) console.log(`${code}: ${message}`);
    expect([...seen.keys()].sort()).toEqual(
      [
        'ip-header-forgotten',
        'mf-cleared-middle',
        'mf-on-last',
        'not-multiple-of-8',
        'offsets-in-bytes',
        'offsets-in-units',
        'transport-header-forgotten',
        'wrong-count',
      ].sort(),
    );
    expect(new Set(seen.values()).size).toBe(seen.size);
  });
});
