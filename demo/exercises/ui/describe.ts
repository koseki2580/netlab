/**
 * The words the exercise pages put on settings, goals and changes.
 *
 * An exercise names devices by id; the learner sees labels on the diagram. So
 * everything here is said with the label, and a port or an interface is said
 * with what it leads to ("the port b1 is plugged into"), because `p3` alone
 * means nothing to a beginner.
 */

import type { AclRule } from '../../../src/types/acl';
import type { TopologySnapshot } from '../../../src/types/topology';
import { labelOf } from '../grade/traceFacts';
import { isAllowed } from '../model/settings';
import type {
  Exercise,
  ExerciseCheck,
  Localised,
  Probe,
  SettingChange,
  SettingRef,
} from '../model/types';

const both = (text: string): Localised => ({ en: text, ja: text });

/** The label of whatever is plugged into `handleId` of `nodeId`, or null. */
function peerOf(topology: TopologySnapshot, nodeId: string, handleId: string): string | null {
  for (const edge of topology.edges) {
    if (edge.source === nodeId && edge.sourceHandle === handleId) {
      return labelOf(topology, edge.target);
    }
    if (edge.target === nodeId && edge.targetHandle === handleId) {
      return labelOf(topology, edge.source);
    }
  }
  return null;
}

function portName(topology: TopologySnapshot, nodeId: string, portId: string): Localised {
  const peer = peerOf(topology, nodeId, portId);
  return peer === null
    ? { en: `port ${portId}`, ja: `差し込み口 ${portId}` }
    : { en: `port ${portId} (to ${peer})`, ja: `差し込み口 ${portId}（${peer} につながる）` };
}

function sideName(topology: TopologySnapshot, nodeId: string, ifaceId: string): Localised {
  const peer = peerOf(topology, nodeId, ifaceId);
  return peer === null
    ? { en: `side ${ifaceId}`, ja: `${ifaceId} 側` }
    : { en: `side ${ifaceId} (to ${peer})`, ja: `${ifaceId} 側（${peer} につながる）` };
}

function cableName(topology: TopologySnapshot, edgeId: string): Localised {
  const edge = topology.edges.find((candidate) => candidate.id === edgeId);
  if (!edge) return both(edgeId);
  const a = labelOf(topology, edge.source);
  const b = labelOf(topology, edge.target);
  return { en: `Cable between ${a} and ${b}`, ja: `${a} と ${b} をつなぐ線` };
}

/** Whether two refs (or changes) name the same setting. */
export function sameSetting(a: SettingRef, b: SettingRef): boolean {
  return isAllowed(a, [b]);
}

/** The node a setting belongs to; null for a cable. */
export function settingNodeId(ref: SettingRef): string | null {
  return ref.kind === 'link-state' ? null : ref.nodeId;
}

/** `exercise-setting-<kind>-<nodeOrEdgeId>[-<sub>]`. */
export function settingTestId(ref: SettingRef): string {
  const sub = (() => {
    switch (ref.kind) {
      case 'iface-address':
      case 'iface-nat':
        return ref.ifaceId;
      case 'port-vlan':
      case 'stp-port':
        return ref.portId;
      case 'ospf-cost':
        return ref.network.replace(/[^0-9a-z]+/gi, '-');
      case 'iface-acl':
        return `${ref.ifaceId}-${ref.direction}`;
      default:
        return null;
    }
  })();
  const owner = ref.kind === 'link-state' ? ref.edgeId : ref.nodeId;
  return `exercise-setting-${ref.kind}-${owner}${sub === null ? '' : `-${sub}`}`;
}

export interface SettingTitle {
  /** What the diagram calls the device (or the cable). */
  readonly device: Localised;
  /** What is being set, in plain words. */
  readonly name: Localised;
}

export function settingTitle(ref: SettingRef, topology: TopologySnapshot): SettingTitle {
  if (ref.kind === 'link-state') {
    return {
      device: cableName(topology, ref.edgeId),
      name: { en: 'Plugged in or not', ja: 'つなぐか、はずすか' },
    };
  }
  const device = both(labelOf(topology, ref.nodeId));
  switch (ref.kind) {
    case 'host-ip':
      return { device, name: { en: 'Address', ja: 'アドレス' } };
    case 'iface-address': {
      const side = sideName(topology, ref.nodeId, ref.ifaceId);
      return { device, name: { en: `Address on ${side.en}`, ja: `${side.ja}のアドレス` } };
    }
    case 'static-routes':
      return {
        device,
        name: { en: 'Routes added by hand', ja: '手で書く経路（行き先と、次に渡す機器）' },
      };
    case 'port-vlan': {
      const port = portName(topology, ref.nodeId, ref.portId);
      return {
        device,
        name: { en: `Group (VLAN) of ${port.en}`, ja: `${port.ja}のグループ（VLAN）` },
      };
    }
    case 'stp-priority':
      return {
        device,
        name: { en: 'Spanning-tree priority', ja: 'スパニングツリーの優先度' },
      };
    case 'stp-port': {
      const port = portName(topology, ref.nodeId, ref.portId);
      return { device, name: { en: `Use ${port.en}`, ja: `${port.ja}を使うか` } };
    }
    case 'ospf-cost':
      return {
        device,
        name: {
          en: `Cost of the link ${ref.network} (OSPF)`,
          ja: `${ref.network} の線のコスト（OSPF）`,
        },
      };
    case 'iface-acl': {
      const side = sideName(topology, ref.nodeId, ref.ifaceId);
      return {
        device,
        name:
          ref.direction === 'inbound'
            ? {
                en: `Allowed traffic coming in on ${side.en} (ACL)`,
                ja: `${side.ja}から入る通信の「通してよい一覧」（ACL）`,
              }
            : {
                en: `Allowed traffic going out on ${side.en} (ACL)`,
                ja: `${side.ja}へ出る通信の「通してよい一覧」（ACL）`,
              },
      };
    }
    case 'iface-nat': {
      const side = sideName(topology, ref.nodeId, ref.ifaceId);
      return {
        device,
        name: {
          en: `Address rewriting (NAT) on ${side.en}`,
          ja: `${side.ja}のアドレス書きかえ（NAT）`,
        },
      };
    }
  }
}

