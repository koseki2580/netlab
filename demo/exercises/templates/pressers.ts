/**
 * Learners who do not read: they press what the page offers and press Check.
 * Test support for `levelRule.test.ts` and the probes in `verify.test.ts`;
 * not used by the app.
 *
 * A presser works on exactly what the page shows (`ui/choices.ts`, in the
 * order of the attempt), is graded by the real grader, and is judged by the
 * real level rule (`store/estimate.ts`).
 */

import { gradeExercise } from '../grade/gradeExercise';
import { applyChanges, readSetting } from '../model/settings';
import type { Exercise, ExerciseLevel, SettingChange } from '../model/types';
import { levelSummary } from '../store/estimate';
import type { AttemptRecord } from '../store/types';
import { attemptOrder, generator } from '../ui/attemptOrder';
import { checksToCount } from '../model/closedSet';
import { pickKey } from '../model/pick';
import { orderedOptions, pressCards } from '../ui/choices';
import { exerciseById, nextExerciseId, reopenedExerciseId } from './index';

export type Strategy = 'random' | 'first' | 'last' | 'repeat' | 'reopen' | 'giveup-reopen';
/** Learners who press without reading, one exercise after another. */
export const STRATEGIES: readonly Strategy[] = ['random', 'first', 'last', 'repeat'];
/**
 * Learners who use the page against itself. `reopen`: press until it passes,
 * then open the exercise again and press what passed. `giveup-reopen`: ask for
 * the answer, open the exercise again and press it. What "open it again" gives
 * them is the page's rule (`reopenedExerciseId`).
 */
export const REOPEN_STRATEGIES: readonly Strategy[] = ['reopen', 'giveup-reopen'];
const ALL_STRATEGIES: readonly Strategy[] = [...STRATEGIES, ...REOPEN_STRATEGIES];

/** One thing a presser can do before Check: a single press, or one design. */
export interface Offer {
  readonly changes: readonly SettingChange[];
  /** What the press shows, for "the same as last time": an address, an option id, a state. */
  readonly value: string;
  /** An option that brings a start of its own. */
  readonly start?: Exercise['start'];
  /** A press on something the learner should not have pointed at: a miss, whatever the grader would say. */
  readonly wrongPick?: true;
}

function valueOf(change: SettingChange): string {
  switch (change.kind) {
    case 'host-ip':
      return change.ip ?? '';
    case 'iface-address':
      return `${change.ipAddress}/${change.prefixLength}`;
    case 'link-state':
      return change.state;
    case 'port-vlan':
      return change.vlanMode;
    case 'stp-priority':
      return String(change.priority);
    default:
      return change.kind;
  }
}

/** Everything the page offers to press for this attempt, in reading order. */
export function offersOf(exercise: Exercise, attemptIds: readonly string[], id: string): Offer[] {
  const order = attemptOrder(attemptIds, id);
  if (exercise.options) {
    return orderedOptions(exercise, order).map((option) => ({
      changes: option.changes,
      value: option.id,
      ...(option.start ? { start: option.start } : {}),
    }));
  }
  const picking = exercise.pickFirst;
  return pressCards(exercise, order).flatMap((card) => {
    const key = picking ? pickKey(card.ref, picking.by) : null;
    return card.presses.map((press) => ({
      changes: [press.change],
      value: valueOf(press.change),
      ...(picking && key !== null && !picking.faulty.includes(key) ? { wrongPick: true } : {}),
    }));
  });
}

const grades = new Map<string, boolean>();

/** Whether the exercise passes with this one offer applied to its start. Remembered. */
export async function passesWith(exercise: Exercise, offer: Offer | null): Promise<boolean> {
  if (offer?.wrongPick) return false;
  const key = `${exercise.id}|${JSON.stringify(offer?.changes ?? [])}`;
  const known = grades.get(key);
  if (known !== undefined) return known;
  const start = offer?.start ?? exercise.start;
  const grade = await gradeExercise(
    { ...exercise, start },
    applyChanges(start, offer?.changes ?? []),
  );
  grades.set(key, grade.passed);
  return grade.passed;
}

