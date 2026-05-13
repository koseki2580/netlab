import { splitmix64 } from '../../../utils/prng';

export interface HiddenNodeTransmission {
  readonly stationId: string;
  readonly apReachable: boolean;
  readonly peerReachableStationIds: readonly string[];
}

export interface HiddenNodeCollisionInput {
  readonly apId: string;
  readonly transmissions: readonly HiddenNodeTransmission[];
}

export function deterministicBackoffSlot(
  stationId: string,
  contentionWindow: number,
  step: number,
): number {
  let seed = BigInt(step);
  for (const char of stationId) {
    seed = (seed * 31n + BigInt(char.charCodeAt(0))) & 0xffffffffffffffffn;
  }
  return Math.floor(splitmix64(seed)() * Math.max(1, contentionWindow));
}

export function detectHiddenNodeCollision(input: HiddenNodeCollisionInput): {
  collidedStationIds: string[];
} {
  void input.apId;
  const contenders = input.transmissions.filter((station) => station.apReachable);
  const collided = new Set<string>();

  for (let leftIndex = 0; leftIndex < contenders.length; leftIndex += 1) {
    const left = contenders[leftIndex]!;
    for (let rightIndex = leftIndex + 1; rightIndex < contenders.length; rightIndex += 1) {
      const right = contenders[rightIndex]!;
      const hidden =
        !left.peerReachableStationIds.includes(right.stationId) &&
        !right.peerReachableStationIds.includes(left.stationId);
      if (hidden) {
        collided.add(left.stationId);
        collided.add(right.stationId);
      }
    }
  }

  return { collidedStationIds: [...collided].sort() };
}
