/**
 * The RSTP and MSTP lesson (REQ-372), on the spanning-tree lesson's triangle
 * of switches: the ports' RSTP roles read from the simulator's spanning tree,
 * what takes over when a root port's link fails, and two MST instances whose
 * different roots block different links.
 */
import { computeStp } from '../../src/layers/l2-datalink/stp/computeStp';
import type { NetworkTopology } from '../../src/types/topology';
import {
  DEFAULT_PRIORITIES,
  buildTopology,
  markSpanningTreeLinks,
  type SwitchId,
} from './StpLoopDemo';

export type RstpRole = 'root' | 'designated' | 'alternate' | 'disabled';

export interface PortRole {
  readonly switchId: SwitchId;
  readonly portId: string;
  readonly role: RstpRole;
}

const SWITCHES: readonly SwitchId[] = ['switch-a', 'switch-b', 'switch-c'];
const NO_DISABLED: Record<SwitchId, string[]> = { 'switch-a': [], 'switch-b': [], 'switch-c': [] };

/** The triangle, with spanning tree drawn on its links. */
export function rstpTopology(
  priorities: Record<SwitchId, number> = DEFAULT_PRIORITIES,
  disabled: Record<SwitchId, string[]> = NO_DISABLED,
): NetworkTopology {
  return markSpanningTreeLinks(buildTopology(priorities, disabled));
}

/**
 * Each inter-switch port's RSTP role. 802.1D's blocking port that hears a
 * better path to the root is RSTP's alternate port: a ready replacement for
 * the root port.
 */
export function rstpRoles(topology: NetworkTopology): PortRole[] {
  const ports = computeStp(topology).ports;
  const roles: PortRole[] = [];
  for (const switchId of SWITCHES) {
    for (const [key, runtime] of ports) {
      if (!key.startsWith(`${switchId}:`) || runtime.portId.endsWith('h')) continue;
      const role: RstpRole =
        runtime.role === 'ROOT'
          ? 'root'
          : runtime.role === 'DESIGNATED'
            ? 'designated'
            : runtime.role === 'BLOCKED'
              ? 'alternate'
              : 'disabled';
      roles.push({ switchId, portId: runtime.portId, role });
    }
  }
  return roles.sort((a, b) => (a.switchId + a.portId).localeCompare(b.switchId + b.portId));
}

/** The far end of an inter-switch port: switch-c's `ca` faces switch-a's `ac`. */
const FACING: Record<string, readonly [SwitchId, string]> = {
  'switch-a:ab': ['switch-b', 'ba'],
  'switch-a:ac': ['switch-c', 'ca'],
  'switch-b:ba': ['switch-a', 'ab'],
  'switch-b:bc': ['switch-c', 'cb'],
  'switch-c:ca': ['switch-a', 'ac'],
  'switch-c:cb': ['switch-b', 'bc'],
};

/** The triangle with the link of `switchId`'s port `portId` cut (both ends disabled). */
export function withLinkCut(
  switchId: SwitchId,
  portId: string,
  priorities: Record<SwitchId, number> = DEFAULT_PRIORITIES,
): NetworkTopology {
  const [farSwitch, farPort] = FACING[`${switchId}:${portId}`] ?? [switchId, portId];
  const disabled: Record<SwitchId, string[]> = { 'switch-a': [], 'switch-b': [], 'switch-c': [] };
  disabled[switchId].push(portId);
  disabled[farSwitch].push(farPort);
  return rstpTopology(priorities, disabled);
}

/** The port of `switchId` that is its root port, if any. */
export const rootPortOf = (roles: readonly PortRole[], switchId: SwitchId) =>
  roles.find((port) => port.switchId === switchId && port.role === 'root')?.portId;

/** The bridge priorities of the two MST instances: each has its own root. */
export const MST_INSTANCES: readonly {
  readonly id: 1 | 2;
  readonly vlans: string;
  readonly priorities: Record<SwitchId, number>;
}[] = [
  { id: 1, vlans: '10', priorities: { 'switch-a': 4096, 'switch-b': 32768, 'switch-c': 32768 } },
  { id: 2, vlans: '20', priorities: { 'switch-a': 32768, 'switch-b': 4096, 'switch-c': 32768 } },
];

/** The inter-switch link each port's alternate role blocks, as "A–B" style names. */
export function blockedLinks(roles: readonly PortRole[]): string[] {
  const name = (id: SwitchId) => id.slice(-1).toUpperCase();
  return roles
    .filter((port) => port.role === 'alternate')
    .map((port) => {
      const [far] = FACING[`${port.switchId}:${port.portId}`] ?? [port.switchId];
      return [name(port.switchId), name(far)].sort().join('–');
    });
}
