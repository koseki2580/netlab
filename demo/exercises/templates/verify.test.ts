// @vitest-environment node
/**
 * Every template, on the real simulator: the start state fails, the reference
 * passes, natural wrong answers fail, the text is complete in both languages,
 * and the pools hold at least a hundred distinct instances.
 *
 * Seeds 0 to N-1 (N = `EXERCISE_VERIFY_SEEDS`, 12 by default; 100 verifies every
 * instance a pool can hold), plus seed block B of the study cycle (1000 to 1003).
 * TC-467 to TC-477, TC-561 and TC-562 in the specification; each part below
 * names its own.
 */

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gradeExercise } from '../grade/gradeExercise';
import { applyChangesReporting, differsOutside, isAllowed, readSetting } from '../model/settings';
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
import { portName, sideName } from '../ui/describe';
import { refOf } from './shared/exercise';
import { labelFits, labelLines } from './shared/labelFit';
import { PLACES } from './shared/places';

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

/** `value` as a whole number or address in `text`: 10 is not found in 10.5.0.1, nor in 110. */
function says(text: string, value: string | number): boolean {
  const escaped = String(value).replace(/[.\\/]/g, '\\$&');
  return new RegExp(`(^|[^0-9.])${escaped}(?![0-9]|\\.[0-9])`).test(text);
}

/**
 * TC-562 — the values in the reference that a learner could copy out of the
 * brief instead of finding them: for each change that sets an address, a VLAN
 * or a route, the value that is by itself the whole answer to that setting.
 * A route is two values (where to, and whom to hand it to); it counts as given
 * only when the brief states both.
 */
function answersIn(brief: string, exercise: Exercise): string[] {
  const found: string[] = [];
  for (const change of exercise.reference) {
    const before = readSetting(exercise.start, refOf(change));
    switch (change.kind) {
      case 'host-ip':
        if (change.ip !== null && says(brief, change.ip)) found.push(change.ip);
        break;
      case 'iface-address':
        if (says(brief, change.ipAddress)) found.push(change.ipAddress);
        break;
      case 'port-vlan': {
        const vlans =
          change.vlanMode === 'access'
            ? [change.accessVlan ?? 1]
            : (change.trunkAllowedVlans ?? []);
        if (vlans.length > 0 && vlans.every((vlan) => says(brief, vlan))) {
          found.push(`VLAN ${vlans.join(', ')}`);
        }
        break;
      }
      case 'static-routes': {
        const had = before?.kind === 'static-routes' ? before.routes : [];
        for (const route of change.routes) {
          const isNew = !had.some(
            (old) => old.destination === route.destination && old.nextHop === route.nextHop,
          );
          if (isNew && says(brief, route.destination) && says(brief, route.nextHop)) {
            found.push(`${route.destination} via ${route.nextHop}`);
          }
        }
        break;
      }
      default:
        break;
    }
  }
  return found;
}

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

  // --- TC-467: the simulator decides ---
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

  // --- TC-468: options (choose-a-design), TC-467: wrong answers ---
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

  // --- TC-469: text ---
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
  no(
    new Set(labels.map((label) => label.en)).size === labels.length,
    'two devices have one English name',
  );
  // TC-476: a name that does not fit its box on the diagram is cut off there.
  for (const label of labels) {
    no(labelFits(label.ja), `「${label.ja}」 does not fit a device box on the diagram`);
    no(labelFits(label.en), `"${label.en}" does not fit a device box on the diagram`);
  }

  // TC-477: a hint never names a port or a router side by its bare id (`p1`,
  // `lan`): it uses the words the settings form puts on that setting.
  for (const locale of ['en', 'ja'] as const) {
    const named = localiseExercise(exercise, locale).start;
    const ids: [string, string][] = named.nodes.flatMap((node) => [
      ...(node.data.ports ?? []).map((port): [string, string] => [
        port.id,
        portName(named, node.id, port.id)[locale],
      ]),
      ...(node.data.interfaces ?? []).map((side): [string, string] => [
        side.id,
        sideName(named, node.id, side.id)[locale],
      ]),
    ]);
    for (const hint of exercise.hints) {
      // What is left of the hint once every form name is taken out of it.
      const rest = ids.reduce((text, [, name]) => text.split(name).join(' '), hint.text[locale]);
      for (const id of new Set(ids.map(([id]) => id))) {
        const bare = new RegExp(`(^|[^A-Za-z0-9'’-])${id}([^A-Za-z0-9'’-]|$)`);
        no(!bare.test(rest), `hint ${hint.tier} (${locale}) names "${id}" by its bare id`);
      }
    }
  }

  // --- TC-562: the brief does not hand over the answer ---
  if (exercise.kind !== 'choose-design') {
    for (const locale of ['en', 'ja'] as const) {
      const given = answersIn(exercise.brief[locale], exercise);
      if (exercise.answerInBrief === undefined) {
        no(
          given.length === 0,
          `the brief (${locale}) states the answer: ${given.join('; ')}. Say the goal and the symptom, or set answerInBrief with the reason`,
        );
      }
    }
    if (exercise.answerInBrief !== undefined) {
      no(exercise.answerInBrief.trim().length >= 20, 'answerInBrief gives no reason');
      no(
        answersIn(exercise.brief.ja, exercise).length > 0,
        'answerInBrief is set, but the brief does not state the answer: remove it',
      );
    }
  }

  // --- TC-557: an unplugged cable is what the learner is told ---
  if (exercise.templateId === 'l1-cable-off') {
    const [fix] = exercise.reference;
    for (const result of atStart.results.filter((entry) => !entry.passed)) {
      no(
        result.evidence?.diagnosis === 'cable-down' &&
          fix?.kind === 'link-state' &&
          result.evidence.edgeId === fix.edgeId,
        `check ${result.checkId} fails at the start without pointing at the unplugged cable`,
      );
    }
  }

  // --- TC-469: lessons ---
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

        // TC-470: determinism and identity.
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

      // TC-471: distinctness. The seed must change the task, not only the numbers.
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