// --- Goals -------------------------------------------------------------------

function ends(probe: Probe, topology: TopologySnapshot): { from: string; to: string } {
  return {
    from: labelOf(topology, probe.from),
    to: probe.via === 'ping' && probe.toIp !== undefined ? probe.toIp : labelOf(topology, probe.to),
  };
}

function waypoint(
  check: { readonly nodeId?: string; readonly edgeId?: string },
  topology: TopologySnapshot,
): Localised {
  if (check.nodeId !== undefined) return both(labelOf(topology, check.nodeId));
  if (check.edgeId !== undefined) {
    const cable = cableName(topology, check.edgeId);
    return { en: `the ${cable.en.replace(/^Cable/, 'cable')}`, ja: cable.ja };
  }
  return { en: 'the named device', ja: '指定の機器' };
}

const STP_ROLE: Record<string, Localised> = {
  ROOT: { en: 'the port towards the root (root port)', ja: '中心へ向かう口（ルートポート）' },
  DESIGNATED: { en: 'a forwarding port (designated port)', ja: '通す口（指定ポート）' },
  BLOCKED: { en: 'closed (blocked)', ja: '止めた口（ブロック）' },
  DISABLED: { en: 'switched off (disabled)', ja: '使わない口（無効）' },
};

/** `topology` with its devices named in `locale`, as `localiseExercise` names the start. */
export function withNodeLabels(
  topology: TopologySnapshot,
  labels: Exercise['nodeLabels'],
  locale: 'en' | 'ja',
): TopologySnapshot {
  if (!labels) return topology;
  return {
    ...topology,
    nodes: topology.nodes.map((node) => ({
      ...node,
      data: { ...node.data, label: labels[node.id]?.[locale] ?? node.data.label },
    })),
  };
}

/** A check as a goal the learner can read: the exercise's own words, else words made from the check. */
export function goalLabel(exercise: Exercise, check: ExerciseCheck): Localised {
  return exercise.checkLabels?.[check.id] ?? checkLabel(check, exercise.start);
}

/** What a check asks for, said from the check alone. */
export function checkLabel(check: ExerciseCheck, topology: TopologySnapshot): Localised {
  switch (check.kind) {
    case 'reach': {
      const { from, to } = ends(check.probe, topology);
      return { en: `${from} can reach ${to}`, ja: `${from} から ${to} に届く` };
    }
    case 'must-not-reach': {
      const { from, to } = ends(check.probe, topology);
      return { en: `${from} cannot reach ${to}`, ja: `${from} から ${to} には届かない` };
    }
    case 'path-via': {
      const { from, to } = ends(check.probe, topology);
      const via = waypoint(check, topology);
      return {
        en: `${from} reaches ${to} by way of ${via.en}`,
        ja: `${from} から ${to} へ、${via.ja} を通って届く`,
      };
    }
    case 'path-avoids': {
      const { from, to } = ends(check.probe, topology);
      const via = waypoint(check, topology);
      return {
        en: `${from} reaches ${to} without passing ${via.en}`,
        ja: `${from} から ${to} へ、${via.ja} を通らずに届く`,
      };
    }
    case 'route-present': {
      const device = labelOf(topology, check.nodeId);
      return {
        en: `${device} knows a route to ${check.destination}`,
        ja: `${device} が ${check.destination} への道を知っている`,
      };
    }
    case 'stp-root': {
      const device = labelOf(topology, check.nodeId);
      return {
        en: `${device} is the centre of the spanning tree (root bridge)`,
        ja: `${device} がスパニングツリーの中心（ルートブリッジ）になる`,
      };
    }
    case 'stp-port-role': {
      const device = labelOf(topology, check.nodeId);
      const port = portName(topology, check.nodeId, check.portId);
      const role = STP_ROLE[check.role] ?? both(check.role);
      return {
        en: `On ${device}, ${port.en} is ${role.en}`,
        ja: `${device} の${port.ja}が「${role.ja}」になる`,
      };
    }
    case 'acl-drop': {
      const { from, to } = ends(check.probe, topology);
      const device = labelOf(topology, check.nodeId);
      return {
        en: `${device} stops traffic from ${from} to ${to}`,
        ja: `${from} から ${to} への通信を、${device} が止める`,
      };
    }
    case 'nat-translated': {
      const { from, to } = ends(check.probe, topology);
      const device = labelOf(topology, check.nodeId);
      return {
        en: `${device} rewrites the sender's address when ${from} talks to ${to}`,
        ja: `${from} から ${to} へ送るとき、${device} が送り主のアドレスを書きかえる`,
      };
    }
    case 'max-changes':
      return {
        en: `Change no more than ${check.max} ${check.max === 1 ? 'setting' : 'settings'}`,
        ja: `変える設定は ${check.max} か所まで`,
      };
  }
}

