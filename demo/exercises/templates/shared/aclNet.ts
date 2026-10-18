/**
 * What the level 3 ACL templates share: two trusted PCs and a guest device on
 * one switch, a router, and the server (with, where asked, a second device
 * on a switch of its own on the server side).
 *
 *   pc1, pc2, guest — sw1 — r1 — srv            (one far device)
 *   pc1, pc2, guest — sw1 — r1 — sw2 — srv, srv2 (two)
 *
 * Every goal is a tcp connection to a port of the server, as the story says
 * ("opens the page": 80, "logs in": 22): a ping would be let through by a
 * line for ping alone.
 */

import type { AclRule } from '../../../../src/types/acl';
import type { TopologySnapshot } from '../../../../src/types/topology';
import type { SettingChange } from '../../model/types';
import { host, iface, link, port, router, snapshot, switchNode, withInterface } from './build';
import type { LabelledCheck } from './exercise';
import type { Place } from './places';
import type { AddressPlan } from './plans';
import { L, type Named } from './text';
import { labelIn } from '../../model/text';

export interface AclNet {
  readonly topology: TopologySnapshot;
  readonly names: Readonly<Record<string, Named>>;
  readonly address: Readonly<Record<'pc1' | 'pc2' | 'guest' | 'srv' | 'srv2', string>>;
}

const at = (col: number, row: number) => ({ x: col * 210, y: row * 110 });

export function buildAclNet(place: Place, plan: AddressPlan, twoFar: boolean): AclNet {
  const { near, far, gateway, pcs, servers } = plan;
  const [trusted, outsiders] = place.groups;
  const names: Record<string, Named> = {
    pc1: trusted.members[0],
    pc2: trusted.members[1],
    guest: outsiders.members[0],
    sw1: place.lanSwitch,
    r1: place.router,
    srv: place.server,
    ...(twoFar ? { sw2: place.backSwitch, srv2: place.server2 } : {}),
  };
  const address = {
    pc1: near.at(pcs[0]),
    pc2: near.at(pcs[1]),
    guest: near.at(pcs[2]),
    srv: far.at(servers[0]),
    srv2: far.at(servers[1]),
  };
  const nodes = [
    host('pc1', address.pc1, at(0, 0)),
    host('pc2', address.pc2, at(0, 1)),
    host('guest', address.guest, at(0, 2)),
    switchNode('sw1', [port('p1'), port('p2'), port('p3'), port('up')], {}, at(1, 1)),
    router(
      'r1',
      [iface('lan', `${near.at(gateway)}/24`), iface('far', `${far.at(gateway)}/24`)],
      {},
      at(2, 1),
    ),
    ...(twoFar
      ? [
          switchNode('sw2', [port('up'), port('p1'), port('p2')], {}, at(3, 1)),
          host('srv', address.srv, { role: 'server', ...at(4, 0.5) }),
          host('srv2', address.srv2, { role: 'server', ...at(4, 1.5) }),
        ]
      : [host('srv', address.srv, { role: 'server', ...at(3, 1) })]),
  ];
  const edges = [
    link('e-pc1', 'pc1', 'sw1:p1'),
    link('e-pc2', 'pc2', 'sw1:p2'),
    link('e-guest', 'guest', 'sw1:p3'),
    link('e-up', 'sw1:up', 'r1:lan'),
    ...(twoFar
      ? [
          link('e-far', 'r1:far', 'sw2:up'),
          link('e-srv', 'sw2:p1', 'srv'),
          link('e-srv2', 'sw2:p2', 'srv2'),
        ]
      : [link('e-srv', 'r1:far', 'srv')]),
  ];
  return { topology: snapshot(nodes, edges), names, address };
}

export const rule = (
  id: string,
  priority: number,
  action: AclRule['action'],
  protocol: AclRule['protocol'],
  from?: string,
  dstPort?: number,
): AclRule => ({
  id,
  priority,
  action,
  protocol,
  ...(from !== undefined ? { srcIp: `${from}/32` } : {}),
  ...(dstPort !== undefined ? { dstPort } : {}),
});

/** The list on one side of the router, in one direction. */
export function aclOn(ifaceId: 'lan' | 'far', direction: 'inbound' | 'outbound') {
  const key = direction === 'inbound' ? 'inboundAcl' : 'outboundAcl';
  return {
    ref: { kind: 'iface-acl', nodeId: 'r1', ifaceId, direction } as const,
    set: (rules: readonly AclRule[]): SettingChange => ({
      kind: 'iface-acl',
      nodeId: 'r1',
      ifaceId,
      direction,
      rules,
    }),
    put: (topology: TopologySnapshot, rules: readonly AclRule[]) =>
      withInterface(topology, 'r1', ifaceId, { [key]: rules.map((entry) => ({ ...entry })) }),
  };
}

export const PORT_WORDS = {
  80: L('open the page of', 'ページを開く'),
  22: L('log in to', 'ログインする'),
} as const;

/** "X opens / cannot open Y (tcp, port N)". */
export function opens(
  names: Readonly<Record<string, Named>>,
  from: string,
  to: string,
  dstPort: 80 | 22,
  allowed: boolean,
): LabelledCheck {
  const a = labelIn(names, from);
  const b = labelIn(names, to);
  const what = dstPort === 80 ? L('open', '開ける') : L('log in to', 'ログインできる');
  const whatNot =
    dstPort === 80 ? L('cannot open', '開けない') : L('cannot log in to', 'ログインできない');
  const probe = { via: 'tcp', from, to, dstPort } as const;
  return allowed
    ? {
        id: `tcp${dstPort}-${from}-${to}`,
        kind: 'reach',
        probe,
        label: L(
          `The ${a.en} can ${what.en} the ${b.en} (tcp, port ${dstPort})`,
          `${a.ja}から${b.ja}に${what.ja}（tcp・${dstPort} 番）`,
        ),
      }
    : {
        id: `no-tcp${dstPort}-${from}-${to}`,
        kind: 'must-not-reach',
        probe,
        because: 'acl',
        label: L(
          `The ${a.en} ${whatNot.en} the ${b.en} (tcp, port ${dstPort})`,
          `${a.ja}からは${b.ja}に${whatNot.ja}（tcp・${dstPort} 番）`,
        ),
      };
}

/** The rule of every ACL exercise, and the line nobody can see. */
export const ACL_GLOSS = L(
  'The router checks traffic against a list (ACL), from the top; the first line that fits decides whether it is allowed or refused. One line is enough to stop everything else, because the list ends with a line you cannot see: "refuse the rest". A line fits by its kind (tcp, udp, icmp, which is what ping uses), its sender ("/32" means that one device) and, for tcp and udp, the port number at the destination (which service inside the device is meant; not a socket of a switch).',
  'ルータは、通信を一覧（ACL）と上から順に見くらべ、最初に当てはまった行で「通す・止める」を決めます。行が 1 つあるだけで、ほかの通信はぜんぶ止まります。一覧の最後には、見えない『それ以外は止める』の行があるからです。行が当てはまるかは、種類（tcp・udp・icmp。icmp は ping が使う種類）、送り主（「/32」はその 1 台だけ）、tcp と udp ではあて先のポート番号（機器の中の「どの窓口あてか」。スイッチの差し込み口とは別のもの）で決まります。',
);
