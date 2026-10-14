/**
 * p1-where — a packet is like a letter: given its destination address, which
 * device does it reach? The answer is a PC next door, a server, the router
 * itself (an address of its own), or nobody (an address of a network no
 * router knows, thrown away at the router). Each answer is equally common.
 */

import { evenPlace } from '../../../exercises/templates/shared/draw';
import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { definePacketTemplate } from '../shared/define';
import { lanNet, packetFrom } from '../shared/nets';
import { device, NOWHERE, question, type Captured } from '../shared/read';

const ANSWERS = ['pc2', 'srv', 'srv2', 'r1', 'nowhere'] as const;

export const p1Where = definePacketTemplate(
  {
    id: 'p1-where',
    level: 1,
    kind: 'read-packet',
    title: L('Where does it go?', 'どこに届く？'),
  },
  (draw, seed) => {
    const answer = ANSWERS[evenPlace(seed, ANSWERS.length, 41)] ?? 'srv';
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const net = lanNet(place, plan, seed);
    const routerSide = draw.pick(['r1:lan', 'r1:far'] as const);
    const dstIp =
      answer === 'nowhere'
        ? plan.stranger.at(draw.pick(plan.servers))
        : (net.ip[answer === 'r1' ? routerSide : answer] ?? '');
    const pc = net.names.pc1 ?? place.pcs[0];
    const packet = packetFrom(net, 'pc1', { dstIp, ttl: 64 }) as Captured;
    const why = (id: string) => (id === answer ? 'right' : `not-${id}`);
    return {
      kind: 'read-packet',
      title: L(`A packet from ${the(pc)}`, `${pc.ja}からのパケット`),
      task: L(
        'Read the destination address on the packet and choose where it arrives.',
        'パケットのあて先アドレスを読んで、どこに届くかを選んでください。',
      ),
      rule: L(
        'Rule: a packet goes to the device that has its destination address; if none does, it is thrown away.',
        'ルール：パケットは、あて先アドレスを持つ機器に届く。持つ機器がなければ途中で捨てられる。',
      ),
      brief: L(
        'A packet is like a letter: it carries the address of the sender and the address it goes to. The network reads only the destination address. A router has an address of its own on each side, and a packet sent to one of them stops at the router.',
        'パケットは手紙のようなもので、送り主のアドレスとあて先のアドレスが書かれています。ネットワークが読むのは、あて先アドレスだけです。ルータは、つながる側ごとに自分のアドレスを持っていて、そのアドレスあてのパケットはルータで受け取られます。',
      ),
      topology: net.topology,
      names: net.names,
      packets: [packet],
      outcome: {
        deliveredTo: answer === 'nowhere' ? null : answer,
        dropAt: answer === 'nowhere' ? 'r1' : null,
        reason: answer === 'nowhere' ? 'no-route' : null,
      },
      questions: [
        question(draw, 'where', 'arrives-at', answer, [
          ...['pc2', 'srv', 'srv2', 'r1'].map((id) => device(net.names, id, why(id))),
          { value: 'nowhere', label: NOWHERE, why: why('nowhere') },
        ]),
      ],
      hints: [
        L(
          'Read the four numbers of the destination address, then look for them on the diagram.',
          'あて先アドレスの 4 つの数字を読み、図の中で同じ数字を探してください。',
        ),
        L(
          'Look at every device, the router too: it has an address on each of its sides.',
          'ルータも含めて、すべての機器を見てください。ルータは、つながる側ごとにアドレスを持っています。',
        ),
        L(
          'If no device on the diagram has exactly that address, the router does not know where to send it.',
          '図のどの機器もそのアドレスを持っていなければ、ルータは送り先を知りません。',
        ),
      ],
      lessons: ['/basic/minimal', '/learning/packet-journey'],
      fingerprint: [place.id, answer, answer === 'r1' ? routerSide : ''],
    };
  },
);
