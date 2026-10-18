/**
 * p2-die-at — set the TTL so that a named router throws the packet away and
 * sends back "time exceeded" (README level 3, "make it die at the second
 * router"; here the router is drawn, the first to the last). Through the
 * routers 1, 2, …, a TTL of k is dropped at the k-th router and that router
 * answers (README question 4). The TTL is typed, not chosen.
 */

import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the, The } from '../../../exercises/templates/shared/text';
import { field } from '../../fields';
import type { PacketResultCode } from '../../model';
import { definePacketTemplate } from '../shared/define';
import { chainNet, lanNet, packetFrom, type RouterCount } from '../shared/nets';

export const p2DieAt = definePacketTemplate(
  {
    id: 'p2-die-at',
    level: 2,
    kind: 'build-packet',
    title: L('Stop it at that router', 'あのルータで止める'),
  },
  (draw, seed) => {
    // Not the first router: its TTL, 1, is the number the rule itself states.
    // With switches on the way (two routers, a switch on each side), the
    // mistake of counting the switches is there to be made.
    const withSwitches = draw.int(7) === 0;
    const count = (withSwitches ? 2 : draw.pick([2, 3, 4] as const)) as RouterCount;
    const nth = withSwitches ? 2 : 2 + draw.int(count - 1);
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const net = withSwitches
      ? lanNet(place, plan, seed, 'two-routers')
      : chainNet(place, plan, count, seed);
    const sender = withSwitches ? 'pc1' : 'pc';
    const at = `r${nth}`;
    const rtr = net.names[at] ?? place.router;
    const pc = net.names[sender] ?? place.pcs[0];
    const oneMore: PacketResultCode = nth === count ? 'not-dropped' : 'dropped-elsewhere';
    return {
      kind: 'build-packet',
      title: L(`A note from ${the(rtr)}`, `${rtr.ja}からの知らせ`),
      task: L(
        `Set the TTL so that ${the(rtr)} throws the packet away and says "time exceeded".`,
        `${rtr.ja}がパケットを捨てて「時間切れ」を知らせてくるように、TTL を決めてください。`,
      ),
      rule: L(
        'Rule: each router takes 1 off the TTL, and throws away a packet that comes in with 1 or less.',
        'ルール：ルータは TTL を 1 ずつ減らし、1 以下で届いたパケットは捨てる。',
      ),
      brief: L(
        'A router that throws a packet away because its TTL ran out sends the sender a note: "time exceeded", from its own address. Sending packets with TTL 1, 2, 3, … and reading who answers is how a path is traced, router by router (traceroute).',
        'TTL が尽きてパケットを捨てたルータは、自分のアドレスから「時間切れ」の知らせを送り主に返します。TTL を 1、2、3…と増やしながら送り、だれが答えるかを読めば、通り道のルータが順にわかります（traceroute のしくみ）。',
      ),
      topology: net.topology,
      names: net.names,
      packet: packetFrom(net, sender, { dstIp: net.ip.srv ?? '', ttl: 64 }),
      fields: [field('ttl')],
      goals: [
        {
          id: 'dies-there',
          kind: 'dropped',
          at,
          reason: 'ttl-exceeded',
          label: L(`${The(rtr)} answers "time exceeded"`, `${rtr.ja}が「時間切れ」を知らせてくる`),
        },
      ],
      reference: { ttl: nth },
      wrongAnswers: [
        { values: { ttl: nth + 1 }, code: oneMore, note: 'one too many' },
        { values: { ttl: nth - 1 }, code: 'dropped-elsewhere', note: 'one too few' },
        ...(withSwitches
          ? [{ values: { ttl: nth + 2 }, code: 'not-dropped' as const, note: 'switches counted' }]
          : []),
        { values: { ttl: 64 }, code: 'not-dropped', note: 'as given' },
      ],
      hints: [
        L(
          `Count the routers from ${the(pc)} up to ${the(rtr)}, that one included; switches do not count.`,
          `${pc.ja}から${rtr.ja}まで、${rtr.ja}も含めてルータを数えてください。スイッチは数えません。`,
        ),
        L(
          'The router that throws it away is the one it reaches with 1 left: each router before it took 1 off.',
          '捨てるのは、残り 1 で着いたルータです。それより手前のルータが 1 ずつ減らしています。',
        ),
        L(
          `The TTL is the number of routers up to and including ${the(rtr)}.`,
          `TTL は、${rtr.ja}を含めて、そこまでのルータの数です。`,
        ),
      ],
      lessons: ['/routing/multi-hop', '/simulation/trace-inspector'],
      fingerprint: [place.id, count, nth, withSwitches ? 'switches' : 'chain'],
    };
  },
);
