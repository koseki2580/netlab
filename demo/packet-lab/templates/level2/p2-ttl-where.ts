/**
 * p2-ttl-where — a packet leaves with a small TTL: at which router does it
 * run out, or does it arrive? Every router and the server are equally often
 * the answer. Through the routers 1, 2, …, a TTL of k is dropped at the k-th
 * router (README question 4).
 */

import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { definePacketTemplate } from '../shared/define';
import { chainNet, packetFrom, type RouterCount } from '../shared/nets';
import { device, question, type Captured } from '../shared/read';

export const p2TtlWhere = definePacketTemplate(
  {
    id: 'p2-ttl-where',
    level: 2,
    kind: 'read-packet',
    title: L('Where does the TTL run out?', 'TTL はどこで尽きる？'),
  },
  (draw, seed) => {
    const count = draw.pick([2, 3, 4] as const) as RouterCount;
    const ttl = 1 + draw.int(count + 1);
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const net = chainNet(place, plan, count, seed);
    const answer = ttl > count ? 'srv' : `r${ttl}`;
    const packet = packetFrom(net, 'pc', { dstIp: net.ip.srv ?? '', ttl }) as Captured;
    const pc = net.names.pc ?? place.pcs[0];
    const why = (id: string) => (id === answer ? 'right' : `not-${id}`);
    return {
      kind: 'read-packet',
      title: L(`A short TTL from ${the(pc)}`, `${pc.ja}からの短い TTL`),
      task: L(
        "Read the packet's TTL and choose where it stops, or where it arrives.",
        'パケットの TTL を読んで、どこで止まるか（届くならどこに届くか）を選んでください。',
      ),
      rule: L(
        'Rule: each router takes 1 off the TTL, and throws away a packet that comes in with 1 or less.',
        'ルール：ルータは TTL を 1 ずつ減らし、1 以下で届いたパケットは捨てる。',
      ),
      brief: L(
        'The TTL is how many more routers a packet may cross. A router that throws a packet away for this sends the sender a note ("time exceeded"); this is how a route is traced, router by router.',
        'TTL は、パケットがあと何台ルータを越えてよいかを表す数です。これで捨てたルータは、送り主に「時間切れ」の知らせを返します。経路を 1 台ずつ調べる道具（traceroute）は、このしくみを使っています。',
      ),
      topology: net.topology,
      names: net.names,
      packets: [packet],
      outcome: {
        deliveredTo: answer === 'srv' ? 'srv' : null,
        dropAt: answer === 'srv' ? null : answer,
        reason: answer === 'srv' ? null : 'ttl-exceeded',
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
      hints: [
        L(
          'Follow the packet router by router from the sender.',
          '送り主から、ルータを 1 台ずつたどってください。',
        ),
        L(
          'At each router, work out the TTL the packet comes in with: 1 less after every router behind it.',
          'ルータごとに、着いたときの TTL を考えます。ルータを 1 台越えるたびに 1 減ります。',
        ),
        L(
          'The first router at which it comes in with 1 throws it away.',
          'TTL 1 で着いた最初のルータが、パケットを捨てます。',
        ),
      ],
      lessons: ['/routing/multi-hop', '/simulation/trace-inspector'],
      fingerprint: [place.id, count, ttl],
    };
  },
);
