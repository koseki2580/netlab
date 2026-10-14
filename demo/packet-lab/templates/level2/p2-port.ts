/**
 * p2-port — set the destination port and the kind of traffic so that the
 * router's list (ACL) lets the packet through to one server. The list has a
 * line for each of two servers, so the port of the wrong line is a believable
 * mistake; the kind of traffic is one choice that sets the protocol number
 * and the payload together (README question 5).
 */

import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { CARRIES_LABELS, field } from '../../fields';
import type { Carries } from '../../model';
import { definePacketTemplate } from '../shared/define';
import { lanNet, packetFrom, withFilter } from '../shared/nets';

const PORTS = [443, 22, 25, 53, 123, 3389, 8080, 5060, 993, 110] as const;

export const p2Port = definePacketTemplate(
  {
    id: 'p2-port',
    level: 2,
    kind: 'build-packet',
    title: L('Through the filter', 'フィルタを通す'),
  },
  (draw, seed) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const target = draw.pick(['srv', 'srv2'] as const);
    const kinds = draw.pick([
      ['tcp', 'udp'],
      ['udp', 'tcp'],
      ['tcp', 'tcp'],
      ['udp', 'udp'],
    ] as const);
    const portAt = draw.int(PORTS.length);
    const ports = [
      PORTS[portAt] ?? 443,
      PORTS[(portAt + 1 + draw.int(PORTS.length - 1)) % PORTS.length] ?? 22,
    ];
    const targetFirst = draw.pick([true, false]);
    const base = lanNet(place, plan, seed);
    const other = target === 'srv' ? 'srv2' : 'srv';
    const line = (
      id: string,
      priority: number,
      server: string,
      kind: Carries,
      dstPort: number,
    ) => ({
      id,
      priority,
      action: 'permit' as const,
      protocol: kind,
      dstIp: `${base.ip[server] ?? ''}/32`,
      dstPort,
    });
    const mine = { kind: kinds[0] as Carries, port: ports[0] ?? 443 };
    const theirs = { kind: kinds[1] as Carries, port: ports[1] ?? 22 };
    const lines = [
      line('to-target', 10, target, mine.kind, mine.port),
      line('to-other', 20, other, theirs.kind, theirs.port),
    ];
    const net = withFilter(
      base,
      'r1',
      targetFirst
        ? lines
        : ([
            { ...lines[1], priority: 10 },
            { ...lines[0], priority: 20 },
          ].map((rule) => ({ ...rule })) as typeof lines),
    );
    const to = net.names[target] ?? place.server;
    const router = net.names.r1 ?? place.router;
    const otherKind: Carries = mine.kind === 'tcp' ? 'udp' : 'tcp';
    return {
      kind: 'build-packet',
      title: L(`Past the list to ${the(to)}`, `一覧を通って${to.ja}へ`),
      task: L(
        `Set the destination port and the kind of traffic so that the packet gets through to ${the(to)}.`,
        `${to.ja}まで通るように、あて先ポート番号と通信の種類を決めてください。`,
      ),
      rule: L(
        'Rule: only traffic that fits every part of an "allow" line (kind, destination, port) gets through.',
        'ルール：「通す」行の種類・あて先・ポート番号がすべて当てはまる通信だけが通る。',
      ),
      brief: L(
        `${router.en.charAt(0).toUpperCase() + router.en.slice(1)} keeps a list (ACL) of the traffic it lets through; anything that fits no line is refused. A port number says which service inside a device is meant (it is not a socket of a switch).`,
        `${router.ja}は、通してよい通信の一覧（ACL）を持っていて、どの行にも当てはまらない通信は止めます。ポート番号は、機器の中の「どの窓口あてか」を表す数字です（スイッチの差し込み口とは別のものです）。`,
      ),
      topology: net.topology,
      names: net.names,
      packet: packetFrom(net, 'pc1', {
        dstIp: net.ip[target] ?? '',
        carries: 'tcp',
        dstPort: null,
      }),
      fields: [field('dstPort'), field('carries')],
      goals: [
        {
          id: 'delivered',
          kind: 'delivered',
          to: target,
          label: L(`It gets through to ${the(to)}`, `${to.ja}まで届く`),
        },
      ],
      reference: { dstPort: mine.port, carries: mine.kind },
      wrongAnswers: [
        {
          values: { dstPort: mine.port + 1, carries: mine.kind },
          code: 'filter-refused',
          note: 'port one off',
        },
        {
          values: { dstPort: theirs.port, carries: theirs.kind },
          code: 'filter-refused',
          note: 'the other line',
        },
        {
          values: { dstPort: mine.port, carries: otherKind },
          code: 'filter-refused',
          note: 'wrong kind',
        },
      ],
      hints: [
        L(
          `Open the list on ${the(router)} and find the line whose destination is ${the(to)}.`,
          `${router.ja}の一覧を開いて、あて先が${to.ja}の行を探してください。`,
        ),
        L(
          'A line lets traffic through only if the kind and the port fit as well as the destination; the line for the other server does not help here.',
          'あて先だけでなく、種類とポート番号も合わなければ、その行には当てはまりません。もう 1 台のサーバーの行は、ここでは役に立ちません。',
        ),
        L(
          `Copy the kind (${CARRIES_LABELS.tcp.en} or ${CARRIES_LABELS.udp.en}) and the port from that line.`,
          `その行の種類（${CARRIES_LABELS.tcp.ja} か ${CARRIES_LABELS.udp.ja}）とポート番号を、そのまま使います。`,
        ),
      ],
      lessons: ['/simulation/acl', '/networking/udp', '/simulation/tcp-handshake'],
      fingerprint: [place.id, target, kinds.join('-'), targetFirst ? 'first' : 'second'],
    };
  },
);
