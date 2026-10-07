/**
 * What the level 1 templates share: they all happen on `buildLan` (some PCs, a
 * router, a server on the far side) and are about addresses and cables.
 */

import { applyChanges } from '../../model/settings';
import type { Localised, SettingChange } from '../../model/types';
import type { TopologySnapshot } from '../../../../src/types/topology';
import type { LanNet } from './build';
import { goals, type LabelledCheck } from './exercise';
import type { AddressPlan, Net24 } from './plans';
import { L, type Named } from './text';

export const setIp = (nodeId: string, ip: string | null): SettingChange => ({
  kind: 'host-ip',
  nodeId,
  ip,
});

/** Plant a fault: the healthy topology with these settings changed. */
export const broken = (topology: TopologySnapshot, ...changes: SettingChange[]): TopologySnapshot =>
  applyChanges(topology, changes);

export const isFarSide = (lan: LanNet, nodeId: string): boolean => lan.servers.includes(nodeId);

/** The network a device belongs to: the PCs' side or the servers' side. */
export const netOf = (lan: LanNet, plan: AddressPlan, nodeId: string): Net24 =>
  isFarSide(lan, nodeId) ? plan.far : plan.near;

/** The other devices on the same side as `nodeId`. */
export const neighboursOf = (lan: LanNet, nodeId: string): string[] =>
  (isFarSide(lan, nodeId) ? lan.servers : lan.pcs).filter((id) => id !== nodeId);

/** The address a device has in the healthy topology. */
export const addressOf = (lan: LanNet, nodeId: string): string => {
  const ip = lan.topology.nodes.find((node) => node.id === nodeId)?.data.ip;
  return typeof ip === 'string' ? ip : '';
};

/**
 * The goals of every level 1 exercise: each PC reaches the server (and the
 * first PC reaches the second server, where there is one). All of them are
 * checked, because a device that takes another's address breaks the OTHER one.
 */
export function everyoneReaches(
  lan: LanNet,
  names: Readonly<Record<string, Named>>,
): LabelledCheck[] {
  const { reach } = goals(names);
  return [
    ...lan.pcs.map((pc) => reach(pc, 'srv')),
    ...lan.servers.slice(1).map((server) => reach('pc1', server)),
  ];
}

/** 「192.168.1.」 — how the addresses of a network start. */
export const starts = (net: Net24): string => `"${net.starts}"`;
export const startsJa = (net: Net24): string => `「${net.starts}」`;

/** The rule a level 1 learner needs, said the same way everywhere. */
export const SAME_START_RULE = (net: Net24): Localised =>
  L(
    `Devices on one network have addresses with the same first three numbers; here that is ${starts(net)}. Only the last number differs, and no two devices may use the same one.`,
    `同じネットワークの機器は、アドレスのはじめの 3 つの数字が同じです。ここでは${startsJa(net)}です。最後の数字だけが機器ごとにちがい、同じ数字を 2 台で使うことはできません。`,
  );

/** The two ends of a cable, by name. */
export function endsOf(
  lan: LanNet,
  names: Readonly<Record<string, Named>>,
  edgeId: string,
): readonly [Named, Named] {
  const edge = lan.topology.edges.find((candidate) => candidate.id === edgeId);
  const name = (id: string | undefined): Named =>
    (id !== undefined ? names[id] : undefined) ?? L('device', '機器');
  return [name(edge?.source), name(edge?.target)];
}