// TC-562
describe('the rule against a brief that hands over the answer', () => {
  it('finds a value only as a whole number or address', () => {
    expect(says('先生が VLAN 10、生徒が VLAN 20 です', 10)).toBe(true);
    expect(says('put them in VLAN 10. Then press Check', 10)).toBe(true);
    expect(says('アドレスは「10.5.0.1/16」です', 10)).toBe(false);
    expect(says('VLAN 110 です', 10)).toBe(false);
    expect(says('「192.168.1.50」にします', '192.168.1.50')).toBe(true);
    expect(says('192.168.1.50/24', '192.168.1.50')).toBe(true);
    expect(says('「192.168.1.5」', '192.168.1.50')).toBe(false);
    expect(says('「192.168.1.」で始まります', '192.168.1.50')).toBe(false);
  });

  it('catches a brief that states the address, the VLAN or the whole route of the reference', () => {
    const withBrief = (exercise: Exercise, more: string): Exercise => ({
      ...exercise,
      brief: { en: `${exercise.brief.en} ${more}`, ja: `${exercise.brief.ja}${more}` },
    });
    const cases: [string, (exercise: Exercise) => string][] = [
      [
        'l1-host-address',
        (e) => (e.reference[0]?.kind === 'host-ip' ? `${e.reference[0].ip}` : ''),
      ],
      [
        'l1-router-address',
        (e) => (e.reference[0]?.kind === 'iface-address' ? e.reference[0].ipAddress : ''),
      ],
      [
        'l2-vlan-access',
        (e) => (e.reference[0]?.kind === 'port-vlan' ? `VLAN ${e.reference[0].accessVlan}` : ''),
      ],
      [
        'l2-trunk-allowed',
        (e) =>
          e.reference[0]?.kind === 'port-vlan'
            ? (e.reference[0].trunkAllowedVlans ?? []).join(' と ')
            : '',
      ],
    ];
    for (const [templateId, answer] of cases) {
      const exercise = generateExercise(templateId, 3);
      if (!exercise) throw new Error(`no ${templateId}`);
      expect(answer(exercise)).not.toBe('');
      expect(answersIn(exercise.brief.ja, exercise)).toEqual([]);
      expect(answersIn(withBrief(exercise, answer(exercise)).brief.ja, exercise)).toHaveLength(1);
    }

    // A route: the destination alone is half an answer, the next router completes it.
    const routed = generateExercise('l2-static-missing', 3);
    if (!routed) throw new Error('no l2-static-missing');
    const [fix] = routed.reference;
    if (fix?.kind !== 'static-routes') throw new Error('the fix is not a route');
    const before = readSetting(routed.start, refOf(fix));
    const added = fix.routes.find(
      (route) =>
        before?.kind !== 'static-routes' ||
        !before.routes.some((old) => old.destination === route.destination),
    );
    if (!added) throw new Error('no added route');
    expect(says(routed.brief.ja, added.destination)).toBe(true);
    expect(answersIn(routed.brief.ja, routed)).toEqual([]);
    expect(answersIn(`${routed.brief.ja}${added.nextHop}`, routed)).toHaveLength(1);
  });
});

