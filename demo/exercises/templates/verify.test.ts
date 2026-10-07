// @vitest-environment node
/**
 * Every template, on the real simulator: the start state fails, the reference
 * passes, natural wrong answers fail, the text is complete in both languages,
 * and the pools hold at least a hundred distinct instances.
 *
 * Seeds 0 to N-1 (N = `EXERCISE_VERIFY_SEEDS`, 12 by default; 100 verifies every
 * instance a pool can hold), plus seed block B of the study cycle (1000 to 1003).
 * No TC ids yet: the spec lane allocates them (see the plan).
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gradeExercise } from '../grade/gradeExercise';
import { applyChangesReporting, differsOutside, isAllowed } from '../model/settings';
import type { Exercise, ExerciseLevel, Localised, SettingChange } from '../model/types';
import {
  buildPool,
  exerciseById,
  generateExercise,
  localiseExercise,
  nextExerciseId,
  POOL_SEEDS,
  templateById,
  TEMPLATES,
} from './index';
import { refOf } from './shared/exercise';

const SEED_COUNT = Number(process.env.EXERCISE_VERIFY_SEEDS ?? 12);
const SEEDS = [...Array.from({ length: SEED_COUNT }, (_, seed) => seed), 1000, 1001, 1002, 1003];

const JAPANESE = /[぀-ヿ一-龯]/;
const LEFTOVER = /\{|\}|undefined|NaN|\[object|null/;
/** Words a level 1 learner has not met. Checked in everything a level 1 exercise says. */
const LEVEL_1_BANNED = {
  ja: [
    '疎通',
    'サブネット',
    'ゲートウェイ',
    'プレフィックス',
    'セグメント',
    'ルーティング',
    'VLAN',
    'ACL',
    'トポロジ',
    'インターフェース',
    'ノード',
    'ホスト',
    'パケット',
    'ネクストホップ',
    'IP アドレス',
  ],
  en: [
    'subnet',
    'gateway',
    'prefix',
    'segment',
    'routing',
    'vlan',
    'acl',
    'topology',
    'interface',
    'node',
    ' host',
    'packet',
    'next hop',
  ],
} as const;

/**
 * The options that pass, by template (an id, or its start). The explanation of
 * each option is written knowing this, so it is pinned.
 */
const PASSING_OPTIONS: Readonly<Record<string, (id: string, exercise: Exercise) => boolean>> = {
  'l1-choose-address': (id) => id === 'fits',
  'l2-choose-root': (id, exercise) =>
    id === 'root-swd' ||
    exercise.reference.some((change) => id === `root-${'nodeId' in change ? change.nodeId : ''}`),
  'l2-choose-static-default': (id) => id === 'default',
};

const ROUTES = readFileSync(new URL('../../main.tsx', import.meta.url), 'utf8');

