/**
 * The device-exercise templates as a family for the shared verify harness
 * (`../verify/harness.ts`). Test-only: nothing in the app imports it.
 */

import type { Exercise } from '../model/types';
import { followingOrder, type AttemptOrder } from '../ui/attemptOrder';
import { orderedOptions, pressCards } from '../ui/choices';
import type { Offer, TemplateFamily } from '../verify/harness';
import { buildPool, exerciseById, GENERATOR_VERSION, POOL_SEEDS, TEMPLATES } from './index';
import { PLACES } from './shared/places';

/** The first seed set in each of the five places, so that every place's wording is read. */
function onePerPlace(generate: (seed: number) => Exercise): Exercise[] {
  return PLACES.flatMap((place) => {
    for (let seed = 0; seed < 60; seed += 1) {
      const exercise = generate(seed);
      if (exercise.fingerprint.split('|')[1] === place.id) return [exercise];
    }
    return [];
  });
}

/**
 * The options that pass, by template (an id, or its start). The explanation of
 * each option is written knowing this, so it is pinned.
 */
export const PASSING_OPTIONS: Readonly<
  Record<string, (id: string, exercise: Exercise) => boolean>
> = {
  'l1-choose-address': (id) => id === 'fits',
  // The reference's root, the server's own switch at the end of a tail, and
  // pushing the root out when the switch that takes over is one of those.
  'l2-choose-root': (id, exercise) => {
    const works = (rootId: string) =>
      rootId === 'root-swd' ||
      exercise.reference.some(
        (change) => rootId === `root-${'nodeId' in change ? change.nodeId : ''}`,
      );
    if (id !== 'start-high' && id !== 'start-default') return works(id);
    const next = exercise.start.nodes.find((node) => node.data.stpConfig?.priority === 8192);
    return next !== undefined && works(`root-${next.id}`);
  },
  // Which way of writing the routes is right follows who must be reached: the reference.
  'l2-choose-static-default': (id, exercise) =>
    JSON.stringify(exercise.options?.find((option) => option.id === id)?.changes) ===
    JSON.stringify(exercise.reference),
  // TC-787
  'l3-choose-longest': (id) => id === 'longest',
  // TC-989: raising the wanted provider's LOCAL_PREF, or lowering the other's.
  'l3-bgp-exit': (id) => id === 'raise-wanted' || id === 'lower-other',
  // TC-1104: only a MED within provider A counts, and only the one that puts the wanted link ahead.
  'l3-bgp-med': (id) => id === 'lower-wanted' || id === 'raise-other',
};

/**
 * The order of each attempt of one learner who works through every instance
 * the harness generates, one attempt each. Where the right chip or design sits
 * belongs to the attempt and moves on with every attempt (`attemptOrder.ts`),
 * so the order is walked as a learner meets it, not fixed: `FIRST_ORDER` puts
 * the right one first every time by construction.
 */
let lastOrder: AttemptOrder | null = null;
let attempts = 0;
function nextOrder(exercise: Exercise): AttemptOrder {
  attempts += 1;
  lastOrder = followingOrder(lastOrder, `${exercise.id}@${attempts * 1000}`);
  return lastOrder;
}

/**
 * What a device exercise offers to pick from, in the order of its attempt:
 * the address chips of a setting (the right one is the usable address), and
 * the designs of a choose-a-design task (right: the ones that work, `PASSING_OPTIONS`). A
 * design is told apart by what the learner reads, its label.
 */
function offers(exercise: Exercise): Offer[] {
  const order = nextOrder(exercise);
  const chips = pressCards(exercise, order).flatMap((card): Offer[] => {
    if (card.chips.length < 2) return [];
    const usable = card.presses.find((press) => press.sound === true)?.change;
    const right =
      usable?.kind === 'host-ip'
        ? usable.ip
        : usable?.kind === 'iface-address'
          ? usable.ipAddress
          : undefined;
    if (right === undefined) return [];
    return [
      {
        key: `${exercise.templateId}:${card.ref.kind} chips`,
        candidates: card.chips.map((chip) => ({ value: chip, right: chip === right })),
      },
    ];
  });
  const options = orderedOptions(exercise, order);
  const passes = PASSING_OPTIONS[exercise.templateId] ?? (() => false);
  const designs: Offer[] =
    options.length > 1
      ? [
          {
            key: `${exercise.templateId}:design`,
            candidates: options.map((option) => ({
              value: option.label.ja,
              right: passes(option.id, exercise),
            })),
          },
        ]
      : [];
  return [...chips, ...designs];
}

export const DEVICE_FAMILY: TemplateFamily<Exercise> = {
  name: 'device',
  templates: TEMPLATES,
  poolSeeds: POOL_SEEDS,
  buildPool,
  exerciseById,
  minPool: 100,
  extraSeeds: [1000, 1001, 1002, 1003],
  offers,
  golden: {
    // TC-478, TC-795 (level 3). The names are the snapshot's keys: keep them.
    describe: `exercise templates, generator version ${GENERATOR_VERSION}`,
    it: '%s: one instance set in each place (home, shop, clinic, school, office)',
    instances: (template) => onePerPlace(template.generate),
    count: 5,
    view: (exercise) => ({
      id: exercise.id,
      fingerprint: exercise.fingerprint,
      title: exercise.title.ja,
      task: exercise.task?.ja,
      rule: exercise.rule?.ja,
      brief: exercise.brief.ja,
    }),
  },
};