/** The exercises of a level in the order the level page serves a learner (`salt`) who meets them all. */
export function servedOrder(level: ExerciseLevel, salt = ''): string[] {
  const seen: string[] = [];
  let last: string | undefined;
  for (;;) {
    const next = nextExerciseId(level, {
      seenIds: seen,
      avoidTemplateIds: last === undefined ? [] : [last],
      salt,
    });
    if (next === undefined) return seen;
    seen.push(next);
    last = next.slice(0, next.lastIndexOf('~'));
  }
}

interface Memory {
  index: number | null;
  value: string | null;
}

/** Checks a presser makes before moving on. The level rule counts at most two. */
const MAX_PRESSER_CHECKS = 3;
/** A presser who wants to know what passes keeps pressing for this long. */
const MAX_FINDING_CHECKS = 12;

/** What a learner carries from an exercise to the next visit: the press that passed, or the answer shown. */
interface Known {
  readonly exerciseId: string;
  readonly offer: Offer;
}

interface Tried {
  readonly presses: number;
  readonly passed: boolean;
  /** The press that passed. */
  readonly offer: Offer | null;
}

/**
 * One visit to an exercise by a presser. Before every Check the presser undoes
 * its last press and makes another one (the kindest reading: nothing it
 * disturbed stays disturbed).
 */
async function visit(
  exercise: Exercise,
  attemptIds: readonly string[],
  id: string,
  strategy: Strategy,
  random: () => number,
  memory: Memory,
  maxChecks: number,
  known: Known | null,
): Promise<Tried> {
  // The very exercise the learner knows the answer of: one press, one Check.
  if (known && known.exerciseId === exercise.id) {
    const passed = await passesWith(exercise, known.offer);
    return { presses: 1, passed, offer: passed ? known.offer : null };
  }
  // Where the learner points first, a press belongs to what was pointed at:
  // the page does not grade a press on the wrong device, it counts a miss.
  const offered = offersOf(exercise, attemptIds, id);
  let presses = 0;
  let passed = false;
  let passing: Offer | null = null;
  const untried = offered.map((_, index) => index);
  const remembered = known ? known.offer.value : strategy === 'repeat' ? memory.value : null;

  while (!passed && presses < maxChecks) {
    let pick: number | undefined;
    if (untried.length > 0) {
      if (strategy === 'first') pick = untried[0];
      else if (strategy === 'last') pick = untried[untried.length - 1];
      else if (presses === 0 && remembered !== null) {
        const same = offered.findIndex((offer) => offer.value === remembered);
        pick =
          same !== -1
            ? same
            : strategy === 'repeat' && memory.index !== null
              ? untried[Math.min(memory.index, untried.length - 1)]
              : untried[Math.floor(random() * untried.length)];
      } else pick = untried[Math.floor(random() * untried.length)];
    }
    if (pick !== undefined) untried.splice(untried.indexOf(pick), 1);
    const offer = pick === undefined ? null : (offered[pick] ?? null);
    presses += 1;
    passed = await passesWith(exercise, offer);
    if (passed && pick !== undefined && offer) {
      memory.index = pick;
      memory.value = offer.value;
      passing = offer;
    }
    // Nothing to press and nothing passed: pressing Check again changes nothing.
    if (offer === null) break;
  }
  return { presses, passed, offer: passing };
}

/** The answer as "show me the answer" gives it: the reference, as something to press. */
function shownAnswer(exercise: Exercise): Offer {
  const reference = JSON.stringify(exercise.reference);
  const option = exercise.options?.find((entry) => JSON.stringify(entry.changes) === reference);
  const [first] = exercise.reference;
  return {
    changes: exercise.reference,
    value: option ? option.id : first ? valueOf(first) : '',
    ...(option?.start ? { start: option.start } : {}),
  };
}