/** Everything wrong with one instance, as sentences. Empty when it is sound. */
async function problemsOf(exercise: Exercise): Promise<string[]> {
  const problems: string[] = [];
  const no = (ok: boolean, what: string) => {
    if (!ok) problems.push(`${exercise.id}: ${what}`);
  };
  const { start, allowed } = exercise;

  /** Apply changes over a start and grade; reports changes that miss or leave the allow-list. */
  const run = async (what: string, changes: readonly SettingChange[], from = start) => {
    const applied = applyChangesReporting(from, changes);
    no(applied.ignored.length === 0, `${what}: a change has no target`);
    no(
      changes.every((change) => isAllowed(refOf(change), allowed)),
      `${what}: a change is outside the allow-list`,
    );
    no(!differsOutside(from, applied.topology, allowed), `${what}: differs outside the allow-list`);
    const grade = await gradeExercise({ ...exercise, start: from }, applied.topology);
    return {
      passed: grade.passed,
      codes: grade.results.map((result) => `${result.checkId}=${result.code}`).join(', '),
    };
  };

  // --- The simulator decides ---
  const atStart = await gradeExercise(exercise, start);
  no(!atStart.passed, 'the start state passes');
  no(
    atStart.results.every(
      (result) => result.code !== 'engine-error' && result.code !== 'config-invalid',
    ),
    `the start state cannot be graded (${atStart.results.map((r) => r.code).join(', ')})`,
  );
  no(exercise.reference.length > 0, 'the reference is empty');
  const reference = await run('reference', exercise.reference);
  no(reference.passed, `the reference fails (${reference.codes})`);

  // The same must hold with the devices named in English.
  const english = localiseExercise(exercise, 'en');
  const englishGrade = await gradeExercise(
    english,
    applyChangesReporting(english.start, exercise.reference).topology,
  );
  no(englishGrade.passed, 'the reference fails once the devices are named in English');

  // --- Checks ---
  const kinds = exercise.checks.map((check) => check.kind);
  no(new Set(exercise.checks.map((check) => check.id)).size === kinds.length, 'check ids repeat');
  if (kinds.includes('must-not-reach')) {
    no(kinds.includes('reach'), 'a must-not-reach check without a reach check');
  }
  if (
    exercise.checks.some((check) => check.kind === 'must-not-reach' && check.because === 'vlan')
  ) {
    no(
      allowed.every((ref) => ref.kind !== 'link-state' && ref.kind !== 'host-ip'),
      'a VLAN isolation exercise lets the learner cut a cable or remove an address',
    );
  }

  // --- Options or wrong answers ---
  if (exercise.kind === 'choose-design') {
    const options = exercise.options ?? [];
    no(options.length >= 2, 'fewer than two options');
    no(new Set(options.map((option) => option.id)).size === options.length, 'option ids repeat');
    const outcomes: boolean[] = [];
    for (const option of options) {
      outcomes.push(
        (await run(`option ${option.id}`, option.changes, option.start ?? start)).passed,
      );
    }
    const expected = PASSING_OPTIONS[exercise.templateId];
    no(expected !== undefined, 'no entry in PASSING_OPTIONS');
    options.forEach((option, index) => {
      no(
        outcomes[index] === expected?.(option.id, exercise),
        `option ${option.id} ${outcomes[index] ? 'passes' : 'fails'}, against its explanation`,
      );
    });
    no(outcomes.includes(true), 'no option passes');
    no(outcomes.includes(false), 'no option fails');
    const referenceOption = options.findIndex(
      (option) => JSON.stringify(option.changes) === JSON.stringify(exercise.reference),
    );
    no(referenceOption !== -1, 'the reference is not one of the options');
    no(outcomes[referenceOption] === true, 'the reference option fails');
  } else {
    no(exercise.options === undefined, 'options on an exercise that is not choose-design');
    const wrong = exercise.wrongAnswers ?? [];
    no(wrong.length > 0, 'no wrong answer to try');
    for (const [index, changes] of wrong.entries()) {
      const outcome = await run(`wrong answer ${index + 1}`, changes);
      no(!outcome.passed, `wrong answer ${index + 1} passes`);
    }
  }

  // --- Text ---
  const texts: [string, Localised | undefined][] = [
    ['title', exercise.title],
    ['brief', exercise.brief],
    ...exercise.hints.map((hint): [string, Localised] => [`hint ${hint.tier}`, hint.text]),
    ...exercise.checks.map((check): [string, Localised | undefined] => [
      `label of check ${check.id}`,
      exercise.checkLabels?.[check.id],
    ]),
    ...(exercise.options ?? []).flatMap((option): [string, Localised | undefined][] => [
      [`label of option ${option.id}`, option.label],
      [`explanation of option ${option.id}`, option.explain],
    ]),
    ...exercise.start.nodes.map((node): [string, Localised | undefined] => [
      `name of ${node.id}`,
      exercise.nodeLabels?.[node.id],
    ]),
  ];
  for (const [what, text] of texts) {
    if (!text || text.en.trim() === '' || text.ja.trim() === '') {
      no(false, `${what} is missing in a language`);
      continue;
    }
    no(JAPANESE.test(text.ja), `${what}: the Japanese has no Japanese characters`);
    no(!LEFTOVER.test(text.en) && !LEFTOVER.test(text.ja), `${what}: a placeholder is left over`);
    if (exercise.level === 1) {
      for (const word of LEVEL_1_BANNED.ja)
        no(!text.ja.includes(word), `${what}: says 「${word}」`);
      for (const word of LEVEL_1_BANNED.en) {
        no(!text.en.toLowerCase().includes(word), `${what}: says "${word}"`);
      }
    }
  }
  no(
    exercise.hints.map((hint) => hint.tier).join() === '1,2,3',
    'the hints are not tiers 1, 2 and 3',
  );
  no(new Set(exercise.hints.map((hint) => hint.text.ja)).size === 3, 'two hints say the same');
  const labels = Object.values(exercise.nodeLabels ?? {});
  no(
    labels.some((label) => exercise.brief.ja.includes(label.ja)),
    'the Japanese brief names no device of the topology',
  );
  no(
    labels.some((label) => exercise.brief.en.toLowerCase().includes(label.en.toLowerCase())),
    'the English brief names no device of the topology',
  );
  no(
    exercise.start.nodes.every((node) => node.data.label === exercise.nodeLabels?.[node.id]?.ja),
    'a device on the canvas is not named as in nodeLabels',
  );
  no(
    new Set(exercise.start.nodes.map((node) => node.data.label)).size ===
      exercise.start.nodes.length,
    'two devices have one name',
  );

  // --- Lessons ---
  no(exercise.lessons.length > 0, 'no lesson');
  for (const lesson of exercise.lessons) {
    no(ROUTES.includes(`path="${lesson}"`), `lesson ${lesson} is not a route in demo/main.tsx`);
  }
  return problems;
}

