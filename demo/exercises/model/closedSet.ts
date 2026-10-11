/**
 * How many Checks a clean solve may take.
 *
 * Where the answer is one of a few things to press (address chips, a cable
 * switch, up to six designs), a second Check is the second guess of a learner
 * who presses without reading: with four chips and two Checks, half of all
 * blind guesses were "solved". There a solve counts on the first Check only.
 * Where the answer is typed or built (a route, an ACL line, a VLAN number, a
 * priority out of sixteen), a slip is not a guess, and two Checks count.
 */

import type { Exercise, SettingRef } from './types';

/** The most options a choose-a-design exercise may have and still be "a few things to press". */
export const CLOSED_SET_MAX = 6;

type Judged = Pick<Exercise, 'level' | 'allowed' | 'options'>;

/** Whether the form offers this setting as presses alone need: chips, a switch, a short dropdown. */
function isPressed(ref: SettingRef, level: Exercise['level']): boolean {
  switch (ref.kind) {
    case 'link-state':
    case 'stp-port':
    case 'iface-nat':
      return true;
    case 'host-ip':
      return level <= 2;
    case 'iface-address':
      return level <= 2 && ref.addressOnly === true;
    default:
      return false;
  }
}

/** Whether the exercise is answered by pressing one of a small closed set. */
export function isClosedSet(exercise: Judged): boolean {
  if (exercise.options) return exercise.options.length <= CLOSED_SET_MAX;
  return (
    exercise.allowed.length > 0 && exercise.allowed.every((ref) => isPressed(ref, exercise.level))
  );
}

export function checksToCount(exercise: Judged): 1 | 2 {
  return isClosedSet(exercise) ? 1 : 2;
}
