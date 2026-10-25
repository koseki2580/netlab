// @vitest-environment node
/**
 * Every packet template, over seeds 0 to N-1 (`EXERCISE_VERIFY_SEEDS`,
 * default 12), judged by the real judge on the real simulator, in the manner
 * of `demo/exercises/templates/verify.test.ts`:
 *
 * - the packet as given fails, the reference passes;
 * - natural wrong answers fail, each with its own cause;
 * - a value copied from the task or rule line does not pass, and fields outside
 *   the form change nothing;
 * - the text: one-line task and rule without the answer, both languages filled;
 * - and the checks every template family passes (determinism, fingerprints,
 *   pools, blind picks), from the shared harness
 *   (`demo/exercises/verify/harness.ts`).
 *
 * TC ids are not allocated yet: the specification is outside this folder.
 */

import { describe, expect, it } from 'vitest';
import { isLessonRoute, SEED_COUNT, SEEDS, verifyFamily } from '../exercises/verify/harness';
import { judgeBuild, judgeFragment, judgeRead, engineSplit, truthOf } from './judge';
import type {
  BuildExercise,
  BuildPart,
  FieldId,
  FieldValue,
  FragmentExercise,
  PacketExercise,
  PacketValues,
  ReadExercise,
} from './model';
import { classicMistakes } from './mistakes';
import { TEMPLATES } from './templates';
import { PACKET_FAMILY } from './templates/family';