describe(`every template, seeds 0 to ${SEED_COUNT - 1} and 1000 to 1003`, () => {
  it.each(TEMPLATES.map((template) => [template.id, template] as const))(
    '%s',
    async (_, template) => {
      const problems: string[] = [];
      const instances: Exercise[] = [];
      for (const seed of SEEDS) {
        const exercise = template.generate(seed);
        instances.push(exercise);

        // Determinism and identity.
        if (JSON.stringify(template.generate(seed)) !== JSON.stringify(exercise)) {
          problems.push(`${exercise.id}: generating twice gives two different exercises`);
        }
        if (
          exercise.id !== `${template.id}~${seed}` ||
          exercise.templateId !== template.id ||
          exercise.seed !== seed ||
          exercise.level !== template.level ||
          exercise.kind !== template.kind ||
          exercise.generatorVersion !== template.generatorVersion
        ) {
          problems.push(`${exercise.id}: id, seed, level or kind do not match the template`);
        }
        problems.push(...(await problemsOf(exercise)));
      }

      // Distinctness: the seed must change the task, not only the numbers.
      if (new Set(instances.map((exercise) => exercise.fingerprint)).size < 2) {
        problems.push(`${template.id}: every instance has the same fingerprint`);
      }
      const looks = new Map<string, string>();
      const twins: string[] = [];
      for (const exercise of instances) {
        const look = `${exercise.brief.ja}\n${JSON.stringify(exercise.start)}`;
        const twin = looks.get(look);
        if (twin !== undefined) twins.push(`${twin} = ${exercise.id}`);
        else looks.set(look, exercise.id);
      }
      // Twins are allowed (the pool skips them), but not many: a template whose
      // seeds mostly repeat has too little variation to be worth a pool.
      if (twins.length > instances.length / 2) {
        problems.push(`${template.id}: ${twins.length} of ${instances.length} instances are twins`);
      }

      expect(template.title.en).not.toBe('');
      expect(template.title.ja).toMatch(JAPANESE);
      expect(problems).toEqual([]);
    },
    600_000,
  );
});

