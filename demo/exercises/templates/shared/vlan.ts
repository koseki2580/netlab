/** What the VLAN templates share: the two kinds of port setting, and how the groups are introduced. */

import type { Localised, SettingChange, SettingRef } from '../../model/types';
import type { VlanMember, VlanNet } from './build';
import type { Place } from './places';
import { L } from './text';

type Port = Pick<VlanMember, 'switchId' | 'portId'>;

export const access = (port: Port, vlan: number): SettingChange => ({
  kind: 'port-vlan',
  nodeId: port.switchId,
  portId: port.portId,
  vlanMode: 'access',
  accessVlan: vlan,
});

export const trunk = (port: Port, vlans: readonly number[]): SettingChange => ({
  kind: 'port-vlan',
  nodeId: port.switchId,
  portId: port.portId,
  vlanMode: 'trunk',
  trunkAllowedVlans: vlans,
});

export const portRef = (port: Port): SettingRef => ({
  kind: 'port-vlan',
  nodeId: port.switchId,
  portId: port.portId,
});

export const VLAN_PAIRS = [
  [10, 20],
  [30, 40],
  [100, 200],
  [5, 15],
] as const;

/** The members of one group, in seat order. */
export const groupOf = (net: VlanNet, group: 0 | 1): VlanMember[] =>
  net.members.filter((member) => member.group === group);

/**
 * What a VLAN is and who is kept apart. The numbers are NOT said: they are on
 * the diagram and in the form, and a brief that states them is solved by
 * copying.
 */
export function vlanIntro(place: Place): Localised {
  const [a, b] = place.groups;
  return L(
    `The ${a.name.en} devices and the ${b.name.en} devices share the switches, kept apart by VLANs (a VLAN is a separate network inside a switch). Every socket has a VLAN number, and only sockets with the same number can reach each other.`,
    `${a.name.ja}の機器と${b.name.ja}の機器は同じスイッチを使い、VLAN（スイッチの中を分ける仕切り）で分けてあります。差し込み口ごとに VLAN 番号があり、同じ番号の差し込み口どうしだけが届きます。`,
  );
}
