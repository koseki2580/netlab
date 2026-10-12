// @vitest-environment node
/**
 * The address chips must not give the answer away to a learner who looks at
 * the chips alone. Over the pool, per template, each of these rules of thumb
 * picks the usable chip no more often than a blind guess would (with a small
 * margin): the most common first three numbers; the last number most chips
 * share; both at once; the chip most like the others; the lowest and the
 * highest last number.
 *
 * And the "/number" exercise must need the "/number": a learner who always
 * copies the first three numbers of a neighbour passes it only where the
 * network is a /24.
 */

import { describe, expect, it } from 'vitest';
import { isInSubnet } from '../../../src/utils/cidr';
import type { Exercise } from '../model/types';
import { FIRST_ORDER } from '../ui/attemptOrder';
import { pressCards } from '../ui/choices';
import { buildPool, exerciseById, TEMPLATES } from './index';

/** With six chips a blind guess is right one time in six. */
const LIMIT = 0.25;

const parts = (address: string): number[] => address.split('.').map(Number);
const firstThree = (address: string): string => address.split('.').slice(0, 3).join('.');
const last = (address: string): number => parts(address)[3] ?? 0;

/** The chips with the highest score. */
function best(chips: readonly string[], score: (chip: string) => number): string[] {
  const top = Math.max(...chips.map(score));
  return chips.filter((chip) => score(chip) === top);
}
const count = <T>(items: readonly T[], item: T): number =>
  items.filter((other) => other === item).length;

type Heuristic = (chips: readonly string[]) => string[];

export const HEURISTICS: Readonly<Record<string, Heuristic>> = {
  'most common first three numbers': (chips) =>
    best(chips, (chip) => count(chips.map(firstThree), firstThree(chip))),
  'last number most chips share': (chips) =>
    best(chips, (chip) => count(chips.map(last), last(chip))),
  'both of those at once': (chips) =>
    best(
      chips,
      (chip) => count(chips.map(firstThree), firstThree(chip)) + count(chips.map(last), last(chip)),
    ),
  'differs from the others in the fewest places': (chips) =>
    best(
      chips,
      (chip) =>
        -chips.reduce(
          (sum, other) =>
            sum + parts(chip).filter((value, index) => value !== parts(other)[index]).length,
          0,
        ),
    ),
  'lowest last number': (chips) => best(chips, (chip) => -last(chip)),
  'highest last number': (chips) => best(chips, last),
};

interface Card {
  readonly exercise: Exercise;
  readonly chips: readonly string[];
  readonly right: string;
}

function chipCards(templateId: string, level: 1 | 2): Card[] {
  return buildPool(level)
    .filter((id) => id.startsWith(`${templateId}~`))
    .flatMap((id) => {
      const exercise = exerciseById(id);
      if (!exercise) return [];
      return pressCards(exercise, FIRST_ORDER).flatMap((card) => {
        const right = card.presses.find((press) => press.sound === true)?.change;
        const address =
          right?.kind === 'host-ip'
            ? right.ip
            : right?.kind === 'iface-address'
              ? right.ipAddress
              : null;
        return card.chips.length >= 4 && address
          ? [{ exercise, chips: card.chips, right: address }]
          : [];
      });
    });
}

/** How often picking at random among what the heuristic points at is right. */
function rate(cards: readonly Card[], heuristic: Heuristic): number {
  const hits = cards.map((card) => {
    const picked = heuristic(card.chips);
    return picked.includes(card.right) ? 1 / picked.length : 0;
  });
  return hits.reduce((sum, hit) => sum + hit, 0) / Math.max(1, hits.length);
}

const withChips = TEMPLATES.filter(
  (template) =>
    (template.level === 1 || template.level === 2) &&
    chipCards(template.id, template.level).length > 0,
).map((template) => [template.id, template.level] as const);

// TC-602
describe('the chips alone do not say which one is usable', () => {
  it('some templates offer chips', () => {
    expect(withChips.length).toBeGreaterThanOrEqual(4);
  });

  describe.each(withChips)('%s', (templateId, level) => {
    const cards = chipCards(templateId, level as 1 | 2);

    it('offers six chips, one of them usable', () => {
      for (const card of cards) {
        expect(card.chips.length, card.exercise.id).toBe(6);
        expect(new Set(card.chips).size, card.exercise.id).toBe(6);
      }
    });

    it.each(Object.keys(HEURISTICS))(
      `"%s" is right at most ${LIMIT * 100}% of the time`,
      (name) => {
        const heuristic = HEURISTICS[name];
        if (!heuristic) throw new Error('no such heuristic');
        const found = rate(cards, heuristic);
        console.log(`chips | ${templateId} | ${name} | ${(found * 100).toFixed(1)}%`);
        expect(found).toBeLessThanOrEqual(LIMIT);
      },
    );
  });
});

// --- The "/number" exercise ---------------------------------------------------

interface Fit {
  readonly exercise: Exercise;
  readonly length: number;
  readonly chips: readonly string[];
  readonly right: string;
  /** Addresses of the healthy devices on the PCs' side, the router's among them. */
  readonly neighbours: readonly string[];
  /** Every address the diagram shows, the device's own wrong one among them. */
  readonly shown: readonly string[];
}

