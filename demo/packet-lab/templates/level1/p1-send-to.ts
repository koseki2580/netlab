/**
 * p1-send-to — fill in the destination address. The task names the device;
 * its address is read off the diagram. The device is on another network (one
 * of two servers) or on the sender's own (the neighbour PC).
 */

import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
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
    const shape = draw.pick(['one-router', 'two-routers'] as const);
    const sender = draw.pick(['pc1', 'pc2'] as const);
    const neighbour = sender === 'pc1' ? 'pc2' : 'pc1';
    // Two routers add one more device to address: the router next to the servers.
    const target = draw.pick(
      shape === 'two-routers'
        ? (['srv', 'srv2', neighbour, 'r2'] as const)
        : (['srv', 'srv2', neighbour] as const),
    );
    const net = lanNet(place, plan, seed, shape);
    const from = net.names[sender] ?? place.pcs[0];
    const to = net.names[target] ?? place.server;
    const other = target === 'srv' ? 'srv2' : 'srv';
    const targetIp = target === 'r2' ? net.ip['r2:far'] : net.ip[target];
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
      packet: packetFrom(net, sender),
      fields: [field('dstIp')],
      goals: [
        {
          id: 'delivered',
          kind: 'delivered',
          to: target,
          label: L(`It reaches ${the(to)}`, `${to.ja}に届く`),
        },
      ],
      reference: { dstIp: targetIp ?? '' },
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
        { values: { dstIp: net.ip[sender] ?? '' }, code: 'own-address', note: 'the sender itself' },
      ],
      hints: [
        L(
          `Find ${the(to)} on the diagram: the numbers written by it are its address (a router has one on each side).`,
          `図で${to.ja}を探してください。そばに書かれた数字が、その機器のアドレスです（ルータはつながる側ごとに持っています）。`,
        ),
        L(
          `Not the sender's address, and not that of a device on the way: ${the(to)} has an address of its own.`,
          `送り主のアドレスでも、途中の機器のアドレスでもありません。${to.ja}には、自分だけのアドレスがあります。`,
        ),
        L(
          `Copy the address shown by ${the(to)}, all four numbers, into the destination address.`,
          `${to.ja}のそばのアドレスを、4 つの数字すべてそのまま、あて先アドレスに書き写します。`,
        ),
      ],
      lessons: ['/basic/minimal', '/routing/client-server'],
      fingerprint: [place.id, shape, sender, target === neighbour ? 'neighbour' : target],
    };
  },
);
