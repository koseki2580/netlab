// @vitest-environment node
/**
 * Packet level 5 (REQ-353): reading a packet in a GRE or VXLAN tunnel and
 * across an MPLS core, judged on the real simulator. TC-1473 to TC-1475.
 */
import { describe, expect, it } from 'vitest';
import { judgeRead, truthOf } from './judge';
import type { ReadExercise } from './model';
import { PICK_MESSAGES } from './reasons';
import { exerciseById } from './templates';

const read = (id: string): ReadExercise => {
  const found = exerciseById(id);
  if (found?.kind !== 'read-packet') throw new Error(`no read exercise ${id}`);
  return found;
};
const seeds = Array.from({ length: 12 }, (_, seed) => seed);
const reference = (exercise: ReadExercise) =>
  Object.fromEntries(exercise.questions.map((question) => [question.id, question.answer]));

// TC-1473
describe('a packet in a GRE or VXLAN tunnel (TC-1473)', () => {
  it.each(['gre', 'vxlan'])(
    '%s: on the core cable the packet on the wire is the outer one, between the ends',
    async (kind) => {
      for (const seed of seeds) {
        const exercise = read(`p5-${kind}-read~${seed}`);
        const outer = exercise.questions.find((question) => question.id === 'outer');
        if (!outer) throw new Error('no outer question');
        const [packet] = exercise.packets;
        const truth = await truthOf(exercise, outer);
        // Never the PC's or the server's address: those ride inside.
        expect(truth, exercise.id).not.toBe(packet?.dstIp);
        expect(truth, exercise.id).not.toBe(packet?.srcIp);
        expect(truth, exercise.id).toBe(outer.answer);
        expect(
          (await judgeRead(exercise, { picks: reference(exercise) })).passed,
          exercise.id,
        ).toBe(true);
      }
    },
  );

  it.each(['gre', 'vxlan'])(
    '%s: picking the server for the outer destination is told it rides inside',
    async (kind) => {
      const exercise = seeds
        .map((seed) => read(`p5-${kind}-read~${seed}`))
        .find((entry) => entry.questions[0]?.ask === 'dst-on-link');
      if (!exercise) throw new Error('no destination question');
      const grade = await judgeRead(exercise, {
        picks: { ...reference(exercise), outer: exercise.packets[0]?.dstIp ?? '' },
      });
      const result = grade.results.find((entry) => entry.goalId === 'outer');
      expect(result?.code).toBe('wrong-pick');
      expect(result?.message.ja).toBe(PICK_MESSAGES['inner-dst']?.ja);
    },
  );

  it.each(['gre', 'vxlan'])(
    '%s: the far end with another key or VNI throws it away, and the simulator agrees',
    async (kind) => {
      const faulty = seeds
        .map((seed) => read(`p5-${kind}-read~${seed}`))
        .filter(
          (entry) =>
            entry.outcome.reason === `${kind === 'gre' ? 'gre-key' : 'vxlan-vni'}-mismatch`,
        );
      expect(faulty.length).toBeGreaterThan(0);
      for (const exercise of faulty) {
        const stops = exercise.questions.find((question) => question.id === 'stops');
        if (!stops) throw new Error('no stops question');
        expect(await truthOf(exercise, stops), exercise.id).toBe('r3');
      }
    },
  );
});

// TC-1474
describe('labels across an MPLS core (TC-1474)', () => {
  it('the labels on the cable and where it stops agree with the simulator, in all three cases', async () => {
    const outcomes = new Set<string>();
    for (const seed of seeds) {
      const exercise = read(`p5-mpls-read~${seed}`);
      for (const question of exercise.questions) {
        expect(await truthOf(exercise, question), `${exercise.id} ${question.id}`).toBe(
          question.answer,
        );
      }
      outcomes.add(exercise.outcome.dropAt ?? 'delivered');
    }
    expect([...outcomes].sort()).toEqual(['delivered', 'r2', 'r3']);
  });

  it('a router with no entry for the label throws it away as mpls-no-label', () => {
    const dropped = seeds
      .map((seed) => read(`p5-mpls-read~${seed}`))
      .filter((entry) => entry.outcome.dropAt !== null);
    expect(dropped.length).toBeGreaterThan(0);
    for (const exercise of dropped) expect(exercise.outcome.reason).toBe('mpls-no-label');
  });

  it('label 3 is never the answer: implicit null is not on a cable', () => {
    for (const seed of seeds) {
      const labels = read(`p5-mpls-read~${seed}`).questions.find((q) => q.id === 'labels');
      expect(labels?.answer.startsWith('3 /'), `seed ${seed}`).toBe(false);
      expect(
        labels?.candidates.find((candidate) => String(candidate.value).startsWith('3 /'))?.why,
      ).toBe('implicit-null-on-wire');
    }
  });

  it("the transport label's FEC is the far PE's loopback, not the customer route (REQ-351)", () => {
    const exercise = read('p5-mpls-read~0');
    const r1 = exercise.topology.nodes.find((node) => node.id === 'r1');
    const prefixes = r1?.data.mpls?.ftn?.map((entry) => entry.prefix) ?? [];
    expect(prefixes).toHaveLength(1);
    expect(prefixes[0]).toMatch(/\/32$/);
    const r3 = exercise.topology.nodes.find((node) => node.id === 'r3');
    expect(r3?.data.interfaces?.map((side) => `${side.ipAddress}/32`)).toContain(prefixes[0]);
  });
});
