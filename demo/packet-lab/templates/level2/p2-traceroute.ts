/**
 * p2-traceroute — two of a traceroute's probes, each with its own TTL: which
 * device answers each one? The network has two ways from r1 to r4, and r1's
 * route table says which one is taken, so the answer to a probe that runs out
 * at the second router is read off the route table, not the drawing.
 *
 * Truth (README question 4, and RFC 792 / RFC 1812): a router that receives a
 * packet with TTL 1 throws it away and answers "time exceeded" (ICMP type 11);
 * a probe with TTL k therefore runs out at the k-th router of the path, and
 * one with a TTL past the last router reaches the server, which answers it
 * itself. This simulator probes with ICMP echo, as Windows `tracert` does.
 *
 * Fair to a learner who does not read (the shared harness checks it): each
 * probe's TTL is 1 to 4, all equally often, so the first router, the second
 * (r2 or r3), r4 and the server are each the answer a quarter of the time.
 */

import { evenPlace } from '../../../exercises/templates/shared/draw';
import { drawPlace } from '../../../exercises/templates/shared/places';
import { drawPlan } from '../../../exercises/templates/shared/plans';
import { L, the, The } from '../../../exercises/templates/shared/text';
import type { ReadQuestion } from '../../model';
import { definePacketTemplate } from '../shared/define';
import { diamondNet, packetFrom } from '../shared/nets';
import { device, question, type Captured } from '../shared/read';

const WAY_SALT = 43;
const TTL_SALT = 47;

/** Probe B's TTL, given probe A's: any of the other three, each as often. */
const OTHER: Readonly<Record<number, readonly number[]>> = {
  1: [2, 3, 4],
  2: [1, 3, 4],
  3: [1, 2, 4],
  4: [1, 2, 3],
};

export const p2Traceroute = definePacketTemplate(
  {
    id: 'p2-traceroute',
    level: 2,
    kind: 'read-packet',
    title: L('Who answers a traceroute probe?', 'traceroute の問い合わせに答えるのは？'),
  },
  (draw, seed) => {
    const place = drawPlace(draw);
    const plan = drawPlan(draw);
    const way = evenPlace(seed, 2, WAY_SALT) === 0 ? 'top' : 'bottom';
    const ttlA = 1 + evenPlace(seed, 4, TTL_SALT);
    const ttlB = OTHER[ttlA]?.[draw.int(3)] ?? 1;
    const net = diamondNet(place, plan, way, seed);
    const path = [...net.routers, 'srv'];
    const answerFor = (ttl: number) => path[ttl - 1] ?? 'srv';
    const probe = (ttl: number) =>
      packetFrom(net, 'pc', { dstIp: net.ip.srv ?? '', ttl }) as Captured;
    const pc = net.names.pc ?? place.pcs[0];
    const srv = net.names.srv ?? place.server;
    const ask = (id: 'a' | 'b', index: number, ttl: number): ReadQuestion => {
      const answer = answerFor(ttl);
      const asked = question(
        draw,
        id,
        'stops-at',
        answer,
        ['r1', 'r2', 'r3', 'r4', 'srv'].map((candidate) =>
          device(net.names, candidate, candidate === answer ? 'right' : `not-${candidate}`),
        ),
      );
      return {
        ...asked,
        packetIndex: index,
        prompt: L(
          `Which device answers probe ${id.toUpperCase()}?`,
          `問い合わせ ${id.toUpperCase()} に答えるのは、どの機器ですか。`,
        ),
      };
    };
    const first = answerFor(ttlA);
    return {
      kind: 'read-packet',
      title: L(`Tracing the way to ${the(srv)}`, `${srv.ja}までの道を調べる`),
      task: L(
        'Read each probe’s TTL and the route tables, and choose who answers it.',
        '問い合わせごとに TTL と経路表を読んで、答える機器を選んでください。',
      ),
      rule: L(
        'Rule: a probe with TTL k runs out at the k-th router on its way; past the last router, the server answers.',
        'ルール：TTL k の問い合わせは、道の k 台目のルータで尽きる。最後のルータを越えたら、サーバーが答える。',
      ),
      brief: L(
        `${The(pc)} is tracing the way to ${the(srv)} (traceroute). It sends probes with TTL 1, 2, 3, …: each router where a probe's TTL runs out throws it away and answers "time exceeded", so the routers answer one by one, in the order of the way; the server answers the first probe that reaches it. Two ways lead from the first router to the server's router, and the first router's route table says which one is taken. (This simulator probes with ping, as Windows "tracert" does; "traceroute" on Linux and macOS probes with UDP, and the same routers answer.)`,
        `${pc.ja}が、${srv.ja}までの道を調べています（traceroute）。TTL を 1、2、3…と変えて問い合わせを送ると、TTL が尽きたルータがそのたびに捨てて「時間切れ」と答えるので、道の順にルータが 1 台ずつ答えます。サーバーまで届いた問い合わせには、サーバー自身が答えます。最初のルータからサーバー側のルータまでは道が 2 本あり、どちらを通るかは最初のルータの経路表で決まります。（このシミュレータは ping で問い合わせます。Windows の tracert と同じです。Linux や macOS の traceroute は UDP で問い合わせますが、答えるルータは同じです。）`,
      ),
      topology: net.topology,
      names: net.names,
      packets: [probe(ttlA), probe(ttlB)],
      outcome: {
        deliveredTo: first === 'srv' ? 'srv' : null,
        dropAt: first === 'srv' ? null : first,
        reason: first === 'srv' ? null : 'ttl-exceeded',
      },
      questions: [ask('a', 0, ttlA), ask('b', 1, ttlB)],
      hints: [
        L(
          'Write down the way from the PC to the server: which router comes first, second, third.',
          'PC からサーバーまでの道を書き出してください。1 台目、2 台目、3 台目はどのルータですか。',
        ),
        L(
          "The second router is the one the first router's route table sends the server's traffic to; the other one is not on the way at all.",
          '2 台目は、最初のルータの経路表がサーバーあてを渡す先のルータです。もう 1 台は、この道にはありません。',
        ),
        L(
          'A probe with TTL k is answered by the k-th router of that way; with a TTL past the last router, by the server.',
          'TTL k の問い合わせには、その道の k 台目のルータが答えます。最後のルータを越える TTL なら、サーバーが答えます。',
        ),
      ],
      lessons: ['/routing/multi-hop', '/simulation/trace-inspector'],
      fingerprint: [place.id, way, ttlA, ttlB],
    };
  },
);