const JAPANESE = /[぀-ヿ一-鿿]/;
const PLACEHOLDER = /undefined|null|NaN|\[object|\$\{|\?\?/;

// --- Helpers ---------------------------------------------------------------------

const tokensOf = (text: string): string[] =>
  text.match(/[0-9a-f]{2}(?::[0-9a-f]{2}){5}|\d+(?:\.\d+){3}|\d+/gi) ?? [];

/** Values an answer consists of, as text, for "is it in the task line?". */
function answerValues(exercise: PacketExercise): string[] {
  switch (exercise.kind) {
    case 'build-packet':
      return Object.values(exercise.reference).map(String);
    case 'fragment':
      return [
        String(exercise.reference.length),
        ...exercise.reference.flatMap((row) => [
          String(row.size),
          ...(row.offset ? [String(row.offset)] : []),
        ]),
      ];
    case 'read-packet':
      return [
        ...Object.values(exercise.fix?.reference ?? {}).map(String),
        ...exercise.questions.map((question) => question.answer),
      ];
  }
}

function textProblems(exercise: PacketExercise): string[] {
  const problems: string[] = [];
  const no = (ok: boolean, what: string) => {
    if (!ok) problems.push(what);
  };
  const texts = [
    ['title', exercise.title],
    ['task', exercise.task],
    ['rule', exercise.rule],
    ['brief', exercise.brief],
    ...exercise.hints.map((hint) => [`hint ${hint.tier}`, hint.text] as const),
    ...goalLabels(exercise).map((label, index) => [`goal ${index}`, label] as const),
    ...(exercise.kind === 'read-packet'
      ? exercise.questions.map((question) => [`question ${question.id}`, question.prompt] as const)
      : []),
  ] as const;
  for (const [name, text] of texts) {
    no(text.en.trim() !== '' && text.ja.trim() !== '', `${name} is empty in a language`);
    no(JAPANESE.test(text.ja), `${name} has no Japanese in the Japanese`);
    no(!PLACEHOLDER.test(text.en) && !PLACEHOLDER.test(text.ja), `${name} has a placeholder left`);
  }
  no(exercise.hints.length === 3, 'not three hints');
  no(exercise.task.ja.length <= 70, `the task is ${exercise.task.ja.length} characters long`);
  no(
    /^ルール：/.test(exercise.rule.ja) && /^Rule: /.test(exercise.rule.en),
    'the rule does not start with "Rule:"',
  );
  no(exercise.rule.ja.length <= 90, `the rule is ${exercise.rule.ja.length} characters long`);
  for (const locale of ['en', 'ja'] as const) {
    const given = new Set(tokensOf(`${exercise.task[locale]} ${exercise.rule[locale]}`));
    const leaked = answerValues(exercise).filter((value) => given.has(value));
    no(leaked.length === 0, `the task or rule (${locale}) states the answer: ${leaked.join(', ')}`);
  }
  if (exercise.kind === 'read-packet') {
    for (const question of exercise.questions) {
      const right = question.candidates.find(
        (candidate) => String(candidate.value) === question.answer,
      );
      no(right !== undefined, `question ${question.id}: the answer is not a candidate`);
      if (right?.label && question.ask !== 'cause') {
        no(
          !exercise.task.ja.includes(right.label.ja),
          `the task names the answer to ${question.id}`,
        );
      }
    }
  }
  const labels = Object.values(exercise.nodeLabels);
  no(new Set(labels.map((label) => label.ja)).size === labels.length, 'two devices have one name');
  no(
    new Set(labels.map((label) => label.en)).size === labels.length,
    'two devices have one English name',
  );
  no(exercise.lessons.length > 0, 'no lesson');
  for (const lesson of exercise.lessons) {
    no(isLessonRoute(lesson), `lesson ${lesson} is not a route of the app`);
  }
  return problems;
}

function goalLabels(exercise: PacketExercise) {
  if (exercise.kind === 'build-packet') return exercise.goals.map((goal) => goal.label);
  if (exercise.kind === 'fragment') return exercise.goals.map((goal) => goal.label);
  return exercise.fix?.goals.map((goal) => goal.label) ?? [];
}

const NOT_IN_FORM: Readonly<Record<FieldId, FieldValue>> = {
  dstIp: '198.51.100.7',
  dstMac: 'ff:ff:ff:ff:ff:ff',
  ttl: 1,
  df: true,
  dstPort: 1,
  carries: 'udp',
  size: 9000,
};

/** Values for the fields outside the form, each one that would break the packet if it were applied. */
const outsideForm = (part: BuildPart): PacketValues =>
  Object.fromEntries(
    (Object.keys(NOT_IN_FORM) as FieldId[])
      .filter((id) => !part.fields.some((entry) => entry.id === id))
      .map((id) => [id, NOT_IN_FORM[id]]),
  );

/** Each token of the task and rule lines, put into each field that can take it. */
function copiedValues(exercise: PacketExercise, part: BuildPart): PacketValues[] {
  const tokens = tokensOf(
    `${exercise.task.ja} ${exercise.rule.ja} ${exercise.task.en} ${exercise.rule.en}`,
  );
  return part.fields.flatMap((entry) =>
    tokens.flatMap((token): PacketValues[] => {
      const kind = entry.input.kind;
      if (kind === 'address' && token.includes('.'))
        return [{ ...part.reference, [entry.id]: token }];
      if (kind === 'mac' && token.includes(':')) return [{ ...part.reference, [entry.id]: token }];
      if (kind === 'number' && /^\d+$/.test(token) && Number(token) !== part.reference[entry.id]) {
        return [{ ...part.reference, [entry.id]: Number(token) }];
      }
      return [];
    }),
  );
}

async function partProblems(
  exercise: PacketExercise,
  part: BuildPart,
  judge: (values: PacketValues) => Promise<{ passed: boolean; codes: string[] }>,
): Promise<string[]> {
  const problems: string[] = [];
  const given = await judge({});
  if (given.passed) problems.push('the packet as given passes');
  const reference = await judge(part.reference);
  if (!reference.passed) problems.push(`the reference fails: ${reference.codes.join(', ')}`);
  const outside = await judge({ ...part.reference, ...outsideForm(part) });
  if (!outside.passed) problems.push('a field outside the form changed the outcome');
  const outsideFromGiven = await judge(outsideForm(part));
  if (outsideFromGiven.passed) problems.push('fields outside the form made the given packet pass');
  for (const wrong of part.wrongAnswers ?? []) {
    const graded = await judge(wrong.values);
    if (graded.passed) problems.push(`wrong answer "${wrong.note}" passes`);
    else if (!graded.codes.includes(wrong.code)) {
      problems.push(
        `wrong answer "${wrong.note}" fails with ${graded.codes.join(', ')}, not ${wrong.code}`,
      );
    }
  }
  for (const values of copiedValues(exercise, part)) {
    if ((await judge(values)).passed)
      problems.push(`a value copied from the task passes: ${JSON.stringify(values)}`);
  }
  for (const entry of part.fields) {
    for (const candidate of entry.candidates ?? []) {
      const graded = await judge({ ...part.reference, [entry.id]: candidate.value });
      if (graded.passed !== (candidate.why === 'right')) {
        problems.push(
          `candidate ${String(candidate.value)} (${candidate.why}) ${graded.passed ? 'passes' : 'fails'}`,
        );
      }
    }
  }
  return problems;
}

const codesOf = (grade: { results: readonly { passed: boolean; code: string }[] }) =>
  grade.results.filter((entry) => !entry.passed).map((entry) => entry.code);

async function buildProblems(exercise: BuildExercise): Promise<string[]> {
  return partProblems(exercise, exercise, async (values) => {
    const grade = await judgeBuild(exercise, values);
    return { passed: grade.passed, codes: codesOf(grade) };
  });
}

async function exerciseProblems(exercise: PacketExercise): Promise<string[]> {
  const problems = textProblems(exercise);
  if (exercise.kind === 'build-packet') problems.push(...(await buildProblems(exercise)));
  if (exercise.kind === 'fragment') problems.push(...(await fragmentProblems(exercise)));
  if (exercise.kind === 'read-packet') problems.push(...(await readProblems(exercise)));
  return problems;
}

// --- fragment ----------------------------------------------------------------------

async function fragmentProblems(exercise: FragmentExercise): Promise<string[]> {
  const problems: string[] = [];
  const truth = await engineSplit(exercise);
  if (JSON.stringify(truth) !== JSON.stringify(exercise.reference)) {
    problems.push(`the reference is not the simulator's split: ${JSON.stringify(truth)}`);
  }
  if ((await judgeFragment(exercise, { rows: [] })).passed)
    problems.push('an empty statement passes');
  const reference = await judgeFragment(exercise, { rows: exercise.reference });
  if (!reference.passed) problems.push(`the reference fails: ${codesOf(reference).join(', ')}`);
  for (const mistake of classicMistakes(exercise)) {
    const graded = await judgeFragment(exercise, { rows: mistake.rows });
    if (graded.passed) problems.push(`mistake "${mistake.note}" passes`);
    else if (!codesOf(graded).includes(mistake.code)) {
      problems.push(
        `mistake "${mistake.note}" is told as ${codesOf(graded).join(', ')}, not ${mistake.code}`,
      );
    }
  }
  return problems;
}

// --- read-packet ---------------------------------------------------------------------

const rightPicks = (exercise: ReadExercise) =>
  Object.fromEntries(exercise.questions.map((question) => [question.id, question.answer]));

async function readProblems(exercise: ReadExercise): Promise<string[]> {
  const problems: string[] = [];
  for (const question of exercise.questions) {
    const truth = await truthOf(exercise, question);
    if (truth !== question.answer)
      problems.push(
        `question ${question.id}: the key says ${question.answer}, the simulator ${truth}`,
      );
    if (
      new Set(question.candidates.map((candidate) => candidate.value)).size !==
      question.candidates.length
    ) {
      problems.push(`question ${question.id}: two candidates are one`);
    }
    for (const candidate of question.candidates) {
      if ((String(candidate.value) === question.answer) !== (candidate.why === 'right')) {
        problems.push(
          `question ${question.id}: candidate ${String(candidate.value)} is marked ${candidate.why}`,
        );
      }
    }
  }
  const picks = rightPicks(exercise);
  const values = exercise.fix?.reference ?? {};
  const right = await judgeRead(exercise, { picks, values });
  if (!right.passed) problems.push(`the right answer fails: ${codesOf(right).join(', ')}`);
  for (const question of exercise.questions) {
    for (const candidate of question.candidates.filter((entry) => entry.why !== 'right')) {
      const graded = await judgeRead(exercise, {
        picks: { ...picks, [question.id]: String(candidate.value) },
        values,
      });
      if (graded.passed)
        problems.push(`question ${question.id}: ${String(candidate.value)} passes`);
    }
  }
  if (exercise.fix) {
    const fix = exercise.fix;
    problems.push(
      ...(await partProblems(exercise, fix, async (fixValues) => {
        const grade = await judgeRead(exercise, { picks, values: fixValues });
        return { passed: grade.passed, codes: codesOf(grade) };
      })),
    );
  }
  return problems;
}

// --- The tests ------------------------------------------------------------------------

describe(`every packet template, seeds 0 to ${SEED_COUNT - 1}`, () => {
  it.each(TEMPLATES.map((template) => [template.id, template] as const))(
    '%s: judged as intended, worded as required',
    async (_id, template) => {
      const found: string[] = [];
      for (const seed of SEEDS) {
        const exercise = template.generate(seed);
        for (const problem of await exerciseProblems(exercise))
          found.push(`seed ${seed}: ${problem}`);
      }
      expect(found).toEqual([]);
    },
    600_000,
  );
});

verifyFamily(PACKET_FAMILY);
