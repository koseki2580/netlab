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

/**
 * A port the learner may renumber. Whether it is for one group or carries
 * several is fixed: a device on a port turned into a trunk is delivered to
 * through the trunk's untagged VLAN, which "solved" these exercises by accident.
 */
export const portRef = (port: Port): SettingRef => ({
  kind: 'port-vlan',
  nodeId: port.switchId,
  portId: port.portId,
  fixedMode: true,
});

/** The rule line of a VLAN exercise. */
export const RULE_VLAN = L(
  'Rule: only sockets with the same VLAN number reach each other. One group, one number; another group, another number.',
  'ルール：VLAN 番号が同じ差し込み口どうしだけが届く。同じグループは同じ番号、ちがうグループはちがう番号。',
);

/** Why matching addresses are not enough. */
export const VLAN_WHY = L(
  'With different numbers nothing arrives even when the addresses match, because a switch hands nothing over to a socket with another number.',
  '番号がちがうと、アドレスが合っていても届きません。スイッチは、番号のちがう差し込み口へは何も渡さないからです。',
);

/** What a trunk is, what its sockets hold instead of one number, and why both ends are set. */
export const TRUNK_GLOSS = L(
  'A cable between switches is a trunk: it carries several VLANs at once. Its socket at each end has, instead of one number, a list of the numbers it carries. A number must be on the list at both ends: what one switch sends out, the other must be willing to take in.',
  'スイッチ同士をつなぐケーブルはトランクといい、複数の VLAN をまとめて運びます。その両はしの差し込み口には、番号 1 つのかわりに、運ぶ番号の一覧があります。番号は、両はしの一覧にいります。片方のスイッチが送り出しても、もう片方が受け取らなければ届かないからです。',
);

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
    `The ${a.name.en} devices and the ${b.name.en} devices share the switches, kept apart by VLANs (a VLAN is a separate network inside a switch). An ordinary socket, one a device is plugged into, has one VLAN number, and only sockets with the same number can reach each other. ${VLAN_WHY.en}`,
    `${a.name.ja}の機器と${b.name.ja}の機器は同じスイッチを使い、VLAN（スイッチの中を分ける仕切り）で分けてあります。機器をつなぐふつうの差し込み口には VLAN 番号が 1 つあり、同じ番号の差し込み口どうしだけが届きます。${VLAN_WHY.ja}`,
  );
}
