/**
 * What the learner has entered on a packet exercise, as the page holds it
 * (text as typed), and what it becomes for the judge.
 *
 * A box holding something that is not yet a value of its kind (a size "60a",
 * an empty row) is a draft: Check does not judge it, and the box says why, as
 * on the device exercises.
 */

import type {
  FieldId,
  FieldValue,
  FragmentRow,
  PacketExercise,
  PacketField,
  PacketGiven,
  PacketValues,
  ReadAnswer,
} from '../../packet-lab/model';
import { sizeOf, type PacketAnswer } from '../../packet-lab/judge';

/** Text for typed boxes, a value for flags, choices and candidates. */
export type Entered = Readonly<Partial<Record<FieldId, string | boolean>>>;

export interface FragmentDraft {
  readonly size: string;
  readonly offset: string;
  readonly mf: boolean;
}

export interface Draft {
  readonly values: Entered;
  readonly rows: readonly FragmentDraft[];
  readonly picks: Readonly<Record<string, string>>;
}

export const EMPTY_DRAFT: Draft = { values: {}, rows: [], picks: {} };

export const EMPTY_ROW: FragmentDraft = { size: '', offset: '', mf: false };

const WHOLE = /^\d+$/;

function valueOf(
  field: PacketField,
  entered: string | boolean | undefined,
): FieldValue | undefined {
  if (entered === undefined || entered === '') return undefined;
  if (typeof entered === 'boolean') return entered;
  const text = entered.trim();
  if (field.input.kind === 'number') return WHOLE.test(text) ? Number(text) : text;
  if (field.candidates?.some((candidate) => typeof candidate.value === 'number')) {
    return WHOLE.test(text) ? Number(text) : text;
  }
  return text;
}

/** The values to judge; a number box with something that is not a whole number stays text, which the judge refuses. */
export function valuesFor(fields: readonly PacketField[], entered: Entered): PacketValues {
  const values: Partial<Record<FieldId, FieldValue>> = {};
  for (const field of fields) {
    const value = valueOf(field, entered[field.id]);
    if (value !== undefined) values[field.id] = value;
  }
  return values;
}

/** The fields whose box holds text that is not a whole number where one is asked for. */
export function draftFields(fields: readonly PacketField[], entered: Entered): FieldId[] {
  return fields
    .filter((field) => {
      const text = entered[field.id];
      return (
        field.input.kind === 'number' &&
        typeof text === 'string' &&
        text.trim() !== '' &&
        !WHOLE.test(text.trim())
      );
    })
    .map((field) => field.id);
}

/** The rows of a fragment table that are not yet numbers (counted from 1). */
export function draftRows(exercise: PacketExercise, rows: readonly FragmentDraft[]): number[] {
  if (exercise.kind !== 'fragment') return [];
  return rows.flatMap((row, index) => {
    const bad =
      !WHOLE.test(row.size.trim()) || (exercise.asks.offsets && !WHOLE.test(row.offset.trim()));
    return bad ? [index + 1] : [];
  });
}

export function fragmentRows(
  exercise: PacketExercise,
  rows: readonly FragmentDraft[],
): FragmentRow[] {
  const asks = exercise.kind === 'fragment' ? exercise.asks : { offsets: false, flags: false };
  return rows.map((row) => ({
    size: Number(row.size.trim()),
    ...(asks.offsets ? { offset: Number(row.offset.trim()) } : {}),
    ...(asks.flags ? { mf: row.mf } : {}),
  }));
}

/** What the judge is given. */
export function answerFor(exercise: PacketExercise, draft: Draft): PacketAnswer {
  switch (exercise.kind) {
    case 'build-packet':
      return { kind: 'build-packet', values: valuesFor(exercise.fields, draft.values) };
    case 'fragment':
      return { kind: 'fragment', answer: { rows: fragmentRows(exercise, draft.rows) } };
    case 'read-packet': {
      const answer: ReadAnswer = {
        picks: draft.picks,
        ...(exercise.fix ? { values: valuesFor(exercise.fix.fields, draft.values) } : {}),
      };
      return { kind: 'read-packet', answer };
    }
  }
}

function editable(
  exercise: PacketExercise,
): { packet: PacketGiven; fields: readonly PacketField[] } | null {
  if (exercise.kind === 'build-packet') return { packet: exercise.packet, fields: exercise.fields };
  if (exercise.kind === 'read-packet' && exercise.fix && exercise.packets[0]) {
    return { packet: exercise.packets[0], fields: exercise.fix.fields };
  }
  return null;
}

/** The boxes as the exercise hands them over: each editable field holds the packet's value, or nothing. */
export function initialDraft(exercise: PacketExercise): Draft {
  const form = editable(exercise);
  if (!form) return EMPTY_DRAFT;
  const values: Partial<Record<FieldId, string | boolean>> = {};
  for (const field of form.fields) {
    const given = field.id === 'size' ? sizeOf(form.packet) : form.packet[field.id];
    if (given === null) continue;
    values[field.id] = typeof given === 'boolean' ? given : String(given);
  }
  return { ...EMPTY_DRAFT, values };
}

/** How many fields, rows or picks the learner has set: what the attempt record keeps. */
export function changedCount(exercise: PacketExercise, draft: Draft): number {
  if (exercise.kind === 'fragment') return draft.rows.length;
  const start = initialDraft(exercise).values;
  const fields = editable(exercise)?.fields ?? [];
  const changed = fields.filter((field) => {
    const now = draft.values[field.id];
    const before = start[field.id];
    return (
      (now === undefined ? '' : String(now).trim()) !== (before === undefined ? '' : String(before))
    );
  }).length;
  return changed + Object.keys(draft.picks).length;
}

/** The reference answer as the form holds it: what "show the answer" fills in. */
export function referenceDraft(exercise: PacketExercise): Draft {
  const asText = (values: PacketValues): Entered =>
    Object.fromEntries(
      Object.entries(values).map(([id, value]) => [
        id,
        typeof value === 'boolean' ? value : String(value),
      ]),
    );
  switch (exercise.kind) {
    case 'build-packet':
      return {
        ...EMPTY_DRAFT,
        values: { ...initialDraft(exercise).values, ...asText(exercise.reference) },
      };
    case 'fragment':
      return {
        ...EMPTY_DRAFT,
        rows: exercise.reference.map((row) => ({
          size: String(row.size),
          offset: row.offset === undefined ? '' : String(row.offset),
          mf: row.mf ?? false,
        })),
      };
    case 'read-packet':
      return {
        ...EMPTY_DRAFT,
        values: { ...initialDraft(exercise).values, ...asText(exercise.fix?.reference ?? {}) },
        picks: Object.fromEntries(
          exercise.questions.map((question) => [question.id, question.answer]),
        ),
      };
  }
}