// --- Changes -----------------------------------------------------------------

export function aclRuleText(rule: AclRule): Localised {
  const port = (value: AclRule['dstPort']): string =>
    value === undefined ? '' : typeof value === 'number' ? `${value}` : `${value.from}-${value.to}`;
  const protocol = rule.protocol === 'any' ? { en: 'anything', ja: 'すべて' } : both(rule.protocol);
  const dstPort = port(rule.dstPort);
  return {
    en: `${rule.action === 'permit' ? 'allow' : 'refuse'} ${protocol.en} from ${rule.srcIp ?? 'anywhere'} to ${rule.dstIp ?? 'anywhere'}${dstPort ? ` port ${dstPort}` : ''}`,
    ja: `${rule.srcIp ?? 'どこからでも'} → ${rule.dstIp ?? 'どこへでも'} の ${protocol.ja}${dstPort ? `（ポート ${dstPort}）` : ''} を${rule.action === 'permit' ? '通す' : '止める'}`,
  };
}

/** The new value of a change, in words. */
function valueText(change: SettingChange): Localised {
  switch (change.kind) {
    case 'host-ip':
      return change.ip === null ? { en: 'no address', ja: 'アドレスなし' } : both(change.ip);
    case 'iface-address':
      return both(`${change.ipAddress}/${change.prefixLength}`);
    case 'static-routes':
      return change.routes.length === 0
        ? { en: 'none', ja: 'なし' }
        : {
            en: change.routes.map((r) => `${r.destination} via ${r.nextHop}`).join(', '),
            ja: change.routes.map((r) => `${r.destination} は ${r.nextHop} へ`).join('、'),
          };
    case 'port-vlan':
      return change.vlanMode === 'trunk'
        ? {
            en: `a trunk carrying VLAN ${(change.trunkAllowedVlans ?? []).join(', ') || 'none'}`,
            ja: `VLAN ${(change.trunkAllowedVlans ?? []).join('、') || 'なし'} を通すトランク`,
          }
        : both(`VLAN ${change.accessVlan ?? 1}`);
    case 'stp-priority':
    case 'ospf-cost':
      return both(String(change.kind === 'stp-priority' ? change.priority : change.cost));
    case 'stp-port':
      return change.enabled ? { en: 'in use', ja: '使う' } : { en: 'not in use', ja: '使わない' };
    case 'link-state':
      return change.state === 'up'
        ? { en: 'plugged in', ja: 'つないだ状態' }
        : { en: 'unplugged', ja: 'はずした状態' };
    case 'iface-acl':
      return change.rules.length === 0
        ? { en: 'no list (everything passes)', ja: '一覧なし（すべて通す）' }
        : {
            en: [...change.rules].map((rule) => aclRuleText(rule).en).join('; then '),
            ja: [...change.rules].map((rule) => aclRuleText(rule).ja).join('、次に '),
          };
    case 'iface-nat':
      return change.nat === null
        ? { en: 'neither side', ja: 'どちらでもない' }
        : change.nat === 'inside'
          ? { en: 'inside', ja: '内側' }
          : { en: 'outside', ja: '外側' };
  }
}

/**
 * One change as a sentence: 「レジのアドレスを 192.168.1.20 に変える」. With
 * `done` it says what the learner did instead of what to do.
 */
export function changeSentence(
  change: SettingChange,
  topology: TopologySnapshot,
  done = false,
): Localised {
  const title = settingTitle(change, topology);
  const value = valueText(change);
  // A cable has no separate "what": its name is the whole subject.
  const what: Localised =
    change.kind === 'link-state'
      ? { en: `the ${title.device.en.replace(/^Cable/, 'cable')}`, ja: title.device.ja }
      : {
          en: `${title.name.en.charAt(0).toLowerCase()}${title.name.en.slice(1)} of ${title.device.en}`,
          ja: `${title.device.ja} の${title.name.ja}`,
        };
  return {
    en: `${done ? 'You set' : 'Set'} the ${what.en.replace(/^the /, '')} to ${value.en}.`,
    ja: `${what.ja}を「${value.ja}」に${done ? '変えました' : '変える'}。`,
  };
}
