// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { exerciseById, exercisePool, templateIdOf } from '../exerciseSource';
import type { Exercise } from '../model/types';
import { attemptOrder, FIRST_ORDER, placeIn } from './attemptOrder';
import { orderedOptions, pressCards } from './choices';
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

// TC-541, TC-579
describe('where the address that works sits among the chips', () => {
  const idsOf = (count: number) =>
    Array.from(
      { length: count },
      (_, index) => `some-exercise~${index % 7}@${1000 + index * 1000}`,
    );

  it('is a new place in every attempt: never the place it had in the attempt before', () => {
    const ids = idsOf(300);
    for (const count of [2, 3, 4, 5, 6]) {
      let before = -1;
      for (const id of ids) {
        const place = placeIn(attemptOrder(ids, id), count);
        expect(place, `${count} chips, ${id}`).not.toBe(before);
        before = place;
      }
    }
  });

  it('is a new place after "start over" too', () => {
    const ids = idsOf(40);
    for (const id of ids) {
      for (const count of [3, 4, 6]) {
        expect(placeIn(attemptOrder(ids, id, 1), count)).not.toBe(
          placeIn(attemptOrder(ids, id, 0), count),
        );
      }
    }
  });

  it('is in no one place for more than about 40% of the attempts, whatever is offered', () => {
    const ids = idsOf(600);
    for (const count of [3, 4, 6]) {
      expect(
        largestShare(ids.map((id) => placeIn(attemptOrder(ids, id), count))),
      ).toBeLessThanOrEqual(MAX_SHARE);
    }
  });

  it('is fixed by the attempt: the same attempts give the same order', () => {
    const ids = idsOf(12);
    const last = ids[11] ?? '';
    expect(attemptOrder(ids, last)).toEqual(attemptOrder([...ids], last));
    expect(attemptOrder(ids, last)).not.toEqual(attemptOrder(ids, ids[10] ?? ''));
  });

  it('puts the usable chip of every card, and the design that works, at the place of the attempt', () => {
    const ids = idsOf(9);
    for (const exercise of pool) {
      const order = attemptOrder(ids, `${exercise.id}@77`);
      for (const card of pressCards(exercise, order)) {
        if (card.chips.length === 0) continue;
        const usable = card.presses.findIndex((press) => press.sound === true);
        expect(usable, exercise.id).toBe(placeIn(order, card.chips.length));
      }
      if (exercise.options) {
        const shown = orderedOptions(exercise, order);
        expect(shown.map((option) => option.id).sort()).toEqual(
          exercise.options.map((option) => option.id).sort(),
        );
        expect(
          shown.findIndex(
            (option) => JSON.stringify(option.changes) === JSON.stringify(exercise.reference),
          ),
          exercise.id,
        ).toBe(placeIn(order, shown.length));
      }
    }
  });

  // TC-580
  it('two templates set in the same place do not offer the same chips', () => {
    const lists = ['l1-host-address~0', 'l1-prefix-fit~0', 'l1-which-pc~0', 'l1-host-blank~0'].map(
      (id) => {
        const exercise = exerciseById(id, 'ja');
        if (!exercise) throw new Error(`no ${id}`);
        return pressCards(exercise, FIRST_ORDER)
          .map((card) => [...card.chips].sort().join(' '))
          .filter((chips) => chips !== '');
      },
    );
    const all = lists.flat();
    expect(all.length).toBeGreaterThanOrEqual(6);
    expect(new Set(all).size).toBe(all.length);
  });

  it('offers six chips for a host and for a router side at levels 1 and 2 wherever the network allows', () => {
    const counts = pool.flatMap((exercise) =>
      pressCards(exercise, FIRST_ORDER).flatMap((card) =>
        card.chips.length > 0 ? [card.chips.length] : [],
      ),
    );
    expect(counts.length).toBeGreaterThan(100);
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(4);
    expect(counts.filter((count) => count === 6).length / counts.length).toBeGreaterThan(0.9);
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