/**
 * Ten exercises by one presser. Returns the records the store would hold.
 * A `reopen` learner visits an exercise it did not solve cleanly a second
 * time; a `giveup-reopen` learner visits every exercise twice.
 */
export async function runOf(
  level: ExerciseLevel,
  strategy: Strategy,
  run: number,
  served: readonly string[],
): Promise<AttemptRecord[]> {
  const random = generator(run * 7919 + ALL_STRATEGIES.indexOf(strategy) * 104729 + level);
  const offset = run === 0 ? 0 : Math.floor(random() * Math.max(1, served.length - 10));
  const records: AttemptRecord[] = [];
  const memory: Memory = { index: null, value: null };
  const reopens = REOPEN_STRATEGIES.includes(strategy);

  const record = (
    exercise: Exercise,
    startedAt: number,
    tried: Tried,
    revealed = false,
  ): AttemptRecord => ({
    id: `${exercise.id}@${startedAt}`,
    exerciseId: exercise.id,
    templateId: exercise.templateId,
    level,
    kind: exercise.kind,
    context: 'practice',
    startedAt,
    endedAt: startedAt + 100,
    outcome: tried.passed ? 'passed' : revealed ? 'gave-up' : 'abandoned',
    checkPresses: tried.presses,
    firstCheckPassed: tried.passed && tried.presses === 1,
    failedCheckIds: [],
    hintsUsed: 0,
    revealed,
    changedSettings: 1,
    locale: 'ja',
    generatorVersion: exercise.generatorVersion,
    ...recordExtras(exercise),
  });
  const ids = (): string[] => records.map((entry) => entry.id);

  for (const [turn, exerciseId] of served.slice(offset, offset + 10).entries()) {
    const exercise = exerciseById(exerciseId);
    if (!exercise) continue;
    const startedAt = run * 100_000 + turn * 1000 + 1;
    let known: Known | null = null;
    if (strategy === 'giveup-reopen') {
      records.push(record(exercise, startedAt, { presses: 0, passed: false, offer: null }, true));
      known = { exerciseId, offer: shownAnswer(exercise) };
    } else {
      const tried = await visit(
        exercise,
        ids(),
        `${exerciseId}@${startedAt}`,
        strategy,
        random,
        memory,
        reopens ? MAX_FINDING_CHECKS : MAX_PRESSER_CHECKS,
        null,
      );
      records.push(record(exercise, startedAt, tried));
      // Solved on the first Check: nothing to launder.
      if (!reopens || (tried.passed && tried.presses === 1)) continue;
      if (tried.offer) known = { exerciseId, offer: tried.offer };
    }

    // The learner opens the exercise again; the page decides what that gives.
    const againId = reopenedExerciseId(
      exerciseId,
      records.map((entry) => entry.exerciseId),
      [...served, ...records.map((entry) => entry.exerciseId)],
    );
    const again = exerciseById(againId);
    if (!again) continue;
    const againAt = startedAt + 500;
    const tried = await visit(
      again,
      ids(),
      `${againId}@${againAt}`,
      strategy,
      random,
      memory,
      1,
      known,
    );
    records.push(record(again, againAt, tried));
  }
  return records;
}

/** What `store.open` adds to a record from the exercise itself. */
export function recordExtras(exercise: Exercise): Partial<AttemptRecord> {
  return checksToCount(exercise) === 1 ? { checksToCount: 1 } : {};
}

/** The share of `runs` runs after which the level reads "cleared". */
export async function clearRate(
  level: ExerciseLevel,
  strategy: Strategy,
  runs: number,
): Promise<number> {
  let cleared = 0;
  for (let run = 0; run < runs; run += 1) {
    // Every run is another learner: the kinds of task come in an order of their own.
    const records = await runOf(level, strategy, run, servedOrder(level, `run-${run}`));
    if (levelSummary(records, level).status === 'cleared') cleared += 1;
  }
  return cleared / runs;
}

