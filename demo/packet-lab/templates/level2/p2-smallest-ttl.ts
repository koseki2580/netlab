/**
 * p2-smallest-ttl — choose the smallest TTL with which the packet crosses
 * every router and arrives. Through N routers that is N + 1 (it arrives as 1).
 *
 * The values offered are always 1 to 5, and the router count (1 to 4) is
 * drawn so that each of 2, 3, 4 and 5 is the answer equally often: no value
 * is right more often than another, and no rank among them either, beyond
 * "1 is never right" (a TTL of 1 never crosses a router). Below the answer
 * each value dies at a router of its own; above it each arrives with TTL to
 * spare. Networks with switches add the mistake of counting the switches
 * (they take nothing off).
 */

import { evenPlace, placedEvenly } from '../../../exercises/templates/shared/draw';
import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the } from '../../../exercises/templates/shared/text';
import { field } from '../../fields';
import type { Candidate } from '../../model';
import { definePacketTemplate } from '../shared/define';
import { chainNet, lanNet, packetFrom, type RouterCount } from '../shared/nets';

export const p2SmallestTtl = definePacketTemplate(
  {
    id: 'p2-smallest-ttl',
    level: 2,
    kind: 'build-packet',
    title: L('Just enough TTL', 'ちょうど足りる TTL'),
  },
  (draw, seed) => {
    const count = (1 + evenPlace(seed, 4, 21)) as RouterCount;
    const withSwitches = count <= 2 && draw.pick([true, false]);
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const net = withSwitches
      ? lanNet(place, plan, seed, count === 2 ? 'two-routers' : 'one-router')
      : chainNet(place, plan, count, seed);
    const sender = withSwitches ? 'pc1' : 'pc';
    const right = count + 1;
    const values = [1, 2, 3, 4, 5];
    const why = (value: number) =>
      value === right
        ? 'right'
        : value < right
          ? `dies-at-r${value}`
          : withSwitches && value === right + 2
            ? 'switches-counted'
            : `spare-${value - right}`;
    const [own, ...rest] = [right, ...values.filter((value) => value !== right)].map(
      (value): Candidate => ({ value, why: why(value) }),
    );
    const candidates = placedEvenly(draw, seed, 22, own as Candidate, rest);
    const pc = net.names[sender] ?? place.pcs[0];
    const srv = net.names.srv ?? place.server;
    return {
      kind: 'build-packet',
      title: L(`Just enough to reach ${the(srv)}`, `${srv.ja}にちょうど届く TTL`),
      task: L(
        `Choose the smallest TTL with which the packet from ${the(pc)} still reaches ${the(srv)}.`,
        `${pc.ja}からのパケットが${srv.ja}に届く、いちばん小さい TTL を選んでください。`,
      ),
      rule: L(
        'Rule: each router takes 1 off the TTL, and throws away a packet that comes in with 1 or less.',
        'ルール：ルータは TTL を 1 ずつ減らし、1 以下で届いたパケットは捨てる。',
      ),
      brief: L(
        'Every packet carries a TTL: how many more routers it may cross. It keeps a packet that is going round in circles from going round for ever. A packet with too much TTL is not wrong, but here you are asked for just enough.',
        'パケットには TTL（あと何台ルータを越えてよいか）が書かれています。ぐるぐる回り続けるパケットを止めるための数です。多すぎても困りませんが、ここではちょうど足りる数を答えます。',
      ),
      topology: net.topology,
      names: net.names,
      packet: packetFrom(net, sender, { dstIp: net.ip.srv ?? '', ttl: null }),
      fields: [field('ttl', candidates)],
      goals: [
        {
          id: 'delivered',
          kind: 'delivered',
          to: 'srv',
          label: L(`It reaches ${the(srv)}`, `${srv.ja}に届く`),
        },
        {
          id: 'smallest',
          kind: 'ttl-left',
          value: 1,
          label: L('With 1 less it would not', 'これより 1 小さいと届かない'),
        },
      ],
      reference: { ttl: right },
      wrongAnswers: [
        { values: { ttl: count }, code: 'ttl-ran-out', note: 'one short' },
        { values: { ttl: right + 1 }, code: 'ttl-to-spare', note: 'one to spare' },
      ].filter((entry) => values.includes(entry.values.ttl)) as {
        values: { ttl: number };
        code: 'ttl-ran-out' | 'ttl-to-spare';
        note: string;
      }[],
      hints: [
        L(
          `Count the routers between ${the(pc)} and ${the(srv)} on the diagram (switches take nothing off).`,
          `図で、${pc.ja}と${srv.ja}のあいだにあるルータを数えてください（スイッチは TTL を減らしません）。`,
        ),
        L(
          'Each router takes 1 off, and the last router must still find more than 1 left when the packet comes in.',
          'ルータを 1 台越えるたびに 1 減ります。最後のルータに着いたときにも、1 より多く残っていなければなりません。',
        ),
        L(
          'The answer is one more than the number of routers on the way.',
          '答えは、途中のルータの数より 1 大きい数です。',
        ),
      ],
      lessons: ['/routing/multi-hop', '/simulation/trace-inspector'],
      fingerprint: [place.id, count, withSwitches ? 'switches' : 'chain'],
    };
  },
);
