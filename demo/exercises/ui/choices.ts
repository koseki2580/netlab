/**
 * What an exercise offers to press: per setting, the values one press can set
 * (address chips, a cable switch, a dropdown), in the order the page shows
 * them. The form draws its chips from here, and the verification harness
 * presses its way through the same list, so "a learner who only presses"
 * is tested on exactly what the page offers.
 *
 * Typed fields (a route, an ACL line, a VLAN number) are not presses.
 */

import { readSetting } from '../model/settings';
import type { DesignOption, Exercise, SettingChange, SettingRef } from '../model/types';
import { inAttemptOrder, type AttemptOrder } from './attemptOrder';
import { hostCandidates, ifaceCandidates } from './candidates';
import { settingTestId } from './describe';
import { settingOrder } from './settingOrder';

export interface Press {
  readonly change: SettingChange;
  /**
   * The press the control is built around: the address that fits, or plugging
   * in a cable that is out. Whether the exercise passes with it is the
   * grader's business; this only says the press is not a planted mistake.
   * `null` where the page cannot tell (a priority out of sixteen).
   */
  readonly sound: boolean | null;
}

export interface PressCard {
  readonly ref: SettingRef;
  /** Address chips, in the order shown; empty for a setting without chips. */
  readonly chips: readonly string[];
  readonly presses: readonly Press[];
}

type ChoiceExercise = Pick<Exercise, 'id' | 'level' | 'allowed' | 'start'>;

const PREFIX_LENGTHS = [8, 16, 24, 25, 26, 27, 28, 30];
const STP_PRIORITIES = Array.from({ length: 16 }, (_, index) => index * 4096);

export { PREFIX_LENGTHS, STP_PRIORITIES };

/** The cards of an exercise's form with what each offers to press, in the order of the attempt. */
export function pressCards(exercise: ChoiceExercise, order: AttemptOrder): PressCard[] {
  const plain = exercise.level <= 2;
  return settingOrder(exercise.allowed, exercise.start).flatMap((ref): PressCard[] => {
    const value = readSetting(exercise.start, ref);
    if (value === null) return [];
    const key = settingTestId(ref);
    const salt = `${exercise.id}|${key}`;
    switch (value.kind) {
      case 'host-ip': {
        const parts = plain ? hostCandidates(exercise.start, value.nodeId, salt) : null;
        if (parts === null) return [{ ref, chips: [], presses: [] }];
        const chips = inAttemptOrder(parts.right, parts.wrong, order, key);
        return [
          {
            ref,
            chips,
            presses: chips.map((ip) => ({ change: { ...value, ip }, sound: ip === parts.right })),
          },
        ];
      }
      case 'iface-address': {
        const addressOnly = ref.kind === 'iface-address' && ref.addressOnly === true;
        const parts = plain
          ? ifaceCandidates(exercise.start, value.nodeId, value.ifaceId, salt)
          : null;
        const chips = parts ? inAttemptOrder(parts.right, parts.wrong, order, key) : [];
        return [
          {
            ref,
            chips,
            presses: [
              ...chips.map((ipAddress) => ({
                change: { ...value, ipAddress },
                sound: ipAddress === parts?.right,
              })),
              ...(addressOnly
                ? []
                : PREFIX_LENGTHS.filter((length) => length !== value.prefixLength).map(
                    (prefixLength) => ({ change: { ...value, prefixLength }, sound: false }),
                  )),
            ],
          },
        ];
      }
      case 'link-state':
        return [
          {
            ref,
            chips: [],
            presses: [
              {
                change: { ...value, state: value.state === 'up' ? 'down' : 'up' },
                sound: value.state === 'down',
              },
            ],
          },
        ];
      case 'port-vlan': {
        if (ref.kind === 'port-vlan' && ref.fixedMode === true) {
          return [{ ref, chips: [], presses: [] }];
        }
        const { kind, nodeId, portId } = value;
        const flipped: SettingChange =
          value.vlanMode === 'access'
            ? {
                kind,
                nodeId,
                portId,
                vlanMode: 'trunk',
                trunkAllowedVlans: [value.accessVlan ?? 1],
              }
            : {
                kind,
                nodeId,
                portId,
                vlanMode: 'access',
                accessVlan: value.trunkAllowedVlans?.[0] ?? 1,
              };
        return [{ ref, chips: [], presses: [{ change: flipped, sound: false }] }];
      }
      case 'stp-priority':
        return [
          {
            ref,
            chips: [],
            presses: STP_PRIORITIES.filter((priority) => priority !== value.priority).map(
              (priority) => ({ change: { ...value, priority }, sound: null }),
            ),
          },
        ];
      case 'stp-port':
        return [
          {
            ref,
            chips: [],
            presses: [{ change: { ...value, enabled: !value.enabled }, sound: !value.enabled }],
          },
        ];
      default:
        return [{ ref, chips: [], presses: [] }];
    }
  });
}

/**
 * The designs of a choose-a-design exercise in the order of the attempt: the
 * design of the reference solution at the attempt's place, the others shuffled.
 */
export function orderedOptions(
  exercise: Pick<Exercise, 'options' | 'reference'>,
  order: AttemptOrder,
): readonly DesignOption[] {
  const options = exercise.options ?? [];
  const reference = JSON.stringify(exercise.reference);
  const right = options.find((option) => JSON.stringify(option.changes) === reference);
  if (!right) return options;
  return inAttemptOrder(
    right,
    options.filter((option) => option !== right),
    order,
    'options',
  );
}