function fits(): Fit[] {
  return chipCards('l1-prefix-fit', 1).map(({ exercise, chips, right }) => {
    const lan = exercise.start.nodes
      .find((node) => node.id === 'r1')
      ?.data.interfaces?.find((side) => side.id === 'lan');
    if (!lan) throw new Error('no router side');
    const shown = exercise.start.nodes.flatMap((node) => [
      ...(typeof node.data.ip === 'string' && node.data.ip !== '' ? [node.data.ip] : []),
      ...(node.data.interfaces ?? []).map((side) => side.ipAddress),
    ]);
    const cidr = `${lan.ipAddress}/${lan.prefixLength}`;
    return {
      exercise,
      length: lan.prefixLength,
      chips,
      right,
      neighbours: shown.filter((address) => isInSubnet(address, cidr)),
      shown,
    };
  });
}

/**
 * The "/24 habit": pick a chip that has the first three numbers of a
 * neighbour and is not an address already on the diagram; failing that, one
 * that has the first three numbers of anything on the diagram; failing that,
 * a neighbour's own address.
 */
function habitPicks(fit: Fit): string[] {
  const shares = (chip: string, addresses: readonly string[]) =>
    addresses.some((address) => firstThree(address) === firstThree(chip));
  const free = (chip: string) => !fit.shown.includes(chip);
  const classes = [
    fit.chips.filter((chip) => shares(chip, fit.neighbours) && free(chip)),
    fit.chips.filter((chip) => shares(chip, fit.shown) && free(chip)),
    fit.chips.filter((chip) => shares(chip, fit.neighbours)),
  ];
  return classes.find((picked) => picked.length > 0) ?? [...fit.chips];
}

// TC-603
describe('l1-prefix-fit needs the "/number"', () => {
  const all = fits();
  const share24 = all.filter((fit) => fit.length === 24).length / all.length;

  it('a /24 network is at most a third of the pool, and /8 and /16 are both there', () => {
    console.log(
      `prefix-fit | pool of ${all.length}: ${[8, 16, 24]
        .map((length) => `/${length} ${all.filter((fit) => fit.length === length).length}`)
        .join(', ')}`,
    );
    expect(share24).toBeLessThanOrEqual(1 / 3 + 1e-9);
    expect(all.some((fit) => fit.length === 8)).toBe(true);
    expect(all.some((fit) => fit.length === 16)).toBe(true);
  });

  it('under /16 and /8 the usable chip shares its third number (under /8 its second too) with no neighbour', () => {
    for (const fit of all.filter((one) => one.length < 24)) {
      const [, second, third] = parts(fit.right);
      for (const neighbour of fit.neighbours) {
        expect(
          parts(neighbour)[2],
          `${fit.exercise.id}: ${fit.right} beside ${neighbour}`,
        ).not.toBe(third);
        if (fit.length === 8) expect(parts(neighbour)[1], fit.exercise.id).not.toBe(second);
      }
    }
  });

  it('under /16 and /8 a chip is there for the habit to pick, and it is not the usable one', () => {
    for (const fit of all.filter((one) => one.length < 24)) {
      const decoys = fit.chips.filter(
        (chip) =>
          chip !== fit.right &&
          fit.shown.some((address) => firstThree(address) === firstThree(chip)),
      );
      expect(decoys.length, fit.exercise.id).toBeGreaterThan(0);
    }
  });

  it('a learner who copies the first three numbers of a neighbour passes no more often than there are /24 networks', () => {
    const passes = all.map((fit) => {
      const picked = habitPicks(fit);
      return picked.includes(fit.right) ? 1 / picked.length : 0;
    });
    const passRate = passes.reduce((sum, hit) => sum + hit, 0) / all.length;
    console.log(
      `prefix-fit | "/24 habit" passes ${(passRate * 100).toFixed(1)}%; /24 networks are ${(share24 * 100).toFixed(1)}% of the pool`,
    );
    expect(passRate).toBeLessThanOrEqual(share24 + 1e-9);
  });
});

// TC-605
describe('l1-router-address: which side is wrong', () => {
  it('is each side about as often, and so is the place of its card', () => {
    const places = buildPool(1)
      .filter((id) => id.startsWith('l1-router-address~'))
      .map((id) => {
        const exercise = exerciseById(id);
        const [faulty] = exercise?.pickFirst?.faulty ?? [];
        if (!exercise || faulty === undefined) throw new Error(`${id} has no side to choose`);
        const cards = pressCards(exercise, FIRST_ORDER).map(
          (card) =>
            `${'nodeId' in card.ref ? card.ref.nodeId : ''}:${'ifaceId' in card.ref ? card.ref.ifaceId : ''}`,
        );
        expect(cards).toHaveLength(2);
        return cards.indexOf(faulty);
      });
    const first = places.filter((place) => place === 0).length / places.length;
    console.log(
      `router-address | the wrong side is the first card in ${(first * 100).toFixed(1)}% of ${places.length}`,
    );
    expect(places).not.toContain(-1);
    expect(first).toBeGreaterThanOrEqual(0.4);
    expect(first).toBeLessThanOrEqual(0.6);
  });
});
