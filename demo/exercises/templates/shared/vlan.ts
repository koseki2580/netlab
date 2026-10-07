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

/** One sentence that says what a VLAN is and which group has which number. */
export function vlanIntro(place: Place, vlans: readonly [number, number]): Localised {
  const [a, b] = place.groups;
  return L(
    `The ${a.name.en} devices and the ${b.name.en} devices share the switches, kept apart by VLANs (a VLAN is a separate network inside a switch): VLAN ${vlans[0]} for ${a.name.en}, VLAN ${vlans[1]} for ${b.name.en}.`,
    `${a.name.ja}の機器と${b.name.ja}の機器は同じスイッチを使い、VLAN（スイッチの中を分ける仕切り）で分けてあります。${a.name.ja}が VLAN ${vlans[0]}、${b.name.ja}が VLAN ${vlans[1]} です。`,
  );
}
