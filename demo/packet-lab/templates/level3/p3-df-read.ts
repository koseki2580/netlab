/**
 * p3-df-read — a packet with the "do not split" mark (DF) set, and one narrow
 * cable on the way: where does it stop (or does it fit and arrive)? Then make
 * it the largest that passes whole, with the mark kept: judged by sending it,
 * and one byte more (README "largest packet that is not cut").
 */

import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { field } from '../../fields';
import { definePacketTemplate } from '../shared/define';
import { chainNet, packetFrom, withMtu, type RouterCount } from '../shared/nets';
import { device, question, type Captured } from '../shared/read';
import { MTUS } from './p3-df';

export const p3DfRead = definePacketTemplate(
  {
    id: 'p3-df-read',
    level: 3,
    kind: 'read-packet',
    title: L('Too big to pass whole', 'そのままでは通れない'),
  },
  (draw, seed) => {
    const count = draw.pick([2, 3] as const) as RouterCount;
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const answerAt = draw.int(count + 1);
    const cutAt = answerAt < count ? answerAt : draw.int(count);
    const mtu = draw.pick(MTUS);
    const fits = answerAt === count;
    const size = fits ? mtu - 8 * (1 + draw.int(30)) : mtu + 8 * (1 + draw.int(60));
    const base = chainNet(place, plan, count, seed);
    const cutter = base.routers[cutAt] ?? 'r1';
    const net = withMtu(base, base.edgeAfter[cutter] ?? 'e-srv', mtu);
    const packet = packetFrom(net, 'pc', {
      dstIp: net.ip.srv ?? '',
      ttl: 64,
      df: true,
      dataBytes: size - 28,
    }) as Captured;
    const answer = fits ? 'srv' : cutter;
    const srv = net.names.srv ?? place.server;
    const why = (id: string) => (id === answer ? 'right' : `not-${id}`);
    return {
      kind: 'read-packet',
      title: L(`A big packet for ${the(srv)}`, `${srv.ja}への大きなパケット`),
      task: L(
        'Choose where this packet stops; then make it the largest that arrives without being split.',
        'このパケットが止まる場所を選び、分割されずに届くいちばん大きなパケットに直してください。',
      ),
      rule: L(
        'Rule: with DF set, a packet bigger than the MTU is thrown away by the router before the narrow cable.',
        'ルール：DF の印付きで MTU より大きいパケットは、細い回線の手前のルータで捨てられる。',
      ),
      brief: L(
        'The packet carries the "do not split" mark (DF). A router may not cut it, so if it does not fit a cable, the router throws it away and tells the sender the cable\'s limit (MTU). The size of a packet counts everything: the 20-byte IP header, the 8-byte ICMP header and the data.',
        'このパケットには「分割しない」の印（DF）が付いています。ルータは分割できないので、回線に入らなければ捨てて、回線の上限（MTU）を送り主に知らせます。パケットの大きさは、IP ヘッダ 20 バイト・ICMP ヘッダ 8 バイト・データのすべてを数えます。',
      ),
      topology: net.topology,
      names: net.names,
      packets: [packet],
      outcome: {
        deliveredTo: fits ? 'srv' : null,
        dropAt: fits ? null : cutter,
        reason: fits ? null : 'fragmentation-needed',
      },
      questions: [
        question(
          draw,
          'stops',
          'stops-at',
          answer,
          [...net.routers, 'srv'].map((id) => device(net.names, id, why(id))),
        ),
      ],
      fix: {
        fields: [field('size')],
        goals: [
          {
            id: 'delivered',
            kind: 'delivered',
            to: 'srv',
            label: L(`It reaches ${the(srv)}`, `${srv.ja}に届く`),
          },
          {
            id: 'largest',
            kind: 'largest-whole',
            label: L(
              'Unsplit, and one byte more would not be',
              '分割されず、1 バイトでも大きいと通れない',
            ),
          },
        ],
        reference: { size: mtu },
        wrongAnswers: [
          { values: { size: mtu - 20 }, code: 'not-largest', note: 'the IP header left out' },
          { values: { size: mtu - 28 }, code: 'not-largest', note: 'the data alone' },
          { values: { size: mtu + 1 }, code: 'too-big-not-split', note: 'one over' },
        ],
      },
      hints: [
        L(
          'Find the narrow cable on the diagram and its MTU, and compare it with the size of the packet.',
          '図で細い回線とその MTU を探し、パケットの大きさと比べてください。',
        ),
        L(
          'The router that sends onto the narrow cable is the one that checks; the MTU counts the whole packet, headers included.',
          '確かめるのは、細い回線へ送り出すルータです。MTU はヘッダも含めたパケット全体の大きさです。',
        ),
        L(
          'The largest packet that passes whole is exactly as big as the MTU of the narrow cable.',
          '分割されずに通れるいちばん大きなパケットは、細い回線の MTU とちょうど同じ大きさです。',
        ),
      ],
      lessons: ['/networking/mtu-fragmentation'],
      fingerprint: [place.id, count, fits ? 'fits' : `cut-${cutAt}`],
    };
  },
);
