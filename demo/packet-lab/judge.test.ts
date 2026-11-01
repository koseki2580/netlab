// @vitest-environment node
/**
 * What the judge tells a learner for the classic mistakes, pinned on real
 * instances: the cause first, in everyday words, with fields named by their
 * form labels and devices by their diagram labels, and no answer value.
 *
 * TC ids are not allocated yet: the specification is outside this folder.
 */

import { describe, expect, it } from 'vitest';
import { judgeBuild, judgeFragment, judgeRead } from './judge';
import type { BuildExercise, FragmentExercise, PacketGrade, ReadExercise } from './model';
import { PICK_MESSAGES } from './reasons';
import { p2DieAt } from './templates/level2/p2-die-at';
import { p3FrameAfter } from './templates/level3/p3-frame-after';
import { p3WhichCuts } from './templates/level3/p3-which-cuts';
import { p2FirstMac } from './templates/level2/p2-first-mac';
import { p2SmallestTtl } from './templates/level2/p2-smallest-ttl';
import { p2Traceroute } from './templates/level2/p2-traceroute';
import { p3Df } from './templates/level3/p3-df';
import { p3Pmtud } from './templates/level3/p3-pmtud';
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

describe('the new kinds of feedback', () => {
  it('one TTL too few: stopped, but at the router before the one asked for', async () => {
    const exercise = p2DieAt.generate(0) as BuildExercise;
    const ttl = Number(exercise.reference.ttl);
    const [result] = failing(await judgeBuild(exercise, { ttl: ttl - 1 }));
    expect(result?.code).toBe('dropped-elsewhere');
    expect(result?.message.ja).toContain('止まりましたが、課題の場所と理由ではありません。');
    expect(result?.message.ja).toContain(`TTL が足りず、${ttl - 1} 台目のルータ`);
  });

  it("a router next to the servers is not on the sender's cable run", async () => {
    for (let seed = 0; seed < 60; seed += 1) {
      const exercise = p2FirstMac.generate(seed) as BuildExercise;
      const other = exercise.fields[0]?.candidates?.find((entry) => entry.why === 'other-router');
      if (!other) continue;
      const [result] = failing(await judgeBuild(exercise, { dstMac: String(other.value) }));
      expect(result?.evidence?.macOwner).toBe('other-router');
      expect(result?.message.ja).toContain('送り主と同じ回線にいないので');
      return;
    }
    throw new Error('no two-router instance');
  });

  it('a wrong pick is told by the mistake it is, where it has words', async () => {
    const told = new Set<string>();
    const templates = [p3FrameAfter, p3WhichCuts];
    for (const template of templates) {
      for (let seed = 0; seed < 24; seed += 1) {
        const exercise = template.generate(seed) as ReadExercise;
        const picks = Object.fromEntries(exercise.questions.map((q) => [q.id, q.answer]));
        for (const question of exercise.questions) {
          for (const candidate of question.candidates) {
            const words = PICK_MESSAGES[candidate.why];
            if (!words) continue;
            const grade = await judgeRead(exercise, {
              picks: { ...picks, [question.id]: String(candidate.value) },
            });
            const result = grade.results.find((entry) => entry.goalId === question.id);
            expect(result?.code).toBe('wrong-pick');
            expect(result?.message).toEqual(words);
            told.add(candidate.why);
          }
        }
      }
    }
    console.log(
      [...told]
        .sort()
        .map((why) => `${why}: ${PICK_MESSAGES[why]?.ja}`)
        .join('\n'),
    );
    expect(told.size).toBeGreaterThanOrEqual(12);
  });
});

// TC-984
describe('a traceroute: each question is about its own probe', () => {
  it('names the device that answers each probe, the second router being the one r1 sends to', async () => {
    for (let seed = 0; seed < 8; seed += 1) {
      const exercise = p2Traceroute.generate(seed) as ReadExercise;
      const [a, b] = exercise.packets;
      expect(exercise.questions.map((question) => question.packetIndex ?? 0)).toEqual([0, 1]);
      expect(a?.ttl).not.toBe(b?.ttl);
      const r1 = exercise.topology.nodes.find((node) => node.id === 'r1');
      const way = r1?.data.staticRoutes?.[0]?.nextHop;
      const viaId = exercise.topology.nodes.find((node) =>
        node.data.interfaces?.some((side) => side.ipAddress === way),
      )?.id;
      const path = ['r1', viaId, 'r4', 'srv'];
      const picks = Object.fromEntries(
        exercise.questions.map((question) => [
          question.id,
          path[(exercise.packets[question.packetIndex ?? 0]?.ttl ?? 1) - 1] ?? '',
        ]),
      );
      expect(Object.values(picks)).toEqual(exercise.questions.map((question) => question.answer));
      const grade = await judgeRead(exercise, { picks });
      expect(grade.passed, `seed ${seed}`).toBe(true);
    }
  }, 120_000);
});

// TC-985
describe('path MTU discovery over two narrow cables', () => {
  it('the first cable’s MTU is turned back at the second; the second’s arrives whole', async () => {
    for (let seed = 0; seed < 8; seed += 1) {
      const exercise = p3Pmtud.generate(seed) as ReadExercise;
      const fix = exercise.fix;
      if (!fix) throw new Error('p3-pmtud has a fix part');
      const mtus = exercise.topology.edges
        .map((edge) => edge.data?.mtuBytes)
        .filter((mtu): mtu is number => typeof mtu === 'number');
      expect(mtus, `seed ${seed}: two narrow cables`).toHaveLength(2);
      const [wider, narrower] = [Math.max(...mtus), Math.min(...mtus)];
      expect(fix.reference.size).toBe(narrower);
      // Every packet of this exercise keeps DF: nothing is ever cut.
      expect(exercise.packets[0]?.df).toBe(true);
      const picks = Object.fromEntries(exercise.questions.map((q) => [q.id, q.answer]));
      const right = await judgeRead(exercise, { picks, values: fix.reference });
      expect(right.passed, `seed ${seed}: the smaller MTU`).toBe(true);
      const firstOnly = await judgeRead(exercise, { picks, values: { size: wider } });
      const [refused] = failing(firstOnly);
      expect(refused?.code, `seed ${seed}: the first MTU alone`).toBe('too-big-not-split');
    }
  }, 300_000);
});
