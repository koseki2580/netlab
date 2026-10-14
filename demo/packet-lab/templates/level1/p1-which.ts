/**
 * p1-which — two packets leave a PC: which of them arrive? A packet whose
 * destination address belongs to no network on the diagram is thrown away at
 * the router (no route; README question 1). Only addresses of networks no
 * router knows are used as wrong ones, never an unused address of a network
 * on the diagram (README quirk 2). "A", "B", "both" and "neither" are equally
 * common.
 */

import { evenPlace } from '../../../exercises/templates/shared/draw';
import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { definePacketTemplate } from '../shared/define';
import { lanNet, packetFrom } from '../shared/nets';
import { question, type Captured } from '../shared/read';

const ANSWERS = ['a', 'b', 'both', 'neither'] as const;

export const p1Which = definePacketTemplate(
  {
    id: 'p1-which',
    level: 1,
    kind: 'read-packet',
    title: L('Which one arrives?', 'どちらが届く？'),
  },
  (draw, seed) => {
    const answer = ANSWERS[evenPlace(seed, ANSWERS.length, 51)] ?? 'a';
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const net = lanNet(place, plan, seed);
    const [first, second] = draw.pick([
      ['srv', 'srv2'],
      ['srv2', 'pc2'],
      ['pc2', 'srv'],
    ] as const);
    // A wrong address keeps the last number of a real device: it looks right at a glance.
    const lookAlike = (id: string, other: string) =>
      plan.stranger.at(Number((net.ip[id] ?? '').split('.')[3] ?? '0') + (other === 'b' ? 1 : 0));
    const aGood = answer === 'a' || answer === 'both';
    const bGood = answer === 'b' || answer === 'both';
    const packetA = packetFrom(net, 'pc1', {
      dstIp: aGood ? (net.ip[first] ?? '') : lookAlike(first, 'a'),
      ttl: 64,
    }) as Captured;
    const packetB = packetFrom(net, 'pc1', {
      dstIp: bGood ? (net.ip[second] ?? '') : lookAlike(second, 'b'),
      ttl: 64,
    }) as Captured;
    const pc = net.names.pc1 ?? place.pcs[0];
    const why = (id: string) => (id === answer ? 'right' : `not-${id}`);
    return {
      kind: 'read-packet',
      title: L(`Two packets from ${the(pc)}`, `${pc.ja}からの 2 つのパケット`),
      task: L(
        'Read the destination addresses of packets A and B and choose which arrive.',
        'パケット A と B のあて先アドレスを読んで、届くものを選んでください。',
      ),
      rule: L(
        'Rule: a packet arrives only if some device on the diagram has its destination address.',
        'ルール：あて先アドレスを持つ機器が図の中にあるパケットだけが届く。',
      ),
      brief: L(
        'Two packets are sent one after the other. The router passes a packet on only towards networks it knows; a packet for any other network is thrown away. The first three numbers of an address say which network it is on.',
        '2 つのパケットを続けて送ります。ルータが送り出せるのは、知っているネットワークあてのパケットだけで、それ以外は捨てられます。アドレスのはじめの 3 つの数字が、どのネットワークかを表します。',
      ),
      topology: net.topology,
      names: net.names,
      packets: [packetA, packetB],
      outcome: {
        deliveredTo: aGood ? first : null,
        dropAt: aGood ? null : 'r1',
        reason: aGood ? null : 'no-route',
      },
      questions: [
        question(draw, 'which', 'which-arrive', answer, [
          { value: 'a', label: L('A only', 'A だけ'), why: why('a') },
          { value: 'b', label: L('B only', 'B だけ'), why: why('b') },
          { value: 'both', label: L('Both', '両方'), why: why('both') },
          { value: 'neither', label: L('Neither', 'どちらも届かない'), why: why('neither') },
        ]),
      ],
      hints: [
        L(
          'For each packet, look for a device on the diagram with exactly its destination address.',
          'パケットごとに、あて先アドレスとまったく同じアドレスの機器を図で探してください。',
        ),
        L(
          'Compare the first three numbers first: they say the network. The last number alone is not enough.',
          'まず、はじめの 3 つの数字を比べてください。ネットワークを表すのはそこです。最後の数字だけ合っていても届きません。',
        ),
        L(
          'A packet whose first three numbers match no network on the diagram is thrown away at the router.',
          'はじめの 3 つの数字が図のどのネットワークとも合わないパケットは、ルータで捨てられます。',
        ),
      ],
      lessons: ['/basic/minimal', '/learning/routing-decision'],
      fingerprint: [place.id, answer, first, second],
    };
  },
);