describe('pools', () => {
  it.each([1, 2] as const)('level %i: at least 100 ids, unique, all of them generate', (level) => {
    const pool = buildPool(level);
    expect(pool.length).toBeGreaterThanOrEqual(100);
    expect(new Set(pool).size).toBe(pool.length);
    expect(buildPool(level)).toEqual(pool);

    const exercises = pool.map((id) => exerciseById(id));
    expect(exercises.every((exercise) => exercise?.level === level)).toBe(true);
    // Every pool instance is one the 100-seed run verifies.
    expect(exercises.every((exercise) => (exercise?.seed ?? POOL_SEEDS) < POOL_SEEDS)).toBe(true);
    // No two pool instances read the same and look the same.
    const looks = exercises.map(
      (exercise) => `${exercise?.brief.ja}\n${JSON.stringify(exercise?.start)}`,
    );
    expect(new Set(looks).size).toBe(pool.length);

    // The templates take turns, and different tasks come before repeats.
    const templates = TEMPLATES.filter((template) => template.level === level);
    expect(pool.slice(0, templates.length).map((id) => exerciseById(id)?.templateId)).toEqual(
      templates.map((template) => template.id),
    );
    const fingerprints = new Set(exercises.map((exercise) => exercise?.fingerprint));
    console.log(
      `level ${level}: pool ${pool.length}, distinct fingerprints ${fingerprints.size}, per template ` +
        templates
          .map((template) => {
            const own = exercises.filter((exercise) => exercise?.templateId === template.id);
            return `${template.id} ${own.length}/${new Set(own.map((e) => e?.fingerprint)).size}`;
          })
          .join(', '),
    );
  });

  it.each([3, 4] as const)(
    'level %i has no templates yet: an empty pool, not an error',
    (level) => {
      expect(buildPool(level as ExerciseLevel)).toEqual([]);
      expect(nextExerciseId(level, {})).toBeUndefined();
    },
  );

  it('looks an exercise up by id, and refuses ids that are not one', () => {
    expect(exerciseById('l1-host-address~7')).toEqual(generateExercise('l1-host-address', 7));
    expect(exerciseById('l1-host-address~7')?.id).toBe('l1-host-address~7');
    expect(templateById('l1-host-address')?.level).toBe(1);
    for (const id of [
      '',
      'l1-host-address',
      'l1-host-address~',
      'l1-host-address~x',
      'nothing~1',
      '~3',
      'l1-host-address~-1',
      'l1-host-address~1.5',
    ]) {
      expect(exerciseById(id)).toBeUndefined();
    }
    expect(generateExercise('l1-host-address', -1)).toBeUndefined();
    expect(templateById('nothing')).toBeUndefined();
  });

  it('the next exercise is unseen, and not of the template just done while another has one left', () => {
    const pool = buildPool(1);
    const first = nextExerciseId(1, {});
    expect(first).toBe(pool[0]);

    // Walk the whole pool the way the page does.
    const seen: string[] = [];
    const recent: string[] = [];
    for (;;) {
      const next = nextExerciseId(1, { seenIds: seen, avoidTemplateIds: recent.slice(-1) });
      if (next === undefined) break;
      expect(seen).not.toContain(next);
      const templateId = exerciseById(next)?.templateId ?? '';
      const othersLeft = pool.some(
        (id) => !seen.includes(id) && exerciseById(id)?.templateId !== recent[recent.length - 1],
      );
      if (othersLeft) expect(templateId).not.toBe(recent[recent.length - 1]);
      seen.push(next);
      recent.push(templateId);
    }
    expect(seen).toHaveLength(pool.length);

    // Several templates to avoid: one outside all of them is preferred.
    const avoid = ['l1-host-address', 'l1-host-blank', 'l1-cable-off'];
    const picked = exerciseById(nextExerciseId(1, { avoidTemplateIds: avoid }) ?? '');
    expect(avoid).not.toContain(picked?.templateId);
  });
});
