// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { exerciseById, exercisePool, templateIdOf } from '../exerciseSource';
import type { Exercise } from '../model/types';
import { addressCandidates, candidateParts } from './candidates';
import { sameSetting } from './describe';
import { settingOrder } from './settingOrder';

/** No place may hold the right answer in more than this share of a template's instances. */
const MAX_SHARE = 0.4;

const pool: Exercise[] = ([1, 2] as const).flatMap((level) =>
  exercisePool(level).flatMap((id) => exerciseById(id, 'ja') ?? []),
);

function byTemplate<T>(place: (exercise: Exercise) => T | null): Map<string, T[]> {
  const places = new Map<string, T[]>();
  for (const exercise of pool) {
    const found = place(exercise);
    if (found === null) continue;
    const key = templateIdOf(exercise.id);
    places.set(key, [...(places.get(key) ?? []), found]);
  }
  return places;
}

function largestShare(values: readonly number[]): number {
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return Math.max(...counts.values()) / values.length;
}

// TC-541
describe('where the address that works sits among the chips', () => {
  /** The place of the usable address among the chips of the host the reference solution changes. */
  const places = byTemplate((exercise) => {
    const fix = exercise.reference.find((change) => change.kind === 'host-ip');
    if (!fix || fix.kind !== 'host-ip' || exercise.options) return null;
    const parts = candidateParts(exercise.start, fix.nodeId, exercise.seed);
    if (!parts) return null;
    const place = addressCandidates(exercise.start, fix.nodeId, exercise.seed).indexOf(parts.right);
    return place === -1 ? null : place;
  });

  it('covers the templates whose answer is a host address', () => {
    expect([...places.keys()]).toEqual(
      expect.arrayContaining(['l1-host-address', 'l1-prefix-fit', 'l1-which-pc']),
    );
  });

  it('is in no one place for more than about 40% of a template’s instances', () => {
    for (const [templateId, found] of places) {
      expect(found.length, templateId).toBeGreaterThanOrEqual(8);
      expect(largestShare(found), `${templateId}: ${found.join('')}`).toBeLessThanOrEqual(
        MAX_SHARE,
      );
    }
  });

  it('is not first in the first instance of the templates a learner meets first', () => {
    for (const id of ['l1-host-address~0', 'l1-prefix-fit~0']) {
      const exercise = exerciseById(id, 'ja');
      const fix = exercise?.reference.find((change) => change.kind === 'host-ip');
      if (!exercise || !fix || fix.kind !== 'host-ip') throw new Error(`no ${id}`);
      const parts = candidateParts(exercise.start, fix.nodeId, exercise.seed);
      expect(addressCandidates(exercise.start, fix.nodeId, exercise.seed)[0], id).not.toBe(
        parts?.right,
      );
    }
  });
});

// TC-542
describe('the order of the setting cards', () => {
  it('is the same whatever order the exercise lists its settings in', () => {
    for (const exercise of pool) {
      const order = settingOrder(exercise.allowed, exercise.start);
      expect(order).toHaveLength(exercise.allowed.length);
      expect(settingOrder([...exercise.allowed].reverse(), exercise.start), exercise.id).toEqual(
        order,
      );
    }
  });

  it('reads the devices from left to right on the diagram', () => {
    const exercise = exerciseById('l1-which-pc~0', 'ja');
    if (!exercise) throw new Error('no l1-which-pc~0');
    const xs = settingOrder(exercise.allowed, exercise.start).map(
      (ref) =>
        exercise.start.nodes.find((node) => ref.kind === 'host-ip' && node.id === ref.nodeId)
          ?.position.x ?? NaN,
    );
    expect(xs).toHaveLength(3);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
  });

  it('does not put the device to find first in most instances of a find-the-fault template', () => {
    const places = byTemplate((exercise) => {
      // Only where the brief does not say which of several cards is the one to change.
      if (exercise.kind !== 'diagnose-repair' || exercise.allowed.length < 3) return null;
      const fix = exercise.reference[0];
      if (!fix || exercise.reference.length !== 1) return null;
      const order = settingOrder(exercise.allowed, exercise.start);
      const place = order.findIndex((ref) => sameSetting(fix, ref));
      return place === -1 ? null : place;
    });
    expect([...places.keys()]).toContain('l1-which-pc');
    for (const [templateId, found] of places) {
      // A handful of instances says nothing either way.
      if (found.length < 8) continue;
      const first = found.filter((place) => place === 0).length / found.length;
      expect(first, `${templateId}: ${found.join('')}`).toBeLessThanOrEqual(0.5);
    }
  });
});
