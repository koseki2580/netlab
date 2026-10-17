/**
 * p2-first-mac — which destination MAC the frame carries on its first step.
 *
 * Judged by comparison: the simulator never checks the destination MAC
 * (README question 2), so the learner's MAC is compared with the one it
 * resolves itself for the same packet. To another network: the router's side
 * on the sender's cable run (the gateway). To the neighbour PC: the
 * neighbour's own, which keeps "always the router's" from passing.
 */

import { placedEvenly } from '../../../exercises/templates/shared/draw';
import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { field } from '../../fields';
import type { Candidate } from '../../model';
import { definePacketTemplate } from '../shared/define';
import { lanNet, packetFrom } from '../shared/nets';

export const p2FirstMac = definePacketTemplate(
  {
    id: 'p2-first-mac',
    level: 2,
    kind: 'build-packet',
    title: L('The MAC for the first step', '最初の 1 歩の MAC アドレス'),
  },
  (draw, seed) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const shape = draw.pick(['one-router', 'two-routers'] as const);
    const sender = draw.pick(['pc1', 'pc2'] as const);
    const neighbour = sender === 'pc1' ? 'pc2' : 'pc1';
    const target = draw.pick(['srv', 'srv2', neighbour] as const);
    const net = lanNet(place, plan, seed, shape);
    const macFor = (key: string) => net.mac[key] ?? '';
    const gateway = macFor('r1:lan');
    const farSide = macFor(shape === 'two-routers' ? 'r1:to-r2' : 'r1:far');
    const switchPort = macFor('sw1:up');
    const sameLan = target === neighbour;
    const right: Candidate = { value: sameLan ? macFor(neighbour) : gateway, why: 'right' };
    const decoys: Candidate[] = sameLan
      ? [
          { value: gateway, why: 'gateway-for-a-neighbour' },
          { value: farSide, why: 'router-far-side' },
          { value: switchPort, why: 'switch' },
          { value: macFor(sender), why: 'sender' },
        ]
      : [
          { value: macFor(target), why: 'destination' },
          { value: macFor(neighbour), why: 'neighbour' },
          { value: farSide, why: 'router-far-side' },
          // With a second router, the router next to the servers: not on the sender's cable run.
          shape === 'two-routers'
            ? { value: macFor('r2:to-r1'), why: 'other-router' }
            : { value: switchPort, why: 'switch' },
        ];
    const candidates = placedEvenly(draw, seed, 31, right, decoys);
    const pc = net.names[sender] ?? place.pcs[0];
    const to = net.names[target] ?? place.server;
    return {
      kind: 'build-packet',
      title: L(`First step towards ${the(to)}`, `${to.ja}への最初の 1 歩`),
      task: L(
        `Choose the destination MAC address of the frame ${the(pc)} sends towards ${the(to)}.`,
        `${pc.ja}が${to.ja}あてに送り出すフレームの、あて先 MAC アドレスを選んでください。`,
      ),
      rule: L(
        'Rule: the MAC address says who takes the frame on this cable run; the IP address says who it is for in the end.',
        'ルール：MAC アドレスは「この回線でだれが受け取るか」、IP アドレスは「最後にだれに届けるか」を表す。',
      ),
      brief: L(
        'A packet travels inside a frame. The frame is addressed again at every step, to the next device that takes it, while the destination address of the packet stays the same all the way.',
        'パケットはフレームという封筒に入って運ばれます。フレームのあて先は、次に受け取る機器あてに 1 歩ごとに書き直されます。パケットのあて先アドレスは、最後まで変わりません。',
      ),
      topology: net.topology,
      names: net.names,
      packet: packetFrom(net, sender, { dstIp: net.ip[target] ?? '' }),
      fields: [field('dstMac', candidates)],
      goals: [
        {
          id: 'mac',
          kind: 'first-hop-mac',
          label: L(
            'The frame goes to the device that takes it first',
            '最初に受け取る機器あてになっている',
          ),
        },
      ],
      reference: { dstMac: String(right.value) },
      wrongAnswers: decoys.map((decoy) => ({
        values: { dstMac: String(decoy.value) },
        code: 'wrong-mac' as const,
        note: decoy.why,
      })),
      hints: [
        L(
          `Is ${the(to)} on the same network as ${the(pc)}? Compare the first three numbers of their addresses.`,
          `${to.ja}は${pc.ja}と同じネットワークにいますか。アドレスのはじめの 3 つの数字を見比べてください。`,
        ),
        L(
          'A frame can only reach a device on the same cable run. To leave the network, it is handed to the router first.',
          'フレームが届くのは、同じ回線につながる機器だけです。ネットワークの外へ出るときは、まずルータに渡します。',
        ),
        sameLan
          ? L(
              `${the(to)} is on the same cable run: the frame goes to its own MAC address.`.replace(
                /^t/,
                'T',
              ),
              `${to.ja}は同じ回線にいるので、${to.ja}自身の MAC アドレスあてです。`,
            )
          : L(
              `The frame goes to the router's side that faces ${the(pc)}.`,
              `ルータの、${pc.ja}の側の差し込み口の MAC アドレスあてです。`,
            ),
      ],
      lessons: ['/networking/arp', '/simulation/step'],
      fingerprint: [place.id, shape, sender, sameLan ? 'neighbour' : target],
    };
  },
);