// --- Learners who know something ------------------------------------------------
//
// The pressers above show that the rule is strict. These two show that it
// means something: one Check per exercise, by a learner with a real skill.

/**
 * `neighbour-habit`: knows one thing, and knows it well: "take the first three
 * numbers of a device beside it, and a last number that is not on the diagram
 * yet". Sees a red dotted cable and plugs it in. Does not know what "/16"
 * means, and cannot tell which side of a router an address belongs to.
 *
 * `knows-level-1`: applies every rule of level 1: reads the "/number", takes
 * each side of a router for a network of its own, finds the device that does
 * not fit. `slip` is how often it gets one wrong all the same.
 */
export type Learner = 'neighbour-habit' | 'knows-level-1';

const three = (address: string): string => address.split('.').slice(0, 3).join('.');

/** Every address on the diagram, with the setting it belongs to. */
function shownAddresses(
  exercise: Exercise,
): { readonly owner: string; readonly address: string }[] {
  return exercise.start.nodes.flatMap((node) => [
    ...(typeof node.data.ip === 'string' && node.data.ip !== ''
      ? [{ owner: node.id, address: node.data.ip }]
      : []),
    ...(node.data.interfaces ?? []).map((side) => ({
      owner: `${node.id}:${side.id}`,
      address: side.ipAddress,
    })),
  ]);
}

const addressOf = (change: SettingChange | undefined): string | null =>
  change?.kind === 'host-ip'
    ? change.ip
    : change?.kind === 'iface-address'
      ? change.ipAddress
      : null;
const ownerOf = (change: SettingChange): string =>
  change.kind === 'iface-address'
    ? `${change.nodeId}:${change.ifaceId}`
    : 'nodeId' in change
      ? change.nodeId
      : '';

/** What the habit makes of a list of addresses for one device: its picks, or none when it has nothing to say. */
function habitPicks<T>(
  exercise: Exercise,
  owner: string,
  items: readonly T[],
  address: (item: T) => string | null,
): T[] {
  const shown = shownAddresses(exercise);
  const others = shown.filter((entry) => entry.owner !== owner).map((entry) => entry.address);
  return items.filter((item) => {
    const value = address(item);
    return (
      value !== null &&
      others.some((other) => three(other) === three(value)) &&
      !shown.some((entry) => entry.address === value)
    );
  });
}

/** The one press the habit learner makes on this exercise; null when it presses nothing. */
function habitOffer(
  exercise: Exercise,
  order: ReturnType<typeof attemptOrder>,
  random: () => number,
): Offer | null {
  const any = <T>(items: readonly T[]): T | undefined => items[Math.floor(random() * items.length)];
  if (exercise.options) {
    const options = orderedOptions(exercise, order);
    const fits = options.filter((option) => {
      const [change] = option.changes;
      return (
        change !== undefined &&
        habitPicks(exercise, ownerOf(change), [change], addressOf).length === 1
      );
    });
    const option = any(fits.length > 0 ? fits : options);
    return option
      ? {
          changes: option.changes,
          value: option.id,
          ...(option.start ? { start: option.start } : {}),
        }
      : null;
  }
  const picking = exercise.pickFirst;
  const cards = pressCards(exercise, order);
  // A red dotted cable is seen and pressed.
  const cable = cards
    .flatMap((card) => card.presses)
    .find((press) => press.change.kind === 'link-state' && press.sound === true);
  if (cable) return { changes: [cable.change], value: valueOf(cable.change) };

  const withChips = cards.filter((card) => card.chips.length > 0);
  const shown = shownAddresses(exercise);
  // The device that stands out to this learner: no address, first three numbers
  // nobody else has, or an address another device has too. Not a side of a router.
  const odd = withChips.filter((card) => {
    const now = readSetting(exercise.start, card.ref);
    if (now?.kind !== 'host-ip') return false;
    if (now.ip === null || now.ip === '') return true;
    const others = shown
      .filter((entry) => entry.owner !== now.nodeId)
      .map((entry) => entry.address);
    return !others.some((other) => three(other) === three(now.ip ?? '')) || others.includes(now.ip);
  });
  const card = any(odd.length > 0 ? odd : withChips);
  if (!card) return null;
  const key = picking ? pickKey(card.ref, picking.by) : null;
  const fits = habitPicks(
    exercise,
    key ?? ('nodeId' in card.ref ? card.ref.nodeId : ''),
    card.presses.filter((press) => addressOf(press.change) !== null),
    (press) => addressOf(press.change),
  );
  const press = any(fits.length > 0 ? fits : card.presses);
  if (!press) return null;
  return {
    changes: [press.change],
    value: valueOf(press.change),
    ...(picking && key !== null && !picking.faulty.includes(key)
      ? { wrongPick: true as const }
      : {}),
  };
}