/** TC-476 — every device name a template can draw, not only the ones these seeds drew. */
describe('device names', () => {
  it('a label takes one or two lines of a device box: six kana or ten letters to a line', () => {
    expect(labelLines('レジ')).toBe(1);
    expect(labelLines('教室のパソコン')).toBe(2);
    expect(labelLines('看護師用の新しいパソコン')).toBe(2);
    expect(labelLines('ポスター印刷用の大きなプリンタ')).toBe(3);
    // A line does not start with a long-vowel mark: 「ター」 moves down together.
    expect(labelLines('データセンターのルータ')).toBe(2);
    expect(labelLines('Till')).toBe(1);
    expect(labelLines('Living-room PC')).toBe(2);
    expect(labelLines('Teaching-materials server')).toBe(3);
    // A word longer than a line cannot be broken anywhere a reader expects.
    expect(labelFits('Consulting-room PC')).toBe(false);
    expect(labelFits('Exam-room PC')).toBe(true);
  });

  it('every device name of every place fits a device box, in both languages', () => {
    const tooLong: string[] = [];
    for (const place of PLACES) {
      const names = [
        ...place.pcs,
        place.newPc,
        place.server,
        place.server2,
        place.server3,
        place.printer,
        place.router,
        place.lanSwitch,
        place.backSwitch,
        place.farSwitch,
        place.spareSwitch,
        ...place.groups.flatMap((group) => group.members),
        ...place.switches,
        place.sites.mid.router,
        ...[place.sites.near, place.sites.far, place.sites.far2, place.sites.far3].flatMap(
          (site) => [site.router, site.device],
        ),
      ];
      for (const name of names) {
        const en = `${name.en.charAt(0).toUpperCase()}${name.en.slice(1)}`;
        if (!labelFits(name.ja)) tooLong.push(`${place.id}: ${name.ja}`);
        if (!labelFits(en)) tooLong.push(`${place.id}: ${en}`);
      }
    }
    expect([...new Set(tooLong)]).toEqual([]);
  });
});

describe('pools', () => {
  // TC-472
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

  // TC-561
  it.each(TEMPLATES.filter((template) => template.kind === 'choose-design'))(
    '$id: over the pool, the option that works is in no place more than 40% of the time',
    (template) => {
      const own = buildPool(template.level)
        .map((id) => exerciseById(id))
        .filter((exercise) => exercise?.templateId === template.id);
      expect(own.length).toBeGreaterThanOrEqual(8);
      const places = new Map<number, number>();
      for (const exercise of own) {
        const place = (exercise?.options ?? []).findIndex(
          (option) => JSON.stringify(option.changes) === JSON.stringify(exercise?.reference),
        );
        expect(place).not.toBe(-1);
        places.set(place, (places.get(place) ?? 0) + 1);
      }
      const shares = [...places.entries()].map(
        ([place, count]) => [place, count / own.length] as const,
      );
      console.log(
        `${template.id}: the option that works, by place: ` +
          shares.map(([place, share]) => `${place + 1}: ${Math.round(share * 100)}%`).join(', '),
      );
      for (const [, share] of shares) expect(share).toBeLessThanOrEqual(0.4);
    },
  );

  // TC-561
  it('l1-which-pc: over the pool, the PC with the bad address is the first PC no more than 40% of the time', () => {
    const own = buildPool(1)
      .map((id) => exerciseById(id))
      .filter((exercise) => exercise?.templateId === 'l1-which-pc');
    expect(own.length).toBeGreaterThanOrEqual(8);
    const first = own.filter((exercise) => {
      const [fix] = exercise?.reference ?? [];
      const firstPc = exercise?.start.nodes.find((node) => node.data.role === 'client');
      return fix?.kind === 'host-ip' && fix.nodeId === firstPc?.id;
    });
    expect(first.length / own.length).toBeLessThanOrEqual(0.4);
    // And it is not always the same one of the other two either.
    const byDevice = new Set(
      own.map((exercise) => {
        const [fix] = exercise?.reference ?? [];
        return fix?.kind === 'host-ip' ? fix.nodeId : '';
      }),
    );
    expect(byDevice.size).toBe(3);
  });

  // TC-561
  it.each(TEMPLATES.filter((template) => template.kind !== 'choose-design'))(
    '$id: where several devices may be changed, the one to fix is not always the first of them',
    (template) => {
      const own = buildPool(template.level)
        .map((id) => exerciseById(id))
        .filter((exercise) => exercise?.templateId === template.id);
      // Instances with one device to fix among several that may be changed.
      const places: number[] = [];
      for (const exercise of own) {
        if (!exercise) continue;
        const nodeOf = (ref: { readonly kind: string }): string | undefined =>
          'nodeId' in ref && typeof ref.nodeId === 'string' ? ref.nodeId : undefined;
        const fixed = new Set(exercise.reference.map(nodeOf));
        const candidates = exercise.start.nodes
          .map((node) => node.id)
          .filter((id) => exercise.allowed.some((ref) => nodeOf(ref) === id));
        const [only] = [...fixed];
        if (fixed.size !== 1 || only === undefined || candidates.length < 2) continue;
        places.push(candidates.indexOf(only));
      }
      if (places.length === 0) return;
      expect(places.every((place) => place === 0)).toBe(false);
    },
  );

  // TC-473
  it.each([3, 4] as const)(
    'level %i has no templates yet: an empty pool, not an error',
    (level) => {
      expect(buildPool(level as ExerciseLevel)).toEqual([]);
      expect(nextExerciseId(level, {})).toBeUndefined();
    },
  );

  // TC-474
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

  // TC-475
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
