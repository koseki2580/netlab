/**
 * The classic mistakes of a fragment statement, made on an exercise's
 * reference, with the result code the judge must tell each by. For the
 * verification harness and the judge's tests; never shown to a learner.
 */

import type { FragmentExercise, FragmentRow } from './model';

/** The classic mistakes, made on the reference, with the code each must be recognised by. */
export function classicMistakes(
  exercise: FragmentExercise,
): { note: string; rows: FragmentRow[]; code: string }[] {
  const ref = exercise.reference;
  const transport = exercise.packet.carries === 'tcp' ? 20 : 8;
  const room = Math.floor((exercise.mtu - 20) / 8) * 8;
  const redo = (carry: number, per: number, header: number) => {
    const rows: FragmentRow[] = [];
    for (let done = 0; done < carry; done += per) {
      const take = Math.min(per, carry - done);
      rows.push({
        size: take + header,
        ...(exercise.asks.offsets
          ? { offset: exercise.offsetUnit === 'bytes' ? done : done / 8 }
          : {}),
        ...(exercise.asks.flags ? { mf: done + take < carry } : {}),
      });
    }
    return rows;
  };
  const same = (rows: FragmentRow[]) => JSON.stringify(rows) === JSON.stringify(ref);
  const list: { note: string; rows: FragmentRow[]; code: string }[] = [
    {
      note: 'IP header forgotten',
      rows: ref.map((row) => ({ ...row, size: row.size - 20 })),
      code: 'ip-header-forgotten',
    },
    {
      note: 'transport header forgotten',
      rows: redo(exercise.payloadBytes, room, 20),
      code: 'transport-header-forgotten',
    },
  ];
  if ((exercise.mtu - 20) % 8 !== 0) {
    list.push({
      note: 'not a multiple of 8',
      rows: redo(exercise.payloadBytes + transport, exercise.mtu - 20, 20),
      code: 'not-multiple-of-8',
    });
  }
  if (exercise.asks.offsets) {
    const wrongUnit = exercise.offsetUnit === 'bytes' ? 1 / 8 : 8;
    list.push({
      note: 'offsets in the other unit',
      rows: ref.map((row) => ({ ...row, offset: (row.offset ?? 0) * wrongUnit })),
      code: exercise.offsetUnit === 'bytes' ? 'offsets-in-units' : 'offsets-in-bytes',
    });
  }
  if (exercise.asks.flags) {
    list.push({
      note: 'MF on the last',
      rows: ref.map((row) => ({ ...row, mf: true })),
      code: 'mf-on-last',
    });
    if (ref.length > 2) {
      list.push({
        note: 'MF cleared on a middle piece',
        rows: ref.map((row, index) => (index === 1 ? { ...row, mf: false } : row)),
        code: 'mf-cleared-middle',
      });
    }
  }
  list.push({ note: 'one piece too few', rows: ref.slice(1), code: 'wrong-count' });
  return list.filter((entry) => !same(entry.rows));
}
