import type { BridgeId } from '../../../types/topology';

export const DEFAULT_BRIDGE_PRIORITY = 32768;
export const DEFAULT_STP_PATH_COST = 19;

function normalizeMacAddress(macAddress: string): string {
  const hex = macAddress.replace(/[^0-9a-f]/gi, '').toLowerCase();
  if (hex.length !== 12) {
    throw new Error(`Invalid MAC address: ${macAddress}`);
  }

  return hex.match(/.{1,2}/g)?.join(':') ?? hex;
}

/**
 * Derive a Bridge ID from a switch's ports. Picks the lowest MAC from port.macAddress
 * entries (stable ordering) as the MAC component. If no ports exist, throws.
 */
export function makeBridgeId(
  priority: number,
  ports: readonly { macAddress: string }[],
): BridgeId {
  if (ports.length === 0) {
    throw new Error('BridgeId requires at least one port MAC');
  }

  const mac = ports
    .map((port) => normalizeMacAddress(port.macAddress))
    .sort((left, right) => left.localeCompare(right))[0];

  if (!mac) {
    throw new Error('BridgeId requires at least one port MAC');
  }

  return { priority, mac };
}

/**
 * Compare two Bridge IDs. Returns negative when a < b, positive when a > b, 0 when equal.
 * "Smaller" Bridge ID = higher preference (wins root election).
 */
export function compareBridgeId(a: BridgeId, b: BridgeId): number {
  if (a.priority !== b.priority) {
    return a.priority - b.priority;
  }

  return normalizeMacAddress(a.mac).localeCompare(normalizeMacAddress(b.mac));
}

/** String form for logging / display, e.g. '32768/aa:bb:cc:dd:ee:01'. */
export function formatBridgeId(bridgeId: BridgeId): string {
  return `${bridgeId.priority}/${normalizeMacAddress(bridgeId.mac)}`;
}
