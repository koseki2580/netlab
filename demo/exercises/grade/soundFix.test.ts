// @vitest-environment node
/**
 * A pass must come from fixing the fault, not from disturbing something else.
 * The two passes a learner reached by pressing at random, on the real
 * templates: a bigger "/number" on the router, and a healthy port changed
 * instead of the faulty one.
 */

import { describe, expect, it } from 'vitest';
import { applyChanges, differsOutside, readSetting } from '../model/settings';
import type { Exercise, SettingChange } from '../model/types';
import { generateExercise } from '../templates';
import { gradeExercise } from './gradeExercise';

function firstWith(templateId: string, part: string): Exercise {
  for (let seed = 0; seed < 60; seed += 1) {
    const exercise = generateExercise(templateId, seed);
    if (exercise?.fingerprint.split('|').includes(part)) return exercise;
  }
  throw new Error(`no ${templateId} with ${part}`);
}

const grade = (exercise: Exercise, changes: readonly SettingChange[]) =>
  gradeExercise(exercise, applyChanges(exercise.start, changes));

// TC-582
describe('the "/number" of a router side whose address is the question', () => {
  const exercise = firstWith('l1-router-address', 'near-miss');
  const faulty = exercise.reference[0];
  if (faulty?.kind !== 'iface-address') throw new Error('the fix is not a router address');
  const now = readSetting(exercise.start, faulty);
  if (now?.kind !== 'iface-address') throw new Error('no such side');

  it('cannot be changed: a network made big enough to hold everyone is not graded as a pass', async () => {
    const bigger = applyChanges(exercise.start, [{ ...now, prefixLength: 16 }]);
    expect(differsOutside(exercise.start, bigger, exercise.allowed)).toBe(true);
    const result = await gradeExercise(exercise, bigger);
    expect(result.passed).toBe(false);
    expect(result.results.every((entry) => entry.code === 'config-invalid')).toBe(true);
  });

  it('the address itself can: the right address passes', async () => {
    expect((await grade(exercise, exercise.reference)).passed).toBe(true);
  });
});

// TC-582
describe('a port in the wrong VLAN, and a learner who changes another port', () => {
  const exercise = firstWith('l2-vlan-access', 'unused');
  const [fix] = exercise.reference;
  if (fix?.kind !== 'port-vlan') throw new Error('the fix is not a port');
  const victim = readSetting(exercise.start, fix);
  if (victim?.kind !== 'port-vlan') throw new Error('no such port');
  const reach = exercise.checks.find((check) => check.kind === 'reach');
  if (reach?.kind !== 'reach') throw new Error('no reach goal');
  const mateHost = reach.probe.to;
  const matePort = exercise.start.edges.find((edge) => edge.source === mateHost);
  const mate: SettingChange = {
    kind: 'port-vlan',
    nodeId: matePort?.target ?? '',
    portId: matePort?.targetHandle ?? '',
    vlanMode: 'access',
    accessVlan: victim.accessVlan ?? 1,
  };
  const victimLabel = exercise.nodeLabels?.[reach.probe.from];

  it('moving the colleague to where the device is makes it arrive, and is not a pass', async () => {
    const result = await grade(exercise, [mate]);
    expect(result.passed).toBe(false);
    const failed = result.results.filter((entry) => !entry.passed);
    expect(failed.map((entry) => entry.code)).toEqual(['changed-elsewhere']);
    expect(failed[0]?.message.ja).toContain('届きましたが、直したのは別の場所です。');
    expect(failed[0]?.message.en).toContain('It arrives, but what you fixed is somewhere else.');
    // It does not say which device or socket was at fault.
    expect(failed[0]?.message.ja).not.toContain(victimLabel?.ja ?? 'x');
    expect(failed[0]?.message.en).not.toContain(victimLabel?.en ?? 'x');
  });

  it('says something else when a healthy port was changed and it still does not arrive', async () => {
    const result = await grade(exercise, [{ ...mate, accessVlan: 999 }]);
    const elsewhere = result.results.find((entry) => entry.code === 'changed-elsewhere');
    expect(elsewhere?.message.ja).not.toContain('届きましたが');
    expect(elsewhere?.message.ja).toContain('元に戻して');
  });

  it('turning a port into one that carries several groups is not graded as a pass', async () => {
    const trunk: SettingChange = {
      kind: 'port-vlan',
      nodeId: mate.kind === 'port-vlan' ? mate.nodeId : '',
      portId: mate.kind === 'port-vlan' ? mate.portId : '',
      vlanMode: 'trunk',
      trunkAllowedVlans: [fix.accessVlan ?? 1, victim.accessVlan ?? 1],
    };
    expect((await grade(exercise, [trunk])).passed).toBe(false);
  });

  it('putting the faulty port back passes', async () => {
    expect((await grade(exercise, exercise.reference)).passed).toBe(true);
  });
});

// TC-588
describe('a find-the-fault exercise never names the faulty device in what it says', () => {
  it.each(['stranger', 'near-miss', 'duplicate'])(
    'l1-which-pc, fault "%s": at the start, and after a healthy device was changed',
    async (fault) => {
      const exercise = firstWith('l1-which-pc', fault);
      const faulty = exercise.pickFirst?.faulty ?? [];
      expect(faulty.length).toBe(fault === 'duplicate' ? 2 : 1);
      const healthy = exercise.allowed.flatMap((ref) =>
        ref.kind === 'host-ip' && !faulty.includes(ref.nodeId) ? [ref.nodeId] : [],
      );
      const states = [
        exercise.start,
        applyChanges(exercise.start, [{ kind: 'host-ip', nodeId: healthy[0] ?? '', ip: null }]),
      ];
      for (const state of states) {
        const result = await gradeExercise(exercise, state);
        expect(result.passed).toBe(false);
        for (const entry of result.results.filter((one) => !one.passed)) {
          for (const nodeId of faulty) {
            const label = exercise.nodeLabels?.[nodeId];
            const address = exercise.start.nodes.find((node) => node.id === nodeId)?.data.ip ?? 'x';
            // The goal's own label names its device; the reason must not single one out.
            expect(entry.message.ja, entry.checkId).not.toContain(label?.ja ?? 'x');
            expect(entry.message.en, entry.checkId).not.toContain(label?.en ?? 'x');
            expect(entry.message.ja, entry.checkId).not.toContain(address);
          }
          expect(entry.evidence?.relatedNodeIds).toBeUndefined();
        }
      }
    },
  );
});
