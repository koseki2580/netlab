/**
 * "Point first" exercises (`Exercise.pickFirst`): what the learner points at,
 * as a key. A device by its node id; a side of a router (or a port) as
 * `node:side`, where two of the things to choose among are on one device.
 */

import type { Exercise, SettingRef } from './types';

export type PickBy = NonNullable<NonNullable<Exercise['pickFirst']>['by']>;

/** The key of the thing this setting belongs to; null for a cable, which is not pointed at. */
export function pickKey(ref: SettingRef, by: PickBy = 'device'): string | null {
  if (ref.kind === 'link-state') return null;
  if (by === 'device') return ref.nodeId;
  const side = 'ifaceId' in ref ? ref.ifaceId : 'portId' in ref ? ref.portId : '';
  return `${ref.nodeId}:${side}`;
}
