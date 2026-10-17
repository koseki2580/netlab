/**
 * p3-which-cuts — every cable after a router has a limit (MTU); which router
 * cuts the packet, or does none? Exactly one cable may be narrower than the
 * packet (README: two cuts are wrong in the simulator), and one cable is often
 * exactly the packet's size, which is not cut. Each router, and "none", is the
 * answer equally often.
 */

import { evenPlace } from '../../../exercises/templates/shared/draw';
import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L } from '../../../exercises/templates/shared/text';
import type { Candidate } from '../../model';
import { definePacketTemplate } from '../shared/define';
import { chainNet, packetFrom, withMtu, type RouterCount } from '../shared/nets';
import { device, question, type Captured } from '../shared/read';

const NONE = L('None: it is never cut', 'どこも分割しない');

export const p3WhichCuts = definePacketTemplate(
  {
    id: 'p3-which-cuts',
    level: 3,
    kind: 'read-packet',
    title: L('Which router cuts it?', 'どのルータが分割する？'),
  },
  (draw, seed) => {
    const count = 3 as RouterCount;
    // 0..2: that router cuts; 3: none does.
    const answerAt = evenPlace(seed, count + 1, 81);
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const size = 700 + 8 * draw.int(80);
    const equalAt = draw.int(count);
    const base = chainNet(place, plan, count, seed);
    const mtus = base.routers.map((_, index) =>
      index === answerAt
        ? size - 8 * (1 + draw.int(40))
        : index === equalAt
          ? size
          : draw.pick([size + 8 * (1 + draw.int(40)), 1500]),
    );
    const net = base.routers.reduce(
      (current, id, index) =>
        withMtu(current, current.edgeAfter[id] ?? 'e-srv', mtus[index] ?? 1500),
      base,
    );
    const answer = answerAt < count ? (net.routers[answerAt] ?? 'r1') : 'none';
    const packet = packetFrom(net, 'pc', {
      dstIp: net.ip.srv ?? '',
      ttl: 64,
      dataBytes: size - 28,
    }) as Captured;
    const whyRouter = (index: number): string => {
      if (index === answerAt) return 'right';
      if (answerAt < count && index > answerAt) return 'cut-after';
      return mtus[index] === size ? 'cut-equal-mtu' : 'cut-wide';
    };
    const candidates: Candidate[] = [
      ...net.routers.map((id, index) => device(net.names, id, whyRouter(index))),
      {
        value: 'none',
        label: NONE,
        why: answer === 'none' ? 'right' : 'cut-none-but-narrow',
      },
    ];
    return {
      kind: 'read-packet',
      title: L('Three cables, three limits', '3 本の回線と、それぞれの上限'),
      task: L(
        'Choose the router that cuts this packet into pieces; it may be that none does.',
        'このパケットを分割するルータを選んでください。どれも分割しないこともあります。',
      ),
      rule: L(
        'Rule: a router cuts a packet only if it is bigger than the MTU of the cable it sends it onto.',
        'ルール：ルータが分割するのは、送り出す回線の MTU よりパケットが大きいときだけ。',
      ),
      brief: L(
        `Each cable after a router carries packets up to its limit (MTU), written on the diagram. This packet is ${size} bytes in all, headers included, and it does not carry the "do not split" mark, so a router that must send it onto a narrower cable cuts it.`,
        `ルータの先の回線には、それぞれ運べる大きさの上限（MTU）があり、図に書いてあります。このパケットはヘッダも含めて全部で ${size} バイトで、「分割しない」の印はありません。細い回線へ送り出すルータは、パケットを分割します。`,
      ),
      topology: net.topology,
      names: net.names,
      packets: [packet],
      outcome: { deliveredTo: 'srv', dropAt: null, reason: null },
      questions: [question(draw, 'cut', 'cut-by', answer, candidates)],
      hints: [
        L(
          'Read the MTU of each cable after a router, in order from the sender.',
          '送り主の側から順に、ルータの先の回線の MTU を読んでください。',
        ),
        L(
          'Compare each with the size of the packet. Equal is not bigger: a packet exactly the MTU passes whole.',
          'それぞれをパケットの大きさと比べます。同じ大きさなら、そのまま通れます。',
        ),
        L(
          'The router that cuts is the one sending onto the first cable smaller than the packet.',
          '分割するのは、パケットより MTU が小さい回線へ送り出すルータです。',
        ),
      ],
      lessons: ['/networking/mtu-fragmentation'],
      fingerprint: [place.id, answerAt, equalAt],
    };
  },
);
