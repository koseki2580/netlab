/**
 * p1-send-to — fill in the destination address. The task names the device;
 * its address is read off the diagram. The device is on another network (one
 * of two servers) or on the sender's own (the neighbour PC).
 */

import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the, The } from '../../../exercises/templates/shared/text';
import { field } from '../../fields';
import { definePacketTemplate } from '../shared/define';
import { lanNet, packetFrom } from '../shared/nets';

export const p1SendTo = definePacketTemplate(
  {
    id: 'p1-send-to',
    level: 1,
    kind: 'build-packet',
    title: L('Address a packet', 'パケットにあて先を書く'),
  },
  (draw, seed) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const target = draw.pick(['srv', 'srv2', 'pc2'] as const);
    const net = lanNet(place, plan, seed);
    const from = net.names.pc1 ?? place.pcs[0];
    const to = net.names[target] ?? place.server;
    const other = target === 'srv' ? 'srv2' : 'srv';
    return {
      kind: 'build-packet',
      title: L(`A packet for ${the(to)}`, `${to.ja}へのパケット`),
      task: L(
        `Write the destination address so that the packet from ${the(from)} reaches ${the(to)}.`,
        `${from.ja}からのパケットが${to.ja}に届くように、あて先アドレスを書いてください。`,
      ),
      rule: L(
        'Rule: the destination address is the address of the device it should reach.',
        'ルール：あて先アドレスには、届けたい相手の機器のアドレスを書く。',
      ),
      brief: L(
        `A packet is like a letter: the network reads only the address written on it, never who it was meant for. In the ${place.name.en}, a packet is ready to go, but its destination address is still empty.`,
        `パケットは手紙のようなものです。ネットワークが読むのは書かれたアドレスだけで、だれに届けたかったかは読みません。${place.name.ja}で、送るばかりのパケットがありますが、あて先アドレスがまだ空です。`,
      ),
      topology: net.topology,
      names: net.names,
      packet: packetFrom(net, 'pc1'),
      fields: [field('dstIp')],
      goals: [
        {
          id: 'delivered',
          kind: 'delivered',
          to: target,
          label: L(`It reaches ${the(to)}`, `${to.ja}に届く`),
        },
      ],
      reference: { dstIp: net.ip[target] ?? '' },
      wrongAnswers: [
        {
          values: { dstIp: net.ip[other] ?? '' },
          code: 'delivered-elsewhere',
          note: 'another device',
        },
        {
          values: { dstIp: net.ip['r1:lan'] ?? '' },
          code: 'delivered-elsewhere',
          note: 'the router',
        },
        {
          values: { dstIp: plan.stranger.at(plan.servers[0]) },
          code: 'no-route',
          note: 'another network',
        },
        { values: { dstIp: net.ip.pc1 ?? '' }, code: 'own-address', note: 'the sender itself' },
      ],
      hints: [
        L(
          `Find ${the(to)} on the diagram: the numbers written by it are its address.`,
          `図で${to.ja}を探してください。そばに書かれた数字が、その機器のアドレスです。`,
        ),
        L(
          `Not the sender's address and not the router's: those are other devices. ${The(to)} has an address of its own.`,
          `送り主のアドレスでも、ルータのアドレスでもありません。${to.ja}には、自分だけのアドレスがあります。`,
        ),
        L(
          `Copy the address shown by ${the(to)}, all four numbers, into the destination address.`,
          `${to.ja}のそばのアドレスを、4 つの数字すべてそのまま、あて先アドレスに書き写します。`,
        ),
      ],
      lessons: ['/basic/minimal', '/routing/client-server'],
      fingerprint: [place.id, target],
    };
  },
);