/** The press of a learner who applies the rules: the sound press on what is at fault, or the design that works. */
function knowingOffer(exercise: Exercise, order: ReturnType<typeof attemptOrder>): Offer | null {
  if (exercise.options) return shownAnswer(exercise);
  const picking = exercise.pickFirst;
  const touched = new Set(exercise.reference.map(ownerOf));
  for (const card of pressCards(exercise, order)) {
    const key = picking ? pickKey(card.ref, picking.by) : null;
    if (picking && key !== null && !picking.faulty.includes(key)) continue;
    const press = card.presses.find(
      (entry) =>
        entry.sound === true &&
        (picking || touched.has(ownerOf(entry.change)) || entry.change.kind === 'link-state'),
    );
    if (press) return { changes: [press.change], value: valueOf(press.change) };
  }
  return null;
}

/**
 * `count` exercises by one learner, one Check each. Returns after how many
 * exercises the level first read "cleared" (null when it never did), and
 * whether it read "cleared" after the last one.
 */
export async function learnerRun(
  level: ExerciseLevel,
  learner: Learner,
  run: number,
  count: number,
  slip = 0,
): Promise<{
  readonly clearedAt: number | null;
  readonly clearedAtEnd: boolean;
  readonly solvedBy: Readonly<Record<string, readonly [number, number]>>;
}> {
  const random = generator(run * 6007 + (learner === 'knows-level-1' ? 17 : 5) + level * 131);
  const served = servedOrder(level, `learner-${run}`);
  const records: AttemptRecord[] = [];
  const solvedBy: Record<string, [number, number]> = {};
  let clearedAt: number | null = null;
  let clearedAtEnd = false;
  for (const [turn, exerciseId] of served.slice(0, count).entries()) {
    const exercise = exerciseById(exerciseId);
    if (!exercise) continue;
    const startedAt = run * 100_000 + turn * 1000 + 1;
    const id = `${exerciseId}@${startedAt}`;
    const order = attemptOrder(
      records.map((entry) => entry.id),
      id,
    );
    const offer =
      learner === 'neighbour-habit'
        ? habitOffer(exercise, order, random)
        : random() < slip
          ? null
          : knowingOffer(exercise, order);
    const passed = await passesWith(exercise, offer);
    const tally = (solvedBy[exercise.templateId] ??= [0, 0]);
    tally[0] += passed ? 1 : 0;
    tally[1] += 1;
    records.push({
      id,
      exerciseId,
      templateId: exercise.templateId,
      level,
      kind: exercise.kind,
      context: 'practice',
      startedAt,
      endedAt: startedAt + 100,
      outcome: passed ? 'passed' : 'abandoned',
      checkPresses: 1,
      firstCheckPassed: passed,
      failedCheckIds: [],
      hintsUsed: 0,
      revealed: false,
      changedSettings: 1,
      locale: 'ja',
      generatorVersion: exercise.generatorVersion,
      ...recordExtras(exercise),
    });
    clearedAtEnd = levelSummary(records, level).status === 'cleared';
    if (clearedAtEnd && clearedAt === null) clearedAt = turn + 1;
  }
  return { clearedAt, clearedAtEnd, solvedBy };
}
