/**
 * p3-pmtud — path MTU discovery over two narrow cables. A packet with DF set
 * leaves the sender: where is it turned back (or does it arrive)? Then make it
 * the largest that arrives whole.
 *
 * Truth (RFC 1191, and README question 6): a router that cannot send a DF
 * packet onto a cable throws it away and answers "fragmentation needed" with
 * THAT cable's MTU. The sender lowers its path MTU to it and sends again; if a
 * narrower cable lies further on, the next router turns it back again with its
 * own MTU. So the path MTU is the smallest MTU on the way, found one router at
 * a time, and the first reported MTU is not yet it: that is the mistake the
 * fix catches (a packet of the first MTU is turned back at the second cable).
 *
 * Every packet here carries DF, so nothing is ever cut: two narrow cables are
 * sound (only cutting twice is the engine's quirk, README §7).
 *
 * Fair to a learner who does not read: the router that answers first (or the
 * server) is each of the routers and the server equally often.
 */

import { evenPlace } from '../../../exercises/templates/shared/draw';
import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { field } from '../../fields';
import { definePacketTemplate } from '../shared/define';
import { chainNet, packetFrom, withMtu, type RouterCount } from '../shared/nets';
import { device, question, type Captured } from '../shared/read';
import { MTUS } from './p3-df';

const ANSWER_SALT = 53;

export const p3Pmtud = definePacketTemplate(
  {
    id: 'p3-pmtud',
    level: 3,
    kind: 'read-packet',
    title: L('Finding the path MTU', '経路の MTU を見つける'),
  },
  (draw, seed) => {
    const count = draw.pick([2, 3, 4] as const) as RouterCount;
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    // Which device turns the packet back first, or `count` for the server: each equally often.
    const answerAt = evenPlace(seed, count + 1, ANSWER_SALT);
    // The two narrow cables leave routers `first` < `second` (indices into the chain).
    let first: number;
    let second: number;
    let stage: 'first' | 'second' | 'arrives';
    if (answerAt === count) {
      first = draw.int(count - 1);
      second = first + 1 + draw.int(count - 1 - first);
      stage = 'arrives';
    } else {
      const canBeFirst = answerAt < count - 1;
      const canBeSecond = answerAt > 0;
      stage =
        canBeFirst && canBeSecond
          ? draw.pick(['first', 'second'])
          : canBeFirst
            ? 'first'
            : 'second';
      if (stage === 'first') {
        first = answerAt;
        second = answerAt + 1 + draw.int(count - 1 - answerAt);
      } else {
        second = answerAt;
        first = draw.int(answerAt);
      }
    }
    // The first narrow cable is the wider of the two; the path MTU is the second's.
    const smallIndex = draw.int(MTUS.length - 1);
    const pathMtu = MTUS[smallIndex] ?? 576;
    const firstMtu = MTUS[smallIndex + 1 + draw.int(MTUS.length - 1 - smallIndex)] ?? 1400;
    const size =
      stage === 'first'
        ? firstMtu + 8 * (1 + draw.int(60))
        : stage === 'second'
          ? pathMtu + 8 * (1 + draw.int(Math.max(1, Math.floor((firstMtu - pathMtu) / 8))))
          : pathMtu - 8 * (1 + draw.int(30));
    const base = chainNet(place, plan, count, seed);
    const router = (index: number) => base.routers[index] ?? 'r1';
    const narrowed = withMtu(base, base.edgeAfter[router(first)] ?? 'e-1', firstMtu);
    const net = withMtu(narrowed, base.edgeAfter[router(second)] ?? 'e-srv', pathMtu);
    const packet = packetFrom(net, 'pc', {
      dstIp: net.ip.srv ?? '',
      ttl: 64,
      df: true,
      dataBytes: size - 28,
    }) as Captured;
    const answer = stage === 'arrives' ? 'srv' : router(answerAt);
    const srv = net.names.srv ?? place.server;
    const why = (id: string) => (id === answer ? 'right' : `not-${id}`);
    return {
      kind: 'read-packet',
      title: L(`Two narrow cables to ${the(srv)}`, `${srv.ja}までの 2 本の細い回線`),
      task: L(
        'Choose where this packet is first turned back; then make it the largest that arrives whole.',
        'このパケットが最初に止められる場所を選び、分割されずに届くいちばん大きなパケットに直してください。',
      ),
      rule: L(
        'Rule: each router reports only the MTU of its own next cable; the path MTU is the smallest on the way.',
        'ルール：ルータが知らせるのは自分の次の回線の MTU だけ。経路の MTU は道でいちばん小さい MTU。',
      ),
      brief: L(
        'The packet carries the "do not split" mark (DF), so no router may cut it. A router that cannot send it onto a narrower cable throws it away and answers "fragmentation needed" with that cable\'s MTU; the sender then sends smaller, and a narrower cable further on turns it back again with its own MTU. This is path MTU discovery: the path MTU is found one router at a time. The size of a packet counts the 20-byte IP header, the 8-byte ICMP header and the data.',
        'このパケットには「分割しない」の印（DF）が付いているので、ルータは分割できません。細い回線に送り出せないルータは、パケットを捨てて「分割が必要」と、その回線の MTU を知らせます。送り主は小さくして送り直しますが、先にもっと細い回線があれば、そこのルータがまた自分の回線の MTU を知らせて止めます。これが経路 MTU 探索（PMTUD）で、経路の MTU はルータ 1 台ずつ見つかります。パケットの大きさは、IP ヘッダ 20 バイト・ICMP ヘッダ 8 バイト・データのすべてを数えます。',
      ),
      topology: net.topology,
      names: net.names,
      packets: [packet],
      outcome: {
        deliveredTo: stage === 'arrives' ? 'srv' : null,
        dropAt: stage === 'arrives' ? null : answer,
        reason: stage === 'arrives' ? null : 'fragmentation-needed',
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
        reference: { size: pathMtu },
        wrongAnswers: [
          {
            values: { size: firstMtu },
            code: 'too-big-not-split',
            note: 'the first MTU reported, not yet the path MTU',
          },
          { values: { size: pathMtu - 20 }, code: 'not-largest', note: 'the IP header left out' },
          { values: { size: pathMtu + 1 }, code: 'too-big-not-split', note: 'one over' },
        ],
      },
      hints: [
        L(
          'Find both narrow cables on the diagram and their MTUs, and compare each with the size of the packet, in the order the packet meets them.',
          '図で 2 本の細い回線とその MTU を探し、パケットが通る順に、パケットの大きさと比べてください。',
        ),
        L(
          "The first router that cannot send it on is the one that answers; the MTU it reports is its own cable's, and a narrower cable further on would turn back even a packet of that size.",
          '先へ送れない最初のルータが答えます。知らせる MTU はそのルータの回線のものです。その先にもっと細い回線があれば、その大きさのパケットもまた止められます。',
        ),
        L(
          'The largest packet that arrives whole is exactly as big as the smaller of the two MTUs.',
          '分割されずに届くいちばん大きなパケットは、2 本の MTU の小さいほうとちょうど同じ大きさです。',
        ),
      ],
      lessons: ['/networking/mtu-fragmentation'],
      fingerprint: [place.id, count, first, second, stage],
    };
  },
);
